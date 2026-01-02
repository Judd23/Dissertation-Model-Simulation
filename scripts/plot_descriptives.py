#!/usr/bin/env python3
"""
Generate descriptive statistics plots for Process-SEM dissertation.
Outputs publication-quality figures for Chapter 4 (Results).

Usage:
    python scripts/plot_descriptives.py [--data rep_data.csv] [--outdir results/descriptive_plots]
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import os
import argparse

# Note for simulated data
SIM_NOTE = "Note: Data simulated to reflect CSU demographics and theorized treatment effects."

def add_sim_note(fig, y_offset=-0.02):
    """Add simulation note to bottom of figure."""
    fig.text(0.5, y_offset, SIM_NOTE, ha='center', va='top', 
             fontsize=8, fontstyle='italic', color='#666666',
             transform=fig.transFigure)

def main(data_path='rep_data.csv', outdir='results/descriptive_plots'):
    os.makedirs(outdir, exist_ok=True)
    
    df = pd.read_csv(data_path)
    plt.style.use('seaborn-v0_8-whitegrid')
    
    # Color palette - CONSISTENT across all figures
    # Distress=RED, Engagement=BLUE, FASt=ORANGE, Credits=YELLOW
    colors = {
        'primary': '#1f77b4',       # Blue (default/engagement)
        'secondary': '#ff7f0e',     # Orange (FASt status)
        'accent': '#2ca02c',        # Green (positive outcomes)
        'highlight': '#d62728',     # Red (distress/negative)
        'neutral': '#7f7f7f',       # Gray
        'distress': '#d62728',      # Red for emotional distress
        'engagement': '#1f77b4',    # Blue for quality engagement
        'fast': '#ff7f0e',          # Orange for FASt status
        'nonfast': '#7f7f7f',       # Gray for Non-FASt
        'credits': '#f0c000',       # Yellow for credit dose
        'belonging': '#2ca02c',     # Green for belonging
        'gains': '#000080',         # Navy for gains
        'support': '#9467bd',       # Purple for support
        'satisfaction': '#8c564b'   # Brown for satisfaction
    }
    
    # =========================================================================
    # FIGURE 1: Demographics Overview
    # =========================================================================
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    
    # 1a. Race/Ethnicity - BLACK bars
    ax = axes[0, 0]
    race_order = ['Hispanic/Latino', 'White', 'Asian', 'Black/African American', 'Other/Multiracial/Unknown']
    race_counts = df['re_all'].value_counts().reindex(race_order)
    bars = ax.barh(race_order, race_counts.values, color='black', edgecolor='white')
    ax.set_xlabel('Count', fontsize=11)
    ax.set_title('Race/Ethnicity Distribution', fontsize=12, fontweight='bold')
    for i, (v, pct) in enumerate(zip(race_counts.values, race_counts.values/len(df)*100)):
        ax.text(v + 20, i, f'{pct:.1f}%', va='center', fontsize=10)
    ax.set_xlim(0, max(race_counts.values) * 1.15)
    
    # 1b. First-gen and Pell status - BLACK bar charts
    ax = axes[0, 1]
    categories = ['First-Gen', 'Pell-Eligible', 'Women', 'FASt Status']
    yes_pct = [df['firstgen'].mean()*100, df['pell'].mean()*100, 
               (df['sex']=='Woman').mean()*100, df['x_FASt'].mean()*100]
    no_pct = [100-p for p in yes_pct]
    x = np.arange(len(categories))
    width = 0.6
    # Black bars for "Yes", gray for "No"
    for i in range(len(categories)):
        ax.bar(x[i], yes_pct[i], width, color='black', label='Yes' if i == 0 else '')
        ax.bar(x[i], no_pct[i], width, bottom=yes_pct[i], color='#cccccc', label='No' if i == 0 else '')
    ax.set_ylabel('Percentage', fontsize=11)
    ax.set_title('Key Demographic Indicators', fontsize=12, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(categories, fontsize=10)
    ax.legend(loc='upper right')
    for i, pct in enumerate(yes_pct):
        ax.text(i, pct/2, f'{pct:.1f}%', ha='center', va='center', color='white', fontweight='bold')
    
    # 1c. Credit dose distribution (use raw trnsfr_cr if available) - YELLOW for credits
    ax = axes[1, 0]
    credit_col = 'trnsfr_cr' if 'trnsfr_cr' in df.columns else 'credit_dose'
    ax.hist(df[credit_col], bins=20, color=colors['credits'], edgecolor='white', alpha=0.8)
    ax.axvline(12, color=colors['fast'], linestyle='--', linewidth=2, label='FASt threshold (12)')  # Orange
    ax.axvline(df[credit_col].mean(), color='#8B4513', linestyle='-', linewidth=2, 
               label=f'Mean ({df[credit_col].mean():.1f})')  # Brown for mean
    ax.set_xlabel('Transfer Credits', fontsize=11)
    ax.set_ylabel('Frequency', fontsize=11)
    ax.set_title('Distribution of Transfer Credits', fontsize=12, fontweight='bold')
    ax.legend()
    
    # 1d. Cohort distribution - BLACK bars
    ax = axes[1, 1]
    cohort_counts = df['cohort'].value_counts().sort_index()
    ax.bar(cohort_counts.index.astype(str), cohort_counts.values, color='black', edgecolor='white')
    ax.set_xlabel('Cohort Year', fontsize=11)
    ax.set_ylabel('Count', fontsize=11)
    ax.set_title('Cohort Distribution', fontsize=12, fontweight='bold')
    for i, v in enumerate(cohort_counts.values):
        ax.text(i, v + 20, f'{v}', ha='center', fontsize=10)
    
    plt.suptitle('Figure 1\nSample Demographics Overview', fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    add_sim_note(fig)
    plt.savefig(f'{outdir}/fig1_demographics.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 1: Demographics saved')
    
    # =========================================================================
    # FIGURE 2: Emotional Distress (EmoDiss) Distributions
    # =========================================================================
    fig, axes = plt.subplots(2, 3, figsize=(14, 9))
    mhw_cols = ['MHWdacad', 'MHWdlonely', 'MHWdmental', 'MHWdexhaust', 'MHWdsleep', 'MHWdfinancial']
    mhw_labels = ['Academic Difficulties', 'Loneliness', 'Mental Health', 'Exhaustion', 'Sleep Problems', 'Financial Stress']
    
    # Red gradient: lighter for low values, darker for high values (more distress = darker red)
    for idx, (col, label) in enumerate(zip(mhw_cols, mhw_labels)):
        ax = axes[idx // 3, idx % 3]
        counts = df[col].value_counts().sort_index()
        max_val = int(df[col].max())
        # Create red gradient based on response value
        red_gradient = plt.cm.Reds(np.linspace(0.2, 0.9, max_val))
        bar_colors = [red_gradient[int(v)-1] for v in counts.index]
        bars = ax.bar(counts.index, counts.values, color=bar_colors, edgecolor='white')
        ax.set_xlabel(f'Response (1=Not at all, {max_val}=Very much)', fontsize=9)
        ax.set_ylabel('Count', fontsize=9)
        threshold = max_val // 2 + 1  # e.g., 4+ on 1-6 scale
        elevated_pct = (df[col] >= threshold).mean() * 100
        ax.set_title(f'{label}\n({elevated_pct:.1f}% elevated)', fontsize=11, fontweight='bold')
        ax.set_xticks(range(1, max_val + 1))
    
    plt.suptitle('Figure 2\nEmotional Distress Indicators (EmoDiss)', fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    add_sim_note(fig)
    plt.savefig(f'{outdir}/fig2_emotional_distress.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 2: Emotional Distress saved')
    
    # =========================================================================
    # FIGURE 3: Quality of Engagement (QualEngag) Distributions - BLUE theme
    # =========================================================================
    fig, axes = plt.subplots(2, 3, figsize=(14, 9))
    qi_cols = ['QIstudent', 'QIadvisor', 'QIfaculty', 'QIstaff', 'QIadmin']
    qi_labels = ['Other Students', 'Academic Advisors', 'Faculty', 'Staff', 'Administrators']
    
    # Blue gradient: lighter for low values, darker for high values
    blue_gradient = ['#cce5ff', '#99ccff', '#66b3ff', '#3399ff', '#0066cc', '#004c99', '#003366']
    
    for idx, (col, label) in enumerate(zip(qi_cols, qi_labels)):
        ax = axes[idx // 3, idx % 3]
        counts = df[col].value_counts().sort_index()
        # Apply gradient based on response value (1-7)
        bar_colors = [blue_gradient[int(v)-1] for v in counts.index]
        ax.bar(counts.index, counts.values, color=bar_colors, edgecolor='white')
        ax.set_xlabel('Response (1=Poor, 7=Excellent)', fontsize=9)
        ax.set_ylabel('Frequency', fontsize=9)
        ax.set_title(f'Quality of Interactions: {label}\n(M={df[col].mean():.2f}, SD={df[col].std():.2f})', 
                     fontsize=11, fontweight='bold')
        ax.set_xticks(range(1, 8))
    
    axes[1, 2].axis('off')
    
    plt.suptitle('Figure 3\nQuality of Engagement Indicators (QualEngag)', fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    add_sim_note(fig)
    plt.savefig(f'{outdir}/fig3_quality_engagement.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 3: Quality of Engagement saved')
    
    # =========================================================================
    # FIGURE 4: Developmental Adjustment (DevAdj) - Belonging, Gains, Support, Satisfaction
    # =========================================================================
    fig, axes = plt.subplots(2, 4, figsize=(16, 9))
    
    # DevAdj color palette (greens/teals for positive outcomes)
    devadj_colors = {
        'belonging': '#2ca02c',      # Green
        'gains': '#000080',          # Navy
        'support': '#9467bd',        # Purple
        'satisfaction': '#8c564b'    # Brown
    }
    
    # Belonging items (Sense of Belonging) - GREEN gradient
    sb_cols = ['sbvalued', 'sbmyself', 'sbcommunity']
    sb_labels = ['Feel Valued', 'Can Be Myself', 'Part of Community']
    sb_max = int(df[sb_cols].max().max())  # Auto-detect scale
    green_gradient = plt.cm.Greens(np.linspace(0.3, 0.9, sb_max))
    
    for idx, (col, label) in enumerate(zip(sb_cols, sb_labels)):
        ax = axes[0, idx]
        counts = df[col].value_counts().sort_index()
        bar_colors = [green_gradient[int(v)-1] for v in counts.index]
        bars = ax.bar(counts.index, counts.values, color=bar_colors, edgecolor='white')
        ax.set_xlabel(f'Response (1-{sb_max})', fontsize=9)
        ax.set_ylabel('Frequency', fontsize=9)
        low_pct = (df[col] <= sb_max / 2).mean() * 100
        ax.set_title(f'{label}\n({low_pct:.1f}% low)', fontsize=10, fontweight='bold')
        ax.set_xticks(range(1, sb_max + 1))
    
    # Summary belonging
    ax = axes[0, 3]
    low_threshold = sb_max // 2  # Bottom half of scale
    low_belong = [(df[c] <= low_threshold).mean() * 100 for c in sb_cols]
    # Green gradient based on percentage (higher = darker = worse)
    green_shades = [plt.cm.Greens(0.3 + 0.5 * (v / max(low_belong) if max(low_belong) > 0 else 0)) for v in low_belong]
    ax.barh(sb_labels, low_belong, color=green_shades)
    ax.set_xlabel(f'% Low Belonging (≤{low_threshold})', fontsize=10)
    ax.set_title('Summary: Low Belonging', fontsize=10, fontweight='bold')
    max_pct = max(low_belong) * 1.3 if max(low_belong) > 0 else 50
    ax.set_xlim(0, min(100, max_pct))
    for i, v in enumerate(low_belong):
        ax.text(v + 1, i, f'{v:.1f}%', va='center', fontsize=10)
    
    # Gains items (Perceived Gains) - CYAN
    pg_cols = ['pgthink', 'pganalyze', 'pgwork', 'pgvalues', 'pgprobsolve']
    pg_labels = ['Think Critically', 'Analyze Info', 'Work with Others', 'Develop Values', 'Problem Solving']
    pg_max = int(df[pg_cols].max().max())  # Auto-detect scale
    means = [df[c].mean() for c in pg_cols]
    sds = [df[c].std() for c in pg_cols]
    
    ax = axes[1, 0]
    ax.barh(pg_labels, means, xerr=sds, color=devadj_colors['gains'], capsize=3)
    ax.set_xlabel(f'M ± SD (1-{pg_max} scale)', fontsize=10)
    ax.set_title('Perceived Gains', fontsize=10, fontweight='bold')
    ax.set_xlim(1, pg_max)
    
    # SE items (Supportive Environment) - PURPLE
    se_cols = ['SEwellness', 'SEnonacad', 'SEactivities', 'SEacademic', 'SEdiverse']
    se_labels = ['Wellness Support', 'Non-Academic Support', 'Co-Curricular Activities', 'Academic Support', 'Diverse Interactions']
    se_max = int(df[se_cols].max().max())  # Auto-detect scale
    means = [df[c].mean() for c in se_cols]
    sds = [df[c].std() for c in se_cols]
    
    ax = axes[1, 1]
    ax.barh(se_labels, means, xerr=sds, color=devadj_colors['support'], capsize=3)
    ax.set_xlabel(f'M ± SD (1-{se_max} scale)', fontsize=10)
    ax.set_title('Supportive Environment', fontsize=10, fontweight='bold')
    ax.set_xlim(1, se_max)
    
    # Satisfaction - BROWN
    ax = axes[1, 2]
    sat_cols = ['evalexp', 'sameinst']
    sat_labels = ['Rate Overall Experience', 'Choose Same Institution']
    sat_max = int(df[sat_cols].max().max())  # Auto-detect scale
    means = [df[c].mean() for c in sat_cols]
    sds = [df[c].std() for c in sat_cols]
    ax.barh(sat_labels, means, xerr=sds, color=devadj_colors['satisfaction'], capsize=3)
    ax.set_xlabel(f'M ± SD (1-{sat_max} scale)', fontsize=10)
    ax.set_title('Satisfaction', fontsize=10, fontweight='bold')
    ax.set_xlim(1, sat_max)
    
    axes[1, 3].axis('off')
    
    plt.suptitle('Figure 4\nDevelopmental Adjustment Indicators (DevAdj)', fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    add_sim_note(fig)
    plt.savefig(f'{outdir}/fig4_developmental_adjustment.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 4: Developmental Adjustment saved')
    
    # =========================================================================
    # FIGURE 5: Equity Gaps Visualization
    # =========================================================================
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    
    # 5a. FASt vs Non-FASt - Emotional Distress (RED theme, FASt=Orange accent)
    ax = axes[0, 0]
    fast = df[df['x_FASt'] == 1]
    nonfast = df[df['x_FASt'] == 0]
    mhw_short = ['Academic', 'Lonely', 'Mental', 'Exhaust', 'Sleep', 'Financial']
    fast_means = [fast[c].mean() for c in mhw_cols]
    nonfast_means = [nonfast[c].mean() for c in mhw_cols]
    x = np.arange(len(mhw_short))
    width = 0.35
    # Non-FASt: hatched bars
    ax.bar(x - width/2, nonfast_means, width, label='Non-FASt', color='#ff9999', 
           edgecolor='black', linewidth=1, hatch='///')
    ax.bar(x + width/2, fast_means, width, label='FASt', color=colors['fast'], 
           edgecolor='black', linewidth=1)
    # Auto-detect scale from data
    max_scale = int(df[mhw_cols].max().max())
    ax.set_ylabel(f'Mean Distress (1-{max_scale})', fontsize=11)
    ax.set_title('Emotional Distress by FASt Status', fontsize=12, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(mhw_short, fontsize=9)
    ax.legend()
    ax.set_ylim(1, max_scale)
    
    # 5b. FASt vs Non-FASt - Quality of Engagement (BLUE theme, FASt=Orange accent)
    ax = axes[0, 1]
    qi_short = ['Students', 'Advisors', 'Faculty', 'Staff', 'Admin']
    fast_means = [fast[c].mean() for c in qi_cols]
    nonfast_means = [nonfast[c].mean() for c in qi_cols]
    x = np.arange(len(qi_short))
    # Non-FASt: hatched bars
    ax.bar(x - width/2, nonfast_means, width, label='Non-FASt', color='#99ccff',
           edgecolor='black', linewidth=1, hatch='///')
    ax.bar(x + width/2, fast_means, width, label='FASt', color=colors['fast'],
           edgecolor='black', linewidth=1)
    ax.set_ylabel('Mean Quality (1-7)', fontsize=11)
    ax.set_title('Quality of Engagement by FASt Status', fontsize=12, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(qi_short, fontsize=9)
    ax.legend()
    ax.set_ylim(1, 7)
    
    # 5c. First-gen gaps - use construct-appropriate colors
    ax = axes[1, 0]
    firstgen = df[df['firstgen'] == 1]
    contgen = df[df['firstgen'] == 0]
    key_vars = ['MHWdacad', 'MHWdlonely', 'sbcommunity', 'QIfaculty', 'evalexp']
    key_labels = ['Academic\nDistress', 'Loneliness', 'Community\nBelong', 'Faculty\nQuality', 'Overall\nExperience']
    # Colors match construct: red for distress, green for belonging, blue for engagement, purple for satisfaction
    bar_colors_fg = ['#d62728', '#d62728', '#2ca02c', '#1f77b4', '#8c564b']
    bar_colors_cg = ['#ff9999', '#ff9999', '#90EE90', '#99ccff', '#d4a574']
    
    fg_means = [firstgen[c].mean() for c in key_vars]
    cg_means = [contgen[c].mean() for c in key_vars]
    x = np.arange(len(key_labels))
    
    for i in range(len(key_vars)):
        ax.bar(x[i] - width/2, cg_means[i], width, color=bar_colors_cg[i], 
               label='Continuing-gen' if i == 0 else '', edgecolor='black', linewidth=1)
        ax.bar(x[i] + width/2, fg_means[i], width, color=bar_colors_fg[i],
               label='First-gen' if i == 0 else '', edgecolor='black', linewidth=1, hatch='///')
    
    ax.set_ylabel('Mean Score', fontsize=11)
    ax.set_title('Key Outcomes by First-Generation Status', fontsize=12, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(key_labels, fontsize=9)
    ax.legend()
    
    # 5d. Gap summary (effect sizes) - use construct colors
    ax = axes[1, 1]
    gap_vars = ['MHWdacad', 'MHWdmental', 'sbcommunity', 'QIfaculty', 'evalexp']
    gap_labels = ['Academic Distress', 'Mental Health', 'Community Belonging', 'Faculty Quality', 'Overall Experience']
    
    # Calculate Cohen's d for FASt effect
    def cohens_d(g1, g2):
        n1, n2 = len(g1), len(g2)
        var1, var2 = g1.var(), g2.var()
        pooled_std = np.sqrt(((n1-1)*var1 + (n2-1)*var2) / (n1+n2-2))
        return (g1.mean() - g2.mean()) / pooled_std
    
    fast_d = [cohens_d(fast[c], nonfast[c]) for c in gap_vars]
    
    # Colors by construct: red for distress, green for belonging, blue for engagement
    construct_colors = [colors['distress'], colors['distress'], '#2ca02c', colors['engagement'], '#8c564b']
    ax.barh(gap_labels, fast_d, color=construct_colors, edgecolor='black', linewidth=1)
    ax.axvline(0, color='black', linewidth=0.8)
    ax.axvline(0.2, color='gray', linestyle='--', linewidth=0.8, alpha=0.5)
    ax.axvline(-0.2, color='gray', linestyle='--', linewidth=0.8, alpha=0.5)
    ax.set_xlabel("Cohen's d (FASt vs Non-FASt)", fontsize=11)
    ax.set_title('FASt Effect Sizes\n(+) = FASt higher, (−) = FASt lower', fontsize=12, fontweight='bold')
    ax.set_xlim(-0.5, 0.5)
    
    plt.suptitle('Figure 5\nEquity Gaps Analysis', fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    add_sim_note(fig)
    plt.savefig(f'{outdir}/fig5_equity_gaps.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 5: Equity Gaps saved')
    
    # =========================================================================
    # FIGURE 6: Correlation Heatmap - Key Variables (grouped by construct)
    # =========================================================================
    fig, ax = plt.subplots(figsize=(14, 12))
    
    # Organized by conceptual model: X/Z → Mediators → Outcome
    key_vars = [
        # Treatment & Moderator
        'x_FASt', 'credit_dose',
        # Covariates
        'firstgen', 'pell',
        # Mediator 1: Emotional Distress (EmoDiss)
        'MHWdacad', 'MHWdlonely', 'MHWdmental', 'MHWdexhaust', 'MHWdsleep', 'MHWdfinancial',
        # Mediator 2: Quality of Engagement (QualEngag)
        'QIstudent', 'QIfaculty', 'QIadvisor', 'QIstaff', 'QIadmin',
        # Outcome: DevAdj - Belong
        'sbvalued', 'sbmyself', 'sbcommunity',
        # Outcome: DevAdj - Gains
        'pgthink', 'pganalyze', 'pgwork',
        # Outcome: DevAdj - Satisf
        'evalexp', 'sameinst'
    ]
    
    var_labels = [
        # Treatment & Moderator
        'X: FASt Status', 'Z: Credit Dose',
        # Covariates  
        'First-Gen', 'Pell',
        # EmoDiss
        'ED: Academic', 'ED: Lonely', 'ED: Mental', 'ED: Exhaust', 'ED: Sleep', 'ED: Financial',
        # QualEngag
        'QE: Students', 'QE: Faculty', 'QE: Advisors', 'QE: Staff', 'QE: Admin',
        # Belong
        'Bel: Valued', 'Bel: Myself', 'Bel: Community',
        # Gains
        'Gain: Think', 'Gain: Analyze', 'Gain: Work',
        # Satisf
        'Sat: Experience', 'Sat: Same Inst'
    ]
    
    # Filter to available columns
    available = [(v, l) for v, l in zip(key_vars, var_labels) if v in df.columns]
    key_vars = [v for v, l in available]
    var_labels = [l for v, l in available]
    
    corr_matrix = df[key_vars].corr()
    
    im = ax.imshow(corr_matrix, cmap='RdBu_r', vmin=-1, vmax=1)
    ax.set_xticks(range(len(var_labels)))
    ax.set_yticks(range(len(var_labels)))
    ax.set_xticklabels(var_labels, rotation=45, ha='right', fontsize=8)
    ax.set_yticklabels(var_labels, fontsize=8)
    
    # Add correlation values
    for i in range(len(var_labels)):
        for j in range(len(var_labels)):
            val = corr_matrix.iloc[i, j]
            color = 'white' if abs(val) > 0.4 else 'black'
            ax.text(j, i, f'{val:.2f}', ha='center', va='center', color=color, fontsize=6)
    
    # Add construct separator lines
    separators = [2, 4, 10, 15, 18, 21]  # After each construct group
    for sep in separators:
        if sep < len(var_labels):
            ax.axhline(sep - 0.5, color='black', linewidth=1.5)
            ax.axvline(sep - 0.5, color='black', linewidth=1.5)
    
    plt.colorbar(im, ax=ax, label='Pearson r', shrink=0.8)
    ax.set_title('Figure 6\nCorrelation Matrix by Construct\n(X/Z | Covariates | EmoDiss | QualEngag | Belong | Gains | Satisf)', 
                 fontsize=14, fontweight='bold')
    plt.tight_layout()
    add_sim_note(fig, y_offset=0.01)
    plt.savefig(f'{outdir}/fig6_correlation_heatmap.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 6: Correlation Heatmap saved')
    
    print(f'\n✓ All figures saved to {outdir}/')
    return outdir


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate descriptive plots')
    parser.add_argument('--data', default='rep_data.csv', help='Path to data file')
    parser.add_argument('--outdir', default='results/descriptive_plots', help='Output directory')
    args = parser.parse_args()
    
    main(args.data, args.outdir)
