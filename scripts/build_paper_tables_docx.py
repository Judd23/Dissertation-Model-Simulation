"""Build a single publication-ready Word document of summary tables.

Inputs are read from:
  results/fast_treat_control/official_all_RQs/

Output is written to:
  results/fast_treat_control/official_all_RQs/Paper_Tables_All.docx

Design goals:
- One table per page
- Sequential numbering (Table 1, Table 2, ...)
- Short caption above each table
- APA-ish formatting (readable font size, right-aligned numerics)
- If expected inputs are missing, create a "Missing Output" page listing paths

This script is intentionally robust to small filename/content variations.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import pandas as pd
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Inches, Pt


BASE_DIR = Path("results/fast_treat_control/official_all_RQs")
OUT_DOCX = BASE_DIR / "Paper_Tables_All.docx"


# Track which inputs were actually read (for auditability).
USED_INPUT_PATHS: set[Path] = set()


@dataclass
class TableSpec:
    caption: str
    dataframe: Optional[pd.DataFrame]
    missing_paths: List[Path]


def _exists(p: Path) -> bool:
    return p.exists() and p.is_file()


def read_text_any(path: Path) -> str:
    USED_INPUT_PATHS.add(path)
    return path.read_text(encoding="utf-8", errors="ignore")


def read_table_any(path: Path) -> pd.DataFrame:
    """Read a table from a .txt/.tsv-like file.

    Prefers tab-delimited, falls back to whitespace.
    """
    USED_INPUT_PATHS.add(path)
    try:
        return pd.read_csv(path, sep="\t", dtype=str, keep_default_na=False)
    except Exception:
        return pd.read_csv(path, delim_whitespace=True, dtype=str, keep_default_na=False)


def as_numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def fmt_num(x: object, nd: int = 3) -> str:
    if x is None:
        return ""
    if isinstance(x, str) and x.strip() == "":
        return ""
    try:
        v = float(x)
    except Exception:
        return str(x)

    if math.isnan(v):
        return ""
    if abs(v) >= 1000:
        return f"{v:,.{nd}f}"
    return f"{v:.{nd}f}"


def fmt_p(x: object) -> str:
    try:
        v = float(x)
    except Exception:
        return ""
    if math.isnan(v):
        return ""
    if v < 0.001:
        return "< .001"
    s = f"{v:.3f}"
    if s.startswith("0"):
        s = s[1:]
    return s


def fmt_ci(lo: object, hi: object, nd: int = 3) -> str:
    lo_s = fmt_num(lo, nd=nd)
    hi_s = fmt_num(hi, nd=nd)
    if lo_s == "" and hi_s == "":
        return ""
    return f"[{lo_s}, {hi_s}]"


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    return df


def table_run_log(run_log: Path, psw_stage: Optional[Path]) -> TableSpec:
    missing: List[Path] = []
    rows: List[Tuple[str, str]] = []

    if not _exists(run_log):
        missing.append(run_log)
    else:
        text = read_text_any(run_log).splitlines()
        for line in text:
            if ":" in line:
                k, v = line.split(":", 1)
                k = k.strip()
                v = v.strip()
                if k and v:
                    rows.append((k, v))

    # If the file exists but contains no usable rows, treat it as a failure.
    if _exists(run_log) and not rows:
        missing.append(run_log)

    # Add a short PSW model line if present
    if psw_stage is not None:
        if not _exists(psw_stage):
            missing.append(psw_stage)
        else:
            txt = read_text_any(psw_stage)
            m = re.search(r"PS model:\s*(.+)", txt)
            if m:
                rows.append(("PS model", m.group(1).strip()))

    df = pd.DataFrame(rows, columns=["Field", "Value"]) if rows else None
    return TableSpec(
        caption="Sample/design summary (run metadata and PSW model).",
        dataframe=df,
        missing_paths=missing,
    )


def compute_weight_diagnostics(psw_stage: Path, rep_data_csv: Path) -> TableSpec:
    missing: List[Path] = []

    if not _exists(psw_stage):
        missing.append(psw_stage)
        return TableSpec(
            caption="Weight diagnostics (distribution + effective sample size).",
            dataframe=None,
            missing_paths=missing,
        )

    txt = read_text_any(psw_stage)

    # Parse the 6-number summary block if present (Min, 1st Qu., Median, Mean, 3rd Qu., Max.)
    summary_vals = {}
    summary_match = re.search(
        r"Weights summary \(non-missing\):\s*\n\s*Min\.[^\n]*\n\s*([0-9eE+\-.]+)\s+([0-9eE+\-.]+)\s+([0-9eE+\-.]+)\s+([0-9eE+\-.]+)\s+([0-9eE+\-.]+)\s+([0-9eE+\-.]+)",
        txt,
        flags=re.MULTILINE,
    )
    if summary_match:
        summary_vals = {
            "Min": summary_match.group(1),
            "Q1": summary_match.group(2),
            "Median": summary_match.group(3),
            "Mean": summary_match.group(4),
            "Q3": summary_match.group(5),
            "Max": summary_match.group(6),
        }

    ess = None
    if not _exists(rep_data_csv):
        missing.append(rep_data_csv)
    else:
        d = pd.read_csv(rep_data_csv)
        # weight column could be psw
        wcol = "psw" if "psw" in d.columns else None
        if wcol is not None:
            w = pd.to_numeric(d[wcol], errors="coerce").dropna()
            if len(w) > 0:
                ess = (w.sum() ** 2) / (w.pow(2).sum())

    rows = []
    for k in ["Min", "Q1", "Median", "Mean", "Q3", "Max"]:
        if k in summary_vals:
            rows.append((k, fmt_num(summary_vals[k], nd=3)))
    if ess is not None:
        rows.append(("ESS", f"{ess:,.1f}"))

    df = pd.DataFrame(rows, columns=["Diagnostic", "Value"]) if rows else None

    # If expected source exists but produces no usable output, treat as failure.
    if _exists(psw_stage) and (df is None or df.empty):
        missing.append(psw_stage)

    return TableSpec(
        caption="PSW overlap weight diagnostics (distribution and effective sample size).",
        dataframe=df,
        missing_paths=missing,
    )


def table_balance(balance_path: Path) -> TableSpec:
    missing: List[Path] = []
    if not _exists(balance_path):
        missing.append(balance_path)
        return TableSpec(
            caption="Covariate balance (standardized mean differences; unweighted vs PSW-weighted).",
            dataframe=None,
            missing_paths=missing,
        )

    df = read_table_any(balance_path)
    df = normalize_columns(df)
    # format numeric columns
    for col in df.columns:
        if col.lower().startswith("smd"):
            df[col] = as_numeric(df[col]).map(lambda v: fmt_num(v, nd=3) if pd.notna(v) else "")

    if df.empty:
        missing.append(balance_path)
        return TableSpec(
            caption="Covariate balance after PSW overlap weights (SMDs).",
            dataframe=None,
            missing_paths=missing,
        )
    return TableSpec(
        caption="Covariate balance after PSW overlap weights (SMDs).",
        dataframe=df,
        missing_paths=missing,
    )


def table_fit_indices(fit_path: Path, caption: str) -> TableSpec:
    missing: List[Path] = []
    if not _exists(fit_path):
        missing.append(fit_path)
        return TableSpec(caption=caption, dataframe=None, missing_paths=missing)

    df = read_table_any(fit_path)
    df = normalize_columns(df)
    if set(df.columns) >= {"measure", "value"}:
        df = df[["measure", "value"]]
        # keep common indices only, in a nicer order when possible
        keep = [
            "df",
            "chisq",
            "pvalue",
            "cfi",
            "tli",
            "rmsea",
            "srmr",
            "cfi.robust",
            "tli.robust",
            "rmsea.robust",
        ]
        df["measure"] = df["measure"].astype(str)
        df["value"] = df["value"].astype(str)
        df = df[df["measure"].isin(keep)].copy()
        df["_ord"] = df["measure"].apply(lambda m: keep.index(m) if m in keep else 999)
        df = df.sort_values(["_ord"]).drop(columns=["_ord"])
        df.rename(columns={"measure": "Index", "value": "Value"}, inplace=True)
        df["Value"] = as_numeric(df["Value"]).map(lambda v: fmt_num(v, nd=3) if pd.notna(v) else "")

    if df is None or df.empty:
        missing.append(fit_path)
        return TableSpec(caption=caption, dataframe=None, missing_paths=missing)

    return TableSpec(caption=caption, dataframe=df, missing_paths=missing)


def _extract_paths(df: pd.DataFrame, include_labels: Optional[Sequence[str]] = None) -> pd.DataFrame:
    df = normalize_columns(df)
    needed_cols = {"lhs", "op", "rhs"}
    if not needed_cols.issubset(set(df.columns)):
        return pd.DataFrame()

    d = df.copy()
    d = d[d["op"].astype(str) == "~"].copy()

    if "label" in d.columns:
        d["label"] = d["label"].astype(str)
        d = d[d["label"].str.strip() != ""].copy()
        if include_labels is not None:
            d = d[d["label"].isin(set(include_labels))].copy()

    d["Path"] = d["lhs"].astype(str) + " ~ " + d["rhs"].astype(str)

    out_cols = ["Path"]
    if "label" in d.columns:
        out_cols.append("label")

    for col in ["est", "se", "z", "pvalue", "ci.lower", "ci.upper", "std.all"]:
        if col in d.columns:
            out_cols.append(col)

    d = d[out_cols].copy()

    # Friendly renames
    rename = {
        "label": "Label",
        "est": "Estimate",
        "se": "SE",
        "z": "z",
        "pvalue": "p",
        "std.all": "Std (all)",
    }
    d.rename(columns=rename, inplace=True)

    if "p" in d.columns:
        d["p"] = as_numeric(d["p"]).map(fmt_p)
    if "Estimate" in d.columns:
        d["Estimate"] = as_numeric(d["Estimate"]).map(lambda v: fmt_num(v, nd=3) if pd.notna(v) else "")
    if "SE" in d.columns:
        d["SE"] = as_numeric(d["SE"]).map(lambda v: fmt_num(v, nd=3) if pd.notna(v) else "")
    if "z" in d.columns:
        d["z"] = as_numeric(d["z"]).map(lambda v: fmt_num(v, nd=3) if pd.notna(v) else "")
    if "Std (all)" in d.columns:
        d["Std (all)"] = as_numeric(d["Std (all)"].map(lambda v: v)).map(
            lambda v: fmt_num(v, nd=3) if pd.notna(v) else ""
        )

    if "ci.lower" in d.columns and "ci.upper" in d.columns:
        lo = d["ci.lower"].copy()
        hi = d["ci.upper"].copy()
        d["95% CI"] = [fmt_ci(a, b, nd=3) for a, b in zip(lo, hi)]
        d.drop(columns=["ci.lower", "ci.upper"], inplace=True)

    return d


def _extract_defined(df: pd.DataFrame) -> pd.DataFrame:
    df = normalize_columns(df)
    if not {"lhs", "op"}.issubset(df.columns):
        return pd.DataFrame()
    d = df.copy()
    d = d[d["op"].astype(str) == ":="].copy()
    if d.empty:
        return d

    d.rename(
        columns={
            "lhs": "Defined parameter",
            "est": "Estimate",
            "se": "SE",
            "z": "z",
            "pvalue": "p",
            "std.all": "Std (all)",
        },
        inplace=True,
    )
    keep = [c for c in ["Defined parameter", "Estimate", "SE", "z", "p", "ci.lower", "ci.upper"] if c in d.columns]
    d = d[keep].copy()

    if "p" in d.columns:
        d["p"] = as_numeric(d["p"]).map(fmt_p)
    if "Estimate" in d.columns:
        d["Estimate"] = as_numeric(d["Estimate"]).map(lambda v: fmt_num(v, nd=3) if pd.notna(v) else "")
    if "SE" in d.columns:
        d["SE"] = as_numeric(d["SE"]).map(lambda v: fmt_num(v, nd=3) if pd.notna(v) else "")
    if "z" in d.columns:
        d["z"] = as_numeric(d["z"]).map(lambda v: fmt_num(v, nd=3) if pd.notna(v) else "")

    if "ci.lower" in d.columns and "ci.upper" in d.columns:
        d["95% CI"] = [fmt_ci(a, b, nd=3) for a, b in zip(d["ci.lower"], d["ci.upper"])]
        d.drop(columns=["ci.lower", "ci.upper"], inplace=True)

    return d


def table_structural_paths(pe_path: Path, caption: str, include_labels: Optional[Sequence[str]] = None) -> TableSpec:
    missing: List[Path] = []
    if not _exists(pe_path):
        missing.append(pe_path)
        return TableSpec(caption=caption, dataframe=None, missing_paths=missing)

    df = read_table_any(pe_path)
    d = _extract_paths(df, include_labels=include_labels)
    if d is None or d.empty:
        missing.append(pe_path)
        return TableSpec(caption=caption, dataframe=None, missing_paths=missing)
    return TableSpec(caption=caption, dataframe=d, missing_paths=missing)


def table_defined_params(pe_path: Path, caption: str) -> TableSpec:
    missing: List[Path] = []
    if not _exists(pe_path):
        missing.append(pe_path)
        return TableSpec(caption=caption, dataframe=None, missing_paths=missing)

    df = read_table_any(pe_path)
    d = _extract_defined(df)
    if d is None or d.empty:
        missing.append(pe_path)
        return TableSpec(caption=caption, dataframe=None, missing_paths=missing)
    return TableSpec(caption=caption, dataframe=d, missing_paths=missing)


def table_total_effect(pe_path: Path) -> TableSpec:
    # try to extract c_total row(s)
    missing: List[Path] = []
    if not _exists(pe_path):
        missing.append(pe_path)
        return TableSpec(
            caption="Total effect model (Eq. 1): DevAdj ~ x_DE (total effect).",
            dataframe=None,
            missing_paths=missing,
        )

    df = read_table_any(pe_path)
    df = normalize_columns(df)
    if "label" in df.columns:
        df = df[df["label"].astype(str).isin({"c_total"})].copy()
    d = _extract_paths(df)
    if d is None or d.empty:
        missing.append(pe_path)
        return TableSpec(
            caption="Total effect (Eq. 1): estimated total effect of x_DE on DevAdj.",
            dataframe=None,
            missing_paths=missing,
        )
    return TableSpec(
        caption="Total effect (Eq. 1): estimated total effect of x_DE on DevAdj.",
        dataframe=d,
        missing_paths=missing,
    )


def table_invariance_for_W(by_w_dir: Path, w_name: str) -> List[TableSpec]:
    specs: List[TableSpec] = []

    deltas = by_w_dir / "fit_change_deltas.txt"
    stack = by_w_dir / "fit_index_stack.txt"

    missing: List[Path] = []
    df_deltas = None
    df_stack = None

    if _exists(deltas):
        df_deltas = read_table_any(deltas)
        df_deltas = normalize_columns(df_deltas)
        for col in ["delta_cfi", "delta_rmsea", "delta_srmr"]:
            if col in df_deltas.columns:
                df_deltas[col] = as_numeric(df_deltas[col]).map(lambda v: fmt_num(v, nd=3) if pd.notna(v) else "")
    else:
        missing.append(deltas)

    if _exists(stack):
        df_stack = read_table_any(stack)
        df_stack = normalize_columns(df_stack)
        # reshape to wide: one row per model
        if set(df_stack.columns) >= {"model", "measure", "value"}:
            wide = df_stack.pivot_table(index="model", columns="measure", values="value", aggfunc="first").reset_index()
            # keep common indices
            keep = ["model", "df", "chisq", "cfi", "tli", "rmsea", "srmr"]
            cols = [c for c in keep if c in wide.columns]
            wide = wide[cols].copy()
            for col in ["df", "chisq", "cfi", "tli", "rmsea", "srmr"]:
                if col in wide.columns:
                    wide[col] = as_numeric(wide[col]).map(lambda v: fmt_num(v, nd=3) if pd.notna(v) else "")
            wide.rename(columns={"model": "Model"}, inplace=True)
            df_stack = wide
    else:
        missing.append(stack)

    specs.append(
        TableSpec(
            caption=f"Measurement invariance by {w_name}: fit indices (configural/metric/scalar).",
            dataframe=df_stack if df_stack is not None and not df_stack.empty else None,
            missing_paths=[stack] if (stack in missing or df_stack is None or (hasattr(df_stack, "empty") and df_stack.empty)) else [],
        )
    )
    specs.append(
        TableSpec(
            caption=f"Measurement invariance by {w_name}: Δfit between nested models.",
            dataframe=df_deltas if df_deltas is not None and not df_deltas.empty else None,
            missing_paths=[deltas] if (deltas in missing or df_deltas is None or (hasattr(df_deltas, "empty") and df_deltas.empty)) else [],
        )
    )

    return specs


def table_mg_structural_for_W(w_dir: Path, w_label: str) -> List[TableSpec]:
    """Group-specific key paths and defined-parameter contrasts for one W."""
    specs: List[TableSpec] = []

    pe_path = w_dir / "structural" / "structural_parameterEstimates.txt"
    ref_path = w_dir / "reference_group.txt"  # expected by spec; may not exist

    def _parse_reference_label(text: str) -> Optional[str]:
        for line in text.splitlines():
            m = re.match(r"\s*reference\s*=\s*(.+)\s*$", line)
            if m:
                return m.group(1).strip()
        # fallback: first non-empty line
        for line in text.splitlines():
            if line.strip():
                return line.strip()
        return None

    ref_label = None
    if _exists(ref_path):
        ref_label = _parse_reference_label(read_text_any(ref_path))
    else:
        # Strict validation: do NOT auto-create. Missing file must be reported.
        specs.append(
            TableSpec(
                caption=f"Multi-group structural model by {w_label}: reference group metadata.",
                dataframe=None,
                missing_paths=[ref_path],
            )
        )

    missing: List[Path] = []
    if not _exists(pe_path):
        missing.append(pe_path)
        specs.append(
            TableSpec(
                caption=f"Multi-group structural model by {w_label}: key paths by group.",
                dataframe=None,
                missing_paths=missing,
            )
        )
        return specs

    df = read_table_any(pe_path)
    df = normalize_columns(df)

    # Key structural labels tend to end with these tokens
    key_tokens = {"a1", "a2", "b1", "b2", "c", "cc", "cz", "a1c", "a1z", "a2c", "a2z"}

    d = df.copy()
    if not {"op", "lhs", "rhs"}.issubset(d.columns):
        return specs

    # group-specific structural paths
    paths = d[d["op"].astype(str) == "~"].copy()
    if "label" in paths.columns:
        paths["label"] = paths["label"].astype(str)
        paths = paths[paths["label"].str.strip() != ""].copy()
        paths["_tok"] = paths["label"].str.extract(r"([A-Za-z0-9]+)\s*$", expand=False)
        paths = paths[paths["_tok"].isin(key_tokens)].copy()

    paths["Path"] = paths["lhs"].astype(str) + " ~ " + paths["rhs"].astype(str)

    out_cols = [c for c in ["group", "Path", "label", "est", "se", "pvalue", "ci.lower", "ci.upper"] if c in paths.columns]
    paths_out = paths[out_cols].copy() if out_cols else pd.DataFrame()
    rename = {"group": "Group", "label": "Label", "est": "Estimate", "se": "SE", "pvalue": "p"}
    paths_out.rename(columns=rename, inplace=True)
    if "Estimate" in paths_out.columns:
        paths_out["Estimate"] = as_numeric(paths_out["Estimate"]).map(lambda v: fmt_num(v, nd=3) if pd.notna(v) else "")
    if "SE" in paths_out.columns:
        paths_out["SE"] = as_numeric(paths_out["SE"]).map(lambda v: fmt_num(v, nd=3) if pd.notna(v) else "")
    if "p" in paths_out.columns:
        paths_out["p"] = as_numeric(paths_out["p"]).map(fmt_p)
    if "ci.lower" in paths_out.columns and "ci.upper" in paths_out.columns:
        paths_out["95% CI"] = [fmt_ci(a, b, nd=3) for a, b in zip(paths_out["ci.lower"], paths_out["ci.upper"])]
        paths_out.drop(columns=["ci.lower", "ci.upper"], inplace=True)

    cap = f"Multi-group structural model by {w_label}: key structural paths by group."
    if ref_label:
        cap += f" Reference group: {ref_label}."

    specs.append(TableSpec(caption=cap, dataframe=paths_out if not paths_out.empty else None, missing_paths=[]))
    if paths_out.empty:
        specs[-1].missing_paths = [pe_path]

    # contrasts/defined parameters
    defs = _extract_defined(df)
    if not defs.empty:
        # try to focus on contrast-like definitions
        mask = defs["Defined parameter"].astype(str).str.contains(r"diff|contrast", case=False, regex=True)
        defs_focus = defs[mask].copy()
        if defs_focus.empty:
            defs_focus = defs
        specs.append(
            TableSpec(
                caption=f"Multi-group structural model by {w_label}: defined parameters (including contrasts where available).",
                dataframe=defs_focus,
                missing_paths=[],
            )
        )
    else:
        specs.append(
            TableSpec(
                caption=f"Multi-group structural model by {w_label}: defined parameters (including contrasts where available).",
                dataframe=None,
                missing_paths=[pe_path],
            )
        )

    return specs


def add_missing_output_page(doc: Document, table_num: int, missing_paths: Sequence[Path]) -> None:
    cap = f"Table {table_num}. Missing Output"
    p = doc.add_paragraph(cap)
    p.runs[0].bold = True

    df = pd.DataFrame({"Missing file": [str(p) for p in missing_paths]})
    add_dataframe_table(doc, df)
    doc.add_page_break()


def set_doc_default_style(doc: Document) -> None:
    style = doc.styles["Normal"]
    style.font.name = "Times New Roman"
    style._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    style.font.size = Pt(12)


def add_dataframe_table(doc: Document, df: pd.DataFrame) -> None:
    df = df.fillna("")
    cols = list(df.columns)

    table = doc.add_table(rows=1, cols=len(cols))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"

    # header
    hdr = table.rows[0].cells
    for j, c in enumerate(cols):
        run = hdr[j].paragraphs[0].add_run(str(c))
        run.bold = True
        hdr[j].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    # rows
    numeric_cols = set()
    for c in cols:
        # heuristically treat typical numeric columns as numeric for alignment
        if re.search(r"(Estimate|SE|Std|CI|Value|df|chisq|cfi|tli|rmsea|srmr|z|p)$", str(c)):
            numeric_cols.add(c)

    for _, row in df.iterrows():
        cells = table.add_row().cells
        for j, c in enumerate(cols):
            txt = str(row[c]) if row[c] is not None else ""
            para = cells[j].paragraphs[0]
            para.text = txt
            if c in numeric_cols:
                para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            else:
                para.alignment = WD_ALIGN_PARAGRAPH.LEFT

    # make columns readable
    for col in table.columns:
        for cell in col.cells:
            for par in cell.paragraphs:
                for run in par.runs:
                    run.font.size = Pt(11)


def add_table_page(doc: Document, table_num: int, caption: str, df: Optional[pd.DataFrame], missing: Sequence[Path]) -> int:
    """Add either the table page, or a Missing Output page if needed."""
    if missing:
        add_missing_output_page(doc, table_num, missing)
        return table_num + 1

    cap = f"Table {table_num}. {caption}"
    p = doc.add_paragraph(cap)
    p.runs[0].bold = True

    if df is None or df.empty:
        # Strict validation: empty tables are treated as missing output.
        add_missing_output_page(doc, table_num, [BASE_DIR / "UNKNOWN_EMPTY_TABLE_SOURCE.txt"])
        return table_num + 1

    add_dataframe_table(doc, df)

    doc.add_page_break()
    return table_num + 1


def main() -> None:
    if not BASE_DIR.exists():
        raise SystemExit(f"Base output directory not found: {BASE_DIR}")

    doc = Document()
    set_doc_default_style(doc)

    table_num = 1

    # ---- RQ1/RQ3 main outputs
    run_log = BASE_DIR / "run_log.txt"
    psw_stage = BASE_DIR / "RQ1_RQ3_main" / "psw_stage_report.txt"
    balance = BASE_DIR / "RQ1_RQ3_main" / "psw_balance_smd.txt"
    rep_data = BASE_DIR / "RQ1_RQ3_main" / "rep_data_with_psw.csv"

    fit_main = BASE_DIR / "RQ1_RQ3_main" / "structural" / "structural_fitMeasures.txt"
    pe_main = BASE_DIR / "RQ1_RQ3_main" / "structural" / "structural_parameterEstimates.txt"

    specs: List[TableSpec] = []
    specs.append(table_run_log(run_log, psw_stage))
    specs.append(table_balance(balance))
    specs.append(compute_weight_diagnostics(psw_stage, rep_data))

    specs.append(table_fit_indices(fit_main, caption="Pooled SEM fit indices (primary parallel mediation model)."))

    key_labels = ["a1", "a2", "b1", "b2", "c", "a1c", "a1z", "a2c", "a2z", "cc", "cz"]
    specs.append(
        table_structural_paths(
            pe_main,
            caption="Pooled SEM structural paths (key labeled coefficients).",
            include_labels=key_labels,
        )
    )
    specs.append(table_defined_params(pe_main, caption="Pooled SEM defined parameters: conditional indirect effects and IMM indices."))

    # ---- Total effect
    pe_total = BASE_DIR / "A0_total_effect" / "structural" / "structural_parameterEstimates.txt"
    specs.append(table_total_effect(pe_total))

    # ---- Serial exploratory
    pe_serial = BASE_DIR / "A1_serial_exploratory" / "structural" / "structural_parameterEstimates.txt"
    specs.append(
        table_structural_paths(
            pe_serial,
            caption="Serial mediation model (exploratory): key labeled structural paths.",
            include_labels=key_labels,
        )
    )
    specs.append(
        table_defined_params(
            pe_serial,
            caption="Serial mediation model (exploratory): defined parameters (indirect effects and indices).",
        )
    )

    # ---- Measurement invariance: per W
    meas_root = BASE_DIR / "RQ4_measurement"
    if meas_root.exists():
        for child in sorted(meas_root.iterdir()):
            if not child.is_dir():
                continue
            if not child.name.startswith("by_"):
                continue
            w_name = child.name.replace("by_", "")
            specs.extend(table_invariance_for_W(child, w_name=w_name))
    else:
        specs.append(
            TableSpec(
                caption="Missing Output",
                dataframe=pd.DataFrame({"Missing file": [str(meas_root)]}),
                missing_paths=[meas_root],
            )
        )

    # ---- Multi-group structural by W
    mg_root = BASE_DIR / "RQ4_structural_MG"
    if mg_root.exists():
        def mg_sort_key(p: Path) -> Tuple[int, str]:
            m = re.match(r"^W(\d+)_", p.name)
            if m:
                return (int(m.group(1)), p.name)
            if p.name.startswith("W_"):
                return (999, p.name)
            return (9999, p.name)

        w_dirs = [p for p in mg_root.iterdir() if p.is_dir() and (p.name.startswith("W") or p.name.startswith("W_"))]
        for w_dir in sorted(w_dirs, key=mg_sort_key):
            w_label = w_dir.name
            specs.extend(table_mg_structural_for_W(w_dir, w_label=w_label))
    else:
        specs.append(
            TableSpec(
                caption="Missing Output",
                dataframe=pd.DataFrame({"Missing file": [str(mg_root)]}),
                missing_paths=[mg_root],
            )
        )

    # ---- Emit pages
    for spec in specs:
        table_num = add_table_page(doc, table_num, spec.caption, spec.dataframe, spec.missing_paths)

    OUT_DOCX.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(OUT_DOCX))
    print(f"Wrote: {OUT_DOCX}")

    # Audit trail: list exactly what inputs were read.
    used = sorted({str(p) for p in USED_INPUT_PATHS})
    print("Inputs used:")
    for p in used:
        print(f"- {p}")


if __name__ == "__main__":
    main()
