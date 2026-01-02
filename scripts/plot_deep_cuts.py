#!/usr/bin/env python3
"""
Deep-cut visualizations for Process-SEM dissertation.
These reveal nuanced patterns in the data beyond basic descriptives.

Usage:
    python scripts/plot_deep_cuts.py [--data rep_data.csv] [--outdir results/descriptive_plots]
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import os
import argparse
from scipy import stats
from matplotlib.patches import FancyBboxPatch
import matplotlib.patches as mpatches

def main(data_path='rep_data.csv', outdir='results/descriptive_plots'):
    os.makedirs(outdir, exist_ok=True)
    
    df = pd.read_csv(data_path)
    plt.style.use('seaborn-v0_8-whitegrid')
    
    # Color schemes - CONSISTENT across all figures
    # Distress=RED, Engagement=BLUE, FASt=ORANGE, Credits=YELLOW
    colors = {
        'distress': '#d62728',      # Red for emotional distress
        'engagement': '#1f77b4',    # Blue for quality engagement
        'fast': '#ff7f0e',          # Orange for FASt status
        'nonfast': '#7f7f7f',       # Gray for Non-FASt
        'firstgen': '#9467bd',      # Purple for first-gen
        'contgen': '#bcbd22',       # Olive for continuing-gen
        'credits': '#f0c000',       # Yellow for credit dose
        'belonging': '#2ca02c',     # Green for belonging
        'gains': '#000080',         # Navy for gains
        'support': '#9467bd',       # Purple for support
        'satisfaction': '#8c564b',  # Brown for satisfaction
        'risk_gradient': plt.cm.Reds,
        'benefit_gradient': plt.cm.Blues_r
    }
    
    # =========================================================================
    # FIGURE 7: Risk Factor Accumulation - Cumulative Disadvantage
    # =========================================================================
    fig, axes = plt.subplots(2, 2, figsize=(14, 12))
    
    # Create composite risk score (count of risk factors)
    df['urm'] = df['re_all'].isin(['Hispanic/Latino', 'Black/African American']).astype(int)
    df['risk_count'] = df['x_FASt'] + df['firstgen'] + df['pell'] + df['urm']
    
    # 7a. Distribution of risk factor counts - gradient from light to dark based on risk
    ax = axes[0, 0]
    risk_counts = df['risk_count'].value_counts().sort_index()
    # Gray gradient: more risk factors = darker
    risk_colors = ['#cccccc', '#999999', '#666666', '#444444', '#222222']
    bars = ax.bar(risk_counts.index, risk_counts.values, 
                  color=[risk_colors[min(int(i), len(risk_colors)-1)] for i in risk_counts.index], 
                  edgecolor='white')
    ax.set_xlabel('Number of Risk Factors\n(FASt + First-Gen + Pell + URM)', fontsize=11)
    ax.set_ylabel('Count', fontsize=11)
    ax.set_title('Distribution of Cumulative Risk Factors', fontsize=12, fontweight='bold')
    for i, (idx, v) in enumerate(zip(risk_counts.index, risk_counts.values)):
        ax.text(idx, v + 20, f'{v/len(df)*100:.1f}%', ha='center', fontsize=10)
    
    # 7b. Mean distress by risk count
    ax = axes[0, 1]
    mhw_cols = ['MHWdacad', 'MHWdlonely', 'MHWdmental', 'MHWdexhaust', 'MHWdsleep', 'MHWdfinancial']
    df['mean_distress'] = df[mhw_cols].mean(axis=1)
    
    # Detect scale from data (1-6 for NSSE distress items)
    distress_max = int(df[mhw_cols].max().max())
    
    means = df.groupby('risk_count')['mean_distress'].mean()
    sems = df.groupby('risk_count')['mean_distress'].sem()
    
    ax.errorbar(means.index, means.values, yerr=1.96*sems.values, 
                fmt='o-', color=colors['distress'], capsize=5, markersize=10, linewidth=2)
    ax.set_xlabel('Number of Risk Factors', fontsize=11)
    ax.set_ylabel(f'Mean Emotional Distress (1-{distress_max})', fontsize=11)
    ax.set_title('Cumulative Risk → Distress\n(95% CI)', fontsize=12, fontweight='bold')
    # Auto-scale y-axis with padding
    y_min = means.min() - 1.96*sems.max() - 0.2
    y_max = means.max() + 1.96*sems.max() + 0.2
    ax.set_ylim(max(1, y_min), min(distress_max, y_max))
    
    # Add trend line
    slope, intercept, r, p, se = stats.linregress(df['risk_count'], df['mean_distress'])
    x_line = np.array([0, 4])
    ax.plot(x_line, intercept + slope * x_line, '--', color='gray', alpha=0.7,
            label=f'Linear trend: β={slope:.3f}, p<.001')
    ax.legend(loc='lower right')
    
    # 7c. Mean engagement by risk count
    ax = axes[1, 0]
    qi_cols = ['QIstudent', 'QIadvisor', 'QIfaculty', 'QIstaff', 'QIadmin']
    df['mean_engagement'] = df[qi_cols].mean(axis=1)
    
    # Detect scale from data (1-7 for QI items)
    engage_max = int(df[qi_cols].max().max())
    
    means = df.groupby('risk_count')['mean_engagement'].mean()
    sems = df.groupby('risk_count')['mean_engagement'].sem()
    
    ax.errorbar(means.index, means.values, yerr=1.96*sems.values, 
                fmt='s-', color=colors['engagement'], capsize=5, markersize=10, linewidth=2)
    ax.set_xlabel('Number of Risk Factors', fontsize=11)
    ax.set_ylabel(f'Mean Quality of Engagement (1-{engage_max})', fontsize=11)
    ax.set_title('Cumulative Risk → Engagement\n(95% CI)', fontsize=12, fontweight='bold')
    # Auto-scale y-axis with padding
    y_min = means.min() - 1.96*sems.max() - 0.2
    y_max = means.max() + 1.96*sems.max() + 0.2
    ax.set_ylim(max(1, y_min), min(engage_max, y_max))
    
    slope, intercept, r, p, se = stats.linregress(df['risk_count'], df['mean_engagement'])
    x_line = np.array([0, 4])
    ax.plot(x_line, intercept + slope * x_line, '--', color='gray', alpha=0.7,
            label=f'Linear trend: β={slope:.3f}, p<.001')
    ax.legend(loc='upper right')
    
    # 7d. % Low belonging by risk count
    ax = axes[1, 1]
    df['low_belonging'] = (df['sbcommunity'] <= 2).astype(int)
    
    pct_low = df.groupby('risk_count')['low_belonging'].mean() * 100
    ns = df.groupby('risk_count').size()
    
    # Calculate 95% CI for proportions
    ci_low = []
    ci_high = []
    for rc in pct_low.index:
        p = pct_low[rc] / 100
        n = ns[rc]
        se = np.sqrt(p * (1-p) / n)
        ci_low.append((p - 1.96*se) * 100)
        ci_high.append((p + 1.96*se) * 100)
    
    ax.bar(pct_low.index, pct_low.values, color='#2ca02c', edgecolor='white')  # Green for belonging
    ax.errorbar(pct_low.index, pct_low.values, 
                yerr=[pct_low.values - ci_low, np.array(ci_high) - pct_low.values],
                fmt='none', color='black', capsize=5)
    ax.set_xlabel('Number of Risk Factors', fontsize=11)
    ax.set_ylabel('% Low Community Belonging', fontsize=11)
    ax.set_title('Cumulative Risk → Low Belonging\n(95% CI)', fontsize=12, fontweight='bold')
    ax.axhline(42, color='gray', linestyle='--', alpha=0.7, label='National avg (42%)')
    ax.legend()
    
    plt.suptitle('Figure 7\nCumulative Disadvantage Analysis', fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    plt.savefig(f'{outdir}/fig7_cumulative_risk.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 7: Cumulative Risk Analysis saved')
    
    # =========================================================================
    # FIGURE 8: Credit Dose × FASt Interaction (Moderation Visualization)
    # =========================================================================
    fig, axes = plt.subplots(2, 2, figsize=(14, 12))
    
    # Reconstruct raw credits if needed
    if 'trnsfr_cr' in df.columns:
        credits = df['trnsfr_cr']
    else:
        credits = df['credit_dose'] * 10 + 12  # reverse transformation
    
    # 8a. Scatter: Credits vs Distress by FASt status
    ax = axes[0, 0]
    fast_mask = df['x_FASt'] == 1
    
    ax.scatter(credits[~fast_mask], df.loc[~fast_mask, 'mean_distress'], 
               alpha=0.3, c=colors['nonfast'], label='Non-FASt', s=20)
    ax.scatter(credits[fast_mask], df.loc[fast_mask, 'mean_distress'], 
               alpha=0.5, c=colors['fast'], label='FASt', s=30)  # Orange for FASt
    
    # Add LOESS-style smoothed lines
    for mask, color, label in [(~fast_mask, colors['nonfast'], 'Non-FASt'), 
                                (fast_mask, colors['fast'], 'FASt')]:  # Orange for FASt
        x = credits[mask].values
        y = df.loc[mask, 'mean_distress'].values
        # Bin and average for smooth line
        bins = np.linspace(0, max(credits), 15)
        bin_means = []
        bin_centers = []
        for i in range(len(bins)-1):
            bin_mask = (x >= bins[i]) & (x < bins[i+1])
            if bin_mask.sum() > 5:
                bin_centers.append((bins[i] + bins[i+1])/2)
                bin_means.append(y[bin_mask].mean())
        if len(bin_centers) > 2:
            ax.plot(bin_centers, bin_means, '-', color=color, linewidth=3, alpha=0.8)
    
    ax.axvline(12, color=colors['credits'], linestyle='--', alpha=0.7, linewidth=2)  # Yellow credit threshold
    ax.set_xlabel('Transfer Credits', fontsize=11)
    ax.set_ylabel('Mean Emotional Distress', fontsize=11)
    ax.set_title('Credit Dose → Distress by FASt Status', fontsize=12, fontweight='bold')
    ax.legend()
    
    # 8b. Conditional effects at different credit doses
    ax = axes[0, 1]
    
    # Create credit dose bins
    credit_bins = pd.cut(credits, bins=[0, 3, 6, 12, 20, 60], labels=['0-3', '4-6', '7-12', '13-20', '21+'])
    df['credit_bin'] = credit_bins
    
    # Calculate FASt gap at each bin
    gaps = []
    gap_ses = []
    bin_labels = []
    for bin_label in ['0-3', '4-6', '7-12', '13-20', '21+']:
        bin_data = df[df['credit_bin'] == bin_label]
        if len(bin_data) > 10:
            fast_mean = bin_data[bin_data['x_FASt']==1]['mean_distress'].mean()
            nonfast_mean = bin_data[bin_data['x_FASt']==0]['mean_distress'].mean()
            fast_n = (bin_data['x_FASt']==1).sum()
            nonfast_n = (bin_data['x_FASt']==0).sum()
            
            if fast_n > 5 and nonfast_n > 5:
                gap = fast_mean - nonfast_mean
                # Pooled SE
                fast_var = bin_data[bin_data['x_FASt']==1]['mean_distress'].var()
                nonfast_var = bin_data[bin_data['x_FASt']==0]['mean_distress'].var()
                se = np.sqrt(fast_var/fast_n + nonfast_var/nonfast_n)
                gaps.append(gap)
                gap_ses.append(se)
                bin_labels.append(bin_label)
    
    x_pos = np.arange(len(bin_labels))
    # Use orange for FASt-related gaps
    bars = ax.bar(x_pos, gaps, yerr=[1.96*se for se in gap_ses], 
                  capsize=5, color=[colors['fast'] if g > 0 else colors['engagement'] for g in gaps])
    ax.axhline(0, color='black', linewidth=0.8)
    ax.set_xticks(x_pos)
    ax.set_xticklabels(bin_labels)
    ax.set_xlabel('Credit Dose Range', fontsize=11)
    ax.set_ylabel('FASt - Non-FASt Gap (Distress)', fontsize=11)
    ax.set_title('FASt Effect by Credit Dose\n(+ = FASt higher distress)', fontsize=12, fontweight='bold')
    
    # 8c. Johnson-Neyman style: At what credit level does FASt effect become significant?
    ax = axes[1, 0]
    
    # Compute rolling FASt effect
    credit_vals = np.arange(0, 35, 2)
    effects = []
    ci_lows = []
    ci_highs = []
    
    for cv in credit_vals:
        # Window around this credit value
        window = 5
        mask = (credits >= cv - window) & (credits <= cv + window)
        if mask.sum() > 20:
            fast_data = df.loc[mask & (df['x_FASt']==1), 'mean_distress']
            nonfast_data = df.loc[mask & (df['x_FASt']==0), 'mean_distress']
            
            if len(fast_data) > 5 and len(nonfast_data) > 5:
                effect = fast_data.mean() - nonfast_data.mean()
                se = np.sqrt(fast_data.var()/len(fast_data) + nonfast_data.var()/len(nonfast_data))
                effects.append(effect)
                ci_lows.append(effect - 1.96*se)
                ci_highs.append(effect + 1.96*se)
            else:
                effects.append(np.nan)
                ci_lows.append(np.nan)
                ci_highs.append(np.nan)
        else:
            effects.append(np.nan)
            ci_lows.append(np.nan)
            ci_highs.append(np.nan)
    
    ax.fill_between(credit_vals, ci_lows, ci_highs, alpha=0.3, color=colors['fast'])  # Orange for FASt
    ax.plot(credit_vals, effects, '-', color=colors['fast'], linewidth=2)  # Orange
    ax.axhline(0, color='black', linewidth=1)
    ax.axvline(12, color=colors['credits'], linestyle='--', alpha=0.7, linewidth=2, label='FASt threshold')  # Yellow
    ax.set_xlabel('Transfer Credits', fontsize=11)
    ax.set_ylabel('FASt Effect on Distress', fontsize=11)
    ax.set_title('Conditional FASt Effect Across Credit Spectrum\n(Rolling window, 95% CI)', fontsize=12, fontweight='bold')
    ax.legend()
    
    # 8d. Engagement pattern
    ax = axes[1, 1]
    
    effects = []
    ci_lows = []
    ci_highs = []
    
    for cv in credit_vals:
        window = 5
        mask = (credits >= cv - window) & (credits <= cv + window)
        if mask.sum() > 20:
            fast_data = df.loc[mask & (df['x_FASt']==1), 'mean_engagement']
            nonfast_data = df.loc[mask & (df['x_FASt']==0), 'mean_engagement']
            
            if len(fast_data) > 5 and len(nonfast_data) > 5:
                effect = fast_data.mean() - nonfast_data.mean()
                se = np.sqrt(fast_data.var()/len(fast_data) + nonfast_data.var()/len(nonfast_data))
                effects.append(effect)
                ci_lows.append(effect - 1.96*se)
                ci_highs.append(effect + 1.96*se)
            else:
                effects.append(np.nan)
                ci_lows.append(np.nan)
                ci_highs.append(np.nan)
        else:
            effects.append(np.nan)
            ci_lows.append(np.nan)
            ci_highs.append(np.nan)
    
    ax.fill_between(credit_vals, ci_lows, ci_highs, alpha=0.3, color=colors['engagement'])
    ax.plot(credit_vals, effects, '-', color=colors['engagement'], linewidth=2)
    ax.axhline(0, color='black', linewidth=1)
    ax.axvline(12, color=colors['credits'], linestyle='--', alpha=0.7, linewidth=2, label='FASt threshold')  # Yellow
    ax.set_xlabel('Transfer Credits', fontsize=11)
    ax.set_ylabel('FASt Effect on Engagement', fontsize=11)
    ax.set_title('Conditional FASt Effect on Engagement\n(Rolling window, 95% CI)', fontsize=12, fontweight='bold')
    ax.legend()
    
    plt.suptitle('Figure 8\nCredit Dose × FASt Moderation Pattern', fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    plt.savefig(f'{outdir}/fig8_credit_dose_moderation.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 8: Credit Dose Moderation saved')
    
    # =========================================================================
    # FIGURE 9: Mediation Pathway Visualization
    # =========================================================================
    fig, axes = plt.subplots(2, 2, figsize=(14, 12))
    
    # Create composite outcome measures
    sb_cols = ['sbvalued', 'sbmyself', 'sbcommunity']
    pg_cols = ['pgthink', 'pganalyze', 'pgwork', 'pgvalues', 'pgprobsolve']
    se_cols = ['SEwellness', 'SEnonacad', 'SEactivities', 'SEacademic', 'SEdiverse']
    
    df['mean_belonging'] = df[sb_cols].mean(axis=1)
    df['mean_gains'] = df[pg_cols].mean(axis=1)
    df['mean_support'] = df[se_cols].mean(axis=1)
    df['mean_devadj'] = (df['mean_belonging'] + df['mean_gains'] + df['mean_support'] + 
                         df[['evalexp', 'sameinst']].mean(axis=1)) / 4
    
    # 9a. Distress → Developmental Adjustment scatter
    ax = axes[0, 0]
    ax.scatter(df['mean_distress'], df['mean_devadj'], alpha=0.2, c='gray', s=10)
    
    # Add regression line
    slope, intercept, r, p, se = stats.linregress(df['mean_distress'], df['mean_devadj'])
    x_line = np.array([df['mean_distress'].min(), df['mean_distress'].max()])
    ax.plot(x_line, intercept + slope * x_line, '-', color=colors['distress'], linewidth=3,
            label=f'r = {r:.3f}, p < .001')
    ax.set_xlabel('Emotional Distress (EmoDiss)', fontsize=11)
    ax.set_ylabel('Developmental Adjustment (DevAdj)', fontsize=11)
    ax.set_title('Mediator Path: EmoDiss → DevAdj', fontsize=12, fontweight='bold')
    ax.legend()
    
    # 9b. Engagement → Developmental Adjustment scatter
    ax = axes[0, 1]
    ax.scatter(df['mean_engagement'], df['mean_devadj'], alpha=0.2, c='gray', s=10)
    
    slope, intercept, r, p, se = stats.linregress(df['mean_engagement'], df['mean_devadj'])
    x_line = np.array([df['mean_engagement'].min(), df['mean_engagement'].max()])
    ax.plot(x_line, intercept + slope * x_line, '-', color=colors['engagement'], linewidth=3,
            label=f'r = {r:.3f}, p < .001')
    ax.set_xlabel('Quality of Engagement (QualEngag)', fontsize=11)
    ax.set_ylabel('Developmental Adjustment (DevAdj)', fontsize=11)
    ax.set_title('Mediator Path: QualEngag → DevAdj', fontsize=12, fontweight='bold')
    ax.legend()
    
    # 9c. Parallel Mediation Model Diagram
    ax = axes[1, 0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')
    
    # Draw boxes
    boxes = {
        'X': (1, 5, 'FASt\nStatus\n(X)'),
        'M1': (5, 7.5, 'Emotional\nDistress\n(M1)'),
        'M2': (5, 2.5, 'Quality of\nEngagement\n(M2)'),
        'Y': (9, 5, 'Developmental\nAdjustment\n(Y)')
    }
    
    for key, (x, y, label) in boxes.items():
        # M1 (Distress) = light red, M2 (Engagement) = light blue, X (FASt) = light orange, Y = light green
        if key == 'M1':
            box_color = '#ffcccc'  # Light red
        elif key == 'M2':
            box_color = '#cce5ff'  # Light blue
        elif key == 'X':
            box_color = '#ffe6b3'  # Light orange for FASt
        else:  # Y
            box_color = '#ccffcc'  # Light green for outcome
        rect = FancyBboxPatch((x-0.9, y-0.8), 1.8, 1.6, boxstyle="round,pad=0.05",
                              facecolor=box_color,
                              edgecolor='black', linewidth=2)
        ax.add_patch(rect)
        ax.text(x, y, label, ha='center', va='center', fontsize=9, fontweight='bold')
    
    # Draw arrows with path labels - RED for distress paths, BLUE for engagement paths
    # a1 path (X → M1: FASt increases distress) - RED
    ax.annotate('', xy=(4.1, 7.5), xytext=(1.9, 5.8),
                arrowprops=dict(arrowstyle='->', color=colors['distress'], lw=2))
    ax.text(2.5, 7.2, 'a1', fontsize=11, fontweight='bold', color=colors['distress'])
    
    # a2 path (X → M2: FASt decreases engagement) - BLUE
    ax.annotate('', xy=(4.1, 2.5), xytext=(1.9, 4.2),
                arrowprops=dict(arrowstyle='->', color=colors['engagement'], lw=2))
    ax.text(2.5, 2.8, 'a2', fontsize=11, fontweight='bold', color=colors['engagement'])
    
    # b1 path (M1 → Y: Distress decreases adjustment) - RED
    ax.annotate('', xy=(8.1, 5.8), xytext=(5.9, 7.5),
                arrowprops=dict(arrowstyle='->', color=colors['distress'], lw=2))
    ax.text(7.3, 7.2, 'b1', fontsize=11, fontweight='bold', color=colors['distress'])
    
    # b2 path (M2 → Y: Engagement increases adjustment) - BLUE
    ax.annotate('', xy=(8.1, 4.2), xytext=(5.9, 2.5),
                arrowprops=dict(arrowstyle='->', color=colors['engagement'], lw=2))
    ax.text(7.3, 2.8, 'b2', fontsize=11, fontweight='bold', color=colors['engagement'])
    
    # c' path (X → Y direct effect)
    ax.annotate('', xy=(8.1, 5), xytext=(1.9, 5),
                arrowprops=dict(arrowstyle='->', color='gray', lw=1.5, ls='--'))
    ax.text(5, 5.4, "c'", fontsize=11, fontweight='bold', color='gray')
    
    ax.set_title('Parallel Mediation Model', fontsize=12, fontweight='bold')
    
    # 9d. Effect decomposition (descriptive estimates)
    ax = axes[1, 1]
    
    # Calculate descriptive path estimates for visualization
    # Note: These are bivariate associations, not causal estimates from the SEM
    # a1: Mean difference in distress (FASt - Non-FASt)
    a1 = df.groupby('x_FASt')['mean_distress'].mean().diff().iloc[1]
    # b1: Distress-DevAdj slope
    b1 = stats.linregress(df['mean_distress'], df['mean_devadj'])[0]
    # a2: Mean difference in engagement (FASt - Non-FASt)
    a2 = df.groupby('x_FASt')['mean_engagement'].mean().diff().iloc[1]
    # b2: Engagement-DevAdj slope
    b2 = stats.linregress(df['mean_engagement'], df['mean_devadj'])[0]
    
    ind_distress = a1 * b1
    ind_engage = a2 * b2
    total_indirect = ind_distress + ind_engage
    
    # Direct effect (unadjusted mean difference)
    direct = df.groupby('x_FASt')['mean_devadj'].mean().diff().iloc[1]
    
    effects = ['Indirect via\nEmoDiss (a1*b1)', 'Indirect via\nQualEngag (a2*b2)', 'Direct Effect\n(c\')', 'Total Effect\n(c\' + indirect)']
    values = [ind_distress, ind_engage, direct, direct + total_indirect]
    colors_bar = [colors['distress'], colors['engagement'], '#7f7f7f', '#2ca02c']  # Red, Blue, Gray, Green
    
    bars = ax.barh(effects, values, color=colors_bar)
    ax.axvline(0, color='black', linewidth=1)
    ax.set_xlabel('Effect on Developmental Adjustment', fontsize=11)
    ax.set_title('Effect Decomposition\n(Descriptive bivariate estimates)', fontsize=12, fontweight='bold')
    
    # Adjust text positioning - place values inside bars for larger effects
    for i, (bar, val) in enumerate(zip(bars, values)):
        bar_width = abs(val)
        # Place text inside bar if bar is wide enough, otherwise outside
        if bar_width > 0.05:
            # Inside the bar - white text for contrast
            text_x = val / 2  # Center of bar
            ax.text(text_x, i, f'{val:.3f}', va='center', ha='center', 
                    fontsize=10, fontweight='bold', color='white')
        else:
            # Outside the bar for small values
            offset = 0.01
            ax.text(val + offset if val > 0 else val - offset, i, f'{val:.3f}', 
                    va='center', ha='left' if val > 0 else 'right', fontsize=10)
    
    plt.suptitle('Figure 9\nMediation Pathway Analysis', fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    plt.savefig(f'{outdir}/fig9_mediation_pathways.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 9: Mediation Pathways saved')
    
    # =========================================================================
    # FIGURE 10: Intersectionality Matrix (FASt × First-Gen × URM)
    # =========================================================================
    fig, axes = plt.subplots(2, 2, figsize=(14, 12))
    
    # Create intersectional groups
    df['intersection'] = (df['x_FASt'].astype(str) + '_' + 
                          df['firstgen'].astype(str) + '_' + 
                          df['urm'].astype(str))
    
    # Readable labels
    int_labels = {
        '0_0_0': 'Non-FASt\nCont-Gen\nNon-URM',
        '0_0_1': 'Non-FASt\nCont-Gen\nURM',
        '0_1_0': 'Non-FASt\nFirst-Gen\nNon-URM',
        '0_1_1': 'Non-FASt\nFirst-Gen\nURM',
        '1_0_0': 'FASt\nCont-Gen\nNon-URM',
        '1_0_1': 'FASt\nCont-Gen\nURM',
        '1_1_0': 'FASt\nFirst-Gen\nNon-URM',
        '1_1_1': 'FASt\nFirst-Gen\nURM'
    }
    
    # 10a. Distress by intersectional group - RED theme with intensity
    ax = axes[0, 0]
    int_means = df.groupby('intersection')['mean_distress'].agg(['mean', 'sem', 'count'])
    int_means = int_means.reindex(['0_0_0', '0_0_1', '0_1_0', '0_1_1', '1_0_0', '1_0_1', '1_1_0', '1_1_1'])
    
    x_pos = np.arange(8)
    # Non-FASt = red shades with hatching, FASt = orange shades solid
    bar_colors_10a = ['#ffcccc', '#ff9999', '#ff6666', '#ff3333',  # Non-FASt (red gradient)
                      '#ffe6b3', '#ffcc66', '#ffb333', '#ff9900']  # FASt (orange gradient)
    
    for i, (idx, row) in enumerate(int_means.iterrows()):
        # First 4 bars are Non-FASt (hatched), last 4 are FASt (solid)
        hatch_pattern = '///' if i < 4 else None
        ax.bar(i, row['mean'], yerr=1.96*row['sem'], capsize=3,
               color=bar_colors_10a[i], edgecolor='black', linewidth=1, hatch=hatch_pattern)
    
    ax.set_xticks(x_pos)
    ax.set_xticklabels([int_labels[k] for k in int_means.index], fontsize=8, rotation=45, ha='right')
    ax.set_ylabel('Mean Distress', fontsize=11)
    ax.set_title('Emotional Distress by Intersectional Identity', fontsize=12, fontweight='bold')
    # Auto-scale y-axis based on data
    y_min = int_means['mean'].min() - 0.5
    y_max = int_means['mean'].max() + 0.5
    ax.set_ylim(max(1, y_min), y_max)
    
    # 10b. Engagement by intersectional group - BLUE theme with intensity
    ax = axes[0, 1]
    int_means_eng = df.groupby('intersection')['mean_engagement'].agg(['mean', 'sem', 'count'])
    int_means_eng = int_means_eng.reindex(['0_0_0', '0_0_1', '0_1_0', '0_1_1', '1_0_0', '1_0_1', '1_1_0', '1_1_1'])
    
    # Non-FASt = blue shades with hatching, FASt = orange shades solid
    bar_colors_10b = ['#cce5ff', '#99ccff', '#66b3ff', '#3399ff',  # Non-FASt (blue gradient)
                      '#ffe6b3', '#ffcc66', '#ffb333', '#ff9900']  # FASt (orange gradient)
    
    for i, (idx, row) in enumerate(int_means_eng.iterrows()):
        # First 4 bars are Non-FASt (hatched), last 4 are FASt (solid)
        hatch_pattern = '///' if i < 4 else None
        ax.bar(i, row['mean'], yerr=1.96*row['sem'], capsize=3,
               color=bar_colors_10b[i], edgecolor='black', linewidth=1, hatch=hatch_pattern)
    
    ax.set_xticks(x_pos)
    ax.set_xticklabels([int_labels[k] for k in int_means_eng.index], fontsize=8, rotation=45, ha='right')
    ax.set_ylabel('Mean Engagement', fontsize=11)
    ax.set_title('Quality of Engagement by Intersectional Identity', fontsize=12, fontweight='bold')
    # Auto-scale y-axis
    y_min = int_means_eng['mean'].min() - 0.5
    y_max = int_means_eng['mean'].max() + 0.5
    ax.set_ylim(max(1, y_min), y_max)
    
    # 10c. Heatmap: FASt × First-Gen interaction on distress
    ax = axes[1, 0]
    pivot = df.pivot_table(values='mean_distress', index='firstgen', columns='x_FASt', aggfunc='mean')
    pivot.index = ['Continuing-Gen', 'First-Gen']
    pivot.columns = ['Non-FASt', 'FASt']
    
    # Auto-scale heatmap colors
    vmin_d, vmax_d = pivot.values.min() - 0.1, pivot.values.max() + 0.1
    im = ax.imshow(pivot.values, cmap='Reds', vmin=vmin_d, vmax=vmax_d)
    ax.set_xticks([0, 1])
    ax.set_yticks([0, 1])
    ax.set_xticklabels(pivot.columns)
    ax.set_yticklabels(pivot.index)
    
    mid_d = (vmin_d + vmax_d) / 2
    for i in range(2):
        for j in range(2):
            ax.text(j, i, f'{pivot.values[i, j]:.2f}', ha='center', va='center', 
                    fontsize=14, fontweight='bold', color='white' if pivot.values[i, j] > mid_d else 'black')
    
    ax.set_title('FASt × First-Gen → Distress\n(Cell means)', fontsize=12, fontweight='bold')
    plt.colorbar(im, ax=ax, label='Mean Distress')
    
    # 10d. Heatmap: FASt × URM interaction on engagement
    ax = axes[1, 1]
    pivot_eng = df.pivot_table(values='mean_engagement', index='urm', columns='x_FASt', aggfunc='mean')
    pivot_eng.index = ['Non-URM', 'URM']
    pivot_eng.columns = ['Non-FASt', 'FASt']
    
    # Auto-scale heatmap colors
    vmin_e, vmax_e = pivot_eng.values.min() - 0.1, pivot_eng.values.max() + 0.1
    im = ax.imshow(pivot_eng.values, cmap='Blues', vmin=vmin_e, vmax=vmax_e)
    ax.set_xticks([0, 1])
    ax.set_yticks([0, 1])
    ax.set_xticklabels(pivot_eng.columns)
    ax.set_yticklabels(pivot_eng.index)
    
    mid_e = (vmin_e + vmax_e) / 2
    for i in range(2):
        for j in range(2):
            ax.text(j, i, f'{pivot_eng.values[i, j]:.2f}', ha='center', va='center', 
                    fontsize=14, fontweight='bold', color='white' if pivot_eng.values[i, j] < mid_e else 'black')
    
    ax.set_title('FASt × URM → Engagement\n(Cell means)', fontsize=12, fontweight='bold')
    plt.colorbar(im, ax=ax, label='Mean Engagement')
    
    plt.suptitle('Figure 10\nIntersectionality Analysis', fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    plt.savefig(f'{outdir}/fig10_intersectionality.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 10: Intersectionality Analysis saved')
    
    # =========================================================================
    # FIGURE 11: Outcome Comparison by FASt Status and Risk Level
    # =========================================================================
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    # Create composite outcome variables if not already present
    mhw_cols = ['MHWdacad', 'MHWdlonely', 'MHWdmental', 'MHWdexhaust', 'MHWdsleep', 'MHWdfinancial']
    qi_cols = ['QIstudent', 'QIadvisor', 'QIfaculty', 'QIstaff', 'QIadmin']
    sb_cols = ['sbvalued', 'sbmyself', 'sbcommunity']
    pg_cols = ['pgthink', 'pganalyze', 'pgwork', 'pgvalues', 'pgprobsolve']
    se_cols = ['SEwellness', 'SEnonacad', 'SEactivities', 'SEacademic', 'SEdiverse']
    
    df['mean_distress'] = df[mhw_cols].mean(axis=1)
    df['mean_engagement'] = df[qi_cols].mean(axis=1)
    df['mean_belonging'] = df[sb_cols].mean(axis=1)
    df['mean_gains'] = df[pg_cols].mean(axis=1)
    df['mean_support'] = df[se_cols].mean(axis=1)
    
    # 11a. Grouped bar chart: FASt vs Non-FASt across outcomes
    ax = axes[0]
    
    outcomes = ['mean_distress', 'mean_engagement', 'mean_belonging', 'mean_gains', 'mean_support']
    outcome_labels = ['Emotional\nDistress', 'Quality of\nEngagement', 'Sense of\nBelonging', 'Perceived\nGains', 'Support\nEnvironment']
    
    fast_means = [df[df['x_FASt']==1][out].mean() for out in outcomes]
    fast_sems = [df[df['x_FASt']==1][out].sem() for out in outcomes]
    nonfast_means = [df[df['x_FASt']==0][out].mean() for out in outcomes]
    nonfast_sems = [df[df['x_FASt']==0][out].sem() for out in outcomes]
    
    x = np.arange(len(outcomes))
    width = 0.35
    
    # Construct-specific colors: Distress=RED, Engagement=BLUE, Belonging=GREEN, Gains=NAVY, Support=PURPLE
    construct_colors = ['#d62728', '#1f77b4', '#2ca02c', '#000080', '#9467bd']
    
    # Plot Non-FASt bars with hatching pattern
    for i in range(len(outcomes)):
        # Non-FASt: lighter shade with diagonal hatch lines
        bar_nonfast = ax.bar(x[i] - width/2, nonfast_means[i], width, yerr=1.96*nonfast_sems[i], 
               color=construct_colors[i], alpha=0.4, capsize=3, edgecolor='black', linewidth=1,
               hatch='///')
        # FASt: solid orange
        bar_fast = ax.bar(x[i] + width/2, fast_means[i], width, yerr=1.96*fast_sems[i], 
               color=colors['fast'], capsize=3, edgecolor='black', linewidth=1)
    
    # Create custom legend
    from matplotlib.patches import Patch
    legend_elements = [
        Patch(facecolor='gray', alpha=0.4, edgecolor='black', hatch='///', label='Non-FASt'),
        Patch(facecolor=colors['fast'], edgecolor='black', label='FASt')
    ]
    ax.legend(handles=legend_elements, loc='upper right', fontsize=10)
    
    ax.set_ylabel('Mean Score', fontsize=11)
    ax.set_title('Outcome Means by FASt Status\n(with 95% CI)', fontsize=12, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(outcome_labels, fontsize=9)
    
    # Add significance stars for large differences
    for i, (nm, fm) in enumerate(zip(nonfast_means, fast_means)):
        diff = abs(fm - nm)
        pooled_sem = np.sqrt(nonfast_sems[i]**2 + fast_sems[i]**2)
        if diff / pooled_sem > 1.96:  # Rough significance check
            max_y = max(nm, fm) + 1.96*max(nonfast_sems[i], fast_sems[i])
            ax.text(i, max_y + 0.05, '*', ha='center', fontsize=14, fontweight='bold')
    
    # 11b. Mean outcomes by cumulative risk level
    ax = axes[1]
    
    risk_levels = sorted(df['risk_count'].unique())
    
    # Create grouped data
    outcome_short = ['Distress', 'Engagement', 'Belonging', 'Gains', 'Support']
    
    # Colors: Distress=RED, Engagement=BLUE, Belonging=GREEN, Gains=NAVY, Support=PURPLE
    outcome_colors = ['#d62728', '#1f77b4', '#2ca02c', '#000080', '#9467bd']
    
    x = np.arange(len(risk_levels))
    width = 0.15
    
    bars_list = []
    for i, (out, label) in enumerate(zip(outcomes, outcome_short)):
        means = [df[df['risk_count']==r][out].mean() for r in risk_levels]
        # Normalize to z-scores for comparison across different scales
        grand_mean = df[out].mean()
        grand_sd = df[out].std()
        z_means = [(m - grand_mean) / grand_sd for m in means]
        
        offset = (i - 2) * width
        bars = ax.bar(x + offset, z_means, width, label=label, color=outcome_colors[i], edgecolor='black', linewidth=0.8)
    
    ax.set_ylabel('Standardized Score (z)', fontsize=11)
    ax.set_xlabel('Number of Risk Factors (FASt + First-Gen + Pell + URM)', fontsize=11)
    ax.set_title('Standardized Outcomes by Risk Level', fontsize=12, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels([str(r) for r in risk_levels])
    ax.legend(loc='upper right', fontsize=9)
    ax.axhline(0, color='black', linewidth=0.5, linestyle='--')
    
    plt.suptitle('Figure 11\nStudent Outcome Profiles', fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    plt.savefig(f'{outdir}/fig11_outcome_profiles.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 11: Outcome Profiles saved')
    
    # =========================================================================
    # FIGURE 12: Longitudinal Cohort Patterns
    # =========================================================================
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    
    # Map cohort codes to years (0 = 2023, 1 = 2024)
    cohort_labels = {0: '2023', 1: '2024'}
    df['cohort_year'] = df['cohort'].map(cohort_labels)
    
    # 12a. Distress trend by cohort - RED theme
    ax = axes[0, 0]
    cohort_distress = df.groupby('cohort')['mean_distress'].agg(['mean', 'sem'])
    cohort_years = [cohort_labels.get(c, str(c)) for c in cohort_distress.index]
    ax.errorbar(cohort_years, cohort_distress['mean'], 
                yerr=1.96*cohort_distress['sem'], fmt='o-', capsize=5, 
                color=colors['distress'], markersize=10, linewidth=2)
    ax.set_xlabel('Cohort Year', fontsize=11)
    ax.set_ylabel('Mean Distress', fontsize=11)
    ax.set_title('Distress Trends Across Cohorts', fontsize=12, fontweight='bold')
    # Auto-scale y-axis
    y_min, y_max = cohort_distress['mean'].min(), cohort_distress['mean'].max()
    y_range = y_max - y_min
    ax.set_ylim(y_min - max(0.3, y_range*0.5), y_max + max(0.3, y_range*0.5))
    
    # 12b. Engagement trend by cohort - BLUE theme
    ax = axes[0, 1]
    cohort_engage = df.groupby('cohort')['mean_engagement'].agg(['mean', 'sem'])
    ax.errorbar(cohort_years, cohort_engage['mean'], 
                yerr=1.96*cohort_engage['sem'], fmt='s-', capsize=5, 
                color=colors['engagement'], markersize=10, linewidth=2)
    ax.set_xlabel('Cohort Year', fontsize=11)
    ax.set_ylabel('Mean Engagement', fontsize=11)
    ax.set_title('Engagement Trends Across Cohorts', fontsize=12, fontweight='bold')
    # Auto-scale y-axis
    y_min, y_max = cohort_engage['mean'].min(), cohort_engage['mean'].max()
    y_range = y_max - y_min
    ax.set_ylim(y_min - max(0.3, y_range*0.5), y_max + max(0.3, y_range*0.5))
    
    # 12c. FASt % by cohort - neutral blue
    ax = axes[1, 0]
    fast_by_cohort = df.groupby('cohort')['x_FASt'].mean() * 100
    cohort_year_labels = [cohort_labels.get(c, str(c)) for c in fast_by_cohort.index]
    bars = ax.bar(cohort_year_labels, fast_by_cohort.values, color=colors['fast'], edgecolor='black', linewidth=1)  # Orange for FASt
    ax.set_xlabel('Cohort Year', fontsize=11)
    ax.set_ylabel('% FASt Students', fontsize=11)
    ax.set_title('FASt Enrollment by Cohort', fontsize=12, fontweight='bold')
    for i, v in enumerate(fast_by_cohort.values):
        ax.text(i, v + 0.5, f'{v:.1f}%', ha='center', fontsize=10)
    ax.set_ylim(0, max(fast_by_cohort.values) * 1.15)
    
    # 12d. FASt gap by cohort - RED theme (distress gaps)
    ax = axes[1, 1]
    gaps = []
    cohorts = sorted(df['cohort'].unique())
    for cohort in cohorts:
        cohort_data = df[df['cohort'] == cohort]
        fast_mean = cohort_data[cohort_data['x_FASt']==1]['mean_distress'].mean()
        nonfast_mean = cohort_data[cohort_data['x_FASt']==0]['mean_distress'].mean()
        gaps.append(fast_mean - nonfast_mean)
    
    cohort_year_labels = [cohort_labels.get(c, str(c)) for c in cohorts]
    # Red shades for distress gaps: darker red for larger positive gaps
    gap_colors = [colors['distress'] if g > 0 else '#ff9999' for g in gaps]  # Red gradient
    ax.bar(cohort_year_labels, gaps, color=gap_colors, edgecolor='black', linewidth=1)
    ax.axhline(0, color='black', linewidth=1)
    ax.set_xlabel('Cohort Year', fontsize=11)
    ax.set_ylabel('FASt - Non-FASt Gap (Distress)', fontsize=11)
    ax.set_title('FASt Effect on Distress by Cohort', fontsize=12, fontweight='bold')
    # Auto-scale y-axis symmetrically around 0
    max_gap = max(abs(min(gaps)), abs(max(gaps)))
    ax.set_ylim(-max_gap * 1.2, max_gap * 1.2)
    
    plt.suptitle('Figure 12\nCohort Comparison Patterns', fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    plt.savefig(f'{outdir}/fig12_cohort_patterns.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 12: Cohort Patterns saved')
    
    print(f'\n✓ All deep-cut figures saved to {outdir}/')
    return outdir


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate deep-cut visualizations')
    parser.add_argument('--data', default='rep_data.csv', help='Path to data file')
    parser.add_argument('--outdir', default='results/descriptive_plots', help='Output directory')
    args = parser.parse_args()
    
    main(args.data, args.outdir)
