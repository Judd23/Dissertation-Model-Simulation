#!/usr/bin/env python3
"""Generate demographic comparison between FASt and non-FASt students."""

import pandas as pd
import json
import sys
from pathlib import Path

def main():
    # Read the dataset
    data_path = Path(__file__).parent.parent.parent / "1_Dataset" / "rep_data.csv"
    output_path = Path(__file__).parent.parent / "public" / "data" / "fastComparison.json"

    print(f"Reading data from: {data_path}")
    df = pd.read_csv(data_path)

    # Create comparison structure
    comparison = {
        "overall": {
            "n": len(df),
            "fast_n": len(df[df['x_FASt'] == 1]),
            "nonfast_n": len(df[df['x_FASt'] == 0])
        },
        "demographics": {}
    }

    # Race/Ethnicity comparison
    race_labels = [
        "Hispanic/Latino",
        "White",
        "Asian",
        "Black/African American",
        "Other/Multiracial/Unknown"
    ]

    comparison["demographics"]["race"] = {}
    for label in race_labels:
        fast = df[(df['x_FASt'] == 1) & (df['re_all'] == label)]
        nonfast = df[(df['x_FASt'] == 0) & (df['re_all'] == label)]

        comparison["demographics"]["race"][label] = {
            "fast": {
                "n": len(fast),
                "pct": round(len(fast) / len(df[df['x_FASt'] == 1]) * 100, 1) if len(df[df['x_FASt'] == 1]) > 0 else 0
            },
            "nonfast": {
                "n": len(nonfast),
                "pct": round(len(nonfast) / len(df[df['x_FASt'] == 0]) * 100, 1) if len(df[df['x_FASt'] == 0]) > 0 else 0
            }
        }

    # First-generation comparison
    comparison["demographics"]["firstgen"] = {}
    for status, label in [(1, "yes"), (0, "no")]:
        fast = df[(df['x_FASt'] == 1) & (df['firstgen'] == status)]
        nonfast = df[(df['x_FASt'] == 0) & (df['firstgen'] == status)]

        comparison["demographics"]["firstgen"][label] = {
            "fast": {
                "n": len(fast),
                "pct": round(len(fast) / len(df[df['x_FASt'] == 1]) * 100, 1) if len(df[df['x_FASt'] == 1]) > 0 else 0
            },
            "nonfast": {
                "n": len(nonfast),
                "pct": round(len(nonfast) / len(df[df['x_FASt'] == 0]) * 100, 1) if len(df[df['x_FASt'] == 0]) > 0 else 0
            }
        }

    # Pell Grant comparison
    comparison["demographics"]["pell"] = {}
    for status, label in [(1, "yes"), (0, "no")]:
        fast = df[(df['x_FASt'] == 1) & (df['pell'] == status)]
        nonfast = df[(df['x_FASt'] == 0) & (df['pell'] == status)]

        comparison["demographics"]["pell"][label] = {
            "fast": {
                "n": len(fast),
                "pct": round(len(fast) / len(df[df['x_FASt'] == 1]) * 100, 1) if len(df[df['x_FASt'] == 1]) > 0 else 0
            },
            "nonfast": {
                "n": len(nonfast),
                "pct": round(len(nonfast) / len(df[df['x_FASt'] == 0]) * 100, 1) if len(df[df['x_FASt'] == 0]) > 0 else 0
            }
        }

    # Sex comparison
    comparison["demographics"]["sex"] = {}
    for status, label in [(1, "women"), (0, "men")]:
        fast = df[(df['x_FASt'] == 1) & (df['sex'] == status)]
        nonfast = df[(df['x_FASt'] == 0) & (df['sex'] == status)]

        comparison["demographics"]["sex"][label] = {
            "fast": {
                "n": len(fast),
                "pct": round(len(fast) / len(df[df['x_FASt'] == 1]) * 100, 1) if len(df[df['x_FASt'] == 1]) > 0 else 0
            },
            "nonfast": {
                "n": len(nonfast),
                "pct": round(len(nonfast) / len(df[df['x_FASt'] == 0]) * 100, 1) if len(df[df['x_FASt'] == 0]) > 0 else 0
            }
        }

    # Transfer credits by group
    fast_students = df[df['x_FASt'] == 1]
    nonfast_students = df[df['x_FASt'] == 0]

    comparison["demographics"]["transferCredits"] = {
        "fast": {
            "mean": round(fast_students['trnsfr_cr'].mean(), 1),
            "sd": round(fast_students['trnsfr_cr'].std(), 1),
            "min": int(fast_students['trnsfr_cr'].min()),
            "max": int(fast_students['trnsfr_cr'].max()),
            "median": round(fast_students['trnsfr_cr'].median(), 1)
        },
        "nonfast": {
            "mean": round(nonfast_students['trnsfr_cr'].mean(), 1),
            "sd": round(nonfast_students['trnsfr_cr'].std(), 1),
            "min": int(nonfast_students['trnsfr_cr'].min()),
            "max": int(nonfast_students['trnsfr_cr'].max()),
            "median": round(nonfast_students['trnsfr_cr'].median(), 1)
        }
    }

    # Write output
    print(f"Writing comparison data to: {output_path}")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(comparison, f, indent=2)

    print(f"✓ Generated FASt comparison data")
    print(f"  - FASt students: {comparison['overall']['fast_n']:,}")
    print(f"  - Non-FASt students: {comparison['overall']['nonfast_n']:,}")

    return 0

if __name__ == "__main__":
    sys.exit(main())
