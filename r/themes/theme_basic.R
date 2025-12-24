# Basic ggplot theme used across this repo.
# Intentionally minimal: avoids custom colors/fonts so plots inherit defaults.

basic_theme <- function(base_size = 12) {
  ggplot2::theme_minimal(base_size = base_size) +
    ggplot2::theme(
      panel.grid.minor = ggplot2::element_blank(),
      plot.title.position = "plot",
      plot.caption.position = "plot"
    )
}
