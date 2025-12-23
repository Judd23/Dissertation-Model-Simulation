# mc_allRQs_PSW_pooled_MG_a1.R

# ... [earlier code unchanged] ...

# Helper function to extract pooled parameter estimates
extract_pooled_estimates <- function(fitP) {
  # NOTE: semTools::runMI may return class OLDlavaan.mi in some installations.
  # Standardized extraction triggers lav_standardize_all(), which requires an "implied" slot
  # that OLDlavaan.mi does not have. For MI objects, extract *unstandardized* estimates only.
  want_std <- TRUE
  if (inherits(fitP, "lavaan.mi") || inherits(fitP, "OLDlavaan.mi")) want_std <- FALSE

  pe <- lavaan::parameterEstimates(fitP, standardized = want_std)

  # Some MI methods may return Estimate/Std.Error instead of est/se; normalize names.
  if (!"est" %in% names(pe) && "Estimate" %in% names(pe)) pe$est <- pe$Estimate
  if (!"se"  %in% names(pe) && "Std.Err"  %in% names(pe)) pe$se  <- pe$Std.Err
  if (!"z"   %in% names(pe) && "z-value" %in% names(pe)) pe$z   <- pe$`z-value`
  if (!"pvalue" %in% names(pe) && "P(>|z|)" %in% names(pe)) pe$pvalue <- pe$`P(>|z|)`
  if (!"pvalue" %in% names(pe) && "P(>|t|)" %in% names(pe)) pe$pvalue <- pe$`P(>|t|)`

  req <- c("lhs","op","rhs","est")
  if (!all(req %in% names(pe))) {
    stop("[pooled] parameterEstimates() missing expected columns: ", paste(setdiff(req, names(pe)), collapse=","))
  }
  return(pe)
}

# ... [other code unchanged] ...

# When extracting standardized solutions for pooled fits in MI analysis:
std <- NULL
if (!(inherits(fitP, "lavaan.mi") || inherits(fitP, "OLDlavaan.mi"))) {
  std <- lavaan::standardizedSolution(fitP)
}

# ... [code that saves output] ...
# If std is NULL (MI case), save only unstandardized pe; else save both

# ... [other code unchanged] ...

# At top-level run_mc() parallel section:

# Set cores (CORES) and before parallel::mclapply call:
if (identical(ANALYSIS, "mi") && CORES > 1) {
  message("[note] analysis=mi with cores>1 can be unstable on some systems; if you see random MI errors, rerun with --cores 1")
}

# ... [rest of code unchanged] ...
