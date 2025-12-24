# ============================================================
# Monte Carlo: FASt threshold + Z+ (credits > 12; per +10 scaling)
# Parallel mediation SEM with ordinal indicators (WLSMV)
# Run: Rscript mc_fast_wlsmv.R --N 1500 --R 200 --p_fast 0.20 --seed 12345
# ============================================================

# --------- tiny arg parser (no extra packages) ----------
get_arg <- function(flag, default = NULL) {
  args <- commandArgs(trailingOnly = TRUE)
  idx <- match(flag, args)
  if (!is.na(idx) && length(args) >= idx + 1) return(args[idx + 1])
  default
}

# --------- package load ----------
if (!requireNamespace("lavaan", quietly = TRUE)) {
  stop("Package 'lavaan' is not installed. Run: R -q -e 'install.packages(\"lavaan\", repos=\"https://cloud.r-project.org\")'")
}
library(lavaan)

seed   <- as.integer(get_arg("--seed", 12345))
N      <- as.integer(get_arg("--N", 1500))
Rreps  <- as.integer(get_arg("--R", 200))
p_fast <- as.numeric(get_arg("--p_fast", 0.20))

set.seed(seed)

# ---------- helper: continuous -> ordinal integer codes ----------
make_ord_int <- function(y, cuts) {
  as.integer(cut(y, breaks = c(-Inf, cuts, Inf), labels = FALSE))
}

# ---------- data generator ----------
gen_dat_base <- function(N, p_fast = 0.20,
                    # structural parameters (latent-response scale)
                    a1 = 0.20, a1z = 0.10,      # FASt, Zplus10 -> Distress
                    a2 = 0.15, a2z = -0.10,     # FASt, Zplus10 -> Interact
                    b1 = -0.30, b2 = 0.40,      # Distress, Interact -> Adj
                    cprime = 0.10, cz = -0.05,  # FASt, Zplus10 -> Adj
                    rho_m12 = -0.25) {

  # FASt indicator
  FASt <- rbinom(N, 1, p_fast)

  # credits: (a) zeros, (b) 1-11, (c) 12+ with right tail
  trnsfr_cr <- numeric(N)
  for (i in 1:N) {
    if (FASt[i] == 0) {
      trnsfr_cr[i] <- if (runif(1) < 0.60) 0 else runif(1, 1, 11)
    } else {
      trnsfr_cr[i] <- 12 + rgamma(1, shape = 2.5, scale = 6)
      if (trnsfr_cr[i] > 60) trnsfr_cr[i] <- 60
    }
  }

  # Z+ beyond threshold, scaled per +10 credits
  Zplus   <- pmax(0, trnsfr_cr - 12)
  Zplus10 <- Zplus / 10

  # single covariate
  prep <- rnorm(N, 0, 1)

  # ---- RQ4 subgroup variables (observed grouping vars) ----
  re_all <- factor(sample(
    c("Latino", "White", "Asian", "Black", "Other"),
    size = N,
    replace = TRUE,
    prob = c(0.46, 0.21, 0.16, 0.05, 0.12)
  ))

  # first-gen (0/1)
  firstgen <- rbinom(N, 1, 0.45)

  living <- factor(sample(
    c("WithFamily", "OffCampus", "OnCampus"),
    size = N,
    replace = TRUE,
    prob = c(0.40, 0.35, 0.25)
  ))

  # reported gender (example; edit labels/probs to match)
  sex <- sample(
    x = c("Woman", "Man", "Nonbinary"),
    size = N,
    replace = TRUE,
    prob = c(0.55, 0.43, 0.02)
  )

  # correlated mediator disturbances
  e1 <- rnorm(N, 0, 1)
  e2 <- rho_m12 * e1 + sqrt(1 - rho_m12^2) * rnorm(N, 0, 1)

  # latent mediators
  Distress <- a1*FASt + a1z*Zplus10 + 0.15*prep + e1
  Interact <- a2*FASt + a2z*Zplus10 + 0.10*prep + e2

  # latent developmental adjustment
  eY <- rnorm(N, 0, 1)
  Adj <- cprime*FASt + cz*Zplus10 + b1*Distress + b2*Interact + 0.20*prep + eY

  # second-order structure: first-order factors
  Belong  <- 0.85*Adj + rnorm(N, 0, sqrt(1 - 0.85^2))
  Gains   <- 0.80*Adj + rnorm(N, 0, sqrt(1 - 0.80^2))
  Support <- 0.75*Adj + rnorm(N, 0, sqrt(1 - 0.75^2))

  # item loadings (population generator)
  l_SB  <- c(0.80, 0.75, 0.78)
  l_PG  <- c(0.70, 0.72, 0.74, 0.68, 0.73)
  l_SE  <- c(0.75, 0.78, 0.72)
  l_MHW <- c(0.75, 0.75, 0.80, 0.70, 0.78)
  l_QI  <- c(0.70, 0.80, 0.75, 0.85)

  # continuous latent responses
  SB_star  <- sapply(1:3, function(j) l_SB[j]*Belong  + rnorm(N, 0, sqrt(1 - l_SB[j]^2)))
  PG_star  <- sapply(1:5, function(j) l_PG[j]*Gains   + rnorm(N, 0, sqrt(1 - l_PG[j]^2)))
  SE_star  <- sapply(1:3, function(j) l_SE[j]*Support + rnorm(N, 0, sqrt(1 - l_SE[j]^2)))

  MHW_star <- sapply(1:5, function(j) l_MHW[j]*Distress + rnorm(N, 0, sqrt(1 - l_MHW[j]^2)))
  QI_star  <- sapply(1:4, function(j) l_QI[j]*Interact  + rnorm(N, 0, sqrt(1 - l_QI[j]^2)))

  # thresholds
  cuts4 <- c(-1.0, -0.2, 0.8)                  # 4 categories
  cuts6 <- c(-1.3, -0.7, -0.1, 0.5, 1.1)       # 6 categories
  cuts7 <- c(-1.5, -0.9, -0.3, 0.3, 0.9, 1.5)  # 7 categories

  # ordinal integer codes
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

  # convert ordinal columns to ordered factors (lavaan likes this)
  ord_cols <- c(
    "SB1","SB2","SB3","PG1","PG2","PG3","PG4","PG5","SE1","SE2","SE3",
    "MHWdacad","MHWdlonely","MHWdmental","MHWdpeers","MHWdexhaust",
    "QIstudent","QIfaculty","QIadvisor","QIstaff"
  )
  dat[ord_cols] <- lapply(dat[ord_cols], function(x) ordered(x))

  dat
}

# ---------- analysis model ----------
analysis_model <- '
  # measurement
  Distress =~ MHWdacad + MHWdlonely + MHWdmental + MHWdpeers + MHWdexhaust
  Interact =~ QIstudent + QIfaculty + QIadvisor + QIstaff

  Belong  =~ SB1 + SB2 + SB3
  Gains   =~ PG1 + PG2 + PG3 + PG4 + PG5
  Support =~ SE1 + SE2 + SE3
  Adj =~ Belong + Gains + Support

  # structural: threshold + dose (per +10 above 12)
  Distress ~ a1*FASt + a1z*Zplus10 + prep
  Interact ~ a2*FASt + a2z*Zplus10 + prep
  Adj ~ cprime*FASt + cz*Zplus10 + b1*Distress + b2*Interact + prep

  Distress ~~ Interact

  # "treated-at-dose z" contrasts vs control-at-0 (because Zplus10=0 when FASt=0)
  ind_d_z0 := (a1 + a1z*0)*b1
  ind_d_z1 := (a1 + a1z*1)*b1
  ind_d_z2 := (a1 + a1z*2)*b1

  ind_q_z0 := (a2 + a2z*0)*b2
  ind_q_z1 := (a2 + a2z*1)*b2
  ind_q_z2 := (a2 + a2z*2)*b2

  imm_d := a1z*b1
  imm_q := a2z*b2
'

ordered_vars <- c(
  "SB1","SB2","SB3","PG1","PG2","PG3","PG4","PG5","SE1","SE2","SE3",
  "MHWdacad","MHWdlonely","MHWdmental","MHWdpeers","MHWdexhaust",
  "QIstudent","QIfaculty","QIadvisor","QIstaff"
)

fit_one <- function(dat) {
  lavaan::sem(
    analysis_model,
    data = dat,
    ordered = ordered_vars,
    estimator = "WLSMV",
    parameterization = "theta",
    std.lv = TRUE
  )
}

# ---------- Monte Carlo driver ----------
run_mc <- function(N, R = 200, p_fast = 0.20,
                   a1=0.20, a1z=0.10, a2=0.15, a2z=-0.10,
                   b1=-0.30, b2=0.40, cprime=0.10, cz=-0.05) {

  gen_dat <- function(N) {
    gen_dat_base(
      N,
      p_fast = p_fast,
      a1 = a1, a1z = a1z, a2 = a2, a2z = a2z,
      b1 = b1, b2 = b2, cprime = cprime, cz = cz
    )
  }

  true <- list(
    a1=a1, a1z=a1z, a2=a2, a2z=a2z, b1=b1, b2=b2, cprime=cprime, cz=cz,
    imm_d = a1z*b1,
    imm_q = a2z*b2
  )

  keep <- vector("list", R)
  conv <- rep(FALSE, R)

  for (r in seq_len(R)) {
    dat <- gen_dat(N)

    fit <- try(fit_one(dat), silent = TRUE)
    if (inherits(fit, "try-error")) next

    conv[r] <- isTRUE(lavInspect(fit, "converged"))
    if (!conv[r]) next

    pe <- parameterEstimates(fit)
    keep[[r]] <- pe[pe$op %in% c("~", ":="),
                    c("lhs","op","rhs","label","est","se","pvalue")]
  }

  keep <- keep[conv]  # drop failed fits

  list(
    N = N, R = R, p_fast = p_fast,
    convergence_rate = mean(conv),
    true = true,
    pe_list = keep
  )
}

# ---------- summaries for defined params (':=') ----------
extract_defined <- function(mc_obj, name) {
  rows <- lapply(mc_obj$pe_list, function(df) df[df$op == ":=" & df$lhs == name, ])
  do.call(rbind, rows)
}

summarize_param <- function(rows, true_val) {
  est <- rows$est
  se  <- rows$se
  p   <- rows$pvalue

  bias <- mean(est) - true_val
  rmse <- sqrt(mean((est - true_val)^2))
  power <- mean(p < 0.05)

  lo <- est - 1.96*se
  hi <- est + 1.96*se
  cover <- mean(lo <= true_val & true_val <= hi)

  c(
    reps_used = length(est),
    mean_est = mean(est),
    bias = bias,
    rmse = rmse,
    mean_se = mean(se),
    power = power,
    coverage_95 = cover
  )
}

# ---------- run ----------
mc <- run_mc(N = N, R = Rreps, p_fast = p_fast)

cat("\n--- Monte Carlo complete ---\n")
cat("N =", mc$N, " | R =", mc$R, " | p_fast =", mc$p_fast, "\n")
cat("Convergence rate:", sprintf("%.3f", mc$convergence_rate), "\n\n")

rows_imm_d <- extract_defined(mc, "imm_d")
rows_imm_q <- extract_defined(mc, "imm_q")

cat("imm_d (true =", mc$true$imm_d, ")\n")
print(summarize_param(rows_imm_d, mc$true$imm_d))
cat("\nimm_q (true =", mc$true$imm_q, ")\n")
print(summarize_param(rows_imm_q, mc$true$imm_q))

# optional: save
out_rds <- paste0("mc_results_N", mc$N, "_R", mc$R, "_seed", seed, ".rds")
saveRDS(mc, out_rds)
cat("\nSaved:", out_rds, "\n")
