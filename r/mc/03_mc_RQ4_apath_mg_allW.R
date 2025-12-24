
# ============================================================
# Monte Carlo (RQ4): a-path moderation via multi-group SEM
# Dissertation-aligned constructs:
#   X = FASt status
#   Z = credit dose (credit_dose_c, centered)
#   M1 = Emotional distress (MHW items)
#   M2 = Quality of interactions (QI + SF items)
#   Y  = Developmental adjustment (second-order DevAdj)
#
# Purpose:
#   Before real data, evaluate whether a multi-group WLSMV SEM can detect
#   group differences in the moderated a-path: (X -> M1) and (X*Z -> M1)
#   across W groups (RQ4-style test).
#
# Run:
#   Rscript mc_apath_moderation_allW.R --N 1500 --R 200 --seed 12345 --p_fast 0.20
#
# Outputs (written to results/mc_apath/):
#   mc_apath_W_<W>_N<N>_R<R>_seed<seed>.rds  (per-W)
#   mc_apath_ALLW_N<N>_R<R>_seed<seed>.rds   (combined)
# ============================================================

# ---------- minimal arg parser (no extra packages) ----------
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
suppressPackageStartupMessages(library(lavaan))

seed   <- as.integer(get_arg("--seed", 12345))
N      <- as.integer(get_arg("--N", 1500))
Rreps  <- as.integer(get_arg("--R", 200))
p_fast <- as.numeric(get_arg("--p_fast", 0.20))

set.seed(seed)

out_dir <- file.path("results", "mc_apath")
dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)

# =============================================================
# Ordered indicators (match dissertation item naming)
# =============================================================
ORDERED_VARS <- c(
  # Belong
  "sbvalued","sbmyself","sbcommunity",
  # Gains
  "pganalyze","pgthink","pgwork","pgvalues","pgprobsolve",
  # Supportive Environment
  "SEacademic","SEwellness","SEnonacad","SEactivities","SEdiverse",
  # Satisfaction
  "sameinst","evalexp",
  # Emotional distress (M1)
  "MHWdacad","MHWdlonely","MHWdmental","MHWdexhaust","MHWdsleep","MHWdfinancial",
  # Quality of interactions (M2)
  "QIadmin","QIstudent","QIadvisor","QIfaculty","QIstaff",
  "SFcareer","SFotherwork","SFdiscuss","SFperform"
)

# Guardrail: MG WLSMV needs decent per-group N
MIN_N_PER_GROUP <- max(length(ORDERED_VARS), 60)

# ---------- helper: continuous -> ordinal integer codes ----------
make_ord_int <- function(y, cuts) as.integer(cut(y, breaks = c(-Inf, cuts, Inf), labels = FALSE))

# ============================================================
# Group variables used for RQ4 multi-group tests
# ============================================================
collapse_sex_2grp <- function(sex) {
  s <- as.character(sex)
  s <- trimws(tolower(s))
  out <- ifelse(s %in% c("man", "male", "m"), "Man",
                ifelse(s %in% c("woman", "female", "f"), "Woman", "Another"))
  out[out == "Another"] <- "Woman"
  factor(out, levels = c("Woman", "Man"))
}

# Use the same re_all labels seen in your diagnostics output
gen_W <- function(N) {
  re_all <- sample(
    x = c("Hispanic/Latino","White","Asian","Black/African American","Other/Multiracial/Unknown"),
    size = N, replace = TRUE,
    prob = c(0.48, 0.20, 0.14, 0.08, 0.10)
  )
  firstgen <- sample(x = c("0","1"), size = N, replace = TRUE, prob = c(0.55, 0.45))
  living <- sample(x = c("OnCampus","OffCampus","Family"), size = N, replace = TRUE, prob = c(0.20, 0.45, 0.35))
  sex <- sample(x = c("Woman","Man","Nonbinary"), size = N, replace = TRUE, prob = c(0.55, 0.43, 0.02))
  sex <- collapse_sex_2grp(sex)

  list(
    re_all = factor(re_all),
    firstgen = factor(firstgen),
    living = factor(living),
    sex = factor(sex)
  )
}

group_sizes_ok <- function(dat, Wvar, min_n = MIN_N_PER_GROUP) {
  g <- dat[[Wvar]]
  if (is.null(g)) return(FALSE)
  tab <- table(g)
  if (length(tab) < 2) return(FALSE)
  all(tab >= min_n)
}

# ============================================================
# Analysis model for MG test: same structure as dissertation MG piece
# (focus is on M1 ~ X + XZ_c; the rest is included to keep model coherent)
# ============================================================
analysis_model <- '
  # measurement (marker-variable identification)
  Belong =~ 1*sbvalued + sbmyself + sbcommunity
  Gains  =~ 1*pganalyze + pgthink + pgwork + pgvalues + pgprobsolve
  SuppEnv =~ 1*SEacademic + SEwellness + SEnonacad + SEactivities + SEdiverse
  Satisf =~ 1*sameinst + evalexp
  DevAdj =~ 1*Belong + Gains + SuppEnv + Satisf

  M1 =~ 1*MHWdacad + MHWdlonely + MHWdmental + MHWdexhaust + MHWdsleep + MHWdfinancial
  M2 =~ 1*QIadmin + QIstudent + QIadvisor + QIfaculty + QIstaff + SFcareer + SFotherwork + SFdiscuss + SFperform

  # structural (subset consistent with dissertation)
  M1 ~ a1*X + a1xz*XZ_c + a1z*credit_dose_c
  M2 ~ a2*X + a2xz*XZ_c + a2z*credit_dose_c + d*M1
  DevAdj ~ c*X + cxz*XZ_c + cz*credit_dose_c + b1*M1 + b2*M2
'

# ============================================================
# Data generator (ordinal indicators + centered dose + interaction)
# Only ONE W at a time drives true differences in (a1, a1xz).
# ============================================================
# Baseline structural values (close to your dissertation MC targets)
baseline <- list(
  a1 = 0.20, a1xz = 0.05, a1z = 0.20,
  a2 = 0.20, a2xz = -0.05, a2z = -0.08,
  d = -0.30,
  b1 = -0.30, b2 = 0.35,
  c = 0.20, cxz = -0.08, cz = -0.10
)

# Group maps: vary only a1 and a1xz by group for the chosen W
map_re_all <- list(
  "Hispanic/Latino" = c(a1 = 0.22, a1xz = 0.08),
  "White" = c(a1 = 0.18, a1xz = 0.04),
  "Asian" = c(a1 = 0.16, a1xz = 0.02),
  "Black/African American" = c(a1 = 0.30, a1xz = 0.12),
  "Other/Multiracial/Unknown" = c(a1 = 0.20, a1xz = 0.06)
)
map_firstgen <- list(
  "0" = c(a1 = 0.18, a1xz = 0.04),
  "1" = c(a1 = 0.26, a1xz = 0.10)
)
map_living <- list(
  "OnCampus" = c(a1 = 0.16, a1xz = 0.03),
  "OffCampus" = c(a1 = 0.22, a1xz = 0.08),
  "Family" = c(a1 = 0.28, a1xz = 0.11)
)
map_sex <- list(
  "Woman" = c(a1 = 0.22, a1xz = 0.07),
  "Man" = c(a1 = 0.18, a1xz = 0.03)
)

get_map <- function(W) {
  switch(W,
    re_all = map_re_all,
    firstgen = map_firstgen,
    living = map_living,
    sex = map_sex,
    stop("Unknown W: ", W)
  )
}

# Create one synthetic dataset
# credit_dose = (entry_credits - 12)/10; credit_dose_c centered within dataset
# XZ_c = X * credit_dose_c

gen_dat <- function(N, p_fast, moderate_W) {
  moderate_W <- match.arg(moderate_W, c("re_all","firstgen","living","sex"))

  # Treatment
  X <- rbinom(N, 1, p_fast)

  # Entry credits (rough proxy for FASt/non-FASt distributions)
  entry_credits <- numeric(N)
  for (i in seq_len(N)) {
    if (X[i] == 0) {
      entry_credits[i] <- if (runif(1) < 0.60) 0 else runif(1, 1, 11)
    } else {
      entry_credits[i] <- 12 + rgamma(1, shape = 2.5, scale = 6)
      if (entry_credits[i] > 60) entry_credits[i] <- 60
    }
  }

  credit_dose <- (entry_credits - 12) / 10
  credit_dose[credit_dose < 0] <- 0
  credit_dose_c <- credit_dose - mean(credit_dose)
  XZ_c <- X * credit_dose_c

  # Group vars
  Wlist <- gen_W(N)
  re_all <- Wlist$re_all
  firstgen <- Wlist$firstgen
  living <- Wlist$living
  sex <- Wlist$sex

  Wvec <- switch(moderate_W,
    re_all = re_all,
    firstgen = firstgen,
    living = living,
    sex = sex
  )

  # Assign group-specific (a1, a1xz) only for the chosen W
  amap <- get_map(moderate_W)
  gchr <- as.character(Wvec)

  a1_i <- vapply(gchr, function(g) amap[[g]]["a1"], numeric(1))
  a1xz_i <- vapply(gchr, function(g) amap[[g]]["a1xz"], numeric(1))

  # Disturbances
  e1 <- rnorm(N)
  e2 <- (-0.25) * e1 + sqrt(1 - 0.25^2) * rnorm(N)
  eY <- rnorm(N)

  # Latent structural variables
  M1_lat <- a1_i*X + a1xz_i*XZ_c + baseline$a1z*credit_dose_c + e1
  M2_lat <- baseline$a2*X + baseline$a2xz*XZ_c + baseline$a2z*credit_dose_c + baseline$d*M1_lat + e2
  DevAdj_lat <- baseline$c*X + baseline$cxz*XZ_c + baseline$cz*credit_dose_c + baseline$b1*M1_lat + baseline$b2*M2_lat + eY

  # First-order factors for DevAdj second-order
  Belong_lat <- 0.80*DevAdj_lat + rnorm(N, 0, sqrt(1 - 0.80^2))
  Gains_lat  <- 0.80*DevAdj_lat + rnorm(N, 0, sqrt(1 - 0.80^2))
  SuppEnv_lat <- 0.75*DevAdj_lat + rnorm(N, 0, sqrt(1 - 0.75^2))
  Satisf_lat <- 0.70*DevAdj_lat + rnorm(N, 0, sqrt(1 - 0.70^2))

  # Indicator loadings (kept moderate, consistent with Likert scales)
  l_sb <- c(0.80, 0.75, 0.78)
  l_pg <- c(0.70, 0.72, 0.74, 0.68, 0.73)
  l_se <- c(0.75, 0.78, 0.72, 0.76, 0.74)
  l_sat <- c(0.80, 0.75)
  l_mhw <- c(0.75, 0.75, 0.80, 0.78, 0.70, 0.76)
  l_qi <- c(0.80, 0.75, 0.78, 0.70, 0.74)
  l_sf <- c(0.72, 0.70, 0.76, 0.74)

  sb_star <- sapply(seq_along(l_sb), function(j) l_sb[j]*Belong_lat + rnorm(N, 0, sqrt(1 - l_sb[j]^2)))
  pg_star <- sapply(seq_along(l_pg), function(j) l_pg[j]*Gains_lat + rnorm(N, 0, sqrt(1 - l_pg[j]^2)))
  se_star <- sapply(seq_along(l_se), function(j) l_se[j]*SuppEnv_lat + rnorm(N, 0, sqrt(1 - l_se[j]^2)))
  sat_star <- sapply(seq_along(l_sat), function(j) l_sat[j]*Satisf_lat + rnorm(N, 0, sqrt(1 - l_sat[j]^2)))

  mhw_star <- sapply(seq_along(l_mhw), function(j) l_mhw[j]*M1_lat + rnorm(N, 0, sqrt(1 - l_mhw[j]^2)))
  qi_star <- sapply(seq_along(l_qi), function(j) l_qi[j]*M2_lat + rnorm(N, 0, sqrt(1 - l_qi[j]^2)))
  sf_star <- sapply(seq_along(l_sf), function(j) l_sf[j]*M2_lat + rnorm(N, 0, sqrt(1 - l_sf[j]^2)))

  # Thresholds (approx) for 4-, 6-, 7-point items
  cuts4 <- c(-1.0, -0.2, 0.8)
  cuts6 <- c(-1.3, -0.7, -0.1, 0.5, 1.1)
  cuts7 <- c(-1.5, -0.9, -0.3, 0.3, 0.9, 1.5)

  sb <- apply(sb_star, 2, make_ord_int, cuts = cuts4)
  pg <- apply(pg_star, 2, make_ord_int, cuts = cuts4)
  se <- apply(se_star, 2, make_ord_int, cuts = cuts4)
  sat <- apply(sat_star, 2, make_ord_int, cuts = cuts4)

  mhw <- apply(mhw_star, 2, make_ord_int, cuts = cuts6)
  qi <- apply(qi_star, 2, make_ord_int, cuts = cuts7)
  sf <- apply(sf_star, 2, make_ord_int, cuts = cuts7)

  dat <- data.frame(
    # core predictors
    X = X,
    entry_credits = entry_credits,
    credit_dose = credit_dose,
    credit_dose_c = credit_dose_c,
    XZ_c = XZ_c,

    # W variables
    re_all = re_all,
    firstgen = firstgen,
    living = living,
    sex = sex,

    # Belong
    sbvalued = sb[,1],
    sbmyself = sb[,2],
    sbcommunity = sb[,3],

    # Gains
    pganalyze = pg[,1],
    pgthink = pg[,2],
    pgwork = pg[,3],
    pgvalues = pg[,4],
    pgprobsolve = pg[,5],

    # SuppEnv
    SEacademic = se[,1],
    SEwellness = se[,2],
    SEnonacad = se[,3],
    SEactivities = se[,4],
    SEdiverse = se[,5],

    # Satisfaction
    sameinst = sat[,1],
    evalexp = sat[,2],

    # M1
    MHWdacad = mhw[,1],
    MHWdlonely = mhw[,2],
    MHWdmental = mhw[,3],
    MHWdexhaust = mhw[,4],
    MHWdsleep = mhw[,5],
    MHWdfinancial = mhw[,6],

    # M2
    QIadmin = qi[,1],
    QIstudent = qi[,2],
    QIadvisor = qi[,3],
    QIfaculty = qi[,4],
    QIstaff = qi[,5],

    SFcareer = sf[,1],
    SFotherwork = sf[,2],
    SFdiscuss = sf[,3],
    SFperform = sf[,4]
  )

  # Convert ordinal indicators to ordered factors
  dat[ORDERED_VARS] <- lapply(dat[ORDERED_VARS], ordered)

  # Safety: sex collapsed to 2-group
  dat$sex <- collapse_sex_2grp(dat$sex)

  dat
}

# ============================================================
# MG test function: isolate moderation on the a-path (X->M1 and XZ->M1)
# H0: a1 and a1xz are equal across groups
# H1: a1 and a1xz differ across groups
# ============================================================
fit_apath_moderation_mg <- function(dat, Wvar) {
  dat[[Wvar]] <- droplevels(dat[[Wvar]])
  if (nlevels(dat[[Wvar]]) < 2) return(NULL)

  # Constrained model: all regressions constrained equal, then free EVERYTHING except
  # the a-path components we want to test (M1 ~ X + XZ_c)
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
      # free non-target regressions across groups
      "M1 ~ credit_dose_c",
      "M2 ~ X",
      "M2 ~ XZ_c",
      "M2 ~ credit_dose_c",
      "M2 ~ M1",
      "DevAdj ~ X",
      "DevAdj ~ XZ_c",
      "DevAdj ~ credit_dose_c",
      "DevAdj ~ M1",
      "DevAdj ~ M2"
    )
  )

  # Free model: all regressions free
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

safe_fit_one_rep <- function(dat, Wvar) {
  if (!group_sizes_ok(dat, Wvar)) {
    return(list(ok = FALSE, reason = "small_cell", p = NA_real_))
  }
  out <- try(fit_apath_moderation_mg(dat, Wvar), silent = TRUE)
  if (inherits(out, "try-error") || is.null(out)) {
    return(list(ok = FALSE, reason = "fit_error", p = NA_real_))
  }
  if (is.null(out$p) || !is.finite(out$p)) {
    return(list(ok = FALSE, reason = "bad_p", p = NA_real_))
  }
  list(ok = TRUE, reason = "ok", p = out$p)
}

run_mc_oneW <- function(Wvar, N, R, p_fast) {
  pvals <- rep(NA_real_, R)
  ok <- rep(FALSE, R)
  reason <- rep(NA_character_, R)

  for (r in seq_len(R)) {
    dat <- gen_dat(N, p_fast = p_fast, moderate_W = Wvar)
    fit_out <- safe_fit_one_rep(dat, Wvar)
    ok[r] <- isTRUE(fit_out$ok)
    pvals[r] <- fit_out$p
    reason[r] <- fit_out$reason
  }

  used <- which(ok & !is.na(pvals))
  power <- if (length(used) > 0) mean(pvals[used] < 0.05) else NA_real_

  list(
    W = Wvar,
    N = N,
    R = R,
    p_fast = p_fast,
    reps_used = length(used),
    convergence_rate = mean(ok),
    power_apath_moderation = power,
    pvals = pvals,
    fail_reason = reason
  )
}

# ============================================================
# Run all W's and save results
# ============================================================
Wvars <- c("re_all","firstgen","living","sex")
all_res <- vector("list", length(Wvars))
names(all_res) <- Wvars

cat("\n--- MC (RQ4) a-path moderation: starting ---\n")
cat("N =", N, "| R =", Rreps, "| p_fast =", p_fast, "| seed =", seed, "\n")
cat("MIN_N_PER_GROUP =", MIN_N_PER_GROUP, "(guardrail for WLSMV MG)\n\n")

for (W in Wvars) {
  cat("Running W =", W, "...\n")
  res <- run_mc_oneW(W, N, Rreps, p_fast)
  all_res[[W]] <- res

  cat("  reps_used:", res$reps_used,
      "| conv_rate:", sprintf("%.3f", res$convergence_rate),
      "| power:", ifelse(is.na(res$power_apath_moderation), "NA", sprintf("%.3f", res$power_apath_moderation)),
      "\n\n")

  out_file <- file.path(out_dir, sprintf("mc_apath_W_%s_N%d_R%d_seed%d.rds", W, N, Rreps, seed))
  saveRDS(res, out_file)
  cat("  Saved:", out_file, "\n\n")
}

combined_file <- file.path(out_dir, sprintf("mc_apath_ALLW_N%d_R%d_seed%d.rds", N, Rreps, seed))
saveRDS(all_res, combined_file)
cat("Saved combined:", combined_file, "\n")
cat("--- done ---\n")
