#!/usr/bin/env Rscript
# Quick check of variable alignment

d <- read.csv("rep_data.csv")
vt <- read.csv("results/tables/variable_table.csv")

cat("=== VARIABLES IN DATASET ===\n")
cat(paste(names(d), collapse=", "), "\n\n")

cat("=== VARIABLES IN TABLE (non-latent) ===\n")
in_table <- vt$variable[!is.na(vt$variable)]
cat(paste(in_table, collapse=", "), "\n\n")

cat("=== IN DATA BUT NOT IN TABLE ===\n")
missing_from_table <- setdiff(names(d), in_table)
cat(paste(missing_from_table, collapse=", "), "\n\n")

cat("=== IN TABLE BUT NOT IN DATA ===\n")
not_in_data <- setdiff(in_table, names(d))
cat(paste(not_in_data, collapse=", "), "\n")
