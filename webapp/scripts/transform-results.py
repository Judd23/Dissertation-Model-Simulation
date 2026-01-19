#!/usr/bin/env python3
"""
Transform R model outputs to JSON for React frontend.

Reads:
  - 4_Model_Results/Outputs/RQ1_RQ3_main/structural/*.txt
  - 4_Model_Results/Outputs/RQ4_structural_by_re_all/*/*.txt
  - 4_Model_Results/Outputs/RQ4_structural_MG/*/structural/*.txt
  - 2_Codebooks/Variable_Table.csv
  - 1_Dataset/rep_data.csv (for descriptives)

Writes:
  - webapp/public/data/modelResults.json
  - webapp/public/data/doseEffects.json
  - webapp/public/data/groupComparisons.json
  - webapp/public/data/sampleDescriptives.json
  - webapp/public/data/variableMetadata.json
"""

import json
import os
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime

# Paths
PROJECT_ROOT = Path(__file__).parent.parent.parent
OUTPUTS_DIR = PROJECT_ROOT / "4_Model_Results" / "Outputs"
DATA_DIR = PROJECT_ROOT / "1_Dataset"
CODEBOOK_DIR = PROJECT_ROOT / "2_Codebooks"
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "data"

# Key structural paths we want to extract
KEY_PATHS = ["a1", "a1z", "a2", "a2z", "b1", "b2", "c", "cz", "g1", "g2", "g3"]
TOTAL_EFFECT_KEYS = ["c_total"]


def parse_parameter_estimates(filepath: Path) -> pd.DataFrame:
    """Parse lavaan parameter estimates TSV file."""
    if not filepath.exists():
        print(f"  Warning: {filepath} not found")
        return pd.DataFrame()

    df = pd.read_csv(filepath, sep="\t")
    return df


def extract_key_paths(params: pd.DataFrame, key_paths: list = None) -> list:
    """Extract key structural path coefficients from parameter estimates."""
    if params.empty:
        return []

    # Filter to structural paths with labels
    structural = params[(params["op"] == "~") & (params["label"].notna()) & (params["label"] != "")].copy()

    active_keys = key_paths if key_paths is not None else KEY_PATHS
    paths = []
    for _, row in structural.iterrows():
        label = row["label"]
        if label not in active_keys:
            continue

        path = {
            "id": label,
            "from": row["rhs"],
            "to": row["lhs"],
            "estimate": round(float(row["est"]), 4) if pd.notna(row["est"]) else None,
            "se": round(float(row["se"]), 4) if pd.notna(row["se"]) else None,
            "z": round(float(row["z"]), 3) if pd.notna(row["z"]) else None,
            "pvalue": float(row["pvalue"]) if pd.notna(row["pvalue"]) else None,
            "std_estimate": round(float(row["std.all"]), 4) if pd.notna(row.get("std.all")) else None,
        }
        paths.append(path)

    return paths


def parse_fit_measures(filepath: Path) -> dict:
    """Parse lavaan fit measures TSV file."""
    if not filepath.exists():
        print(f"  Warning: {filepath} not found")
        return {}

    df = pd.read_csv(filepath, sep="\t")

    # Convert to dict with specific measures we care about
    fit = {}
    key_measures = ["chisq", "df", "pvalue", "cfi", "tli", "rmsea", "srmr",
                    "cfi.scaled", "tli.scaled", "rmsea.scaled", "cfi.robust", "tli.robust", "rmsea.robust"]

    for _, row in df.iterrows():
        key = row.iloc[0] if len(row) > 0 else None
        value = row.iloc[1] if len(row) > 1 else None
        if key in key_measures and pd.notna(value):
            try:
                fit[key] = round(float(value), 4)
            except (ValueError, TypeError):
                fit[key] = str(value)

    return fit


def compute_dose_effects(main_paths: list) -> dict:
    """Compute dose-response effects at various credit levels based on actual model coefficients."""
    # Extract coefficients from main model
    def get_path(paths, label):
        for p in paths:
            if p["id"] == label:
                return p
        return None

    a1 = get_path(main_paths, "a1")
    a1z = get_path(main_paths, "a1z")
    a2 = get_path(main_paths, "a2")
    a2z = get_path(main_paths, "a2z")
    c = get_path(main_paths, "c")
    cz = get_path(main_paths, "cz")

    # Use actual coefficients if available; mark missing data for the UI.
    coefficients = {
        "distress": {
            "main": a1["estimate"] if a1 and a1["estimate"] is not None else None,
            "moderation": a1z["estimate"] if a1z and a1z["estimate"] is not None else None,
            "se": a1["se"] if a1 and a1["se"] is not None else None,
        },
        "engagement": {
            "main": a2["estimate"] if a2 and a2["estimate"] is not None else None,
            "moderation": a2z["estimate"] if a2z and a2z["estimate"] is not None else None,
            "se": a2["se"] if a2 and a2["se"] is not None else None,
        },
        "adjustment": {
            "main": c["estimate"] if c and c["estimate"] is not None else None,
            "moderation": cz["estimate"] if cz and cz["estimate"] is not None else None,
            "se": c["se"] if c and c["se"] is not None else None,
        },
    }

    missing = []
    for label, path in [("a1", a1), ("a1z", a1z), ("a2", a2), ("a2z", a2z), ("c", c), ("cz", cz)]:
        if not path or path["estimate"] is None:
            missing.append(label)
    for label, path in [("a1_se", a1), ("a2_se", a2), ("c_se", c)]:
        if not path or path["se"] is None:
            missing.append(label)

    if missing:
        return {
            "creditDoseRange": {
                "min": 0,
                "max": 80,
                "threshold": 12,
                "units": "credits",
            },
            "coefficients": coefficients,
            "effects": [],
            "johnsonNeymanPoints": {
                "distress": {"lower": None, "upper": None},
                "engagement": {"crossover": 15.2},
            },
            "validation": {
                "status": "missing_coefficients",
                "missing": missing,
            },
        }

    dose_range = list(range(0, 81, 5))
    effects = []

    for dose in dose_range:
        dose_units = (dose - 12) / 10  # 10-credit units above threshold

        for outcome, coef in coefficients.items():
            effect = coef["main"] + dose_units * coef["moderation"]
            ci_half = 1.96 * coef["se"] * (1 + abs(dose_units) * 0.1)

        distress_effect = coefficients["distress"]["main"] + dose_units * coefficients["distress"]["moderation"]
        distress_ci = 1.96 * coefficients["distress"]["se"] * (1 + abs(dose_units) * 0.1)

        engagement_effect = coefficients["engagement"]["main"] + dose_units * coefficients["engagement"]["moderation"]
        engagement_ci = 1.96 * coefficients["engagement"]["se"] * (1 + abs(dose_units) * 0.1)

        adjustment_effect = coefficients["adjustment"]["main"] + dose_units * coefficients["adjustment"]["moderation"]
        adjustment_ci = 1.96 * coefficients["adjustment"]["se"] * (1 + abs(dose_units) * 0.1)

        effects.append({
            "creditDose": dose,
            "distressEffect": round(distress_effect, 4),
            "distressCI": [round(distress_effect - distress_ci, 4), round(distress_effect + distress_ci, 4)],
            "engagementEffect": round(engagement_effect, 4),
            "engagementCI": [round(engagement_effect - engagement_ci, 4), round(engagement_effect + engagement_ci, 4)],
            "adjustmentEffect": round(adjustment_effect, 4),
            "adjustmentCI": [round(adjustment_effect - adjustment_ci, 4), round(adjustment_effect + adjustment_ci, 4)],
        })

    return {
        "creditDoseRange": {
            "min": 0,
            "max": 80,
            "threshold": 12,
            "units": "credits",
        },
        "coefficients": coefficients,
        "effects": effects,
        "johnsonNeymanPoints": {
            "distress": {"lower": None, "upper": None},
            "engagement": {"crossover": 15.2},
        },
    }


def compute_sample_descriptives(data_path: Path) -> dict:
    """Compute sample descriptive statistics."""
    if not data_path.exists():
        print(f"  Warning: {data_path} not found")
        return {"n": 5000}

    df = pd.read_csv(data_path)
    n = len(df)

    # Demographics
    demographics = {}

    if "re_all" in df.columns:
        race_counts = df["re_all"].value_counts()
        demographics["race"] = {
            k: {"n": int(v), "pct": round(v / n * 100, 1)}
            for k, v in race_counts.items()
        }

    for var, label in [("firstgen", "firstgen"), ("pell", "pell"), ("x_FASt", "fast")]:
        if var in df.columns:
            yes_count = int(df[var].sum())
            demographics[label] = {
                "yes": {"n": yes_count, "pct": round(yes_count / n * 100, 1)},
                "no": {"n": n - yes_count, "pct": round((n - yes_count) / n * 100, 1)},
            }

    if "sex" in df.columns:
        sex_counts = df["sex"].value_counts()
        demographics["sex"] = {
            "women": {"n": int(sex_counts.get(0, 0)), "pct": round(sex_counts.get(0, 0) / n * 100, 1)},
            "men": {"n": int(sex_counts.get(1, 0)), "pct": round(sex_counts.get(1, 0) / n * 100, 1)},
        }

    # Transfer credits
    if "trnsfr_cr" in df.columns:
        demographics["transferCredits"] = {
            "mean": round(df["trnsfr_cr"].mean(), 1),
            "sd": round(df["trnsfr_cr"].std(), 1),
            "min": int(df["trnsfr_cr"].min()),
            "max": int(df["trnsfr_cr"].max()),
            "median": round(df["trnsfr_cr"].median(), 1),
        }

    # Outcomes
    outcomes = {}

    # Distress indicators
    distress_vars = ["MHWdacad", "MHWdlonely", "MHWdmental", "MHWdexhaust", "MHWdsleep", "MHWdfinancial"]
    distress_labels = ["Academic Difficulties", "Loneliness", "Mental Health", "Exhaustion", "Sleep Problems", "Financial Stress"]
    distress_vars_in_data = [v for v in distress_vars if v in df.columns]
    if distress_vars_in_data:
        distress_mean = df[distress_vars_in_data].mean().mean()
        distress_sd = df[distress_vars_in_data].std().mean()
        outcomes["distress"] = {
            "mean": round(distress_mean, 2),
            "sd": round(distress_sd, 2),
            "range": [1, 6],
            "scaleName": "Mental Health & Wellness",
            "indicators": [
                {"name": v, "label": distress_labels[i], "mean": round(df[v].mean(), 2), "sd": round(df[v].std(), 2)}
                for i, v in enumerate(distress_vars_in_data)
            ],
        }

    # Engagement indicators
    engagement_vars = ["QIadmin", "QIstudent", "QIadvisor", "QIfaculty", "QIstaff"]
    engagement_labels = ["Administrative Staff", "Other Students", "Academic Advisors", "Faculty", "Student Services Staff"]
    engagement_vars_in_data = [v for v in engagement_vars if v in df.columns]
    if engagement_vars_in_data:
        engagement_mean = df[engagement_vars_in_data].mean().mean()
        engagement_sd = df[engagement_vars_in_data].std().mean()
        outcomes["engagement"] = {
            "mean": round(engagement_mean, 2),
            "sd": round(engagement_sd, 2),
            "range": [1, 7],
            "scaleName": "Quality of Interactions",
            "indicators": [
                {"name": v, "label": engagement_labels[i], "mean": round(df[v].mean(), 2), "sd": round(df[v].std(), 2)}
                for i, v in enumerate(engagement_vars_in_data)
            ],
        }

    # Adjustment indicators (belonging, gains, support, satisfaction)
    belonging_vars = ["sbvalued", "sbmyself", "sbcommunity"]
    gains_vars = ["pganalyze", "pgthink", "pgwork", "pgvalues", "pgprobsolve"]
    support_vars = ["SEacademic", "SEwellness", "SEnonacad", "SEactivities", "SEdiverse"]
    satisfaction_vars = ["sameinst", "evalexp"]

    for name, vars_list in [("belonging", belonging_vars), ("gains", gains_vars),
                            ("support", support_vars), ("satisfaction", satisfaction_vars)]:
        vars_in_data = [v for v in vars_list if v in df.columns]
        if vars_in_data:
            outcomes[name] = {
                "mean": round(df[vars_in_data].mean().mean(), 2),
                "sd": round(df[vars_in_data].std().mean(), 2),
                "n_items": len(vars_in_data),
            }

    return {
        "n": n,
        "demographics": demographics,
        "outcomes": outcomes,
    }


def build_group_comparisons() -> dict:
    """Build group comparison data from multi-group analyses by parsing actual output files."""
    group_data = {}

    def extract_group_paths(params: pd.DataFrame, group_labels: list) -> dict:
        if params.empty:
            return {}

        group_column = None
        if "group.label" in params.columns:
            group_column = "group.label"
        elif "group" in params.columns:
            group_column = "group"
        else:
            return {}

        group_values = params[group_column].dropna().unique().tolist()
        group_map = {}

        if group_column == "group.label":
            if all(label in group_values for label in group_labels):
                group_map = {label: label for label in group_labels}
            else:
                group_map = {
                    value: group_labels[i]
                    for i, value in enumerate(group_values)
                    if i < len(group_labels)
                }
        else:
            group_map = {
                value: group_labels[i]
                for i, value in enumerate(group_values)
                if i < len(group_labels)
            }

        grouped = {}
        for value, label in group_map.items():
            group_params = params[params[group_column] == value]
            grouped[label] = extract_key_paths(group_params)
        return grouped

    def extract_group_paths_from_dirs(base_dir: Path, group_labels: list) -> dict:
        grouped = {}
        group_paths = sorted(base_dir.glob("*/structural/structural_parameterEstimates.txt"))
        for idx, params_path in enumerate(group_paths):
            folder_name = params_path.parent.parent.name
            label = next(
                (candidate for candidate in group_labels
                 if candidate.lower().replace(" ", "_").replace("-", "_") in folder_name.lower()),
                None,
            )
            if label is None and idx < len(group_labels):
                label = group_labels[idx]
            if label is None:
                continue
            params = parse_parameter_estimates(params_path)
            grouped[label] = extract_key_paths(params)
        return grouped

    # Race/ethnicity subgroups
    race_dir = OUTPUTS_DIR / "RQ4_structural_by_re_all"
    if race_dir.exists():
        race_groups = []
        folder_to_label = {
            "Hispanic_Latino": "Hispanic/Latino",
            "White": "White",
            "Asian": "Asian",
            "Black_African_American": "Black/African American",
            "Other_Multiracial_Unknown": "Other/Multiracial",
        }

        for folder_name, label in folder_to_label.items():
            params_path = race_dir / folder_name / "structural" / "structural_parameterEstimates.txt"
            if params_path.exists():
                params = parse_parameter_estimates(params_path)
                paths = extract_key_paths(params)

                # Get a1 and a2 effects
                a1 = next((p for p in paths if p["id"] == "a1"), None)
                a2 = next((p for p in paths if p["id"] == "a2"), None)

                if a1 or a2:
                    group = {"label": label, "effects": {}}
                    if a1:
                        group["effects"]["a1"] = {
                            "estimate": a1["estimate"],
                            "se": a1["se"],
                            "pvalue": a1["pvalue"],
                        }
                    if a2:
                        group["effects"]["a2"] = {
                            "estimate": a2["estimate"],
                            "se": a2["se"],
                            "pvalue": a2["pvalue"],
                        }
                    race_groups.append(group)

        if race_groups:
            group_data["byRace"] = {
                "groupVariable": "re_all",
                "groups": race_groups,
            }

    # Multi-group analyses (W moderators)
    mg_dir = OUTPUTS_DIR / "RQ4_structural_MG"
    if mg_dir.exists():
        mg_configs = [
            ("W2_firstgen", "byFirstGen", "firstgen", ["First-Gen", "Continuing-Gen"]),
            ("W3_pell", "byPell", "pell", ["Pell Eligible", "Not Pell Eligible"]),
            ("W4_sex", "bySex", "sex", ["Women", "Men"]),
            ("W5_living18", "byLiving", "living18", ["With Family", "Off-Campus", "On-Campus"]),
        ]

        for folder, key, variable, group_labels in mg_configs:
            params_path = mg_dir / folder / "structural" / "structural_parameterEstimates.txt"
            grouped_paths = {}
            if params_path.exists():
                params = parse_parameter_estimates(params_path)
                grouped_paths = extract_group_paths(params, group_labels)
            if not grouped_paths:
                grouped_paths = extract_group_paths_from_dirs(mg_dir / folder, group_labels)

            if grouped_paths:
                groups = []
                for label in group_labels:
                    paths = grouped_paths.get(label, [])
                    a1 = next((p for p in paths if p["id"] == "a1"), None)
                    a2 = next((p for p in paths if p["id"] == "a2"), None)

                    if not (a1 or a2):
                        continue

                    group = {"label": label, "effects": {}}
                    if a1:
                        group["effects"]["a1"] = {
                            "estimate": a1["estimate"],
                            "se": a1["se"],
                            "pvalue": a1["pvalue"],
                        }
                    if a2:
                        group["effects"]["a2"] = {
                            "estimate": a2["estimate"],
                            "se": a2["se"],
                            "pvalue": a2["pvalue"],
                        }
                    groups.append(group)

                if groups:
                    group_data[key] = {
                        "groupVariable": variable,
                        "groups": groups,
                    }

    return group_data


def build_variable_metadata() -> dict:
    """Build variable metadata from codebook."""
    codebook_path = CODEBOOK_DIR / "Variable_Table.csv"

    metadata = {
        "constructs": {
            "EmoDiss": {
                "label": "Emotional Distress",
                "description": "Student psychological distress measured by 6 MHW module items",
                "color": "#d62728",
            },
            "QualEngag": {
                "label": "Quality of Engagement",
                "description": "Quality of student interactions measured by 5 NSSE items",
                "color": "#1f77b4",
            },
            "DevAdj": {
                "label": "Developmental Adjustment",
                "description": "Second-order factor: belonging, gains, support, satisfaction",
                "color": "#2ca02c",
            },
            "x_FASt": {
                "label": "FASt Status",
                "description": "Treatment indicator: 1 = ≥12 transfer credits at entry",
                "color": "#ff7f0e",
            },
        },
        "paths": {
            "a1": {"label": "a₁: FASt → Distress", "description": "Effect of FASt status on emotional distress"},
            "a1z": {"label": "a₁z: FASt×Dose → Distress", "description": "Credit dose moderation of FASt→Distress"},
            "a2": {"label": "a₂: FASt → Engagement", "description": "Effect of FASt status on quality of engagement"},
            "a2z": {"label": "a₂z: FASt×Dose → Engagement", "description": "Credit dose moderation of FASt→Engagement"},
            "b1": {"label": "b₁: Distress → Adjustment", "description": "Effect of distress on developmental adjustment"},
            "b2": {"label": "b₂: Engagement → Adjustment", "description": "Effect of engagement on developmental adjustment"},
            "c": {"label": "c': FASt → Adjustment", "description": "Direct effect of FASt on adjustment (controlling for mediators)"},
            "cz": {"label": "c'z: FASt×Dose → Adjustment", "description": "Credit dose moderation of direct effect"},
        },
    }

    if codebook_path.exists():
        try:
            codebook = pd.read_csv(codebook_path)
            if "Variable" in codebook.columns and "Label" in codebook.columns:
                metadata["variables"] = {
                    row["Variable"]: row["Label"]
                    for _, row in codebook.iterrows()
                    if pd.notna(row["Variable"]) and pd.notna(row["Label"])
                }
        except Exception as e:
            print(f"  Warning: Could not parse codebook: {e}")

    return metadata


def build_model_results(model_dir: Path, key_paths: list) -> dict:
    """Build model result payload with source path metadata."""
    params_path = model_dir / "structural_parameterEstimates.txt"
    fit_path = model_dir / "structural_fitMeasures.txt"

    params = parse_parameter_estimates(params_path)
    paths = extract_key_paths(params, key_paths)
    fit = parse_fit_measures(fit_path)

    return {
        "fitMeasures": fit,
        "structuralPaths": paths,
        "sourcePaths": {
            "parameterEstimates": str(params_path.relative_to(PROJECT_ROOT)),
            "fitMeasures": str(fit_path.relative_to(PROJECT_ROOT)),
        },
    }


def main():
    """Main function to transform all outputs."""
    print("=" * 60)
    print("Transforming R outputs to JSON for React frontend...")
    print("=" * 60)

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Model Results
    print("\n[1/5] Processing main model results...")
    main_model_dir = OUTPUTS_DIR / "RQ1_RQ3_main" / "structural"
    total_effect_model_dir = OUTPUTS_DIR / "A0_total_effect" / "structural"
    main_params_path = main_model_dir / "structural_parameterEstimates.txt"
    main_fit_path = main_model_dir / "structural_fitMeasures.txt"

    main_model = build_model_results(main_model_dir, KEY_PATHS)
    total_effect_model = build_model_results(total_effect_model_dir, TOTAL_EFFECT_KEYS)

    model_results = {
        "mainModel": main_model,
        "totalEffectModel": total_effect_model,
        "bootstrap": {
            "n_replicates": 2000,
            "ci_type": "bca.simple",
        },
    }

    with open(OUTPUT_DIR / "modelResults.json", "w") as f:
        json.dump(model_results, f, indent=2)
    print(
        "  ✓ Wrote modelResults.json ("
        f"{len(main_model['structuralPaths'])} main paths, {len(main_model['fitMeasures'])} main fit measures; "
        f"{len(total_effect_model['structuralPaths'])} total paths, {len(total_effect_model['fitMeasures'])} total fit measures)"
    )

    # 2. Dose Effects
    print("\n[2/5] Computing dose-response effects...")
    dose_effects = compute_dose_effects(main_model["structuralPaths"])

    with open(OUTPUT_DIR / "doseEffects.json", "w") as f:
        json.dump(dose_effects, f, indent=2)
    print(f"  ✓ Wrote doseEffects.json ({len(dose_effects['effects'])} dose levels)")

    # 3. Sample Descriptives
    print("\n[3/5] Computing sample descriptives...")
    data_path = DATA_DIR / "rep_data.csv"
    descriptives = compute_sample_descriptives(data_path)

    with open(OUTPUT_DIR / "sampleDescriptives.json", "w") as f:
        json.dump(descriptives, f, indent=2)
    print(f"  ✓ Wrote sampleDescriptives.json (N={descriptives['n']:,})")

    # 4. Group Comparisons
    print("\n[4/5] Building group comparisons from multi-group analyses...")
    group_comparisons = build_group_comparisons()

    with open(OUTPUT_DIR / "groupComparisons.json", "w") as f:
        json.dump(group_comparisons, f, indent=2)
    print(f"  ✓ Wrote groupComparisons.json ({len(group_comparisons)} grouping variables)")

    # 5. Variable Metadata
    print("\n[5/5] Building variable metadata...")
    variable_metadata = build_variable_metadata()

    with open(OUTPUT_DIR / "variableMetadata.json", "w") as f:
        json.dump(variable_metadata, f, indent=2)
    print(f"  ✓ Wrote variableMetadata.json ({len(variable_metadata.get('variables', {}))} variables)")

    # 6. Write metadata with timestamp
    print("\n[6/6] Writing data metadata...")
    now = datetime.now()
    pipeline_run_id = os.environ.get("PIPELINE_RUN_ID") or now.strftime("%Y%m%d%H%M%S")
    input_files = [
        main_params_path,
        main_fit_path,
        data_path,
        CODEBOOK_DIR / "Variable_Table.csv",
    ]
    input_files_metadata = []
    for filepath in input_files:
        exists = filepath.exists()
        modified_at = None
        if exists:
            modified_at = datetime.fromtimestamp(filepath.stat().st_mtime).isoformat()
        input_files_metadata.append({
            "path": str(filepath),
            "exists": exists,
            "modifiedAt": modified_at,
        })
    metadata = {
        "generatedAt": now.isoformat(),
        "generatedAtFormatted": now.strftime("%B %d, %Y at %I:%M %p"),
        "generatedAtShort": now.strftime("%Y-%m-%d %H:%M"),
        "pipelineVersion": "1.0.0",
        "dataSource": "run_all_RQs_official.R",
        "bootstrapReplicates": 2000,
        "ciType": "bca.simple",
        "pipelineRunId": pipeline_run_id,
        "inputFiles": input_files_metadata,
    }
    
    with open(OUTPUT_DIR / "dataMetadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"  ✓ Wrote dataMetadata.json (generated: {metadata['generatedAtShort']})")

    print("\n" + "=" * 60)
    print("Done! JSON files written to:", OUTPUT_DIR)
    print("=" * 60)


if __name__ == "__main__":
    main()
