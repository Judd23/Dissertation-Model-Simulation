#!/bin/bash
# Full Pipeline: Dataset → R Analysis → Webapp Transform → Deploy
# Usage: ./run_full_pipeline.sh

set -euo pipefail  # Exit on error and fail on pipeline errors

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

LOG_FILE="run_production_$(date +%Y%m%d_%H%M%S).log"

echo "=== FULL PIPELINE START: $(date) ===" | tee "$LOG_FILE"

# Step 1: Regenerate dataset
echo "=== Step 1: Regenerating dataset ===" | tee -a "$LOG_FILE"
python3 1_Dataset/generate_empirical_dataset.py 2>&1 | tee -a "$LOG_FILE"

# Step 2: Run R pipeline
echo "=== Step 2: Running R analysis pipeline ===" | tee -a "$LOG_FILE"
export FORCE_DATASET_CREATION=0  # Already regenerated above
export B_BOOT_MAIN=2000
export B_BOOT_MG=4
export BOOT_CI_TYPE_MAIN=bca.simple
export BOOT_NCPUS=6
export BOOTSTRAP_MG=1

Rscript 3_Analysis/1_Main_Pipeline_Code/run_all_RQs_official.R 2>&1 | tee -a "$LOG_FILE"

# Step 3: Transform results for webapp
echo "=== Step 3: Transforming results for webapp ===" | tee -a "$LOG_FILE"
python3 webapp/scripts/transform-results.py 2>&1 | tee -a "$LOG_FILE"

echo "=== Step 3b: Verifying webapp data outputs ===" | tee -a "$LOG_FILE"
DATA_DIR="webapp/public/data"
REQUIRED_FILES=(
  "modelResults.json"
  "doseEffects.json"
  "sampleDescriptives.json"
  "groupComparisons.json"
  "fastComparison.json"
)
for file in "${REQUIRED_FILES[@]}"; do
  if [[ ! -f "${DATA_DIR}/${file}" ]]; then
    echo "Missing required data file: ${DATA_DIR}/${file}" | tee -a "$LOG_FILE"
    exit 1
  fi
done

# Step 4: Build and deploy webapp
echo "=== Step 4: Building and deploying webapp ===" | tee -a "$LOG_FILE"
cd webapp
npm run build 2>&1 | tee -a "../$LOG_FILE"
rm -rf dist/data
cp -R public/data dist/data
npx gh-pages -d dist --no-history 2>&1 | tee -a "../$LOG_FILE"
cd ..

echo "=== FULL PIPELINE COMPLETE: $(date) ===" | tee -a "$LOG_FILE"
echo "Log saved to: $LOG_FILE"
