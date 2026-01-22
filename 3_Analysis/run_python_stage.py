#!/usr/bin/env python3
"""
Manifest-first Python stage entrypoint.

Reads a manifest.json produced by the R pipeline and orchestrates all
Python-based table and figure generation.

Usage:
    python run_python_stage.py --manifest path/to/manifest.json

This script:
1. Reads the manifest to find artifact locations
2. Runs table generation scripts (Dissertation_Tables, Bootstrap_Tables, Plain_Language_Summary)
3. Runs figure generation scripts (plot_descriptives, etc.)
4. Generates webapp JSON files (modelResults.json, doseEffects.json, etc.)
5. Updates the manifest with produced artifacts
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from datetime import datetime

# Add webapp scripts to path for transform imports
REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT / "webapp" / "scripts"))


def load_manifest(manifest_path: Path) -> dict:
    """Load and validate the manifest file."""
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")
    
    with open(manifest_path, 'r') as f:
        manifest = json.load(f)
    
    required_keys = ['run_id', 'timestamp', 'mode']
    for key in required_keys:
        if key not in manifest:
            raise ValueError(f"Manifest missing required key: {key}")
    
    return manifest


def save_manifest(manifest: dict, manifest_path: Path) -> None:
    """Save the updated manifest file."""
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    print(f"Updated manifest: {manifest_path}")


def run_script(cmd: list[str], description: str) -> bool:
    """Run a Python script and return success status."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(cmd)}")
    print('='*60)
    
    result = subprocess.run(cmd, capture_output=False)
    
    if result.returncode == 0:
        print(f"✓ {description} completed successfully")
        return True
    else:
        print(f"✗ {description} failed (exit code {result.returncode})")
        return False


def build_tables(run_dir: Path, manifest: dict) -> list[str]:
    """Build all DOCX tables and return list of produced files."""
    tables_dir = run_dir / "tables"
    raw_dir = run_dir / "raw"
    tables_dir.mkdir(parents=True, exist_ok=True)
    
    # Extract settings from manifest
    settings = manifest.get('settings', {})
    B = settings.get('bootstrap', 2000) or 2000
    ci_type = settings.get('CI', 'perc') or 'perc'
    
    produced = []
    scripts_dir = Path("3_Analysis/3_Tables_Code")
    
    # 1. Bootstrap Tables
    boot_params_path = raw_dir / "RQ1_RQ3_main" / "structural" / "structural_parameterEstimates.txt"
    if boot_params_path.exists():
        cmd = [
            sys.executable,
            str(scripts_dir / "build_bootstrap_tables.py"),
            "--csv", str(boot_params_path),
            "--B", str(B),
            "--ci_type", ci_type,
            "--out", str(tables_dir)
        ]
        if run_script(cmd, "Bootstrap Tables"):
            produced.append("Bootstrap_Tables.docx")
    else:
        print(f"Skipping Bootstrap Tables: {boot_params_path} not found")
    
    # 2. Dissertation Tables
    cmd = [
        sys.executable,
        str(scripts_dir / "build_dissertation_tables.py"),
        "--outdir", str(raw_dir),
        "--out", str(tables_dir),
        "--B", str(B),
        "--ci_type", ci_type
    ]
    if run_script(cmd, "Dissertation Tables"):
        produced.append("Dissertation_Tables.docx")
    
    # 3. Plain Language Summary
    cmd = [
        sys.executable,
        str(scripts_dir / "build_plain_language_summary.py"),
        "--outdir", str(raw_dir),
        "--out", str(tables_dir),
        "--B", str(B),
        "--ci_type", ci_type
    ]
    if run_script(cmd, "Plain Language Summary"):
        produced.append("Plain_Language_Summary.docx")
    
    return produced


def build_figures(run_dir: Path, manifest: dict) -> list[str]:
    """Build all PNG figures and return list of produced files."""
    figures_dir = run_dir / "figures"
    raw_dir = run_dir / "raw"
    figures_dir.mkdir(parents=True, exist_ok=True)
    
    produced = []
    scripts_dir = Path("3_Analysis/4_Plots_Code")
    
    # Find PSW-weighted data
    psw_data = raw_dir / "RQ1_RQ3_main" / "rep_data_with_psw.csv"
    
    if psw_data.exists():
        # plot_descriptives.py
        cmd = [
            sys.executable,
            str(scripts_dir / "plot_descriptives.py"),
            "--data", str(psw_data),
            "--outdir", str(figures_dir),
            "--weights", "psw"
        ]
        if run_script(cmd, "Descriptive Plots"):
            # Collect produced PNG files
            for png in figures_dir.glob("*.png"):
                if png.name not in produced:
                    produced.append(png.name)
    else:
        print(f"Skipping plots: {psw_data} not found")
    
    return produced


def build_webapp_json(run_dir: Path, manifest: dict) -> dict:
    """
    Build webapp JSON files and write them to run folder.

    Returns dict of produced files for manifest update.
    """
    try:
        # Import transform functions from webapp/scripts
        from importlib import import_module
        transform = import_module("transform-results")
    except ImportError as e:
        print(f"Warning: Could not import transform-results: {e}")
        print("Skipping webapp JSON generation")
        return {}

    raw_dir = run_dir / "raw"
    settings = manifest.get('settings', {})
    B = settings.get('bootstrap', 2000) or 2000
    ci_type = settings.get('CI', 'perc') or 'perc'

    produced = {}

    print(f"\n{'='*60}")
    print("Building Webapp JSON Files")
    print('='*60)

    # 1. Model Results
    print("\n[1/5] Building modelResults.json...")
    main_model_dir = raw_dir / "RQ1_RQ3_main" / "structural"
    total_effect_dir = raw_dir / "A0_total_effect" / "structural"

    main_params_path = main_model_dir / "structural_parameterEstimates.txt"
    main_fit_path = main_model_dir / "structural_fitMeasures.txt"

    main_params = transform.parse_parameter_estimates(main_params_path)
    main_paths = transform.extract_key_paths(main_params, transform.KEY_PATHS)
    main_fit = transform.parse_fit_measures(main_fit_path)

    main_model = {
        "fitMeasures": main_fit,
        "structuralPaths": main_paths,
        "sourcePaths": {
            "parameterEstimates": str(main_params_path.relative_to(run_dir)) if main_params_path.exists() else "",
            "fitMeasures": str(main_fit_path.relative_to(run_dir)) if main_fit_path.exists() else "",
        },
    }

    # Total effect model (if exists)
    total_params_path = total_effect_dir / "structural_parameterEstimates.txt"
    total_fit_path = total_effect_dir / "structural_fitMeasures.txt"

    if total_params_path.exists():
        total_params = transform.parse_parameter_estimates(total_params_path)
        total_paths = transform.extract_key_paths(total_params, transform.TOTAL_EFFECT_KEYS)
        total_fit = transform.parse_fit_measures(total_fit_path)
        total_model = {
            "fitMeasures": total_fit,
            "structuralPaths": total_paths,
            "sourcePaths": {
                "parameterEstimates": str(total_params_path.relative_to(run_dir)),
                "fitMeasures": str(total_fit_path.relative_to(run_dir)) if total_fit_path.exists() else "",
            },
        }
    else:
        total_model = {"fitMeasures": {}, "structuralPaths": [], "sourcePaths": {}}

    model_results = {
        "mainModel": main_model,
        "totalEffectModel": total_model,
        "bootstrap": {
            "n_replicates": B,
            "ci_type": ci_type,
        },
    }

    model_results_path = run_dir / "modelResults.json"
    with open(model_results_path, 'w') as f:
        json.dump(model_results, f, indent=2)
    produced["modelResults"] = "modelResults.json"
    print(f"  ✓ Wrote modelResults.json ({len(main_paths)} paths)")

    # 2. Dose Effects
    print("\n[2/5] Building doseEffects.json...")
    dose_effects = transform.compute_dose_effects(main_paths)

    dose_effects_path = run_dir / "doseEffects.json"
    with open(dose_effects_path, 'w') as f:
        json.dump(dose_effects, f, indent=2)
    produced["doseEffects"] = "doseEffects.json"
    print(f"  ✓ Wrote doseEffects.json ({len(dose_effects.get('effects', []))} dose levels)")

    # 3. Sample Descriptives
    print("\n[3/5] Building sampleDescriptives.json...")
    psw_data_path = raw_dir / "RQ1_RQ3_main" / "rep_data_with_psw.csv"
    if not psw_data_path.exists():
        # Fallback to original dataset
        psw_data_path = REPO_ROOT / "1_Dataset" / "rep_data.csv"

    descriptives = transform.compute_sample_descriptives(psw_data_path)

    descriptives_path = run_dir / "sampleDescriptives.json"
    with open(descriptives_path, 'w') as f:
        json.dump(descriptives, f, indent=2)
    produced["sampleDescriptives"] = "sampleDescriptives.json"
    print(f"  ✓ Wrote sampleDescriptives.json (N={descriptives.get('n', 0):,})")

    # 4. Group Comparisons (if RQ4 data exists)
    print("\n[4/5] Building groupComparisons.json...")
    # Point to run-specific RQ4 outputs if they exist
    group_comparisons = {}
    rq4_race_dir = raw_dir / "RQ4_structural_by_re_all"
    rq4_mg_dir = raw_dir / "RQ4_structural_MG"

    if rq4_race_dir.exists() or rq4_mg_dir.exists():
        # Temporarily update module paths for group comparison building
        original_outputs = getattr(transform, 'OUTPUTS_DIR', None)
        transform.OUTPUTS_DIR = raw_dir  # Point to run's raw folder
        try:
            group_comparisons = transform.build_group_comparisons()
        finally:
            if original_outputs:
                transform.OUTPUTS_DIR = original_outputs

    group_path = run_dir / "groupComparisons.json"
    with open(group_path, 'w') as f:
        json.dump(group_comparisons, f, indent=2)
    produced["groupComparisons"] = "groupComparisons.json"
    print(f"  ✓ Wrote groupComparisons.json ({len(group_comparisons)} groups)")

    # 5. Variable Metadata (static, but include for completeness)
    print("\n[5/5] Building variableMetadata.json...")
    variable_metadata = transform.build_variable_metadata()

    metadata_path = run_dir / "variableMetadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(variable_metadata, f, indent=2)
    produced["variableMetadata"] = "variableMetadata.json"
    print(f"  ✓ Wrote variableMetadata.json")

    # 6. Data Metadata (timestamp info)
    data_metadata = {
        "generatedAt": datetime.now().isoformat(),
        "generatedAtFormatted": datetime.now().strftime("%B %d, %Y at %I:%M %p"),
        "generatedAtShort": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "pipelineVersion": "2.0.0",  # Manifest-driven version
        "dataSource": "run_python_stage.py",
        "bootstrapReplicates": B,
        "ciType": ci_type,
        "runId": manifest.get('run_id', 'unknown'),
    }

    data_metadata_path = run_dir / "dataMetadata.json"
    with open(data_metadata_path, 'w') as f:
        json.dump(data_metadata, f, indent=2)
    produced["dataMetadata"] = "dataMetadata.json"
    print(f"  ✓ Wrote dataMetadata.json")

    print(f"\n{'='*60}")
    print(f"Webapp JSON complete: {len(produced)} files written to {run_dir}")

    return produced


def main():
    parser = argparse.ArgumentParser(
        description='Manifest-first Python stage for SEM pipeline'
    )
    parser.add_argument(
        '--manifest', 
        type=str, 
        required=True,
        help='Path to manifest.json from R pipeline'
    )
    parser.add_argument(
        '--skip-tables',
        action='store_true',
        help='Skip table generation'
    )
    parser.add_argument(
        '--skip-figures',
        action='store_true',
        help='Skip figure generation'
    )
    parser.add_argument(
        '--skip-webapp-json',
        action='store_true',
        help='Skip webapp JSON generation'
    )
    args = parser.parse_args()
    
    manifest_path = Path(args.manifest).resolve()
    run_dir = manifest_path.parent
    
    print(f"\n{'#'*60}")
    print("MANIFEST-FIRST PYTHON STAGE")
    print(f"{'#'*60}")
    print(f"Manifest: {manifest_path}")
    print(f"Run dir:  {run_dir}")
    
    # Load manifest
    try:
        manifest = load_manifest(manifest_path)
    except (FileNotFoundError, ValueError) as e:
        print(f"ERROR: {e}")
        return 1
    
    print(f"Run ID:   {manifest['run_id']}")
    print(f"Mode:     {manifest['mode']}")
    print(f"{'#'*60}")
    
    # Initialize artifact lists if not present
    if 'artifacts' not in manifest:
        manifest['artifacts'] = {}

    tables_produced = []
    figures_produced = []
    webapp_json_produced = {}

    # Build tables
    if not args.skip_tables:
        tables_produced = build_tables(run_dir, manifest)
        manifest['artifacts']['tables'] = tables_produced

    # Build figures
    if not args.skip_figures:
        figures_produced = build_figures(run_dir, manifest)
        manifest['artifacts']['figures'] = figures_produced

    # Build webapp JSON files
    if not args.skip_webapp_json:
        webapp_json_produced = build_webapp_json(run_dir, manifest)
        manifest['artifacts']['webapp_json'] = webapp_json_produced

    # Update manifest timestamp
    manifest['python_stage_completed'] = datetime.now().isoformat()
    
    # Save updated manifest
    save_manifest(manifest, manifest_path)
    
    # Summary
    print(f"\n{'='*60}")
    print("PYTHON STAGE COMPLETE")
    print(f"{'='*60}")
    print(f"Tables produced:  {len(tables_produced)}")
    for t in tables_produced:
        print(f"  - tables/{t}")
    print(f"Figures produced: {len(figures_produced)}")
    for f in figures_produced:
        print(f"  - figures/{f}")
    print(f"Webapp JSON:      {len(webapp_json_produced)}")
    for key, filename in webapp_json_produced.items():
        print(f"  - {filename}")
    print(f"\nManifest updated: {manifest_path}")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
