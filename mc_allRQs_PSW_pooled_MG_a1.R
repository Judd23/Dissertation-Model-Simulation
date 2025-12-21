# ============================================================
# MC: PSW -> pooled SEM (RQ1–RQ3) + MG SEM a1 test (RQ4; W1–W4 one-at-a-time)
# Design: X = 1(trnsfr_cr >= 12), Zplus10 = max(0, trnsfr_cr - 12)/10
# Estimator: WLSMV (ordered indicators)
# Weights: overlap weights from PS model (PSW computed for diagnostics; NOT used as SEM case weights)
# ============================================================

suppressPackageStartupMessages({
  # Needed for non-interactive Rscript runs (prevents 'trying to use CRAN without setting a mirror')
  options(repos = c(CRAN = "https://cloud.r-project.org"))
  if (!requireNamespace("lavaan", quietly = TRUE)) install.packages("lavaan")
  library(lavaan)
})

# Parallel is part of base R, but we still follow the user's requested pattern.
if (!requireNamespace("parallel", quietly = TRUE)) install.packages("parallel")
library(parallel)

get_arg <- function(flag, default = NULL) {
  args <- commandArgs(trailingOnly = TRUE)
  idx <- match(flag, args)
  if (!is.na(idx) && length(args) >= idx + 1) return(args[idx + 1])
  default
}

# --------------------------------------------------
# PSW handling (environment-safe)
# --------------------------------------------------

USE_PSW <- as.integer(get_arg("--psw", 1))

# PSW is computed for diagnostics only (not passed into SEM)

# Multi-group (RQ4) can be noisy/fragile; keep it behind a switch.
RUN_MG <- as.integer(get_arg("--mg", 1))

# Parallelization (replications over cores)
NCORES <- max(1L, parallel::detectCores() - 1L)

# Save full lavaan output to disk (text files)
SAVE_FITS <- as.integer(get_arg("--save_fits", 1))

# -------------------------
# DEBUG/DIAGNOSTICS
# -------------------------
DIAG_N <- as.integer(get_arg("--diag", 0))

# Representative study mode: generate one dataset and save full outputs for pooled + MG.
DO_REP_STUDY <- as.integer(get_arg("--repStudy", 0))

SEED <- as.integer(get_arg("--seed", 20251219))
set.seed(SEED)

# -------------------------
# SETTINGS YOU EDIT FIRST
# -------------------------
R_REPS <- 100
N      <- 3000

# Optional CLI overrides:
#   Rscript mc_allRQs_PSW_pooled_MG_a1.R --N 500 --R 5 --seed 1
R_REPS <- as.integer(get_arg("--R", R_REPS))
N      <- as.integer(get_arg("--N", N))
USE_PSW <- as.integer(get_arg("--psw", USE_PSW))
RUN_MG <- as.integer(get_arg("--mg", RUN_MG))
NCORES <- as.integer(get_arg("--cores", NCORES))
NCORES <- max(1L, NCORES)
SAVE_FITS <- as.integer(get_arg("--save_fits", SAVE_FITS))

# W variables (you run one at a time; rename to match your file)
W_LIST <- c("re_all", "firstgen", "pell", "living18", "sex")

# If provided, run MG (RQ4) for this single W only (recommended for speed).
# Support both --Wvar and the shorter alias --W.
WVAR_SINGLE <- as.character(get_arg("--Wvar", NA_character_))
if (!isTRUE(nzchar(WVAR_SINGLE)) || isTRUE(is.na(WVAR_SINGLE))) {
  WVAR_SINGLE <- as.character(get_arg("--W", NA_character_))
}
if (isTRUE(nzchar(WVAR_SINGLE)) && isTRUE(!is.na(WVAR_SINGLE))) {
  if (!WVAR_SINGLE %in% W_LIST) {
    stop("--Wvar must be one of: ", paste(W_LIST, collapse = ", "))
  }
}

# -------------------------
# OUTPUT HELPERS
# -------------------------
safe_filename <- function(x) {
  x <- gsub("[^A-Za-z0-9_.-]+", "_", as.character(x))
  x <- gsub("_+", "_", x)
  x
}

mk_run_id <- function() {
  # Include enough metadata that files are self-describing
  parts <- c(
    paste0("seed", SEED),
    paste0("N", N),
    paste0("R", R_REPS),
    paste0("psw", USE_PSW),
    paste0("mg", RUN_MG)
  )
  if (isTRUE(nzchar(WVAR_SINGLE)) && isTRUE(!is.na(WVAR_SINGLE))) {
    parts <- c(parts, paste0("W", WVAR_SINGLE))
  }
  safe_filename(paste(parts, collapse = "_"))
}

write_lavaan_output <- function(fit, file_path, title = NULL) {
  if (is.null(fit)) return(invisible(FALSE))
  dir.create(dirname(file_path), showWarnings = FALSE, recursive = TRUE)

  con <- file(file_path, open = "wt")
  on.exit(close(con), add = TRUE)

  w <- function(...) writeLines(paste0(...), con = con)
  w("# ", ifelse(is.null(title), "lavaan output", title))
  w("# Generated: ", as.character(Sys.time()))
  w("#")

  conv <- try(lavInspect(fit, "converged"), silent = TRUE)
  w("Converged: ", if (!inherits(conv, "try-error")) as.character(conv) else "NA")

  w("\n## Summary\n")
  s <- capture.output(summary(fit, standardized = TRUE, fit.measures = TRUE, rsquare = TRUE))
  writeLines(s, con)

  w("\n## Fit measures\n")
  fm <- try(fitMeasures(fit), silent = TRUE)
  if (!inherits(fm, "try-error")) {
    writeLines(capture.output(print(fm)), con)
  } else {
    w("fitMeasures() failed: ", as.character(fm))
  }

  w("\n## Parameter estimates\n")
  pe <- try(parameterEstimates(fit, standardized = TRUE), silent = TRUE)
  if (!inherits(pe, "try-error")) {
    writeLines(capture.output(print(pe)), con)
  } else {
    w("parameterEstimates() failed: ", as.character(pe))
  }

  w("\n## Modification indices (top 50)\n")
  mi <- try(modindices(fit), silent = TRUE)
  if (!inherits(mi, "try-error") && is.data.frame(mi) && nrow(mi) > 0) {
    mi <- mi[order(mi$mi, decreasing = TRUE), , drop = FALSE]
    writeLines(capture.output(print(utils::head(mi, 50))), con)
  } else {
    w("No modindices available (or failed).")
  }

  w("\n## Warnings\n")
  warn <- try(lavInspect(fit, "warnings"), silent = TRUE)
  if (!inherits(warn, "try-error") && length(warn) > 0) {
    writeLines(capture.output(print(warn)), con)
  } else {
    w("(none)")
  }

  invisible(TRUE)
}

run_representative_study <- function(N, use_psw = TRUE) {
  # One full simulated dataset + pooled + MG outputs.
  # Uses the same fitting functions as the MC, but always saves outputs.
  W_TARGETS <- W_LIST
  if (isTRUE(nzchar(WVAR_SINGLE)) && isTRUE(!is.na(WVAR_SINGLE))) W_TARGETS <- WVAR_SINGLE

  rep_dir <- file.path(
    "results",
    "repstudy",
    safe_filename(paste0("seed", SEED, "_N", N, "_psw", as.integer(use_psw), ifelse(isTRUE(nzchar(WVAR_SINGLE)) && !is.na(WVAR_SINGLE), paste0("_W", WVAR_SINGLE), "")))
  )
  dir.create(rep_dir, showWarnings = FALSE, recursive = TRUE)

  # 1) simulate one dataset
  dat <- gen_dat(N)

  # 2) PSW first (diagnostics only)
  if (isTRUE(use_psw)) {
    dat <- make_overlap_weights(dat)
  }

  # 3) pooled SEM
  fitP <- fit_pooled(dat)
  if (is.null(fitP)) stop("Representative pooled SEM failed to converge.")
  write_lavaan_output(fitP, file.path(rep_dir, "pooled.txt"), title = "Representative Study — Pooled SEM (RQ1–RQ3)")
  peP <- parameterEstimates(fitP, standardized = TRUE)
  utils::write.csv(peP, file.path(rep_dir, "pooled_parameterEstimates.csv"), row.names = FALSE)
  fm <- fitMeasures(fitP)
  utils::write.csv(data.frame(measure = names(fm), value = as.numeric(fm)), file.path(rep_dir, "pooled_fitMeasures.csv"), row.names = FALSE)

  # 4) descriptives: credit bands + W sizes
  dat$credit_band <- cut(dat$trnsfr_cr, breaks = c(-Inf, 0, 11, Inf), labels = c("0", "1–11", "12+"), right = TRUE)
  tab_credit <- as.data.frame(table(dat$credit_band))
  utils::write.csv(tab_credit, file.path(rep_dir, "credit_bands.csv"), row.names = FALSE)

  # Baseline covariate descriptives (helps sanity-check simulated placeholders)
  covars <- c("hgrades","bparented","pell","hapcl","hprecalc13","hchallenge","cSFcareer","cohort","firstgen")
  covars <- covars[covars %in% names(dat)]
  if (length(covars) > 0) {
    cov_desc <- do.call(
      rbind,
      lapply(covars, function(v) {
        x <- dat[[v]]
        if (is.factor(x) || is.character(x)) x <- as.numeric(factor(x))
        data.frame(
          var = v,
          n = sum(!is.na(x)),
          mean = mean(x, na.rm = TRUE),
          sd = stats::sd(x, na.rm = TRUE),
          min = suppressWarnings(min(x, na.rm = TRUE)),
          p25 = stats::quantile(x, 0.25, na.rm = TRUE, names = FALSE, type = 7),
          median = stats::median(x, na.rm = TRUE),
          p75 = stats::quantile(x, 0.75, na.rm = TRUE, names = FALSE, type = 7),
          max = suppressWarnings(max(x, na.rm = TRUE))
        )
      })
    )
    utils::write.csv(cov_desc, file.path(rep_dir, "baseline_covariates_descriptives.csv"), row.names = FALSE)
  }

  for (Wvar in W_TARGETS) {
    if (Wvar %in% names(dat)) {
      tab_W <- as.data.frame(table(dat[[Wvar]]))
      names(tab_W) <- c(Wvar, "n")
      utils::write.csv(tab_W, file.path(rep_dir, sprintf("W_sizes_%s.csv", safe_filename(Wvar))), row.names = FALSE)
    }
  }

  # 5) MG SEM for each W (no SEM weights)
  for (Wvar in W_TARGETS) {
    datW <- dat
    if (Wvar == "sex") datW$sex <- collapse_sex_2grp(datW$sex)
    if (Wvar %in% c("re_all", "living18")) datW[[Wvar]] <- collapse_small_to_other(datW[[Wvar]])

    outW <- fit_mg_a1_test(datW, Wvar)
    if (is.null(outW$fit)) {
      # save a minimal text note so the folder is still complete
      note_path <- file.path(rep_dir, sprintf("mg_%s_ERROR.txt", safe_filename(Wvar)))
      writeLines(
        c(
          paste0("Representative MG failed for W=", Wvar),
          paste0("reason=", outW$reason)
        ),
        con = note_path
      )
      next
    }

    write_lavaan_output(outW$fit, file.path(rep_dir, sprintf("mg_%s.txt", safe_filename(Wvar))), title = paste0("Representative Study — MG SEM (RQ4, W=", Wvar, ")"))
    peMG <- parameterEstimates(outW$fit, standardized = TRUE)
    utils::write.csv(peMG, file.path(rep_dir, sprintf("mg_parameterEstimates_%s.csv", safe_filename(Wvar))), row.names = FALSE)

    # Wald test
    G <- nlevels(factor(datW[[Wvar]]))
    cnstr <- make_a1_equal_constraints(G)
    wald <- try(lavTestWald(outW$fit, constraints = cnstr), silent = TRUE)
    if (!inherits(wald, "try-error")) {
      utils::write.csv(
        data.frame(stat = wald[["stat"]], df = wald[["df"]], p.value = wald[["p.value"]]),
        file.path(rep_dir, sprintf("mg_wald_%s.csv", safe_filename(Wvar))),
        row.names = FALSE
      )
    }
  }

  message("Representative study saved to: ", rep_dir)
  invisible(list(dat = dat, fitP = fitP))
}

# Minimum per-group size for MG (polychoric/threshold estimation needs space)
MIN_N_PER_GROUP <- 120

# -------------------------
# VARIABLE NAMES (KEEP CONSISTENT WITH YOUR R FILES)
# -------------------------
ORDERED_VARS <- c(
  "sbmyself","sbvalued","sbcommunity",
  "pgthink","pganalyze","pgwork","pgvalues","pgprobsolve",
  "SEwellness","SEnonacad","SEactivities","SEacademic","SEdiverse",
  "evalexp","sameinst",
  "MHWdacad","MHWdlonely","MHWdmental","MHWdexhaust","MHWdsleep","MHWdfinancial",
  "QIstudent","QIadvisor","QIfaculty","QIstaff","QIadmin",
  "SFcareer","SFotherwork","SFdiscuss","SFperform"
)

# -------------------------
# HELPERS
# -------------------------
make_ordinal <- function(x, K, probs = NULL) {
  # Converts continuous x to ordered factor with K levels.
  # probs optional; if NULL uses equal-quantile cuts.
  if (is.null(probs)) {
    probs <- rep(1/K, K)
  }
  probs <- probs / sum(probs)
  cuts <- quantile(x, probs = cumsum(probs)[-length(probs)], na.rm = TRUE, type = 7)
  ordered(cut(x, breaks = c(-Inf, cuts, Inf), labels = FALSE, right = TRUE))
}

collapse_small_to_other <- function(x, min_n = MIN_N_PER_GROUP, other_label = "Other") {
  x <- as.character(x)
  tab <- table(x)
  small <- names(tab)[tab < min_n]
  if (length(small) > 0) x[x %in% small] <- other_label
  factor(x)
}

collapse_sex_2grp <- function(sex) {
  s <- trimws(tolower(as.character(sex)))
  out <- ifelse(s %in% c("man","male","m"), "Man",
                ifelse(s %in% c("woman","female","f"), "Woman", "Woman"))
  factor(out, levels = c("Woman","Man"))
}

group_sizes_ok <- function(dat, Wvar, min_n = MIN_N_PER_GROUP) {
  g <- dat[[Wvar]]
  if (is.null(g)) return(FALSE)
  tab <- table(g)
  if (length(tab) < 2) return(FALSE)
  all(tab >= min_n)
}

covars_for_mg <- function(Wvar) {
  # Baseline covariates used in SEM equations (selection-bias adjustment proxies)
  # NOTE: firstgen is treated as a demographic/W variable, not a baseline covariate in the SEM.
  base <- c("hgrades","bparented","pell","hapcl","hprecalc13","hchallenge","cSFcareer","cohort")

  # Drop the grouping variable if it is in the covariate list
  setdiff(base, Wvar)
}

# PSW (overlap weights) computed for diagnostics only (not carried into SEM)
make_overlap_weights <- function(dat) {
  ps_mod <- try(glm(
    X ~ hgrades + bparented + pell + hapcl + hprecalc13 + hchallenge + cSFcareer + cohort,
    data = dat, family = binomial()
  ), silent = TRUE)

  ps <- rep(0.5, nrow(dat))
  if (!inherits(ps_mod, "try-error")) {
    ps_hat <- try(predict(ps_mod, newdata = dat, type = "response"), silent = TRUE)
    if (!inherits(ps_hat, "try-error") && length(ps_hat) == nrow(dat)) {
      ps <- as.numeric(ps_hat)
    }
  }

  ps <- pmin(pmax(ps, 1e-3), 1 - 1e-3)
  ow <- ifelse(dat$X == 1, 1 - ps, ps)
  ow <- ow / mean(ow)
  dat$psw <- ow
  dat
}

# -------------------------
# POPULATION PARAMETERS (EDIT IF YOU WANT DIFFERENT "TRUE" EFFECTS)
# -------------------------
PAR <- list(
  # RQ1: direct (X->Y) at threshold + dose slope above threshold
  c  =  0.20,
  cz = -0.10,
  cxz = -0.08,  # X×Z moderation on direct path (RQ1)

  # RQ2: distress mediator
  a1  =  0.15,   # X -> M1 (at threshold)
  a1z =  0.10,   # Zplus10 -> M1 (dose above threshold)
  a1xz =  0.08, # X×Z moderation on X->M1 (RQ2/Model 7 logic)
  b1  = -0.30,   # M1 -> Y

  # RQ3: interaction-quality mediator
  a2  =  0.20,   # X -> M2 (at threshold)
  a2z = -0.05,   # Zplus10 -> M2 (dose above threshold)
  a2xz = -0.05, # X×Z moderation on X->M2 (RQ3/Model 7 logic)
  b2  =  0.35,   # M2 -> Y

  # Optional serial link (set d = 0 if you do NOT want the serial path)
  d   = -0.20,

  # Cohort shifts (pooled indicator)
  g1 = 0.05,
  g2 = 0.00,
  g3 = 0.05
)

BETA_M1 <- c(hgrades = -0.10, bparented = -0.04, pell = 0.09, hapcl = 0.06, hprecalc13 = 0.05, hchallenge = 0.06, cSFcareer = 0.03)
BETA_M2 <- c(hgrades =  0.08, bparented =  0.04, pell = -0.04, hapcl = 0.04, hprecalc13 = 0.06, hchallenge = -0.05, cSFcareer = 0.04)
BETA_Y  <- c(hgrades =  0.10, bparented =  0.05, pell = -0.06, hapcl = 0.05, hprecalc13 = 0.06, hchallenge = -0.06, cSFcareer = 0.04)

LAM <- 0.80  # loading strength for indicators

# -------------------------
# DATA GENERATOR (FULL MODEL)
# -------------------------
gen_dat <- function(N) {

  # Cohort indicator (pooled)
  cohort <- rbinom(N, 1, 0.50)

  # -------------------------
  # Baseline covariates (selection-bias proxies; use only these in the generator)
  # -------------------------
  # Create mild correlation structure via a shared academic-prep factor.
  prep <- rnorm(N, 0, 1)
  bparented <- 0.40*prep + rnorm(N, 0, sqrt(1 - 0.40^2))
  hgrades   <- 0.60*prep + rnorm(N, 0, sqrt(1 - 0.60^2))

  # Demographic/W variables
  # First-generation (CSU systemwide undergraduates): 29.4% first in family to attend college
  firstgen  <- rbinom(N, 1, 0.294)

  # Pell Grant recipient (simulation target ~49%)
  pell      <- rbinom(N, 1, 0.49)

  # hapcl: completed >2 AP courses in HS (binary; higher probability with stronger grades)
  hapcl <- rbinom(N, 1, plogis(-0.30 + 0.65*hgrades))

  # hprecalc13: HS attendance type recoded to binary Public(0) vs Private-bucket(1)
  # Private-bucket includes: Private religiously-affiliated, Private not religiously-affiliated, Home school, Other
  hprecalc13_raw_levels <- c(
    "Public",
    "Private religiously-affiliated",
    "Private not religiously-affiliated",
    "Home school",
    "Other"
  )
  hprecalc13_raw_probs  <- c(0.90, 0.03, 0.03, 0.02, 0.02)
  hprecalc13_raw <- sample(hprecalc13_raw_levels, N, replace = TRUE, prob = hprecalc13_raw_probs)
  hprecalc13 <- as.integer(hprecalc13_raw != "Public")

  # hchallenge: HS academic challenge (continuous; related to grades and parental education)
  hchallenge <- 0.35*hgrades + 0.15*bparented + rnorm(N, 0, 1)

  # cSFcareer: baseline career orientation/goals (continuous)
  cSFcareer  <- 0.25*hgrades + rnorm(N, 0, 1)

  # -------------------------
  # W variables (simulation draws; CSU-realistic marginal distributions)
  # -------------------------
  re_all_levels <- c(
    "Hispanic/Latino",
    "White",
    "Asian",
    "Black/African American",
    "Other/Multiracial/Unknown"
  )
  re_all_probs <- c(0.46, 0.21, 0.16, 0.05, 0.12)
  re_all <- factor(sample(re_all_levels, N, replace = TRUE, prob = re_all_probs), levels = re_all_levels)

  living18_levels <- c(
    "With family (commuting)",
    "Off-campus (rent/apartment)",
    "On-campus (residence hall)"
  )
  living18_probs <- c(0.40, 0.35, 0.25)
  living18 <- factor(sample(living18_levels, N, replace = TRUE, prob = living18_probs), levels = living18_levels)

  # Sex/Gender: CSU systemwide (federal reporting) is 56% female, 44% male
  sex_levels <- c("Woman","Man")
  sex_probs  <- c(0.56, 0.44)
  sex <- collapse_sex_2grp(sample(sex_levels, N, replace = TRUE, prob = sex_probs))

  # -------------------------
  # Transfer credits (trnsfr_cr)
  # Make credit accumulation depend on the new baseline covariates to encode selection bias.
  # -------------------------
  credit_lat <- 0.50*hgrades + 0.12*bparented + 0.18*hapcl + 0.15*hchallenge + 0.10*cSFcareer -
    0.12*pell - 0.10*hprecalc13 + rnorm(N, 0, 1)
  trnsfr_cr  <- pmax(0, pmin(60, round(10 + 12*credit_lat + rnorm(N, 0, 8))))

  # Treatment + Zplus10 from trnsfr_cr (your confirmed rule)
  X <- as.integer(trnsfr_cr >= 12)
  Zplus10 <- pmax(0, trnsfr_cr - 12) / 10

  # Center Z to improve numerical stability of XZ interactions in WLSMV.
  # Note: when using XZ interaction, we must use a centered Z term consistently
  # to avoid rank deficiency in the exogenous covariate matrix.
  Zplus10_c <- as.numeric(scale(Zplus10, center = TRUE, scale = FALSE))
  XZ_c <- X * Zplus10_c

  # Keep named categories intact here; collapsing (if needed) is handled at MG-fit time.
  # sex already 2-group

  # additive deltas (kept mild)
  delta_re   <- setNames(seq(-0.08, 0.08, length.out = nlevels(re_all)), levels(re_all))
  delta_live <- setNames(seq(-0.06, 0.06, length.out = nlevels(living18)), levels(living18))
  delta_fg   <- c("0" = -0.03, "1" = 0.03)
  delta_pell <- c("0" = -0.03, "1" = 0.03)
  delta_sex  <- c("Woman" = -0.03, "Man" = 0.03)

  a1_i <- PAR$a1 +
    delta_re[as.character(re_all)] +
    delta_live[as.character(living18)] +
    delta_fg[as.character(firstgen)] +
    delta_pell[as.character(pell)] +
    delta_sex[as.character(sex)]

  # Latent M1 (Distress)
  M1_lat <- (a1_i*X) + (PAR$a1xz*XZ_c) + (PAR$a1z*Zplus10_c) + (PAR$g1*cohort) +
    BETA_M1["hgrades"]*hgrades + BETA_M1["bparented"]*bparented +
    BETA_M1["pell"]*pell + BETA_M1["hapcl"]*hapcl + BETA_M1["hprecalc13"]*hprecalc13 +
    BETA_M1["hchallenge"]*hchallenge + BETA_M1["cSFcareer"]*cSFcareer +
    rnorm(N, 0, 1)

  # Latent M2 (Quality of Interactions)
  M2_lat <- (PAR$a2*X) + (PAR$a2xz*XZ_c) + (PAR$a2z*Zplus10_c) + (PAR$d*M1_lat) + (PAR$g2*cohort) +
    BETA_M2["hgrades"]*hgrades + BETA_M2["bparented"]*bparented +
    BETA_M2["pell"]*pell + BETA_M2["hapcl"]*hapcl + BETA_M2["hprecalc13"]*hprecalc13 +
    BETA_M2["hchallenge"]*hchallenge + BETA_M2["cSFcareer"]*cSFcareer +
    rnorm(N, 0, 1)

  # Latent DevAdj (second-order)
  Y_lat <- (PAR$c*X) + (PAR$cxz*XZ_c) + (PAR$cz*Zplus10_c) + (PAR$b1*M1_lat) + (PAR$b2*M2_lat) + (PAR$g3*cohort) +
    BETA_Y["hgrades"]*hgrades + BETA_Y["bparented"]*bparented +
    BETA_Y["pell"]*pell + BETA_Y["hapcl"]*hapcl + BETA_Y["hprecalc13"]*hprecalc13 +
    BETA_Y["hchallenge"]*hchallenge + BETA_Y["cSFcareer"]*cSFcareer +
    rnorm(N, 0, 1)

  Belong_lat  <- 0.85*Y_lat + rnorm(N, 0, sqrt(1 - 0.85^2))
  Gains_lat   <- 0.85*Y_lat + rnorm(N, 0, sqrt(1 - 0.85^2))
  SuppEnv_lat <- 0.85*Y_lat + rnorm(N, 0, sqrt(1 - 0.85^2))
  Satisf_lat  <- 0.85*Y_lat + rnorm(N, 0, sqrt(1 - 0.85^2))

  # Generate continuous item tendencies, then make ordinal
  # SB, PG, SE set to 5-category for SB (Belong) indicators
  sbmyself    <- make_ordinal(LAM*Belong_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 5)
  sbvalued    <- make_ordinal(LAM*Belong_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 5)
  sbcommunity <- make_ordinal(LAM*Belong_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 5)

  pgthink     <- make_ordinal(LAM*Gains_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  pganalyze   <- make_ordinal(LAM*Gains_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  pgwork      <- make_ordinal(LAM*Gains_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  pgvalues    <- make_ordinal(LAM*Gains_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  pgprobsolve <- make_ordinal(LAM*Gains_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)

  SEwellness   <- make_ordinal(LAM*SuppEnv_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  SEnonacad    <- make_ordinal(LAM*SuppEnv_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  SEactivities <- make_ordinal(LAM*SuppEnv_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  SEacademic   <- make_ordinal(LAM*SuppEnv_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  SEdiverse    <- make_ordinal(LAM*SuppEnv_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)

  evalexp  <- make_ordinal(LAM*Satisf_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  sameinst <- make_ordinal(LAM*Satisf_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)

  # MHW difficulty set to 6-category
  MHWdacad    <- make_ordinal(LAM*M1_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 6)
  MHWdlonely  <- make_ordinal(LAM*M1_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 6)
  MHWdmental  <- make_ordinal(LAM*M1_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 6)
  MHWdexhaust <- make_ordinal(LAM*M1_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 6)
  MHWdsleep   <- make_ordinal(LAM*M1_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 6)
  MHWdfinancial <- make_ordinal(LAM*M1_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 6)

  # Quality of Interactions (NSSE): 7-category frequency/quality items
  QIstudent <- make_ordinal(LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 7)
  QIadvisor <- make_ordinal(LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 7)
  QIfaculty <- make_ordinal(LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 7)
  QIstaff   <- make_ordinal(LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 7)
  QIadmin   <- make_ordinal(LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 7)

  # Student–Faculty Interaction (NSSE): 4-category frequency items
  SFcareer    <- make_ordinal(LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  SFotherwork <- make_ordinal(LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  SFdiscuss   <- make_ordinal(LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  SFperform   <- make_ordinal(LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)

  dat <- data.frame(
    cohort,
    hgrades, bparented, pell, hapcl, hprecalc13, hchallenge, cSFcareer,
    firstgen,
    re_all, living18, sex,
    trnsfr_cr,
    X, Zplus10, Zplus10_c, XZ_c,
    sbmyself, sbvalued, sbcommunity,
    pgthink, pganalyze, pgwork, pgvalues, pgprobsolve,
    SEwellness, SEnonacad, SEactivities, SEacademic, SEdiverse,
    evalexp, sameinst,
    MHWdacad, MHWdlonely, MHWdmental, MHWdexhaust, MHWdsleep, MHWdfinancial,
    QIstudent, QIadvisor, QIfaculty, QIstaff, QIadmin,
    SFcareer, SFotherwork, SFdiscuss, SFperform
  )

  dat
}

# -------------------------
# POOLED SEM SYNTAX (RQ1–RQ3)
# -------------------------
build_model_pooled <- function(zbar) {
  # Conditional effects are defined at raw Zplus10 values (0,1,2,3,4),
  # but the fitted model uses centered Zplus10_c and XZ_c.
  # For a given raw z, the corresponding centered value is z - zbar.
  zc0 <- 0 - zbar
  zc1 <- 1 - zbar
  zc2 <- 2 - zbar
  zc3 <- 3 - zbar
  zc4 <- 4 - zbar

  paste0('
  # measurement
  Belong =~ sbmyself + sbvalued + sbcommunity
  Gains  =~ pgthink + pganalyze + pgwork + pgvalues + pgprobsolve
  SuppEnv =~ SEwellness + SEnonacad + SEactivities + SEacademic + SEdiverse
  Satisf =~ evalexp + sameinst
  DevAdj =~ Belong + Gains + SuppEnv + Satisf

  M1 =~ MHWdacad + MHWdlonely + MHWdmental + MHWdexhaust + MHWdsleep + MHWdfinancial
  M2 =~ QIstudent + QIadvisor + QIfaculty + QIstaff + QIadmin + SFcareer + SFotherwork + SFdiscuss + SFperform

  # structural (pooled)
  M1 ~ a1*X + a1xz*XZ_c + a1z*Zplus10_c + g1*cohort +
    hgrades + bparented + pell + hapcl + hprecalc13 + hchallenge + cSFcareer

  M2 ~ a2*X + a2xz*XZ_c + a2z*Zplus10_c + d*M1 + g2*cohort +
    hgrades + bparented + pell + hapcl + hprecalc13 + hchallenge + cSFcareer

  DevAdj ~ c*X + cxz*XZ_c + cz*Zplus10_c + b1*M1 + b2*M2 + g3*cohort +
     hgrades + bparented + pell + hapcl + hprecalc13 + hchallenge + cSFcareer

  # conditional effects along raw Zplus10 = 0,1,2,3,4 (0/10/20/30/40 credits above threshold)

  # X->M paths conditional on Z (a-paths)
  a1_z0 := a1 + a1xz*', sprintf('%.8f', zc0), '
  a1_z1 := a1 + a1xz*', sprintf('%.8f', zc1), '
  a1_z2 := a1 + a1xz*', sprintf('%.8f', zc2), '
  a1_z3 := a1 + a1xz*', sprintf('%.8f', zc3), '
  a1_z4 := a1 + a1xz*', sprintf('%.8f', zc4), '

  a2_z0 := a2 + a2xz*', sprintf('%.8f', zc0), '
  a2_z1 := a2 + a2xz*', sprintf('%.8f', zc1), '
  a2_z2 := a2 + a2xz*', sprintf('%.8f', zc2), '
  a2_z3 := a2 + a2xz*', sprintf('%.8f', zc3), '
  a2_z4 := a2 + a2xz*', sprintf('%.8f', zc4), '

  # indirects (parallel)
  ind_M1_z0 := a1_z0*b1
  ind_M1_z1 := a1_z1*b1
  ind_M1_z2 := a1_z2*b1
  ind_M1_z3 := a1_z3*b1
  ind_M1_z4 := a1_z4*b1

  ind_M2_z0 := a2_z0*b2
  ind_M2_z1 := a2_z1*b2
  ind_M2_z2 := a2_z2*b2
  ind_M2_z3 := a2_z3*b2
  ind_M2_z4 := a2_z4*b2

  # serial
  ind_serial_z0 := a1_z0*d*b2
  ind_serial_z1 := a1_z1*d*b2
  ind_serial_z2 := a1_z2*d*b2
  ind_serial_z3 := a1_z3*d*b2
  ind_serial_z4 := a1_z4*d*b2

  # direct (X->Y) conditional on Z
  direct_z0 := c + cxz*', sprintf('%.8f', zc0), '
  direct_z1 := c + cxz*', sprintf('%.8f', zc1), '
  direct_z2 := c + cxz*', sprintf('%.8f', zc2), '
  direct_z3 := c + cxz*', sprintf('%.8f', zc3), '
  direct_z4 := c + cxz*', sprintf('%.8f', zc4), '

  total_z0 := direct_z0 + ind_M1_z0 + ind_M2_z0 + ind_serial_z0
  total_z1 := direct_z1 + ind_M1_z1 + ind_M2_z1 + ind_serial_z1
  total_z2 := direct_z2 + ind_M1_z2 + ind_M2_z2 + ind_serial_z2
  total_z3 := direct_z3 + ind_M1_z3 + ind_M2_z3 + ind_serial_z3
  total_z4 := direct_z4 + ind_M1_z4 + ind_M2_z4 + ind_serial_z4
')
}

# -------------------------
# MG SEM FOR RQ4 (ONLY a1 VARIES BY GROUP)
# -------------------------
make_model_mg_a1 <- function(G, cov_string) {
  a1_vec  <- paste0("a1_", seq_len(G))
  a1xz_vec <- paste0("a1xz_", seq_len(G))
  a1_free  <- paste0("c(", paste(a1_vec, collapse = ","), ")*X")
  a1xz_free <- paste0("c(", paste(a1xz_vec, collapse = ","), ")*XZ_c")

  paste0('
    # measurement
    Belong =~ sbmyself + sbvalued + sbcommunity
    Gains  =~ pgthink + pganalyze + pgwork + pgvalues + pgprobsolve
    SuppEnv =~ SEwellness + SEnonacad + SEactivities + SEacademic + SEdiverse
    Satisf =~ evalexp + sameinst
    DevAdj =~ Belong + Gains + SuppEnv + Satisf

    M1 =~ MHWdacad + MHWdlonely + MHWdmental + MHWdexhaust + MHWdsleep + MHWdfinancial
    M2 =~ QIstudent + QIadvisor + QIfaculty + QIstaff + QIadmin + SFcareer + SFotherwork + SFdiscuss + SFperform

    # structural (a1 and a1xz vary by group; other paths equal)
    M1 ~ ', a1_free, ' + ', a1xz_free, ' + a1z*Zplus10_c + g1*cohort + ', cov_string, '

    M2 ~ a2*X + a2xz*XZ_c + a2z*Zplus10_c + d*M1 + g2*cohort + ', cov_string, '

    DevAdj ~ c*X + cxz*XZ_c + cz*Zplus10_c + b1*M1 + b2*M2 + g3*cohort + ', cov_string, '
  ')
}

make_a1_equal_constraints <- function(G) {
  # a1_1 == a1_2 == ... == a1_G  AND  a1xz_1 == a1xz_2 == ... == a1xz_G
  if (G <= 1) return("")
  c1 <- paste(sapply(2:G, function(g) sprintf("a1_1 == a1_%d", g)), collapse = ";\n")
  c2 <- paste(sapply(2:G, function(g) sprintf("a1xz_1 == a1xz_%d", g)), collapse = ";\n")
  paste(c(c1, c2), collapse = ";\n")
}

fit_pooled <- function(dat) {
  args <- list(
    model = build_model_pooled(zbar = mean(dat$Zplus10, na.rm = TRUE)),
    data = dat,
    ordered = ORDERED_VARS,
    estimator = "WLSMV",
    parameterization = "theta",
    std.lv = TRUE,
    missing = "pairwise",
    control = list(iter.max = 2000)  # hard stop instead of endless churn
  )

  # IMPORTANT:
  # lavaan + ordered indicators + WLSMV + sampling.weights is currently unstable here
  # (internal "subscript out of bounds" during W-matrix construction).
  # We therefore compute PSW but do NOT pass it into SEM estimation.

  fit <- tryCatch(
    do.call(lavaan::sem, args),
    error = function(e) {
      message("[pooled fit_error] ", e$message)
      return(NULL)
    }
  )
  if (is.null(fit)) return(NULL)
  if (!isTRUE(lavInspect(fit, "converged"))) {
    if (isTRUE(DIAG_N > 0)) {
      message("fit_pooled(): model did not converge")
      warn <- try(lavInspect(fit, "warnings"), silent = TRUE)
      if (!inherits(warn, "try-error") && length(warn) > 0) {
        message("Warnings (first 5):")
        message(paste0("- ", head(warn, 5), collapse = "\n"))
      }
    }
    return(NULL)
  }

  fit
}

fit_mg_a1_test <- function(dat, Wvar) {
  dat[[Wvar]] <- factor(dat[[Wvar]])
  G <- nlevels(dat[[Wvar]])
  if (G < 2) return(list(ok = FALSE, p = NA_real_, reason = "one_group", fit = NULL))

  if (!group_sizes_ok(dat, Wvar)) return(list(ok = FALSE, p = NA_real_, reason = "small_cell", fit = NULL))

  covs <- covars_for_mg(Wvar)
  cov_string <- paste(covs[covs != "cohort"], collapse = " + ")
  # cohort is already included explicitly as g*cohort terms, so don't double-add it
  model_mg <- make_model_mg_a1(G, cov_string)

  args <- list(
    model = model_mg,
    data = dat,
    group = Wvar,
    ordered = ORDERED_VARS,
    estimator = "WLSMV",
    parameterization = "theta",
    std.lv = TRUE,
    missing = "pairwise",
    # make measurement comparable for MG test in the simulation
    group.equal = c("loadings","thresholds")
  )

  fit0 <- try(do.call(lavaan::sem, args), silent = TRUE)
  if (inherits(fit0, "try-error")) {
    if (isTRUE(DIAG_N > 0)) {
      msg <- as.character(fit0)
      message("[MG fit_error] Wvar=", Wvar, " | ", msg)
    }
    return(list(ok = FALSE, p = NA_real_, reason = "fit_error", fit = NULL))
  }
  if (!isTRUE(lavInspect(fit0, "converged"))) return(list(ok = FALSE, p = NA_real_, reason = "no_converge", fit = fit0))

  fit <- fit0
  cnstr <- make_a1_equal_constraints(G)
  wald <- try(lavTestWald(fit, constraints = cnstr), silent = TRUE)
  if (inherits(wald, "try-error")) return(list(ok = FALSE, p = NA_real_, reason = "wald_error", fit = fit))

  p <- as.numeric(wald[["p.value"]])
  if (!is.finite(p)) return(list(ok = FALSE, p = NA_real_, reason = "bad_p", fit = fit))

  list(ok = TRUE, p = p, reason = "ok", fit = fit)
}

run_mc <- function() {
  # -------------------------
  # MONTE CARLO RUN
  # -------------------------
  # storage
  W_TARGETS <- W_LIST
  if (isTRUE(nzchar(WVAR_SINGLE)) && isTRUE(!is.na(WVAR_SINGLE))) W_TARGETS <- WVAR_SINGLE

  pooled_targets <- c("a1","a1xz","a1z","a2","a2xz","a2z","d","c","cxz","cz","b1","b2",
                      "a1_z0","a1_z1","a1_z2","a1_z3","a1_z4",
                      "a2_z0","a2_z1","a2_z2","a2_z3","a2_z4",
                      "direct_z0","direct_z1","direct_z2","direct_z3","direct_z4",
                      "ind_M1_z0","ind_M1_z1","ind_M1_z2","ind_M1_z3","ind_M1_z4",
                      "ind_M2_z0","ind_M2_z1","ind_M2_z2","ind_M2_z3","ind_M2_z4",
                      "ind_serial_z0","ind_serial_z1","ind_serial_z2","ind_serial_z3","ind_serial_z4",
                      "total_z0","total_z1","total_z2","total_z3","total_z4")

  pooled_est <- as.data.frame(matrix(NA_real_, nrow = R_REPS, ncol = length(pooled_targets)))
  names(pooled_est) <- pooled_targets
  pooled_converged <- rep(0L, R_REPS)

  rq4_pvals <- setNames(as.data.frame(matrix(NA_real_, nrow = R_REPS, ncol = length(W_TARGETS))), W_TARGETS)
  rq4_ok    <- setNames(as.data.frame(matrix(0L, nrow = R_REPS, ncol = length(W_TARGETS))), W_TARGETS)
  rq4_reason <- lapply(W_TARGETS, function(x) rep(NA_character_, R_REPS))
  names(rq4_reason) <- W_TARGETS

  # --- One replication as a pure function (makes parallelization easy) ---
  one_rep <- function(r) {
    dat <- gen_dat(N)

    # PSW first (weights computed prior to SEM estimation)
    if (isTRUE(USE_PSW == 1)) {
      dat <- make_overlap_weights(dat)
    }

    # pooled SEM (tests RQ1–RQ3)
    pooled_ok <- 0L
    pooled_row <- setNames(as.list(rep(NA_real_, length(pooled_targets))), pooled_targets)
    fitP <- fit_pooled(dat)
    pooled_path <- NA_character_
    if (!is.null(fitP)) {
      pooled_ok <- 1L
      pe <- parameterEstimates(fitP)
      pe2 <- pe[pe$label %in% pooled_targets & pe$op %in% c("~",":="), c("label","est")]
      if (nrow(pe2) > 0) {
        for (i in seq_len(nrow(pe2))) pooled_row[[pe2$label[i]]] <- pe2$est[i]
      }

      if (isTRUE(SAVE_FITS == 1)) {
        run_dir <- file.path("results", "lavaan", mk_run_id())
        pooled_path <- file.path(run_dir, sprintf("rep%03d_pooled.txt", r))
        write_lavaan_output(fitP, pooled_path, title = paste0("Pooled SEM (rep ", r, ")"))
      }
    }

    # RQ4: MG tests, one W at a time (a1 differs by group)
    mg <- list()
    mg_paths <- list()
    if (isTRUE(RUN_MG == 1)) {
      for (Wvar in W_TARGETS) {
        # light category handling for MC stability
        if (Wvar == "sex") dat$sex <- collapse_sex_2grp(dat$sex)
        if (Wvar %in% c("re_all","living18")) dat[[Wvar]] <- collapse_small_to_other(dat[[Wvar]])

        outW <- fit_mg_a1_test(dat, Wvar)
        mg[[Wvar]] <- outW

        if (isTRUE(SAVE_FITS == 1) && !is.null(outW[["fit"]])) {
          run_dir <- file.path("results", "lavaan", mk_run_id())
          mg_path <- file.path(run_dir, sprintf("rep%03d_mg_%s.txt", r, safe_filename(Wvar)))
          mg_paths[[Wvar]] <- mg_path
          write_lavaan_output(outW$fit, mg_path, title = paste0("MG SEM (W=", Wvar, ", rep ", r, ")"))
        }
      }
    }

    list(
      pooled_ok = pooled_ok,
      pooled_row = pooled_row,
      pooled_path = pooled_path,
      mg = mg,
      mg_paths = mg_paths
    )
  }

  # --- Run replications ---
  reps <- seq_len(R_REPS)
  if (isTRUE(DIAG_N > 0)) {
    message("run_mc(): reps=", R_REPS, ", N=", N, ", mg=", RUN_MG, ", psw=", USE_PSW, ", cores=", NCORES)
  }

  # Reproducible parallel RNG: each fork inherits stream; we then set per-rep seed.
  # NOTE: forking (mclapply) works on macOS/Linux. On Windows, run sequential.
  results <- NULL
  if (.Platform$OS.type != "windows" && NCORES > 1L) {
    results <- parallel::mclapply(
      reps,
      function(r) {
        set.seed(SEED + r)
        one_rep(r)
      },
      mc.cores = NCORES
    )
  } else {
    results <- lapply(
      reps,
      function(r) {
        set.seed(SEED + r)
        one_rep(r)
      }
    )
  }

  # --- Collect results back into the pre-allocated containers ---
  for (r in reps) {
    out <- results[[r]]
    pooled_converged[r] <- out$pooled_ok
    pooled_est[r, names(out$pooled_row)] <- as.numeric(out$pooled_row)

    if (isTRUE(RUN_MG == 1) && length(out$mg) > 0) {
      for (Wvar in names(out$mg)) {
        outW <- out$mg[[Wvar]]
        rq4_reason[[Wvar]][r] <- outW$reason
        if (isTRUE(outW$ok)) {
          rq4_ok[r, Wvar] <- 1L
          rq4_pvals[r, Wvar] <- outW$p
        }
      }
    }
  }

  # -------------------------
  # SUMMARIES
  # -------------------------
  cat("\n=============================\n")
  cat("POOLED SEM (RQ1–RQ3)\n")
  cat("Convergence rate:", mean(pooled_converged), "\n")

  # quick bias/SD table for core paths
  core <- c("c","cxz","cz","a1","a1xz","a1z","a2","a2xz","a2z","b1","b2","d")
  truth <- c(c = PAR$c, cxz = PAR$cxz, cz = PAR$cz,
             a1 = PAR$a1, a1xz = PAR$a1xz, a1z = PAR$a1z,
             a2 = PAR$a2, a2xz = PAR$a2xz, a2z = PAR$a2z,
             b1 = PAR$b1, b2 = PAR$b2, d = PAR$d)

  summ <- data.frame(
    param = core,
    true  = as.numeric(truth[core]),
    mean_est = sapply(core, function(p) mean(pooled_est[[p]], na.rm = TRUE)),
    sd_est   = sapply(core, function(p) sd(pooled_est[[p]], na.rm = TRUE)),
    bias     = sapply(core, function(p) mean(pooled_est[[p]], na.rm = TRUE) - truth[p])
  )
  print(summ, row.names = FALSE)

  if (isTRUE(RUN_MG == 1)) {
    cat("\n=============================\n")
    if (isTRUE(nzchar(WVAR_SINGLE)) && isTRUE(!is.na(WVAR_SINGLE))) {
      cat("RQ4 MG a1 tests (W = ", WVAR_SINGLE, ")\n", sep = "")
    } else {
      cat("RQ4 MG a1 tests (one W at a time)\n")
    }
    for (Wvar in W_TARGETS) {
      used <- which(rq4_ok[[Wvar]] == 1 & is.finite(rq4_pvals[[Wvar]]))
      power <- if (length(used) > 0) mean(rq4_pvals[[Wvar]][used] < 0.05) else NA_real_
      cat("\nW:", Wvar, "\n")
      cat("Used reps:", length(used), " / ", R_REPS, "\n", sep = "")
      cat("Power (reject equal a1 across groups):", power, "\n")
      cat("Fail reasons:\n")
      print(sort(table(rq4_reason[[Wvar]], useNA = "ifany"), decreasing = TRUE))
    }
  }

  invisible(list(
    pooled_est = pooled_est,
    pooled_converged = pooled_converged,
    rq4_pvals = rq4_pvals,
    rq4_ok = rq4_ok,
    rq4_reason = rq4_reason
  ))
}

# Only run the Monte Carlo when executed via Rscript, not when sourced()
if (sys.nframe() == 0) {
  if (isTRUE(DO_REP_STUDY == 1)) {
    run_representative_study(N = N, use_psw = isTRUE(USE_PSW == 1))
  } else {
    run_mc()
  }
}
