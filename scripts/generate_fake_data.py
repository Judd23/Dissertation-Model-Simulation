"""Generate a synthetic dataset mirroring the provided R snippet.

This script creates the same columns (including Likert-style ordered categories)
and writes a CSV file (default: fake_data.csv).

Note: Exact random draws will not match R's output byte-for-byte, but the
variable types and distributions mirror the R code.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd


LIKERT4 = [
    "SBmyself",
    "SBvalued",
    "SBcommunity",
    "pgwrite",
    "pgspeak",
    "pgthink",
    "pganalyze",
    "pgwork",
    "SEacademic",
    "SElearnsup",
    "SEdiverse",
    "SEsocial",
    "SEwellness",
    "SEnonacad",
    "SEactivities",
    "SEevents",
]

LIKERT6 = ["MHWdacad", "MHWdlonely", "MHWdmental", "MHWdpeers", "MHWdexhaust"]
LIKERT7 = ["QIstudent", "QIfaculty", "QIadvisor", "QIstaff"]


def _ordered_likert(values: np.ndarray, levels: list[int]) -> pd.Categorical:
    # Store as ordered categorical, similar to ordered factors in R.
    return pd.Categorical(values, categories=levels, ordered=True)


def generate_fake_data(n: int = 1000, seed: int = 1) -> pd.DataFrame:
    """Generate a synthetic dataset.

    Args:
        n: Number of rows.
        seed: Random seed.

    Returns:
        A pandas DataFrame.
    """
    # Use legacy RandomState (MT19937) for broad reproducibility.
    rng = np.random.RandomState(seed)

    df = pd.DataFrame(
        {
            "trnsfr_cr": rng.randint(0, 61, size=n),
            "bchsgrade": rng.normal(size=n),
            "bcsmath": rng.normal(size=n),
            "bcscourses": rng.normal(size=n),
            "bchstudy": rng.normal(size=n),
            "bparented": rng.normal(size=n),
            "firstgen": rng.binomial(1, 0.35, size=n),
            "bdegexp": rng.normal(size=n),
            "bchwork": rng.normal(size=n),
            "bcnonacad": rng.normal(size=n),
            "cohort": rng.binomial(1, 0.5, size=n),
            "SBmyself": rng.randint(1, 5, size=n),
            "SBvalued": rng.randint(1, 5, size=n),
            "SBcommunity": rng.randint(1, 5, size=n),
            "pgwrite": rng.randint(1, 5, size=n),
            "pgspeak": rng.randint(1, 5, size=n),
            "pgthink": rng.randint(1, 5, size=n),
            "pganalyze": rng.randint(1, 5, size=n),
            "pgwork": rng.randint(1, 5, size=n),
            "SEacademic": rng.randint(1, 5, size=n),
            "SElearnsup": rng.randint(1, 5, size=n),
            "SEdiverse": rng.randint(1, 5, size=n),
            "SEsocial": rng.randint(1, 5, size=n),
            "SEwellness": rng.randint(1, 5, size=n),
            "SEnonacad": rng.randint(1, 5, size=n),
            "SEactivities": rng.randint(1, 5, size=n),
            "SEevents": rng.randint(1, 5, size=n),
            "MHWdacad": rng.randint(1, 7, size=n),
            "MHWdlonely": rng.randint(1, 7, size=n),
            "MHWdmental": rng.randint(1, 7, size=n),
            "MHWdpeers": rng.randint(1, 7, size=n),
            "MHWdexhaust": rng.randint(1, 7, size=n),
            "QIstudent": rng.randint(1, 8, size=n),
            "QIfaculty": rng.randint(1, 8, size=n),
            "QIadvisor": rng.randint(1, 8, size=n),
            "QIstaff": rng.randint(1, 8, size=n),
        }
    )

    # Convert Likert-style variables to ordered categoricals.
    for col in LIKERT4:
        df[col] = _ordered_likert(df[col].to_numpy(), levels=[1, 2, 3, 4])
    for col in LIKERT6:
        df[col] = _ordered_likert(df[col].to_numpy(), levels=[1, 2, 3, 4, 5, 6])
    for col in LIKERT7:
        df[col] = _ordered_likert(df[col].to_numpy(), levels=[1, 2, 3, 4, 5, 6, 7])

    return df


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate fake_data.csv")
    parser.add_argument("--n", type=int, default=1000, help="Number of rows")
    parser.add_argument("--seed", type=int, default=1, help="Random seed")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("fake_data.csv"),
        help="Output CSV path",
    )

    args = parser.parse_args()
    df = generate_fake_data(n=args.n, seed=args.seed)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.out, index=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
