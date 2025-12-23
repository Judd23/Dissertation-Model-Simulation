# APA 7 plotting helpers (R)
#
# Goal: consistent APA-ish styling + Times New Roman embedding on macOS.
#
# Usage:
#   source('scripts/apa7_theme.R')
#   apa7_enable_times_new_roman()
#   p + apa7_theme()

suppressWarnings(suppressMessages({
  library(ggplot2)
}))

apa7_enable_times_new_roman <- function() {
  # Try to enable font embedding via showtext + sysfonts.
  # This is optional; if packages aren't installed or font missing, we fall back.
  ok <- TRUE
  if (!requireNamespace("showtext", quietly = TRUE) || !requireNamespace("sysfonts", quietly = TRUE)) {
    message("[apa7] showtext/sysfonts not installed; using base 'Times' fallback.")
    return(invisible(FALSE))
  }

  # Prefer Times New Roman if available.
  # On macOS, if TNR isn't installed system-wide, this may fail.
  tryCatch({
    sysfonts::font_add(family = "Times New Roman", regular = "Times New Roman")
    showtext::showtext_auto(enable = TRUE)
  }, error = function(e) {
    ok <<- FALSE
    message("[apa7] Could not register 'Times New Roman' (", conditionMessage(e), "). Using fallback 'Times'.")
  })

  invisible(ok)
}

apa7_theme <- function(base_size = 12, family = NULL) {
  # APA-ish: clean, no heavy grid, boxed panel for readability.
  if (is.null(family)) {
    # Safe default on macOS without extra packages.
    family <- "Times"
  }

  theme_classic(base_size = base_size, base_family = family) +
    theme(
      plot.title = element_text(face = "bold"),
      plot.subtitle = element_text(size = base_size * 0.95),
      axis.title = element_text(face = "plain"),
      legend.title = element_text(face = "plain"),
      panel.border = element_rect(color = "black", fill = NA, linewidth = 0.6),
      axis.ticks = element_line(color = "black"),
      axis.line = element_blank()
    )
}
