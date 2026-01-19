#!/usr/bin/env python3
"""
Generate descriptive statistics plots for Process-SEM dissertation.
Outputs publication-quality figures for Chapter 4 (Results).
Supports PSW (propensity score) weighting for causal effect visualization.

Usage:
    python 3_Analysis/4_Plots_Code/plot_descriptives.py [--data 1_Dataset/rep_data.csv] [--outdir 4_Model_Results/Figures] [--weights psw]
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import os
import argparse

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
    n_eff = mask.sum()  # Use sample size as approximation
    if n_eff <= 1:
        return np.nan
    return weighted_std(x, w) / np.sqrt(n_eff)

def weighted_proportion(binary_col, w):
    """Calculate weighted proportion for binary variable."""
    mask = ~np.isnan(binary_col) & ~np.isnan(w)
    if mask.sum() == 0:
        return np.nan
    return np.average(binary_col[mask], weights=w[mask])

def weighted_corr(x, y, w):
    """Weighted Pearson correlation."""
    mask = ~np.isnan(x) & ~np.isnan(y) & ~np.isnan(w)
    if mask.sum() < 2:
        return np.nan
    x = x[mask]
    y = y[mask]
    w = w[mask]
    w_sum = w.sum()
    if w_sum == 0:
        return np.nan
    x_bar = np.sum(w * x) / w_sum
    y_bar = np.sum(w * y) / w_sum
    cov = np.sum(w * (x - x_bar) * (y - y_bar)) / w_sum
    var_x = np.sum(w * (x - x_bar) ** 2) / w_sum
    var_y = np.sum(w * (y - y_bar) ** 2) / w_sum
    if var_x <= 0 or var_y <= 0:
        return np.nan
    return cov / np.sqrt(var_x * var_y)

def weighted_hist(ax, data, weights, bins=20, **kwargs):
    """Create weighted histogram."""
    mask = ~np.isnan(data) & ~np.isnan(weights)
    ax.hist(data[mask], bins=bins, weights=weights[mask], **kwargs)

def weighted_value_counts(series, weights, normalize=False):
    """Calculate weighted value counts."""
    df_temp = pd.DataFrame({'val': series, 'w': weights}).dropna()
    result = df_temp.groupby('val')['w'].sum()
    if normalize:
        result = result / result.sum()
    return result

def normalize_is_woman(sex_series):
    """Normalize sex codes to a boolean is_woman series (0 or 'Female')."""
    if pd.api.types.is_numeric_dtype(sex_series):
        is_woman = sex_series.eq(0)
    else:
        sex_str = sex_series.astype('string')
        is_woman = sex_str.str.lower().eq('female')
    is_woman = is_woman.where(sex_series.notna())
    return is_woman.astype(float)

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

def main(data_path='1_Dataset/rep_data.csv', outdir='4_Model_Results/Figures', weight_col=None):
    os.makedirs(outdir, exist_ok=True)
    
    df = pd.read_csv(data_path)
    required_cols = [
        're_all', 'firstgen', 'pell', 'sex', 'x_FASt', 'trnsfr_cr', 'credit_dose', 'cohort',
        'MHWdacad', 'MHWdlonely', 'MHWdmental', 'MHWdexhaust', 'MHWdsleep', 'MHWdfinancial',
        'QIstudent', 'QIadvisor', 'QIfaculty', 'QIstaff', 'QIadmin',
        'sbvalued', 'sbmyself', 'sbcommunity', 'pgthink', 'pganalyze', 'pgwork', 'pgvalues', 'pgprobsolve',
        'SEwellness', 'SEnonacad', 'SEactivities', 'SEacademic', 'SEdiverse',
        'evalexp', 'sameinst'
    ]
    ensure_columns(df, required_cols)
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
    
    # 1a. Race/Ethnicity - BLACK bars (weighted)
    ax = axes[0, 0]
    race_order = ['Hispanic/Latino', 'White', 'Asian', 'Black/African American', 'Other/Multiracial/Unknown']
    race_weights = weighted_value_counts(df['re_all'], w)
    race_weights = race_weights.reindex(race_order, fill_value=0)
    total_weight = w.sum()
    bars = ax.barh(race_order, race_weights.values, color='black', edgecolor='white')
    ax.set_xlabel('Weighted Count' if use_weights else 'Count', fontsize=11)
    ax.set_title('Race/Ethnicity Distribution' + (' (PSW)' if use_weights else ''), fontsize=12, fontweight='bold')
    for i, (v, pct) in enumerate(zip(race_weights.values, race_weights.values/total_weight*100)):
        ax.text(v + total_weight*0.01, i, f'{pct:.1f}%', va='center', fontsize=10)
    ax.set_xlim(0, max(race_weights.values) * 1.15)
    
    # 1b. First-gen and Pell status - BLACK bar charts (weighted)
    ax = axes[0, 1]
    categories = ['First-Gen', 'Pell-Eligible', 'Women', 'FASt Status']
    is_woman = normalize_is_woman(df['sex'])
    yes_pct = [
        weighted_proportion(df['firstgen'].values, w)*100, 
        weighted_proportion(df['pell'].values, w)*100,
        weighted_proportion(is_woman.values, w)*100, 
        weighted_proportion(df['x_FASt'].values, w)*100
    ]
    no_pct = [100-p for p in yes_pct]
    x = np.arange(len(categories))
    width = 0.6
    # Black bars for "Yes", gray for "No"
    for i in range(len(categories)):
        ax.bar(x[i], yes_pct[i], width, color='black', label='Yes' if i == 0 else '')
        ax.bar(x[i], no_pct[i], width, bottom=yes_pct[i], color='#cccccc', label='No' if i == 0 else '')
    ax.set_ylabel('Percentage', fontsize=11)
    ax.set_title('Key Demographic Indicators' + (' (PSW)' if use_weights else ''), fontsize=12, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(categories, fontsize=10)
    ax.legend(loc='upper right')
    for i, pct in enumerate(yes_pct):
        ax.text(i, pct/2, f'{pct:.1f}%', ha='center', va='center', color='white', fontweight='bold')
    
    # 1c. Credit dose distribution (use raw trnsfr_cr if available) - YELLOW for credits (weighted)
    ax = axes[1, 0]
    credit_col = 'trnsfr_cr' if 'trnsfr_cr' in df.columns else 'credit_dose'
    credit_data = df[credit_col].values
    weighted_hist(ax, credit_data, w, bins=20, color=colors['credits'], edgecolor='white', alpha=0.8)
    wtd_mean = weighted_mean(credit_data, w)
    ax.axvline(12, color=colors['fast'], linestyle='--', linewidth=2, label='FASt threshold (12)')  # Orange
    ax.axvline(wtd_mean, color='#8B4513', linestyle='-', linewidth=2, 
               label=f'Mean ({wtd_mean:.1f})')  # Brown for mean
    ax.set_xlabel('Transfer Credits', fontsize=11)
    ax.set_ylabel('Weighted Frequency' if use_weights else 'Frequency', fontsize=11)
    ax.set_title('Distribution of Transfer Credits' + (' (PSW)' if use_weights else ''), fontsize=12, fontweight='bold')
    ax.legend()
    
    # 1d. Cohort distribution - BLACK bars (weighted)
    ax = axes[1, 1]
    cohort_weights = weighted_value_counts(df['cohort'], w)
    cohort_weights = cohort_weights.sort_index()
    ax.bar(cohort_weights.index.astype(str), cohort_weights.values, color='black', edgecolor='white')
    ax.set_xlabel('Cohort Year', fontsize=11)
    ax.set_ylabel('Weighted Count' if use_weights else 'Count', fontsize=11)
    ax.set_title('Cohort Distribution' + (' (PSW)' if use_weights else ''), fontsize=12, fontweight='bold')
    for i, v in enumerate(cohort_weights.values):
        ax.text(i, v + total_weight*0.01, f'{v:.0f}', ha='center', fontsize=10)
    
    fig1_rows = []
    total_weight_safe = total_weight if total_weight > 0 else np.nan
    for cat, val in zip(race_order, race_weights.values):
        pct = val / total_weight_safe * 100 if np.isfinite(total_weight_safe) else np.nan
        fig1_rows.append({'panel': 'race', 'category': cat, 'weighted_count': val, 'percent': pct})
    for cat, yes, no in zip(categories, yes_pct, no_pct):
        fig1_rows.append({'panel': 'indicator', 'category': cat, 'yes_pct': yes, 'no_pct': no})
    mask = ~np.isnan(credit_data) & ~np.isnan(w)
    if mask.sum() > 0:
        counts, edges = np.histogram(credit_data[mask], bins=20, weights=w[mask])
        for i in range(len(counts)):
            fig1_rows.append({
                'panel': 'credit_hist',
                'bin_left': edges[i],
                'bin_right': edges[i + 1],
                'weighted_count': counts[i]
            })
    else:
        fig1_rows.append({'panel': 'credit_hist', 'bin_left': np.nan, 'bin_right': np.nan, 'weighted_count': np.nan})
    fig1_rows.append({'panel': 'credit_summary', 'mean': wtd_mean, 'fast_threshold': 12})
    for cohort, val in zip(cohort_weights.index.astype(str), cohort_weights.values):
        fig1_rows.append({'panel': 'cohort', 'category': cohort, 'weighted_count': val})
    write_fig_data(outdir, 'fig1_demographics_data.csv', pd.DataFrame(fig1_rows))
    
    plt.suptitle('Figure 1\nSample Demographics Overview' + (' (PSW Weighted)' if use_weights else ''), fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    add_sim_note(fig, weighted=use_weights)
    plt.savefig(f'{outdir}/fig1_demographics.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 1: Demographics saved')
    
    # =========================================================================
    # FIGURE 2: Emotional Distress (EmoDiss) Distributions (weighted)
    # =========================================================================
    fig, axes = plt.subplots(2, 3, figsize=(14, 9))
    mhw_cols = ['MHWdacad', 'MHWdlonely', 'MHWdmental', 'MHWdexhaust', 'MHWdsleep', 'MHWdfinancial']
    mhw_labels = ['Academic Difficulties', 'Loneliness', 'Mental Health', 'Exhaustion', 'Sleep Problems', 'Financial Stress']
    fig2_rows = []
    
    # Red gradient: lighter for low values, darker for high values (more distress = darker red)
    for idx, (col, label) in enumerate(zip(mhw_cols, mhw_labels)):
        ax = axes[idx // 3, idx % 3]
        counts = weighted_value_counts(df[col], w)
        counts = counts.sort_index()
        max_val_raw = pd.to_numeric(df[col].max(), errors='coerce')
        max_val = int(max_val_raw) if np.isfinite(max_val_raw) else 6
        # Create red gradient based on response value
        red_gradient = plt.cm.Reds(np.linspace(0.2, 0.9, max_val))
        bar_colors = [red_gradient[int(v)-1] for v in counts.index]
        bars = ax.bar(counts.index, counts.values, color=bar_colors, edgecolor='white')
        ax.set_xlabel(f'Response (1=Not at all, {max_val}=Very much)', fontsize=9)
        ax.set_ylabel('Weighted Count' if use_weights else 'Count', fontsize=9)
        threshold = max_val // 2 + 1  # e.g., 4+ on 1-6 scale
        elevated_pct = weighted_proportion((df[col] >= threshold).astype(float).values, w) * 100
        ax.set_title(f'{label}\n({elevated_pct:.1f}% elevated)', fontsize=11, fontweight='bold')
        ax.set_xticks(range(1, max_val + 1))
        if counts.empty:
            fig2_rows.append({
                'item': label,
                'variable': col,
                'response': np.nan,
                'weighted_count': np.nan,
                'elevated_pct': elevated_pct
            })
        else:
            for resp, count in counts.items():
                fig2_rows.append({
                    'item': label,
                    'variable': col,
                    'response': resp,
                    'weighted_count': count,
                    'elevated_pct': elevated_pct
                })
    
    plt.suptitle('Figure 2\nEmotional Distress Indicators (EmoDiss)' + (' (PSW Weighted)' if use_weights else ''), fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    add_sim_note(fig, weighted=use_weights)
    plt.savefig(f'{outdir}/fig2_emotional_distress.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 2: Emotional Distress saved')
    write_fig_data(outdir, 'fig2_emotional_distress_data.csv', pd.DataFrame(fig2_rows))
    
    # =========================================================================
    # FIGURE 3: Quality of Engagement (QualEngag) Distributions - BLUE theme (weighted)
    # =========================================================================
    fig, axes = plt.subplots(2, 3, figsize=(14, 9))
    qi_cols = ['QIstudent', 'QIadvisor', 'QIfaculty', 'QIstaff', 'QIadmin']
    qi_labels = ['Other Students', 'Academic Advisors', 'Faculty', 'Staff', 'Administrators']
    fig3_rows = []
    
    # Blue gradient: lighter for low values, darker for high values
    blue_gradient = ['#cce5ff', '#99ccff', '#66b3ff', '#3399ff', '#0066cc', '#004c99', '#003366']
    
    for idx, (col, label) in enumerate(zip(qi_cols, qi_labels)):
        ax = axes[idx // 3, idx % 3]
        counts = weighted_value_counts(df[col], w)
        counts = counts.sort_index()
        # Apply gradient based on response value (1-7)
        bar_colors = [blue_gradient[int(v)-1] for v in counts.index]
        ax.bar(counts.index, counts.values, color=bar_colors, edgecolor='white')
        ax.set_xlabel('Response (1=Poor, 7=Excellent)', fontsize=9)
        ax.set_ylabel('Weighted Frequency' if use_weights else 'Frequency', fontsize=9)
        wtd_m = weighted_mean(df[col].values, w)
        wtd_sd = weighted_std(df[col].values, w)
        ax.set_title(f'Quality of Interactions: {label}\n(M={wtd_m:.2f}, SD={wtd_sd:.2f})', 
                     fontsize=11, fontweight='bold')
        ax.set_xticks(range(1, 8))
        if counts.empty:
            fig3_rows.append({
                'item': label,
                'variable': col,
                'response': np.nan,
                'weighted_count': np.nan,
                'weighted_mean': wtd_m,
                'weighted_sd': wtd_sd
            })
        else:
            for resp, count in counts.items():
                fig3_rows.append({
                    'item': label,
                    'variable': col,
                    'response': resp,
                    'weighted_count': count,
                    'weighted_mean': wtd_m,
                    'weighted_sd': wtd_sd
                })
    
    axes[1, 2].axis('off')
    
    plt.suptitle('Figure 3\nQuality of Engagement Indicators (QualEngag)' + (' (PSW Weighted)' if use_weights else ''), fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    add_sim_note(fig, weighted=use_weights)
    plt.savefig(f'{outdir}/fig3_quality_engagement.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 3: Quality of Engagement saved')
    write_fig_data(outdir, 'fig3_quality_engagement_data.csv', pd.DataFrame(fig3_rows))
    
    # =========================================================================
    # FIGURE 4: Developmental Adjustment (DevAdj) - Belonging, Gains, Support, Satisfaction
    # =========================================================================
    fig, axes = plt.subplots(2, 4, figsize=(16, 9))
    fig4_rows = []
    
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
    sb_max_raw = pd.to_numeric(df[sb_cols].max().max(), errors='coerce')
    sb_max = int(sb_max_raw) if np.isfinite(sb_max_raw) else 4
    green_gradient = plt.cm.Greens(np.linspace(0.3, 0.9, sb_max))
    
    for idx, (col, label) in enumerate(zip(sb_cols, sb_labels)):
        ax = axes[0, idx]
        counts = weighted_value_counts(df[col], w)
        counts = counts.sort_index()
        bar_colors = [green_gradient[int(v)-1] for v in counts.index]
        bars = ax.bar(counts.index, counts.values, color=bar_colors, edgecolor='white')
        ax.set_xlabel(f'Response (1-{sb_max})', fontsize=9)
        ax.set_ylabel('Weighted Count' if use_weights else 'Count', fontsize=9)
        low_mask = (df[col] <= sb_max / 2).astype(float)
        low_mask[df[col].isna()] = np.nan
        low_pct = weighted_proportion(low_mask.values, w) * 100
        ax.set_title(f'{label}\n({low_pct:.1f}% low)', fontsize=10, fontweight='bold')
        ax.set_xticks(range(1, sb_max + 1))
        wtd_mean = weighted_mean(df[col].values, w)
        wtd_sd = weighted_std(df[col].values, w)
        wtd_n = np.sum(~np.isnan(df[col].values) & ~np.isnan(w))
        if counts.empty:
            fig4_rows.append({
                'panel': 'belonging_item',
                'item': label,
                'variable': col,
                'response': np.nan,
                'weighted_count': np.nan,
                'low_pct': low_pct,
                'weighted_mean': wtd_mean,
                'weighted_sd': wtd_sd,
                'weighted_n': wtd_n,
                'scale_min': 1,
                'scale_max': sb_max
            })
        else:
            for resp, count in counts.items():
                fig4_rows.append({
                    'panel': 'belonging_item',
                    'item': label,
                    'variable': col,
                    'response': resp,
                    'weighted_count': count,
                    'low_pct': low_pct,
                    'weighted_mean': wtd_mean,
                    'weighted_sd': wtd_sd,
                    'weighted_n': wtd_n,
                    'scale_min': 1,
                    'scale_max': sb_max
                })
    
    # Summary belonging (weighted)
    ax = axes[0, 3]
    low_threshold = sb_max // 2  # Bottom half of scale
    low_belong = []
    for c in sb_cols:
        low_mask = (df[c] <= low_threshold).astype(float)
        low_mask[df[c].isna()] = np.nan
        low_belong.append(weighted_proportion(low_mask.values, w) * 100)
    # Green gradient based on percentage (higher = darker = worse)
    green_shades = [plt.cm.Greens(0.3 + 0.5 * (v / max(low_belong) if max(low_belong) > 0 else 0)) for v in low_belong]
    ax.barh(sb_labels, low_belong, color=green_shades)
    ax.set_xlabel(f'% Low Belonging (≤{low_threshold})', fontsize=10)
    ax.set_title('Summary: Low Belonging', fontsize=10, fontweight='bold')
    max_pct = max(low_belong) * 1.3 if max(low_belong) > 0 else 50
    ax.set_xlim(0, min(100, max_pct))
    for i, v in enumerate(low_belong):
        ax.text(v + 1, i, f'{v:.1f}%', va='center', fontsize=10)
    for label, pct in zip(sb_labels, low_belong):
        fig4_rows.append({
            'panel': 'belonging_summary',
            'item': label,
            'low_pct': pct,
            'weighted_n': np.nan,
            'scale_min': 1,
            'scale_max': sb_max
        })
    
    # Gains items (Perceived Gains) - CYAN (weighted)
    pg_cols = ['pgthink', 'pganalyze', 'pgwork', 'pgvalues', 'pgprobsolve']
    pg_labels = ['Think Critically', 'Analyze Info', 'Work with Others', 'Develop Values', 'Problem Solving']
    pg_max_raw = pd.to_numeric(df[pg_cols].max().max(), errors='coerce')
    pg_max = int(pg_max_raw) if np.isfinite(pg_max_raw) else 4
    means = [weighted_mean(df[c].values, w) for c in pg_cols]
    sds = [weighted_std(df[c].values, w) for c in pg_cols]
    ns = [np.sum(~np.isnan(df[c].values) & ~np.isnan(w)) for c in pg_cols]
    
    ax = axes[1, 0]
    ax.barh(pg_labels, means, xerr=sds, color=devadj_colors['gains'], capsize=3)
    ax.set_xlabel(f'M ± SD (1-{pg_max} scale)', fontsize=10)
    ax.set_title('Perceived Gains', fontsize=10, fontweight='bold')
    ax.set_xlim(1, pg_max)
    for label, mean_val, sd_val, n_val in zip(pg_labels, means, sds, ns):
        fig4_rows.append({
            'panel': 'gains',
            'item': label,
            'weighted_mean': mean_val,
            'weighted_sd': sd_val,
            'weighted_n': n_val,
            'scale_min': 1,
            'scale_max': pg_max
        })
    
    # SE items (Supportive Environment) - PURPLE (weighted)
    se_cols = ['SEwellness', 'SEnonacad', 'SEactivities', 'SEacademic', 'SEdiverse']
    se_labels = ['Wellness Support', 'Non-Academic Support', 'Co-Curricular Activities', 'Academic Support', 'Diverse Interactions']
    se_max_raw = pd.to_numeric(df[se_cols].max().max(), errors='coerce')
    se_max = int(se_max_raw) if np.isfinite(se_max_raw) else 4
    means = [weighted_mean(df[c].values, w) for c in se_cols]
    sds = [weighted_std(df[c].values, w) for c in se_cols]
    ns = [np.sum(~np.isnan(df[c].values) & ~np.isnan(w)) for c in se_cols]
    
    ax = axes[1, 1]
    ax.barh(se_labels, means, xerr=sds, color=devadj_colors['support'], capsize=3)
    ax.set_xlabel(f'M ± SD (1-{se_max} scale)', fontsize=10)
    ax.set_title('Supportive Environment', fontsize=10, fontweight='bold')
    ax.set_xlim(1, se_max)
    for label, mean_val, sd_val, n_val in zip(se_labels, means, sds, ns):
        fig4_rows.append({
            'panel': 'support',
            'item': label,
            'weighted_mean': mean_val,
            'weighted_sd': sd_val,
            'weighted_n': n_val,
            'scale_min': 1,
            'scale_max': se_max
        })
    
    # Satisfaction - BROWN (weighted)
    ax = axes[1, 2]
    sat_cols = ['evalexp', 'sameinst']
    sat_labels = ['Rate Overall Experience', 'Choose Same Institution']
    sat_max_raw = pd.to_numeric(df[sat_cols].max().max(), errors='coerce')
    sat_max = int(sat_max_raw) if np.isfinite(sat_max_raw) else 4
    means = [weighted_mean(df[c].values, w) for c in sat_cols]
    sds = [weighted_std(df[c].values, w) for c in sat_cols]
    ns = [np.sum(~np.isnan(df[c].values) & ~np.isnan(w)) for c in sat_cols]
    ax.barh(sat_labels, means, xerr=sds, color=devadj_colors['satisfaction'], capsize=3)
    ax.set_xlabel(f'M ± SD (1-{sat_max} scale)', fontsize=10)
    ax.set_title('Satisfaction', fontsize=10, fontweight='bold')
    ax.set_xlim(1, sat_max)
    for label, mean_val, sd_val, n_val in zip(sat_labels, means, sds, ns):
        fig4_rows.append({
            'panel': 'satisfaction',
            'item': label,
            'weighted_mean': mean_val,
            'weighted_sd': sd_val,
            'weighted_n': n_val,
            'scale_min': 1,
            'scale_max': sat_max
        })
    
    axes[1, 3].axis('off')
    
    plt.suptitle('Figure 4\nDevelopmental Adjustment Indicators (DevAdj)' + (' (PSW Weighted)' if use_weights else ''), fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    add_sim_note(fig, weighted=use_weights)
    plt.savefig(f'{outdir}/fig4_developmental_adjustment.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 4: Developmental Adjustment saved')
    write_fig_data(outdir, 'fig4_developmental_adjustment_data.csv', pd.DataFrame(fig4_rows))
    
    # =========================================================================
    # FIGURE 5: Equity Gaps Visualization (weighted)
    # =========================================================================
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig5_rows = []
    
    # Create masks for FASt/Non-FASt
    fast_mask = df['x_FASt'] == 1
    nonfast_mask = df['x_FASt'] == 0
    
    # 5a. FASt vs Non-FASt - Emotional Distress (RED theme, FASt=Orange accent)
    ax = axes[0, 0]
    mhw_short = ['Academic', 'Lonely', 'Mental', 'Exhaust', 'Sleep', 'Financial']
    fast_means = [weighted_mean(df.loc[fast_mask, c].values, w[fast_mask]) for c in mhw_cols]
    nonfast_means = [weighted_mean(df.loc[nonfast_mask, c].values, w[nonfast_mask]) for c in mhw_cols]
    x = np.arange(len(mhw_short))
    width = 0.35
    # Non-FASt: hatched bars
    ax.bar(x - width/2, nonfast_means, width, label='Non-FASt', color='#ff9999', 
           edgecolor='black', linewidth=1, hatch='///')
    ax.bar(x + width/2, fast_means, width, label='FASt', color=colors['fast'], 
           edgecolor='black', linewidth=1)
    # Auto-detect scale from data
    max_scale_raw = pd.to_numeric(df[mhw_cols].max().max(), errors='coerce')
    max_scale = int(max_scale_raw) if np.isfinite(max_scale_raw) else 6
    ax.set_ylabel(f'Mean Distress (1-{max_scale})', fontsize=11)
    ax.set_title('Emotional Distress by FASt Status', fontsize=12, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(mhw_short, fontsize=9)
    ax.legend()
    ax.set_ylim(1, max_scale)
    for label, f_mean, nf_mean in zip(mhw_short, fast_means, nonfast_means):
        fig5_rows.append({
            'panel': 'fast_nonfast_distress',
            'item': label,
            'fast_mean': f_mean,
            'nonfast_mean': nf_mean
        })
    
    # 5b. FASt vs Non-FASt - Quality of Engagement (BLUE theme, FASt=Orange accent)
    ax = axes[0, 1]
    qi_short = ['Students', 'Advisors', 'Faculty', 'Staff', 'Admin']
    fast_means = [weighted_mean(df.loc[fast_mask, c].values, w[fast_mask]) for c in qi_cols]
    nonfast_means = [weighted_mean(df.loc[nonfast_mask, c].values, w[nonfast_mask]) for c in qi_cols]
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
    for label, f_mean, nf_mean in zip(qi_short, fast_means, nonfast_means):
        fig5_rows.append({
            'panel': 'fast_nonfast_engagement',
            'item': label,
            'fast_mean': f_mean,
            'nonfast_mean': nf_mean
        })
    
    # 5c. First-gen gaps - use construct-appropriate colors (weighted)
    ax = axes[1, 0]
    fg_mask = df['firstgen'] == 1
    cg_mask = df['firstgen'] == 0
    key_vars = ['MHWdacad', 'MHWdlonely', 'sbcommunity', 'QIfaculty', 'evalexp']
    key_labels = ['Academic\nDistress', 'Loneliness', 'Community\nBelong', 'Faculty\nQuality', 'Overall\nExperience']
    # Colors match construct: red for distress, green for belonging, blue for engagement, purple for satisfaction
    bar_colors_fg = ['#d62728', '#d62728', '#2ca02c', '#1f77b4', '#8c564b']
    bar_colors_cg = ['#ff9999', '#ff9999', '#90EE90', '#99ccff', '#d4a574']
    
    fg_means = [weighted_mean(df.loc[fg_mask, c].values, w[fg_mask]) for c in key_vars]
    cg_means = [weighted_mean(df.loc[cg_mask, c].values, w[cg_mask]) for c in key_vars]
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
    for label, fg_mean, cg_mean in zip(key_labels, fg_means, cg_means):
        fig5_rows.append({
            'panel': 'firstgen_key',
            'item': label,
            'firstgen_mean': fg_mean,
            'contgen_mean': cg_mean
        })
    
    # 5d. Gap summary (effect sizes) - weighted Cohen's d
    ax = axes[1, 1]
    gap_vars = ['MHWdacad', 'MHWdmental', 'sbcommunity', 'QIfaculty', 'evalexp']
    gap_labels = ['Academic Distress', 'Mental Health', 'Community Belonging', 'Faculty Quality', 'Overall Experience']
    
    # Calculate weighted Cohen's d for FASt effect
    def weighted_cohens_d(g1_vals, g1_wts, g2_vals, g2_wts):
        m1 = weighted_mean(g1_vals, g1_wts)
        m2 = weighted_mean(g2_vals, g2_wts)
        s1 = weighted_std(g1_vals, g1_wts)
        s2 = weighted_std(g2_vals, g2_wts)
        n1 = np.sum(~np.isnan(g1_vals) & ~np.isnan(g1_wts))
        n2 = np.sum(~np.isnan(g2_vals) & ~np.isnan(g2_wts))
        pooled_std = np.sqrt(((n1-1)*s1**2 + (n2-1)*s2**2) / (n1+n2-2))
        return (m1 - m2) / pooled_std if pooled_std > 0 else 0
    
    fast_d = [weighted_cohens_d(
        df.loc[fast_mask, c].values, w[fast_mask],
        df.loc[nonfast_mask, c].values, w[nonfast_mask]
    ) for c in gap_vars]
    
    # Colors by construct: red for distress, green for belonging, blue for engagement
    construct_colors = [colors['distress'], colors['distress'], '#2ca02c', colors['engagement'], '#8c564b']
    ax.barh(gap_labels, fast_d, color=construct_colors, edgecolor='black', linewidth=1)
    ax.axvline(0, color='black', linewidth=0.8)
    ax.axvline(0.2, color='gray', linestyle='--', linewidth=0.8, alpha=0.5)
    ax.axvline(-0.2, color='gray', linestyle='--', linewidth=0.8, alpha=0.5)
    ax.set_xlabel("Cohen's d (FASt vs Non-FASt)", fontsize=11)
    ax.set_title('FASt Effect Sizes\n(+) = FASt higher, (−) = FASt lower', fontsize=12, fontweight='bold')
    ax.set_xlim(-0.5, 0.5)
    for label, d in zip(gap_labels, fast_d):
        fig5_rows.append({
            'panel': 'fast_effect_sizes',
            'item': label,
            'cohens_d': d
        })
    
    plt.suptitle('Figure 5\nEquity Gaps Analysis' + (' (PSW Weighted)' if use_weights else ''), fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    add_sim_note(fig, weighted=use_weights)
    plt.savefig(f'{outdir}/fig5_equity_gaps.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 5: Equity Gaps saved')
    write_fig_data(outdir, 'fig5_equity_gaps_data.csv', pd.DataFrame(fig5_rows))
    
    # =========================================================================
    # FIGURE 6: Correlation Heatmap - Spearman (weighted, all analysis variables)
    # =========================================================================
    fig, ax = plt.subplots(figsize=(14, 12))

    analysis_cols = [c for c in df.columns if c != weight_col]
    corr_df = df[analysis_cols].copy()
    if use_weights:
        ranks = corr_df.rank(method='average', na_option='keep')
        corr_matrix = pd.DataFrame(index=analysis_cols, columns=analysis_cols, dtype=float)
        for col_i in analysis_cols:
            xi = ranks[col_i].values
            mask_i = ~np.isnan(xi) & ~np.isnan(w)
            if not np.any(mask_i):
                corr_matrix.loc[col_i, :] = np.nan
                continue
            for col_j in analysis_cols:
                yj = ranks[col_j].values
                mask = mask_i & ~np.isnan(yj)
                if mask.sum() < 2:
                    corr_matrix.loc[col_i, col_j] = np.nan
                    continue
                corr_matrix.loc[col_i, col_j] = weighted_corr(xi[mask], yj[mask], w[mask])
    else:
        corr_matrix = corr_df.corr(method='spearman')

    write_fig_data(outdir, 'fig6_correlation_heatmap_data.csv', corr_matrix, index=True)

    # Use a diverging colormap where RED = positive, BLUE = negative
    # (common interpretation for correlation heatmaps)
    im = ax.imshow(corr_matrix, cmap='RdBu', vmin=-1, vmax=1)
    ax.set_xticks(range(len(analysis_cols)))
    ax.set_yticks(range(len(analysis_cols)))
    ax.set_xticklabels(analysis_cols, rotation=45, ha='right', fontsize=7)
    ax.set_yticklabels(analysis_cols, fontsize=7)
    
    # Add correlation values
    for i in range(len(analysis_cols)):
        for j in range(len(analysis_cols)):
            val = corr_matrix.iloc[i, j]
            color = 'white' if abs(val) > 0.4 else 'black'
            ax.text(j, i, f'{val:.2f}', ha='center', va='center', color=color, fontsize=6)

    plt.colorbar(im, ax=ax, label='Spearman rho (weighted)', shrink=0.8)
    ax.set_title('Figure 6\nSpearman Correlation Matrix (All Analysis Variables)', 
                 fontsize=14, fontweight='bold')
    plt.tight_layout()
    add_sim_note(fig, y_offset=0.01)
    plt.savefig(f'{outdir}/fig6_correlation_heatmap.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('✓ Figure 6: Correlation Heatmap saved')
    
    # =========================================================================
    # FIGURE 13: Love Plot - PSW Balance (unweighted vs weighted SMDs)
    # =========================================================================
    psw_path = os.path.join(os.path.dirname(outdir), "Outputs", "RQ1_RQ3_main", "psw_balance_smd.txt")
    fig13_data = pd.DataFrame([{'covariate': np.nan, 'smd_unweighted': np.nan, 'smd_weighted': np.nan}])
    if os.path.exists(psw_path):
        bal = pd.read_csv(psw_path, sep='\t')
        req_cols = {'covariate', 'smd_unweighted', 'smd_weighted'}
        if req_cols.issubset(bal.columns):
            bal = bal.dropna(subset=['smd_unweighted', 'smd_weighted'])
            fig13_data = bal[['covariate', 'smd_unweighted', 'smd_weighted']].copy()
            covs = bal['covariate'].astype(str).tolist()
            y_pos = np.arange(len(covs))
            fig, ax = plt.subplots(figsize=(10, max(6, len(covs) * 0.3)))
            ax.scatter(bal['smd_unweighted'], y_pos, color='#7f7f7f', label='Unweighted', zorder=3)
            ax.scatter(bal['smd_weighted'], y_pos, color=colors['fast'], label='PSW weighted', zorder=3)
            for i, (u, wgt) in enumerate(zip(bal['smd_unweighted'], bal['smd_weighted'])):
                ax.plot([u, wgt], [i, i], color='#cccccc', linewidth=1, zorder=2)
            ax.axvline(0, color='black', linewidth=0.8)
            ax.axvline(0.1, color='red', linestyle='--', linewidth=0.8)
            ax.axvline(-0.1, color='red', linestyle='--', linewidth=0.8)
            ax.set_yticks(y_pos)
            ax.set_yticklabels(covs, fontsize=9)
            ax.invert_yaxis()
            ax.set_xlabel('Standardized Mean Difference (SMD)', fontsize=11)
            ax.set_title('Figure 13\nLove Plot: Covariate Balance (Unweighted vs PSW Weighted)', fontsize=14, fontweight='bold')
            ax.legend(loc='lower right', fontsize=9)
            plt.tight_layout()
            add_sim_note(fig, y_offset=0.01)
            plt.savefig(f'{outdir}/fig13_love_plot.png', dpi=300, bbox_inches='tight')
            plt.close()
            print('✓ Figure 13: Love Plot saved')
        else:
            print('! Figure 13 skipped: psw_balance_smd.txt missing required columns')
    else:
        print('! Figure 13 skipped: psw_balance_smd.txt not found')
    write_fig_data(outdir, 'fig13_love_plot_data.csv', fig13_data)
    
    print(f'\n✓ All figures saved to {outdir}/')
    return outdir


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate descriptive plots with optional PSW weighting')
    parser.add_argument('--data', default='1_Dataset/rep_data.csv', help='Path to data file')
    parser.add_argument('--outdir', default='4_Model_Results/Figures', help='Output directory')
    parser.add_argument('--weights', default=None, help='Name of PSW weight column (e.g., "psw")')
    args = parser.parse_args()
    
    main(args.data, args.outdir, weight_col=args.weights)
