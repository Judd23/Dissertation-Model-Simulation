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

def ensure_columns(df, cols):
    """Ensure required columns exist; fill missing with NA."""
    for col in cols:
        if col not in df.columns:
            df[col] = np.nan

def write_fig_data(outdir, filename, data, index=False):
    """Write figure data to CSV with NA for missing values."""
    path = os.path.join(outdir, filename)
    if not isinstance(data, pd.DataFrame):
        data = pd.DataFrame(data)
    data.to_csv(path, index=index, na_rep="NA")
    return path

def load_lavaan_params(path):
    """Load lavaan parameter estimates table or return None if missing."""
    if not os.path.exists(path):
        return None
    try:
        return pd.read_csv(path, sep="\t")
    except Exception:
        try:
            return pd.read_csv(path, sep=r"\s+")
        except Exception:
            return None

def main(data_path='1_Dataset/rep_data.csv', outdir='4_Model_Results/Figures', weight_col=None):
    os.makedirs(outdir, exist_ok=True)
    
    df = pd.read_csv(data_path)
    required_cols = [
        're_all', 'x_FASt', 'firstgen', 'pell', 'credit_dose', 'trnsfr_cr', 'cohort', 'psw',
        'MHWdacad', 'MHWdlonely', 'MHWdmental', 'MHWdexhaust', 'MHWdsleep', 'MHWdfinancial',
        'QIstudent', 'QIadvisor', 'QIfaculty', 'QIstaff', 'QIadmin',
        'sbvalued', 'sbmyself', 'sbcommunity',
        'pgthink', 'pganalyze', 'pgwork', 'pgvalues', 'pgprobsolve',
        'SEwellness', 'SEnonacad', 'SEactivities', 'SEacademic', 'SEdiverse',
        'evalexp', 'sameinst'
    ]
    ensure_columns(df, required_cols)
    plt.style.use('seaborn-v0_8-whitegrid')

    lavaan_params_path = os.getenv(
        "LAVAAN_PARAMS_PATH",
        "4_Model_Results/Outputs/RQ1_RQ3_main/structural/structural_parameterEstimates.txt"
    )
    lavaan_params = load_lavaan_params(lavaan_params_path)
    
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
    total_weight = np.sum(w)
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
    distress_max_raw = pd.to_numeric(df[mhw_cols].max().max(), errors='coerce')
    distress_max = int(distress_max_raw) if np.isfinite(distress_max_raw) else 6
    
    means = weighted_groupby_mean(df, 'risk_count', 'mean_distress', w)
    sems = weighted_groupby_sem(df, 'risk_count', 'mean_distress', w)
    means = means.sort_index()
    sems = sems.reindex(means.index)
    distress_means = means.copy()
    distress_sems = sems.copy()
    
    ax.errorbar(means.index, means.values, yerr=1.96*sems.values, 
                fmt='o-', color=colors['distress'], capsize=5, markersize=10, linewidth=2)
    ax.set_xlabel('Number of Risk Factors', fontsize=11)
    ax.set_ylabel(f'Mean Emotional Distress (1-{distress_max})', fontsize=11)
    ax.set_title('Cumulative Risk → Distress\n(95% CI)' + (' (PSW)' if use_weights else ''), fontsize=12, fontweight='bold')
    # Auto-scale y-axis with padding
    mean_vals = means.values
    sem_vals = sems.values
    if np.isfinite(mean_vals).any() and np.isfinite(sem_vals).any():
        y_min = np.nanmin(mean_vals) - 1.96*np.nanmax(sem_vals) - 0.2
        y_max = np.nanmax(mean_vals) + 1.96*np.nanmax(sem_vals) + 0.2
        if np.isfinite(y_min) and np.isfinite(y_max):
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
    engage_max_raw = pd.to_numeric(df[qi_cols].max().max(), errors='coerce')
    engage_max = int(engage_max_raw) if np.isfinite(engage_max_raw) else 7
    
    means = weighted_groupby_mean(df, 'risk_count', 'mean_engagement', w)
    sems = weighted_groupby_sem(df, 'risk_count', 'mean_engagement', w)
    means = means.sort_index()
    sems = sems.reindex(means.index)
    engagement_means = means.copy()
    engagement_sems = sems.copy()
    
    ax.errorbar(means.index, means.values, yerr=1.96*sems.values, 
                fmt='s-', color=colors['engagement'], capsize=5, markersize=10, linewidth=2)
    ax.set_xlabel('Number of Risk Factors', fontsize=11)
    ax.set_ylabel(f'Mean Quality of Engagement (1-{engage_max})', fontsize=11)
    ax.set_title('Cumulative Risk → Engagement\n(95% CI)' + (' (PSW)' if use_weights else ''), fontsize=12, fontweight='bold')
    # Auto-scale y-axis with padding
    mean_vals = means.values
    sem_vals = sems.values
    if np.isfinite(mean_vals).any() and np.isfinite(sem_vals).any():
        y_min = np.nanmin(mean_vals) - 1.96*np.nanmax(sem_vals) - 0.2
        y_max = np.nanmax(mean_vals) + 1.96*np.nanmax(sem_vals) + 0.2
        if np.isfinite(y_min) and np.isfinite(y_max):
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
    
    fig7_rows = []
    total_weight_safe = total_weight if total_weight > 0 else np.nan
    for rc, val in zip(risk_weights.index, risk_weights.values):
        pct = val / total_weight_safe * 100 if np.isfinite(total_weight_safe) else np.nan
        fig7_rows.append({
            'panel': 'risk_distribution',
            'risk_count': rc,
            'weighted_count': val,
            'percent': pct
        })
    for rc in distress_means.index:
        mean_val = distress_means.loc[rc]
        se_val = distress_sems.loc[rc]
        fig7_rows.append({
            'panel': 'distress_by_risk',
            'risk_count': rc,
            'mean': mean_val,
            'se': se_val,
            'ci_low': mean_val - 1.96 * se_val,
            'ci_high': mean_val + 1.96 * se_val
        })
    for rc in engagement_means.index:
        mean_val = engagement_means.loc[rc]
        se_val = engagement_sems.loc[rc]
        fig7_rows.append({
            'panel': 'engagement_by_risk',
            'risk_count': rc,
            'mean': mean_val,
            'se': se_val,
            'ci_low': mean_val - 1.96 * se_val,
            'ci_high': mean_val + 1.96 * se_val
        })
    for idx, rc in enumerate(pct_low.index):
        fig7_rows.append({
            'panel': 'low_belonging',
            'risk_count': rc,
            'percent_low': pct_low.loc[rc],
            'ci_low': ci_low[idx] if idx < len(ci_low) else np.nan,
            'ci_high': ci_high[idx] if idx < len(ci_high) else np.nan
        })
    write_fig_data(outdir, 'fig7_cumulative_risk_data.csv', pd.DataFrame(fig7_rows))
    
    plt.suptitle('Figure 7 (Descriptive)\nCumulative Disadvantage Analysis' + (' (PSW Weighted)' if use_weights else ''), fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    add_sim_note(fig, weighted=use_weights)
    plt.savefig(f'{outdir}/fig7_cumulative_risk.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 7: Cumulative Risk Analysis saved')

    def param_stats(label):
        if lavaan_params is None or 'label' not in lavaan_params.columns:
            return np.nan, np.nan, np.nan
        rows = lavaan_params[lavaan_params['label'] == label]
        if rows.empty:
            return np.nan, np.nan, np.nan
        row = rows.iloc[0]
        return (
            row.get('est', np.nan),
            row.get('ci.lower', np.nan),
            row.get('ci.upper', np.nan)
        )

    def plot_effects_by_z(ax, label_prefix, title, color, panel_name, rows_list):
        z_levels = ['low', 'mid', 'high']
        ests = []
        ci_lows = []
        ci_highs = []
        for z in z_levels:
            label = f"{label_prefix}_z_{z}"
            est, ci_low, ci_high = param_stats(label)
            rows_list.append({
                'panel': panel_name,
                'z_level': z,
                'label': label,
                'estimate': est,
                'ci_low': ci_low,
                'ci_high': ci_high
            })
            ests.append(est)
            ci_lows.append(ci_low)
            ci_highs.append(ci_high)
        x = np.arange(len(z_levels))
        ax.bar(x, ests, color=color, alpha=0.7, edgecolor='black')
        if np.all(np.isfinite(ests)) and np.all(np.isfinite(ci_lows)) and np.all(np.isfinite(ci_highs)):
            yerr = [np.array(ests) - np.array(ci_lows), np.array(ci_highs) - np.array(ests)]
            ax.errorbar(x, ests, yerr=yerr, fmt='none', ecolor='black', capsize=4)
        ax.axhline(0, color='black', linewidth=0.8)
        ax.set_xticks(x)
        ax.set_xticklabels(['Low', 'Mid', 'High'])
        ax.set_xlabel('Credit Dose (Z)', fontsize=10)
        ax.set_ylabel('Effect', fontsize=10)
        ax.set_title(title, fontsize=12, fontweight='bold')
        if not np.any(np.isfinite(ests)):
            ax.text(0.5, 0.5, 'NA', transform=ax.transAxes, ha='center', va='center', fontsize=12)

    def plot_single_effect(ax, label, title, color, panel_name, rows_list):
        est, ci_low, ci_high = param_stats(label)
        rows_list.append({
            'panel': panel_name,
            'z_level': np.nan,
            'label': label,
            'estimate': est,
            'ci_low': ci_low,
            'ci_high': ci_high
        })
        ax.bar([0], [est], color=color, alpha=0.7, edgecolor='black')
        if np.isfinite(est) and np.isfinite(ci_low) and np.isfinite(ci_high):
            yerr = [[est - ci_low], [ci_high - est]]
            ax.errorbar([0], [est], yerr=yerr, fmt='none', ecolor='black', capsize=4)
        ax.axhline(0, color='black', linewidth=0.8)
        ax.set_xticks([0])
        ax.set_xticklabels([label])
        ax.set_ylabel('Effect', fontsize=10)
        ax.set_title(title, fontsize=12, fontweight='bold')
        if not np.isfinite(est):
            ax.text(0.5, 0.5, 'NA', transform=ax.transAxes, ha='center', va='center', fontsize=12)
    
    # =========================================================================
    # FIGURE 8: Credit Dose × FASt Interaction (Moderation Visualization)
    # =========================================================================
    fig, axes = plt.subplots(2, 2, figsize=(14, 12))
    fig8_rows = []

    plot_effects_by_z(
        axes[0, 0],
        'a1',
        'FASt → Emotional Distress (a1)\nby Credit Dose',
        colors['distress'],
        'a1_by_z',
        fig8_rows
    )
    plot_effects_by_z(
        axes[0, 1],
        'a2',
        'FASt → Engagement (a2)\nby Credit Dose',
        colors['engagement'],
        'a2_by_z',
        fig8_rows
    )
    plot_single_effect(
        axes[1, 0],
        'a1z',
        'FASt × Credit Dose → Distress (a1z)',
        colors['distress'],
        'a1z',
        fig8_rows
    )
    plot_single_effect(
        axes[1, 1],
        'a2z',
        'FASt × Credit Dose → Engagement (a2z)',
        colors['engagement'],
        'a2z',
        fig8_rows
    )

    fig8_data = pd.DataFrame(fig8_rows) if fig8_rows else pd.DataFrame([{'panel': np.nan}])
    write_fig_data(outdir, 'fig8_credit_dose_moderation_data.csv', fig8_data)

    plt.suptitle(
        'Figure 8 (Diagnostic)\nCredit Dose × FASt Moderation (SEM)' + (' (PSW Weighted)' if use_weights else ''),
        fontsize=14,
        fontweight='bold',
        y=1.02
    )
    plt.tight_layout()
    add_sim_note(fig, weighted=use_weights)
    plt.savefig(f'{outdir}/fig8_credit_dose_moderation.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 8: Credit Dose Moderation saved')
    
    # =========================================================================
    # FIGURE 9: Mediation Pathways (SEM diagnostics)
    # =========================================================================
    fig, axes = plt.subplots(2, 2, figsize=(14, 12))
    fig9_rows = []

    plot_effects_by_z(
        axes[0, 0],
        'dir',
        'Direct Effect (X → DevAdj)\nby Credit Dose',
        colors['fast'],
        'direct_by_z',
        fig9_rows
    )
    plot_effects_by_z(
        axes[0, 1],
        'ind_EmoDiss',
        'Indirect via EmoDiss\nby Credit Dose',
        colors['distress'],
        'ind_emodiss_by_z',
        fig9_rows
    )
    plot_effects_by_z(
        axes[1, 0],
        'ind_QualEngag',
        'Indirect via QualEngag\nby Credit Dose',
        colors['engagement'],
        'ind_qualengag_by_z',
        fig9_rows
    )
    plot_effects_by_z(
        axes[1, 1],
        'total',
        'Total Effect (X → DevAdj)\nby Credit Dose',
        colors['gains'],
        'total_by_z',
        fig9_rows
    )

    fig9_data = pd.DataFrame(fig9_rows) if fig9_rows else pd.DataFrame([{'panel': np.nan}])
    write_fig_data(outdir, 'fig9_mediation_pathways_data.csv', fig9_data)

    plt.suptitle(
        'Figure 9 (Diagnostic)\nMediation Pathways (SEM)' + (' (PSW Weighted)' if use_weights else ''),
        fontsize=14,
        fontweight='bold',
        y=1.02
    )
    plt.tight_layout()
    add_sim_note(fig, weighted=use_weights)
    plt.savefig(f'{outdir}/fig9_mediation_pathways.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 9: Mediation Pathways saved')
    
    # =========================================================================
    # FIGURE 10: Intersectionality Matrix (FASt × First-Gen × URM)
    # Redesigned: Grouped bars for direct FASt vs Non-FASt comparison
    # =========================================================================
    fig, axes = plt.subplots(2, 2, figsize=(14, 12))
    fig10_rows = []
    
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
    for (fg, urm), nf_mean, f_mean, nf_err, f_err in zip(subgroup_keys, nonfast_distress, fast_distress, nonfast_distress_err, fast_distress_err):
        fig10_rows.append({
            'panel': 'distress_by_subgroup',
            'firstgen': fg,
            'urm': urm,
            'fast': 0,
            'mean': nf_mean,
            'se': nf_err / 1.96 if nf_err else np.nan
        })
        fig10_rows.append({
            'panel': 'distress_by_subgroup',
            'firstgen': fg,
            'urm': urm,
            'fast': 1,
            'mean': f_mean,
            'se': f_err / 1.96 if f_err else np.nan
        })
    
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
    for (fg, urm), nf_mean, f_mean, nf_err, f_err in zip(subgroup_keys, nonfast_engage, fast_engage, nonfast_engage_err, fast_engage_err):
        fig10_rows.append({
            'panel': 'engagement_by_subgroup',
            'firstgen': fg,
            'urm': urm,
            'fast': 0,
            'mean': nf_mean,
            'se': nf_err / 1.96 if nf_err else np.nan
        })
        fig10_rows.append({
            'panel': 'engagement_by_subgroup',
            'firstgen': fg,
            'urm': urm,
            'fast': 1,
            'mean': f_mean,
            'se': f_err / 1.96 if f_err else np.nan
        })
    
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
    if np.all(np.isnan(pivot.values)):
        vmin_d, vmax_d = 0, 1
    else:
        vmin_d, vmax_d = np.nanmin(pivot.values) - 0.1, np.nanmax(pivot.values) + 0.1
    if not np.isfinite(vmin_d) or not np.isfinite(vmax_d):
        vmin_d, vmax_d = 0, 1
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
            fig10_rows.append({
                'panel': 'heatmap_distress',
                'firstgen': pivot.index[i],
                'fast': pivot.columns[j],
                'mean': pivot.values[i, j]
            })
    
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
    if np.all(np.isnan(pivot_eng.values)):
        vmin_e, vmax_e = 0, 1
    else:
        vmin_e, vmax_e = np.nanmin(pivot_eng.values) - 0.1, np.nanmax(pivot_eng.values) + 0.1
    if not np.isfinite(vmin_e) or not np.isfinite(vmax_e):
        vmin_e, vmax_e = 0, 1
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
            fig10_rows.append({
                'panel': 'heatmap_engagement',
                'urm': pivot_eng.index[i],
                'fast': pivot_eng.columns[j],
                'mean': pivot_eng.values[i, j]
            })
    
    ax.set_title('FASt × URM → Engagement\n(Cell means)', fontsize=12, fontweight='bold')
    plt.colorbar(im, ax=ax, label='Mean Engagement')
    
    fig10_data = pd.DataFrame(fig10_rows) if fig10_rows else pd.DataFrame([{'panel': np.nan}])
    write_fig_data(outdir, 'fig10_intersectionality_data.csv', fig10_data)
    
    plt.suptitle('Figure 10 (Diagnostic)\nIntersectionality Analysis', fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    add_sim_note(fig)
    plt.savefig(f'{outdir}/fig10_intersectionality.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 10: Intersectionality Analysis saved')
    
    # =========================================================================
    # FIGURE 11: Outcome Comparison by FASt Status and Risk Level
    # =========================================================================
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    fig11_rows = []
    
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
    for label, f_mean, nf_mean, f_se, nf_se in zip(outcome_labels, fast_means, nonfast_means, fast_sems, nonfast_sems):
        fig11_rows.append({
            'panel': 'outcome_means_by_fast',
            'outcome': label,
            'fast_mean': f_mean,
            'nonfast_mean': nf_mean,
            'fast_sem': f_se,
            'nonfast_sem': nf_se
        })
    
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
        for r, z in zip(risk_levels, z_means):
            fig11_rows.append({
                'panel': 'outcome_z_by_risk',
                'outcome': label,
                'risk_count': r,
                'z_mean': z
            })
        
        offset = (i - 2) * width
        bars = ax.bar(x + offset, z_means, width, label=label, color=outcome_colors[i], edgecolor='black', linewidth=0.8)
    
    ax.set_ylabel('Standardized Score (z)', fontsize=11)
    ax.set_xlabel('Number of Risk Factors (FASt + First-Gen + Pell + URM)', fontsize=11)
    ax.set_title('Standardized Outcomes by Risk Level', fontsize=12, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels([str(r) for r in risk_levels])
    ax.legend(loc='upper right', fontsize=9)
    ax.axhline(0, color='black', linewidth=0.5, linestyle='--')
    
    write_fig_data(outdir, 'fig11_outcome_profiles_data.csv', pd.DataFrame(fig11_rows))
    
    plt.suptitle('Figure 11 (Diagnostic)\nStudent Outcome Profiles', fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    add_sim_note(fig)
    plt.savefig(f'{outdir}/fig11_outcome_profiles.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 11: Outcome Profiles saved')
    
    # =========================================================================
    # FIGURE 12: Longitudinal Cohort Patterns
    # =========================================================================
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig12_rows = []
    
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
    cohort_distress_vals = np.array(cohort_distress_mean, dtype=float)
    if np.isfinite(cohort_distress_vals).any():
        y_min = np.nanmin(cohort_distress_vals)
        y_max = np.nanmax(cohort_distress_vals)
        y_range = y_max - y_min
        ax.set_ylim(y_min - max(0.3, y_range*0.5), y_max + max(0.3, y_range*0.5))
    for cohort, mean_val, se_val in zip(cohort_years, cohort_distress_mean, cohort_distress_sem):
        fig12_rows.append({
            'panel': 'cohort_distress',
            'cohort': cohort,
            'mean': mean_val,
            'se': se_val
        })
    
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
    cohort_engage_vals = np.array(cohort_engage_mean, dtype=float)
    if np.isfinite(cohort_engage_vals).any():
        y_min = np.nanmin(cohort_engage_vals)
        y_max = np.nanmax(cohort_engage_vals)
        y_range = y_max - y_min
        ax.set_ylim(y_min - max(0.3, y_range*0.5), y_max + max(0.3, y_range*0.5))
    for cohort, mean_val, se_val in zip(cohort_years, cohort_engage_mean, cohort_engage_sem):
        fig12_rows.append({
            'panel': 'cohort_engagement',
            'cohort': cohort,
            'mean': mean_val,
            'se': se_val
        })
    
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
    fast_vals = np.array(fast_by_cohort, dtype=float)
    if np.isfinite(fast_vals).any():
        ax.set_ylim(0, np.nanmax(fast_vals) * 1.15)
    for cohort, pct in zip(cohort_year_labels, fast_by_cohort):
        fig12_rows.append({
            'panel': 'cohort_fast_pct',
            'cohort': cohort,
            'percent_fast': pct
        })
    
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
    gap_vals = np.array(gaps, dtype=float)
    if np.isfinite(gap_vals).any():
        max_gap = np.nanmax(np.abs(gap_vals))
        if max_gap > 0:
            ax.set_ylim(-max_gap * 1.2, max_gap * 1.2)
    for cohort, gap in zip(cohort_year_labels, gaps):
        fig12_rows.append({
            'panel': 'cohort_gap_distress',
            'cohort': cohort,
            'gap': gap
        })
    
    write_fig_data(outdir, 'fig12_cohort_patterns_data.csv', pd.DataFrame(fig12_rows))
    
    plt.suptitle('Figure 12 (Diagnostic)\nCohort Comparison Patterns' + (' (PSW Weighted)' if use_weights else ''), fontsize=14, fontweight='bold', y=1.02)
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
