resolve_run_dir <- function(run_dir = NULL, run_id = NULL, results_root = file.path("results", "runs")) {
  # Canonical contract:
  # - Either pass --run_dir as an explicit path, OR
  # - pass --run_id and we resolve under results/runs/<run_id>
  #
  # Special value:
  # - results/runs/_latest is treated as "most recently modified run folder".

  if (!is.null(run_dir) && nzchar(run_dir)) {
    if (basename(run_dir) == "_latest") {
      base <- dirname(run_dir)
      if (!dir.exists(base)) stop("results root not found: ", base)
      kids <- list.dirs(base, full.names = TRUE, recursive = FALSE)
      kids <- kids[basename(kids) != "_latest"]
      if (length(kids) == 0) stop("No runs found under: ", base)
      info <- file.info(kids)
      newest <- rownames(info)[order(info$mtime, decreasing = TRUE)][1]
      return(newest)
    }
    return(run_dir)
  }

  if (!is.null(run_id) && nzchar(run_id)) {
    return(file.path(results_root, run_id))
  }

  stop("Provide --run_dir or --run_id")
}

ensure_run_subdir <- function(run_dir, subpath = NULL) {
  d <- run_dir
  if (!is.null(subpath) && nzchar(subpath)) d <- file.path(run_dir, subpath)
  dir.create(d, recursive = TRUE, showWarnings = FALSE)
  d
}
resolve_run_dir <- function(run_dir = NULL, run_id = NULL, results_root = file.path("results", "runs")) {
  # Canonical contract:
  # - Either pass --run_dir as an explicit path, OR
  # - pass --run_id and we resolve under results/runs/<run_id>
  #
  # Special value:
  # - results/runs/_latest is treated as "most recently modified run folder".

  if (!is.null(run_dir) && nzchar(run_dir)) {
    if (basename(run_dir) == "_latest") {
      base <- dirname(run_dir)
      if (!dir.exists(base)) stop("results root not found: ", base)
      kids <- list.dirs(base, full.names = TRUE, recursive = FALSE)
      kids <- kids[basename(kids) != "_latest"]
      if (length(kids) == 0) stop("No runs found under: ", base)
      info <- file.info(kids)
      newest <- rownames(info)[order(info$mtime, decreasing = TRUE)][1]
      return(newest)
    }
    return(run_dir)
  }

  if (!is.null(run_id) && nzchar(run_id)) {
    return(file.path(results_root, run_id))
  }

  stop("Provide --run_dir or --run_id")
}

ensure_run_subdir <- function(run_dir, subpath = NULL) {
  d <- run_dir
  if (!is.null(subpath) && nzchar(subpath)) d <- file.path(run_dir, subpath)
  dir.create(d, recursive = TRUE, showWarnings = FALSE)
  d
}
