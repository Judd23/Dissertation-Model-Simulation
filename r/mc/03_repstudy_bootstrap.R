# r/mc/03_repstudy_bootstrap.R
# Representative study: generate one CSU-ish dataset + case-resampling bootstrap CIs.
#
# CLI (full run):
#   Rscript r/mc/03_repstudy_bootstrap.R --seed 20251223 --N 3000 --B 2000 --ci perc
#
# CLI (smoke run):
#   Rscript r/mc/03_repstudy_bootstrap.R --smoke 1

suppressPackageStartupMessages({
  options(repos = c(CRAN = "https://cloud.r-project.org"))
  if (!requireNamespace("lavaan", quietly = TRUE)) {
    stop(
      "Package 'lavaan' is required but not installed.\n",
      "Install it once, then rerun:\n",
      "  install.packages('lavaan')\n",
      call. = FALSE
    )
  }
  library(lavaan)
})

# -------------------------
# CLI helpers
# -------------------------
get_arg <- function(flag, default = NULL) {
  args <- commandArgs(trailingOnly = TRUE)
  idx <- match(flag, args)
  if (!is.na(idx) && length(args) >= idx + 1) return(args[idx + 1])
  default
}
get_int <- function(flag, default) suppressWarnings(as.integer(get_arg(flag, default)))
get_num <- function(flag, default) suppressWarnings(as.numeric(get_arg(flag, default)))
get_chr <- function(flag, default) as.character(get_arg(flag, default))

SMOKE <- get_int("--smoke", 0)
SEED  <- get_int("--seed", 20251223)

# defaults (full run)
N  <- get_int("--N", 3000)
B  <- get_int("--B", 2000)
CI <- tolower(get_chr("--ci", "perc"))  # perc | bca.simple

# smoke overrides
if (isTRUE(SMOKE == 1)) {
  N <- if (is.finite(N) && N > 0) N else 600L
  N <- min(N, 800L)
  B <- if (is.finite(B) && B > 0) B else 200L
  B <- min(B, 300L)
}

if (!CI %in% c("perc", "bca.simple")) {
  stop("--ci must be one of: perc | bca.simple")
}
if (!identical(CI, "perc")) {
  message("[note] lavaan bootstrap percentile CIs are used; overriding --ci=", CI, " to perc")
  CI <- "perc"
}

set.seed(SEED)

# -------------------------
# Run ID / output directory
# -------------------------
safe_filename <- function(x) {
  x <- gsub("[^A-Za-z0-9_.-]+", "_", as.character(x))
  x <- gsub("_+", "_", x)
  x
}
mk_run_id <- function() {
  safe_filename(paste0("seed", SEED, "_N", N, "_B", B, "_ci", CI, ifelse(SMOKE == 1, "_SMOKE", "")))
}
RUN_ID  <- mk_run_id()
RUN_DIR <- file.path("results", "repstudy_bootstrap", RUN_ID)
dir.create(RUN_DIR, showWarnings = FALSE, recursive = TRUE)

# Avoid confusion when re-running the same RUN_ID: remove prior output artifacts
# that depend on a successful lavaan fit/bootstraps.
cleanup_run_dir <- function(run_dir) {
  to_remove <- c(
    "repstudy_effects_perc.csv",
    "repstudy_params_unstd.csv",
    "repstudy_bootstrap_draws_ok.csv",
    "bootstrap_convergence.txt",
    "bootstrap_failures.csv",
    "repstudy_fit.txt",
    "theta_diagnostics.txt",
    "repstudy_prefit_cov_sd.txt",
    "repstudy_fit_attempts.txt",
    "repstudy_fit_attempt_used.txt"
  )
  for (f in to_remove) {
    p <- file.path(run_dir, f)
    if (file.exists(p)) try(unlink(p), silent = TRUE)
  }
}
cleanup_run_dir(RUN_DIR)

# -------------------------
# CSU-ish marginals (tunable)
# -------------------------
# Sources used for these defaults (documented in run_manifest.txt):
# - Pell: "Nearly half of the CSU's undergraduate students are Pell Grant recipients" (CSU system news, 2022-08-24).
# - First-gen: 53% at CSU (LAO EdTrends report, 2022; CSU line shown).
# - Race/ethnicity defaults here use CA 18–24 distribution (LAO figure) as a proxy,
#   because a CSU systemwide race breakdown page is not always accessible from automated tooling.

P_PELL_DEFAULT     <- 0.48
P_FIRSTGEN_DEFAULT <- 0.53

# Proxy distribution (CA age 18–24): Latino 50%, White 26%, Asian 15%, Black 8%, American Indian 1%.
# Mapped into 5 buckets; "Other/Multiracial/Unknown" gets the 1%.
RE_ALL_LEVELS <- c("Hispanic/Latino","White","Asian","Black/African American","Other/Multiracial/Unknown")
RE_ALL_PROBS  <- c(0.50, 0.26, 0.15, 0.08, 0.01)

# Sex split: not pinned to CSU in the cited sources above; kept as a reasonable default.
SEX_LEVELS <- c("Woman","Man")
SEX_PROBS  <- c(0.56, 0.44)

# Living situation: no hard CSU-wide value cited here; kept as a plausible default.
LIVING18_LEVELS <- c("With family (commuting)","Off-campus (rent/apartment)","On-campus (residence hall)")
LIVING18_PROBS  <- c(0.40, 0.35, 0.25)

# Target prevalence for FASt (x_FASt=1 where trnsfr_cr >= 12). You can change.
P_FAST_TARGET <- get_num("--p_fast", 0.20)
if (!is.finite(P_FAST_TARGET) || P_FAST_TARGET <= 0 || P_FAST_TARGET >= 1) P_FAST_TARGET <- 0.20

# -------------------------
# Ordered indicators (same names as your pooled model)
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

infer_K_for_item <- function(var) {
  out <- rep(NA_integer_, length(var))
  out[var %in% c("sbmyself","sbvalued","sbcommunity")] <- 5L
  out[var %in% c(
    "pgthink","pganalyze","pgwork","pgvalues","pgprobsolve",
    "SEwellness","SEnonacad","SEactivities","SEacademic","SEdiverse",
    "evalexp","sameinst",
    "SFcareer","SFotherwork","SFdiscuss","SFperform"
  )] <- 4L
  out[var %in% c("MHWdacad","MHWdlonely","MHWdmental","MHWdexhaust","MHWdsleep","MHWdfinancial")] <- 6L
  out[var %in% c("QIstudent","QIadvisor","QIfaculty","QIstaff","QIadmin")] <- 7L
  if (length(out) == 1) return(out[[1]])
  out
}

make_ordinal <- function(x, K, probs = NULL) {
  if (is.null(probs)) probs <- rep(1 / K, K)

  # For 6-point items, floor category mass at 2% then renormalize.
  if (isTRUE(K == 6L)) {
    pmin_cat <- 0.02
    probs <- as.numeric(probs)
    if (length(probs) != K || any(!is.finite(probs))) probs <- rep(1 / K, K)
    probs <- pmax(probs, 0)
    if (sum(probs) <= 0) probs <- rep(1 / K, K)
    if ((K * pmin_cat) < 1) probs <- pmax(probs, pmin_cat)
    probs <- probs / sum(probs)
  } else {
    probs <- probs / sum(probs)
  }

  cuts <- stats::quantile(x, probs = cumsum(probs)[-length(probs)], na.rm = TRUE, type = 7)
  ordered(cut(x, breaks = c(-Inf, cuts, Inf), labels = FALSE, right = TRUE))
}

# -------------------------
# Population parameters (match your dissertation model intent)
# -------------------------
PAR <- list(
  c  =  0.20,
  cz = -0.10,
  cxz = -0.08,

  a1  =  0.35,
  a1z =  0.20,
  a1xz =  0.16,
  b1  = -0.30,

  a2  =  0.30,
  a2z = -0.08,
  a2xz = -0.08,
  b2  =  0.35,

  d   = -0.30,

  g1 = 0.05,
  g2 = 0.00,
  g3 = 0.05
)

# measurement strength
LAM <- 0.80

# Baseline covariate tails (kept mild)
BETA_M1 <- c(hgrades = -0.10, bparented = -0.04, pell = 0.09, hapcl = 0.06, hprecalc13 = 0.05, hchallenge = 0.06, cSFcareer = 0.03)
BETA_M2 <- c(hgrades =  0.08, bparented =  0.04, pell = -0.04, hapcl = 0.04, hprecalc13 = 0.06, hchallenge = -0.05, cSFcareer = 0.04)
BETA_Y  <- c(hgrades =  0.10, bparented =  0.05, pell = -0.06, hapcl = 0.05, hprecalc13 = 0.06, hchallenge = -0.06, cSFcareer = 0.04)

# -------------------------
# Credit generator with target prevalence calibration
# -------------------------
simulate_trnsfr_cr <- function(N, prep, bparented, hapcl, hchallenge, cSFcareer, pell, hprecalc13,
                               shift = 0, scale_lat = 1, noise_sd = 8) {
  credit_lat <- 0.50*prep + 0.12*bparented + 0.18*hapcl + 0.15*hchallenge + 0.10*cSFcareer -
    0.12*pell - 0.10*hprecalc13 + rnorm(N, 0, scale_lat)
  trnsfr_cr <- pmax(0, pmin(60, round(10 + shift + 14*credit_lat + rnorm(N, 0, noise_sd))))
  trnsfr_cr
}

calibrate_shift_for_p_fast <- function(target, N, prep, bparented, hapcl, hchallenge, cSFcareer, pell, hprecalc13) {
  # binary search on shift so mean(trnsfr_cr >= 12) ~= target
  lo <- -40
  hi <-  40
  for (iter in 1:18) {
    mid <- (lo + hi) / 2
    cr <- simulate_trnsfr_cr(N, prep, bparented, hapcl, hchallenge, cSFcareer, pell, hprecalc13, shift = mid)
    p  <- mean(cr >= 12)
    if (!is.finite(p)) break
    if (p < target) lo <- mid else hi <- mid
  }
  (lo + hi) / 2
}

# -------------------------
# Data generator (single representative dataset)
# -------------------------
gen_rep_data <- function(N) {
  cohort <- rbinom(N, 1, 0.50)

  # latent prep factor
  prep <- rnorm(N, 0, 1)
  bparented <- 0.40*prep + rnorm(N, 0, sqrt(1 - 0.40^2))

  # HS grades (continuous then standardized numeric)
  hgrades_cont <- 0.60*prep + rnorm(N, 0, sqrt(1 - 0.60^2))
  qF <- stats::quantile(hgrades_cont, probs = 0.03, na.rm = TRUE, type = 7)
  qD <- stats::quantile(hgrades_cont, probs = 0.10, na.rm = TRUE, type = 7)
  qC <- stats::quantile(hgrades_cont, probs = 0.30, na.rm = TRUE, type = 7)
  qB <- stats::quantile(hgrades_cont, probs = 0.65, na.rm = TRUE, type = 7)
  hgrades_AF <- cut(hgrades_cont, breaks = c(-Inf, qF, qD, qC, qB, Inf),
                    labels = c("F","D","C","B","A"), right = TRUE, ordered_result = TRUE)
  hgrades_num <- as.numeric(hgrades_AF) - 1
  hgrades <- as.numeric(scale(hgrades_num, center = TRUE, scale = TRUE))

  # demographics
  firstgen <- rbinom(N, 1, P_FIRSTGEN_DEFAULT)
  pell     <- rbinom(N, 1, P_PELL_DEFAULT)

  # AP completion: depends on grades
  hapcl <- rbinom(N, 1, plogis(-0.20 + 0.55*hgrades))

  # HS type bucket (public vs private-bucket)
  hprecalc13_raw_levels <- c("Public","Private religiously-affiliated","Private not religiously-affiliated","Home school","Other")
  hprecalc13_raw_probs  <- c(0.87, 0.05, 0.04, 0.02, 0.02)
  hprecalc13_raw <- sample(hprecalc13_raw_levels, N, replace = TRUE, prob = hprecalc13_raw_probs)
  hprecalc13 <- as.integer(hprecalc13_raw != "Public")

  # challenge + career orientation
  hchallenge <- 0.35*hgrades + 0.15*bparented + rnorm(N, 0, 1)
  cSFcareer  <- 0.25*hgrades + rnorm(N, 0, 1)

  # centered versions for SEM stability
  hgrades_c    <- as.numeric(scale(hgrades,    center = TRUE, scale = FALSE))
  bparented_c  <- as.numeric(scale(bparented,  center = TRUE, scale = FALSE))
  hchallenge_c <- as.numeric(scale(hchallenge, center = TRUE, scale = FALSE))
  cSFcareer_c  <- as.numeric(scale(cSFcareer,  center = TRUE, scale = FALSE))

  # W variables (kept, even if unused in pooled model)
  re_all   <- factor(sample(RE_ALL_LEVELS, N, replace = TRUE, prob = RE_ALL_PROBS), levels = RE_ALL_LEVELS)
  living18 <- factor(sample(LIVING18_LEVELS, N, replace = TRUE, prob = LIVING18_PROBS), levels = LIVING18_LEVELS)
  sex      <- factor(sample(SEX_LEVELS, N, replace = TRUE, prob = SEX_PROBS), levels = SEX_LEVELS)

  # transfer credits with calibrated prevalence for x_FASt
  shift <- calibrate_shift_for_p_fast(P_FAST_TARGET, N, prep, bparented, hapcl, hchallenge, cSFcareer, pell, hprecalc13)
  trnsfr_cr <- simulate_trnsfr_cr(N, prep, bparented, hapcl, hchallenge, cSFcareer, pell, hprecalc13, shift = shift)
  # -------------------------
  # Data prep (stable, plain-English names)
  # -------------------------
  # x_FASt = FASt status at entry
  # Coding: 0 = not FASt (<12 entry credits); 1 = FASt (>=12 entry credits)
  # credit_dose = centered-at-threshold entry credit dose (in 10-credit units)
  # Definition (matches dissertation syntax comments): credit_dose = (trnsfr_cr - 12) / 10
  # Note: this can be negative for students entering with <12 credits.
  x_FASt <- as.integer(trnsfr_cr >= 12)
  credit_dose <- (trnsfr_cr - 12) / 10

  credit_dose_c <- as.numeric(scale(credit_dose, center = TRUE, scale = FALSE))
  XZ_c <- x_FASt * credit_dose_c

  # latent mediators + outcome
  M1_lat <- (PAR$a1*x_FASt) + (PAR$a1xz*XZ_c) + (PAR$a1z*credit_dose_c) + (PAR$g1*cohort) +
    BETA_M1["hgrades"]*hgrades + BETA_M1["bparented"]*bparented +
    BETA_M1["pell"]*pell + BETA_M1["hapcl"]*hapcl + BETA_M1["hprecalc13"]*hprecalc13 +
    BETA_M1["hchallenge"]*hchallenge + BETA_M1["cSFcareer"]*cSFcareer +
    rnorm(N, 0, 0.70)

  M2_lat <- (PAR$a2*x_FASt) + (PAR$a2xz*XZ_c) + (PAR$a2z*credit_dose_c) + (PAR$d*M1_lat) + (PAR$g2*cohort) +
    BETA_M2["hgrades"]*hgrades + BETA_M2["bparented"]*bparented +
    BETA_M2["pell"]*pell + BETA_M2["hapcl"]*hapcl + BETA_M2["hprecalc13"]*hprecalc13 +
    BETA_M2["hchallenge"]*hchallenge + BETA_M2["cSFcareer"]*cSFcareer +
    rnorm(N, 0, 0.70)

  Y_lat <- (PAR$c*x_FASt) + (PAR$cxz*XZ_c) + (PAR$cz*credit_dose_c) + (PAR$b1*M1_lat) + (PAR$b2*M2_lat) + (PAR$g3*cohort) +
    BETA_Y["hgrades"]*hgrades + BETA_Y["bparented"]*bparented +
    BETA_Y["pell"]*pell + BETA_Y["hapcl"]*hapcl + BETA_Y["hprecalc13"]*hprecalc13 +
    BETA_Y["hchallenge"]*hchallenge + BETA_Y["cSFcareer"]*cSFcareer +
    rnorm(N, 0, 1)

  # Observed scores for the representative-study bootstrap.
  # We keep names aligned to the process model.
  M1 <- as.numeric(scale(M1_lat, center = TRUE, scale = TRUE))
  M2 <- as.numeric(scale(M2_lat, center = TRUE, scale = TRUE))
  DevAdj <- as.numeric(scale(Y_lat, center = TRUE, scale = TRUE))

  Belong_lat  <- 0.85*Y_lat + rnorm(N, 0, sqrt(1 - 0.85^2))
  Gains_lat   <- 0.85*Y_lat + rnorm(N, 0, sqrt(1 - 0.85^2))
  SuppEnv_lat <- 0.85*Y_lat + rnorm(N, 0, sqrt(1 - 0.85^2))
  Satisf_lat  <- 0.85*Y_lat + rnorm(N, 0, sqrt(1 - 0.85^2))

  make_item <- function(var, eta, K) make_ordinal(eta, K = K, probs = NULL)

  sbmyself    <- make_item("sbmyself",    LAM*Belong_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 5)
  sbvalued    <- make_item("sbvalued",    LAM*Belong_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 5)
  sbcommunity <- make_item("sbcommunity", LAM*Belong_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 5)

  pgthink     <- make_item("pgthink",     LAM*Gains_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  pganalyze   <- make_item("pganalyze",   LAM*Gains_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  pgwork      <- make_item("pgwork",      LAM*Gains_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  pgvalues    <- make_item("pgvalues",    LAM*Gains_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  pgprobsolve <- make_item("pgprobsolve", LAM*Gains_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)

  SEwellness   <- make_item("SEwellness",   LAM*SuppEnv_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  SEnonacad    <- make_item("SEnonacad",    LAM*SuppEnv_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  SEactivities <- make_item("SEactivities", LAM*SuppEnv_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  SEacademic   <- make_item("SEacademic",   LAM*SuppEnv_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  SEdiverse    <- make_item("SEdiverse",    LAM*SuppEnv_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)

  evalexp  <- make_item("evalexp",  LAM*Satisf_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  sameinst <- make_item("sameinst", LAM*Satisf_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)

  MHWdacad      <- make_item("MHWdacad",      LAM*M1_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 6)
  MHWdlonely    <- make_item("MHWdlonely",    LAM*M1_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 6)
  MHWdmental    <- make_item("MHWdmental",    LAM*M1_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 6)
  MHWdexhaust   <- make_item("MHWdexhaust",   LAM*M1_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 6)
  MHWdsleep     <- make_item("MHWdsleep",     LAM*M1_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 6)
  MHWdfinancial <- make_item("MHWdfinancial", LAM*M1_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 6)

  QIstudent <- make_item("QIstudent", LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 7)
  QIadvisor <- make_item("QIadvisor", LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 7)
  QIfaculty <- make_item("QIfaculty", LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 7)
  QIstaff   <- make_item("QIstaff",   LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 7)
  QIadmin   <- make_item("QIadmin",   LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 7)

  SFcareer    <- make_item("SFcareer",    LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  SFotherwork <- make_item("SFotherwork", LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  SFdiscuss   <- make_item("SFdiscuss",   LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  SFperform   <- make_item("SFperform",   LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)

  data.frame(
    cohort,
    hgrades, hgrades_c, hgrades_AF,
    bparented, bparented_c,
    pell, hapcl, hprecalc13,
    hchallenge, hchallenge_c,
    cSFcareer, cSFcareer_c,
    firstgen,
    re_all, living18, sex,
    trnsfr_cr,
    x_FASt, credit_dose, credit_dose_c, XZ_c,
    M1, M2, DevAdj,
    sbmyself, sbvalued, sbcommunity,
    pgthink, pganalyze, pgwork, pgvalues, pgprobsolve,
    SEwellness, SEnonacad, SEactivities, SEacademic, SEdiverse,
    evalexp, sameinst,
    MHWdacad, MHWdlonely, MHWdmental, MHWdexhaust, MHWdsleep, MHWdfinancial,
    QIstudent, QIadvisor, QIfaculty, QIstaff, QIadmin,
    SFcareer, SFotherwork, SFdiscuss, SFperform,
    stringsAsFactors = FALSE
  )
}

# -------------------------
# Pooled SEM syntax (rep study uses the same measurement/structure)
# -------------------------
build_model_pooled <- function(zbar) {
  # Probe dose at meaningful entry-credit totals:
  # credit_dose = (entry_credits - 12) / 10
  # Entry credits: 12, 24, 36, 48, 60  ->  credit_dose: 0.0, 1.2, 2.4, 3.6, 4.8
  zc0 <- 0.0 - zbar  # 12 credits at entry
  zc1 <- 1.2 - zbar  # 24 credits at entry
  zc2 <- 2.4 - zbar  # 36 credits at entry
  zc3 <- 3.6 - zbar  # 48 credits at entry
  zc4 <- 4.8 - zbar  # 60 credits at entry

  paste0('
  # measurement (marker-variable identification)
  Belong =~ 1*sbvalued + sbmyself + sbcommunity
  Gains  =~ 1*pganalyze + pgthink + pgwork + pgvalues + pgprobsolve
  SuppEnv =~ 1*SEacademic + SEwellness + SEnonacad + SEactivities + SEdiverse
  Satisf =~ 1*sameinst + evalexp
  DevAdj =~ 1*Belong + Gains + SuppEnv + Satisf

  M1 =~ 1*MHWdacad + MHWdlonely + MHWdmental + MHWdexhaust + MHWdsleep + MHWdfinancial
  M2 =~ 1*QIadmin + QIstudent + QIadvisor + QIfaculty + QIstaff + SFcareer + SFotherwork + SFdiscuss + SFperform

  # structural (pooled)
  M1 ~ a1*x_FASt + a1xz*XZ_c + a1z*credit_dose_c + g1*cohort +
    hgrades_c + bparented_c + pell + hapcl + hprecalc13 + hchallenge_c + cSFcareer_c

  M2 ~ a2*x_FASt + a2xz*XZ_c + a2z*credit_dose_c + d*M1 + g2*cohort +
    hgrades_c + bparented_c + pell + hapcl + hprecalc13 + hchallenge_c + cSFcareer_c

  DevAdj ~ c*x_FASt + cxz*XZ_c + cz*credit_dose_c + b1*M1 + b2*M2 + g3*cohort +
    hgrades_c + bparented_c + pell + hapcl + hprecalc13 + hchallenge_c + cSFcareer_c

  # conditional effects along entry credits = 12,24,36,48,60 (raw credit_dose = 0.0,1.2,2.4,3.6,4.8)

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
# Bootstrap model (observed-variable process model)
# -------------------------
# For ML+FIML+bootstrap stability, we fit the conditional process model on
# observed scores M1/M2/DevAdj generated above.
build_model_bootstrap <- function(zbar) {
  zc0 <- 0.0 - zbar
  zc1 <- 1.2 - zbar
  zc2 <- 2.4 - zbar
  zc3 <- 3.6 - zbar
  zc4 <- 4.8 - zbar

  paste0('
  # structural (observed)
  M1 ~ a1*x_FASt + a1xz*XZ_c + a1z*credit_dose_c + g1*cohort +
    hgrades_c + bparented_c + pell + hapcl + hprecalc13 + hchallenge_c + cSFcareer_c

  M2 ~ a2*x_FASt + a2xz*XZ_c + a2z*credit_dose_c + d*M1 + g2*cohort +
    hgrades_c + bparented_c + pell + hapcl + hprecalc13 + hchallenge_c + cSFcareer_c

  DevAdj ~ c*x_FASt + cxz*XZ_c + cz*credit_dose_c + b1*M1 + b2*M2 + g3*cohort +
    hgrades_c + bparented_c + pell + hapcl + hprecalc13 + hchallenge_c + cSFcareer_c

  # conditional effects along entry credits = 12,24,36,48,60 (raw credit_dose = 0.0,1.2,2.4,3.6,4.8)
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

  ind_serial_z0 := a1_z0*d*b2
  ind_serial_z1 := a1_z1*d*b2
  ind_serial_z2 := a1_z2*d*b2
  ind_serial_z3 := a1_z3*d*b2
  ind_serial_z4 := a1_z4*d*b2

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
# Generate rep dataset
# -------------------------
dat <- gen_rep_data(N)

# -------------------------
# Derived terms (stable across scripts/tables)
# -------------------------
# ---- Core identifiers (use dataset names; create if missing) ----

# 1) x_FASt (0/1)
if (!("x_FASt" %in% names(dat))) {
  # Try common existing columns first
  candidates_x <- c("x_fast", "FASt", "fast", "X")
  found_x <- candidates_x[candidates_x %in% names(dat)][1]

  if (!is.na(found_x)) {
    dat$x_FASt <- as.integer(dat[[found_x]])
  } else if ("trnsfr_cr" %in% names(dat)) {
    dat$x_FASt <- as.integer(dat$trnsfr_cr >= 12)
  } else {
    stop(
      "Could not find x_FASt (or a usable alternative like FASt/fast/X), and trnsfr_cr is missing. Columns found: ",
      paste(names(dat), collapse = ", ")
    )
  }
}

# 2) credit_dose (entry credits centered at 12, in 10-credit units)
if (!("credit_dose" %in% names(dat))) {
  candidates_z <- c("credit_dose", "crdt_dose", "creditDose", "Z")
  found_z <- candidates_z[candidates_z %in% names(dat)][1]

  if (!is.na(found_z)) {
    dat$credit_dose <- as.numeric(dat[[found_z]])
  } else if ("trnsfr_cr" %in% names(dat)) {
    dat$credit_dose <- (dat$trnsfr_cr - 12) / 10
  } else {
    stop(
      "Could not find credit_dose (or a usable alternative like crdt_dose/Z), and trnsfr_cr is missing. Columns found: ",
      paste(names(dat), collapse = ", ")
    )
  }
}

# 3) Centered dose + interaction (names used in your lavaan syntax)
dat$credit_dose_c <- as.numeric(scale(dat$credit_dose, center = TRUE, scale = FALSE))
dat$XZ_c <- dat$x_FASt * dat$credit_dose_c

# -------------------------
# Quick sanity check before fitting
# -------------------------
stopifnot(all(c("x_FASt", "credit_dose", "credit_dose_c", "XZ_c") %in% names(dat)))
core_summary <- capture.output(summary(dat[, c("x_FASt", "credit_dose", "credit_dose_c", "XZ_c")]))
writeLines(core_summary, file.path(RUN_DIR, "repstudy_core_identifiers_summary.txt"))

write.csv(dat, file.path(RUN_DIR, "rep_data.csv"), row.names = FALSE)

# -------------------------
# Pre-fit numerical sanity checks
# -------------------------
precheck_txt <- character(0)
vars <- c(
  "DevAdj", "M1", "M2", "x_FASt", "credit_dose_c", "XZ_c",
  "cohort", "hgrades_c", "bparented_c", "pell", "hapcl", "hprecalc13", "hchallenge_c", "cSFcareer_c"
)
vars_missing <- setdiff(vars, names(dat))
if (length(vars_missing) > 0) {
  precheck_txt <- c(
    precheck_txt,
    "[precheck] missing variables for cov/sd diagnostics:",
    paste(vars_missing, collapse = ", ")
  )
} else {
  S <- try(stats::cov(dat[, vars, drop = FALSE], use = "pairwise.complete.obs"), silent = TRUE)
  if (inherits(S, "try-error")) {
    precheck_txt <- c(precheck_txt, "[precheck] cov() failed:", as.character(S))
  } else {
    min_eig <- try(min(eigen(S, symmetric = TRUE, only.values = TRUE)$values), silent = TRUE)
    if (inherits(min_eig, "try-error")) {
      precheck_txt <- c(precheck_txt, "[precheck] eigen() failed:", as.character(min_eig))
    } else {
      precheck_txt <- c(precheck_txt, paste0("min eigen(cov(vars)): ", format(min_eig, digits = 8)))
    }
  }

  sds <- try(sapply(dat[, vars, drop = FALSE], stats::sd, na.rm = TRUE), silent = TRUE)
  if (inherits(sds, "try-error")) {
    precheck_txt <- c(precheck_txt, "[precheck] sd() failed:", as.character(sds))
  } else {
    precheck_txt <- c(precheck_txt, "sds:")
    precheck_txt <- c(precheck_txt, capture.output(print(sds)))
  }
}
writeLines(precheck_txt, file.path(RUN_DIR, "repstudy_prefit_cov_sd.txt"))

# -------------------------
# Fit representative model + manual case-resampling bootstrap
#
# Why manual bootstrap?
# lavaan's internal bootstrap SE routine can error when many bootstrap
# samples yield NA estimates for some parameters. Manual bootstrap lets
# us (a) keep going when some resamples fail, and (b) compute percentile
# CIs from the successful draws.
# -------------------------

model_syntax <- build_model_bootstrap(zbar = mean(dat$credit_dose, na.rm = TRUE))

effects_keep <- c(
  # key structural paths
  "a1", "a1z", "a1xz", "a2", "a2z", "a2xz", "b1", "b2", "c", "cz", "cxz", "d",
  # conditional a-paths
  paste0("a1_z", 0:4),
  paste0("a2_z", 0:4),
  # conditional indirects
  paste0("ind_M1_z", 0:4),
  paste0("ind_M2_z", 0:4),
  paste0("ind_serial_z", 0:4),
  # conditional direct + total
  paste0("direct_z", 0:4),
  paste0("total_z", 0:4)
)

fit_once <- function(data_in) {
  lavaan::sem(
    model = model_syntax,
    data  = data_in,
    estimator = "ML",
    missing   = "fiml",
    fixed.x   = FALSE,
    conditional.x = FALSE,
    meanstructure = TRUE,
    std.lv = TRUE,
    auto.fix.first = TRUE,
    check.gradient = FALSE,
    check.vcov = FALSE,
    check.sigma.pd = FALSE,
    ridge = 1e-05,
    ridge.constant = 1e-05,
    optim.method = "nlminb",
    start = "simple",
    rstarts = 20,
    control = list(iter.max = 10000)
  )
}

# 1) Fit once (no bootstrap inside lavaan)
collect_warnings <- function(expr) {
  ws <- character(0)
  val <- withCallingHandlers(
    expr,
    warning = function(w) {
      ws <<- c(ws, conditionMessage(w))
      invokeRestart("muffleWarning")
    }
  )
  list(value = val, warnings = ws)
}

fit_once_cfg <- function(data_in,
                         meanstructure = TRUE,
                         check.sigma.pd = FALSE,
                         ridge = 1e-05,
                         ridge.constant = 1e-05,
                         optim.method = "nlminb",
                         rstarts = 20,
                         iter.max = 10000) {
  lavaan::sem(
    model = model_syntax,
    data  = data_in,
    estimator = "ML",
    missing   = "fiml",
    fixed.x   = FALSE,
    conditional.x = FALSE,
    meanstructure = meanstructure,
    std.lv = TRUE,
    auto.fix.first = TRUE,
    check.gradient = FALSE,
    check.vcov = FALSE,
    check.sigma.pd = check.sigma.pd,
    ridge = ridge,
    ridge.constant = ridge.constant,
    optim.method = optim.method,
    start = "simple",
    rstarts = rstarts,
    control = list(iter.max = iter.max)
  )
}

fit_attempts <- list(
  list(name = "base", meanstructure = TRUE, check.sigma.pd = TRUE, ridge = 0, ridge.constant = 0,
       optim.method = "nlminb", rstarts = 20, iter.max = 10000),
  list(name = "ridge_1e-5", meanstructure = TRUE, check.sigma.pd = FALSE, ridge = 1e-05, ridge.constant = 1e-05,
       optim.method = "nlminb", rstarts = 20, iter.max = 10000),
  list(name = "ridge_1e-4_bfgs", meanstructure = TRUE, check.sigma.pd = FALSE, ridge = 1e-04, ridge.constant = 1e-04,
       optim.method = "BFGS", rstarts = 40, iter.max = 20000),
  list(name = "no_meanstructure", meanstructure = FALSE, check.sigma.pd = FALSE, ridge = 1e-04, ridge.constant = 1e-04,
       optim.method = "BFGS", rstarts = 40, iter.max = 20000)
)

fit_try <- function(data_in, write_warnings = FALSE, warnings_prefix = "repstudy_fit_warnings") {
  for (att in fit_attempts) {
    res <- collect_warnings(try(
      fit_once_cfg(
        data_in,
        meanstructure = att$meanstructure,
        check.sigma.pd = att$check.sigma.pd,
        ridge = att$ridge,
        ridge.constant = att$ridge.constant,
        optim.method = att$optim.method,
        rstarts = att$rstarts,
        iter.max = att$iter.max
      ),
      silent = TRUE
    ))

    if (isTRUE(write_warnings)) {
      warn_file <- file.path(RUN_DIR, paste0(warnings_prefix, "_", att$name, ".txt"))
      writeLines(unique(res$warnings), warn_file)
    }

    if (!inherits(res$value, "try-error") && isTRUE(lavInspect(res$value, "converged"))) {
      return(list(fit = res$value, attempt = att$name, warnings = res$warnings))
    }
  }
  list(fit = NULL, attempt = NA_character_, warnings = character(0))
}

attempt_res <- fit_try(dat, write_warnings = TRUE, warnings_prefix = "repstudy_fit_warnings")
fit <- attempt_res$fit
fit_attempt_used <- attempt_res$attempt
writeLines(paste0("fit_attempt_used: ", fit_attempt_used), file.path(RUN_DIR, "repstudy_fit_attempt_used.txt"))

if (is.null(fit) || !isTRUE(lavInspect(fit, "converged"))) {
  stop("Model did not converge on the generated representative dataset.")
}

pe0 <- lavaan::parameterEstimates(fit, ci = FALSE)

get_by_label <- function(pe, labels) {
  idx <- match(labels, pe$label)
  out <- rep(NA_real_, length(labels))
  ok <- which(!is.na(idx))
  if (length(ok) > 0) out[ok] <- pe$est[idx[ok]]
  out
}

# Theta diagnostics (numerical stability)
theta_diag_txt <- character(0)
theta_obj <- try(lavInspect(fit, "theta"), silent = TRUE)
if (inherits(theta_obj, "try-error") || is.null(theta_obj)) {
  theta_diag_txt <- c(theta_diag_txt, "theta diagnostics: lavInspect(fit, 'theta') unavailable")
} else {
  theta_mat <- theta_obj
  if (is.list(theta_mat)) theta_mat <- theta_mat[[1]]
  if (!is.matrix(theta_mat)) {
    theta_diag_txt <- c(theta_diag_txt, paste0("theta diagnostics: unexpected type: ", class(theta_mat)[1]))
  } else {
    eig_vals <- try(eigen(theta_mat, symmetric = TRUE, only.values = TRUE)$values, silent = TRUE)
    min_eig <- if (!inherits(eig_vals, "try-error") && length(eig_vals) > 0) min(eig_vals) else NA_real_

    diag_theta <- try(diag(theta_mat), silent = TRUE)
    bad_idx <- integer(0)
    bad_vals <- numeric(0)
    if (!inherits(diag_theta, "try-error")) {
      bad_idx <- which(diag_theta < 1e-6)
      bad_vals <- diag_theta[diag_theta < 1e-6]
    }

    theta_diag_txt <- c(
      theta_diag_txt,
      "theta diagnostics",
      paste0("theta dim: ", paste(dim(theta_mat), collapse = " x ")),
      paste0("min eigen(theta): ", format(min_eig, digits = 6)),
      paste0("count diag(theta) < 1e-6: ", length(bad_idx)),
      if (length(bad_idx) > 0) paste0("which(diag(theta) < 1e-6): ", paste(bad_idx, collapse = ", ")) else "which(diag(theta) < 1e-6): (none)",
      if (length(bad_vals) > 0) paste0("diag(theta)[diag(theta) < 1e-6]: ", paste(format(bad_vals, digits = 6), collapse = ", ")) else "diag(theta)[diag(theta) < 1e-6]: (none)"
    )
  }
}
writeLines(theta_diag_txt, file.path(RUN_DIR, "theta_diagnostics.txt"))

# 2) Manual bootstrap (case resampling)
set.seed(SEED + 101)

boot_mat <- matrix(NA_real_, nrow = B, ncol = length(effects_keep))
colnames(boot_mat) <- effects_keep
boot_ok <- logical(B)
boot_err <- character(B)

for (b in seq_len(B)) {
  idx <- sample.int(nrow(dat), size = nrow(dat), replace = TRUE)
  dat_b <- dat[idx, , drop = FALSE]

  attempt_b <- fit_try(dat_b, write_warnings = FALSE)
  fit_b <- attempt_b$fit
  if (is.null(fit_b) || !isTRUE(lavInspect(fit_b, "converged"))) {
    boot_err[b] <- "not converged"
    next
  }

  pe_b <- try(lavaan::parameterEstimates(fit_b, ci = FALSE), silent = TRUE)
  if (inherits(pe_b, "try-error")) {
    boot_err[b] <- as.character(pe_b)
    next
  }

  boot_mat[b, ] <- get_by_label(pe_b, effects_keep)
  boot_ok[b] <- TRUE

  every <- if (isTRUE(SMOKE == 1)) 25L else 100L
  if (b %% every == 0L) {
    message("[bootstrap] draw ", b, "/", B, " ok=", sum(boot_ok[seq_len(b)]))
  }
}

B_ok <- sum(boot_ok)

writeLines(
  c(paste0("B requested: ", B),
    paste0("B converged: ", B_ok),
    paste0("B failed: ", B - B_ok)),
  file.path(RUN_DIR, "bootstrap_convergence.txt")
)

if (B_ok < max(25, floor(0.50 * B))) {
  utils::write.csv(
    data.frame(draw = seq_len(B), converged = boot_ok, error = boot_err, stringsAsFactors = FALSE),
    file.path(RUN_DIR, "bootstrap_failures.csv"),
    row.names = FALSE
  )
  stop("Too many bootstrap failures to compute percentile CIs reliably. See bootstrap_failures.csv in RUN_DIR.")
}

boot_ok_mat <- boot_mat[boot_ok, , drop = FALSE]

ci_lo <- apply(boot_ok_mat, 2, function(x) quantile(x, 0.025, na.rm = TRUE, type = 7))
ci_hi <- apply(boot_ok_mat, 2, function(x) quantile(x, 0.975, na.rm = TRUE, type = 7))
boot_se <- apply(boot_ok_mat, 2, function(x) sd(x, na.rm = TRUE))

effects_out <- data.frame(
  effect   = effects_keep,
  estimate = get_by_label(pe0, effects_keep),
  boot_se  = as.numeric(boot_se),
  ci_lower = as.numeric(ci_lo),
  ci_upper = as.numeric(ci_hi),
  B        = B,
  B_ok     = B_ok,
  N        = N,
  seed     = SEED,
  ci_level = 0.95,
  ci_type  = "perc",
  stringsAsFactors = FALSE
)

effects_out$includes_0 <- (effects_out$ci_lower <= 0 & effects_out$ci_upper >= 0)

write.csv(effects_out, file.path(RUN_DIR, "repstudy_effects_perc.csv"), row.names = FALSE)
write.csv(pe0, file.path(RUN_DIR, "repstudy_params_unstd.csv"), row.names = FALSE)
write.csv(boot_ok_mat, file.path(RUN_DIR, "repstudy_bootstrap_draws_ok.csv"), row.names = FALSE)

# ---- fit + metadata text ----
fit_txt <- c(
  "Representative run (generated CSU-ish dataset) + manual case-resampling bootstrap SE/CI",
  paste0("RUN_ID: ", RUN_ID),
  paste0("RUN_DIR: ", RUN_DIR),
  paste0("N (target): ", N),
  paste0("N (lavaan nobs): ", lavInspect(fit, "nobs")),
  paste0("Converged: ", lavInspect(fit, "converged")),
  paste0("Bootstrap draws requested (B): ", B),
  paste0("Bootstrap draws converged (B_ok): ", B_ok),
  paste0("CI type: perc"),
  paste0("Seed: ", SEED),
  paste0("p_fast target: ", format(P_FAST_TARGET, digits = 3)),
  "",
  "Theta diagnostics:",
  paste0("- See theta_diagnostics.txt in RUN_DIR"),
  "",
  "Fit measures:",
  {
    fm <- try(fitMeasures(fit, c("chisq","df","pvalue","cfi","tli","rmsea","srmr")), silent = TRUE)
    if (inherits(fm, "try-error")) {
      c("fitMeasures() failed (often due to baseline model).", as.character(fm))
    } else {
      capture.output(fm)
    }
  }
)
writeLines(fit_txt, file.path(RUN_DIR, "repstudy_fit.txt"))

# ---- manifest (data-gen targets) ----
manifest <- c(
  "Repstudy bootstrap manifest",
  paste0("Generated: ", as.character(Sys.time())),
  paste0("Seed: ", SEED),
  paste0("N: ", N),
  paste0("B: ", B),
  paste0("CI: ", CI),
  paste0("SMOKE: ", SMOKE),
  paste0("P_PELL_DEFAULT: ", P_PELL_DEFAULT),
  paste0("P_FIRSTGEN_DEFAULT: ", P_FIRSTGEN_DEFAULT),
  paste0("RE_ALL_LEVELS: ", paste(RE_ALL_LEVELS, collapse = " | ")),
  paste0("RE_ALL_PROBS: ", paste(format(RE_ALL_PROBS, digits = 3), collapse = ", ")),
  paste0("SEX_LEVELS: ", paste(SEX_LEVELS, collapse = " | ")),
  paste0("SEX_PROBS: ", paste(format(SEX_PROBS, digits = 3), collapse = ", ")),
  paste0("LIVING18_LEVELS: ", paste(LIVING18_LEVELS, collapse = " | ")),
  paste0("LIVING18_PROBS: ", paste(format(LIVING18_PROBS, digits = 3), collapse = ", ")),
  paste0("P_FAST_TARGET: ", format(P_FAST_TARGET, digits = 3)),
  "",
  "Sources (for defaults):",
  "- Pell: CSU system news, 2022-08-24 (Nearly half Pell recipients)",
  "- First-gen: LAO EdTrends report, 2022 (CSU ~53%)",
  "- Race/ethnicity: LAO CA 18–24 proxy distribution"
)
writeLines(manifest, file.path(RUN_DIR, "run_manifest.txt"))

cat("Completed repstudy bootstrap run: ", RUN_DIR, "\n", sep = "")

