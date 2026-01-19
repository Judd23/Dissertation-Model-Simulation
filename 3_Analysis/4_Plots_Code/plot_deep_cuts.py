#!/usr/bin/env python3
"""
Deep-cut visualizations for Process-SEM dissertation.
These reveal nuanced patterns in the data beyond basic descriptives.
Supports PSW (propensity score) weighting for causal effect visualization.

Usage:
    python 3_Analysis/4_Plots_Code/plot_deep_cuts.py [--data 1_Dataset/rep_data.csv] [--outdir 4_Model_Results/Figures] [--weights psw]
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import os
import argparse
from scipy import stats
from matplotlib.patches import FancyBboxPatch
import matplotlib.patches as mpatches

# Note for simulated data
SIM_NOTE = "Note: Data simulated to reflect CSU demographics and theorized treatment effects."
PSW_NOTE = "Estimates weighted by propensity score overlap weights (PSW) for causal inference."

def add_sim_note(fig, y_offset=-0.02, weighted=False):
    """Add simulation note (and PSW note if weighted) to bottom of figure."""
    note = SIM_NOTE
    if weighted:
        note = f"{SIM_NOTE}\n{PSW_NOTE}"
    fig.text(0.5, y_offset, note, ha='center', va='top', 
             fontsize=8, fontstyle='italic', color='#666666',
             transform=fig.transFigure)

# ============================================================================
# PSW-Weighted Statistics Helper Functions
# ============================================================================
def weighted_mean(x, w):
    """Calculate weighted mean."""
    mask = ~np.isnan(x) & ~np.isnan(w)
    if mask.sum() == 0:
        return np.nan
    return np.average(x[mask], weights=w[mask])

def weighted_std(x, w):
    """Calculate weighted standard deviation."""
    mask = ~np.isnan(x) & ~np.isnan(w)
    if mask.sum() == 0:
        return np.nan
    avg = np.average(x[mask], weights=w[mask])
    variance = np.average((x[mask] - avg)**2, weights=w[mask])
    return np.sqrt(variance)

def weighted_sem(x, w):
    """Approximate weighted standard error of the mean."""
    mask = ~np.isnan(x) & ~np.isnan(w)
    n_eff = weighted_n_eff(w[mask])
    if n_eff <= 1:
        return np.nan
    return weighted_std(x, w) / np.sqrt(n_eff)

def weighted_n_eff(w):
    """Effective sample size for weights."""
    w = w[~np.isnan(w)]
    if w.size == 0:
        return 0
    return (w.sum() ** 2) / np.sum(w ** 2)

def weighted_proportion(binary_col, w):
    """Calculate weighted proportion for binary variable."""
    mask = ~np.isnan(binary_col) & ~np.isnan(w)
    if mask.sum() == 0:
        return np.nan
    return np.average(binary_col[mask], weights=w[mask])

def weighted_value_counts(series, weights, normalize=False):
    """Calculate weighted value counts."""
    df_temp = pd.DataFrame({'val': series, 'w': weights}).dropna()
    result = df_temp.groupby('val')['w'].sum()
    if normalize:
        result = result / result.sum()
    return result

def weighted_groupby_mean(df, group_col, val_col, weights):
    """Calculate weighted group means."""
    result = {}
    for grp in df[group_col].dropna().unique():
        mask = df[group_col] == grp
        result[grp] = weighted_mean(df.loc[mask, val_col].values, weights[mask])
    return pd.Series(result)

def weighted_groupby_sem(df, group_col, val_col, weights):
    """Calculate weighted group standard errors."""
    result = {}
    for grp in df[group_col].dropna().unique():
        mask = df[group_col] == grp
        result[grp] = weighted_sem(df.loc[mask, val_col].values, weights[mask])
    return pd.Series(result)

def weighted_linregress(x, y, w):
    """Weighted linear regression with r and p-value."""
    mask = ~np.isnan(x) & ~np.isnan(y) & ~np.isnan(w)
    x = x[mask]
    y = y[mask]
    w = w[mask]
    if x.size < 3:
        return np.nan, np.nan, np.nan, np.nan
    w_sum = w.sum()
    x_bar = np.sum(w * x) / w_sum
    y_bar = np.sum(w * y) / w_sum
    dx = x - x_bar
    dy = y - y_bar
    sxx = np.sum(w * dx * dx)
    sxy = np.sum(w * dx * dy)
    syy = np.sum(w * dy * dy)
    if sxx == 0 or syy == 0:
        return np.nan, np.nan, np.nan, np.nan
    slope = sxy / sxx
    intercept = y_bar - slope * x_bar
    r = sxy / np.sqrt(sxx * syy)
    n_eff = weighted_n_eff(w)
    if n_eff > 2:
        y_hat = intercept + slope * x
        sse = np.sum(w * (y - y_hat) ** 2)
        sigma2 = sse / (n_eff - 2)
        se_slope = np.sqrt(sigma2 / sxx)
        if se_slope > 0:
            t = slope / se_slope
            p = 2 * (1 - stats.t.cdf(abs(t), df=n_eff - 2))
        else:
            p = np.nan
    else:
        p = np.nan
    return slope, intercept, r, p

def main(data_path='1_Dataset/rep_data.csv', outdir='4_Model_Results/Figures', weight_col=None):
    os.makedirs(outdir, exist_ok=True)
    
    df = pd.read_csv(data_path)
    plt.style.use('seaborn-v0_8-whitegrid')
    
    # Setup weighting
    use_weights = weight_col is not None and weight_col in df.columns
    if use_weights:
        w = df[weight_col].values
        print(f"✓ Using PSW weights from column '{weight_col}'")
    else:
        w = np.ones(len(df))  # Uniform weights if no PSW
        if weight_col:
            print(f"⚠ Weight column '{weight_col}' not found, using unweighted")
        else:
            print("Using unweighted statistics")
    
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
    # FIGURE 7: Risk Factor Accumulation - Cumulative Disadvantage (weighted)
    # =========================================================================
    fig, axes = plt.subplots(2, 2, figsize=(14, 12))
    
    # Create composite risk score (count of risk factors)
    df['urm'] = df['re_all'].isin(['Hispanic/Latino', 'Black/African American']).astype(int)
    df['risk_count'] = df['x_FASt'] + df['firstgen'] + df['pell'] + df['urm']
    
    # 7a. Distribution of risk factor counts - gradient from light to dark based on risk (weighted)
    ax = axes[0, 0]
    risk_weights = weighted_value_counts(df['risk_count'], w)
    risk_weights = risk_weights.sort_index()
    total_weight = w.sum()
    # Gray gradient: more risk factors = darker
    risk_colors = ['#cccccc', '#999999', '#666666', '#444444', '#222222']
    bars = ax.bar(risk_weights.index, risk_weights.values, 
                  color=[risk_colors[min(int(i), len(risk_colors)-1)] for i in risk_weights.index], 
                  edgecolor='white')
    ax.set_xlabel('Number of Risk Factors\n(FASt + First-Gen + Pell + URM)', fontsize=11)
    ax.set_ylabel('Weighted Count' if use_weights else 'Count', fontsize=11)
    ax.set_title('Distribution of Cumulative Risk Factors' + (' (PSW)' if use_weights else ''), fontsize=12, fontweight='bold')
    for idx, v in zip(risk_weights.index, risk_weights.values):
        ax.text(idx, v + total_weight*0.01, f'{v/total_weight*100:.1f}%', ha='center', fontsize=10)
    
    # 7b. Mean distress by risk count (weighted)
    ax = axes[0, 1]
    mhw_cols = ['MHWdacad', 'MHWdlonely', 'MHWdmental', 'MHWdexhaust', 'MHWdsleep', 'MHWdfinancial']
    df['mean_distress'] = df[mhw_cols].mean(axis=1)
    
    # Detect scale from data (1-6 for NSSE distress items)
    distress_max = int(df[mhw_cols].max().max())
    
    means = weighted_groupby_mean(df, 'risk_count', 'mean_distress', w)
    sems = weighted_groupby_sem(df, 'risk_count', 'mean_distress', w)
    means = means.sort_index()
    sems = sems.reindex(means.index)
    
    ax.errorbar(means.index, means.values, yerr=1.96*sems.values, 
                fmt='o-', color=colors['distress'], capsize=5, markersize=10, linewidth=2)
    ax.set_xlabel('Number of Risk Factors', fontsize=11)
    ax.set_ylabel(f'Mean Emotional Distress (1-{distress_max})', fontsize=11)
    ax.set_title('Cumulative Risk → Distress\n(95% CI)' + (' (PSW)' if use_weights else ''), fontsize=12, fontweight='bold')
    # Auto-scale y-axis with padding
    y_min = means.min() - 1.96*sems.max() - 0.2
    y_max = means.max() + 1.96*sems.max() + 0.2
    ax.set_ylim(max(1, y_min), min(distress_max, y_max))
    
    # Add trend line (weighted)
    slope, intercept, r, p = weighted_linregress(df['risk_count'].values, df['mean_distress'].values, w)
    x_line = np.array([0, 4])
    if not np.isnan(slope):
        p_txt = ""
        if not np.isnan(p):
            p_txt = f", p={p:.3f}" if p >= 0.001 else ", p<.001"
        ax.plot(x_line, intercept + slope * x_line, '--', color='gray', alpha=0.7,
                label=f'Weighted trend: β={slope:.3f}{p_txt}')
    ax.legend(loc='lower right')
    
    # 7c. Mean engagement by risk count (weighted)
    ax = axes[1, 0]
    qi_cols = ['QIstudent', 'QIadvisor', 'QIfaculty', 'QIstaff', 'QIadmin']
    df['mean_engagement'] = df[qi_cols].mean(axis=1)
    
    # Detect scale from data (1-7 for QI items)
    engage_max = int(df[qi_cols].max().max())
    
    means = weighted_groupby_mean(df, 'risk_count', 'mean_engagement', w)
    sems = weighted_groupby_sem(df, 'risk_count', 'mean_engagement', w)
    means = means.sort_index()
    sems = sems.reindex(means.index)
    
    ax.errorbar(means.index, means.values, yerr=1.96*sems.values, 
                fmt='s-', color=colors['engagement'], capsize=5, markersize=10, linewidth=2)
    ax.set_xlabel('Number of Risk Factors', fontsize=11)
    ax.set_ylabel(f'Mean Quality of Engagement (1-{engage_max})', fontsize=11)
    ax.set_title('Cumulative Risk → Engagement\n(95% CI)' + (' (PSW)' if use_weights else ''), fontsize=12, fontweight='bold')
    # Auto-scale y-axis with padding
    y_min = means.min() - 1.96*sems.max() - 0.2
    y_max = means.max() + 1.96*sems.max() + 0.2
    ax.set_ylim(max(1, y_min), min(engage_max, y_max))
    
    slope, intercept, r, p = weighted_linregress(df['risk_count'].values, df['mean_engagement'].values, w)
    x_line = np.array([0, 4])
    if not np.isnan(slope):
        p_txt = ""
        if not np.isnan(p):
            p_txt = f", p={p:.3f}" if p >= 0.001 else ", p<.001"
        ax.plot(x_line, intercept + slope * x_line, '--', color='gray', alpha=0.7,
                label=f'Weighted trend: β={slope:.3f}{p_txt}')
    ax.legend(loc='upper right')
    
    # 7d. % Low belonging by risk count (weighted)
    ax = axes[1, 1]
    df['low_belonging'] = (df['sbcommunity'] <= 2).astype(int)
    
    # Calculate weighted proportions by risk count
    pct_low = {}
    ci_low = []
    ci_high = []
    for rc in sorted(df['risk_count'].dropna().unique()):
        mask = df['risk_count'] == rc
        pct = weighted_proportion(df.loc[mask, 'low_belonging'].values.astype(float), w[mask]) * 100
        pct_low[rc] = pct
        n_eff = weighted_n_eff(w[mask])
        se = np.sqrt(pct/100 * (1-pct/100) / n_eff) * 100 if n_eff > 0 else np.nan
        ci_low.append(max(0, pct - 1.96*se))
        ci_high.append(min(100, pct + 1.96*se))
    
    pct_low = pd.Series(pct_low).sort_index()
    
    ax.bar(pct_low.index, pct_low.values, color='#2ca02c', edgecolor='white')  # Green for belonging
    ax.errorbar(pct_low.index, pct_low.values, 
                yerr=[pct_low.values - ci_low, np.array(ci_high) - pct_low.values],
                fmt='none', color='black', capsize=5)
    ax.set_xlabel('Number of Risk Factors', fontsize=11)
    ax.set_ylabel('% Low Community Belonging', fontsize=11)
    ax.set_title('Cumulative Risk → Low Belonging\n(95% CI)' + (' (PSW)' if use_weights else ''), fontsize=12, fontweight='bold')
    ax.axhline(42, color='gray', linestyle='--', alpha=0.7, label='National avg (42%)')
    ax.legend()
    
    plt.suptitle('Figure 7\nCumulative Disadvantage Analysis' + (' (PSW Weighted)' if use_weights else ''), fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    add_sim_note(fig, weighted=use_weights)
    plt.savefig(f'{outdir}/fig7_cumulative_risk.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 7: Cumulative Risk Analysis saved')
    
    # =========================================================================
    # FIGURE 8: Credit Dose × FASt Interaction (Moderation Visualization)
    # =========================================================================
    if 'trnsfr_cr' in df.columns or 'credit_dose' in df.columns:
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
            w_mask = w[mask]
            # Bin and average for smooth line
            bins = np.linspace(0, max(credits), 15)
            bin_means = []
            bin_centers = []
            for i in range(len(bins)-1):
                bin_mask = (x >= bins[i]) & (x < bins[i+1])
                if bin_mask.sum() > 5:
                    bin_centers.append((bins[i] + bins[i+1])/2)
                    bin_means.append(weighted_mean(y[bin_mask], w_mask[bin_mask]))
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
            mask_bin = df['credit_bin'] == bin_label
            if mask_bin.sum() > 10:
                mask_fast = mask_bin & (df['x_FASt'] == 1)
                mask_nonfast = mask_bin & (df['x_FASt'] == 0)
                fast_vals = df.loc[mask_fast, 'mean_distress'].values
                nonfast_vals = df.loc[mask_nonfast, 'mean_distress'].values
                fast_w = w[mask_fast]
                nonfast_w = w[mask_nonfast]
                fast_n = weighted_n_eff(fast_w)
                nonfast_n = weighted_n_eff(nonfast_w)
                
                if fast_n > 5 and nonfast_n > 5:
                    fast_mean = weighted_mean(fast_vals, fast_w)
                    nonfast_mean = weighted_mean(nonfast_vals, nonfast_w)
                    gap = fast_mean - nonfast_mean
                    # Pooled SE
                    fast_var = weighted_std(fast_vals, fast_w) ** 2
                    nonfast_var = weighted_std(nonfast_vals, nonfast_w) ** 2
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
                mask_fast = mask & (df['x_FASt']==1)
                mask_nonfast = mask & (df['x_FASt']==0)
                fast_data = df.loc[mask_fast, 'mean_distress'].values
                nonfast_data = df.loc[mask_nonfast, 'mean_distress'].values
                fast_w = w[mask_fast]
                nonfast_w = w[mask_nonfast]
                
                if len(fast_data) > 5 and len(nonfast_data) > 5:
                    fast_mean = weighted_mean(fast_data, fast_w)
                    nonfast_mean = weighted_mean(nonfast_data, nonfast_w)
                    effect = fast_mean - nonfast_mean
                    fast_var = weighted_std(fast_data, fast_w) ** 2
                    nonfast_var = weighted_std(nonfast_data, nonfast_w) ** 2
                    fast_n = weighted_n_eff(fast_w)
                    nonfast_n = weighted_n_eff(nonfast_w)
                    se = np.sqrt(fast_var/fast_n + nonfast_var/nonfast_n)
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
                mask_fast = mask & (df['x_FASt']==1)
                mask_nonfast = mask & (df['x_FASt']==0)
                fast_data = df.loc[mask_fast, 'mean_engagement'].values
                nonfast_data = df.loc[mask_nonfast, 'mean_engagement'].values
                fast_w = w[mask_fast]
                nonfast_w = w[mask_nonfast]
                
                if len(fast_data) > 5 and len(nonfast_data) > 5:
                    fast_mean = weighted_mean(fast_data, fast_w)
                    nonfast_mean = weighted_mean(nonfast_data, nonfast_w)
                    effect = fast_mean - nonfast_mean
                    fast_var = weighted_std(fast_data, fast_w) ** 2
                    nonfast_var = weighted_std(nonfast_data, nonfast_w) ** 2
                    fast_n = weighted_n_eff(fast_w)
                    nonfast_n = weighted_n_eff(nonfast_w)
                    se = np.sqrt(fast_var/fast_n + nonfast_var/nonfast_n)
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
        add_sim_note(fig)
        plt.savefig(f'{outdir}/fig8_credit_dose_moderation.png', dpi=300, bbox_inches='tight')
        plt.close()
        print('✓ Figure 8: Credit Dose Moderation saved')
    else:
        print("⚠ Figure 8 skipped: requires 'trnsfr_cr' or 'credit_dose' column.")
    
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
    
    # Add regression line (weighted)
    slope, intercept, r, p = weighted_linregress(df['mean_distress'].values, df['mean_devadj'].values, w)
    x_line = np.array([df['mean_distress'].min(), df['mean_distress'].max()])
    p_txt = ""
    if not np.isnan(p):
        p_txt = f", p={p:.3f}" if p >= 0.001 else ", p<.001"
    ax.plot(x_line, intercept + slope * x_line, '-', color=colors['distress'], linewidth=3,
            label=f'r = {r:.3f}{p_txt}')
    ax.set_xlabel('Emotional Distress (EmoDiss)', fontsize=11)
    ax.set_ylabel('Developmental Adjustment (DevAdj)', fontsize=11)
    ax.set_title('Mediator Path: EmoDiss → DevAdj', fontsize=12, fontweight='bold')
    ax.legend()
    
    # 9b. Engagement → Developmental Adjustment scatter
    ax = axes[0, 1]
    ax.scatter(df['mean_engagement'], df['mean_devadj'], alpha=0.2, c='gray', s=10)
    
    slope, intercept, r, p = weighted_linregress(df['mean_engagement'].values, df['mean_devadj'].values, w)
    x_line = np.array([df['mean_engagement'].min(), df['mean_engagement'].max()])
    p_txt = ""
    if not np.isnan(p):
        p_txt = f", p={p:.3f}" if p >= 0.001 else ", p<.001"
    ax.plot(x_line, intercept + slope * x_line, '-', color=colors['engagement'], linewidth=3,
            label=f'r = {r:.3f}{p_txt}')
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
    fast_mask = df['x_FASt'] == 1
    nonfast_mask = df['x_FASt'] == 0
    a1 = weighted_mean(df.loc[fast_mask, 'mean_distress'].values, w[fast_mask]) - weighted_mean(df.loc[nonfast_mask, 'mean_distress'].values, w[nonfast_mask])
    # b1: Distress-DevAdj slope
    b1 = weighted_linregress(df['mean_distress'].values, df['mean_devadj'].values, w)[0]
    # a2: Mean difference in engagement (FASt - Non-FASt)
    a2 = weighted_mean(df.loc[fast_mask, 'mean_engagement'].values, w[fast_mask]) - weighted_mean(df.loc[nonfast_mask, 'mean_engagement'].values, w[nonfast_mask])
    # b2: Engagement-DevAdj slope
    b2 = weighted_linregress(df['mean_engagement'].values, df['mean_devadj'].values, w)[0]
    
    ind_distress = a1 * b1
    ind_engage = a2 * b2
    total_indirect = ind_distress + ind_engage
    
    # Direct effect (unadjusted mean difference)
    direct = weighted_mean(df.loc[fast_mask, 'mean_devadj'].values, w[fast_mask]) - weighted_mean(df.loc[nonfast_mask, 'mean_devadj'].values, w[nonfast_mask])
    
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
    add_sim_note(fig)
    plt.savefig(f'{outdir}/fig9_mediation_pathways.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 9: Mediation Pathways saved')
    
    # =========================================================================
    # FIGURE 10: Intersectionality Matrix (FASt × First-Gen × URM)
    # Redesigned: Grouped bars for direct FASt vs Non-FASt comparison
    # =========================================================================
    fig, axes = plt.subplots(2, 2, figsize=(14, 12))
    
    # Define demographic subgroups (4 combinations of First-Gen × URM)
    subgroup_labels = ['Cont-Gen\nNon-URM', 'Cont-Gen\nURM', 'First-Gen\nNon-URM', 'First-Gen\nURM']
    subgroup_keys = [('0', '0'), ('0', '1'), ('1', '0'), ('1', '1')]  # (firstgen, urm)
    
    # 10a. Distress by subgroup: FASt vs Non-FASt side-by-side
    ax = axes[0, 0]
    x = np.arange(len(subgroup_labels))
    width = 0.35
    
    nonfast_distress = []
    fast_distress = []
    nonfast_distress_err = []
    fast_distress_err = []
    
    for fg, urm in subgroup_keys:
        # Non-FASt
        mask_nf = (df['x_FASt'].astype(str) == '0') & (df['firstgen'].astype(str) == fg) & (df['urm'].astype(str) == urm)
        if mask_nf.sum() > 0:
            vals = df.loc[mask_nf, 'mean_distress'].values
            w_nf = w[mask_nf]
            nonfast_distress.append(weighted_mean(vals, w_nf))
            nonfast_distress_err.append(1.96 * weighted_sem(vals, w_nf))
        else:
            nonfast_distress.append(np.nan)
            nonfast_distress_err.append(0)
        # FASt
        mask_f = (df['x_FASt'].astype(str) == '1') & (df['firstgen'].astype(str) == fg) & (df['urm'].astype(str) == urm)
        if mask_f.sum() > 0:
            vals = df.loc[mask_f, 'mean_distress'].values
            w_f = w[mask_f]
            fast_distress.append(weighted_mean(vals, w_f))
            fast_distress_err.append(1.96 * weighted_sem(vals, w_f))
        else:
            fast_distress.append(np.nan)
            fast_distress_err.append(0)
    
    bars1 = ax.bar(x - width/2, nonfast_distress, width, yerr=nonfast_distress_err, capsize=4,
                   label='Non-FASt', color='#ff6666', edgecolor='black', hatch='///')
    bars2 = ax.bar(x + width/2, fast_distress, width, yerr=fast_distress_err, capsize=4,
                   label='FASt', color='#ff9900', edgecolor='black')
    
    ax.set_ylabel('Mean Distress', fontsize=11)
    ax.set_title('Emotional Distress by Intersectional Identity', fontsize=12, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(subgroup_labels, fontsize=9)
    ax.legend(loc='upper right')
    all_vals = [v for v in nonfast_distress + fast_distress if not np.isnan(v)]
    if all_vals:
        ax.set_ylim(max(1, min(all_vals) - 0.5), max(all_vals) + 0.5)
    
    # 10b. Engagement by subgroup: FASt vs Non-FASt side-by-side
    ax = axes[0, 1]
    
    nonfast_engage = []
    fast_engage = []
    nonfast_engage_err = []
    fast_engage_err = []
    
    for fg, urm in subgroup_keys:
        # Non-FASt
        mask_nf = (df['x_FASt'].astype(str) == '0') & (df['firstgen'].astype(str) == fg) & (df['urm'].astype(str) == urm)
        if mask_nf.sum() > 0:
            vals = df.loc[mask_nf, 'mean_engagement'].values
            w_nf = w[mask_nf]
            nonfast_engage.append(weighted_mean(vals, w_nf))
            nonfast_engage_err.append(1.96 * weighted_sem(vals, w_nf))
        else:
            nonfast_engage.append(np.nan)
            nonfast_engage_err.append(0)
        # FASt
        mask_f = (df['x_FASt'].astype(str) == '1') & (df['firstgen'].astype(str) == fg) & (df['urm'].astype(str) == urm)
        if mask_f.sum() > 0:
            vals = df.loc[mask_f, 'mean_engagement'].values
            w_f = w[mask_f]
            fast_engage.append(weighted_mean(vals, w_f))
            fast_engage_err.append(1.96 * weighted_sem(vals, w_f))
        else:
            fast_engage.append(np.nan)
            fast_engage_err.append(0)
    
    bars1 = ax.bar(x - width/2, nonfast_engage, width, yerr=nonfast_engage_err, capsize=4,
                   label='Non-FASt', color='#3399ff', edgecolor='black', hatch='///')
    bars2 = ax.bar(x + width/2, fast_engage, width, yerr=fast_engage_err, capsize=4,
                   label='FASt', color='#ff9900', edgecolor='black')
    
    ax.set_ylabel('Mean Engagement', fontsize=11)
    ax.set_title('Quality of Engagement by Intersectional Identity', fontsize=12, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(subgroup_labels, fontsize=9)
    ax.legend(loc='upper right')
    all_vals = [v for v in nonfast_engage + fast_engage if not np.isnan(v)]
    if all_vals:
        ax.set_ylim(max(1, min(all_vals) - 0.5), max(all_vals) + 0.5)
    
    # 10c. Heatmap: FASt × First-Gen interaction on distress
    ax = axes[1, 0]
    pivot_vals = np.empty((2, 2))
    for i, fg in enumerate([0, 1]):
        for j, fast in enumerate([0, 1]):
            mask = (df['firstgen'] == fg) & (df['x_FASt'] == fast)
            pivot_vals[i, j] = weighted_mean(df.loc[mask, 'mean_distress'].values, w[mask])
    pivot = pd.DataFrame(pivot_vals, index=['Continuing-Gen', 'First-Gen'], columns=['Non-FASt', 'FASt'])
    
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
    pivot_eng_vals = np.empty((2, 2))
    for i, urm in enumerate([0, 1]):
        for j, fast in enumerate([0, 1]):
            mask = (df['urm'] == urm) & (df['x_FASt'] == fast)
            pivot_eng_vals[i, j] = weighted_mean(df.loc[mask, 'mean_engagement'].values, w[mask])
    pivot_eng = pd.DataFrame(pivot_eng_vals, index=['Non-URM', 'URM'], columns=['Non-FASt', 'FASt'])
    
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
    add_sim_note(fig)
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
    
    fast_mask = df['x_FASt'] == 1
    nonfast_mask = df['x_FASt'] == 0
    fast_means = [weighted_mean(df.loc[fast_mask, out].values, w[fast_mask]) for out in outcomes]
    fast_sems = [weighted_sem(df.loc[fast_mask, out].values, w[fast_mask]) for out in outcomes]
    nonfast_means = [weighted_mean(df.loc[nonfast_mask, out].values, w[nonfast_mask]) for out in outcomes]
    nonfast_sems = [weighted_sem(df.loc[nonfast_mask, out].values, w[nonfast_mask]) for out in outcomes]
    
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
        means = [weighted_mean(df.loc[df['risk_count']==r, out].values, w[df['risk_count']==r]) for r in risk_levels]
        # Normalize to z-scores for comparison across different scales
        grand_mean = weighted_mean(df[out].values, w)
        grand_sd = weighted_std(df[out].values, w)
        z_means = [(m - grand_mean) / grand_sd if grand_sd > 0 else np.nan for m in means]
        
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
    add_sim_note(fig)
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
    cohort_levels = sorted(df['cohort'].dropna().unique())
    cohort_distress_mean = [weighted_mean(df.loc[df['cohort']==c, 'mean_distress'].values, w[df['cohort']==c]) for c in cohort_levels]
    cohort_distress_sem = [weighted_sem(df.loc[df['cohort']==c, 'mean_distress'].values, w[df['cohort']==c]) for c in cohort_levels]
    cohort_years = [cohort_labels.get(c, str(c)) for c in cohort_levels]
    ax.errorbar(cohort_years, cohort_distress_mean, 
                yerr=1.96*np.array(cohort_distress_sem), fmt='o-', capsize=5, 
                color=colors['distress'], markersize=10, linewidth=2)
    ax.set_xlabel('Cohort Year', fontsize=11)
    ax.set_ylabel('Mean Distress', fontsize=11)
    ax.set_title('Distress Trends Across Cohorts', fontsize=12, fontweight='bold')
    # Auto-scale y-axis
    y_min, y_max = np.min(cohort_distress_mean), np.max(cohort_distress_mean)
    y_range = y_max - y_min
    ax.set_ylim(y_min - max(0.3, y_range*0.5), y_max + max(0.3, y_range*0.5))
    
    # 12b. Engagement trend by cohort - BLUE theme
    ax = axes[0, 1]
    cohort_engage_mean = [weighted_mean(df.loc[df['cohort']==c, 'mean_engagement'].values, w[df['cohort']==c]) for c in cohort_levels]
    cohort_engage_sem = [weighted_sem(df.loc[df['cohort']==c, 'mean_engagement'].values, w[df['cohort']==c]) for c in cohort_levels]
    ax.errorbar(cohort_years, cohort_engage_mean, 
                yerr=1.96*np.array(cohort_engage_sem), fmt='s-', capsize=5, 
                color=colors['engagement'], markersize=10, linewidth=2)
    ax.set_xlabel('Cohort Year', fontsize=11)
    ax.set_ylabel('Mean Engagement', fontsize=11)
    ax.set_title('Engagement Trends Across Cohorts', fontsize=12, fontweight='bold')
    # Auto-scale y-axis
    y_min, y_max = np.min(cohort_engage_mean), np.max(cohort_engage_mean)
    y_range = y_max - y_min
    ax.set_ylim(y_min - max(0.3, y_range*0.5), y_max + max(0.3, y_range*0.5))
    
    # 12c. FASt % by cohort - neutral blue
    ax = axes[1, 0]
    fast_by_cohort = [weighted_proportion(df.loc[df['cohort']==c, 'x_FASt'].values.astype(float), w[df['cohort']==c]) * 100 for c in cohort_levels]
    cohort_year_labels = [cohort_labels.get(c, str(c)) for c in cohort_levels]
    bars = ax.bar(cohort_year_labels, fast_by_cohort, color=colors['fast'], edgecolor='black', linewidth=1)  # Orange for FASt
    ax.set_xlabel('Cohort Year', fontsize=11)
    ax.set_ylabel('% FASt Students', fontsize=11)
    ax.set_title('FASt Enrollment by Cohort', fontsize=12, fontweight='bold')
    for i, v in enumerate(fast_by_cohort):
        ax.text(i, v + 0.5, f'{v:.1f}%', ha='center', fontsize=10)
    ax.set_ylim(0, max(fast_by_cohort) * 1.15)
    
    # 12d. FASt gap by cohort - RED theme (distress gaps)
    ax = axes[1, 1]
    gaps = []
    cohorts = cohort_levels
    for cohort in cohorts:
        cohort_data = df['cohort'] == cohort
        fast_mean = weighted_mean(df.loc[cohort_data & (df['x_FASt']==1), 'mean_distress'].values, w[cohort_data & (df['x_FASt']==1)])
        nonfast_mean = weighted_mean(df.loc[cohort_data & (df['x_FASt']==0), 'mean_distress'].values, w[cohort_data & (df['x_FASt']==0)])
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
    
    plt.suptitle('Figure 12\nCohort Comparison Patterns' + (' (PSW Weighted)' if use_weights else ''), fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    add_sim_note(fig, weighted=use_weights)
    plt.savefig(f'{outdir}/fig12_cohort_patterns.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 12: Cohort Patterns saved')
    
    print(f'\n✓ All deep-cut figures saved to {outdir}/')
    return outdir


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate deep-cut visualizations with optional PSW weighting')
    parser.add_argument('--data', default='1_Dataset/rep_data.csv', help='Path to data file')
    parser.add_argument('--outdir', default='4_Model_Results/Figures', help='Output directory')
    parser.add_argument('--weights', default=None, help='Name of PSW weight column (e.g., "psw")')
    args = parser.parse_args()
    
    main(args.data, args.outdir, weight_col=args.weights)
