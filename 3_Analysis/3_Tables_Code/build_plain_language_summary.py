#!/usr/bin/env python3
"""
Build Plain Language Summary (DOCX) from SEM analysis results.

Generates an APA 7 formatted document summarizing key findings in accessible language
for non-technical audiences (e.g., dissertation committee, stakeholders, policymakers).

Usage:
    python build_plain_language_summary.py --outdir <results_dir> --out <output_dir>

Output: Plain_Language_Summary.docx
"""

import argparse
from pathlib import Path
from datetime import datetime

try:
    from docx import Document
    from docx.document import Document as DocumentClass
    from docx.shared import Pt, Inches
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False
    DocumentClass = None  # type: ignore[misc,assignment]
    print("Warning: python-docx not installed. Install with: pip install python-docx")

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False


def add_heading(doc: "DocumentClass", text: str, level: int = 1) -> None:
    """Add a heading with consistent formatting."""
    heading = doc.add_heading(text, level=level)
    if hasattr(heading, 'runs') and heading.runs:
        heading.runs[0].font.name = 'Times New Roman'


def add_paragraph(doc: "DocumentClass", text: str, bold: bool = False, italic: bool = False) -> None:
    """Add a paragraph with optional formatting."""
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)


def load_bootstrap_results(outdir: Path) -> "pd.DataFrame | None":
    """Load bootstrap results if available."""
    if not HAS_PANDAS:
        return None
    
    # Try multiple possible locations
    candidates = [
        outdir / "bootstrap_results.csv",
        outdir / "RQ1_RQ3_main" / "structural" / "structural_parameterEstimates.txt",
    ]
    
    for path in candidates:
        if path.exists():
            try:
                if path.suffix == '.txt':
                    return pd.read_csv(path, sep='\t')
                return pd.read_csv(path)
            except Exception:
                continue
    return None


def format_effect(est: float, ci_lower: float, ci_upper: float, sig: bool) -> str:
    """Format an effect size with CI and significance indicator."""
    sig_marker = "*" if sig else ""
    return f"β = {est:.3f}{sig_marker}, 95% CI [{ci_lower:.3f}, {ci_upper:.3f}]"


def build_summary(doc: "DocumentClass", outdir: Path, B: int, ci_type: str) -> None:
    """Build the plain language summary content."""
    
    # Title
    title = doc.add_heading("Plain Language Summary of Findings", level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Metadata
    add_paragraph(doc, f"Generated: {datetime.now().strftime('%B %d, %Y')}", italic=True)
    add_paragraph(doc, f"Analysis: Bootstrap replicates = {B:,}, CI type = {ci_type}", italic=True)
    doc.add_paragraph()
    
    # Study Overview
    add_heading(doc, "Study Overview", level=1)
    add_paragraph(doc, 
        "This study examined the psychosocial effects of accelerated dual credit participation "
        "(FASt status) on first-year developmental adjustment among equity-impacted California "
        "community college students. The analysis used conditional-process structural equation "
        "modeling (SEM) with propensity score weighting to estimate causal effects."
    )
    doc.add_paragraph()
    
    # Key Constructs
    add_heading(doc, "Key Constructs", level=1)
    
    constructs = [
        ("Treatment (X)", "FASt status — students who matriculated with ≥12 transferable credits"),
        ("Moderator (Z)", "Credit dose — the number of dual credit units earned, centered"),
        ("Mediator 1", "Emotional Distress (EmoDiss) — academic stress, loneliness, mental health challenges"),
        ("Mediator 2", "Quality of Engagement (QualEngag) — meaningful interactions with faculty, staff, peers"),
        ("Outcome (Y)", "Developmental Adjustment (DevAdj) — sense of belonging, perceived gains, satisfaction"),
    ]
    
    for label, description in constructs:
        p = doc.add_paragraph()
        p.add_run(f"{label}: ").bold = True
        p.add_run(description)
    
    doc.add_paragraph()
    
    # Load results if available
    bootstrap_df = load_bootstrap_results(outdir)
    
    # Key Findings
    add_heading(doc, "Key Findings", level=1)
    
    if bootstrap_df is not None and not bootstrap_df.empty:
        add_paragraph(doc, "Results from the structural model:", bold=True)
        doc.add_paragraph()
        
        # TODO: Extract and format key findings from bootstrap_df
        # This is a stub - replace with actual effect extraction
        add_paragraph(doc, 
            "[Placeholder: Extract total effect of FASt status on DevAdj]"
        )
        add_paragraph(doc, 
            "[Placeholder: Extract indirect effects through EmoDiss and QualEngag]"
        )
        add_paragraph(doc, 
            "[Placeholder: Extract moderated mediation indices]"
        )
    else:
        add_paragraph(doc, 
            "Bootstrap results not found. Run the full analysis pipeline to generate findings.",
            italic=True
        )
    
    doc.add_paragraph()
    
    # Practical Implications
    add_heading(doc, "Practical Implications", level=1)
    add_paragraph(doc, 
        "[Placeholder: Summarize what these findings mean for policy and practice. "
        "Consider implications for dual credit program design, student support services, "
        "and equity-focused interventions.]"
    )
    doc.add_paragraph()
    
    # Limitations
    add_heading(doc, "Limitations", level=1)
    add_paragraph(doc, 
        "[Placeholder: Note key limitations such as observational design, "
        "generalizability constraints, measurement considerations, etc.]"
    )
    doc.add_paragraph()
    
    # Technical Notes
    add_heading(doc, "Technical Notes", level=1)
    add_paragraph(doc, 
        "This summary is derived from a conditional-process structural equation model "
        "estimated using lavaan in R. Propensity score overlap weights were used to "
        "reduce selection bias. Bootstrap confidence intervals were computed to assess "
        "statistical significance of indirect and conditional effects.",
        italic=True
    )


def main():
    parser = argparse.ArgumentParser(description='Build plain language summary document')
    parser.add_argument('--outdir', type=str, required=True, 
                        help='Input directory with results data (raw/ folder)')
    parser.add_argument('--out', type=str, default=None, 
                        help='Output directory for docx (default: same as outdir)')
    parser.add_argument('--B', type=int, default=2000, 
                        help='Bootstrap replicates (for display)')
    parser.add_argument('--ci_type', type=str, default='perc', 
                        help='CI type: bca, perc, norm (for display)')
    args = parser.parse_args()
    
    if not HAS_DOCX:
        print("ERROR: python-docx is required. Install with: pip install python-docx")
        return 1
    
    outdir = Path(args.outdir)
    out_docx_dir = Path(args.out) if args.out else outdir
    out_docx_dir.mkdir(parents=True, exist_ok=True)
    
    # Create document
    doc = Document()
    
    # Set default font
    style = doc.styles['Normal']
    if hasattr(style, 'font') and style.font is not None:  # type: ignore[union-attr]
        style.font.name = 'Times New Roman'  # type: ignore[union-attr]
        style.font.size = Pt(12)  # type: ignore[union-attr]
    
    # Set margins
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
    
    # Build content
    build_summary(doc, outdir, args.B, args.ci_type)
    
    # Save
    out_docx = out_docx_dir / "Plain_Language_Summary.docx"
    doc.save(str(out_docx))
    
    print(f"\n{'='*60}")
    print(f"Wrote: {out_docx}")
    print(f"{'='*60}")
    print("\nNote: This is a STUB document with placeholders.")
    print("      Edit the script to extract actual findings from bootstrap results.")
    
    return 0


if __name__ == "__main__":
    exit(main())
