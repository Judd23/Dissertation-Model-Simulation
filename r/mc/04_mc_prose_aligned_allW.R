# ============================================================
# Monte Carlo (single script) aligned to your prose:
# - X = FASt threshold (>=12 credits)
# - Z = credits beyond 12 scaled per +10 (Zplus10)
# - "Diminishing benefit": X effect on Y decreases as Z increases (X*Z on Y; cxz < 0)
# - Two mediators: Distress (M1) and Interact (M2)
# - Z conditions indirect pathways via X*Z on each mediator (a1xz, a2xz)
# - Subgroup variation (W) via multi-group SEM (re_all, firstgen, living, sex)
# - Simulate moderation for ONE W at a time, but run ALL four W's in one run
#
# Run:
#   Rscript mc_prose_aligned_allW.R --N 1500 --R 200 --seed 12345 --p_fast 0.20
#
# Outputs (repo root):
#   mc_prose_W_re_all_N{N}_R{R}_seed{seed}.rds
#   mc_prose_W_firstgen_N{N}_R{R}_seed{seed}.rds
#   mc_prose_W_living_N{N}_R{R}_seed{seed}.rds
#   mc_prose_W_sex_N{N}_R{R}_seed{seed}.rds
#   mc_prose_ALLW_N{N}_R{R}_seed{seed}.rds
# ============================================================

# ---------- minimal arg parser ----------
get_arg <- function(flag, default = NULL) {
  args <- commandArgs(trailingOnly = TRUE)
  idx <- match(flag, args)
  if (!is.na(idx) && length(args) >= idx + 1) return(args[idx + 1])
  default
}

# ---------- safe package install to user library ----------
install_if_missing <- function(pkg) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    lib <- Sys.getenv("R_LIBS_USER")
    dir.create(lib, recursive = TRUE, showWarnings = FALSE)
    install.packages(pkg, repos = "https://cloud.r-project.org", lib = lib)
  }
}
install_if_missing("lavaan")
library(lavaan)

# =============================================================
# Stabilization constants (RQ4 MG-WLSMV)
# =============================================================
ORDERED_VARS <- c(
  "SB1","SB2","SB3","PG1","PG2","PG3","PG4","PG5","SE1","SE2","SE3",
  "MHWdacad","MHWdlonely","MHWdmental","MHWdpeers","MHWdexhaust",
  "QIstudent","QIfaculty","QIadvisor","QIstaff"
)
NVAR_ORD <- length(ORDERED_VARS)
MIN_N_PER_GROUP <- max(NVAR_ORD, 50)

collapse_sex_2grp <- function(sex) {
  s <- as.character(sex)
  s <- trimws(tolower(s))

  out <- ifelse(s %in% c("man", "male", "m"), "Man",
    ifelse(s %in% c("woman", "female", "f"), "Woman", "Another")
  )
  out[out == "Another"] <- "Woman"
  factor(out, levels = c("Woman", "Man"))
}

group_sizes_ok <- function(dat, Wvar, min_n = MIN_N_PER_GROUP) {
  g <- dat[[Wvar]]
  if (is.null(g)) return(FALSE)
  tab <- table(g)
  if (length(tab) < 2) return(FALSE)
  all(tab >= min_n)
}

safe_fit_apath <- function(dat, Wvar) {
  if (!group_sizes_ok(dat, Wvar)) {
    return(list(ok = FALSE, reason = "small_cell", res = NULL))
  }

  fit <- try(fit_apath_mg_test(dat, Wvar), silent = TRUE)
  if (inherits(fit, "try-error") || is.null(fit)) {
    return(list(ok = FALSE, reason = "fit_error", res = NULL))
  }

  if (!isTRUE(lavaan::inspect(fit$fit_freeA, "converged"))) {
    return(list(ok = FALSE, reason = "no_converge", res = NULL))
  }

  if (is.null(fit$p) || !is.finite(fit$p)) {
    return(list(ok = FALSE, reason = "bad_p", res = NULL))
  }

  list(ok = TRUE, reason = "ok", res = fit)
}

seed   <- as.integer(get_arg("--seed", 12345))
N      <- as.integer(get_arg("--N", 1500))
Rreps  <- as.integer(get_arg("--R", 200))
p_fast <- as.numeric(get_arg("--p_fast", 0.20))
set.seed(seed)

# ---------- helper: continuous -> ordinal integer codes ----------
make_ord_int <- function(y, cuts) as.integer(cut(y, breaks = c(-Inf, cuts, Inf), labels = FALSE))

# ============================================================
# ANALYSIS MODEL (fits the prose)
# - XZ included on M1, M2, and Y
# - Conditional indirects depend on Z (through a*xz terms)
# ============================================================
analysis_model <- '
  # measurement
  Distress =~ MHWdacad + MHWdlonely + MHWdmental + MHWdpeers + MHWdexhaust
  Interact =~ QIstudent + QIfaculty + QIadvisor + QIstaff

  Belong  =~ SB1 + SB2 + SB3
  Gains   =~ PG1 + PG2 + PG3 + PG4 + PG5
  Support =~ SE1 + SE2 + SE3
  Adj =~ Belong + Gains + Support

  # structural (prose-aligned)
  # NOTE: With Z defined as Zplus10 (credits above 12), Zplus10 is 0 whenever FASt=0.
  # Therefore FAStZ = FASt*Zplus10 is algebraically identical to Zplus10, so both
  # cannot appear in the same regression without perfect multicollinearity.
  # We keep FAStZ as the dose/moderation term and omit Zplus10 from the fitted regressions.
  Distress ~ FASt + FAStZ + prep
  Interact ~ FASt + FAStZ + prep
  Adj ~ FASt + FAStZ + Distress + Interact + prep

  Distress ~~ Interact
'

ordered_vars <- ORDERED_VARS

# ============================================================
# GROUP DEFINITIONS (EDIT labels/probs to match your real coding)
# ============================================================
gen_W <- function(N) {
  re_all <- factor(sample(
    c("Latino", "White", "Asian", "Black", "Other"),
    size = N,
    replace = TRUE,
    prob = c(0.46, 0.21, 0.16, 0.05, 0.12)
  ))
  firstgen <- sample(x = c("0","1"), size = N, replace = TRUE, prob = c(0.55, 0.45))
  living <- factor(sample(
    c("WithFamily", "OffCampus", "OnCampus"),
    size = N,
    replace = TRUE,
    prob = c(0.40, 0.35, 0.25)
  ))
  sex <- sample(
    x = c("Woman","Man","Nonbinary"),
    size = N, replace = TRUE,
    prob = c(0.55, 0.43, 0.02)
  )

  sex <- collapse_sex_2grp(sex)
  list(
    re_all = factor(re_all),
    firstgen = factor(firstgen),
    living = factor(living),
    sex = factor(sex)
  )
}

# ============================================================
# POPULATION PARAMETERS (baseline)
# - Diminishing benefit: cxz < 0 in Adj equation
# - Z-conditioned indirects: a1xz, a2xz nonzero
# ============================================================
baseline <- list(
  # a paths (M equations)
  a1  = 0.20,  a1xz = 0.08,     # Distress ~ X, XZ
  a2  = 0.15,  a2xz = -0.06,    # Interact ~ X, XZ
  # b paths (to Y)
  b1  = -0.30,
  b2  = 0.40,
  # direct effects to Y
  cprime = 0.10,
  cxz    = -0.12,  # diminishing FASt benefit as Z increases
  # mediator correlation
  rho_m12 = -0.25
)

# ============================================================
# A-PATH MODERATION MAPS BY W (EDIT magnitudes as needed)
# Each map provides group-specific: a1, a1z, a1xz, a2, a2z, a2xz
# ============================================================
a_map_re_all <- list(
  White  = c(a1=0.20, a1xz=0.06, a2=0.15, a2xz=-0.06),
  Latine = c(a1=0.28, a1xz=0.09, a2=0.10, a2xz=-0.04),
  Black  = c(a1=0.35, a1xz=0.12, a2=0.06, a2xz=-0.02),
  Asian  = c(a1=0.18, a1xz=0.05, a2=0.18, a2xz=-0.07),
  Other  = c(a1=0.24, a1xz=0.07, a2=0.12, a2xz=-0.05)
)

a_map_firstgen <- list(
  `0` = c(a1=0.18, a1xz=0.05, a2=0.17, a2xz=-0.06),
  `1` = c(a1=0.30, a1xz=0.11, a2=0.09, a2xz=-0.04)
)

a_map_living <- list(
  OnCampus  = c(a1=0.16, a1xz=0.04, a2=0.20, a2xz=-0.08),
  OffCampus = c(a1=0.24, a1xz=0.08, a2=0.13, a2xz=-0.05),
  Family    = c(a1=0.32, a1xz=0.12, a2=0.07, a2xz=-0.03)
)

a_map_sex <- list(
  Woman     = c(a1=0.22, a1xz=0.08, a2=0.14, a2xz=-0.06),
  Man       = c(a1=0.18, a1xz=0.06, a2=0.17, a2xz=-0.06),
  Nonbinary = c(a1=0.30, a1xz=0.10, a2=0.10, a2xz=-0.04)
)

get_a_map <- function(W) {
  switch(
    W,
    re_all   = a_map_re_all,
    firstgen = a_map_firstgen,
    living   = a_map_living,
    sex      = a_map_sex,
    stop("Unknown W: ", W)
  )
}

# ============================================================
# DATA GENERATOR (simulate moderation for one W at a time)
# ============================================================
gen_dat_base <- function(N, p_fast, moderate_W = c("re_all","firstgen","living","sex"),
                    b1 = baseline$b1, b2 = baseline$b2,
                    cprime = baseline$cprime, cxz = baseline$cxz,
                    rho_m12 = baseline$rho_m12) {

  moderate_W <- match.arg(moderate_W)

  # --- X and credits ---
  FASt <- rbinom(N, 1, p_fast)

  trnsfr_cr <- numeric(N)
  for (i in 1:N) {
    if (FASt[i] == 0) {
      trnsfr_cr[i] <- if (runif(1) < 0.60) 0 else runif(1, 1, 11)
    } else {
      trnsfr_cr[i] <- 12 + rgamma(1, shape = 2.5, scale = 6)
      if (trnsfr_cr[i] > 60) trnsfr_cr[i] <- 60
    }
  }

  Zplus   <- pmax(0, trnsfr_cr - 12)
  Zplus10 <- Zplus / 10

  # interaction X*Z (prose-critical)
  FAStZ <- FASt * Zplus10

  # covariate
  prep <- rnorm(N, 0, 1)

  # --- subgroup variables ---
  Wlist <- gen_W(N)
  re_all   <- Wlist$re_all
  firstgen <- Wlist$firstgen
  living   <- Wlist$living
  sex      <- Wlist$sex

  # --- correlated mediator errors ---
  e1 <- rnorm(N, 0, 1)
  e2 <- rho_m12 * e1 + sqrt(1 - rho_m12^2) * rnorm(N, 0, 1)

  # --- set person-specific a parameters for the chosen W only ---
  a1_i   <- rep(baseline$a1,   N); a1xz_i <- rep(baseline$a1xz, N)
  a2_i   <- rep(baseline$a2,   N); a2xz_i <- rep(baseline$a2xz, N)

  Wvec <- switch(moderate_W,
                 re_all = re_all,
                 firstgen = firstgen,
                 living = living,
                 sex = sex)

  amap <- get_a_map(moderate_W)
  gchr <- as.character(Wvec)

  a1_i   <- vapply(gchr, function(g) amap[[g]]["a1"],   numeric(1))
  a1xz_i <- vapply(gchr, function(g) amap[[g]]["a1xz"], numeric(1))

  a2_i   <- vapply(gchr, function(g) amap[[g]]["a2"],   numeric(1))
  a2xz_i <- vapply(gchr, function(g) amap[[g]]["a2xz"], numeric(1))

  # --- mediators (Z conditions indirect pathways through XZ terms) ---
  Distress <- a1_i*FASt + a1xz_i*FAStZ + 0.15*prep + e1
  Interact <- a2_i*FASt + a2xz_i*FAStZ + 0.10*prep + e2

  # --- outcome (diminishing FASt benefit with higher Z via cxz < 0) ---
  eY <- rnorm(N, 0, 1)
  Adj <- cprime*FASt + cxz*FAStZ + b1*Distress + b2*Interact + 0.20*prep + eY

  # --- second-order structure: first-order factors ---
  Belong  <- 0.85*Adj + rnorm(N, 0, sqrt(1 - 0.85^2))
  Gains   <- 0.80*Adj + rnorm(N, 0, sqrt(1 - 0.80^2))
  Support <- 0.75*Adj + rnorm(N, 0, sqrt(1 - 0.75^2))

  # --- item loadings ---
  l_SB  <- c(0.80, 0.75, 0.78)
  l_PG  <- c(0.70, 0.72, 0.74, 0.68, 0.73)
  l_SE  <- c(0.75, 0.78, 0.72)
  l_MHW <- c(0.75, 0.75, 0.80, 0.70, 0.78)
  l_QI  <- c(0.70, 0.80, 0.75, 0.85)

  SB_star  <- sapply(1:3, function(j) l_SB[j]*Belong  + rnorm(N, 0, sqrt(1 - l_SB[j]^2)))
  PG_star  <- sapply(1:5, function(j) l_PG[j]*Gains   + rnorm(N, 0, sqrt(1 - l_PG[j]^2)))
  SE_star  <- sapply(1:3, function(j) l_SE[j]*Support + rnorm(N, 0, sqrt(1 - l_SE[j]^2)))
  MHW_star <- sapply(1:5, function(j) l_MHW[j]*Distress + rnorm(N, 0, sqrt(1 - l_MHW[j]^2)))
  QI_star  <- sapply(1:4, function(j) l_QI[j]*Interact  + rnorm(N, 0, sqrt(1 - l_QI[j]^2)))

  cuts4 <- c(-1.0, -0.2, 0.8)
  cuts6 <- c(-1.3, -0.7, -0.1, 0.5, 1.1)
  cuts7 <- c(-1.5, -0.9, -0.3, 0.3, 0.9, 1.5)

  SB  <- apply(SB_star,  2, make_ord_int, cuts = cuts4)
  PG  <- apply(PG_star,  2, make_ord_int, cuts = cuts4)
  SE  <- apply(SE_star,  2, make_ord_int, cuts = cuts4)
  MHW <- apply(MHW_star, 2, make_ord_int, cuts = cuts6)
  QI  <- apply(QI_star,  2, make_ord_int, cuts = cuts7)

  dat <- data.frame(
    FASt = FASt,
    trnsfr_cr = trnsfr_cr,
    Zplus = Zplus,
    Zplus10 = Zplus10,
    FAStZ = FAStZ,
    prep = prep,
    re_all = re_all,
    firstgen = firstgen,
    living = living,
    sex = sex,
    SB1 = SB[,1], SB2 = SB[,2], SB3 = SB[,3],
    PG1 = PG[,1], PG2 = PG[,2], PG3 = PG[,3], PG4 = PG[,4], PG5 = PG[,5],
    SE1 = SE[,1], SE2 = SE[,2], SE3 = SE[,3],
    MHWdacad    = MHW[,1],
    MHWdlonely  = MHW[,2],
    MHWdmental  = MHW[,3],
    MHWdpeers   = MHW[,4],
    MHWdexhaust = MHW[,5],
    QIstudent   = QI[,1],
    QIfaculty   = QI[,2],
    QIadvisor   = QI[,3],
    QIstaff     = QI[,4]
  )

  dat[ordered_vars] <- lapply(dat[ordered_vars], function(x) ordered(x))

  # belt + suspenders: ensure sex is always collapsed/estimable
  if ("sex" %in% names(dat)) {
    dat$sex <- collapse_sex_2grp(dat$sex)
  }
  dat
}

# ============================================================
# Multi-group nested test targeting "a-path moderation" (including XZ on M)
# H0: mediator regressions (Distress~, Interact~) are equal across W groups
#     (FASt, Zplus10, FAStZ) constrained
# H1: those a paths are free across groups
# b and direct paths are freed in the constrained model so the test isolates a paths.
# ============================================================
fit_apath_mg_test <- function(dat, Wvar) {
  dat[[Wvar]] <- droplevels(dat[[Wvar]])
  if (nlevels(dat[[Wvar]]) < 2) return(NULL)

  fit_conA <- lavaan::sem(
    analysis_model,
    data = dat,
    group = Wvar,
    ordered = ORDERED_VARS,
    estimator = "WLSMV",
    parameterization = "theta",
    std.lv = TRUE,
    group.equal = c("regressions"),
    group.partial = c(
      # free non-a regressions across groups:
      "Adj ~ Distress",
      "Adj ~ Interact",
      "Adj ~ FASt",
      "Adj ~ FAStZ"
    )
  )

  fit_freeA <- lavaan::sem(
    analysis_model,
    data = dat,
    group = Wvar,
    ordered = ORDERED_VARS,
    estimator = "WLSMV",
    parameterization = "theta",
    std.lv = TRUE
  )

  if (!isTRUE(lavInspect(fit_conA, "converged"))) return(NULL)
  if (!isTRUE(lavInspect(fit_freeA, "converged"))) return(NULL)

  lrt <- lavaan::lavTestLRT(fit_conA, fit_freeA)
  lrt_df <- as.data.frame(lrt)

  list(
    lrt = lrt_df,
    p = lrt_df$`Pr(>Chisq)`[2],
    fit_freeA = fit_freeA
  )
}

# ============================================================
# Group-specific conditional indirects at Z = 0,1,2 (i.e., +0,+10,+20 credits beyond 12)
# With XZ on mediators, conditional X->M at Z is: aX + aXZ*Z
# Indirect(z) = (aX + aXZ*z) * b
# ============================================================
grab_est <- function(pe_g, lhs, rhs) {
  val <- pe_g$est[pe_g$op == "~" & pe_g$lhs == lhs & pe_g$rhs == rhs]
  if (length(val) == 0) return(NA_real_)
  val[1]
}

compute_group_indirects <- function(fit_free, z_vals = c(0,1,2)) {
  pe <- lavaan::parameterEstimates(fit_free)
  glabels <- lavInspect(fit_free, "group.label")

  out <- vector("list", length(glabels))
  for (g in seq_along(glabels)) {
    pe_g <- pe[pe$group == g, ]

    a1   <- grab_est(pe_g, "Distress", "FASt")
    a1xz <- grab_est(pe_g, "Distress", "FAStZ")
    a2   <- grab_est(pe_g, "Interact", "FASt")
    a2xz <- grab_est(pe_g, "Interact", "FAStZ")

    b1 <- grab_est(pe_g, "Adj", "Distress")
    b2 <- grab_est(pe_g, "Adj", "Interact")

    # direct moderation (diminishing benefit) in fitted model
    cxz_hat <- grab_est(pe_g, "Adj", "FAStZ")

    row <- data.frame(group = glabels[g], cxz = cxz_hat)

    for (z in z_vals) {
      row[[paste0("ind_d_z", z)]] <- (a1 + a1xz*z) * b1
      row[[paste0("ind_q_z", z)]] <- (a2 + a2xz*z) * b2
    }

    # incremental change in the indirect per +10 credits (slope piece)
    row[["imm_d"]] <- a1xz * b1
    row[["imm_q"]] <- a2xz * b2

    out[[g]] <- row
  }

  do.call(rbind, out)
}

# ============================================================
# Monte Carlo runner: one W at a time, but execute all four W's
# ============================================================
run_mc_oneW <- function(Wvar, N, R, p_fast) {
  gen_dat <- function(N) {
    gen_dat_base(N, p_fast = p_fast, moderate_W = Wvar)
  }

  pvals <- rep(NA_real_, R)
  conv  <- rep(FALSE, R)
  indirects_list <- vector("list", R)
  fail_reason <- rep(NA_character_, R)

  for (r in seq_len(R)) {
    dat <- gen_dat(N)

    if (Wvar == "sex" && "sex" %in% names(dat)) {
      dat$sex <- collapse_sex_2grp(dat$sex)
    }

    fit_out <- safe_fit_apath(dat, Wvar)
    if (!fit_out$ok) {
      fail_reason[r] <- fit_out$reason
      next
    }

    conv[r] <- TRUE
    pvals[r] <- fit_out$res$p
    indirects_list[[r]] <- compute_group_indirects(fit_out$res$fit_freeA, z_vals = c(0,1,2))
    fail_reason[r] <- "ok"
  }

  used <- which(conv & !is.na(pvals))
  power <- if (length(used) > 0) mean(pvals[used] < 0.05) else NA_real_

  list(
    W = Wvar,
    N = N, R = R, p_fast = p_fast,
    reps_used = length(used),
    convergence_rate = mean(conv),
    power_apath_moderation = power,
    pvals = pvals,
    indirects = indirects_list[used],
    fail_reason = fail_reason
  )
}

# ============================================================
# RUN ALL FOUR W's (single run)
# ============================================================
Wvars <- c("re_all","firstgen","living","sex")
results <- vector("list", length(Wvars))
names(results) <- Wvars

cat("\n--- MC (prose-aligned) starting ---\n")
cat("N =", N, "| R =", Rreps, "| p_fast =", p_fast, "| seed =", seed, "\n\n")

for (W in Wvars) {
  cat("Running W =", W, "...\n")
  res <- run_mc_oneW(W, N, Rreps, p_fast)
  results[[W]] <- res

  cat("  reps_used:", res$reps_used,
      "| conv_rate:", sprintf("%.3f", res$convergence_rate),
      "| power(a-path):", sprintf("%.3f", res$power_apath_moderation), "\n")

  out <- sprintf("mc_prose_W_%s_N%d_R%d_seed%d.rds", W, N, Rreps, seed)
  saveRDS(res, out)
  cat("  Saved:", out, "\n\n")
}

out_all <- sprintf("mc_prose_ALLW_N%d_R%d_seed%d.rds", N, Rreps, seed)
saveRDS(results, out_all)
cat("Saved combined:", out_all, "\n")
cat("--- done ---\n")
