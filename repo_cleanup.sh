#!/usr/bin/env bash

# Run this from the repo root (Process-SEM)
# It will:
# - move bulky junk (.venv, .pytest_cache, results) into archive/<timestamp>/
# - delete common cache cruft (__pycache__, .DS_Store, .Rhistory, etc.)
# - update .gitignore so this stuff stops coming back into git
# - untrack any of these folders if they were accidentally committed

set -euo pipefail

ts="$(date +%Y%m%d_%H%M%S)"
archive_dir="archive/cleanup_${ts}"
mkdir -p "$archive_dir"

echo "== Cleanup starting =="
echo "Archive folder: $archive_dir"
echo

# ---------- move big folders out of the way ----------
for d in .venv .pytest_cache results; do
  if [ -e "$d" ]; then
    echo "Moving $d -> $archive_dir/"
    mv "$d" "$archive_dir/"
  fi
done

# recreate an empty results folder for future runs
mkdir -p results

# ---------- delete common junk ----------
echo "Removing cache junk..."
find . -type d -name "__pycache__" -prune -exec rm -rf {} + 2>/dev/null || true
find . -type f \( -name ".DS_Store" -o -name ".Rhistory" -o -name ".RData" \) -delete 2>/dev/null || true

# ---------- update .gitignore (idempotent append) ----------
touch .gitignore

add_ignore_block() {
  local marker="$1"
  local block="$2"
  if ! grep -qF "$marker" .gitignore; then
    printf "\n%s\n%s\n" "$marker" "$block" >> .gitignore
    echo "Updated .gitignore: added block $marker"
  else
    echo ".gitignore already has block $marker"
  fi
}

add_ignore_block "# --- local env & cache ---" \
".venv/
.pytest_cache/
**/__pycache__/
.DS_Store
.Rhistory
.RData
.Rproj.user/"

add_ignore_block "# --- outputs ---" \
"results/"

add_ignore_block "# --- local data (keep examples only) ---" \
"data/*.csv
!data/example_*.csv"

# ---------- if git repo: untrack accidentally committed junk ----------
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo
  echo "Git repo detected: untracking junk if it was committed..."
  git rm -r --cached .venv .pytest_cache results 2>/dev/null || true
  git rm --cached -r "**/__pycache__" 2>/dev/null || true
  git rm --cached .DS_Store .Rhistory .RData 2>/dev/null || true

  echo
  echo "Status:"
  git status --short
  echo
  echo "Next:"
  echo "  git add .gitignore"
  echo "  git commit -m \"Cleanup repo: ignore env/cache/results\""
else
  echo
  echo "No git repo detected; cleanup finished."
fi

echo
echo "== Cleanup done =="
echo "Archived items live in: $archive_dir"
