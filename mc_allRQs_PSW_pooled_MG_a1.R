# ============================================================
# MC: PSW -> pooled SEM (RQ1–RQ3) + MG SEM a1 test (RQ4; W1–W4 one-at-a-time)
# Design: X = 1(trnsfr_cr >= 12), Zplus10 = max(0, trnsfr_cr - 12)/10
# Estimator: WLSMV (ordered indicators)
# Weights: overlap weights from PS model (PSW first, then SEM)
# ============================================================

suppressPackageStartupMessages({
  # Needed for non-interactive Rscript runs (prevents 'trying to use CRAN without setting a mirror')
  options(repos = c(CRAN = "https://cloud.r-project.org"))
  if (!requireNamespace("lavaan", quietly = TRUE)) install.packages("lavaan")
  if (!requireNamespace("survey", quietly = TRUE)) install.packages("survey")
  library(lavaan)
  library(survey)
})

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

# In this environment, PSW is used for balance diagnostics only
# (not passed into lavaan WLSMV estimation)
APPLY_PSW_IN_SEM <- FALSE

# -------------------------
# DEBUG/DIAGNOSTICS
# -------------------------
DIAG_N <- as.integer(get_arg("--diag", 0))

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

# W variables (you run one at a time; rename to match your file)
W_LIST <- c("re_all", "firstgen", "living", "sex")

# Minimum per-group size for MG (polychoric/threshold estimation needs space)
MIN_N_PER_GROUP <- 120

# -------------------------
# VARIABLE NAMES (KEEP CONSISTENT WITH YOUR R FILES)
# -------------------------
ORDERED_VARS <- c(
  "SB1","SB2","SB3",
  "PG1","PG2","PG3","PG4","PG5",
  "SE1","SE2","SE3",
  "MHWdacad","MHWdlonely","MHWdmental","MHWdpeers","MHWdexhaust",
  "QIstudent","QIfaculty","QIadvisor","QIstaff"
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

# PSW (overlap weights) first, then carried into SEM
make_overlap_weights <- function(dat) {
  ps_mod <- try(glm(
    X ~ bchsgrade + bcsmath + bparented + firstgen + bchwork + bcnonacad + cohort,
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

BETA_M1 <- c(bchsgrade = -0.10, bcsmath = -0.05, bparented = -0.04, firstgen = 0.08, bchwork = 0.06, bcnonacad = 0.07)
BETA_M2 <- c(bchsgrade =  0.08, bcsmath =  0.05, bparented =  0.04, firstgen = -0.06, bchwork = -0.04, bcnonacad = -0.05)
BETA_Y  <- c(bchsgrade =  0.10, bcsmath =  0.06, bparented =  0.05, firstgen = -0.08, bchwork = -0.05, bcnonacad = -0.06)

LAM <- 0.80  # loading strength for indicators

# -------------------------
# DATA GENERATOR (FULL MODEL)
# -------------------------
gen_dat <- function(N) {

  # Cohort indicator (pooled)
  cohort <- rbinom(N, 1, 0.50)

  # Covariates (BCSSE-based placeholders)
  bchsgrade <- rnorm(N, 0, 1)
  bcsmath   <- rnorm(N, 0, 1)
  bparented <- rnorm(N, 0, 1)
  firstgen  <- rbinom(N, 1, 0.35)
  bchwork   <- rnorm(N, 0, 1)
  bcnonacad <- rnorm(N, 0, 1)

  # W variables (simulation draws; collapse later if needed)
  re_all <- factor(sample(c("A","B","C","D","E"), N, replace = TRUE))
  living <- factor(sample(c("OnCampus","OffCampus","WithFamily","Other"), N, replace = TRUE))
  sex    <- collapse_sex_2grp(sample(c("Woman","Man","Nonbinary"), N, replace = TRUE))

  # Transfer credits (trnsfr_cr) – edit distribution later when you have real data
  credit_lat <- 0.35*bchsgrade + 0.25*bcsmath + 0.15*bparented - 0.30*firstgen - 0.10*bchwork - 0.10*bcnonacad + rnorm(N, 0, 1)
  trnsfr_cr  <- pmax(0, pmin(60, round(10 + 12*credit_lat + rnorm(N, 0, 8))))

  # Treatment + Zplus10 from trnsfr_cr (your confirmed rule)
  X <- as.integer(trnsfr_cr >= 12)
  Zplus10 <- pmax(0, trnsfr_cr - 12) / 10

  # Center Z to improve numerical stability of XZ interactions in WLSMV.
  # Note: when using XZ interaction, we must use a centered Z term consistently
  # to avoid rank deficiency in the exogenous covariate matrix.
  Zplus10_c <- as.numeric(scale(Zplus10, center = TRUE, scale = FALSE))
  XZ_c <- X * Zplus10_c

  # Add true subgroup differences on a1 ONLY (so RQ4 has signal)
  # You can make these smaller if you want a harder detection problem.
  re_all  <- collapse_small_to_other(re_all)
  living  <- collapse_small_to_other(living)
  # sex already 2-group

  # additive deltas (kept mild)
  delta_re   <- setNames(seq(-0.08, 0.08, length.out = nlevels(re_all)), levels(re_all))
  delta_live <- setNames(seq(-0.06, 0.06, length.out = nlevels(living)), levels(living))
  delta_fg   <- c("0" = -0.03, "1" = 0.03)
  delta_sex  <- c("Woman" = -0.03, "Man" = 0.03)

  a1_i <- PAR$a1 +
    delta_re[as.character(re_all)] +
    delta_live[as.character(living)] +
    delta_fg[as.character(firstgen)] +
    delta_sex[as.character(sex)]

  # Latent M1 (Distress)
  M1_lat <- (a1_i*X) + (PAR$a1xz*XZ_c) + (PAR$a1z*Zplus10_c) + (PAR$g1*cohort) +
    BETA_M1["bchsgrade"]*bchsgrade + BETA_M1["bcsmath"]*bcsmath + BETA_M1["bparented"]*bparented +
    BETA_M1["firstgen"]*firstgen + BETA_M1["bchwork"]*bchwork + BETA_M1["bcnonacad"]*bcnonacad +
    rnorm(N, 0, 1)

  # Latent M2 (Quality of Interactions)
  M2_lat <- (PAR$a2*X) + (PAR$a2xz*XZ_c) + (PAR$a2z*Zplus10_c) + (PAR$d*M1_lat) + (PAR$g2*cohort) +
    BETA_M2["bchsgrade"]*bchsgrade + BETA_M2["bcsmath"]*bcsmath + BETA_M2["bparented"]*bparented +
    BETA_M2["firstgen"]*firstgen + BETA_M2["bchwork"]*bchwork + BETA_M2["bcnonacad"]*bcnonacad +
    rnorm(N, 0, 1)

  # Latent DevAdj (second-order)
  Y_lat <- (PAR$c*X) + (PAR$cxz*XZ_c) + (PAR$cz*Zplus10_c) + (PAR$b1*M1_lat) + (PAR$b2*M2_lat) + (PAR$g3*cohort) +
    BETA_Y["bchsgrade"]*bchsgrade + BETA_Y["bcsmath"]*bcsmath + BETA_Y["bparented"]*bparented +
    BETA_Y["firstgen"]*firstgen + BETA_Y["bchwork"]*bchwork + BETA_Y["bcnonacad"]*bcnonacad +
    rnorm(N, 0, 1)

  Belong_lat  <- 0.85*Y_lat + rnorm(N, 0, sqrt(1 - 0.85^2))
  Gains_lat   <- 0.85*Y_lat + rnorm(N, 0, sqrt(1 - 0.85^2))
  SuppEnv_lat <- 0.85*Y_lat + rnorm(N, 0, sqrt(1 - 0.85^2))

  # Generate continuous item tendencies, then make ordinal
  # SB, PG, SE set to 4-category (you can adjust)
  SB1 <- make_ordinal(LAM*Belong_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  SB2 <- make_ordinal(LAM*Belong_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  SB3 <- make_ordinal(LAM*Belong_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)

  PG1 <- make_ordinal(LAM*Gains_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  PG2 <- make_ordinal(LAM*Gains_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  PG3 <- make_ordinal(LAM*Gains_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  PG4 <- make_ordinal(LAM*Gains_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  PG5 <- make_ordinal(LAM*Gains_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)

  SE1 <- make_ordinal(LAM*SuppEnv_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  SE2 <- make_ordinal(LAM*SuppEnv_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)
  SE3 <- make_ordinal(LAM*SuppEnv_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 4)

  # MHW difficulty set to 6-category
  MHWdacad    <- make_ordinal(LAM*M1_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 6)
  MHWdlonely  <- make_ordinal(LAM*M1_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 6)
  MHWdmental  <- make_ordinal(LAM*M1_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 6)
  MHWdpeers   <- make_ordinal(LAM*M1_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 6)
  MHWdexhaust <- make_ordinal(LAM*M1_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 6)

  # QI set to 7-category
  QIstudent <- make_ordinal(LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 7)
  QIfaculty <- make_ordinal(LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 7)
  QIadvisor <- make_ordinal(LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 7)
  QIstaff   <- make_ordinal(LAM*M2_lat + rnorm(N, 0, sqrt(1 - LAM^2)), K = 7)

  dat <- data.frame(
    cohort,
    bchsgrade, bcsmath, bparented, firstgen, bchwork, bcnonacad,
    re_all, living, sex,
    trnsfr_cr,
    X, Zplus10, Zplus10_c, XZ_c,
    SB1, SB2, SB3,
    PG1, PG2, PG3, PG4, PG5,
    SE1, SE2, SE3,
    MHWdacad, MHWdlonely, MHWdmental, MHWdpeers, MHWdexhaust,
    QIstudent, QIfaculty, QIadvisor, QIstaff
  )

  dat
}

# -------------------------
# POOLED SEM SYNTAX (RQ1–RQ3)
# -------------------------
model_pooled <- '
  # measurement
  Belong =~ SB1 + SB2 + SB3
  Gains  =~ PG1 + PG2 + PG3 + PG4 + PG5
  SuppEnv =~ SE1 + SE2 + SE3
  DevAdj =~ Belong + Gains + SuppEnv

  M1 =~ MHWdacad + MHWdlonely + MHWdmental + MHWdpeers + MHWdexhaust
  M2 =~ QIstudent + QIfaculty + QIadvisor + QIstaff

  # structural (pooled)
  M1 ~ a1*X + a1xz*XZ_c + a1z*Zplus10_c + g1*cohort +
       bchsgrade + bcsmath + bparented + firstgen + bchwork + bcnonacad

  M2 ~ a2*X + a2xz*XZ_c + a2z*Zplus10_c + d*M1 + g2*cohort +
       bchsgrade + bcsmath + bparented + firstgen + bchwork + bcnonacad

  DevAdj ~ c*X + cxz*XZ_c + cz*Zplus10_c + b1*M1 + b2*M2 + g3*cohort +
           bchsgrade + bcsmath + bparented + firstgen + bchwork + bcnonacad

  # conditional effects along Zplus10 = 0,1,2,3,4 (0/10/20/30/40 credits above threshold)

  # X->M paths conditional on Z (a-paths)
  a1_z0 := a1 + a1xz*0
  a1_z1 := a1 + a1xz*1
  a1_z2 := a1 + a1xz*2
  a1_z3 := a1 + a1xz*3
  a1_z4 := a1 + a1xz*4

  a2_z0 := a2 + a2xz*0
  a2_z1 := a2 + a2xz*1
  a2_z2 := a2 + a2xz*2
  a2_z3 := a2 + a2xz*3
  a2_z4 := a2 + a2xz*4

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
  direct_z0 := c + cxz*0
  direct_z1 := c + cxz*1
  direct_z2 := c + cxz*2
  direct_z3 := c + cxz*3
  direct_z4 := c + cxz*4

  total_z0 := direct_z0 + ind_M1_z0 + ind_M2_z0 + ind_serial_z0
  total_z1 := direct_z1 + ind_M1_z1 + ind_M2_z1 + ind_serial_z1
  total_z2 := direct_z2 + ind_M1_z2 + ind_M2_z2 + ind_serial_z2
  total_z3 := direct_z3 + ind_M1_z3 + ind_M2_z3 + ind_serial_z3
  total_z4 := direct_z4 + ind_M1_z4 + ind_M2_z4 + ind_serial_z4
'

# -------------------------
# MG SEM FOR RQ4 (ONLY a1 VARIES BY GROUP)
# -------------------------
make_model_mg_a1 <- function(G) {
  # allow a1 and a1xz to vary; everything else equal across groups
  a1_vec <- paste0("a1_", seq_len(G))
  a1xz_vec <- paste0("a1xz_", seq_len(G))
  a1_free <- paste0("c(", paste(a1_vec, collapse = ","), ")*X")
  a1xz_free <- paste0("c(", paste(a1xz_vec, collapse = ","), ")*XZ_c")

  paste0('
    # measurement
    Belong =~ SB1 + SB2 + SB3
    Gains  =~ PG1 + PG2 + PG3 + PG4 + PG5
    SuppEnv =~ SE1 + SE2 + SE3
    DevAdj =~ Belong + Gains + SuppEnv

    M1 =~ MHWdacad + MHWdlonely + MHWdmental + MHWdpeers + MHWdexhaust
    M2 =~ QIstudent + QIfaculty + QIadvisor + QIstaff

    # structural (a1 and a1xz vary by group; other paths equal)
    M1 ~ ', a1_free, ' + ', a1xz_free, ' + a1z*Zplus10 + g1*cohort +
         bchsgrade + bcsmath + bparented + firstgen + bchwork + bcnonacad

    M2 ~ a2*X + a2z*Zplus10 + d*M1 + g2*cohort +
         bchsgrade + bcsmath + bparented + firstgen + bchwork + bcnonacad

    DevAdj ~ c*X + cz*Zplus10 + b1*M1 + b2*M2 + g3*cohort +
             bchsgrade + bcsmath + bparented + firstgen + bchwork + bcnonacad
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
  fit <- try(
    lavaan::sem(
      model = model_pooled,
      data  = dat,
      ordered = ORDERED_VARS,
      estimator = "WLSMV",
      parameterization = "theta",
      std.lv = TRUE,
      missing = "pairwise"
      # IMPORTANT: NO sampling.weights here
    ),
    silent = TRUE
  )

  if (inherits(fit, "try-error")) return(NULL)
  if (!isTRUE(lavInspect(fit, "converged"))) return(NULL)

  fit
}

fit_mg_a1_test <- function(dat, Wvar) {
  dat[[Wvar]] <- factor(dat[[Wvar]])
  G <- nlevels(dat[[Wvar]])
  if (G < 2) return(list(ok = FALSE, p = NA_real_, reason = "one_group"))

  if (!group_sizes_ok(dat, Wvar)) return(list(ok = FALSE, p = NA_real_, reason = "small_cell"))

  model_mg <- make_model_mg_a1(G)

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
  if ("psw" %in% names(dat)) {
    dat$psw <- as.numeric(dat$psw)
    dat$psw[!is.finite(dat$psw)] <- NA_real_
    dat$psw <- pmax(dat$psw, 1e-6)
    dat$psw <- dat$psw / mean(dat$psw, na.rm = TRUE)
    args$data <- dat
  }

  fit0 <- try(do.call(lavaan::sem, args), silent = TRUE)
  if (inherits(fit0, "try-error")) return(list(ok = FALSE, p = NA_real_, reason = "fit_error"))
  if (!isTRUE(lavInspect(fit0, "converged"))) return(list(ok = FALSE, p = NA_real_, reason = "no_converge"))

  fit <- fit0
  if (isTRUE(APPLY_PSW_IN_SEM) && ("psw" %in% names(dat)) && requireNamespace("lavaan.survey", quietly = TRUE)) {
    if (!("campus_id" %in% names(dat))) {
      dat$campus_id <- dat$cohort
    }
    des <- survey::svydesign(
      ids = ~ campus_id,
      weights = ~ psw,
      data = dat
    )
    fitS <- try(lavaan.survey::lavaan.survey(
      lavaan.fit = fit0,
      survey.design = des,
      estimator = "DWLS"
    ), silent = TRUE)
    if (inherits(fitS, "try-error")) return(list(ok = FALSE, p = NA_real_, reason = "fit_error"))
    if (!isTRUE(lavInspect(fitS, "converged"))) return(list(ok = FALSE, p = NA_real_, reason = "no_converge"))
    fit <- fitS
  }

  cnstr <- make_a1_equal_constraints(G)
  wald <- try(lavTestWald(fit, constraints = cnstr), silent = TRUE)
  if (inherits(wald, "try-error")) return(list(ok = FALSE, p = NA_real_, reason = "wald_error"))

  p <- as.numeric(wald[["p.value"]])
  if (!is.finite(p)) return(list(ok = FALSE, p = NA_real_, reason = "bad_p"))

  list(ok = TRUE, p = p, reason = "ok")
}

# -------------------------
# MONTE CARLO RUN
# -------------------------
# storage
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

rq4_pvals <- setNames(as.data.frame(matrix(NA_real_, nrow = R_REPS, ncol = length(W_LIST))), W_LIST)
rq4_ok    <- setNames(as.data.frame(matrix(0L, nrow = R_REPS, ncol = length(W_LIST))), W_LIST)
rq4_reason <- lapply(W_LIST, function(x) rep(NA_character_, R_REPS))
names(rq4_reason) <- W_LIST

for (r in seq_len(R_REPS)) {

  dat <- gen_dat(N)

  # PSW first (weights computed prior to SEM estimation)
  if (isTRUE(USE_PSW == 1)) {
    dat <- make_overlap_weights(dat)
  }

  # pooled SEM (tests RQ1–RQ3)
  fitP <- fit_pooled(dat)
  if (!is.null(fitP)) {
    pooled_converged[r] <- 1L
    pe <- parameterEstimates(fitP)
    pe2 <- pe[pe$label %in% pooled_targets & pe$op %in% c("~",":="), c("label","est")]
    if (nrow(pe2) > 0) pooled_est[r, pe2$label] <- pe2$est
  }

  # RQ4: MG tests, one W at a time (a1 differs by group)
  if (FALSE) {
    for (Wvar in W_LIST) {
      # light category handling for MC stability
      if (Wvar == "sex") dat$sex <- collapse_sex_2grp(dat$sex)
      if (Wvar %in% c("re_all","living")) dat[[Wvar]] <- collapse_small_to_other(dat[[Wvar]])

      outW <- fit_mg_a1_test(dat, Wvar)
      rq4_reason[[Wvar]][r] <- outW$reason
      if (isTRUE(outW$ok)) {
        rq4_ok[r, Wvar] <- 1L
        rq4_pvals[r, Wvar] <- outW$p
      }
    }
  }

  if (r %% 10 == 0) message("Finished replication ", r, " / ", R_REPS)
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

cat("\n=============================\n")
cat("RQ4 MG a1 tests (one W at a time)\n")
for (Wvar in W_LIST) {
  used <- which(rq4_ok[[Wvar]] == 1 & is.finite(rq4_pvals[[Wvar]]))
  power <- if (length(used) > 0) mean(rq4_pvals[[Wvar]][used] < 0.05) else NA_real_
  cat("\nW:", Wvar, "\n")
  cat("Used reps:", length(used), " / ", R_REPS, "\n", sep = "")
  cat("Power (reject equal a1 across groups):", power, "\n")
  cat("Fail reasons:\n")
  print(sort(table(rq4_reason[[Wvar]], useNA = "ifany"), decreasing = TRUE))
}

# optional saves
# saveRDS(list(pooled_est = pooled_est, pooled_converged = pooled_converged,
#              rq4_pvals = rq4_pvals, rq4_ok = rq4_ok, rq4_reason = rq4_reason),
#         file = sprintf("mc_allRQs_PSW_pooled_MG_a1_N%d_R%d_seed20251219.rds", N, R_REPS))
