
# ==============================
# OFFICIAL (TREATMENT/CONTROL) SEM
# X = DE exposure (x_DE), Z = credit_dose_c, moderator = XZ
# ==============================

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
"# measurement (marker-variable identification)\n",
"belong =~ 1*sbvalued + sbmyself + sbcommunity\n",
"gains  =~ 1*pganalyze + pgthink + pgwork + pgvalues + pgprobsolve\n",
"SuppEnv =~ 1*SEacademic + SEwellness + SEnonacad + SEactivities + SEdiverse\n",
"Satisf =~ 1*sameinst + evalexp\n",
"DevAdj =~ 1*belong + gains + SuppEnv + Satisf\n\n",
"# mediators (names must match the variable table)\n",
"EmoDiss =~ 1*MHWdacad + MHWdlonely + MHWdmental + MHWdexhaust + MHWdsleep + MHWdfinancial\n",
"# NOTE: SF items removed from QualEngag measurement as requested\n",
"QualEngag =~ 1*QIadmin + QIstudent + QIadvisor + QIfaculty + QIstaff\n\n",
"# structural (treatment/control + moderation)\n",
"# Naming: *_c = main effect of credit_dose_c (Z); *_z = interaction effect with XZ\n",
"# X = x_DE (0/1), Z = credit_dose_c (centered), XZ = x_DE*credit_dose_c\n",
"EmoDiss ~ a1*x_DE + a1c*credit_dose_c + a1z*XZ + g1*cohort +\n",
"     hgrades_c + bparented_c + pell + hapcl + hprecalc13 + hchallenge_c + cSFcareer_c\n\n",
"QualEngag ~ a2*x_DE + a2c*credit_dose_c + a2z*XZ + g2*cohort +\n",
"     hgrades_c + bparented_c + pell + hapcl + hprecalc13 + hchallenge_c + cSFcareer_c\n\n",
"DevAdj ~ c*x_DE + cc*credit_dose_c + cz*XZ + b1*EmoDiss + b2*QualEngag + g3*cohort +\n",
"         hgrades_c + bparented_c + pell + hapcl + hprecalc13 + hchallenge_c + cSFcareer_c\n\n",
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
"# measurement (marker-variable identification)\n",
"belong =~ 1*sbvalued + sbmyself + sbcommunity\n",
"gains  =~ 1*pganalyze + pgthink + pgwork + pgvalues + pgprobsolve\n",
"SuppEnv =~ 1*SEacademic + SEwellness + SEnonacad + SEactivities + SEdiverse\n",
"Satisf =~ 1*sameinst + evalexp\n",
"DevAdj =~ 1*belong + gains + SuppEnv + Satisf\n\n",
"# mediators (names must match the variable table)\n",
"EmoDiss =~ 1*MHWdacad + MHWdlonely + MHWdmental + MHWdexhaust + MHWdsleep + MHWdfinancial\n",
"# NOTE: SF items removed from QualEngag measurement as requested\n",
"QualEngag =~ 1*QIadmin + QIstudent + QIadvisor + QIfaculty + QIstaff\n\n",
"# structural (treatment/control + moderation)\n",
"# Naming: *_c = main effect of credit_dose_c (Z); *_z = interaction effect with XZ\n",
"# X = x_DE (0/1), Z = credit_dose_c (centered), XZ = x_DE*credit_dose_c\n",
"EmoDiss ~ a1*x_DE + a1c*credit_dose_c + a1z*XZ + g1*cohort +\n",
"     hgrades_c + bparented_c + pell + hapcl + hprecalc13 + hchallenge_c + cSFcareer_c\n\n",
"QualEngag ~ a2*x_DE + a2c*credit_dose_c + a2z*XZ + d*EmoDiss + g2*cohort +\n",
"     hgrades_c + bparented_c + pell + hapcl + hprecalc13 + hchallenge_c + cSFcareer_c\n\n",
"DevAdj ~ c*x_DE + cc*credit_dose_c + cz*XZ + b1*EmoDiss + b2*QualEngag + g3*cohort +\n",
"         hgrades_c + bparented_c + pell + hapcl + hprecalc13 + hchallenge_c + cSFcareer_c\n\n",
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
"# measurement (marker-variable identification)\n",
"belong =~ 1*sbvalued + sbmyself + sbcommunity\n",
"gains  =~ 1*pganalyze + pgthink + pgwork + pgvalues + pgprobsolve\n",
"SuppEnv =~ 1*SEacademic + SEwellness + SEnonacad + SEactivities + SEdiverse\n",
"Satisf =~ 1*sameinst + evalexp\n",
"DevAdj =~ 1*belong + gains + SuppEnv + Satisf\n\n",
"# total effect (Eq. 1)\n",
"DevAdj ~ c_total*x_DE\n"
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

  paste0(
    "# measurement (marker-variable identification)\n",
    "belong =~ 1*sbvalued + sbmyself + sbcommunity\n",
    "gains  =~ 1*pganalyze + pgthink + pgwork + pgvalues + pgprobsolve\n",
    "SuppEnv =~ 1*SEacademic + SEwellness + SEnonacad + SEactivities + SEdiverse\n",
    "Satisf =~ 1*sameinst + evalexp\n",
    "DevAdj =~ 1*belong + gains + SuppEnv + Satisf\n\n",
    "# mediators (names must match the variable table)\n",
    "EmoDiss =~ 1*MHWdacad + MHWdlonely + MHWdmental + MHWdexhaust + MHWdsleep + MHWdfinancial\n",
    "# NOTE: SF items removed from QualEngag measurement as requested\n",
    "QualEngag =~ 1*QIadmin + QIstudent + QIadvisor + QIfaculty + QIstaff\n\n",
    "# structural (multi-group by W with group-varying paths)\n",
    "EmoDiss ~ ", a1, "*x_DE + ", a1c, "*credit_dose_c + ", a1z, "*XZ + ", g1p, "*cohort +\n",
    "     hgrades_c + bparented_c + pell + hapcl + hprecalc13 + hchallenge_c + cSFcareer_c\n\n",
    "QualEngag ~ ", a2, "*x_DE + ", a2c, "*credit_dose_c + ", a2z, "*XZ + ", g2p, "*cohort +\n",
    "     hgrades_c + bparented_c + pell + hapcl + hprecalc13 + hchallenge_c + cSFcareer_c\n\n",
    "DevAdj ~ ", c0, "*x_DE + ", cc, "*credit_dose_c + ", cz, "*XZ + ", b1, "*EmoDiss + ", b2, "*QualEngag + ", g3p, "*cohort +\n",
    "         hgrades_c + bparented_c + pell + hapcl + hprecalc13 + hchallenge_c + cSFcareer_c\n\n",
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
                                  estimator = "MLR",
                                  missing = "fiml",
                                  fixed.x = FALSE,
                                  weight_var = "psw",
                                  bootstrap = NULL,
                                  se = NULL,
                                  z_vals = NULL,
                                  ...) {
  model_type <- match.arg(model_type)
  wts <- if (!is.null(weight_var) && weight_var %in% names(dat)) weight_var else NULL

  # Build observed interaction term if needed: XZ = x_FASt * credit_dose_c
  if (!("XZ" %in% names(dat))) {
    dat$XZ <- dat$x_DE * dat$credit_dose_c
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
belong =~ 1*sbvalued + sbmyself + sbcommunity
gains  =~ 1*pganalyze + pgthink + pgwork + pgvalues + pgprobsolve
SuppEnv =~ 1*SEacademic + SEwellness + SEnonacad + SEactivities + SEdiverse
Satisf =~ 1*sameinst + evalexp

# higher-order outcome
DevAdj =~ 1*belong + gains + SuppEnv + Satisf

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
  estimator = "MLR",
  missing = "fiml",
  fixed.x = FALSE,
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

  wts <- if (!is.null(weight_var) && weight_var %in% names(dat)) weight_var else NULL

  # Build observed interaction term if needed: XZ = x_FASt * credit_dose_c
  if (!("XZ" %in% names(dat))) {
    dat$XZ <- dat$x_DE * dat$credit_dose_c
  }

  # Bootstrap SEs in lavaan are computed under ML; switch from MLR to ML when bootstrapping.
  if (!is.null(bootstrap) && is.numeric(bootstrap) && bootstrap > 0 && !identical(estimator, "ML")) {
    message("[fast_treat_control] bootstrap requested: switching estimator from ", estimator, " to ML for bootstrap inference")
    estimator <- "ML"
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

  # Wald tests
  run_wald_tests_fast_vs_nonfast(fit, out_dir = file.path(out_dir, "wald"), prefix = "wald")

  invisible(fit)
}
