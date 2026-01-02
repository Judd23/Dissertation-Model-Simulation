#!/usr/bin/env Rscript
# ══════════════════════════════════════════════════════════════════════════════
#                    PROCESS-SEM VARIABLE DICTIONARY GENERATOR
# ══════════════════════════════════════════════════════════════════════════════
# Generates a comprehensive data dictionary for the Process-SEM dissertation
# analysis examining psychosocial effects of accelerated dual credit (FASt) 
# on first-year developmental adjustment.
#
# Model: Hayes PROCESS Model 59 — First-Stage Moderated Parallel Mediation
#        X → M1 → Y    and    X → M2 → Y    with Z moderating X→M1 and X→M2
#
# Variables:
#   X (Treatment)   : x_FASt (0/1 — ≥12 transferable credits at matriculation)
#   Z (Moderator)   : credit_dose_c (mean-centered credit dose)
#   M1 (Mediator 1) : EmoDiss (Emotional Distress, latent)
#   M2 (Mediator 2) : QualEngag (Quality of Engagement, latent)
#   Y (Outcome)     : DevAdj (Developmental Adjustment, 2nd-order latent)
#
# Output Files:
#   - results/tables/variable_table.csv   (plain text)
#   - results/tables/variable_table.xlsx  (formatted Excel with section borders)
#
# Column Definitions:
#   variable      : R object name in rep_data.csv
#   label         : Descriptive label with survey item reference
#   role          : Conceptual role in analysis (Treatment, Mediator, etc.)
#   estimation    : lavaan estimation method (DWLS/ML/N/A)
#   sem_role      : SEM role (Exogenous, Endogenous, Indicator, N/A)
#   model_num     : Hayes PROCESS models where variable appears (1,4,6,7,59,MG,--)
#   scale         : Measurement scale (Nominal, Ordinal, Interval, Ratio)
#   scale_points  : Number of response categories (NA for continuous)
#   construct     : Parent latent construct (for indicators)
#   equation      : lavaan syntax or computational formula
#   levels        : Response categories or value range
#   source        : Data source (BCSSE, NSSE, MHW Module, Institutional, Computed)
#   notes         : Additional details, survey question numbers
#   used_in_model : Whether included in SEM (Yes/Computed/--)
#
# Author: Jay Johnson, Ed.D. Candidate
# Last Updated: 2026-01-01
# ══════════════════════════════════════════════════════════════════════════════

out_path <- file.path("results", "tables", "variable_table.csv")
dir.create(dirname(out_path), recursive = TRUE, showWarnings = FALSE)

rows <- list()
add_row <- function(variable,
                    label,
                    role,
                    estimation,
                    sem_role,
                    scale = NA,
                    scale_points = NA,
                    construct = NA,
                    equation = NA,
                    levels = NA,
                    source = NA,
                    notes = NA,
                    model_num = "--",
                    used_in_model = "Yes") {
  rows[[length(rows) + 1L]] <<- data.frame(
    variable = variable,
    label = label,
    role = role,
    estimation = estimation,
    sem_role = sem_role,
    scale = scale,
    scale_points = scale_points,
    construct = construct,
    equation = equation,
    levels = levels,
    source = source,
    notes = notes,
    model_num = model_num,
    used_in_model = used_in_model,
    stringsAsFactors = FALSE
  )
}

# Helper function to add section header row
add_section <- function(section_name) {
  rows[[length(rows) + 1L]] <<- data.frame(
    variable = section_name, label = "", role = "", estimation = "", 
    sem_role = "", scale = "", scale_points = "", construct = "", 
    equation = "", levels = "", source = "", notes = "", 
    model_num = "", used_in_model = "", stringsAsFactors = FALSE
  )
}

# ============================================================================
# SECTION 1: TREATMENT AND DOSE VARIABLES (Two-Stage DC Categorization)
# ============================================================================
add_section("TREATMENT & DOSE (Two-Stage DC Categorization)")
# Stage 1: hdc17 (BCSSE) → DC_student (binary)
# Stage 2: trnsfr_cr → x_FASt, credit_dose → credit_dose_c → XZ_c
# ----------------------------------------------------------------------------

# --- Stage 1: Dual Credit Identification ---
add_row("hdc17", "Dual Credit Courses in HS [hdc17]", "Source Variable", "ML (continuous)", "Exogenous",
        scale = "Ordinal", scale_points = 7,
        levels = "1=None | 2=1-2 | 3=3-4 | 4=5-6 | 5=7-8 | 6=9-10 | 7=11+",
        source = "BCSSE",
        notes = "hdc17: How many college courses for credit did you complete in HS?")

add_row("DC_student", "                Dual Credit Student [DC vs No_DC]", "Sample Definition", "ML (continuous)", "Exogenous",
        scale = "Nominal", scale_points = 2, 
        levels = "0=No_DC (hdc17=1) | 1=DC (hdc17≥2)",
        equation = "DC_student = 1(hdc17 >= 2)",
        source = "Computed", 
        notes = "n=1,717 No_DC | n=3,283 DC")

# --- Stage 2: Treatment Assignment ---
add_row("trnsfr_cr", "Transfer Credits at Entry [trnsfr_cr]", "Source Variable", "ML (continuous)", "Exogenous",
        scale = "Ratio", scale_points = NA,
        levels = "0-120+ (credit count)",
        source = "BCSSE",
        notes = "ttrnsfr_cr: About how many credits do you expect to transfer?")

add_row("x_FASt", "                FASt Status (Treatment X) [FASt vs non-FASt]", "Treatment (X)", "ML (continuous)", "Exogenous",
        scale = "Nominal", scale_points = 2, 
        levels = "0=non-FASt (0-11 credits) | 1=FASt (≥12 credits)",
        equation = "x_FASt = I(trnsfr_cr ≥ 12); paths: a1→M1, a2→M2, c'→Y",
        source = "Computed",
        notes = "n=3,642 non-FASt (No_Cred+Lite_DC) | n=1,358 FASt",
        model_num = "1, 4, 6, 7, 59")

add_row("credit_dose", "                Credit Dose (Moderator Z)", "Moderator (Z)", "ML (continuous)", "Exogenous",
        scale = "Ratio", scale_points = NA,
        levels = "0+ (in 10-credit units above threshold)",
        equation = "credit_dose = pmax(0, trnsfr_cr - 12)/10",
        source = "Computed",
        notes = "Units in 10-credit increments above 12; Z=0 for all non-FASt",
        model_num = "1, 7, 59")

add_row("credit_dose_c", "                        Credit Dose (Centered)", "Moderator (Z)", "ML (continuous)", "Exogenous",
        scale = "Interval", scale_points = NA,
        levels = "Continuous (mean-centered)",
        equation = "credit_dose_c = credit_dose − M̄; moderates a1, a2 paths",
        source = "Computed",
        notes = "Mean-centered; used in XZ_c interaction term",
        model_num = "1, 7, 59")

add_row("XZ_c", "                                Treatment x Dose Interaction", "Interaction", "ML (continuous)", "Exogenous",
        scale = "Interval", scale_points = NA,
        levels = "Continuous (product term)",
        equation = "XZ_c = X × Z_c; paths: a1z→M1, a2z→M2",
        source = "Computed",
        notes = "First-stage moderation; a1z, a2z test dose-dependent mediation",
        model_num = "1, 7, 59")

# ============================================================================
# SECTION 2: OUTCOME - DEVELOPMENTAL ADJUSTMENT (DevAdj, 2nd-order latent)
# ============================================================================
add_section("OUTCOME: Developmental Adjustment (Y)")
add_row(NA, "Developmental Adjustment", "Outcome (Y)", "ML (latent)", "Endogenous",
        construct = "DevAdj",
        levels = "Latent (free variance)",
        equation = "DevAdj =~ 1*Belong + λ*Gains + λ*SupportEnv + λ*Satisf; DevAdj ~ c'*X + b1*M1 + b2*M2",
        source = "NSSE",
        notes = "2nd-order: Belong=marker; Gains/SupportEnv/Satisf loadings free",
        model_num = "1, 4, 6, 7, 59")

# --- Belonging (first-order) ---
add_row(NA, "Belonging", "1st-Order Latent", "ML (latent)", "Endogenous",
        construct = "Belong",
        levels = "Latent (Var=1 via std.lv)",
        equation = "Belong =~ sbvalued + sbmyself + sbcommunity; DevAdj =~ 1*Belong",
        source = "NSSE",
        notes = "1st-order: std.lv ID (all loadings free); 2nd-order: MARKER (λ=1)",
        model_num = "1, 4, 6, 7, 59")

add_row("sbvalued", "                I feel valued by this institution [SBvalued]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 4, construct = "Belong",
        equation = "λ freely estimated",
        levels = "1=Strongly disagree | 2=Disagree | 3=Agree | 4=Strongly agree",
        source = "NSSE", notes = "Q15b",
        model_num = "1, 4, 6, 7, 59")

add_row("sbmyself", "                I feel comfortable being myself [SBmyself]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 4, construct = "Belong",
        equation = "λ freely estimated",
        levels = "1=Strongly disagree | 2=Disagree | 3=Agree | 4=Strongly agree",
        source = "NSSE", notes = "Q15a",
        model_num = "1, 4, 6, 7, 59")

add_row("sbcommunity", "                I feel like part of the community [SBcommunity]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 4, construct = "Belong",
        equation = "λ freely estimated",
        levels = "1=Strongly disagree | 2=Disagree | 3=Agree | 4=Strongly agree",
        source = "NSSE", notes = "Q15c",
        model_num = "1, 4, 6, 7, 59")

# --- Perceived Gains (first-order) ---
add_row(NA, "Perceived Gains", "1st-Order Latent", "ML (latent)", "Endogenous",
        construct = "Gains",
        levels = "Latent (Var=1 via std.lv)",
        equation = "Gains =~ pganalyze + pgthink + pgwork + pgvalues + pgprobsolve; DevAdj =~ λ*Gains",
        source = "NSSE",
        notes = "1st-order: std.lv ID (all loadings free); 2nd-order: λ free",
        model_num = "1, 4, 6, 7, 59")

add_row("pganalyze", "                Analyzing numerical and statistical information [pganalyze]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 4, construct = "Gains",
        equation = "λ freely estimated",
        levels = "1=Very little | 2=Some | 3=Quite a bit | 4=Very much",
        source = "NSSE", notes = "Q18d",
        model_num = "1, 4, 6, 7, 59")

add_row("pgthink", "                Thinking critically and analytically [pgthink]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 4, construct = "Gains",
        equation = "λ freely estimated",
        levels = "1=Very little | 2=Some | 3=Quite a bit | 4=Very much",
        source = "NSSE", notes = "Q18c",
        model_num = "1, 4, 6, 7, 59")

add_row("pgwork", "                Acquiring job- or work-related knowledge [pgwork]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 4, construct = "Gains",
        equation = "λ freely estimated",
        levels = "1=Very little | 2=Some | 3=Quite a bit | 4=Very much",
        source = "NSSE", notes = "Q18e",
        model_num = "1, 4, 6, 7, 59")

add_row("pgvalues", "                Developing or clarifying personal code of values [pgvalues]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 4, construct = "Gains",
        equation = "λ freely estimated",
        levels = "1=Very little | 2=Some | 3=Quite a bit | 4=Very much",
        source = "NSSE", notes = "Q18g",
        model_num = "1, 4, 6, 7, 59")

add_row("pgprobsolve", "                Solving complex real-world problems [pgprobsolve]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 4, construct = "Gains",
        equation = "λ freely estimated",
        levels = "1=Very little | 2=Some | 3=Quite a bit | 4=Very much",
        source = "NSSE", notes = "Q18i",
        model_num = "1, 4, 6, 7, 59")

# --- Supportive Environment (first-order) ---
add_row(NA, "Supportive Environment", "1st-Order Latent", "ML (latent)", "Endogenous",
        construct = "SupportEnv",
        levels = "Latent (Var=1 via std.lv)",
        equation = "SupportEnv =~ SEacademic + SEwellness + SEnonacad + SEactivities + SEdiverse; DevAdj =~ λ*SupportEnv",
        source = "NSSE",
        notes = "1st-order: std.lv ID (all loadings free); 2nd-order: λ free",
        model_num = "1, 4, 6, 7, 59")

add_row("SEacademic", "                Providing support to help students succeed academically [SEacademic]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 4, construct = "SupportEnv",
        equation = "λ freely estimated",
        levels = "1=Very little | 2=Some | 3=Quite a bit | 4=Very much",
        source = "NSSE", notes = "Q14b",
        model_num = "1, 4, 6, 7, 59")

add_row("SEwellness", "                Providing support for overall well-being [SEwellness]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 4, construct = "SupportEnv",
        equation = "λ freely estimated",
        levels = "1=Very little | 2=Some | 3=Quite a bit | 4=Very much",
        source = "NSSE", notes = "Q14f",
        model_num = "1, 4, 6, 7, 59")

add_row("SEnonacad", "                Helping manage non-academic responsibilities [SEnonacad]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 4, construct = "SupportEnv",
        equation = "λ freely estimated",
        levels = "1=Very little | 2=Some | 3=Quite a bit | 4=Very much",
        source = "NSSE", notes = "Q14g",
        model_num = "1, 4, 6, 7, 59")

add_row("SEactivities", "                Attending campus activities and events [SEactivities]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 4, construct = "SupportEnv",
        equation = "λ freely estimated",
        levels = "1=Very little | 2=Some | 3=Quite a bit | 4=Very much",
        source = "NSSE", notes = "Q14h",
        model_num = "1, 4, 6, 7, 59")

add_row("SEdiverse", "                Encouraging contact among students from different backgrounds [SEdiverse]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 4, construct = "SupportEnv",
        equation = "λ freely estimated",
        levels = "1=Very little | 2=Some | 3=Quite a bit | 4=Very much",
        source = "NSSE", notes = "Q14d",
        model_num = "1, 4, 6, 7, 59")

# --- Satisfaction (first-order) ---
add_row(NA, "Satisfaction", "1st-Order Latent", "ML (latent)", "Endogenous",
        construct = "Satisf",
        levels = "Latent (Var=1 via std.lv)",
        equation = "Satisf =~ sameinst + evalexp; DevAdj =~ λ*Satisf",
        source = "NSSE",
        notes = "1st-order: std.lv ID (all loadings free); 2nd-order: λ free",
        model_num = "1, 4, 6, 7, 59")

add_row("sameinst", "                Would go to same institution again [sameinst]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 4, construct = "Satisf",
        equation = "λ freely estimated",
        levels = "1=Definitely no | 2=Probably no | 3=Probably yes | 4=Definitely yes",
        source = "NSSE", notes = "Q20",
        model_num = "1, 4, 6, 7, 59")

add_row("evalexp", "                Evaluate entire educational experience [evalexp]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 4, construct = "Satisf",
        equation = "λ freely estimated",
        levels = "1=Poor | 2=Fair | 3=Good | 4=Excellent",
        source = "NSSE", notes = "Q19",
        model_num = "1, 4, 6, 7, 59")

# ============================================================================
# SECTION 3: MEDIATOR 1 - EMOTIONAL DISTRESS (EmoDiss)
# ============================================================================
add_section("MEDIATOR 1: Emotional Distress (M1)")
add_row(NA, "Emotional Distress", "Mediator (M1)", "ML (latent)", "Endogenous",
        construct = "EmoDiss",
        levels = "Latent (standardized)",
        equation = "EmoDiss ~ a1*X + a1z*XZ + covariates; EmoDiss =~ MHWd*",
        source = "MHW Module",
        notes = "Higher scores = more distress; structural: M1 regressed on X, XZ",
        model_num = "4, 6, 7, 59")

add_row("MHWdacad", "                Difficulty: Academics [MHWdacad]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 6, construct = "EmoDiss",
        equation = "λ = 1.00 (marker)",
        levels = "1=Not at all difficult | 2 | 3 | 4 | 5 | 6=Very difficult",
        source = "MHW Module", notes = "MHW Q1a",
        model_num = "4, 6, 7, 59")

add_row("MHWdlonely", "                Difficulty: Loneliness [MHWdlonely]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 6, construct = "EmoDiss",
        equation = "λ freely estimated",
        levels = "1=Not at all difficult | 2 | 3 | 4 | 5 | 6=Very difficult",
        source = "MHW Module", notes = "MHW Q1h",
        model_num = "4, 6, 7, 59")

add_row("MHWdmental", "                Difficulty: Mental health [MHWdmental]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 6, construct = "EmoDiss",
        equation = "λ freely estimated",
        levels = "1=Not at all difficult | 2 | 3 | 4 | 5 | 6=Very difficult",
        source = "MHW Module", notes = "MHW Q1i",
        model_num = "4, 6, 7, 59")

add_row("MHWdexhaust", "                Difficulty: Mental or emotional exhaustion [MHWdexhaust]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 6, construct = "EmoDiss",
        equation = "λ freely estimated",
        levels = "1=Not at all difficult | 2 | 3 | 4 | 5 | 6=Very difficult",
        source = "MHW Module", notes = "MHW Q1j",
        model_num = "4, 6, 7, 59")

add_row("MHWdsleep", "                Difficulty: Sleeping well [MHWdsleep]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 6, construct = "EmoDiss",
        equation = "λ freely estimated",
        levels = "1=Not at all difficult | 2 | 3 | 4 | 5 | 6=Very difficult",
        source = "MHW Module", notes = "MHW Q1k",
        model_num = "4, 6, 7, 59")

add_row("MHWdfinancial", "                Difficulty: Finances [MHWdfinancial]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 6, construct = "EmoDiss",
        equation = "λ freely estimated",
        levels = "1=Not at all difficult | 2 | 3 | 4 | 5 | 6=Very difficult",
        source = "MHW Module", notes = "MHW Q1c",
        model_num = "4, 6, 7, 59")

# ============================================================================
# SECTION 4: MEDIATOR 2 - QUALITY OF ENGAGEMENT (QualEngag)
# ============================================================================
add_section("MEDIATOR 2: Quality of Engagement (M2)")
add_row(NA, "Quality of Engagement", "Mediator (M2)", "ML (latent)", "Endogenous",
        construct = "QualEngag",
        levels = "Latent (standardized)",
        equation = "QualEngag ~ a2*X + a2z*XZ + covariates; QualEngag =~ QI*",
        source = "NSSE",
        notes = "Quality of interactions; structural: M2 regressed on X, XZ",
        model_num = "4, 6, 59")

add_row("QIadmin", "                Other administrative staff and offices [QIadmin]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 7, construct = "QualEngag",
        equation = "λ = 1.00 (marker)",
        levels = "1=Poor | 2 | 3 | 4 | 5 | 6 | 7=Excellent",
        source = "NSSE", notes = "Q13e; 9=N/A coded missing",
        model_num = "4, 6, 59")

add_row("QIstudent", "                Students [QIstudent]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 7, construct = "QualEngag",
        equation = "λ freely estimated",
        levels = "1=Poor | 2 | 3 | 4 | 5 | 6 | 7=Excellent",
        source = "NSSE", notes = "Q13a; 9=N/A coded missing",
        model_num = "4, 6, 59")

add_row("QIadvisor", "                Academic advisors [QIadvisor]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 7, construct = "QualEngag",
        equation = "λ freely estimated",
        levels = "1=Poor | 2 | 3 | 4 | 5 | 6 | 7=Excellent",
        source = "NSSE", notes = "Q13b; 9=N/A coded missing",
        model_num = "4, 6, 59")

add_row("QIfaculty", "                Faculty [QIfaculty]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 7, construct = "QualEngag",
        equation = "λ freely estimated",
        levels = "1=Poor | 2 | 3 | 4 | 5 | 6 | 7=Excellent",
        source = "NSSE", notes = "Q13c; 9=N/A coded missing",
        model_num = "4, 6, 59")

add_row("QIstaff", "                Student services staff [QIstaff]", "Indicator", "DWLS (ordered)", "Indicator",
        scale = "Ordinal", scale_points = 7, construct = "QualEngag",
        equation = "λ freely estimated",
        levels = "1=Poor | 2 | 3 | 4 | 5 | 6 | 7=Excellent",
        source = "NSSE", notes = "Q13d; 9=N/A coded missing",
        model_num = "4, 6, 59")

# ============================================================================
# SECTION 5: PROPENSITY SCORE COVARIATES (used in PS model)
# ============================================================================
add_section("PROPENSITY SCORE COVARIATES")
add_row("cohort", "Cohort Year [cohort]", "PS Covariate", "ML (continuous)", "Exogenous",
        scale = "Nominal", scale_points = 2, levels = "0=2019 | 1=2020",
        source = "Institutional", notes = "Academic cohort year; also MG moderator",
        model_num = "MG")

add_row("hgrades", "High School Grades [hgrades23]", "PS Covariate", "ML (continuous)", "Exogenous",
        scale = "Ordinal", scale_points = 8,
        levels = "1=D or below | 2=C- | 3=C | 4=C+ | 5=B- | 6=B | 7=B+ | 8=A",
        source = "BCSSE", notes = "hgrades23: What were most of your high school grades?",
        model_num = "59")

add_row("hgrades_c", "High School GPA (Centered)", "PS Covariate", "ML (continuous)", "Exogenous",
        scale = "Interval", scale_points = NA,
        levels = "Continuous (mean-centered)",
        equation = "hgrades_c = hgrades - mean(hgrades)",
        source = "Computed", notes = "Mean-centered version used in PS model",
        model_num = "59")

add_row("bparented", "Highest Parent Education [cpardegr18]", "PS Covariate", "ML (continuous)", "Exogenous",
        scale = "Ordinal", scale_points = 8,
        levels = "1=Less than HS | 2=HS diploma | 3=Some college | 4=Associate | 5=Bachelor's | 6=Master's | 7=Prof degree | 8=Doctoral",
        source = "BCSSE", notes = "cpardegr18: Highest education of parent(s)/guardian(s)",
        model_num = "59")

add_row("bparented_c", "Parent Education (Centered)", "PS Covariate", "ML (continuous)", "Exogenous",
        scale = "Interval", scale_points = NA,
        levels = "Continuous (mean-centered)",
        equation = "bparented_c = bparented - mean(bparented)",
        source = "Computed", notes = "Mean-centered version",
        model_num = "59")

add_row("hapcl", "AP Course Load (High) [hapcl13]", "PS Covariate", "ML (continuous)", "Exogenous",
        scale = "Nominal", scale_points = 2, levels = "0=<3 AP | 1=>=3 AP",
        source = "BCSSE", notes = "Derived from hapcl13: How many AP classes completed? Recoded 1=3+ courses",
        model_num = "59")

add_row("hprecalc13", "Pre-Calculus/Trigonometry with C or better [hprecalc13]", "PS Covariate", "ML (continuous)", "Exogenous",
        scale = "Nominal", scale_points = 2, levels = "0=No | 1=Yes",
        source = "BCSSE", notes = "hprecalc13: Earned C or better in Pre-Calculus or Trigonometry",
        model_num = "59")

add_row("hchallenge", "HS Courses Challenged You [hchallenge]", "PS Covariate", "ML (continuous)", "Exogenous",
        scale = "Ordinal", scale_points = 7,
        levels = "1=Not at all | 2 | 3 | 4 | 5 | 6 | 7=Very much",
        source = "BCSSE", notes = "To what extent did your courses challenge you to do your best work?",
        model_num = "59")

add_row("hchallenge_c", "HS Challenge (Centered)", "PS Covariate", "ML (continuous)", "Exogenous",
        scale = "Interval", scale_points = NA,
        levels = "Continuous (mean-centered)",
        equation = "hchallenge_c = hchallenge - mean(hchallenge)",
        source = "Computed", notes = "Mean-centered version",
        model_num = "59")

add_row("cSFcareer", "Expected: Talk career plans with faculty [cSFcareer]", "PS Covariate", "ML (continuous)", "Exogenous",
        scale = "Ordinal", scale_points = 4,
        levels = "1=Never | 2=Sometimes | 3=Often | 4=Very often",
        source = "BCSSE", notes = "How often do you expect to talk about career plans with a faculty member?",
        model_num = "59")

add_row("cSFcareer_c", "Baseline Career Goals (Centered)", "PS Covariate", "ML (continuous)", "Exogenous",
        scale = "Interval", scale_points = NA,
        levels = "Continuous (mean-centered)",
        equation = "cSFcareer_c = cSFcareer - mean(cSFcareer)",
        source = "Computed", notes = "Mean-centered version",
        model_num = "59")

# ============================================================================
# SECTION 6: GROUPING/MODERATOR VARIABLES (for RQ4 multi-group analyses)
# ============================================================================
add_section("MULTI-GROUP MODERATORS (W)")
add_row("re_all", "Race/Ethnicity [re_all]", "MG Grouping (W1)", "ML (continuous)", "Exogenous",
        scale = "Nominal", scale_points = 5,
        levels = "1=Hispanic/Latino | 2=White | 3=Asian | 4=Black/African-Am | 5=Other/Multi",
        source = "Institutional", notes = "Self-reported; collapsed for MG stability",
        model_num = "MG")

add_row("firstgen", "First-Generation Status [bfirstgen]", "MG Grouping (W2)", "ML (continuous)", "Exogenous",
        scale = "Nominal", scale_points = 2, levels = "0=Continuing-gen | 1=First-gen",
        source = "BCSSE", notes = "bfirstgen: Neither parent/guardian holds bachelor's degree",
        model_num = "MG")

add_row("pell", "Pell Grant Recipient [pell]", "MG Grouping (W3)", "ML (continuous)", "Exogenous",
        scale = "Nominal", scale_points = 2, levels = "0=No | 1=Yes",
        source = "Institutional", notes = "Federal Pell grant eligibility (low-income)",
        model_num = "MG")

add_row("sex", "Sex/Gender [sex]", "MG Grouping (W4)", "ML (continuous)", "Exogenous",
        scale = "Nominal", scale_points = 2, levels = "0=Woman | 1=Man",
        source = "Institutional", notes = "Binary sex from institutional records",
        model_num = "MG")

add_row("living18", "Living Situation [cliving18]", "MG Grouping (W5)", "ML (continuous)", "Exogenous",
        scale = "Nominal", scale_points = 3,
        levels = "1=With family | 2=Off-campus | 3=On-campus",
        source = "BCSSE", notes = "cliving18: Where will you be living while attending college?",
        model_num = "MG")

# ============================================================================
# SECTION 7: SAMPLE IDENTIFICATION VARIABLES
# ============================================================================
add_section("SAMPLE IDENTIFICATION")
add_row("id", "Respondent ID [id]", "Identifier", "N/A", "N/A",
        levels = "Unique integer",
        source = "Institutional", notes = "Anonymized student identifier")

add_row("DE_group_temp", "Dual Enrollment Group [DE_group_temp]", "Sample Definition", "N/A", "N/A",
        scale = "Ordinal", scale_points = 3,
        levels = "0=No_Cred | 1=Lite_DC (1-11) | 2=FASt (≥12)",
        equation = "Recoded from trnsfr_cr thresholds",
        source = "Computed", notes = "Temporary 3-group classification")

# ============================================================================
# SECTION 8: WEIGHT VARIABLE
# ============================================================================
add_section("WEIGHT")
add_row("psw", "Propensity Score Overlap Weight [psw]", "Weight", "N/A", "N/A",
        scale = "Ratio", scale_points = NA,
        levels = "0-1 (normalized, mean=1)",
        equation = "psw = X·(1−ps) + (1−X)·ps; normalized",
        source = "Computed",
        notes = "Overlap weights for ATO estimand",
        used_in_model = "Computed")

# ============================================================================
# SECTION 9: AUXILIARY VARIABLES (in dataset for reference)
# ============================================================================
add_section("AUXILIARY VARIABLES")
add_row("Cgrades", "College GPA [Cgrades]", "Auxiliary", "N/A", "N/A",
        scale = "Interval", scale_points = NA,
        levels = "0.0–4.0 (GPA scale)",
        source = "Institutional", notes = "First-year cumulative GPA")

add_row("StemMaj", "STEM Major [StemMaj]", "Auxiliary", "N/A", "N/A",
        scale = "Nominal", scale_points = 2, levels = "0=Non-STEM | 1=STEM",
        source = "Institutional", notes = "Declared major classification")

# ══════════════════════════════════════════════════════════════════════════════
# Combine and write output
# ══════════════════════════════════════════════════════════════════════════════
vt <- do.call(rbind, rows)

# Reorder columns for better readability
vt <- vt[, c("variable", "label", "role", "estimation", "sem_role", "model_num", "scale", "scale_points", 
             "construct", "equation", "levels", "source", "notes", "used_in_model")]

# Rename columns with proper capitalization (human-readable)
names(vt) <- c("Variable", "Label", "Role", "Estimation", "SEM Role", "Model", "Scale", "Scale Points",
               "Construct", "Equation", "Levels", "Source", "Notes", "Used in Model")

write.csv(vt, out_path, row.names = FALSE, na = "")

# Summary statistics (using new column names)
n_total <- nrow(vt)
n_sections <- sum(vt$Label == "" & vt$Role == "" & vt$Variable != "")
n_latent <- sum(grepl("latent", vt$Estimation, ignore.case = TRUE), na.rm = TRUE)
n_indicators <- sum(vt$`SEM Role` == "Indicator", na.rm = TRUE)
n_observed <- sum(vt$Estimation == "ML (continuous)" & vt$`SEM Role` == "Exogenous", na.rm = TRUE)

cat("\n")
cat("══════════════════════════════════════════════════════════════════════════════\n")
cat("                     VARIABLE TABLE GENERATION COMPLETE\n")
cat("══════════════════════════════════════════════════════════════════════════════\n")
cat(sprintf("  Output:      %s\n", normalizePath(out_path)))
cat(sprintf("  Total rows:  %d (including %d section headers)\n", n_total, n_sections))
cat(sprintf("  Variables:   %d latent factors, %d indicators, %d observed\n", 
            n_latent, n_indicators, n_observed))
cat("══════════════════════════════════════════════════════════════════════════════\n\n")

# ============================================================================
# Export to Excel with professional formatting
# ============================================================================
if (!requireNamespace("openxlsx", quietly = TRUE)) {
  message("Install openxlsx package for Excel export: install.packages('openxlsx')")
} else {
  library(openxlsx)
  
  xlsx_path <- sub("\\.csv$", ".xlsx", out_path)
  wb <- createWorkbook()
  addWorksheet(wb, "Variable Table")
  
  # Column count for styling
  nc <- ncol(vt)
  cols_all <- seq_len(nc)
  
  # Write data starting at row 2 (leave row 1 for title)
  writeData(wb, 1, vt, startRow = 2, startCol = 1, headerStyle = NULL)
  
  # === TITLE ROW ===
  writeData(wb, 1, "Process-SEM Variable Dictionary — Hayes Model 59 (First-Stage Moderated Parallel Mediation)", 
            startRow = 1, startCol = 1)
  title_style <- createStyle(
    fontSize = 14, textDecoration = "bold", 
    halign = "left", valign = "center",
    fgFill = "#1F4E79", fontColour = "white"
  )
  addStyle(wb, 1, style = title_style, rows = 1, cols = cols_all, gridExpand = TRUE)
  mergeCells(wb, 1, cols = cols_all, rows = 1)
  
  # === COLUMN HEADERS (row 2) ===
  header_style <- createStyle(
    fontSize = 10, textDecoration = "bold",
    halign = "center", valign = "center",
    fgFill = "#4472C4", fontColour = "white",
    border = "TopBottomLeftRight", borderStyle = "thin"
  )
  addStyle(wb, 1, style = header_style, rows = 2, cols = cols_all, gridExpand = TRUE)
  
  # === SECTION HEADERS ===
  section_style <- createStyle(
    fontSize = 10, textDecoration = "bold",
    halign = "left", valign = "center",
    fgFill = "#70AD47", fontColour = "white",
    border = "TopBottom", borderStyle = "medium"
  )
  
  # === DATA ROWS ===
  # Alternate row colors for readability
  row_light <- createStyle(
    fontSize = 9, halign = "left", valign = "center", wrapText = TRUE,
    fgFill = "#FFFFFF"
  )
  row_dark <- createStyle(
    fontSize = 9, halign = "left", valign = "center", wrapText = TRUE,
    fgFill = "#F2F2F2"
  )
  
  # Find section header rows (Excel rows = data rows + 2 for title + header)
  section_rows <- which(vt$Label == "" & vt$Role == "" & vt$Variable != "")
  section_excel_rows <- section_rows + 2  # +2 for title row + header row
  
  # Apply alternating row colors (skip section headers)
  data_start <- 3  # First data row in Excel
  data_end <- nrow(vt) + 2
  row_counter <- 0
  for (r in data_start:data_end) {
    if ((r - 2) %in% section_rows) {
      # Section header
      addStyle(wb, 1, style = section_style, rows = r, cols = cols_all, gridExpand = TRUE)
      row_counter <- 0  # Reset counter after section
    } else {
      # Alternate colors
      if (row_counter %% 2 == 0) {
        addStyle(wb, 1, style = row_light, rows = r, cols = cols_all, gridExpand = TRUE)
      } else {
        addStyle(wb, 1, style = row_dark, rows = r, cols = cols_all, gridExpand = TRUE)
      }
      row_counter <- row_counter + 1
    }
  }
  
  # === 2PT BORDERS AROUND SECTIONS ===
  section_ends <- c(section_excel_rows[-1] - 1, nrow(vt) + 2)
  
  for (i in seq_along(section_excel_rows)) {
    start_row <- section_excel_rows[i]
    end_row <- section_ends[i]
    
    # Top border
    addStyle(wb, 1, style = createStyle(border = "top", borderStyle = "medium", borderColour = "#1F4E79"),
             rows = start_row, cols = cols_all, gridExpand = TRUE, stack = TRUE)
    # Bottom border
    addStyle(wb, 1, style = createStyle(border = "bottom", borderStyle = "medium", borderColour = "#1F4E79"),
             rows = end_row, cols = cols_all, gridExpand = TRUE, stack = TRUE)
    # Left border
    addStyle(wb, 1, style = createStyle(border = "left", borderStyle = "medium", borderColour = "#1F4E79"),
             rows = start_row:end_row, cols = 1, gridExpand = TRUE, stack = TRUE)
    # Right border
    addStyle(wb, 1, style = createStyle(border = "right", borderStyle = "medium", borderColour = "#1F4E79"),
             rows = start_row:end_row, cols = nc, gridExpand = TRUE, stack = TRUE)
  }
  
  # === COLUMN WIDTHS (optimized for content) ===
  setColWidths(wb, 1, cols = 1, widths = 16)   # variable
  setColWidths(wb, 1, cols = 2, widths = 48)   # label
  setColWidths(wb, 1, cols = 3, widths = 16)   # role
  setColWidths(wb, 1, cols = 4, widths = 14)   # estimation
  setColWidths(wb, 1, cols = 5, widths = 12)   # sem_role
  setColWidths(wb, 1, cols = 6, widths = 14)   # model_num
  setColWidths(wb, 1, cols = 7, widths = 10)   # scale
  setColWidths(wb, 1, cols = 8, widths = 8)    # scale_points
  setColWidths(wb, 1, cols = 9, widths = 12)   # construct
  setColWidths(wb, 1, cols = 10, widths = 50)  # equation
  setColWidths(wb, 1, cols = 11, widths = 42)  # levels
  setColWidths(wb, 1, cols = 12, widths = 14)  # source
  setColWidths(wb, 1, cols = 13, widths = 35)  # notes
  setColWidths(wb, 1, cols = 14, widths = 10)  # used_in_model
  
  # === ROW HEIGHTS ===
  setRowHeights(wb, 1, rows = 1, heights = 24)  # Title
  setRowHeights(wb, 1, rows = 2, heights = 20)  # Header
  
  # === FREEZE PANES ===
  freezePane(wb, 1, firstActiveRow = 3, firstActiveCol = 3)  # Freeze title, header, and first 2 cols
  
  # === PRINT SETTINGS ===
  pageSetup(wb, 1, orientation = "landscape", fitToWidth = TRUE, fitToHeight = FALSE)
  
  saveWorkbook(wb, xlsx_path, overwrite = TRUE)
  cat("Wrote Excel file:", normalizePath(xlsx_path), "\n")
}

