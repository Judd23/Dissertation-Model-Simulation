
# ==============================
# OFFICIAL (TREATMENT/CONTROL) SEM
# X = x_FASt (0/1), Z = credit_dose_c, moderator = XZ_c
# ==============================

# ============================================================
# W MODERATOR VARIABLE DEFINITIONS (RQ4)
# ============================================================
# W1 = re_all      (race/ethnicity)
# W2 = firstgen    (first-generation status: 0 = continuing-gen, 1 = first-gen)
# W3 = pell        (Pell status: 0 = non-Pell, 1 = Pell)
# W4 = sex         (sex/gender)
# W5 = living18    (living arrangement at age 18)
#
# These W variables are used for:
# - RQ4 Measurement Invariance: Configural → Metric → Scalar testing by W
# - RQ4 Structural MG: Multi-group SEM with structural paths free across W groups
# ============================================================

# ============================================================
# MEASUREMENT MODEL SPECIFICATION
# ============================================================
#
# IDENTIFICATION STRATEGY:
# 1. First-order loadings: ALL FREELY ESTIMATED (use std.lv = TRUE)
#    - Factor variances standardized to 1 for identification
#    - No marker variables on first-order factors
# 2. Second-order loadings: marker on most well-behaved factor (Belong)
#    - Belong (marker, loading = 1)
#    - Gains, SupportEnv, Satisf: freely estimated
# 3. Satisf is a proper first-order factor (sameinst, evalexp)
#
# DISTURBANCE TERMS:
# - EmoDiss, QualEngag, DevAdj have implicit disturbances (lavaan default)
# - For serial mediation: EmoDiss → QualEngag → DevAdj
#   The d path (EmoDiss → QualEngag) allows serial indirect effects
#
# IMPORTANT: Use std.lv = TRUE when fitting to identify first-order factors
# ============================================================

# Single shared measurement syntax (used for CFA/invariance and SEM).
# NOTE: scripts/e2e_integration_test_fa_st_pipeline.R validates this EXACTLY.
# REQUIRES: std.lv = TRUE for first-order factor identification in the DevAdj hierarchy
#
# IDENTIFICATION STRATEGY:
# 1. DevAdj hierarchy (second-order factor model):
#    - First-order loadings (Belong, Gains, SupportEnv, Satisf): ALL freely estimated
#      Identified via std.lv = TRUE (factor variances = 1)
#    - Second-order loadings: Marker variable approach
#      Belong fixed to 1, Gains/SupportEnv/Satisf freely estimated
#
# 2. Mediator factors (standalone single-factor models):
#    - Marker variable approach: first indicator loading fixed to 1, others free
#    - EmoDiss: marker on MHWdacad (most reliable indicator)
#    - QualEngag: marker on QIadmin (most reliable indicator)
#
MEASUREMENT_SYNTAX <- paste0(
  # DevAdj hierarchy: first-order loadings freely estimated (std.lv = TRUE identifies)
  "Belong =~ sbvalued + sbmyself + sbcommunity\n",
  "Gains  =~ pganalyze + pgthink + pgwork + pgvalues + pgprobsolve\n",
  "SupportEnv =~ SEacademic + SEwellness + SEnonacad + SEactivities + SEdiverse\n",
  "Satisf =~ sameinst + evalexp\n",
  # Second-order factor: Belong is marker (loading = 1), others freely estimated
  "DevAdj =~ 1*Belong + Gains + SupportEnv + Satisf\n",
  # Mediator factors: MARKER VARIABLE identification (single-factor models)
  # First indicator loading fixed to 1, remaining loadings freely estimated
  "EmoDiss =~ 1*MHWdacad + MHWdlonely + MHWdmental + MHWdexhaust + MHWdsleep + MHWdfinancial\n",
  "QualEngag =~ 1*QIadmin + QIstudent + QIadvisor + QIfaculty + QIstaff\n"
)

# ============================================================
# MEASUREMENT INVARIANCE SYNTAX (RQ4)
# For stepwise testing: Configural → Metric → Scalar
# ============================================================

# Configural invariance: same factor structure, loadings FREE within each group
# This is MEASUREMENT_SYNTAX without cross-group constraints
# REQUIRES: std.lv = TRUE for first-order factor identification
MEASUREMENT_SYNTAX_CONFIGURAL <- MEASUREMENT_SYNTAX

# Metric invariance: loadings CONSTRAINED equal across groups
# Uses labeled loadings for cross-group equality constraints
# All first-order loadings labeled; second-order marker on Belong
MEASUREMENT_SYNTAX_METRIC <- paste0(
  # First-order factors: all loadings labeled for equality
  "Belong =~ c(lam_sb1, lam_sb1)*sbvalued + c(lam_sb2, lam_sb2)*sbmyself + c(lam_sb3, lam_sb3)*sbcommunity\n",
  "Gains  =~ c(lam_pg1, lam_pg1)*pganalyze + c(lam_pg2, lam_pg2)*pgthink + c(lam_pg3, lam_pg3)*pgwork + c(lam_pg4, lam_pg4)*pgvalues + c(lam_pg5, lam_pg5)*pgprobsolve\n",
  "SupportEnv =~ c(lam_se1, lam_se1)*SEacademic + c(lam_se2, lam_se2)*SEwellness + c(lam_se3, lam_se3)*SEnonacad + c(lam_se4, lam_se4)*SEactivities + c(lam_se5, lam_se5)*SEdiverse\n",
  "Satisf =~ c(lam_sa1, lam_sa1)*sameinst + c(lam_sa2, lam_sa2)*evalexp\n",
  # Second-order: Belong marker, other loadings constrained equal
  "DevAdj =~ 1*Belong + c(lam_d2, lam_d2)*Gains + c(lam_d3, lam_d3)*SupportEnv + c(lam_d4, lam_d4)*Satisf\n",
  "EmoDiss =~ c(lam_ed1, lam_ed1)*MHWdacad + c(lam_ed2, lam_ed2)*MHWdlonely + c(lam_ed3, lam_ed3)*MHWdmental + c(lam_ed4, lam_ed4)*MHWdexhaust + c(lam_ed5, lam_ed5)*MHWdsleep + c(lam_ed6, lam_ed6)*MHWdfinancial\n",
  "QualEngag =~ c(lam_qi1, lam_qi1)*QIadmin + c(lam_qi2, lam_qi2)*QIstudent + c(lam_qi3, lam_qi3)*QIadvisor + c(lam_qi4, lam_qi4)*QIfaculty + c(lam_qi5, lam_qi5)*QIstaff\n"
)

# Scalar invariance: loadings AND intercepts constrained equal across groups
# (Intercept constraints handled via lavaan group.equal = c("loadings", "intercepts"))

# ============================================================
# RQ4 STRUCTURAL MG SYNTAX
# Measurement structure FIXED, loadings FREE within each group
# NO equality constraints across groups - loadings re-estimated per group
# ============================================================

# For MG structural analysis: use MEASUREMENT_SYNTAX_CONFIGURAL
# Structural paths are group-specific (labeled per group)
# This is the default for build_model_fast_treat_control_mg()

# ============================================================
# ML + FIML + CASE-RESAMPLING BOOTSTRAP SEM (lavaan)
# ============================================================

# Parallel mediation model (no serial d path)
# REQUIRES: std.lv = TRUE for first-order factor identification
MODEL_FULL <- paste0(
  # measurement: all first-order loadings freely estimated (std.lv = TRUE identifies)
  "Belong =~ sbvalued + sbmyself + sbcommunity\n",
  "Gains  =~ pganalyze + pgthink + pgwork + pgvalues + pgprobsolve\n",
  "SupportEnv =~ SEacademic + SEwellness + SEnonacad + SEactivities + SEdiverse\n",
  "Satisf =~ sameinst + evalexp\n",
  # Second-order factor: Belong is marker (most reliable)
  "DevAdj =~ 1*Belong + Gains + SupportEnv + Satisf\n",
  "\n",
  # Standalone mediator factors: use marker variable identification (1* on first indicator)
  "EmoDiss =~ 1*MHWdacad + MHWdlonely + MHWdmental + MHWdexhaust + MHWdsleep + MHWdfinancial\n",
  "QualEngag =~ 1*QIadmin + QIstudent + QIadvisor + QIfaculty + QIstaff\n",
  "\n",
  "# structural (treatment/control + moderation)\n",
  "# X = x_FASt (0/1), XZ_c = x_FASt*credit_dose_c (treated-only dose effect)\n",
  "# NOTE: credit_dose_c main effect OMITTED - dose only matters for FASt students\n",
  "# Disturbances for EmoDiss, QualEngag, DevAdj are implicit (lavaan default)\n",
  "EmoDiss ~ a1*x_FASt + a1z*XZ_c + g1*cohort +\n",
  "         hgrades_c + bparented_c + hapcl_c + hprecalc13_c + hchallenge_c + cSFcareer_c + hacadpr13_c + tcare_c + StemMaj_c\n",
  "\n",
  "QualEngag ~ a2*x_FASt + a2z*XZ_c + g2*cohort +\n",
  "           hgrades_c + bparented_c + hapcl_c + hprecalc13_c + hchallenge_c + cSFcareer_c + hacadpr13_c + tcare_c + StemMaj_c\n",
  "\n",
  "DevAdj ~ c*x_FASt + cz*XZ_c + b1*EmoDiss + b2*QualEngag + g3*cohort +\n",
  "        hgrades_c + bparented_c + hapcl_c + hprecalc13_c + hchallenge_c + cSFcareer_c + hacadpr13_c + tcare_c + StemMaj_c\n"
)

# Serial mediation model (includes EmoDiss → QualEngag path)
# Path structure:
#   X → M1 (a1, a1z)
#   X → M2 (a2, a2z)  
#   M1 → M2 (d) <- Serial mediation path
#   M1 → Y (b1)
#   M2 → Y (b2)
#   X → Y (c, cz)
#
# Serial indirect: X → M1 → M2 → Y = a1 * d * b2
# Parallel indirects: X → M1 → Y = a1 * b1, X → M2 → Y = a2 * b2
# REQUIRES: std.lv = TRUE for first-order factor identification
MODEL_FULL_SERIAL <- paste0(
  # measurement: all first-order loadings freely estimated (std.lv = TRUE identifies)
  "Belong =~ sbvalued + sbmyself + sbcommunity\n",
  "Gains  =~ pganalyze + pgthink + pgwork + pgvalues + pgprobsolve\n",
  "SupportEnv =~ SEacademic + SEwellness + SEnonacad + SEactivities + SEdiverse\n",
  "Satisf =~ sameinst + evalexp\n",
  "DevAdj =~ 1*Belong + Gains + SupportEnv + Satisf\n",
  "\n",
  # Standalone mediator factors: use marker variable identification (1* on first indicator)
  "EmoDiss =~ 1*MHWdacad + MHWdlonely + MHWdmental + MHWdexhaust + MHWdsleep + MHWdfinancial\n",
  "QualEngag =~ 1*QIadmin + QIstudent + QIadvisor + QIfaculty + QIstaff\n",
  "\n",
  "# structural with SERIAL MEDIATION: EmoDiss → QualEngag → DevAdj\n",
  "# X = x_FASt (0/1), XZ_c = x_FASt*credit_dose_c (treated-only dose effect)\n",
  "# NOTE: credit_dose_c main effect OMITTED - dose only matters for FASt students\n",
  "# Disturbances (residual variances) are implicit for all endogenous variables\n",
  "EmoDiss ~ a1*x_FASt + a1z*XZ_c + g1*cohort +\n",
  "         hgrades_c + bparented_c + hapcl_c + hprecalc13_c + hchallenge_c + cSFcareer_c + hacadpr13_c + tcare_c + StemMaj_c\n",
  "\n",
  "# QualEngag regressed on EmoDiss (d path for serial mediation)\n",
  "QualEngag ~ a2*x_FASt + a2z*XZ_c + d*EmoDiss + g2*cohort +\n",
  "           hgrades_c + bparented_c + hapcl_c + hprecalc13_c + hchallenge_c + cSFcareer_c + hacadpr13_c + tcare_c + StemMaj_c\n",
  "\n",
  "DevAdj ~ c*x_FASt + cz*XZ_c + b1*EmoDiss + b2*QualEngag + g3*cohort +\n",
  "        hgrades_c + bparented_c + hapcl_c + hprecalc13_c + hchallenge_c + cSFcareer_c + hacadpr13_c + tcare_c + StemMaj_c\n",
  "\n",
  "# DEFINED PARAMETERS for serial mediation\n",
  "# Serial indirect effect: X → EmoDiss → QualEngag → DevAdj\n",
  "serial_ind := a1 * d * b2\n",
  "\n",
  "# Parallel indirect through EmoDiss (controlling for serial path)\n",
  "ind_EmoDiss := a1 * b1\n",
  "\n",
  "# Parallel indirect through QualEngag (direct X→QualEngag path only)\n",
  "ind_QualEngag := a2 * b2\n",
  "\n",
  "# Total indirect (all mediated paths)\n",
  "total_ind := (a1 * b1) + (a2 * b2) + (a1 * d * b2)\n",
  "\n",
  "# Total effect\n",
  "total_effect := c + (a1 * b1) + (a2 * b2) + (a1 * d * b2)\n"
)

# ============================================================
# MEASUREMENT INVARIANCE TESTING FUNCTIONS (RQ4)
# Stepwise: Configural → Metric → Scalar
# ============================================================

#' Fit measurement invariance sequence across groups
#' @param dat Data frame with group variable
#' @param group_var Name of grouping variable (e.g., "re_all", "pell")
#' @param ordered_vars Character vector of ordered indicator names (NULL for continuous)
#' @param estimator Estimator to use ("WLSMV" for ordinal, "ML" for continuous)
#' @return List with configural, metric, scalar fits and comparison tests
fit_measurement_invariance <- function(dat, group_var, ordered_vars = NULL, 
                                       estimator = "WLSMV") {
  if (!requireNamespace("lavaan", quietly = TRUE)) {
    stop("lavaan is required for measurement invariance testing")
  }
  
  # Use CFA-only measurement syntax (no structural paths)
  cfa_syntax <- MEASUREMENT_SYNTAX
  
  # Common arguments
  common_args <- list(
    model = cfa_syntax,
    data = dat,
    group = group_var
  )
  
  if (!is.null(ordered_vars) && estimator == "WLSMV") {
    common_args$ordered <- ordered_vars
    common_args$estimator <- "WLSMV"
    common_args$parameterization <- "theta"
    # Handle empty cells that can occur in MG ordinal models
    common_args$zero.cell <- TRUE
    common_args$zero.keep <- TRUE
  } else {
    common_args$estimator <- estimator
    common_args$missing <- "fiml"
  }
  
  # Configural: same structure, loadings FREE within each group
  fit_config <- tryCatch(
    do.call(lavaan::cfa, common_args),
    error = function(e) {
      message("Configural invariance failed: ", e$message)
      NULL
    }
  )
  
  # Metric: loadings CONSTRAINED equal across groups
  metric_args <- c(common_args, list(group.equal = c("loadings")))
  fit_metric <- tryCatch(
    do.call(lavaan::cfa, metric_args),
    error = function(e) {
      message("Metric invariance failed: ", e$message)
      NULL
    }
  )
  
  # Scalar: loadings AND intercepts/thresholds constrained equal
  scalar_args <- c(common_args, list(group.equal = c("loadings", "intercepts")))
  fit_scalar <- tryCatch(
    do.call(lavaan::cfa, scalar_args),
    error = function(e) {
      message("Scalar invariance failed: ", e$message)
      NULL
    }
  )
  
  # Model comparisons (if both fits succeeded)
  comp_metric_config <- NULL
  comp_scalar_metric <- NULL
  
  if (!is.null(fit_config) && !is.null(fit_metric)) {
    comp_metric_config <- tryCatch(
      lavaan::lavTestLRT(fit_config, fit_metric),
      error = function(e) {
        message("Metric vs Configural comparison failed: ", e$message)
        NULL
      }
    )
  }
  
  if (!is.null(fit_metric) && !is.null(fit_scalar)) {
    comp_scalar_metric <- tryCatch(
      lavaan::lavTestLRT(fit_metric, fit_scalar),
      error = function(e) {
        message("Scalar vs Metric comparison failed: ", e$message)
        NULL
      }
    )
  }
  
  list(
    configural = fit_config,
    metric = fit_metric,
    scalar = fit_scalar,
    test_metric_vs_configural = comp_metric_config,
    test_scalar_vs_metric = comp_scalar_metric
  )
}

#' Extract fit indices for invariance comparison table
#' @param inv_result Result from fit_measurement_invariance()
#' @return Data frame with fit indices for each invariance level
summarize_invariance_fits <- function(inv_result) {
  extract_fit <- function(fit, level) {
    fm <- lavaan::fitMeasures(fit, c("chisq", "df", "pvalue", "cfi", "tli", "rmsea", "srmr"))
    data.frame(
      level = level,
      chisq = fm["chisq"],
      df = fm["df"],
      pvalue = fm["pvalue"],
      cfi = fm["cfi"],
      tli = fm["tli"],
      rmsea = fm["rmsea"],
      srmr = fm["srmr"],
      row.names = NULL
    )
  }
  
  rbind(
    extract_fit(inv_result$configural, "Configural"),
    extract_fit(inv_result$metric, "Metric"),
    extract_fit(inv_result$scalar, "Scalar")
  )
}

# ============================================================
# RQ4 STRUCTURAL MG: Measurement FIXED, loadings FREE per group
# NO cross-group constraints on loadings
# ============================================================

#' Build MG structural model with measurement fixed, loadings free per group
#' This is used for race-stratified RQ4 structural analysis
#' @param dat Data frame
#' @param group_var Grouping variable name
#' @param z_vals Z values for conditional effects probing
#' @return lavaan model string
build_model_mg_structural_free_loadings <- function(dat, group_var, z_vals = NULL) {
  if (is.null(z_vals)) {
    sd_z <- stats::sd(dat$credit_dose_c, na.rm = TRUE)
    z_vals <- c(z_low = -sd_z, z_mid = 0, z_high = sd_z)
  }
  
  z_low  <- as.numeric(z_vals[[1]])
  z_mid  <- as.numeric(z_vals[[2]])
  z_high <- as.numeric(z_vals[[3]])
  
  z_low_txt  <- format(z_low,  digits = 12, scientific = FALSE)
  z_mid_txt  <- format(z_mid,  digits = 12, scientific = FALSE)
  z_high_txt <- format(z_high, digits = 12, scientific = FALSE)
  
  # Get number of groups
  G <- length(unique(dat[[group_var]]))
  
  # Build group-specific structural path labels
  a1_vec  <- paste0("a1_", seq_len(G))
  a1z_vec <- paste0("a1z_", seq_len(G))
  a2_vec  <- paste0("a2_", seq_len(G))
  a2z_vec <- paste0("a2z_", seq_len(G))
  b1_vec  <- paste0("b1_", seq_len(G))
  b2_vec  <- paste0("b2_", seq_len(G))
  c_vec   <- paste0("c_", seq_len(G))
  cz_vec  <- paste0("cz_", seq_len(G))
  
  a1_free  <- paste0("c(", paste(a1_vec, collapse = ","), ")*x_FASt")
  a1z_free <- paste0("c(", paste(a1z_vec, collapse = ","), ")*XZ_c")
  a2_free  <- paste0("c(", paste(a2_vec, collapse = ","), ")*x_FASt")
  a2z_free <- paste0("c(", paste(a2z_vec, collapse = ","), ")*XZ_c")
  b1_free  <- paste0("c(", paste(b1_vec, collapse = ","), ")*EmoDiss")
  b2_free  <- paste0("c(", paste(b2_vec, collapse = ","), ")*QualEngag")
  c_free   <- paste0("c(", paste(c_vec, collapse = ","), ")*x_FASt")
  cz_free  <- paste0("c(", paste(cz_vec, collapse = ","), ")*XZ_c")
  
  # Measurement syntax (loadings FREE within each group - no constraints)
  # lavaan will re-estimate loadings per group by default in MG
  paste0(
    # Measurement (same structure, loadings re-estimated per group)
    MEASUREMENT_SYNTAX,
    "\n",
    "# Structural paths: FREE across groups (labeled per group)\n",
    "EmoDiss ~ ", a1_free, " + ", a1z_free, " + a1c*credit_dose_c + g1*cohort +\n",
    "         hgrades_c + bparented_c + hapcl_c + hprecalc13_c + hchallenge_c + cSFcareer_c + hacadpr13_c + tcare_c + StemMaj_c\n",
    "\n",
    "QualEngag ~ ", a2_free, " + ", a2z_free, " + a2c*credit_dose_c + g2*cohort +\n",
    "           hgrades_c + bparented_c + hapcl_c + hprecalc13_c + hchallenge_c + cSFcareer_c + hacadpr13_c + tcare_c + StemMaj_c\n",
    "\n",
    "DevAdj ~ ", c_free, " + ", cz_free, " + cc*credit_dose_c + ", b1_free, " + ", b2_free, " + g3*cohort +\n",
    "        hgrades_c + bparented_c + hapcl_c + hprecalc13_c + hchallenge_c + cSFcareer_c + hacadpr13_c + tcare_c + StemMaj_c\n"
  )
}

prep_dat_for_ml <- function(dat) {
  dat <- as.data.frame(dat)
  if (!all(c("x_FASt", "credit_dose_c") %in% names(dat))) {
    stop("prep_dat_for_ml() requires columns: x_FASt, credit_dose_c")
  }
  if (!("XZ_c" %in% names(dat))) {
    dat$XZ_c <- dat$x_FASt * dat$credit_dose_c
  }
  dat
}

fit_full_sem_ml_fiml_boot <- function(dat,
                                      weights_var = "psw",
                                      bootstrap_B = 2000,
                                      ci_level = 0.95,
                                      boot_ci_type = NULL) {
  dat <- prep_dat_for_ml(dat)

  wts <- if (!is.null(weights_var) && weights_var %in% names(dat)) weights_var else NULL

  fit <- lavaan::sem(
    model = MODEL_FULL,
    data = dat,
    estimator = "ML",
    missing = "fiml",
    se = "bootstrap",
    bootstrap = bootstrap_B,
    sampling.weights = wts,
    fixed.x = TRUE,
    meanstructure = TRUE,
    check.gradient = FALSE,
    control = list(iter.max = 20000)
  )

  pe <- if (is.null(boot_ci_type)) {
    lavaan::parameterEstimates(
      fit,
      standardized = TRUE,
      ci = TRUE,
      level = ci_level
    )
  } else {
    lavaan::parameterEstimates(
      fit,
      standardized = TRUE,
      ci = TRUE,
      level = ci_level,
      boot.ci.type = boot_ci_type
    )
  }

  list(fit = fit, pe = pe)
}

# Build a lavaan model string with conditional effects evaluated at three Z values.
# Default Z values are: -1 SD, 0 (centered), +1 SD of credit_dose_c.
build_model_fast_treat_control <- function(dat, z_vals = NULL) {
  if (is.null(z_vals)) {
    sd_z <- stats::sd(dat$credit_dose_c, na.rm = TRUE)
    z_vals <- c(z_low = -sd_z, z_mid = 0, z_high = sd_z)
  }

  z_low  <- as.numeric(z_vals[[1]])
  z_mid  <- as.numeric(z_vals[[2]])
  z_high <- as.numeric(z_vals[[3]])

  # Format constants to keep them readable in the model string
  z_low_txt  <- format(z_low,  digits = 12, scientific = FALSE)
  z_mid_txt  <- format(z_mid,  digits = 12, scientific = FALSE)
  z_high_txt <- format(z_high, digits = 12, scientific = FALSE)

  paste0(
MEASUREMENT_SYNTAX,
"\n",
"# structural (treatment/control + moderation)\n",
"# X = x_FASt (0/1), XZ_c = x_FASt*credit_dose_c (treated-only dose effect)\n",
"# NOTE: credit_dose_c main effect OMITTED - dose only matters for FASt students\n",
"EmoDiss ~ a1*x_FASt + a1z*XZ_c + g1*cohort +\n",
"     hgrades_c + bparented_c + hapcl_c + hprecalc13_c + hchallenge_c + cSFcareer_c + hacadpr13_c + tcare_c + StemMaj_c\n\n",
"QualEngag ~ a2*x_FASt + a2z*XZ_c + g2*cohort +\n",
"     hgrades_c + bparented_c + hapcl_c + hprecalc13_c + hchallenge_c + cSFcareer_c + hacadpr13_c + tcare_c + StemMaj_c\n\n",
"DevAdj ~ c*x_FASt + cz*XZ_c + b1*EmoDiss + b2*QualEngag + g3*cohort +\n",
"         hgrades_c + bparented_c + hapcl_c + hprecalc13_c + hchallenge_c + cSFcareer_c + hacadpr13_c + tcare_c + StemMaj_c\n\n",
"# conditional direct effects of FASt on DevAdj at Z values\n",
"dir_z_low  := c + cz*", z_low_txt, "\n",
"dir_z_mid  := c + cz*", z_mid_txt, "\n",
"dir_z_high := c + cz*", z_high_txt, "\n\n",
"# conditional a-paths at Z values (FASt -> mediator)\n",
"a1_z_low  := a1 + a1z*", z_low_txt, "\n",
"a1_z_mid  := a1 + a1z*", z_mid_txt, "\n",
"a1_z_high := a1 + a1z*", z_high_txt, "\n",
"a2_z_low  := a2 + a2z*", z_low_txt, "\n",
"a2_z_mid  := a2 + a2z*", z_mid_txt, "\n",
"a2_z_high := a2 + a2z*", z_high_txt, "\n\n",
"# conditional indirect effects at Z values\n",
"ind_EmoDiss_z_low  := a1_z_low*b1\n",
"ind_EmoDiss_z_mid  := a1_z_mid*b1\n",
"ind_EmoDiss_z_high := a1_z_high*b1\n",
"ind_QualEngag_z_low  := a2_z_low*b2\n",
"ind_QualEngag_z_mid  := a2_z_mid*b2\n",
"ind_QualEngag_z_high := a2_z_high*b2\n\n",
"# total effects of FASt on DevAdj at Z values\n",
"total_z_low  := dir_z_low  + ind_EmoDiss_z_low  + ind_QualEngag_z_low\n",
"total_z_mid  := dir_z_mid  + ind_EmoDiss_z_mid  + ind_QualEngag_z_mid\n",
"total_z_high := dir_z_high + ind_EmoDiss_z_high + ind_QualEngag_z_high\n\n",
"# indices of moderated mediation (first-stage moderation)\n",
"index_MM_EmoDiss   := a1z*b1\n",
"index_MM_QualEngag := a2z*b2\n"
  )

}

# Serial mediation variant (exploratory): includes EmoDiss -> QualEngag path and serial indirects.
build_model_fast_treat_control_serial <- function(dat, z_vals = NULL) {
  if (is.null(z_vals)) {
    sd_z <- stats::sd(dat$credit_dose_c, na.rm = TRUE)
    z_vals <- c(z_low = -sd_z, z_mid = 0, z_high = sd_z)
  }

  z_low  <- as.numeric(z_vals[[1]])
  z_mid  <- as.numeric(z_vals[[2]])
  z_high <- as.numeric(z_vals[[3]])

  z_low_txt  <- format(z_low,  digits = 12, scientific = FALSE)
  z_mid_txt  <- format(z_mid,  digits = 12, scientific = FALSE)
  z_high_txt <- format(z_high, digits = 12, scientific = FALSE)

  paste0(
MEASUREMENT_SYNTAX,
"\n",
"# structural (treatment/control + moderation) - SERIAL MEDIATION\n",
"# X = x_FASt (0/1), XZ_c = x_FASt*credit_dose_c (treated-only dose effect)\n",
"# NOTE: credit_dose_c main effect OMITTED - dose only matters for FASt students\n",
"EmoDiss ~ a1*x_FASt + a1z*XZ_c + g1*cohort +\n",
"     hgrades_c + bparented_c + hapcl_c + hprecalc13_c + hchallenge_c + cSFcareer_c + hacadpr13_c + tcare_c + StemMaj_c\n\n",
"QualEngag ~ a2*x_FASt + a2z*XZ_c + d*EmoDiss + g2*cohort +\n",
"     hgrades_c + bparented_c + hapcl_c + hprecalc13_c + hchallenge_c + cSFcareer_c + hacadpr13_c + tcare_c + StemMaj_c\n\n",
"DevAdj ~ c*x_FASt + cz*XZ_c + b1*EmoDiss + b2*QualEngag + g3*cohort +\n",
"         hgrades_c + bparented_c + hapcl_c + hprecalc13_c + hchallenge_c + cSFcareer_c + hacadpr13_c + tcare_c + StemMaj_c\n\n",
"# conditional direct effects of FASt on DevAdj at Z values\n",
"dir_z_low  := c + cz*", z_low_txt, "\n",
"dir_z_mid  := c + cz*", z_mid_txt, "\n",
"dir_z_high := c + cz*", z_high_txt, "\n\n",
"# conditional a-paths at Z values (FASt -> mediator)\n",
"a1_z_low  := a1 + a1z*", z_low_txt, "\n",
"a1_z_mid  := a1 + a1z*", z_mid_txt, "\n",
"a1_z_high := a1 + a1z*", z_high_txt, "\n",
"a2_z_low  := a2 + a2z*", z_low_txt, "\n",
"a2_z_mid  := a2 + a2z*", z_mid_txt, "\n",
"a2_z_high := a2 + a2z*", z_high_txt, "\n\n",
"# conditional indirect effects at Z values\n",
"ind_EmoDiss_z_low  := a1_z_low*b1\n",
"ind_EmoDiss_z_mid  := a1_z_mid*b1\n",
"ind_EmoDiss_z_high := a1_z_high*b1\n",
"ind_QualEngag_z_low  := a2_z_low*b2\n",
"ind_QualEngag_z_mid  := a2_z_mid*b2\n",
"ind_QualEngag_z_high := a2_z_high*b2\n",
"ind_serial_z_low  := a1_z_low*d*b2\n",
"ind_serial_z_mid  := a1_z_mid*d*b2\n",
"ind_serial_z_high := a1_z_high*d*b2\n\n",
"# total effects of FASt on DevAdj at Z values\n",
"total_z_low  := dir_z_low  + ind_EmoDiss_z_low  + ind_QualEngag_z_low  + ind_serial_z_low\n",
"total_z_mid  := dir_z_mid  + ind_EmoDiss_z_mid  + ind_QualEngag_z_mid  + ind_serial_z_mid\n",
"total_z_high := dir_z_high + ind_EmoDiss_z_high + ind_QualEngag_z_high + ind_serial_z_high\n\n",
"# indices of moderated mediation (first-stage moderation)\n",
"index_MM_EmoDiss   := a1z*b1\n",
"index_MM_QualEngag := a2z*b2\n",
"index_MM_serial   := a1z*d*b2\n"
  )
}

# Total effect model (Eq. 1): DevAdj ~ X only (no mediators, no moderator).
build_model_total_effect <- function(dat) {
  paste0(
MEASUREMENT_SYNTAX,
"\n",
"# total effect (Eq. 1)\n",
"DevAdj ~ c_total*x_FASt\n"
  )
}

# Build a lavaan model string for MULTI-GROUP structural heterogeneity by W.
# Key: structural paths are labeled with c(label_g1, label_g2, ...) so they are FREE across groups.
# Defined parameters compute conditional indirect effects per group at Z values and contrasts vs group 1.
build_model_fast_treat_control_mg <- function(dat, group_var, w_label = NULL, z_vals = NULL) {
  if (is.null(z_vals)) {
    sd_z <- stats::sd(dat$credit_dose_c, na.rm = TRUE)
    z_vals <- c(z_low = -sd_z, z_mid = 0, z_high = sd_z)
  }

  z_low  <- as.numeric(z_vals[[1]])
  z_mid  <- as.numeric(z_vals[[2]])
  z_high <- as.numeric(z_vals[[3]])

  # Format constants to keep them readable in the model string
  z_low_txt  <- format(z_low,  digits = 12, scientific = FALSE)
  z_mid_txt  <- format(z_mid,  digits = 12, scientific = FALSE)
  z_high_txt <- format(z_high, digits = 12, scientific = FALSE)

  # Determine group levels (after dropping NA)
  gv <- dat[[group_var]]
  gv <- gv[!is.na(gv)]
  levs <- levels(factor(gv))
  k <- length(levs)
  if (k < 2) stop("group_var must have >= 2 non-missing levels for multi-group SEM: ", group_var)

  # Prefix for parameter labels so outputs are traceable to W1/W2/... in write-ups
  wlab <- if (is.null(w_label) || is.na(w_label) || !nzchar(w_label)) group_var else w_label
  wlab <- gsub("[^A-Za-z0-9]+", "_", wlab)
  wlab <- gsub("_+$", "", wlab)
  pfx <- function(x) paste0(wlab, "__", x)

  # Helper: build c(label_g1, label_g2, ...) strings
  cvec <- function(base) {
    paste0("c(", paste0(pfx(base), "_g", seq_len(k), collapse = ","), ")")
  }

  # Helper: one line per group for defined params
  def_by_group <- function(stem, expr_fun) {
    out <- character(0)
    for (g in seq_len(k)) {
      out <- c(out, paste0(pfx(stem), "_g", g, " := ", expr_fun(g)))
    }
    out
  }

  # Helper: contrasts vs reference group (g1)
  def_contrast_vs_g1 <- function(stem, base_stem) {
    out <- character(0)
    for (g in 2:k) {
      out <- c(out, paste0(pfx(paste0("diff_", stem)), "_g", g, " := ", pfx(base_stem), "_g", g, " - ", pfx(base_stem), "_g1"))
    }
    out
  }

  # Structural labels free across groups
  a1  <- cvec("a1")
  a1c <- cvec("a1c")
  a1z <- cvec("a1z")

  a2  <- cvec("a2")
  a2c <- cvec("a2c")
  a2z <- cvec("a2z")


  b1  <- cvec("b1")
  b2  <- cvec("b2")

  c0  <- cvec("c")
  cc  <- cvec("cc")
  cz  <- cvec("cz")

  g1p <- cvec("g1")
  g2p <- cvec("g2")
  g3p <- cvec("g3")

  # Defined parameters: per-group conditional paths and effects
  dir_low  <- def_by_group("dir_z_low",  function(g) paste0(pfx("c"), "_g", g, " + ", pfx("cz"), "_g", g, "*", z_low_txt))
  dir_mid  <- def_by_group("dir_z_mid",  function(g) paste0(pfx("c"), "_g", g, " + ", pfx("cz"), "_g", g, "*", z_mid_txt))
  dir_high <- def_by_group("dir_z_high", function(g) paste0(pfx("c"), "_g", g, " + ", pfx("cz"), "_g", g, "*", z_high_txt))

  a1_low  <- def_by_group("a1_z_low",  function(g) paste0(pfx("a1"), "_g", g, " + ", pfx("a1z"), "_g", g, "*", z_low_txt))
  a1_mid  <- def_by_group("a1_z_mid",  function(g) paste0(pfx("a1"), "_g", g, " + ", pfx("a1z"), "_g", g, "*", z_mid_txt))
  a1_high <- def_by_group("a1_z_high", function(g) paste0(pfx("a1"), "_g", g, " + ", pfx("a1z"), "_g", g, "*", z_high_txt))

  a2_low  <- def_by_group("a2_z_low",  function(g) paste0(pfx("a2"), "_g", g, " + ", pfx("a2z"), "_g", g, "*", z_low_txt))
  a2_mid  <- def_by_group("a2_z_mid",  function(g) paste0(pfx("a2"), "_g", g, " + ", pfx("a2z"), "_g", g, "*", z_mid_txt))
  a2_high <- def_by_group("a2_z_high", function(g) paste0(pfx("a2"), "_g", g, " + ", pfx("a2z"), "_g", g, "*", z_high_txt))

  ind_m1_low  <- def_by_group("ind_EmoDiss_z_low",  function(g) paste0(pfx("a1_z_low"), "_g", g, "*", pfx("b1"), "_g", g))
  ind_m1_mid  <- def_by_group("ind_EmoDiss_z_mid",  function(g) paste0(pfx("a1_z_mid"), "_g", g, "*", pfx("b1"), "_g", g))
  ind_m1_high <- def_by_group("ind_EmoDiss_z_high", function(g) paste0(pfx("a1_z_high"), "_g", g, "*", pfx("b1"), "_g", g))

  ind_m2_low  <- def_by_group("ind_QualEngag_z_low",  function(g) paste0(pfx("a2_z_low"), "_g", g, "*", pfx("b2"), "_g", g))
  ind_m2_mid  <- def_by_group("ind_QualEngag_z_mid",  function(g) paste0(pfx("a2_z_mid"), "_g", g, "*", pfx("b2"), "_g", g))
  ind_m2_high <- def_by_group("ind_QualEngag_z_high", function(g) paste0(pfx("a2_z_high"), "_g", g, "*", pfx("b2"), "_g", g))

  # total effects: dir + ind_m1 + ind_m2 (NO serial mediation)
  total_low  <- def_by_group("total_z_low",  function(g) paste0(pfx("dir_z_low"), "_g", g, " + ", pfx("ind_EmoDiss_z_low"), "_g", g, " + ", pfx("ind_QualEngag_z_low"), "_g", g))
  total_mid  <- def_by_group("total_z_mid",  function(g) paste0(pfx("dir_z_mid"), "_g", g, " + ", pfx("ind_EmoDiss_z_mid"), "_g", g, " + ", pfx("ind_QualEngag_z_mid"), "_g", g))
  total_high <- def_by_group("total_z_high", function(g) paste0(pfx("dir_z_high"), "_g", g, " + ", pfx("ind_EmoDiss_z_high"), "_g", g, " + ", pfx("ind_QualEngag_z_high"), "_g", g))

  # Indices of moderated mediation by Z within each group (analogous to your pooled IMM terms)
  imm_m1 <- def_by_group("index_MM_EmoDiss",   function(g) paste0(pfx("a1z"), "_g", g, "*", pfx("b1"), "_g", g))
  imm_m2 <- def_by_group("index_MM_QualEngag", function(g) paste0(pfx("a2z"), "_g", g, "*", pfx("b2"), "_g", g))

  # Contrasts vs reference group (g1): these are the W-moderated indirect-effect contrasts
  diff_ind_m1_low  <- def_contrast_vs_g1("ind_EmoDiss_z_low",  "ind_EmoDiss_z_low")
  diff_ind_m1_mid  <- def_contrast_vs_g1("ind_EmoDiss_z_mid",  "ind_EmoDiss_z_mid")
  diff_ind_m1_high <- def_contrast_vs_g1("ind_EmoDiss_z_high", "ind_EmoDiss_z_high")

  diff_ind_m2_low  <- def_contrast_vs_g1("ind_QualEngag_z_low",  "ind_QualEngag_z_low")
  diff_ind_m2_mid  <- def_contrast_vs_g1("ind_QualEngag_z_mid",  "ind_QualEngag_z_mid")
  diff_ind_m2_high <- def_contrast_vs_g1("ind_QualEngag_z_high", "ind_QualEngag_z_high")

  diff_total_low  <- def_contrast_vs_g1("total_z_low",  "total_z_low")
  diff_total_mid  <- def_contrast_vs_g1("total_z_mid",  "total_z_mid")
  diff_total_high <- def_contrast_vs_g1("total_z_high", "total_z_high")

  diff_imm_m1  <- def_contrast_vs_g1("index_MM_EmoDiss",   "index_MM_EmoDiss")
  diff_imm_m2  <- def_contrast_vs_g1("index_MM_QualEngag", "index_MM_QualEngag")

  # IMPORTANT: do not include the grouping variable as an exogenous covariate.
  # Example: when group_var == "pell", pell is constant within each group and lavaan errors.
  # Also exclude any covariate with zero variance in ANY group (causes lavaan error).
  covars <- c(
    "hgrades_c", "bparented_c", "hapcl_c", "hprecalc13_c", "hchallenge_c", "cSFcareer_c",
    "hacadpr13_c", "tcare_c", "StemMaj_c"
  )
  covars <- setdiff(covars, group_var)
  
  # Check for zero-variance covariates within any group
  zero_var_covars <- character(0)
  for (cv in covars) {
    if (cv %in% names(dat)) {
      for (lv in levs) {
        grp_vals <- dat[[cv]][dat[[group_var]] == lv]
        grp_vals <- grp_vals[!is.na(grp_vals)]
        if (length(unique(grp_vals)) <= 1) {
          zero_var_covars <- c(zero_var_covars, cv)
          break
        }
      }
    }
  }
  if (length(zero_var_covars) > 0) {
    message("[MG model] Excluding zero-variance covariates: ", paste(zero_var_covars, collapse = ", "))
    covars <- setdiff(covars, zero_var_covars)
  }
  
  covars_txt <- paste(covars, collapse = " + ")

  paste0(
    MEASUREMENT_SYNTAX,
    "\n",
    "# structural (multi-group by W with group-varying paths)\n",
    "EmoDiss ~ ", a1, "*x_FASt + ", a1c, "*credit_dose_c + ", a1z, "*XZ_c + ", g1p, "*cohort +\n",
    "     ", covars_txt, "\n\n",
    "QualEngag ~ ", a2, "*x_FASt + ", a2c, "*credit_dose_c + ", a2z, "*XZ_c + ", g2p, "*cohort +\n",
    "     ", covars_txt, "\n\n",
    "DevAdj ~ ", c0, "*x_FASt + ", cc, "*credit_dose_c + ", cz, "*XZ_c + ", b1, "*EmoDiss + ", b2, "*QualEngag + ", g3p, "*cohort +\n",
    "         ", covars_txt, "\n\n",
    "# conditional direct effects of FASt on DevAdj at Z values (per group)\n",
    paste0(dir_low, collapse = "\n"), "\n",
    paste0(dir_mid, collapse = "\n"), "\n",
    paste0(dir_high, collapse = "\n"), "\n\n",
    "# conditional a-paths at Z values (per group)\n",
    paste0(a1_low, collapse = "\n"), "\n",
    paste0(a1_mid, collapse = "\n"), "\n",
    paste0(a1_high, collapse = "\n"), "\n",
    paste0(a2_low, collapse = "\n"), "\n",
    paste0(a2_mid, collapse = "\n"), "\n",
    paste0(a2_high, collapse = "\n"), "\n\n",
    "# conditional indirect effects at Z values (per group)\n",
    paste0(ind_m1_low, collapse = "\n"), "\n",
    paste0(ind_m1_mid, collapse = "\n"), "\n",
    paste0(ind_m1_high, collapse = "\n"), "\n",
    paste0(ind_m2_low, collapse = "\n"), "\n",
    paste0(ind_m2_mid, collapse = "\n"), "\n",
    paste0(ind_m2_high, collapse = "\n"), "\n",
    # Serial indirects removed
    "# total effects at Z values (per group)\n",
    paste0(total_low, collapse = "\n"), "\n",
    paste0(total_mid, collapse = "\n"), "\n",
    paste0(total_high, collapse = "\n"), "\n\n",
    "# indices of moderated mediation by Z (per group)\n",
    paste0(imm_m1, collapse = "\n"), "\n",
    paste0(imm_m2, collapse = "\n"), "\n\n",
    "# contrasts vs reference group (g1): conditional indirect/total differences (W-moderated contrasts)\n",
    paste0(diff_ind_m1_low, collapse = "\n"), "\n",
    paste0(diff_ind_m1_mid, collapse = "\n"), "\n",
    paste0(diff_ind_m1_high, collapse = "\n"), "\n",
    paste0(diff_ind_m2_low, collapse = "\n"), "\n",
    paste0(diff_ind_m2_mid, collapse = "\n"), "\n",
    paste0(diff_ind_m2_high, collapse = "\n"), "\n",
    # Serial contrasts removed
    paste0(diff_total_low, collapse = "\n"), "\n",
    paste0(diff_total_mid, collapse = "\n"), "\n",
    paste0(diff_total_high, collapse = "\n"), "\n\n",
    "# contrasts vs reference group (g1): differences in Z-based IMM terms\n",
    paste0(diff_imm_m1, collapse = "\n"), "\n",
    paste0(diff_imm_m2, collapse = "\n"), "\n"
  )
}

fit_mg_fast_vs_nonfast <- function(dat,
                                  group = NULL,
                                  w_label = NULL,
                                  model_type = c("parallel", "serial", "total"),
                                  estimator = "ML",
                                  missing = "fiml",
                                  fixed.x = TRUE,
                                  weight_var = "psw",
                                  bootstrap = NULL,
                                  se = NULL,
                                  z_vals = NULL,
                                  ...) {
  model_type <- match.arg(model_type)
  wts <- if (!is.null(weight_var) && weight_var %in% names(dat)) weight_var else NULL

  # Build observed interaction term if needed: XZ_c = x_FASt * credit_dose_c
  if (!("XZ_c" %in% names(dat))) {
    dat$XZ_c <- dat$x_FASt * dat$credit_dose_c
  }

  model_tc <- if (is.null(group)) {
    if (model_type == "parallel") build_model_fast_treat_control(dat, z_vals = z_vals)
    else if (model_type == "serial") build_model_fast_treat_control_serial(dat, z_vals = z_vals)
    else build_model_total_effect(dat)
  } else {
    build_model_fast_treat_control_mg(dat, group_var = group, w_label = w_label, z_vals = z_vals)
  }

  lavaan::sem(
    model = model_tc,
    data = dat,
    group = group,
    estimator = estimator,
    missing = missing,
    fixed.x = fixed.x,
    sampling.weights = wts,
    se = se,
    bootstrap = bootstrap,
    check.lv.names = FALSE,
    meanstructure = TRUE,
    check.gradient = FALSE,
    control = list(iter.max = 20000),
    ...
  )
}

# ==============================
# MEASUREMENT-ONLY (CFA) MODELS (OPTIONAL CHECKS)
# ==============================

# Measurement-only model (no regressions) for invariance testing.
# NOTE: SF items removed from QualEngag as requested.
model_mg_fast_vs_nonfast_meas <- '
# measurement (marker-variable identification)
Belong =~ 1*sbvalued + sbmyself + sbcommunity
Gains  =~ 1*pganalyze + pgthink + pgwork + pgvalues + pgprobsolve
SupportEnv =~ 1*SEacademic + SEwellness + SEnonacad + SEactivities + SEdiverse
Satisf =~ 1*sameinst + evalexp

# higher-order outcome
DevAdj =~ 1*Belong + Gains + SupportEnv + Satisf

# mediators
EmoDiss =~ 1*MHWdacad + MHWdlonely + MHWdmental + MHWdexhaust + MHWdsleep + MHWdfinancial
QualEngag =~ 1*QIadmin + QIstudent + QIadvisor + QIfaculty + QIstaff
'


# Helper: safe directory creation
.dir_create <- function(path) {
  if (!dir.exists(path)) dir.create(path, recursive = TRUE, showWarnings = FALSE)
}

# Helper: prepare grouping variable for invariance runs
# - Drops NA group values
# - Optionally drops or combines groups below a minimum n
prep_group_var_for_invariance <- function(dat, group_var, min_group_n = 50,
                                         handle_small = c("warn", "drop", "combine"),
                                         other_label = "Other") {
  handle_small <- match.arg(handle_small)

  if (!(group_var %in% names(dat))) {
    stop("group_var not found in data: ", group_var)
  }

  d <- dat
  # drop NA group values
  d <- d[!is.na(d[[group_var]]), , drop = FALSE]

  # coerce to character then factor for stable labeling
  d[[group_var]] <- as.character(d[[group_var]])

  gtab <- table(d[[group_var]], useNA = "no")
  small <- names(gtab)[gtab < min_group_n]

  if (length(small) > 0) {
    msg <- paste0("[invariance] ", group_var, ": groups with n < ", min_group_n, ": ", paste(small, collapse = ", "))
    if (handle_small == "warn") {
      message(msg)
    } else if (handle_small == "drop") {
      message(msg, " | action=drop")
      d <- d[!(d[[group_var]] %in% small), , drop = FALSE]
    } else if (handle_small == "combine") {
      message(msg, " | action=combine -> ", other_label)
      d[[group_var]][d[[group_var]] %in% small] <- other_label
    }
  }

  d[[group_var]] <- factor(d[[group_var]])
  d
}

# Helper: run invariance sequences for multiple W variables (RQ4)
fit_invariance_for_W_list <- function(dat, W_vars,
                                     base_out_dir = file.path("results", "fast_treat_control", "invariance"),
                                     estimator = "MLR",
                                     missing = "fiml",
                                     fixed.x = FALSE,
                                     weight_var = "psw",
                                     min_group_n = 50,
                                     handle_small = c("warn", "drop", "combine"),
                                     other_label = "Other",
                                     ...) {
  handle_small <- match.arg(handle_small)

  out <- list()
  for (w in W_vars) {
    out_dir_w <- file.path(base_out_dir, paste0("by_", w))
    out[[w]] <- fit_invariance_sequence_fast_vs_nonfast(
      dat = dat,
      group_var = w,
      out_dir = out_dir_w,
      estimator = estimator,
      missing = missing,
      fixed.x = fixed.x,
      weight_var = weight_var,
      min_group_n = min_group_n,
      handle_small = handle_small,
      other_label = other_label,
      ...
    )
  }
  invisible(out)
}

# Helper: write common text tables for any lavaan fit
write_lavaan_txt_tables <- function(fit, out_dir, prefix, boot_ci_type = NULL) {
  .dir_create(out_dir)

  # Fit measures (robust/scaled where available)
  fm <- lavaan::fitMeasures(
    fit,
    c(
      "npar", "df", "chisq", "pvalue",
      "cfi", "tli", "rmsea", "srmr",
      "cfi.scaled", "tli.scaled", "rmsea.scaled",
      "cfi.robust", "tli.robust", "rmsea.robust"
    )
  )

  utils::write.table(
    data.frame(measure = names(fm), value = as.numeric(fm), row.names = NULL),
    file = file.path(out_dir, paste0(prefix, "_fitMeasures.txt")),
    quote = FALSE,
    sep = "\t",
    row.names = FALSE
  )

  # Parameter estimates
  pe <- if (is.character(boot_ci_type) && length(boot_ci_type) == 1 && identical(boot_ci_type, "none")) {
    lavaan::parameterEstimates(
      fit,
      standardized = TRUE,
      ci = FALSE
    )
  } else if (is.null(boot_ci_type)) {
    lavaan::parameterEstimates(
      fit,
      standardized = TRUE,
      ci = TRUE
    )
  } else {
    lavaan::parameterEstimates(
      fit,
      standardized = TRUE,
      ci = TRUE,
      boot.ci.type = boot_ci_type
    )
  }
  utils::write.table(
    pe,
    file = file.path(out_dir, paste0(prefix, "_parameterEstimates.txt")),
    quote = FALSE,
    sep = "\t",
    row.names = FALSE
  )

  # Standardized solution (full)
  ss <- lavaan::standardizedSolution(fit)
  utils::write.table(
    ss,
    file = file.path(out_dir, paste0(prefix, "_standardizedSolution.txt")),
    quote = FALSE,
    sep = "\t",
    row.names = FALSE
  )

  # R-squared
  r2 <- tryCatch(lavaan::inspect(fit, "r2"), error = function(e) NULL)
  if (!is.null(r2)) {
    sink(file.path(out_dir, paste0(prefix, "_r2.txt")))
    print(r2)
    sink()
  }

  invisible(list(fitMeasures = fm, parameterEstimates = pe, standardizedSolution = ss, r2 = r2))
}

# Helper: export bootstrap-ready results for dissertation tables
write_bootstrap_results_csv <- function(fit, out_csv, boot_ci_type = NULL) {
  if (is.null(out_csv) || !is.character(out_csv) || length(out_csv) != 1 || !nzchar(out_csv)) {
    return(invisible(FALSE))
  }

  .dir_create(dirname(out_csv))

  pe <- tryCatch(
    {
      if (is.character(boot_ci_type) && length(boot_ci_type) == 1 && identical(boot_ci_type, "none")) {
        lavaan::parameterEstimates(fit, ci = FALSE, standardized = FALSE)
      } else if (is.null(boot_ci_type)) {
        lavaan::parameterEstimates(fit, ci = TRUE, standardized = FALSE)
      } else {
        lavaan::parameterEstimates(fit, ci = TRUE, standardized = FALSE, boot.ci.type = boot_ci_type)
      }
    },
    error = function(e) NULL
  )

  if (is.null(pe) || !is.data.frame(pe) || nrow(pe) == 0) {
    return(invisible(FALSE))
  }

  # Parameter naming convention expected by build_dissertation_tables.py:
  #  - labeled free parameters use `label`
  #  - defined parameters use `lhs` when op == ":="
  param <- rep(NA_character_, nrow(pe))
  is_def <- !is.na(pe$op) & pe$op == ":="
  param[is_def] <- as.character(pe$lhs[is_def])
  if ("label" %in% names(pe)) {
    has_label <- !is.na(pe$label) & nzchar(pe$label)
    param[!is_def & has_label] <- as.character(pe$label[!is_def & has_label])
  }

  out <- data.frame(
    parameter = param,
    est = if ("est" %in% names(pe)) pe$est else NA_real_,
    boot_se = if ("se" %in% names(pe)) pe$se else NA_real_,
    ci_lower = if ("ci.lower" %in% names(pe)) pe$ci.lower else NA_real_,
    ci_upper = if ("ci.upper" %in% names(pe)) pe$ci.upper else NA_real_,
    stringsAsFactors = FALSE
  )

  out <- out[!is.na(out$parameter) & nzchar(out$parameter), , drop = FALSE]
  out <- out[!duplicated(out$parameter), , drop = FALSE]

  if (nrow(out) == 0) {
    return(invisible(FALSE))
  }

  out$sig <- with(
    out,
    (!is.na(ci_lower) & !is.na(ci_upper)) &
      ((ci_lower > 0 & ci_upper > 0) | (ci_lower < 0 & ci_upper < 0))
  )

  utils::write.csv(out, file = out_csv, row.names = FALSE, na = "NA")
  invisible(TRUE)
}

# Helper: compute fit-change criteria between two models
fit_change <- function(fit_prev, fit_next) {
  pick <- function(f, key_fallback, key_pref) {
    fm <- lavaan::fitMeasures(f)
    if (!is.null(fm[[key_pref]]) && !is.na(fm[[key_pref]])) return(as.numeric(fm[[key_pref]]))
    if (!is.null(fm[[key_fallback]]) && !is.na(fm[[key_fallback]])) return(as.numeric(fm[[key_fallback]]))
    NA_real_
  }

  cfi_prev <- pick(fit_prev, "cfi", "cfi.scaled")
  cfi_next <- pick(fit_next, "cfi", "cfi.scaled")

  rmsea_prev <- pick(fit_prev, "rmsea", "rmsea.scaled")
  rmsea_next <- pick(fit_next, "rmsea", "rmsea.scaled")

  srmr_prev <- pick(fit_prev, "srmr", "srmr")
  srmr_next <- pick(fit_next, "srmr", "srmr")

  data.frame(
    delta_cfi = cfi_next - cfi_prev,
    delta_rmsea = rmsea_next - rmsea_prev,
    delta_srmr = srmr_next - srmr_prev
  )
}

# ==============================
# INVARIANCE FITTERS
# ==============================

# (1) Measurement-only baseline (configural) and subsequent invariance models.
# Runs in the SAME weighted analysis sample as the MG structural model by default (weight_var = "psw").
#
# Models:
#   - configural: same pattern, all free
#   - metric_1st: equal first-order item loadings, higher-order loadings free
#   - metric_2nd: equal first- and second-order loadings
#   - scalar: equal loadings + intercepts
#
# Fit-change criteria: ΔCFI, ΔRMSEA, ΔSRMR (Chen, 2007 heuristics: |ΔCFI| ≤ .01, ΔRMSEA ≤ .015; SRMR as supporting signal)
fit_invariance_sequence_fast_vs_nonfast <- function(
  dat,
  group_var = "x_FASt",
  out_dir = NULL,
  estimator = "MLR",
  missing = "fiml",
  fixed.x = FALSE,
  weight_var = "psw",
  min_group_n = 50,
  handle_small = c("warn", "drop", "combine"),
  other_label = "Other",
  ...
) {
  if (is.null(out_dir)) {
    out_dir <- file.path("results", "fast_treat_control", "invariance", paste0("by_", group_var))
  }

  handle_small <- match.arg(handle_small)

  # Prepare grouped data (drop NA; optionally drop/combine small groups)
  dat_g <- prep_group_var_for_invariance(
    dat = dat,
    group_var = group_var,
    min_group_n = min_group_n,
    handle_small = handle_small,
    other_label = other_label
  )

  .dir_create(out_dir)

  # Write group counts used in the invariance run
  gtab <- table(dat_g[[group_var]], useNA = "no")
  utils::write.table(
    data.frame(level = names(gtab), n = as.integer(gtab), row.names = NULL),
    file = file.path(out_dir, "group_counts_used.txt"),
    quote = FALSE,
    sep = "\t",
    row.names = FALSE
  )

  wts <- if (!is.null(weight_var) && weight_var %in% names(dat_g)) weight_var else NULL

  # (1) Configural
  fit_config <- lavaan::cfa(
    model = model_mg_fast_vs_nonfast_meas,
    data = dat_g,
    group = group_var,
    estimator = estimator,
    missing = missing,
    fixed.x = fixed.x,
    sampling.weights = wts,
    check.lv.names = FALSE,
    ...
  )
  write_lavaan_txt_tables(fit_config, out_dir, "meas_configural")

  # (2) Metric invariance: first-order item loadings equal; higher-order (DevAdj =~ factors) left free.
  fit_metric_1st <- lavaan::cfa(
    model = model_mg_fast_vs_nonfast_meas,
    data = dat_g,
    group = group_var,
    estimator = estimator,
    missing = missing,
    fixed.x = fixed.x,
    sampling.weights = wts,
    check.lv.names = FALSE,
    group.equal = c("loadings"),
    group.partial = c(
      "DevAdj=~belong",
      "DevAdj=~gains",
      "DevAdj=~SuppEnv",
      "DevAdj=~Satisf"
    ),
    ...
  )
  write_lavaan_txt_tables(fit_metric_1st, out_dir, "meas_metric_firstorder")

  # (3) Metric invariance: constrain BOTH first- and second-order loadings
  fit_metric_2nd <- lavaan::cfa(
    model = model_mg_fast_vs_nonfast_meas,
    data = dat_g,
    group = group_var,
    estimator = estimator,
    missing = missing,
    fixed.x = fixed.x,
    sampling.weights = wts,
    check.lv.names = FALSE,
    group.equal = c("loadings"),
    ...
  )
  write_lavaan_txt_tables(fit_metric_2nd, out_dir, "meas_metric_secondorder")

  # (4) Scalar invariance: loadings + intercepts (for continuous indicators under ML/MLR)
  fit_scalar <- lavaan::cfa(
    model = model_mg_fast_vs_nonfast_meas,
    data = dat_g,
    group = group_var,
    estimator = estimator,
    missing = missing,
    fixed.x = fixed.x,
    sampling.weights = wts,
    check.lv.names = FALSE,
    group.equal = c("loadings", "intercepts"),
    ...
  )
  write_lavaan_txt_tables(fit_scalar, out_dir, "meas_scalar")

  # Fit-change tables
  d12 <- fit_change(fit_config, fit_metric_1st)
  d23 <- fit_change(fit_metric_1st, fit_metric_2nd)
  d34 <- fit_change(fit_metric_2nd, fit_scalar)

  deltas <- rbind(
    data.frame(step = "configural_to_metric_firstorder", d12),
    data.frame(step = "metric_firstorder_to_metric_secondorder", d23),
    data.frame(step = "metric_secondorder_to_scalar", d34)
  )

  utils::write.table(
    deltas,
    file = file.path(out_dir, "fit_change_deltas.txt"),
    quote = FALSE,
    sep = "\t",
    row.names = FALSE
  )

  # Also write a compact summary of key fit indices for all steps
  grab_key_fit <- function(fit, name) {
    fm <- lavaan::fitMeasures(
      fit,
      c(
        "df", "chisq", "pvalue",
        "cfi", "tli", "rmsea", "srmr",
        "cfi.scaled", "tli.scaled", "rmsea.scaled",
        "cfi.robust", "tli.robust", "rmsea.robust"
      )
    )
    data.frame(model = name, measure = names(fm), value = as.numeric(fm), row.names = NULL)
  }

  fit_stack <- rbind(
    grab_key_fit(fit_config, "configural"),
    grab_key_fit(fit_metric_1st, "metric_firstorder"),
    grab_key_fit(fit_metric_2nd, "metric_secondorder"),
    grab_key_fit(fit_scalar, "scalar")
  )

  utils::write.table(
    fit_stack,
    file = file.path(out_dir, "fit_index_stack.txt"),
    quote = FALSE,
    sep = "\t",
    row.names = FALSE
  )

  invisible(list(
    configural = fit_config,
    metric_firstorder = fit_metric_1st,
    metric_secondorder = fit_metric_2nd,
    scalar = fit_scalar,
    deltas = deltas
  ))
}

# ==============================
# WALD TESTS (STRUCTURAL MODEL): TREATMENT + MODERATION TERMS
# ==============================

# Runs Wald tests on core structural paths and key indirect/total effects.
# Writes text outputs to out_dir.
run_wald_tests_fast_vs_nonfast <- function(
  fit_struct,
  out_dir = file.path("results", "fast_treat_control", "wald"),
  prefix = "wald"
) {
  .dir_create(out_dir)

  # These Wald constraints are defined for the single-group (pooled) model where
  # core structural paths have simple labels (e.g., a1, c, cz).
  # In multi-group-by-W models, labels are intentionally W-prefixed and group-indexed
  # (e.g., re_all__a1_g1), so the pooled constraints would error.
  ng <- try(lavaan::lavInspect(fit_struct, "ngroups"), silent = TRUE)
  if (!inherits(ng, "try-error") && is.numeric(ng) && ng > 1) {
    writeLines(
      c(
        "Wald tests skipped.",
        "Reason: fit has >1 group; pooled-label constraints (a1, c, cz, ...) are not applicable.",
        "If needed, implement W-specific/group-specific constraints using the W-prefixed labels (e.g., <W>__a1_g1)."
      ),
      con = file.path(out_dir, paste0(prefix, "_SKIPPED.txt"))
    )
    return(invisible(NULL))
  }

  pe <- try(lavaan::parameterEstimates(fit_struct), silent = TRUE)
  if (inherits(pe, "try-error")) {
    writeLines(
      c(
        "Wald tests skipped.",
        "Reason: could not retrieve parameter estimates from fit."
      ),
      con = file.path(out_dir, paste0(prefix, "_SKIPPED.txt"))
    )
    return(invisible(NULL))
  }

  param_labels <- unique(pe$label[!is.na(pe$label) & nzchar(pe$label)])
  def_names <- unique(pe$lhs[pe$op == ":=" & !is.na(pe$lhs) & nzchar(pe$lhs)])
  has_label <- function(x) x %in% param_labels
  has_def <- function(x) x %in% def_names

  # Linear tests: treatment effect and moderation terms
  constraints_linear <- character(0)
  if (has_label("c_total") && !has_label("c")) {
    constraints_linear <- c(constraints_linear, "c_total == 0")
  } else {
    if (has_label("c")) constraints_linear <- c(constraints_linear, "c == 0")
    if (has_label("cz")) constraints_linear <- c(constraints_linear, "cz == 0")
    if (has_label("a1")) constraints_linear <- c(constraints_linear, "a1 == 0")
    if (has_label("a1z")) constraints_linear <- c(constraints_linear, "a1z == 0")
    if (has_label("a2")) constraints_linear <- c(constraints_linear, "a2 == 0")
    if (has_label("a2z")) constraints_linear <- c(constraints_linear, "a2z == 0")
    if (has_label("b1")) constraints_linear <- c(constraints_linear, "b1 == 0")
    if (has_label("b2")) constraints_linear <- c(constraints_linear, "b2 == 0")
    if (has_label("d")) constraints_linear <- c(constraints_linear, "d == 0")
  }

  # Nonlinear tests: do conditional indirect/total effects differ between high vs low Z?
  constraints_nonlinear <- character(0)
  if (has_def("ind_EmoDiss_z_high") && has_def("ind_EmoDiss_z_low")) {
    constraints_nonlinear <- c(constraints_nonlinear, "ind_EmoDiss_z_high == ind_EmoDiss_z_low")
  }
  if (has_def("ind_QualEngag_z_high") && has_def("ind_QualEngag_z_low")) {
    constraints_nonlinear <- c(constraints_nonlinear, "ind_QualEngag_z_high == ind_QualEngag_z_low")
  }
  if (has_def("ind_serial_z_high") && has_def("ind_serial_z_low")) {
    constraints_nonlinear <- c(constraints_nonlinear, "ind_serial_z_high == ind_serial_z_low")
  }
  if (has_def("total_z_high") && has_def("total_z_low")) {
    constraints_nonlinear <- c(constraints_nonlinear, "total_z_high == total_z_low")
  }

  w_linear <- if (length(constraints_linear) > 0) {
    lavaan::lavTestWald(fit_struct, constraints = constraints_linear)
  } else {
    NULL
  }
  w_nlin <- if (length(constraints_nonlinear) > 0) {
    lavaan::lavTestWald(fit_struct, constraints = constraints_nonlinear)
  } else {
    NULL
  }

  sink(file.path(out_dir, paste0(prefix, "_linear.txt")))
  cat("Wald tests: linear constraints (treatment and moderation terms)\n")
  if (is.null(w_linear)) {
    cat("(none applicable for this model)\n")
  } else {
    print(w_linear)
  }
  sink()

  sink(file.path(out_dir, paste0(prefix, "_nonlinear.txt")))
  cat("Wald tests: nonlinear constraints (conditional indirect/total differences: high vs low Z)\n")
  if (is.null(w_nlin)) {
    cat("(none applicable for this model)\n")
  } else {
    print(w_nlin)
  }
  sink()

  invisible(list(linear = w_linear, nonlinear = w_nlin))
}

# Convenience: fit the MG structural model AND write text tables + Wald tests
fit_mg_fast_vs_nonfast_with_outputs <- function(
  dat,
  group = NULL,
  w_label = NULL,
  model_type = c("parallel", "serial", "total"),
  out_dir = file.path("results", "fast_treat_control", "structural"),
  bootstrap_results_out = NULL,
  estimator = "ML",
  missing = "fiml",
  fixed.x = TRUE,
  weight_var = "psw",
  bootstrap = 2000,
  boot_ci_type = "bca.simple",
  z_vals = NULL,
  ...
) {
  model_type <- match.arg(model_type)
  .dir_create(out_dir)
  if (!is.null(group)) {
    writeLines(paste0("group = ", group), con = file.path(out_dir, "group_var.txt"))
  }

  # Build observed interaction term if needed: XZ_c = x_FASt * credit_dose_c
  if (!("XZ_c" %in% names(dat))) {
    dat$XZ_c <- dat$x_FASt * dat$credit_dose_c
  }

  se_arg <- if (!is.null(bootstrap) && is.numeric(bootstrap) && bootstrap > 0) "bootstrap" else "standard"
  boot_arg <- if (!is.null(bootstrap) && is.numeric(bootstrap) && bootstrap > 0) bootstrap else NULL

  fit <- fit_mg_fast_vs_nonfast(
    dat = dat,
    group = group,
    w_label = w_label,
    model_type = model_type,
    estimator = estimator,
    missing = missing,
    fixed.x = fixed.x,
    weight_var = weight_var,
    bootstrap = boot_arg,
    se = se_arg,
    z_vals = z_vals,
    ...
  )

  # Main text tables
  write_lavaan_txt_tables(fit, out_dir, "structural", boot_ci_type = boot_ci_type)

  # Bootstrap-ready summary for Dissertation_Tables.docx
  write_bootstrap_results_csv(fit, bootstrap_results_out, boot_ci_type = boot_ci_type)

  # Wald tests
  run_wald_tests_fast_vs_nonfast(fit, out_dir = file.path(out_dir, "wald"), prefix = "wald")

  invisible(fit)
}
