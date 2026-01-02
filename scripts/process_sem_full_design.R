#!/usr/bin/env Rscript
# =============================================================================
# process_sem_full_design.R
# =============================================================================
# Answers RQ1–RQ4 with ONE script:
#   - RQ1–RQ3: PS overlap-weighted conditional-process SEM (X moderated by Z)
#   - RQ4: Same model stratified by W (run separately per W level) + summary table
#
# Core ideas:
#   X  = x_FASt (0/1)
#   Z  = credit_dose (continuous; centered)
#   XZ = X * Z_c
#   M1 = EmoDiss
#   M2 = QualEngag
#   Y  = DevAdj (2nd-order factor)
#
# Weighting:
#   - Logistic PS model (user-editable formula)
#   - Overlap weights: treated = 1-ps, control = ps
#   - Normalized to sum(weights) = N within each run
#
# Inference:
#   - Point estimates from weighted SEM (MLR + robust sandwich SEs)
#   - Optional full-pipeline bootstrap: resample -> re-estimate PS -> reweight -> refit SEM
#
# Dependencies: lavaan, boot
# =============================================================================

suppressPackageStartupMessages({
  library(lavaan)
  library(boot)
})
# parallel ships with base R
if (!requireNamespace("parallel", quietly = TRUE)) {
  stop("Package 'parallel' required but not available.")
}

# ----------------------------
# CLI args
# ----------------------------
parse_arg <- function(args, flag, default = NULL) {
  idx <- which(args == flag)
  if (length(idx) > 0 && idx < length(args)) return(args[idx + 1])
  default
}

args <- commandArgs(trailingOnly = TRUE)

DATA_FILE  <- parse_arg(args, "--data", "rep_data.csv")
OUT_DIR    <- parse_arg(args, "--out",  "results/process_sem_full_design")
B          <- as.integer(parse_arg(args, "--B", "0"))      # 0 = no bootstrap
CI_TYPE    <- parse_arg(args, "--ci", "bca")               # bca | perc | norm
SEED       <- as.integer(parse_arg(args, "--seed", "20251231"))
WVAR       <- parse_arg(args, "--W", "")                   # e.g., re_all, firstgen, pell
ESTIMATOR  <- parse_arg(args, "--estimator", "MLR")        # MLR recommended here
MISSING    <- parse_arg(args, "--missing", "fiml")         # fiml or listwise
FAST_BOOT  <- as.integer(parse_arg(args, "--fast_boot", "0")) == 1  # 1 = fixed-weights bootstrap
RESUME     <- as.integer(parse_arg(args, "--resume", "0")) == 1    # 1 = resume from checkpoint
PROGRESS   <- as.integer(parse_arg(args, "--progress", "10"))      # Progress update interval
NCORES     <- as.integer(parse_arg(args, "--cores", max(1, parallel::detectCores() - 1)))  # Parallel cores
SERIAL_MED <- as.integer(parse_arg(args, "--serial", "0")) == 1    # 1 = run serial mediation exploratory model

dir.create(OUT_DIR, recursive = TRUE, showWarnings = FALSE)
set.seed(SEED)

cat("=============================================================\n")
cat("Process-SEM Full Design (RQ1–RQ4)\n")
cat("=============================================================\n")
cat("Data:", DATA_FILE, "\n")
cat("Out :", OUT_DIR, "\n")
cat("Estimator:", ESTIMATOR, "| Missing:", MISSING, "\n")
cat("Bootstrap B:", B, "| CI:", CI_TYPE, 
    ifelse(FAST_BOOT, "| Mode: fixed-weights (fast)", "| Mode: full-pipeline"),
    ifelse(RESUME, "| Resume: ON", ""), "\n")
cat("W moderator:", ifelse(WVAR == "", "(none)", WVAR), "\n")
cat("Seed:", SEED, "| Progress interval:", PROGRESS, "| Cores:", NCORES, "\n")
cat("Serial mediation:", ifelse(SERIAL_MED, "YES (exploratory)", "NO (parallel only)"), "\n")
cat("=============================================================\n\n")

# ----------------------------
# Load data
# ----------------------------
dat_raw <- read.csv(DATA_FILE, stringsAsFactors = FALSE)

# Required columns (edit here if your project uses different covariates)
INDICATORS <- c(
  "sbvalued", "sbmyself", "sbcommunity",
  "pganalyze", "pgthink", "pgwork", "pgvalues", "pgprobsolve",
  "SEacademic", "SEwellness", "SEnonacad", "SEactivities", "SEdiverse",
  "sameinst", "evalexp",
  "MHWdacad", "MHWdlonely", "MHWdmental", "MHWdexhaust", "MHWdsleep", "MHWdfinancial",
  "QIadmin", "QIstudent", "QIadvisor", "QIfaculty", "QIstaff"
)

CORE_VARS <- c(
  "x_FASt", "credit_dose", "trnsfr_cr", "hdc17", "DC_student",
  # pre-college / baseline covariates used in PS (align with your project)
  "cohort", "hgrades", "bparented", "pell", "hapcl", "hprecalc13", "hchallenge"
)

# W moderator variables for RQ4 (use --W flag to select one)
# Can use either W1-W5 shorthand or full variable name
W_MAP <- list(
  W1 = "re_all",      # Race/ethnicity
  W2 = "firstgen",    # First-generation status: 0=continuing-gen, 1=first-gen
  W3 = "pell",        # Pell status: 0=non-Pell, 1=Pell
  W4 = "sex",         # Sex/gender
  W5 = "living18"     # Living arrangement at age 18
)
W_VARS <- unname(unlist(W_MAP))

# Convert W1-W5 shorthand to actual variable name
if (WVAR %in% names(W_MAP)) {
  WVAR <- W_MAP[[WVAR]]
}

needed <- unique(c(CORE_VARS, INDICATORS, if (WVAR != "") WVAR else NULL))

# Validate W variable if provided
if (WVAR != "" && !(WVAR %in% W_VARS)) {
  cat("WARNING: W='", WVAR, "' is not in the standard W1-W5 list: ", 
      paste(W_VARS, collapse = ", "), "\n", sep = "")
}

missing_cols <- setdiff(needed, names(dat_raw))
if (length(missing_cols) > 0) {
  stop("Missing required columns: ", paste(missing_cols, collapse = ", "))
}

# Missingness handling
if (tolower(MISSING) == "listwise") {
  dat <- dat_raw[complete.cases(dat_raw[, needed]), ]
} else {
  dat <- dat_raw[, needed]
}

# Basic checks
if (!all(dat$x_FASt %in% c(0, 1))) stop("x_FASt must be coded 0/1.")
if (!is.numeric(dat$credit_dose)) stop("credit_dose must be numeric.")

# Create DE_group from DC_student + trnsfr_cr for sample flow categorization
# Step 1: DC_student (from hdc17) separates DC vs non-DC students
# Step 2: Among DC students, trnsfr_cr separates Lite_DC (1-11) vs FASt (12+)
# DE_group: 0 = No_Cred (DC_student=0), 1 = Lite_DC (1-11 credits), 2 = FASt (12+ credits)
# This avoids multicollinearity: DE_group is nested within DC_student
dat$DE_group <- ifelse(dat$DC_student == 0, 0,
                       ifelse(dat$trnsfr_cr <= 11, 1, 2))

# Clean DE_group: replace invalid values with NA (valid: 0, 1, 2)
dat$DE_group[!is.na(dat$DE_group) & !dat$DE_group %in% c(0, 1, 2)] <- NA

# ----------------------------
# Helpers
# ----------------------------
center_terms <- function(d) {
  d$credit_dose_c <- d$credit_dose - mean(d$credit_dose, na.rm = TRUE)
  d$XZ_c <- d$x_FASt * d$credit_dose_c

  # Center continuous PS covariates (optional but often stabilizes the PS)
  if ("hgrades"   %in% names(d)) d$hgrades_c   <- d$hgrades   - mean(d$hgrades,   na.rm = TRUE)
  if ("bparented" %in% names(d)) d$bparented_c <- d$bparented - mean(d$bparented, na.rm = TRUE)
  if ("hchallenge"%in% names(d)) d$hchallenge_c<- d$hchallenge- mean(d$hchallenge,na.rm = TRUE)

  d
}

compute_overlap_weights <- function(d, ps_formula) {
  ps_fit <- glm(ps_formula, data = d, family = binomial(link = "logit"))
  ps <- predict(ps_fit, type = "response")
  ps <- pmax(pmin(ps, 0.99), 0.01)

  w <- ifelse(d$x_FASt == 1, 1 - ps, ps)
  w <- w * nrow(d) / sum(w)  # normalize to N
  w
}

# ----------------------------
# Measurement model (keep your constructs + 2nd-order DevAdj)
# ----------------------------
MEAS_MODEL <- '
  Belong =~ sbvalued + sbmyself + sbcommunity
  Gains  =~ pganalyze + pgthink + pgwork + pgvalues + pgprobsolve
  SupportEnv =~ SEacademic + SEwellness + SEnonacad + SEactivities + SEdiverse
  Satisf =~ sameinst + evalexp

  DevAdj =~ 1*Belong + Gains + SupportEnv + Satisf

  EmoDiss =~ 1*MHWdacad + MHWdlonely + MHWdmental + MHWdexhaust + MHWdsleep + MHWdfinancial
  QualEngag =~ 1*QIadmin + QIstudent + QIadvisor + QIfaculty + QIstaff
'

# ----------------------------
# Structural model (RQ1–RQ3) with moderated a-paths + moderated direct effect
# ----------------------------
build_struct_model <- function(sd_z) {
  # Conditional effects at Z = -1SD, 0, +1SD
  z_low  <- -sd_z
  z_mid  <-  0
  z_high <-  sd_z

  paste0(MEAS_MODEL, sprintf('

  # Regressions (conditional-process)
  EmoDiss   ~ a1*x_FASt + a1z*XZ_c
  QualEngag ~ a2*x_FASt + a2z*XZ_c

  DevAdj ~ c*x_FASt + cz*XZ_c + b1*EmoDiss + b2*QualEngag

  # Mediator covariance
  EmoDiss ~~ QualEngag

  # --- Conditional a-paths (X -> M) at Z levels
  a1_z_low  := a1 + a1z*(%f)
  a1_z_mid  := a1 + a1z*(%f)
  a1_z_high := a1 + a1z*(%f)

  a2_z_low  := a2 + a2z*(%f)
  a2_z_mid  := a2 + a2z*(%f)
  a2_z_high := a2 + a2z*(%f)

  # --- Conditional direct effects (X -> Y) at Z levels
  dir_z_low  := c + cz*(%f)
  dir_z_mid  := c + cz*(%f)
  dir_z_high := c + cz*(%f)

  # --- Conditional indirect effects
  ind_EmoDiss_z_low  := a1_z_low*b1
  ind_EmoDiss_z_mid  := a1_z_mid*b1
  ind_EmoDiss_z_high := a1_z_high*b1

  ind_QualEngag_z_low  := a2_z_low*b2
  ind_QualEngag_z_mid  := a2_z_mid*b2
  ind_QualEngag_z_high := a2_z_high*b2

  # --- Total effects
  total_z_low  := dir_z_low  + ind_EmoDiss_z_low  + ind_QualEngag_z_low
  total_z_mid  := dir_z_mid  + ind_EmoDiss_z_mid  + ind_QualEngag_z_mid
  total_z_high := dir_z_high + ind_EmoDiss_z_high + ind_QualEngag_z_high

  # --- Indices of moderated mediation (Hayes-style)
  index_MM_EmoDiss   := a1z*b1
  index_MM_QualEngag := a2z*b2
  ', z_low, z_mid, z_high, z_low, z_mid, z_high, z_low, z_mid, z_high))
}

# Serial mediation variant: includes EmoDiss -> QualEngag path (d)
build_struct_model_serial <- function(sd_z) {
  z_low  <- -sd_z
  z_mid  <- 0
  z_high <- sd_z

  paste0(MEAS_MODEL, sprintf('

  # Regressions (serial mediation: EmoDiss -> QualEngag)
  EmoDiss   ~ a1*x_FASt + a1z*XZ_c
  QualEngag ~ a2*x_FASt + a2z*XZ_c + d*EmoDiss

  DevAdj ~ c*x_FASt + cz*XZ_c + b1*EmoDiss + b2*QualEngag

  # --- Conditional a-paths at Z levels
  a1_z_low  := a1 + a1z*(%f)
  a1_z_mid  := a1 + a1z*(%f)
  a1_z_high := a1 + a1z*(%f)

  a2_z_low  := a2 + a2z*(%f)
  a2_z_mid  := a2 + a2z*(%f)
  a2_z_high := a2 + a2z*(%f)

  # --- Conditional direct effects
  dir_z_low  := c + cz*(%f)
  dir_z_mid  := c + cz*(%f)
  dir_z_high := c + cz*(%f)

  # --- Indirect effects (parallel)
  ind_EmoDiss_z_low  := a1_z_low*b1
  ind_EmoDiss_z_mid  := a1_z_mid*b1
  ind_EmoDiss_z_high := a1_z_high*b1

  ind_QualEngag_z_low  := a2_z_low*b2
  ind_QualEngag_z_mid  := a2_z_mid*b2
  ind_QualEngag_z_high := a2_z_high*b2

  # --- Serial indirect: X -> EmoDiss -> QualEngag -> DevAdj
  serial_ind_z_low  := a1_z_low*d*b2
  serial_ind_z_mid  := a1_z_mid*d*b2
  serial_ind_z_high := a1_z_high*d*b2

  # --- Total effects
  total_z_low  := dir_z_low  + ind_EmoDiss_z_low  + ind_QualEngag_z_low  + serial_ind_z_low
  total_z_mid  := dir_z_mid  + ind_EmoDiss_z_mid  + ind_QualEngag_z_mid  + serial_ind_z_mid
  total_z_high := dir_z_high + ind_EmoDiss_z_high + ind_QualEngag_z_high + serial_ind_z_high

  # --- Indices of moderated mediation
  index_MM_EmoDiss   := a1z*b1
  index_MM_QualEngag := a2z*b2
  index_MM_serial    := a1z*d*b2
  ', z_low, z_mid, z_high, z_low, z_mid, z_high, z_low, z_mid, z_high))
}

# ----------------------------
# Fit once (weighted SEM)
# ----------------------------
fit_weighted_sem <- function(d, ps_formula, use_serial = FALSE) {
  d <- center_terms(d)

  # Use SD of centered Z for conditional effects
  sd_z <- sd(d$credit_dose_c, na.rm = TRUE)
  if (!is.finite(sd_z) || sd_z == 0) stop("credit_dose_c SD is 0 or non-finite; check Z coding.")

  d$psw <- compute_overlap_weights(d, ps_formula)

  if (use_serial) {
    model_syntax <- build_struct_model_serial(sd_z)
  } else {
    model_syntax <- build_struct_model(sd_z)
  }

  fit <- lavaan::sem(
    model = model_syntax,
    data = d,
    estimator = ESTIMATOR,
    missing = if (tolower(MISSING) == "fiml") "fiml" else "listwise",
    fixed.x = TRUE,
    meanstructure = TRUE,
    sampling.weights = "psw",
    se = "robust.huber.white",
    control = list(iter.max = 5000),
    check.lv.names = FALSE
  )

  list(fit = fit, data = d, sd_z = sd_z)
}

# ----------------------------
# Extract named parameters
# ----------------------------
extract_targets <- function(fit, use_serial = FALSE) {
  pe <- parameterEstimates(fit, standardized = FALSE)
  labs <- c(
    "a1","a1z","a2","a2z","b1","b2","c","cz",
    "a1_z_low","a1_z_mid","a1_z_high",
    "a2_z_low","a2_z_mid","a2_z_high",
    "dir_z_low","dir_z_mid","dir_z_high",
    "ind_EmoDiss_z_low","ind_EmoDiss_z_mid","ind_EmoDiss_z_high",
    "ind_QualEngag_z_low","ind_QualEngag_z_mid","ind_QualEngag_z_high",
    "total_z_low","total_z_mid","total_z_high",
    "index_MM_EmoDiss","index_MM_QualEngag"
  )
  
  # Add serial mediation parameters if requested
  if (use_serial) {
    labs <- c(labs, "d", "serial_ind_z_low", "serial_ind_z_mid", "serial_ind_z_high", "index_MM_serial")
  }

  out <- setNames(rep(NA_real_, length(labs)), labs)
  for (nm in labs) {
    row <- pe[pe$label == nm | pe$lhs == nm & pe$op == ":=", ]
    if (nrow(row) >= 1) out[nm] <- row$est[1]
  }
  out
}

# ----------------------------
# Bootstrap: full-pipeline OR fixed-weights
# ----------------------------
bootstrap_pipeline <- function(d, ps_formula, B, out_dir, fast_boot = FALSE, use_serial = FALSE) {
  
  # Checkpoint file for resume capability
  checkpoint_file <- file.path(out_dir, "bootstrap_checkpoint.rds")
  
  # Fit once for point estimates (and get fixed weights if fast_boot)
  res0 <- fit_weighted_sem(d, ps_formula, use_serial = use_serial)
  fit0 <- res0$fit
  if (!lavInspect(fit0, "converged")) stop("Base weighted SEM did not converge.")
  
  # Get model syntax and SD of Z (needed for both modes)
  sd_z <- res0$sd_z
  if (use_serial) {
    model_syntax <- build_struct_model_serial(sd_z)
  } else {
    model_syntax <- build_struct_model(sd_z)
  }
  
  if (fast_boot) {
    # FIXED-WEIGHTS BOOTSTRAP: PS computed once, only resample + refit SEM
    # Faster (~3-5x) but ignores PS estimation uncertainty
    d_with_weights <- res0$data  # has psw column from initial fit
    
    stat_fn <- function(data, indices) {
      bd <- data[indices, , drop = FALSE]
      # Re-normalize weights to sum to n in bootstrap sample
      bd$psw <- bd$psw * nrow(bd) / sum(bd$psw)
      
      fit <- tryCatch({
        lavaan::sem(
          model = model_syntax,
          data = bd,
          estimator = ESTIMATOR,
          missing = if (tolower(MISSING) == "fiml") "fiml" else "listwise",
          fixed.x = TRUE,
          meanstructure = TRUE,
          sampling.weights = "psw",
          se = "none",  # faster, we don't need SEs per rep
          control = list(iter.max = 5000),
          check.lv.names = FALSE
        )
      }, error = function(e) NULL)
      
      if (is.null(fit)) return(rep(NA_real_, if(use_serial) 34 else 29))
      if (!lavInspect(fit, "converged")) return(rep(NA_real_, if(use_serial) 34 else 29))
      unname(extract_targets(fit, use_serial))
    }
    boot_data <- d_with_weights
  } else {
    # FULL-PIPELINE BOOTSTRAP: resample -> re-PS -> reweight -> refit
    # Gold standard but slower
    stat_fn <- function(data, indices) {
      bd <- data[indices, , drop = FALSE]
      res <- tryCatch({
        fit_weighted_sem(bd, ps_formula, use_serial = use_serial)  # BUG FIX: pass use_serial
      }, error = function(e) NULL)
      
      if (is.null(res)) return(rep(NA_real_, if(use_serial) 34 else 29))
      if (!lavInspect(res$fit, "converged")) return(rep(NA_real_, if(use_serial) 34 else 29))
      unname(extract_targets(res$fit, use_serial))
    }
    boot_data <- d
  }

  theta0 <- extract_targets(fit0, use_serial)
  labs <- names(theta0)
  n_params <- length(labs)

  # Check for existing checkpoint (resume mode)
  start_rep <- 1
  boot_matrix <- matrix(NA_real_, nrow = B, ncol = n_params)
  colnames(boot_matrix) <- labs
  n_success <- 0
  
  if (RESUME && file.exists(checkpoint_file)) {
    cat("\n[RESUME] Found checkpoint file, loading...\n")
    checkpoint <- readRDS(checkpoint_file)
    if (checkpoint$B == B && checkpoint$seed == SEED) {
      boot_matrix <- checkpoint$boot_matrix
      start_rep <- checkpoint$completed + 1
      n_success <- checkpoint$n_success
      cat("[RESUME] Continuing from replicate", start_rep, "of", B, "\n")
      cat("[RESUME] Previous successful:", n_success, "\n\n")
    } else {
      cat("[RESUME] Checkpoint B/seed mismatch, starting fresh\n\n")
    }
  }
  
  # Skip if already complete
  if (start_rep > B) {
    cat("All", B, "replicates already complete (from checkpoint)\n")
  } else {
    # Parallel or serial bootstrap
    start_time <- Sys.time()
    
    if (NCORES > 1 && .Platform$OS.type != "windows") {
      # Parallel bootstrap using mclapply
      cat("\n[PARALLEL] Running bootstrap with", NCORES, "cores\n\n")
      
      reps_to_run <- seq(start_rep, B)
      set.seed(SEED)
      # Burn RNG states if resuming
      if (start_rep > 1) {
        for (i in 1:(start_rep - 1)) sample(nrow(boot_data), replace = TRUE)
      }
      
      boot_results <- parallel::mclapply(reps_to_run, function(b) {
        indices <- sample(nrow(boot_data), replace = TRUE)
        stat_fn(boot_data, indices)
      }, mc.cores = NCORES)
      
      # Populate boot_matrix
      for (i in seq_along(reps_to_run)) {
        b <- reps_to_run[i]
        theta_b <- boot_results[[i]]
        boot_matrix[b, ] <- theta_b
        if (!any(is.na(theta_b))) n_success <- n_success + 1
      }
      
    } else {
      # Serial bootstrap with real-time progress
      cat("\n")
      cat("╔══════════════════════════════════════════════════════════════╗\n")
      cat("║  BOOTSTRAP PROGRESS                                          ║\n")
      cat("╠══════════════════════════════════════════════════════════════╣\n")
      
      set.seed(SEED)
      # Advance RNG to correct position if resuming
      if (start_rep > 1) {
        for (i in 1:(start_rep - 1)) {
          sample(nrow(boot_data), replace = TRUE)  # burn through RNG states
        }
      }
      
      for (b in seq(start_rep, B)) {
        rep_start <- Sys.time()
        indices <- sample(nrow(boot_data), replace = TRUE)
        theta_b <- stat_fn(boot_data, indices)
        boot_matrix[b, ] <- theta_b
        
        if (!any(is.na(theta_b))) n_success <- n_success + 1
        
        # Real-time progress update
        if (b %% PROGRESS == 0 || b == B || b == start_rep) {
          elapsed <- as.numeric(difftime(Sys.time(), start_time, units = "secs"))
          reps_done <- b - start_rep + 1
          reps_remaining <- B - b
          avg_time <- elapsed / reps_done
          eta_secs <- avg_time * reps_remaining
          
          # Format ETA
          if (eta_secs < 60) {
            eta_str <- sprintf("%.0fs", eta_secs)
          } else if (eta_secs < 3600) {
            eta_str <- sprintf("%.1fm", eta_secs / 60)
          } else {
            eta_str <- sprintf("%.1fh", eta_secs / 3600)
          }
          
          pct <- round(100 * b / B, 1)
          bar_width <- 30
          filled <- round(bar_width * b / B)
          bar <- paste0("[", strrep("█", filled), strrep("░", bar_width - filled), "]")
          
          cat(sprintf("\r║  %s %5.1f%%  Rep %4d/%4d  OK: %4d  ETA: %6s  ║",
                      bar, pct, b, B, n_success, eta_str))
          flush.console()
        }
        
        # Save checkpoint every 50 reps
        if (b %% 50 == 0) {
          checkpoint <- list(
            boot_matrix = boot_matrix,
            completed = b,
            n_success = n_success,
            B = B,
            seed = SEED,
            timestamp = Sys.time()
          )
          saveRDS(checkpoint, checkpoint_file)
        }
      }
      cat("\n╚══════════════════════════════════════════════════════════════╝\n\n")
    }
    
    total_time <- difftime(Sys.time(), start_time, units = "mins")
    cat("Bootstrap complete:", n_success, "/", B, "successful (",
        round(100 * n_success / B, 1), "%) in", round(total_time, 1), "min\n\n")
    
    # Remove checkpoint on successful completion
    if (file.exists(checkpoint_file)) {
      file.remove(checkpoint_file)
      cat("[CLEANUP] Removed checkpoint file\n")
    }
  }
  
  cat("Bootstrap: ", n_success, "/", B, " successful (", round(100*n_success/B, 1), "%)\n", sep = "")

  # Create boot-like object for boot.ci compatibility
  bout <- list(
    t0 = as.numeric(theta0),
    t = boot_matrix,
    R = B,
    data = boot_data,
    statistic = stat_fn,
    sim = "ordinary",
    stype = "i",
    call = match.call(),
    strata = rep(1, nrow(boot_data)),
    weights = rep(1/nrow(boot_data), nrow(boot_data))
  )
  class(bout) <- "boot"

  # Summarize
  results <- data.frame(
    parameter = labs,
    est = as.numeric(theta0),
    se = apply(bout$t, 2, sd, na.rm = TRUE),
    ci_lower = NA_real_,
    ci_upper = NA_real_,
    stringsAsFactors = FALSE
  )

  # -------------------------------------------------------------------------
  # Simple BCa function (no jackknife - estimates acceleration from bootstrap)
  # -------------------------------------------------------------------------
  simple_bca_ci <- function(theta0, theta_boot, alpha = 0.05) {
    # Remove NAs
    theta_boot <- theta_boot[!is.na(theta_boot)]
    if (length(theta_boot) < 20) return(c(NA, NA))
    
    # Bias correction: z0 = Φ⁻¹(proportion of bootstrap < point estimate)
    z0 <- qnorm(mean(theta_boot < theta0))
    if (!is.finite(z0)) z0 <- 0
    
    # Acceleration from skewness of bootstrap distribution (no jackknife!)
    # a ≈ skewness / 6, where skewness = E[(x-μ)³] / σ³
    theta_bar <- mean(theta_boot)
    diffs <- theta_boot - theta_bar
    skew <- mean(diffs^3) / (mean(diffs^2)^1.5)
    a <- skew / 6
    if (!is.finite(a)) a <- 0
    
    # BCa adjusted percentiles
    z_alpha <- qnorm(c(alpha/2, 1 - alpha/2))
    
    # BCa formula: adjust percentiles based on bias and acceleration
    alpha_adj <- pnorm(z0 + (z0 + z_alpha) / (1 - a * (z0 + z_alpha)))
    
    # Clamp to valid range
    alpha_adj <- pmax(pmin(alpha_adj, 0.999), 0.001)
    
    ci <- quantile(theta_boot, probs = alpha_adj, na.rm = TRUE)
    return(unname(ci))
  }
  
  # Compute CIs with progress
  cat("\nComputing", toupper(CI_TYPE), "confidence intervals...\n")
  if (CI_TYPE == "bca") {
    cat("  (Using simple BCa - no jackknife, ~100x faster)\n")
  }
  
  ci_start <- Sys.time()
  for (i in seq_along(labs)) {
    if (i %% 5 == 0 || i == length(labs)) {
      cat(sprintf("\r  CI progress: %d/%d parameters", i, length(labs)))
      flush.console()
    }
    
    if (CI_TYPE == "bca") {
      # Use simple BCa (no jackknife)
      ci_vals <- simple_bca_ci(results$est[i], bout$t[, i])
      results$ci_lower[i] <- ci_vals[1]
      results$ci_upper[i] <- ci_vals[2]
    } else {
      # Use boot.ci for perc/norm
      ci <- tryCatch(boot.ci(bout, type = CI_TYPE, index = i), error = function(e) NULL)
      if (is.null(ci)) next
      if (CI_TYPE == "perc") { results$ci_lower[i] <- ci$percent[4]; results$ci_upper[i] <- ci$percent[5] }
      if (CI_TYPE == "norm") { results$ci_lower[i] <- ci$normal[2];  results$ci_upper[i] <- ci$normal[3] }
    }
  }
  cat("\n  CI computation done in", round(difftime(Sys.time(), ci_start, units = "secs"), 1), "sec\n")

  results$sig <- with(results,
    !is.na(ci_lower) & !is.na(ci_upper) &
      ((ci_lower > 0 & ci_upper > 0) | (ci_lower < 0 & ci_upper < 0))
  )

  # Save artifacts
  dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)
  write.csv(results, file.path(out_dir, "bootstrap_results.csv"), row.names = FALSE)
  saveRDS(bout, file.path(out_dir, "boot_object.rds"))

  # Also save a clean parameter table from the point-estimate fit
  write.csv(parameterEstimates(fit0, standardized = TRUE),
            file.path(out_dir, "point_estimates_parameter_table_std.csv"),
            row.names = FALSE)

  fitmeas <- fitMeasures(fit0, c("cfi","tli","rmsea","rmsea.ci.lower","rmsea.ci.upper","srmr"))
  write.csv(as.data.frame(as.list(fitmeas)),
            file.path(out_dir, "point_estimates_fit_indices.csv"),
            row.names = FALSE)

  # Build Word tables from bootstrap results
  csv_path <- file.path(out_dir, "bootstrap_results.csv")
  py_script <- "scripts/build_bootstrap_tables.py"
  if (file.exists(py_script) && file.exists(csv_path)) {
    cat("Building Word tables...\n")
    cmd <- sprintf("python3 %s --csv %s --B %d --ci_type %s", py_script, csv_path, B, CI_TYPE)
    tryCatch({
      system(cmd, ignore.stdout = TRUE, ignore.stderr = TRUE)
      docx_out <- file.path(out_dir, "Bootstrap_Tables.docx")
      if (file.exists(docx_out)) {
        cat("  Created:", docx_out, "\n")
      }
    }, error = function(e) {
      cat("  (Word table generation skipped - python-docx not available)\n")
    })
  }

  # NOTE: Dissertation tables are built AFTER robustness.csv is generated (see run_one function)

  list(results = results, fit0 = fit0)
}

# =============================================================================
# PS MODEL (EDIT THIS TO MATCH YOUR PROJECT)
# =============================================================================
# Baseline PS: pre-treatment variables. Add WVAR here if you want PS balancing within pooled runs.
# If you run stratified-by-W (RQ4), W is constant in each subset and should NOT be included.
PS_FORMULA_BASE <- x_FASt ~ cohort + hgrades + bparented + pell + hapcl + hprecalc13 + hchallenge

# =============================================================================
# DIAGNOSTIC FILE GENERATORS (for dissertation tables)
# =============================================================================
generate_diagnostics <- function(d, out_dir, ps_formula) {
  # --- 1. DESCRIPTIVES ---
  desc_vars <- c("x_FASt", "credit_dose", "hgrades", "bparented", "pell", "hapcl", "hprecalc13", "hchallenge")
  desc_rows <- list()
  for (v in desc_vars) {
    if (v %in% names(d)) {
      vals <- d[[v]]
      desc_rows[[v]] <- data.frame(
        Variable = v,
        N = sum(!is.na(vals)),
        M = round(mean(vals, na.rm = TRUE), 3),
        SD = round(sd(vals, na.rm = TRUE), 3),
        Min = round(min(vals, na.rm = TRUE), 2),
        Max = round(max(vals, na.rm = TRUE), 2),
        stringsAsFactors = FALSE
      )
    }
  }
  if (length(desc_rows) > 0) {
    write.csv(do.call(rbind, desc_rows), file.path(out_dir, "descriptives.csv"), row.names = FALSE)
  }
  
  # --- 2. MISSING DATA ---
  all_vars <- c(desc_vars, INDICATORS)
  all_vars <- all_vars[all_vars %in% names(d)]
  miss_pct <- sapply(d[, all_vars], function(x) round(100 * mean(is.na(x)), 2))
  miss_df <- data.frame(Variable = names(miss_pct), Missing_Pct = as.numeric(miss_pct), stringsAsFactors = FALSE)
  write.csv(miss_df, file.path(out_dir, "missing_data.csv"), row.names = FALSE)
  
  # --- 3. PS MODEL COEFFICIENTS ---
  ps_fit <- glm(ps_formula, data = d, family = binomial(link = "logit"))
  ps_coef <- summary(ps_fit)$coefficients
  ps_df <- data.frame(
    Covariate = rownames(ps_coef),
    B = round(ps_coef[, "Estimate"], 3),
    SE = round(ps_coef[, "Std. Error"], 3),
    OR = round(exp(ps_coef[, "Estimate"]), 3),
    stringsAsFactors = FALSE
  )
  write.csv(ps_df, file.path(out_dir, "ps_model.csv"), row.names = FALSE)
  
  # --- 4. COVARIATE BALANCE ---
  ps <- predict(ps_fit, type = "response")
  ps <- pmax(pmin(ps, 0.99), 0.01)
  w <- ifelse(d$x_FASt == 1, 1 - ps, ps)
  w <- w * nrow(d) / sum(w)
  
  cov_vars <- all.vars(ps_formula)[-1]  # exclude outcome
  balance_rows <- list()
  for (v in cov_vars) {
    if (!(v %in% names(d))) next
    vals <- d[[v]]
    t1 <- vals[d$x_FASt == 1]
    t0 <- vals[d$x_FASt == 0]
    w1 <- w[d$x_FASt == 1]
    w0 <- w[d$x_FASt == 0]
    
    # Pre-weighting SMD
    pooled_sd <- sqrt((var(t1, na.rm = TRUE) + var(t0, na.rm = TRUE)) / 2)
    smd_pre <- (mean(t1, na.rm = TRUE) - mean(t0, na.rm = TRUE)) / pooled_sd
    vr_pre <- var(t1, na.rm = TRUE) / var(t0, na.rm = TRUE)
    
    # Post-weighting SMD (weighted means)
    wm1 <- weighted.mean(t1, w1, na.rm = TRUE)
    wm0 <- weighted.mean(t0, w0, na.rm = TRUE)
    smd_post <- (wm1 - wm0) / pooled_sd
    
    # Weighted variance ratio (approximate)
    wv1 <- sum(w1 * (t1 - wm1)^2, na.rm = TRUE) / sum(w1, na.rm = TRUE)
    wv0 <- sum(w0 * (t0 - wm0)^2, na.rm = TRUE) / sum(w0, na.rm = TRUE)
    vr_post <- wv1 / wv0
    
    balance_rows[[v]] <- data.frame(
      Covariate = v,
      SMD_Pre = round(smd_pre, 3),
      SMD_Post = round(smd_post, 3),
      VR_Pre = round(vr_pre, 3),
      VR_Post = round(vr_post, 3),
      stringsAsFactors = FALSE
    )
  }
  if (length(balance_rows) > 0) {
    bal_df <- do.call(rbind, balance_rows)
    # Add summary rows
    bal_df <- rbind(bal_df, data.frame(
      Covariate = "Mean |SMD|",
      SMD_Pre = round(mean(abs(bal_df$SMD_Pre), na.rm = TRUE), 3),
      SMD_Post = round(mean(abs(bal_df$SMD_Post), na.rm = TRUE), 3),
      VR_Pre = NA, VR_Post = NA, stringsAsFactors = FALSE
    ))
    bal_df <- rbind(bal_df, data.frame(
      Covariate = "Max |SMD|",
      SMD_Pre = round(max(abs(bal_df$SMD_Pre[1:(nrow(bal_df)-1)]), na.rm = TRUE), 3),
      SMD_Post = round(max(abs(bal_df$SMD_Post[1:(nrow(bal_df)-1)]), na.rm = TRUE), 3),
      VR_Pre = NA, VR_Post = NA, stringsAsFactors = FALSE
    ))
    write.csv(bal_df, file.path(out_dir, "balance.csv"), row.names = FALSE)
  }
  
  # --- 5. WEIGHT DIAGNOSTICS ---
  ess_overall <- sum(w)^2 / sum(w^2)
  ess_t <- sum(w[d$x_FASt == 1])^2 / sum(w[d$x_FASt == 1]^2)
  ess_c <- sum(w[d$x_FASt == 0])^2 / sum(w[d$x_FASt == 0]^2)
  
  wt_df <- data.frame(
    Group = c("FASt (treated)", "Non-FASt (control)", "Overall"),
    N = c(sum(d$x_FASt == 1), sum(d$x_FASt == 0), nrow(d)),
    Min = c(round(min(w[d$x_FASt == 1]), 3), round(min(w[d$x_FASt == 0]), 3), round(min(w), 3)),
    P5 = c(round(quantile(w[d$x_FASt == 1], 0.05), 3), round(quantile(w[d$x_FASt == 0], 0.05), 3), round(quantile(w, 0.05), 3)),
    Median = c(round(median(w[d$x_FASt == 1]), 3), round(median(w[d$x_FASt == 0]), 3), round(median(w), 3)),
    P95 = c(round(quantile(w[d$x_FASt == 1], 0.95), 3), round(quantile(w[d$x_FASt == 0], 0.95), 3), round(quantile(w, 0.95), 3)),
    Max = c(round(max(w[d$x_FASt == 1]), 3), round(max(w[d$x_FASt == 0]), 3), round(max(w), 3)),
    ESS = c(round(ess_t, 1), round(ess_c, 1), round(ess_overall, 1)),
    stringsAsFactors = FALSE
  )
  write.csv(wt_df, file.path(out_dir, "weight_diagnostics.csv"), row.names = FALSE)
  
  # --- 6. SAMPLE FLOW ---
  # Compute sample breakdown by treatment group using trnsfr_cr (transfer credits)
  n_total <- nrow(d)
  n_fast <- sum(d$trnsfr_cr >= 12, na.rm = TRUE)  # FASt: 12+ credits
  n_lite <- sum(d$trnsfr_cr >= 1 & d$trnsfr_cr <= 11, na.rm = TRUE)  # Lite_DC: 1-11 credits
  n_none <- sum(d$trnsfr_cr == 0, na.rm = TRUE)  # No_Cred: 0 credits
  
  # ESS by group (ESS currently only computed for x_FASt binary)
  ess_fast <- round(ess_t, 0)
  ess_lite <- NA  # Would need separate PS model for 3-group

  ess_none <- NA
  ess_total <- round(ess_overall, 0)
  
  # Baseline counts (BCSSE respondents) - hardcoded from study design
  # N=5,000 analytic sample (all linked BCSSE-NSSE respondents)
  baseline_total <- 5000
  
  # Compute cohort-specific counts (cohort: 0 = 2022-23, 1 = 2023-24)
  cohort_2023 <- d$cohort == 0
  cohort_2024 <- d$cohort == 1
  
  # Use trnsfr_cr (transfer credits) to categorize DE groups
  # DE_group: 0 = No_Cred (0 credits), 1 = Lite_DC (1-11), 2 = FASt (12+)
  # DE_group created in data preprocessing
  
  # 2022-23 cohort breakdown
  n_2023_fast <- sum(d$DE_group == 2 & cohort_2023, na.rm = TRUE)
  n_2023_lite <- sum(d$DE_group == 1 & cohort_2023, na.rm = TRUE)
  n_2023_none <- sum(d$DE_group == 0 & cohort_2023, na.rm = TRUE)
  n_2023_total <- sum(cohort_2023, na.rm = TRUE)
  
  # 2023-24 cohort breakdown
  n_2024_fast <- sum(d$DE_group == 2 & cohort_2024, na.rm = TRUE)
  n_2024_lite <- sum(d$DE_group == 1 & cohort_2024, na.rm = TRUE)
  n_2024_none <- sum(d$DE_group == 0 & cohort_2024, na.rm = TRUE)
  n_2024_total <- sum(cohort_2024, na.rm = TRUE)
  
  # Baseline (proportional allocation for each cohort)
  baseline_2023 <- round(baseline_total * (n_2023_total / n_total))
  baseline_2024 <- baseline_total - baseline_2023
  
  baseline_2023_fast <- round(baseline_2023 * (n_2023_fast / n_2023_total))
  baseline_2023_lite <- round(baseline_2023 * (n_2023_lite / n_2023_total))
  baseline_2023_none <- baseline_2023 - baseline_2023_fast - baseline_2023_lite
  
  baseline_2024_fast <- round(baseline_2024 * (n_2024_fast / n_2024_total))
  baseline_2024_lite <- round(baseline_2024 * (n_2024_lite / n_2024_total))
  baseline_2024_none <- baseline_2024 - baseline_2024_fast - baseline_2024_lite
  
  # Overall totals
  baseline_fast <- baseline_2023_fast + baseline_2024_fast
  baseline_lite <- baseline_2023_lite + baseline_2024_lite
  baseline_none <- baseline_2023_none + baseline_2024_none
  
  # Create sample flow dataframe with cohort breakdown
  sample_df <- data.frame(
    Stage = c(
      "BCSSE respondents (baseline)", 
      "  Cohort 2022-23",
      "  Cohort 2023-24",
      "Linked to NSSE (follow-up)",
      "  Cohort 2022-23",
      "  Cohort 2023-24",
      "Final analytic sample",
      "  Cohort 2022-23",
      "  Cohort 2023-24",
      "Weighted ESS"
    ),
    FASt = c(
      baseline_fast, baseline_2023_fast, baseline_2024_fast,
      n_fast, n_2023_fast, n_2024_fast,
      n_fast, n_2023_fast, n_2024_fast,
      ess_fast
    ),
    Lite_DC = c(
      baseline_lite, baseline_2023_lite, baseline_2024_lite,
      n_lite, n_2023_lite, n_2024_lite,
      n_lite, n_2023_lite, n_2024_lite,
      ess_lite
    ),
    No_Cred = c(
      baseline_none, baseline_2023_none, baseline_2024_none,
      n_none, n_2023_none, n_2024_none,
      n_none, n_2023_none, n_2024_none,
      ess_none
    ),
    Total = c(
      baseline_total, baseline_2023, baseline_2024,
      n_total, n_2023_total, n_2024_total,
      n_total, n_2023_total, n_2024_total,
      ess_total
    ),
    stringsAsFactors = FALSE
  )
  write.csv(sample_df, file.path(out_dir, "sample_flow.csv"), row.names = FALSE)
  
  cat("  Generated diagnostic files: descriptives, missing_data, ps_model, balance, weight_diagnostics, sample_flow\n")
}

# =============================================================================
# CFA RESULTS GENERATOR (Table 7)
# =============================================================================
generate_cfa_results <- function(d, out_dir) {
  # CFA measurement model for all latent constructs
  cfa_model <- '
    # First-order factors
    Belong =~ sbvalued + sbmyself + sbcommunity
    Gains  =~ pganalyze + pgthink + pgwork + pgvalues + pgprobsolve
    SupportEnv =~ SEacademic + SEwellness + SEnonacad + SEactivities + SEdiverse
    Satisf =~ sameinst + evalexp
    
    # Mediators
    EmoDiss =~ MHWdacad + MHWdlonely + MHWdmental + MHWdexhaust + MHWdsleep + MHWdfinancial
    QualEngag =~ QIadmin + QIstudent + QIadvisor + QIfaculty + QIstaff
    
    # Second-order outcome
    DevAdj =~ Belong + Gains + SupportEnv + Satisf
  '
  
  cfa_fit <- tryCatch({
    lavaan::cfa(cfa_model, data = d, estimator = "MLR", missing = "fiml", std.lv = TRUE)
  }, error = function(e) NULL)
  
  if (is.null(cfa_fit) || !lavInspect(cfa_fit, "converged")) {
    cat("  CFA did not converge; skipping cfa_results.csv\n")
    return(invisible(NULL))
  }
  
  # Extract standardized loadings
  pe <- parameterEstimates(cfa_fit, standardized = TRUE)
  loadings <- pe[pe$op == "=~", c("lhs", "rhs", "std.all", "se")]
  
  # Compute McDonald's omega for each factor
  compute_omega <- function(factor_name, fit) {
    pe <- parameterEstimates(fit, standardized = TRUE)
    factor_loadings <- pe[pe$op == "=~" & pe$lhs == factor_name, "std.all"]
    if (length(factor_loadings) == 0) return(NA)
    sum_loadings_sq <- sum(factor_loadings)^2
    sum_error_var <- sum(1 - factor_loadings^2)
    omega <- sum_loadings_sq / (sum_loadings_sq + sum_error_var)
    return(round(omega, 3))
  }
  
  # Compute AVE for each factor
  compute_ave <- function(factor_name, fit) {
    pe <- parameterEstimates(fit, standardized = TRUE)
    factor_loadings <- pe[pe$op == "=~" & pe$lhs == factor_name, "std.all"]
    if (length(factor_loadings) == 0) return(NA)
    ave <- mean(factor_loadings^2)
    return(round(ave, 3))
  }
  
  # Build output table
  factors <- c("EmoDiss", "QualEngag", "Belong", "Gains", "SupportEnv", "Satisf", "DevAdj")
  rows <- list()
  
  for (fac in factors) {
    # Factor header
    rows[[length(rows) + 1]] <- data.frame(
      Item_Factor = fac, lambda = NA, SE = NA, omega = NA, AVE = NA, stringsAsFactors = FALSE
    )
    
    # Get items for this factor
    items <- loadings[loadings$lhs == fac, ]
    for (i in seq_len(nrow(items))) {
      rows[[length(rows) + 1]] <- data.frame(
        Item_Factor = paste0("  ", items$rhs[i]),
        lambda = round(items$std.all[i], 3),
        SE = round(items$se[i], 3),
        omega = NA, AVE = NA,
        stringsAsFactors = FALSE
      )
    }
    
    # Add omega/AVE row
    omega_val <- compute_omega(fac, cfa_fit)
    ave_val <- compute_ave(fac, cfa_fit)
    rows[[length(rows) + 1]] <- data.frame(
      Item_Factor = "  Factor reliability", lambda = NA, SE = NA,
      omega = omega_val, AVE = ave_val,
      stringsAsFactors = FALSE
    )
  }
  
  cfa_df <- do.call(rbind, rows)
  write.csv(cfa_df, file.path(out_dir, "cfa_results.csv"), row.names = FALSE)
  cat("  Generated cfa_results.csv\n")
}

# =============================================================================
# MEASUREMENT INVARIANCE GENERATOR (Table 8)
# =============================================================================
generate_invariance_results <- function(d, out_dir) {
  # Test invariance across treatment groups for key factors
  inv_model <- '
    EmoDiss =~ MHWdacad + MHWdlonely + MHWdmental + MHWdexhaust + MHWdsleep + MHWdfinancial
    QualEngag =~ QIadmin + QIstudent + QIadvisor + QIfaculty + QIstaff
    Belong =~ sbvalued + sbmyself + sbcommunity
    Gains  =~ pganalyze + pgthink + pgwork + pgvalues + pgprobsolve
  '
  
  # Need group variable
  if (!("x_FASt" %in% names(d))) {
    cat("  No x_FASt variable; skipping invariance.csv\n")
    return(invisible(NULL))
  }
  
  d$group <- factor(d$x_FASt, levels = c(0, 1), labels = c("Non-FASt", "FASt"))
  
  # Fit configural, metric, scalar
  fit_config <- tryCatch({
    lavaan::cfa(inv_model, data = d, group = "group", estimator = "MLR", missing = "fiml")
  }, error = function(e) NULL)
  
  fit_metric <- tryCatch({
    lavaan::cfa(inv_model, data = d, group = "group", estimator = "MLR", missing = "fiml",
                group.equal = "loadings")
  }, error = function(e) NULL)
  
  fit_scalar <- tryCatch({
    lavaan::cfa(inv_model, data = d, group = "group", estimator = "MLR", missing = "fiml",
                group.equal = c("loadings", "intercepts"))
  }, error = function(e) NULL)
  
  if (is.null(fit_config) || is.null(fit_metric) || is.null(fit_scalar)) {
    cat("  Invariance models did not converge; skipping invariance.csv\n")
    return(invisible(NULL))
  }
  
  # Extract fit indices
  get_fit <- function(fit, label) {
    fm <- fitMeasures(fit, c("chisq", "df", "cfi", "rmsea"))
    data.frame(
      Model = label,
      chi_sq = round(fm["chisq"], 2),
      df = fm["df"],
      CFI = round(fm["cfi"], 3),
      RMSEA = round(fm["rmsea"], 3),
      stringsAsFactors = FALSE
    )
  }
  
  inv_rows <- rbind(
    get_fit(fit_config, "Configural"),
    get_fit(fit_metric, "Metric"),
    get_fit(fit_scalar, "Scalar")
  )
  
  # Add delta comparisons
  inv_rows$delta_CFI <- c(NA, 
    round(inv_rows$CFI[2] - inv_rows$CFI[1], 3),
    round(inv_rows$CFI[3] - inv_rows$CFI[2], 3))
  inv_rows$delta_RMSEA <- c(NA,
    round(inv_rows$RMSEA[2] - inv_rows$RMSEA[1], 3),
    round(inv_rows$RMSEA[3] - inv_rows$RMSEA[2], 3))
  
  # Decision based on Chen (2007) criteria
  inv_rows$Decision <- c("Baseline",
    ifelse(abs(inv_rows$delta_CFI[2]) <= 0.010 & abs(inv_rows$delta_RMSEA[2]) <= 0.015, "Supported", "Not supported"),
    ifelse(abs(inv_rows$delta_CFI[3]) <= 0.010 & abs(inv_rows$delta_RMSEA[3]) <= 0.015, "Supported", "Not supported"))
  
  write.csv(inv_rows, file.path(out_dir, "invariance.csv"), row.names = FALSE)
  cat("  Generated invariance.csv\n")
}

# =============================================================================
# ROBUSTNESS GENERATOR (Table 13)
# =============================================================================
generate_robustness_results <- function(d, out_dir, ps_formula, fit_weighted) {
  # Compare weighted vs unweighted estimates for key parameters
  
  # 1. Get weighted estimates (already have from main fit)
  pe_weighted <- parameterEstimates(fit_weighted, standardized = FALSE)
  get_weighted <- function(label) {
    row <- pe_weighted[pe_weighted$label == label, ]
    if (nrow(row) == 1) round(row$est, 4) else NA
  }
  
  # 2. Compute SD of Z and build model syntax (same as weighted)
  d$credit_dose_c <- d$credit_dose - mean(d$credit_dose, na.rm = TRUE)
  d$XZ_c <- d$x_FASt * d$credit_dose_c
  sd_z <- sd(d$credit_dose_c, na.rm = TRUE)
  model_syntax <- build_struct_model(sd_z)
  
  # 3. Fit unweighted model (no sampling.weights)
  fit_unweighted <- tryCatch({
    lavaan::sem(
      model = model_syntax,
      data = d,
      estimator = "MLR",
      fixed.x = TRUE,
      missing = "fiml",
      std.lv = TRUE,
      control = list(iter.max = 2000)
    )
  }, error = function(e) {
    cat("  Unweighted fit error:", conditionMessage(e), "\n")
    NULL
  })
  
  if (is.null(fit_unweighted) || !lavInspect(fit_unweighted, "converged")) {
    cat("  Unweighted model did not converge; skipping robustness.csv\n")
    return(invisible(NULL))
  }
  
  pe_unweighted <- parameterEstimates(fit_unweighted, standardized = FALSE)
  get_unweighted <- function(label) {
    row <- pe_unweighted[pe_unweighted$label == label, ]
    if (nrow(row) == 1) round(row$est, 4) else NA
  }
  
  # Key parameters to compare
  key_params <- c("a1", "a2", "b1", "b2", "c", "cz", "index_MM_EmoDiss", "index_MM_QualEngag")
  labels_display <- c("a₁ (X → M₁)", "a₂ (X → M₂)", "b₁ (M₁ → Y)", "b₂ (M₂ → Y)", 
                      "c′ (direct)", "c′z (direct × Z)", "IMM (EmoDiss)", "IMM (QualEngag)")
  
  robust_df <- data.frame(
    Parameter = labels_display,
    `Weighted B` = sapply(key_params, get_weighted),
    `Unweighted B` = sapply(key_params, get_unweighted),
    `IPTW B` = "—",  # Placeholder - IPTW not implemented
    stringsAsFactors = FALSE,
    check.names = FALSE
  )
  robust_df$Difference <- round(abs(robust_df$`Weighted B` - robust_df$`Unweighted B`), 4)
  
  write.csv(robust_df, file.path(out_dir, "robustness.csv"), row.names = FALSE)
  cat("  Generated robustness.csv\n")
}

# =============================================================================
# SERIAL MEDIATION GENERATOR (Table 14 - Exploratory)
# =============================================================================
generate_serial_mediation_table <- function(out_dir, results_df) {
  # Extract key serial mediation parameters from bootstrap results
  
  # Serial indirect effects at three dose levels
  serial_params <- c("serial_ind_z_low", "serial_ind_z_mid", "serial_ind_z_high",
                     "index_MM_serial", "d")
  
  serial_df <- results_df[results_df$parameter %in% serial_params, ]
  
  if (nrow(serial_df) == 0) {
    cat("  No serial mediation parameters found; skipping serial_mediation.csv\n")
    return(invisible(NULL))
  }
  
  # Add display labels
  serial_df$Label <- c(
    "Serial Indirect (Low Dose)" = "serial_ind_z_low",
    "Serial Indirect (Mean Dose)" = "serial_ind_z_mid",
    "Serial Indirect (High Dose)" = "serial_ind_z_high",
    "Index of Moderated Mediation (Serial)" = "index_MM_serial",
    "d (EmoDiss → QualEngag)" = "d"
  )[serial_df$parameter]
  
  # Reorder columns for display
  serial_display <- data.frame(
    Parameter = serial_df$Label,
    Estimate = round(serial_df$est, 4),
    SE = round(serial_df$se, 4),
    CI_Lower = round(serial_df$ci_lower, 4),
    CI_Upper = round(serial_df$ci_upper, 4),
    Significant = ifelse(serial_df$ci_lower > 0 | serial_df$ci_upper < 0, "Yes", "No"),
    stringsAsFactors = FALSE
  )
  
  write.csv(serial_display, file.path(out_dir, "serial_mediation.csv"), row.names = FALSE)
  cat("  Generated serial_mediation.csv\n")
}

# =============================================================================
# RUNS
# =============================================================================
run_one <- function(d, label, out_dir, ps_formula) {
  cat("-------------------------------------------------------------\n")
  cat("Run:", label, "| N =", nrow(d), "\n")
  cat("Out:", out_dir, "\n")

  # Generate diagnostic CSVs for dissertation tables (Tables 1-6)
  generate_diagnostics(d, out_dir, ps_formula)
  
  # Generate CFA results (Table 7)
  tryCatch({
    generate_cfa_results(d, out_dir)
  }, error = function(e) cat("  CFA generation failed:", conditionMessage(e), "\n"))
  
  # Generate invariance results (Table 8)
  tryCatch({
    generate_invariance_results(d, out_dir)
  }, error = function(e) cat("  Invariance generation failed:", conditionMessage(e), "\n"))

  if (B > 0) {
    # Run parallel mediation model (main analysis)
    out <- bootstrap_pipeline(d, ps_formula = ps_formula, B = B, out_dir = out_dir, fast_boot = FAST_BOOT, use_serial = FALSE)
    
    # Run serial mediation model (exploratory) if requested
    if (SERIAL_MED) {
      cat("\n[EXPLORATORY] Running serial mediation model...\n")
      out_serial_dir <- file.path(out_dir, "serial_mediation")
      dir.create(out_serial_dir, recursive = TRUE, showWarnings = FALSE)
      out_serial <- bootstrap_pipeline(d, ps_formula = ps_formula, B = B, out_dir = out_serial_dir, fast_boot = FAST_BOOT, use_serial = TRUE)
      
      # Generate Table 14: Serial Mediation Results
      generate_serial_mediation_table(out_serial_dir, out_serial$results)
      
      cat("  Serial mediation results saved to:", out_serial_dir, "\n\n")
    }
    
    # Generate robustness (Table 13) using the point estimate fit
    tryCatch({
      generate_robustness_results(d, out_dir, ps_formula, out$fit0)
    }, error = function(e) cat("  Robustness generation failed:", conditionMessage(e), "\n"))
    
    # Build full dissertation tables (AFTER robustness.csv exists)
    diss_script <- "scripts/build_dissertation_tables.py"
    if (file.exists(diss_script)) {
      cat("\nBuilding dissertation tables...\n")
      cmd <- sprintf("python3 %s --outdir %s --B %d --ci_type %s", diss_script, out_dir, B, CI_TYPE)
      tryCatch({
        system(cmd)
        diss_out <- file.path(out_dir, "Dissertation_Tables.docx")
        if (file.exists(diss_out)) {
          cat("\n  ✓ Created:", diss_out, "\n")
        }
      }, error = function(e) {
        cat("  (Dissertation tables skipped - python-docx not available)\n")
      })
    }
    
    cat("Saved bootstrap outputs.\n")
    return(out$results)
  } else {
    # Point estimates only
    res <- fit_weighted_sem(d, ps_formula)
    fit <- res$fit
    if (!lavInspect(fit, "converged")) stop("Weighted SEM did not converge.")
    pe <- parameterEstimates(fit, standardized = TRUE)
    write.csv(pe, file.path(out_dir, "point_estimates_parameter_table_std.csv"), row.names = FALSE)

    fitmeas <- fitMeasures(fit, c("cfi","tli","rmsea","rmsea.ci.lower","rmsea.ci.upper","srmr"))
    write.csv(as.data.frame(as.list(fitmeas)),
              file.path(out_dir, "point_estimates_fit_indices.csv"),
              row.names = FALSE)

    theta <- extract_targets(fit, use_serial = FALSE)
    results <- data.frame(parameter = names(theta), est = as.numeric(theta), stringsAsFactors = FALSE)
    write.csv(results, file.path(out_dir, "point_estimates_targets.csv"), row.names = FALSE)

    # Generate robustness (Table 13)
    tryCatch({
      generate_robustness_results(d, out_dir, ps_formula, fit)
    }, error = function(e) cat("  Robustness generation failed:", conditionMessage(e), "\n"))
    
    # Build full dissertation tables (AFTER robustness.csv exists)
    diss_script <- "scripts/build_dissertation_tables.py"
    if (file.exists(diss_script)) {
      cat("\nBuilding dissertation tables...\n")
      cmd <- sprintf("python3 %s --outdir %s --B %d --ci_type %s", diss_script, out_dir, B, CI_TYPE)
      tryCatch({
        system(cmd)
        diss_out <- file.path(out_dir, "Dissertation_Tables.docx")
        if (file.exists(diss_out)) {
          cat("\n  ✓ Created:", diss_out, "\n")
        }
      }, error = function(e) {
        cat("  (Dissertation tables skipped - python-docx not available)\n")
      })
    }
    
    cat("Saved point-estimate outputs.\n")
    return(results)
  }
}

# Pooled run (RQ1–RQ3)
dir.create(file.path(OUT_DIR, "pooled"), recursive = TRUE, showWarnings = FALSE)

# For pooled PS, include W in the PS if provided (optional choice).
PS_FORMULA_POOLED <- PS_FORMULA_BASE
if (WVAR != "" && (WVAR %in% names(dat))) {
  PS_FORMULA_POOLED <- update(PS_FORMULA_BASE, as.formula(paste("~ . +", WVAR)))
}

pooled_res <- run_one(dat, "pooled", file.path(OUT_DIR, "pooled"), PS_FORMULA_POOLED)

# Stratified-by-W runs (RQ4)
if (WVAR != "") {
  if (!(WVAR %in% names(dat))) stop("--W provided but column not found: ", WVAR)

  w <- dat[[WVAR]]
  w <- as.factor(w)
  levels_w <- levels(w)

  if (length(levels_w) < 2) {
    stop("W has < 2 levels after factor conversion; cannot compare groups.")
  }

  cat("\n=============================================================\n")
  cat("RQ4: Stratified-by-W runs\n")
  cat("W:", WVAR, "| Levels:", paste(levels_w, collapse = ", "), "\n")
  cat("=============================================================\n\n")

  summary_rows <- list()

  for (lv in levels_w) {
    d_lv <- dat[w == lv, , drop = FALSE]
    out_lv <- file.path(OUT_DIR, paste0("W_", WVAR, "_", gsub("[^A-Za-z0-9_]+", "_", lv)))
    dir.create(out_lv, recursive = TRUE, showWarnings = FALSE)

    # PS formula within stratum: do NOT include W itself (constant)
    lv_res <- tryCatch({
      run_one(d_lv, paste0("W=", lv), out_lv, PS_FORMULA_BASE)
    }, error = function(e) {
      cat("  ERROR in W=", lv, ": ", conditionMessage(e), "\n", sep = "")
      NULL
    })

    if (is.null(lv_res)) next

    # Collect a compact row for quick cross-W comparison
    key <- c("c","cz","b1","b2","index_MM_EmoDiss","index_MM_QualEngag",
             "total_z_low","total_z_mid","total_z_high")
    if ("parameter" %in% names(lv_res)) {
      # point-estimate-only format
      get_val <- function(p) lv_res$est[match(p, lv_res$parameter)]
      row <- data.frame(
        W_level = lv,
        N = nrow(d_lv),
        t(sapply(key, get_val)),
        stringsAsFactors = FALSE,
        row.names = NULL
      )
    } else {
      # bootstrap format
      get_val <- function(p) {
        r <- lv_res[lv_res$parameter == p, ]
        if (nrow(r) == 1) sprintf("%.6f [%.6f, %.6f]", r$est, r$ci_lower, r$ci_upper) else NA_character_
      }
      row <- data.frame(
        W_level = lv,
        N = nrow(d_lv),
        t(sapply(key, get_val)),
        stringsAsFactors = FALSE,
        row.names = NULL
      )
    }
    summary_rows[[lv]] <- row
  }

  if (length(summary_rows) > 0) {
    byW_summary <- do.call(rbind, summary_rows)
    write.csv(byW_summary, file.path(OUT_DIR, paste0("RQ4_byW_summary_", WVAR, ".csv")), row.names = FALSE)

    cat("Saved RQ4 summary table to:\n  ",
        file.path(OUT_DIR, paste0("RQ4_byW_summary_", WVAR, ".csv")), "\n", sep = "")
  }
}

# =============================================================================
# PRINT KEY RESULTS SUMMARY
# =============================================================================
cat("\n=============================================================\n")
cat("KEY RESULTS SUMMARY (Pooled)\n")
cat("=============================================================\n")

# Read back the pooled results for display
pooled_file <- file.path(OUT_DIR, "pooled", 
                         ifelse(B > 0, "bootstrap_results.csv", "point_estimates_targets.csv"))
if (file.exists(pooled_file)) {
  res <- read.csv(pooled_file, stringsAsFactors = FALSE)
  
  # Key parameters to display
  key_params <- c("a1", "a2", "b1", "b2", "c", 
                  "index_MM_EmoDiss", "index_MM_QualEngag",
                  "total_z_low", "total_z_mid", "total_z_high")
  
  cat("\nCore Paths:\n")
  cat(sprintf("  %-20s %10s %10s %10s %s\n", "Parameter", "Estimate", "CI_Lower", "CI_Upper", "Sig"))
  cat(sprintf("  %-20s %10s %10s %10s %s\n", "---------", "--------", "--------", "--------", "---"))
  
  for (p in key_params) {
    row <- res[res$parameter == p, ]
    if (nrow(row) == 1) {
      if ("ci_lower" %in% names(row) && !is.na(row$ci_lower)) {
        sig_char <- ifelse(row$sig, "*", "")
        cat(sprintf("  %-20s %10.4f %10.4f %10.4f %s\n", 
                    p, row$est, row$ci_lower, row$ci_upper, sig_char))
      } else {
        cat(sprintf("  %-20s %10.4f\n", p, row$est))
      }
    }
  }
  cat("\n  (* = 95% CI excludes zero)\n")
}

cat("\n=============================================================\n")
cat("Done. All outputs in:", OUT_DIR, "\n")
cat("=============================================================\n")
