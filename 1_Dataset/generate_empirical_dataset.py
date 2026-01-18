#!/usr/bin/env python3
"""
Empirically-Aligned Synthetic Dataset Generator for Process-SEM
================================================================

Generates a realistic synthetic dataset (N=5,000) for the FASt student dissertation study.

Key Features:
1. Archetype-based student profiles matching CSU demographics
2. Realistic selection bias (privileged students → FASt)
3. Hidden true effect: FASt HARMS equity-impacted students (post-PSW)
4. NSSE-like response distributions with ceiling effects
5. Empirically-grounded missingness (MAR for MHW, MCAR elsewhere)

Author: Claude Code (generated for Judd Johnson dissertation)
Date: January 2026
"""

from typing import Tuple

import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import truncnorm, norm
import warnings
warnings.filterwarnings('ignore')

# Set seed for reproducibility
np.random.seed(42)

# =============================================================================
# CONFIGURATION
# =============================================================================

N_TOTAL = 5000
FAST_TARGET = 0.27
FAST_CONF_SCALE = 0.20
FAST_BASE_SHIFT = 0.04
PELL_TARGET = 0.52
SEX_FEMALE_PROB = 0.53

# Archetype definitions with prevalence and characteristics
# Demographics use PROBABILITIES (0.0-1.0) for binary vars to ensure variance within groups
# pell/firstgen: probability of being 1 (e.g., 0.65 = 65% pell, 35% non-pell)
#
# CSU DEMOGRAPHIC TARGETS (2024):
#   Race: Hispanic 54%, White 15%, Asian 15-18%, Black 4%, Other/Multiracial ~9%
#   First-gen: ~45-53%, Pell: ~52%, Female: ~60%
#   Living: ~52% family, ~23% on-campus, ~25% off-campus
ARCHETYPES = {
    1: {
        'name': 'Latina Commuter Caretaker',
        'prevalence': 0.25,  # Hispanic target contribution
        'demographics': {'re_all': 'Hispanic/Latino', 'sex': 'Female', 'firstgen': 0.65, 'pell': 0.60},
        'living': 'With family (commuting)',
        'fast_prob': 0.20,
        'base_responses': {
            'EmoDiss': 4.2, 'QualEngag': 4.5, 'Belong': 2.8, 'Gains': 3.0, 'SupportEnv': 2.7, 'Satisf': 2.9
        },
        'fast_effect': {'a1': 0.25, 'a2': -0.20},  # Harmful
        'dose_amplify': 1.2,  # Dose makes it worse
    },
    2: {
        'name': 'Latino Off-Campus Working',
        'prevalence': 0.09,  # Hispanic off-campus segment
        'demographics': {'re_all': 'Hispanic/Latino', 'sex': 'Male', 'firstgen': 0.60, 'pell': 0.55},
        'living': 'Off-campus (rent/apartment)',
        'fast_prob': 0.25,
        'base_responses': {
            'EmoDiss': 3.8, 'QualEngag': 4.8, 'Belong': 2.7, 'Gains': 2.8, 'SupportEnv': 2.6, 'Satisf': 2.8
        },
        'fast_effect': {'a1': 0.15, 'a2': -0.05},  # Harmful but smaller
        'dose_amplify': 1.1,
    },
    3: {
        'name': 'Asian High-Pressure Achiever',
        'prevalence': 0.11,  # Asian target contribution
        'demographics': {'re_all': 'Asian', 'sex': None, 'firstgen': 0.15, 'pell': 0.12},
        'living': 'With family (commuting)',
        'fast_prob': 0.45,
        'base_responses': {
            'EmoDiss': 4.5, 'QualEngag': 5.0, 'Belong': 2.5, 'Gains': 3.2, 'SupportEnv': 2.8, 'Satisf': 3.0
        },
        'fast_effect': {'a1': 0.00, 'a2': 0.00},  # Null - already maxed
        'dose_amplify': 0.0,
    },
    4: {
        'name': 'Asian First-Gen Navigator',
        'prevalence': 0.04,  # Asian first-gen segment
        'demographics': {'re_all': 'Asian', 'sex': None, 'firstgen': 0.65, 'pell': 0.60},
        'living': 'Off-campus (rent/apartment)',
        'fast_prob': 0.30,
        'base_responses': {
            'EmoDiss': 4.8, 'QualEngag': 4.3, 'Belong': 2.3, 'Gains': 2.9, 'SupportEnv': 2.4, 'Satisf': 2.6
        },
        'fast_effect': {'a1': 0.20, 'a2': -0.15},  # Harmful
        'dose_amplify': 1.3,
    },
    5: {
        'name': 'Black Campus Connector',
        'prevalence': 0.025,  # Black campus segment
        'demographics': {'re_all': 'Black/African American', 'sex': 'Female', 'firstgen': 0.55, 'pell': 0.50},
        'living': 'On-campus (residence hall)',
        'fast_prob': 0.15,
        'base_responses': {
            'EmoDiss': 3.5, 'QualEngag': 5.2, 'Belong': 2.6, 'Gains': 3.0, 'SupportEnv': 2.7, 'Satisf': 2.9
        },
        'fast_effect': {'a1': 0.18, 'a2': -0.12},  # Harmful
        'dose_amplify': 1.1,
    },
    6: {
        'name': 'White Residential Traditional',
        'prevalence': 0.03,  # White campus segment
        'demographics': {'re_all': 'White', 'sex': None, 'firstgen': 0.12, 'pell': 0.18},
        'living': 'On-campus (residence hall)',
        'fast_prob': 0.35,
        'base_responses': {
            'EmoDiss': 2.8, 'QualEngag': 5.8, 'Belong': 3.3, 'Gains': 3.1, 'SupportEnv': 3.2, 'Satisf': 3.4
        },
        'fast_effect': {'a1': -0.10, 'a2': 0.12},  # Beneficial
        'dose_amplify': -0.5,  # Dose helps
    },
    7: {
        'name': 'White Off-Campus Working',
        'prevalence': 0.03,  # White off-campus segment
        'demographics': {'re_all': 'White', 'sex': None, 'firstgen': 0.45, 'pell': 0.50},
        'living': 'Off-campus (rent/apartment)',
        'fast_prob': 0.20,
        'base_responses': {
            'EmoDiss': 3.7, 'QualEngag': 4.4, 'Belong': 2.5, 'Gains': 2.7, 'SupportEnv': 2.5, 'Satisf': 2.7
        },
        'fast_effect': {'a1': 0.05, 'a2': -0.02},  # Near null
        'dose_amplify': 0.0,
    },
    8: {
        'name': 'Multiracial Bridge-Builder',
        'prevalence': 0.10,  # Other/Multiracial target contribution
        'demographics': {'re_all': 'Other/Multiracial/Unknown', 'sex': None, 'firstgen': 0.40, 'pell': 0.42},
        'living': None,  # Mixed living distribution
        'fast_prob': 0.25,
        'base_responses': {
            'EmoDiss': 3.4, 'QualEngag': 5.1, 'Belong': 2.7, 'Gains': 3.0, 'SupportEnv': 2.8, 'Satisf': 3.0
        },
        'fast_effect': {'a1': 0.05, 'a2': 0.00},  # Near null
        'dose_amplify': 0.0,
    },
    9: {
        'name': 'Hispanic On-Campus Transitioner',
        'prevalence': 0.20,  # Hispanic campus segment (largest on-campus group)
        'demographics': {'re_all': 'Hispanic/Latino', 'sex': None, 'firstgen': 0.50, 'pell': 0.45},
        'living': 'On-campus (residence hall)',
        'fast_prob': 0.30,
        'base_responses': {
            'EmoDiss': 3.3, 'QualEngag': 5.3, 'Belong': 3.0, 'Gains': 3.1, 'SupportEnv': 3.0, 'Satisf': 3.1
        },
        'fast_effect': {'a1': 0.08, 'a2': -0.05},  # Slight harm
        'dose_amplify': 0.5,
    },
    10: {
        'name': 'Continuing-Gen Cruiser',
        'prevalence': 0.04,  # Mixed race (distributes by population proportions)
        'demographics': {'re_all': None, 'sex': None, 'firstgen': 0.10, 'pell': 0.15},
        'living': None,  # Mixed living distribution
        'fast_prob': 0.40,
        'base_responses': {
            'EmoDiss': 2.5, 'QualEngag': 5.5, 'Belong': 3.2, 'Gains': 2.9, 'SupportEnv': 3.1, 'Satisf': 3.3
        },
        'fast_effect': {'a1': -0.12, 'a2': 0.15},  # Beneficial
        'dose_amplify': -0.5,
    },
    # Additional archetypes for demographic diversity
    11: {
        'name': 'White Rural First-Gen',
        'prevalence': 0.04,  # White family segment
        'demographics': {'re_all': 'White', 'sex': None, 'firstgen': 0.60, 'pell': 0.55},
        'living': 'With family (commuting)',
        'fast_prob': 0.22,
        'base_responses': {
            'EmoDiss': 3.5, 'QualEngag': 4.6, 'Belong': 2.6, 'Gains': 2.8, 'SupportEnv': 2.6, 'Satisf': 2.8
        },
        'fast_effect': {'a1': 0.12, 'a2': -0.08},  # Slight harm (equity-impacted)
        'dose_amplify': 0.8,
    },
    12: {
        'name': 'Black Male Striver',
        'prevalence': 0.015,  # Black off-campus segment
        'demographics': {'re_all': 'Black/African American', 'sex': 'Male', 'firstgen': 0.50, 'pell': 0.45},
        'living': 'Off-campus (rent/apartment)',
        'fast_prob': 0.18,
        'base_responses': {
            'EmoDiss': 3.6, 'QualEngag': 4.7, 'Belong': 2.5, 'Gains': 2.9, 'SupportEnv': 2.5, 'Satisf': 2.7
        },
        'fast_effect': {'a1': 0.15, 'a2': -0.10},  # Harmful
        'dose_amplify': 1.0,
    },
    13: {
        'name': 'White Working-Class Striver',
        'prevalence': 0.03,  # White off-campus segment
        'demographics': {'re_all': 'White', 'sex': None, 'firstgen': 0.50, 'pell': 0.45},
        'living': 'Off-campus (rent/apartment)',
        'fast_prob': 0.18,
        'base_responses': {
            'EmoDiss': 3.8, 'QualEngag': 4.3, 'Belong': 2.4, 'Gains': 2.7, 'SupportEnv': 2.4, 'Satisf': 2.6
        },
        'fast_effect': {'a1': 0.10, 'a2': -0.06},  # Slight harm (equity-impacted)
        'dose_amplify': 0.7,
    },
}

# Item definitions by construct
ITEMS = {
    # Belonging (1-4 scale)
    'sbvalued': {'construct': 'Belong', 'scale': (1, 4), 'loading': 0.82},
    'sbmyself': {'construct': 'Belong', 'scale': (1, 4), 'loading': 0.78},
    'sbcommunity': {'construct': 'Belong', 'scale': (1, 4), 'loading': 0.85},

    # Perceived Gains (1-4 scale)
    'pganalyze': {'construct': 'Gains', 'scale': (1, 4), 'loading': 0.72},
    'pgthink': {'construct': 'Gains', 'scale': (1, 4), 'loading': 0.80},
    'pgwork': {'construct': 'Gains', 'scale': (1, 4), 'loading': 0.75},
    'pgvalues': {'construct': 'Gains', 'scale': (1, 4), 'loading': 0.70},
    'pgprobsolve': {'construct': 'Gains', 'scale': (1, 4), 'loading': 0.77},

    # Supportive Environment (1-4 scale)
    'SEacademic': {'construct': 'SupportEnv', 'scale': (1, 4), 'loading': 0.80},
    'SEwellness': {'construct': 'SupportEnv', 'scale': (1, 4), 'loading': 0.78},
    'SEnonacad': {'construct': 'SupportEnv', 'scale': (1, 4), 'loading': 0.72},
    'SEactivities': {'construct': 'SupportEnv', 'scale': (1, 4), 'loading': 0.68},
    'SEdiverse': {'construct': 'SupportEnv', 'scale': (1, 4), 'loading': 0.74},

    # Satisfaction (1-4 scale)
    'sameinst': {'construct': 'Satisf', 'scale': (1, 4), 'loading': 0.88},
    'evalexp': {'construct': 'Satisf', 'scale': (1, 4), 'loading': 0.85},

    # Emotional Distress (1-6 scale)
    'MHWdacad': {'construct': 'EmoDiss', 'scale': (1, 6), 'loading': 0.75},
    'MHWdlonely': {'construct': 'EmoDiss', 'scale': (1, 6), 'loading': 0.80},
    'MHWdmental': {'construct': 'EmoDiss', 'scale': (1, 6), 'loading': 0.85},
    'MHWdexhaust': {'construct': 'EmoDiss', 'scale': (1, 6), 'loading': 0.82},
    'MHWdsleep': {'construct': 'EmoDiss', 'scale': (1, 6), 'loading': 0.78},
    'MHWdfinancial': {'construct': 'EmoDiss', 'scale': (1, 6), 'loading': 0.65},

    # Quality of Engagement (1-7 scale)
    'QIadmin': {'construct': 'QualEngag', 'scale': (1, 7), 'loading': 0.72},
    'QIstudent': {'construct': 'QualEngag', 'scale': (1, 7), 'loading': 0.75},
    'QIadvisor': {'construct': 'QualEngag', 'scale': (1, 7), 'loading': 0.80},
    'QIfaculty': {'construct': 'QualEngag', 'scale': (1, 7), 'loading': 0.82},
    'QIstaff': {'construct': 'QualEngag', 'scale': (1, 7), 'loading': 0.78},
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_ordinal_response(latent_score, scale_min, scale_max, noise_sd=0.8):
    """Convert latent score to ordinal response with noise."""
    # Add measurement error
    observed = latent_score + np.random.normal(0, noise_sd)
    # Round and clip to scale
    response = int(np.round(observed))
    return np.clip(response, scale_min, scale_max)


def generate_hs_background(archetype_id, n):
    """Generate high school background variables based on archetype."""
    arch = ARCHETYPES[archetype_id]
    is_privileged = archetype_id in [3, 6, 10]
    is_first_gen = arch['demographics'].get('firstgen', 0) == 1

    # HS Grades (1-8 scale, 8=A)
    if is_privileged:
        hgrades = np.random.choice([6, 7, 8], n, p=[0.25, 0.40, 0.35])
    elif is_first_gen:
        hgrades = np.random.choice([4, 5, 6, 7], n, p=[0.15, 0.30, 0.35, 0.20])
    else:
        hgrades = np.random.choice([5, 6, 7, 8], n, p=[0.20, 0.35, 0.30, 0.15])

    # Parent Education (1-8 scale)
    if is_first_gen:
        bparented = np.random.choice([1, 2, 3, 4], n, p=[0.15, 0.40, 0.30, 0.15])
    else:
        bparented = np.random.choice([5, 6, 7, 8], n, p=[0.35, 0.35, 0.20, 0.10])

    # AP Course Load (0=<3 AP, 1=3+ AP)
    if is_privileged:
        hapcl = np.random.binomial(1, 0.45, n)
    else:
        hapcl = np.random.binomial(1, 0.20, n)

    # Pre-calculus (0=No, 1=Yes with C+)
    if is_privileged or archetype_id == 3:  # Asian high-achiever
        hprecalc13 = np.random.binomial(1, 0.55, n)
    else:
        hprecalc13 = np.random.binomial(1, 0.30, n)

    # HS Challenge (1-7)
    hchallenge = np.clip(np.random.normal(5.0, 1.2, n), 1, 7).astype(int)

    # Expected faculty career discussions (1-4)
    cSFcareer = np.clip(np.random.normal(2.8, 0.8, n), 1, 4).astype(int)

    return hgrades, bparented, hapcl, hprecalc13, hchallenge, cSFcareer


def sample_time_use_midpoints(n, probs):
    """Sample time-use bins and return numeric midpoint recodes."""
    probs = np.array(probs, dtype=float)
    total = probs.sum()
    if total > 0 and not np.isclose(total, 1.0):
        probs = probs / total
    midpoints = np.array([0, 3, 8, 13, 18, 23, 28, 35])
    return np.random.choice(midpoints, size=n, p=probs)


def shift_time_use_bins(values, direction, shift_prob=0.35):
    """Shift midpoint-coded time-use values up/down by one bin for a subset."""
    midpoints = np.array([0, 3, 8, 13, 18, 23, 28, 35])
    shift = np.random.random(len(values)) < shift_prob
    idx_map = {v: i for i, v in enumerate(midpoints)}
    shifted = values.copy()
    for i, v in enumerate(values):
        if not shift[i]:
            continue
        idx = idx_map.get(v, None)
        if idx is None:
            continue
        if direction == "up":
            shifted[i] = midpoints[min(idx + 1, len(midpoints) - 1)]
        elif direction == "down":
            shifted[i] = midpoints[max(idx - 1, 0)]
    return shifted


def generate_treatment_and_dose(archetype_id, hgrades, hapcl, bparented, n, fast_scale):
    """
    Generate FASt status and credit dose with CONFOUNDING.
    Higher SES, better HS prep → more likely FASt.
    """
    arch = ARCHETYPES[archetype_id]
    base_prob = max(0.05, arch['fast_prob'] * fast_scale - FAST_BASE_SHIFT)

    # Create propensity with confounding
    propensity = np.zeros(n)
    for i in range(n):
        p = base_prob
        # Higher grades increase probability
        p += (hgrades[i] - 5) * 0.05 * FAST_CONF_SCALE
        # AP courses increase probability
        p += hapcl[i] * 0.10 * FAST_CONF_SCALE
        # Higher parent ed increases probability
        p += (bparented[i] - 4) * 0.03 * FAST_CONF_SCALE
        # Clip to valid probability
        propensity[i] = np.clip(p, 0.05, 0.80)

    # Generate FASt status
    x_FASt = np.random.binomial(1, propensity)

    # Generate credit dose (only for FASt students)
    # Right-skewed: most have 12-24 credits, few have 60+
    credit_dose = np.zeros(n)
    for i in range(n):
        if x_FASt[i] == 1:
            # Generate raw credits (12+)
            base_credits = 12 + np.random.exponential(15)
            # Higher achievers get more credits
            if hgrades[i] >= 7:
                base_credits += np.random.exponential(10)
            if hapcl[i] == 1:
                base_credits += np.random.exponential(8)
            # Cap at realistic maximum
            raw_credits = min(base_credits, 80)
            # Convert to dose units (credits above 12, in 10-credit units)
            credit_dose[i] = max(0, (raw_credits - 12)) / 10

    return x_FASt, credit_dose


def generate_construct_scores(archetype_id, x_FASt, credit_dose, n):
    """
    Generate latent construct scores with treatment effects.
    Key: FASt effects are HARMFUL for equity-impacted archetypes.
    """
    arch = ARCHETYPES[archetype_id]
    base = arch['base_responses']
    effects = arch['fast_effect']
    dose_amp = arch['dose_amplify']

    # Initialize with base scores + individual variation
    EmoDiss = np.random.normal(base['EmoDiss'], 0.8, n)
    QualEngag = np.random.normal(base['QualEngag'], 0.9, n)
    Belong = np.random.normal(base['Belong'], 0.6, n)
    Gains = np.random.normal(base['Gains'], 0.5, n)
    SupportEnv = np.random.normal(base['SupportEnv'], 0.55, n)
    Satisf = np.random.normal(base['Satisf'], 0.5, n)

    # Apply treatment effects (THE KEY: post-PSW true effects)
    for i in range(n):
        if x_FASt[i] == 1:
            # Main effect on mediators
            EmoDiss[i] += effects['a1'] * 1.5  # Scale up for visibility
            QualEngag[i] += effects['a2'] * 1.5

            # Credit dose moderation (amplifies the effect)
            if credit_dose[i] > 0:
                EmoDiss[i] += effects['a1'] * dose_amp * credit_dose[i] * 0.3
                QualEngag[i] += effects['a2'] * dose_amp * credit_dose[i] * 0.3

    # Mediator → Outcome paths (consistent across groups)
    # b1: EmoDiss → DevAdj (negative, ~-0.40)
    # b2: QualEngag → DevAdj (positive, ~0.45)
    # DevAdj is reflected in Belong, Gains, SupportEnv, Satisf

    for i in range(n):
        # EmoDiss reduces developmental adjustment
        distress_effect = (EmoDiss[i] - 3.5) * -0.12
        Belong[i] += distress_effect
        Gains[i] += distress_effect * 0.8
        SupportEnv[i] += distress_effect * 0.9
        Satisf[i] += distress_effect

        # QualEngag improves developmental adjustment
        engage_effect = (QualEngag[i] - 5.0) * 0.10
        Belong[i] += engage_effect
        Gains[i] += engage_effect * 0.7
        SupportEnv[i] += engage_effect * 0.8
        Satisf[i] += engage_effect

    return {
        'EmoDiss': EmoDiss,
        'QualEngag': QualEngag,
        'Belong': Belong,
        'Gains': Gains,
        'SupportEnv': SupportEnv,
        'Satisf': Satisf
    }


def generate_item_responses(construct_scores, n):
    """Generate individual item responses from construct scores."""
    responses = {}

    for item_name, item_info in ITEMS.items():
        construct = item_info['construct']
        scale_min, scale_max = item_info['scale']
        loading = item_info['loading']

        # Get construct score
        latent = construct_scores[construct]

        # Scale latent to item range
        if construct == 'EmoDiss':
            # EmoDiss is on 1-6 scale, latent centered around 3.5
            item_latent = latent
        elif construct == 'QualEngag':
            # QualEngag is on 1-7 scale, latent centered around 5
            item_latent = latent
        else:
            # DevAdj constructs on 1-4 scale, latent centered around 3
            item_latent = latent

        # Add item-specific noise (inversely related to loading)
        noise_sd = (1 - loading) * 1.5

        responses[item_name] = np.array([
            generate_ordinal_response(item_latent[i], scale_min, scale_max, noise_sd)
            for i in range(n)
        ])

    return responses


def apply_missingness(df, archetype_ids):
    """
    Apply empirically-grounded missingness patterns.

    NOTE: PSW covariates are kept complete for basic pipeline testing.
    Real data with PSW covariate missingness should use the MIte pipeline
    (multiple imputation then estimation) - see 3_Analysis/5_Utilities_Code/mite_psw_pipeline.R
    """
    n = len(df)

    # W moderators + PSW/SEM covariates - Keep complete for pipeline compatibility
    # These would have missingness in real data, handled by MIte pipeline:
    # cohort, hgrades, bparented, hapcl, hprecalc13, hchallenge, cSFcareer,
    # hacadpr13, tcare, StemMaj, pell, firstgen

    # For realistic testing, we CAN add small missingness to non-critical PSW covariates
    # but keep the core ones complete. Uncomment below for more realistic missingness:
    #
    # for col in ['hchallenge', 'cSFcareer']:
    #     mask = np.random.random(n) < 0.02
    #     df.loc[mask, col] = np.nan

    # MAR on MHW items - higher for Asian archetypes (stigma)
    mhw_items = ['MHWdacad', 'MHWdlonely', 'MHWdmental', 'MHWdexhaust', 'MHWdsleep', 'MHWdfinancial']
    for col in mhw_items:
        for i in range(n):
            # Base rate
            rate = 0.05
            # Higher for Asian archetypes
            if archetype_ids[i] in [3, 4]:
                rate = 0.10
            # Higher for high-distress (MAR)
            if col in ['MHWdmental', 'MHWdlonely']:
                if df.loc[i, col] >= 5:  # High distress
                    rate += 0.05
            if np.random.random() < rate:
                df.loc[i, col] = np.nan

    # MCAR on QI items - commuters "haven't interacted"
    qi_items = ['QIadmin', 'QIstudent', 'QIadvisor', 'QIfaculty', 'QIstaff']
    for col in qi_items:
        for i in range(n):
            # Higher for commuters
            if archetype_ids[i] in [1, 2, 7]:  # Commuter archetypes
                rate = 0.06
            else:
                rate = 0.03
            if np.random.random() < rate:
                df.loc[i, col] = np.nan

    return df


# =============================================================================
# MAIN GENERATION
# =============================================================================

def generate_dataset() -> Tuple[pd.DataFrame, np.ndarray]:
    """Generate the full empirically-aligned synthetic dataset."""

    print("=" * 60)
    print("Generating Empirically-Aligned Synthetic Dataset")
    print("=" * 60)

    # Calculate archetype sample sizes
    archetype_ns = {}
    total_assigned = 0
    max_arch_id = max(ARCHETYPES.keys())
    for arch_id, arch in ARCHETYPES.items():
        if arch_id < max_arch_id:
            n = int(N_TOTAL * arch['prevalence'])
            archetype_ns[arch_id] = n
            total_assigned += n
    archetype_ns[max_arch_id] = N_TOTAL - total_assigned  # Last archetype gets remainder

    print(f"\nArchetype sample sizes:")
    for arch_id, n in archetype_ns.items():
        print(f"  {arch_id}. {ARCHETYPES[arch_id]['name']}: n={n}")

    expected_base_fast = sum(
        archetype_ns[arch_id] * ARCHETYPES[arch_id]['fast_prob']
        for arch_id in archetype_ns
    ) / N_TOTAL
    fast_scale = min(1.0, FAST_TARGET / expected_base_fast)

    expected_pell = sum(
        archetype_ns[arch_id] * ARCHETYPES[arch_id]['demographics']['pell']
        for arch_id in archetype_ns
    ) / N_TOTAL
    pell_scale = PELL_TARGET / expected_pell

    # Time-use distributions (midpoint recodes)
    hacadpr13_probs = np.array([0.01, 0.32, 0.30, 0.18, 0.10, 0.05, 0.02, 0.03])
    tcare_probs = np.array([0.72, 0.12, 0.07, 0.04, 0.025, 0.015, 0.006, 0.004])

    # Initialize data storage
    all_data = []
    archetype_ids = []

    # Generate data for each archetype
    for arch_id, n in archetype_ns.items():
        print(f"\nGenerating archetype {arch_id}: {ARCHETYPES[arch_id]['name']}...")
        arch = ARCHETYPES[arch_id]

        # Demographics
        demographics = arch['demographics']

        # Race/ethnicity
        if demographics['re_all'] is not None:
            re_all = np.array([demographics['re_all']] * n)
        else:
            # For "Continuing-Gen Cruiser", mix of non-URM
            re_all = np.random.choice(
                ['White', 'Asian', 'Other/Multiracial/Unknown'],
                n, p=[0.40, 0.40, 0.20]
            )

        # Sex
        if demographics['sex'] is not None:
            sex = np.array([demographics['sex']] * n)
        else:
            sex = np.random.choice(['Female', 'Male'], n, p=[SEX_FEMALE_PROB, 1 - SEX_FEMALE_PROB])

        # First-gen: now uses probability (0.0-1.0) instead of absolute 0/1
        firstgen_prob = demographics['firstgen']
        firstgen = np.random.binomial(1, firstgen_prob, n)

        # Pell: now uses probability (0.0-1.0) instead of absolute 0/1
        pell_prob = demographics['pell']
        pell = np.random.binomial(1, min(1.0, pell_prob * pell_scale), n)

        # Living situation
        if arch['living'] is not None:
            living18 = np.array([arch['living']] * n)
        else:
            living18 = np.random.choice(
                ['With family (commuting)', 'Off-campus (rent/apartment)', 'On-campus (residence hall)'],
                n, p=[0.60, 0.22, 0.18]
            )

        # Cohort (50/50 split)
        cohort = np.random.binomial(1, 0.5, n)

        # HS Background
        hgrades, bparented, hapcl, hprecalc13, hchallenge, cSFcareer = generate_hs_background(arch_id, n)

        # HS time-use covariates (midpoint recodes)
        hacadpr13 = sample_time_use_midpoints(n, hacadpr13_probs)
        tcare = sample_time_use_midpoints(n, tcare_probs)
        if arch_id in [3, 4]:
            hacadpr13 = shift_time_use_bins(hacadpr13, "up")
            tcare = shift_time_use_bins(tcare, "down")
        if arch_id in [1, 2, 7]:
            hacadpr13 = shift_time_use_bins(hacadpr13, "down")
            tcare = shift_time_use_bins(tcare, "up")

        # Treatment assignment (with confounding!)
        x_FASt, credit_dose = generate_treatment_and_dose(
            arch_id, hgrades, hapcl, bparented, n, fast_scale
        )

        # Generate construct scores with treatment effects
        construct_scores = generate_construct_scores(arch_id, x_FASt, credit_dose, n)

        # Generate item responses
        item_responses = generate_item_responses(construct_scores, n)

        # Build dataframe for this archetype
        arch_df = pd.DataFrame({
            'cohort': cohort,
            'hgrades': hgrades,
            'bparented': bparented,
            'pell': pell,
            'hapcl': hapcl,
            'hprecalc13': hprecalc13,
            'hchallenge': hchallenge,
            'cSFcareer': cSFcareer,
            'hacadpr13': hacadpr13,
            'tcare': tcare,
            'firstgen': firstgen,
            're_all': re_all,
            'living18': living18,
            'sex': sex,
            'x_FASt': x_FASt,
            'credit_dose': credit_dose,
            **item_responses
        })

        all_data.append(arch_df)
        archetype_ids.extend([arch_id] * n)

    # Combine all archetypes
    df = pd.concat(all_data, ignore_index=True)
    archetype_ids = np.array(archetype_ids)

    # Shuffle to mix archetypes
    shuffle_idx = np.random.permutation(len(df))
    df = df.iloc[shuffle_idx].reset_index(drop=True)
    archetype_ids = archetype_ids[shuffle_idx]

    # Add ID column
    df.insert(0, 'id', range(1, len(df) + 1))

    # Compute derived variables
    df['hgrades_c'] = df['hgrades'] - df['hgrades'].mean()
    df['bparented_c'] = df['bparented'] - df['bparented'].mean()
    df['hchallenge_c'] = df['hchallenge'] - df['hchallenge'].mean()
    df['cSFcareer_c'] = df['cSFcareer'] - df['cSFcareer'].mean()
    df['hapcl_c'] = df['hapcl'] - df['hapcl'].mean()
    df['hprecalc13_c'] = df['hprecalc13'] - df['hprecalc13'].mean()
    df['hacadpr13_c'] = df['hacadpr13'] - df['hacadpr13'].mean()
    df['tcare_c'] = df['tcare'] - df['tcare'].mean()
    df['credit_dose_c'] = df['credit_dose'] - df['credit_dose'].mean()
    df['XZ_c'] = df['x_FASt'] * df['credit_dose_c']

    # DC variables
    df['trnsfr_cr'] = df.apply(
        lambda row: 12 + row['credit_dose'] * 10 if row['x_FASt'] == 1
        else np.random.choice([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
        axis=1
    ).astype(int)
    df['hdc17'] = df.apply(
        lambda row: np.random.choice([4, 5, 6, 7]) if row['x_FASt'] == 1
        else np.random.choice([1, 2, 3], p=[0.35, 0.40, 0.25]),
        axis=1
    )
    df['DC_student'] = (df['hdc17'] >= 2).astype(int)
    df['DE_group_temp'] = pd.cut(
        df['trnsfr_cr'],
        bins=[-1, 0, 11, 200],
        labels=[0, 1, 2]
    ).astype(int)

    # College GPA (correlated with outcomes)
    df['Cgrades'] = np.clip(
        4 + (df['hgrades'] - 6) * 0.3 + np.random.normal(0, 0.8, len(df)),
        0, 4
    ).round(0).astype(int) + 3
    df['Cgrades'] = np.clip(df['Cgrades'], 3, 8)

    # STEM major
    df['StemMaj'] = np.random.binomial(1, 0.25, len(df))
    df['StemMaj_c'] = df['StemMaj'] - df['StemMaj'].mean()

    # r variables (auxiliary for bootstrap)
    df['r'] = np.random.randint(-15, 35, len(df))
    df['r_minus'] = df['r'] / 10 - 0.5
    df['r_plus'] = df['r'] / 10 + 0.5

    # Apply missingness
    print("\nApplying missingness patterns...")
    df = apply_missingness(df, archetype_ids)

    # Reorder columns to match original dataset
    col_order = [
        'cohort', 'hgrades', 'hgrades_c', 'Cgrades', 'bparented', 'bparented_c',
        'pell', 'hapcl', 'hapcl_c', 'hprecalc13', 'hprecalc13_c',
        'hchallenge', 'hchallenge_c',
        'cSFcareer', 'cSFcareer_c', 'hacadpr13', 'hacadpr13_c', 'tcare', 'tcare_c',
        'firstgen', 're_all', 'living18', 'sex',
        'StemMaj', 'StemMaj_c', 'trnsfr_cr', 'x_FASt', 'credit_dose', 'credit_dose_c', 'XZ_c',
        'r', 'r_minus', 'r_plus',
        'sbmyself', 'sbvalued', 'sbcommunity',
        'pgthink', 'pganalyze', 'pgwork', 'pgvalues', 'pgprobsolve',
        'SEwellness', 'SEnonacad', 'SEactivities', 'SEacademic', 'SEdiverse',
        'evalexp', 'sameinst',
        'MHWdacad', 'MHWdlonely', 'MHWdmental', 'MHWdexhaust', 'MHWdsleep', 'MHWdfinancial',
        'QIstudent', 'QIadvisor', 'QIfaculty', 'QIstaff', 'QIadmin',
        'id', 'DE_group_temp', 'hdc17', 'DC_student'
    ]

    # Ensure all columns exist
    for col in col_order:
        if col not in df.columns:
            df[col] = np.nan

    df = df[col_order]

    return (df, archetype_ids)


def print_summary_stats(df):
    """Print summary statistics for verification."""
    print("\n" + "=" * 60)
    print("DATASET SUMMARY")
    print("=" * 60)

    print(f"\nTotal N: {len(df)}")

    print("\n--- Demographics ---")
    print(f"FASt (x_FASt=1): {df['x_FASt'].sum()} ({df['x_FASt'].mean()*100:.1f}%)")
    print(f"\nRace/Ethnicity:")
    print(df['re_all'].value_counts(normalize=True).mul(100).round(1))
    print(f"\nFirst-gen: {df['firstgen'].mean()*100:.1f}%")
    print(f"Pell: {df['pell'].mean()*100:.1f}%")
    print(f"Female: {(df['sex']=='Female').mean()*100:.1f}%")
    print(f"\nLiving Situation:")
    print(df['living18'].value_counts(normalize=True).mul(100).round(1))

    print("\n--- Treatment Distribution ---")
    print(f"Credit dose (FASt only):")
    fast_dose = df[df['x_FASt']==1]['credit_dose']
    print(f"  Mean: {fast_dose.mean():.2f}, SD: {fast_dose.std():.2f}")
    print(f"  Min: {fast_dose.min():.1f}, Max: {fast_dose.max():.1f}")

    print("\n--- Construct Means (Raw) ---")
    belong_items = ['sbvalued', 'sbmyself', 'sbcommunity']
    gains_items = ['pganalyze', 'pgthink', 'pgwork', 'pgvalues', 'pgprobsolve']
    emodiss_items = ['MHWdacad', 'MHWdlonely', 'MHWdmental', 'MHWdexhaust', 'MHWdsleep', 'MHWdfinancial']
    qi_items = ['QIadmin', 'QIstudent', 'QIadvisor', 'QIfaculty', 'QIstaff']

    print(f"Belonging: {df[belong_items].mean().mean():.2f}")
    print(f"Gains: {df[gains_items].mean().mean():.2f}")
    print(f"EmoDiss: {df[emodiss_items].mean().mean():.2f}")
    print(f"QualEngag: {df[qi_items].mean().mean():.2f}")

    print("\n--- FASt vs Non-FASt (Raw - showing selection bias) ---")
    for construct, items in [('Belonging', belong_items), ('EmoDiss', emodiss_items), ('QualEngag', qi_items)]:
        fast_mean = df[df['x_FASt']==1][items].mean().mean()
        nonfast_mean = df[df['x_FASt']==0][items].mean().mean()
        diff = fast_mean - nonfast_mean
        print(f"{construct}: FASt={fast_mean:.2f}, Non-FASt={nonfast_mean:.2f}, Diff={diff:+.2f}")

    print("\n--- Missingness ---")
    missing_pct = df.isnull().mean() * 100
    high_missing = missing_pct[missing_pct > 2].sort_values(ascending=False)
    print("Variables with >2% missing:")
    print(high_missing.round(1))


if __name__ == "__main__":
    # Generate dataset
    df, archetype_ids = generate_dataset()

    # Print summary
    print_summary_stats(df)

    # Save
    output_path = '1_Dataset/rep_data.csv'
    df.to_csv(output_path, index=False)
    print(f"\n{'='*60}")
    print(f"Dataset saved to: {output_path}")
    print(f"{'='*60}")

    # Also save archetype assignments for reference
    arch_df = pd.DataFrame({
        'id': df['id'],
        'archetype_id': archetype_ids,
        'archetype_name': [ARCHETYPES[a]['name'] for a in archetype_ids]
    })
    arch_df.to_csv('1_Dataset/archetype_assignments.csv', index=False)
    print(f"Archetype assignments saved to: 1_Dataset/archetype_assignments.csv")
