#!/usr/bin/env Rscript

# Compatibility wrapper: historically called as r/summaries/summarize_mc_outputs.R
# Delegates to the canonical summarizer.

source(file.path("r", "summaries", "01_summarize_mc_outputs.R"), local = FALSE)
