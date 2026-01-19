#!/usr/bin/env python3
"""
Sync a run's artifacts to webapp/public/results for the UI.

This script:
1. Copies manifest.json and referenced artifacts to webapp/public/results/<RUN_ID>/
2. Updates webapp/public/results/runs_index.json (newest-first, deduped by run_id)

Usage:
    python sync_run_to_webapp.py --run-dir 4_Model_Results/Outputs/runs/<RUN_ID>
    
Or from R:
    system("python3 scripts/sync_run_to_webapp.py --run-dir <path>")
"""

import argparse
import json
import shutil
from pathlib import Path
from datetime import datetime


def load_manifest(run_dir: Path) -> dict:
    """Load manifest from run directory."""
    manifest_path = run_dir / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")
    
    with open(manifest_path, 'r') as f:
        return json.load(f)


def sync_run_to_webapp(run_dir: Path, webapp_results: Path) -> None:
    """
    Copy run artifacts to webapp/public/results/<RUN_ID>/
    
    Copies:
    - manifest.json
    - All files referenced in manifest.artifacts
    """
    manifest = load_manifest(run_dir)
    run_id = manifest.get('run_id', run_dir.name)
    
    dest_dir = webapp_results / run_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Copy manifest.json
    src_manifest = run_dir / "manifest.json"
    dest_manifest = dest_dir / "manifest.json"
    shutil.copy2(src_manifest, dest_manifest)
    print(f"Copied: manifest.json -> {dest_manifest}")
    
    # 2. Copy referenced artifacts
    artifacts = manifest.get('artifacts', {})
    
    # Copy individual artifact files (raw outputs)
    for key in ['fit_measures', 'parameters', 'executed_model_syntax', 
                'verification_checklist', 'bootstrap_results']:
        rel_path = artifacts.get(key)
        if rel_path:
            src = run_dir / rel_path
            if src.exists():
                dest = dest_dir / rel_path
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dest)
                print(f"Copied: {rel_path}")
    
    # Copy tables (list of filenames)
    tables = artifacts.get('tables', [])
    if tables:
        tables_dest = dest_dir / "tables"
        tables_dest.mkdir(parents=True, exist_ok=True)
        for table_name in tables:
            src = run_dir / "tables" / table_name
            if src.exists():
                shutil.copy2(src, tables_dest / table_name)
                print(f"Copied: tables/{table_name}")
    
    # Copy figures (list of filenames)
    figures = artifacts.get('figures', [])
    if figures:
        figures_dest = dest_dir / "figures"
        figures_dest.mkdir(parents=True, exist_ok=True)
        for fig_name in figures:
            src = run_dir / "figures" / fig_name
            if src.exists():
                shutil.copy2(src, figures_dest / fig_name)
                print(f"Copied: figures/{fig_name}")
    
    print(f"\nSynced run to: {dest_dir}")


def update_runs_index(webapp_results: Path, manifest: dict) -> None:
    """
    Update runs_index.json with the new run.
    
    - Sorted newest-first by timestamp
    - Deduplicated by run_id
    """
    index_path = webapp_results / "runs_index.json"
    
    # Load existing index or create empty
    if index_path.exists():
        with open(index_path, 'r') as f:
            runs = json.load(f)
    else:
        runs = []
    
    run_id = manifest.get('run_id', '')
    timestamp = manifest.get('timestamp', datetime.now().isoformat())
    mode = manifest.get('mode', 'main')
    
    # Create new entry
    new_entry = {
        "run_id": run_id,
        "timestamp": timestamp,
        "label": f"{mode} - {run_id}",
        "manifest_path": f"{run_id}/manifest.json"
    }
    
    # Remove existing entry with same run_id (if any)
    runs = [r for r in runs if r.get('run_id') != run_id]
    
    # Add new entry at the beginning (newest-first)
    runs.insert(0, new_entry)
    
    # Sort by timestamp descending (newest first)
    runs.sort(key=lambda r: r.get('timestamp', ''), reverse=True)
    
    # Save updated index
    with open(index_path, 'w') as f:
        json.dump(runs, f, indent=2)
    
    print(f"Updated: {index_path}")
    print(f"  Total runs indexed: {len(runs)}")


def main():
    parser = argparse.ArgumentParser(
        description='Sync run artifacts to webapp/public/results'
    )
    parser.add_argument(
        '--run-dir',
        type=str,
        required=True,
        help='Path to run directory containing manifest.json'
    )
    parser.add_argument(
        '--webapp-results',
        type=str,
        default='webapp/public/results',
        help='Path to webapp results directory (default: webapp/public/results)'
    )
    parser.add_argument(
        '--skip-index',
        action='store_true',
        help='Skip updating runs_index.json'
    )
    args = parser.parse_args()
    
    run_dir = Path(args.run_dir).resolve()
    webapp_results = Path(args.webapp_results)
    
    if not run_dir.exists():
        print(f"ERROR: Run directory not found: {run_dir}")
        return 1
    
    print(f"\n{'='*60}")
    print("SYNC RUN TO WEBAPP")
    print(f"{'='*60}")
    print(f"Source:      {run_dir}")
    print(f"Destination: {webapp_results}")
    print(f"{'='*60}\n")
    
    # Load manifest
    try:
        manifest = load_manifest(run_dir)
    except FileNotFoundError as e:
        print(f"ERROR: {e}")
        return 1
    
    print(f"Run ID: {manifest.get('run_id', 'unknown')}")
    print(f"Mode:   {manifest.get('mode', 'unknown')}")
    
    # Sync artifacts
    webapp_results.mkdir(parents=True, exist_ok=True)
    sync_run_to_webapp(run_dir, webapp_results)
    
    # Update index
    if not args.skip_index:
        update_runs_index(webapp_results, manifest)
    
    print(f"\n{'='*60}")
    print("SYNC COMPLETE")
    print(f"{'='*60}")
    
    return 0


if __name__ == "__main__":
    exit(main())
