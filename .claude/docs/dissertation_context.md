# Dissertation Context Notes for Synthetic Dataset Construction

## Study Overview

**Title:** The Psychosocial Effects of Dual Credit Accumulation on Developmental Adjustment Among Equity Impacted Student Populations in California: A Conditional Process Structural Equation Model Analysis

**Author:** Judd Johnson, Ed.D. Candidate, San Diego State University

**Design:** Quantitative quasi-experimental, Conditional Process SEM (Hayes Model 59)

---

## Key Construct: FASt Students

**Definition:** First-year, Advanced Status (FASt) students are newly matriculated undergraduates who arrive at 4-year institutions with 12+ transferable college credits from dual enrollment programs.

**Rationale for 12-credit threshold:**
- Represents meaningful "acceleration" (equivalent to one full semester)
- Aligns with upper-division pathway eligibility
- Creates clear treatment/control distinction

**Population breakdown (target N=5,000):**
- ~27% FASt (12+ credits): n ≈ 1,358
- ~73% non-FASt (0-11 credits): n ≈ 3,642

---

## Theoretical Framework

### 1. Liminality Theory (Turner, Thomassen)
- FASt students occupy "betwixt and between" status
- Academic standing exceeds developmental readiness
- Ambiguous identity (freshman by age, sophomore+ by credits)

### 2. Chickering's Seven Vectors of Student Development
- Developing competence
- Managing emotions
- Moving through autonomy toward interdependence
- Developing mature interpersonal relationships
- Establishing identity
- Developing purpose
- Developing integrity

### 3. Astin's I-E-O Framework
- **Inputs:** Demographics, HS preparation, family background
- **Environment:** Campus climate, support services, interactions
- **Outcomes:** Developmental adjustment, persistence, well-being

---

## Research Model (Hayes Model 59)

```
              ┌─────────────────────────────────────────┐
              │           Credit Dose (Z)               │
              │         (Moderator on a paths)          │
              └─────────────────────────────────────────┘
                          ↓ moderates
    ┌─────────────────────────────────────────────────────────────┐
    │                                                             │
    │   ┌──────────────┐      a1, a1z       ┌──────────────┐     │
    │   │              │ ─────────────────→ │   EmoDiss    │     │
    │   │   FASt (X)   │                    │    (M1)      │──┐  │
    │   │   0/1        │      a2, a2z       └──────────────┘  │  │
    │   │              │ ─────────────────→ ┌──────────────┐  │  │
    │   └──────────────┘                    │  QualEngag   │  │  │
    │          │                            │    (M2)      │──┤  │
    │          │ c, cz (direct)             └──────────────┘  │  │
    │          │                                    b1, b2    │  │
    │          └──────────────────────┬───────────────────────┘  │
    │                                 ↓                          │
    │                          ┌──────────────┐                  │
    │                          │   DevAdj     │                  │
    │                          │    (Y)       │                  │
    │                          └──────────────┘                  │
    │                                 ↑                          │
    │                     W Moderators (RQ4)                     │
    │              (race, firstgen, pell, sex, living)           │
    └─────────────────────────────────────────────────────────────┘
```

---

## Constructs and Instruments

### Outcome (Y): Developmental Adjustment (2nd-order latent)

| First-Order Factor | Items | Scale | Source |
|-------------------|-------|-------|--------|
| **Belonging** | sbvalued, sbmyself, sbcommunity | 1-4 (SD to SA) | NSSE Q15 |
| **Perceived Gains** | pganalyze, pgthink, pgwork, pgvalues, pgprobsolve | 1-4 (Very little to Very much) | NSSE Q18 |
| **Supportive Environment** | SEacademic, SEwellness, SEnonacad, SEactivities, SEdiverse | 1-4 (Very little to Very much) | NSSE Q14 |
| **Satisfaction** | sameinst, evalexp | 1-4 (Def no to Def yes / Poor to Excellent) | NSSE Q19-20 |

### Mediator 1 (M1): Emotional Distress

| Item | Content | Scale | Source |
|------|---------|-------|--------|
| MHWdacad | Difficulty with academics | 1-6 | MHW Module |
| MHWdlonely | Difficulty with loneliness | 1-6 | MHW Module |
| MHWdmental | Difficulty with mental health | 1-6 | MHW Module |
| MHWdexhaust | Difficulty with exhaustion | 1-6 | MHW Module |
| MHWdsleep | Difficulty sleeping | 1-6 | MHW Module |
| MHWdfinancial | Difficulty with finances | 1-6 | MHW Module |

**Expected pattern:** Higher scores = more distress. FASt students expected to show LOWER distress (protective effect of preparation).

### Mediator 2 (M2): Quality of Engagement

| Item | Content | Scale | Source |
|------|---------|-------|--------|
| QIadmin | Quality of interactions with admin staff | 1-7 | NSSE Q13 |
| QIstudent | Quality of interactions with students | 1-7 | NSSE Q13 |
| QIadvisor | Quality of interactions with advisors | 1-7 | NSSE Q13 |
| QIfaculty | Quality of interactions with faculty | 1-7 | NSSE Q13 |
| QIstaff | Quality of interactions with student services | 1-7 | NSSE Q13 |

**Expected pattern:** Higher scores = better engagement. FASt students expected to show HIGHER engagement.

---

## California Population Parameters (2024)

### CSU System Demographics (Fall 2024)
| Characteristic | Percentage | Source |
|---------------|------------|--------|
| Hispanic/Latino | 54% (first-year) | CSU Facts |
| Asian | ~15-18% | CSU Facts |
| White | ~15% | CSU Facts |
| Black/African American | 4% | CSU Facts |
| Other/Multiracial | ~9% | CSU Facts |
| Women | ~60% | CSU Facts |
| Pell Grant Recipients | 52% (first-year) | CSU Facts |
| First-Generation | ~45-53% | CSU Facts |

### California Community College DE Demographics (2023-24)
| Characteristic | CCC System | CCAP Specifically |
|---------------|------------|-------------------|
| Hispanic/Latino | 48% | 55-56% |
| White | 23% | 22% |
| Asian | 11% | 13% |
| Black | 5.6% | 4% |
| First-Generation | 35% | Higher representation |
| Women | 56% | 56% |

### Dual Enrollment Participation Rates
- 30% of CA high school class of 2024 took at least one DE course
- ~150,000 students enrolled in DE (2023)
- CCAP accounts for 45% of DE enrollment
- 82% of CCAP students continue to postsecondary vs 66% of non-DE peers

---

## Expected Effect Sizes (Based on Literature)

### Treatment Effects (FASt vs. non-FASt)

| Path | Direction | Expected d | Rationale |
|------|-----------|-----------|-----------|
| FASt → EmoDiss | Negative | -0.15 to -0.25 | Better preparation reduces stress |
| FASt → QualEngag | Positive | +0.15 to +0.25 | More confidence in interactions |
| FASt → DevAdj (direct) | Positive | +0.10 to +0.20 | Academic momentum |

### Mediator → Outcome Effects

| Path | Direction | Expected β | Rationale |
|------|-----------|-----------|-----------|
| EmoDiss → DevAdj | Negative | -0.30 to -0.45 | Distress undermines adjustment |
| QualEngag → DevAdj | Positive | +0.35 to +0.50 | Relationships promote belonging |

### Moderation by Credit Dose (Z)

| Interaction | Direction | Rationale |
|-------------|-----------|-----------|
| XZ → EmoDiss | Negative (protective) | More credits = more resilience |
| XZ → QualEngag | Positive | More exposure = stronger connections |

### Heterogeneity by W Moderators (RQ4)

| W Variable | Expected Pattern |
|------------|-----------------|
| First-gen | Larger FASt benefits (d difference: 0.10-0.15) |
| Pell | Larger FASt benefits |
| URM (Hispanic, Black) | Mixed - benefits moderated by campus climate |
| Living (commuter) | Smaller QualEngag effects (less campus time) |

---

## Response Distribution Expectations (NSSE Norms)

### Belonging Items (1-4 scale)
- Typical distribution: positively skewed
- ~65-75% respond Agree/Strongly Agree
- Mean ≈ 3.0-3.2, SD ≈ 0.7-0.8

### Perceived Gains (1-4 scale)
- Typical distribution: slight positive skew
- Mean ≈ 2.8-3.1, SD ≈ 0.8-0.9

### Quality of Interactions (1-7 scale)
- Typical distribution: normal to slight positive skew
- Mean ≈ 5.0-5.5, SD ≈ 1.2-1.4
- Faculty/advisor ratings typically highest

### Emotional Distress (1-6 scale)
- Expected bimodal or uniform distribution
- Academics/exhaustion: higher (mean ≈ 3.5-4.0)
- Loneliness/mental health: variable by subgroup
- Financial: highest for Pell students

---

## Correlation Structure Expectations

### Within-Construct Correlations
- Belonging items: r ≈ 0.55-0.70
- Gains items: r ≈ 0.45-0.60
- SupportEnv items: r ≈ 0.50-0.65
- EmoDiss items: r ≈ 0.40-0.55
- QualEngag items: r ≈ 0.50-0.65

### Between-Construct Correlations
| Constructs | Expected r |
|-----------|-----------|
| EmoDiss ↔ QualEngag | -0.30 to -0.40 |
| EmoDiss ↔ DevAdj | -0.35 to -0.45 |
| QualEngag ↔ DevAdj | +0.50 to +0.60 |
| Belonging ↔ QualEngag | +0.45 to +0.55 |

---

## Covariate Distributions

| Variable | Type | Distribution | Notes |
|----------|------|--------------|-------|
| hgrades | Ordinal 1-8 | Left-skewed (most B+/A) | Mean ≈ 6.3, SD ≈ 1.2 |
| bparented | Ordinal 1-8 | Bimodal (HS diploma + Bachelor's) | Mean ≈ 3.5 |
| hapcl | Binary | ~25-30% took 3+ AP | Correlated with FASt |
| hprecalc13 | Binary | ~35-40% earned C+ | STEM predictor |
| hchallenge | Ordinal 1-7 | Normal, slight positive skew | Mean ≈ 5.0 |
| cSFcareer | Ordinal 1-4 | Slight positive skew | Mean ≈ 2.8 |

---

## Propensity Score Model Considerations

Students more likely to be FASt (12+ credits) if:
- Higher HS GPA (+)
- More AP courses (+)
- Higher parent education (+)
- Pre-calculus completion (+)
- Suburban/urban school district (+)
- Asian or White (+, currently)
- NOT first-generation (−, historical pattern, changing with CCAP)

---

## Key Dissertation Arguments

1. **Academic acceleration ≠ developmental readiness**
   - Credits don't measure psychosocial preparation
   - Liminality creates identity confusion

2. **Selection bias in prior research**
   - DC students historically privileged
   - CCAP changing this pattern
   - PSW addresses confounding

3. **Equity imperative**
   - Hispanic/Latino students are majority in CA
   - First-gen, Pell students need targeted support
   - Heterogeneous effects matter for policy

4. **Intervention implications**
   - Traditional first-year programs misaligned for FASt
   - Need tailored onboarding, advising, mental health support

---

## Data Generation Priorities

1. **Demographic fidelity:** Match CSU 2024 proportions
2. **Treatment assignment:** Realistic propensity (confounded)
3. **Response patterns:** NSSE-like distributions with ceiling effects
4. **Construct correlations:** Match published psychometrics
5. **Treatment effects:** Modest, theoretically justified
6. **Heterogeneity:** Differential effects by W moderators
7. **Missingness:** Realistic MCAR/MAR patterns (~3-5%)

---

---

## Student Archetypes for Data Generation

### Research Foundation: Living Arrangement × Ethnicity × Gender

**Key Findings:**

1. **Hispanic/Latino students** (Ovink & Kalogrides, 2015; Hurtado & Carter, 1997):
   - Strong familismo = preference to live at home (even controlling for SES)
   - Paradoxical belonging: find connection through "campus familia" peer groups
   - Latinas face gendered stress from marianismo (caretaker expectations)
   - Language brokering adds stress for children of immigrants

2. **Asian students** (NAMI, 2024; Hwang & Goto, 2008):
   - Similar preference to live at home (filial piety)
   - Model minority pressure = high academic stress, low help-seeking
   - Only 8.6% seek mental health services (vs 18% general population)
   - Intergenerational cultural conflict when living with parents

3. **First-generation students** (Soria & Stebleton, 2012; Stephens et al., 2012):
   - Living on campus boosts belonging significantly
   - But cost/family obligations force many off-campus
   - Lower belonging, higher stress overall
   - First-gen roommate paradox: same-identity roommate = worse outcomes

4. **Gender differences** (Kuh, 2003; Balfour Simpson, 2019):
   - Women more engaged than men across all living arrangements
   - Men less prepared for class, more co-curricular/non-academic
   - Latinas: highest stress due to dual cultural/family burden

---

### The 10 Student Archetypes

| # | Archetype | Demographics | Living | FASt % | Prevalence |
|---|-----------|--------------|--------|--------|------------|
| 1 | **Latina Commuter Caretaker** | Hispanic, Female, First-gen, Pell | Family | 20% | 18% |
| 2 | **Latino First-Gen Striver** | Hispanic, Male, First-gen, Pell | Family | 25% | 12% |
| 3 | **Asian High-Pressure Achiever** | Asian, Any, Continuing-gen | Family | 45% | 10% |
| 4 | **Asian First-Gen Navigator** | Asian, Any, First-gen, Pell | Family | 30% | 5% |
| 5 | **Black Campus Connector** | Black, Female, First-gen | On-campus | 15% | 3% |
| 6 | **White Residential Traditional** | White, Any, Continuing-gen | On-campus | 35% | 8% |
| 7 | **White Commuter Working** | White, Any, First-gen | Off-campus | 20% | 5% |
| 8 | **Multiracial Bridge-Builder** | Other/Multi, Any | Mixed | 25% | 6% |
| 9 | **Hispanic On-Campus Transitioner** | Hispanic, Any, First-gen | On-campus | 30% | 8% |
| 10 | **Continuing-Gen Cruiser** | Any (non-URM), Continuing-gen, Non-Pell | Any | 40% | 25% |

---

### Archetype Response Patterns (Pre-PSW)

#### Archetype 1: Latina Commuter Caretaker
**Profile:** Female, Hispanic, first-gen, Pell, lives with family, often language broker

| Construct | Pattern | Rationale |
|-----------|---------|-----------|
| **EmoDiss** | High (M≈4.2) | Family obligations + academic stress + caretaking |
| **QualEngag** | Moderate-Low (M≈4.5) | Limited campus time, but seeks out advisors |
| **Belonging** | Moderate (M≈2.8) | If finds campus familia = higher; without = lower |
| **Gains** | Moderate-High (M≈3.0) | Motivated but stretched thin |
| **Satisfaction** | Moderate (M≈2.9) | Values education but stressed by context |

**FASt Effect (post-PSW):** NEGATIVE
- More credits = more stress (not ready for rigor)
- Less time for family obligations = guilt
- a1 > 0, a2 < 0

---

#### Archetype 2: Latino First-Gen Striver
**Profile:** Male, Hispanic, first-gen, Pell, lives with family

| Construct | Pattern | Rationale |
|-----------|---------|-----------|
| **EmoDiss** | Moderate-High (M≈3.8) | Academic pressure, less help-seeking than Latinas |
| **QualEngag** | Moderate (M≈4.8) | Less engaged than Latinas overall |
| **Belonging** | Moderate (M≈2.7) | Machismo may inhibit vulnerability |
| **Gains** | Moderate (M≈2.8) | Career-focused |
| **Satisfaction** | Moderate (M≈2.8) | Pragmatic orientation |

**FASt Effect (post-PSW):** NEGATIVE but smaller than Latinas
- a1 > 0 (modest), a2 ≈ 0

---

#### Archetype 3: Asian High-Pressure Achiever
**Profile:** Asian, continuing-gen, lives with family, high parental expectations

| Construct | Pattern | Rationale |
|-----------|---------|-----------|
| **EmoDiss** | High (M≈4.5) | Model minority pressure, won't seek help |
| **QualEngag** | Moderate (M≈5.0) | Focused on academics, less social |
| **Belonging** | Low-Moderate (M≈2.5) | Cultural isolation, different values |
| **Gains** | High (M≈3.2) | Academic achievement orientation |
| **Satisfaction** | Moderate (M≈3.0) | Achievement without belonging |

**FASt Effect (post-PSW):** MIXED
- Already high-achieving, so FASt doesn't add much stress
- a1 ≈ 0, a2 ≈ 0 (null effect—selection bias explains raw correlation)

---

#### Archetype 4: Asian First-Gen Navigator
**Profile:** Asian, first-gen, Pell, lives with family, immigrant family

| Construct | Pattern | Rationale |
|-----------|---------|-----------|
| **EmoDiss** | Very High (M≈4.8) | Family pressure + first-gen challenges + cultural conflict |
| **QualEngag** | Low-Moderate (M≈4.3) | Hesitant to engage, language/cultural barriers |
| **Belonging** | Low (M≈2.3) | Caught between worlds |
| **Gains** | Moderate (M≈2.9) | Motivated but struggling |
| **Satisfaction** | Low-Moderate (M≈2.6) | Stressed experience |

**FASt Effect (post-PSW):** NEGATIVE
- Acceleration without support = worse outcomes
- a1 > 0, a2 < 0

---

#### Archetype 5: Black Campus Connector
**Profile:** Black, female, first-gen, lives on campus

| Construct | Pattern | Rationale |
|-----------|---------|-----------|
| **EmoDiss** | Moderate (M≈3.5) | On-campus living helps, but racial climate matters |
| **QualEngag** | Moderate-High (M≈5.2) | Seeks connection, involved |
| **Belonging** | Variable (M≈2.6) | Depends heavily on campus racial climate |
| **Gains** | Moderate-High (M≈3.0) | Engaged learner |
| **Satisfaction** | Moderate (M≈2.9) | Conditional on inclusion |

**FASt Effect (post-PSW):** NEGATIVE
- Small numbers in FASt, lack of support
- a1 > 0, a2 < 0

---

#### Archetype 6: White Residential Traditional
**Profile:** White, continuing-gen, non-Pell, lives on campus

| Construct | Pattern | Rationale |
|-----------|---------|-----------|
| **EmoDiss** | Low-Moderate (M≈2.8) | Support systems, less financial stress |
| **QualEngag** | High (M≈5.8) | Full campus integration |
| **Belonging** | High (M≈3.3) | Environment designed for them |
| **Gains** | Moderate-High (M≈3.1) | Standard engagement |
| **Satisfaction** | High (M≈3.4) | Expectations met |

**FASt Effect (post-PSW):** SLIGHTLY POSITIVE
- Has support systems to leverage acceleration
- a1 < 0 (modest), a2 > 0 (modest)

---

#### Archetype 7: White Commuter Working
**Profile:** White, first-gen, lives off-campus, works significant hours

| Construct | Pattern | Rationale |
|-----------|---------|-----------|
| **EmoDiss** | Moderate-High (M≈3.7) | Work-school conflict |
| **QualEngag** | Low-Moderate (M≈4.4) | Limited campus time |
| **Belonging** | Low-Moderate (M≈2.5) | Feels disconnected |
| **Gains** | Moderate (M≈2.7) | Practical orientation |
| **Satisfaction** | Moderate (M≈2.7) | Getting by |

**FASt Effect (post-PSW):** NEAR ZERO
- a1 ≈ 0, a2 ≈ 0

---

#### Archetype 8: Multiracial Bridge-Builder
**Profile:** Other/Multiracial, varied backgrounds, mixed living

| Construct | Pattern | Rationale |
|-----------|---------|-----------|
| **EmoDiss** | Moderate (M≈3.4) | Identity complexity |
| **QualEngag** | Moderate-High (M≈5.1) | Code-switching skills |
| **Belonging** | Variable (M≈2.7) | May not fit neatly anywhere |
| **Gains** | Moderate-High (M≈3.0) | Diverse perspective |
| **Satisfaction** | Moderate (M≈3.0) | Mixed experiences |

**FASt Effect (post-PSW):** MIXED/SMALL
- a1 ≈ 0, a2 ≈ 0

---

#### Archetype 9: Hispanic On-Campus Transitioner
**Profile:** Hispanic, first-gen, lives on campus (rare but important)

| Construct | Pattern | Rationale |
|-----------|---------|-----------|
| **EmoDiss** | Moderate (M≈3.3) | On-campus mitigates some stress |
| **QualEngag** | Moderate-High (M≈5.3) | More opportunities |
| **Belonging** | Moderate-High (M≈3.0) | Benefits from residential life |
| **Gains** | Moderate-High (M≈3.1) | Full engagement |
| **Satisfaction** | Moderate-High (M≈3.1) | Better than commuter peers |

**FASt Effect (post-PSW):** NEAR ZERO TO SLIGHT NEGATIVE
- On-campus helps, but FASt still challenging
- a1 ≈ 0, a2 ≈ 0

---

#### Archetype 10: Continuing-Gen Cruiser
**Profile:** Non-URM, continuing-gen, non-Pell, any living

| Construct | Pattern | Rationale |
|-----------|---------|-----------|
| **EmoDiss** | Low (M≈2.5) | Fewer stressors |
| **QualEngag** | Moderate-High (M≈5.5) | Cultural capital |
| **Belonging** | High (M≈3.2) | Fits institutional norms |
| **Gains** | Moderate (M≈2.9) | Coasting possible |
| **Satisfaction** | High (M≈3.3) | Expectations met |

**FASt Effect (post-PSW):** SLIGHTLY POSITIVE
- Has resources to benefit from acceleration
- a1 < 0, a2 > 0

---

### Summary: Post-PSW FASt Effects by Archetype

| Archetype | a1 (→EmoDiss) | a2 (→QualEngag) | Net Effect |
|-----------|---------------|-----------------|------------|
| 1. Latina Commuter Caretaker | +0.25 | -0.20 | **Harmful** |
| 2. Latino First-Gen Striver | +0.15 | -0.05 | **Harmful** |
| 3. Asian High-Pressure Achiever | 0.00 | 0.00 | **Null** |
| 4. Asian First-Gen Navigator | +0.20 | -0.15 | **Harmful** |
| 5. Black Campus Connector | +0.18 | -0.12 | **Harmful** |
| 6. White Residential Traditional | -0.10 | +0.12 | **Beneficial** |
| 7. White Commuter Working | +0.05 | -0.02 | **Near Null** |
| 8. Multiracial Bridge-Builder | +0.05 | 0.00 | **Near Null** |
| 9. Hispanic On-Campus Trans. | +0.08 | -0.05 | **Slight Harm** |
| 10. Continuing-Gen Cruiser | -0.12 | +0.15 | **Beneficial** |

**Key insight:** The equity-impacted archetypes (1, 2, 4, 5) show NEGATIVE effects of FASt after PSW, while privileged archetypes (6, 10) show positive effects. This creates the selection bias illusion—raw data looks positive because high-FASt groups are disproportionately privileged.

---

## Missingness Patterns by Archetype

| Variable Type | Mechanism | Overall Rate | Higher For... |
|--------------|-----------|--------------|---------------|
| Demographics | MCAR | 1-2% | Uniform |
| HS background | MCAR | 2-3% | Archetype 4 (immigrant families) |
| Belonging items | MCAR | 3-4% | Archetypes with low belonging |
| EmoDiss items | MAR | 5-10% | Archetypes 1, 3, 4 (stigma, non-disclosure) |
| MHWdmental/loneliness | MAR | 8-12% | Asian archetypes (3, 4) - cultural stigma |
| QI items | MCAR | 3-5% | Commuters (1, 2, 7) - "haven't interacted" |

---

## Sources

- CSU Fall 2024 Enrollment Demographics: https://www.calstate.edu/csu-system/about-the-csu/facts-about-the-csu/enrollment/
- CCC Student Demographics: https://www.cccco.edu/About-Us/Chancellors-Office/Divisions/Research-Analytics-Data/data-snapshot/student-demographics
- NSSE Sense of Belonging: https://nsse.indiana.edu/research/annual-results/2020/belonging-story/
- PPIC Dual Enrollment: https://www.ppic.org/publication/improving-college-access-and-success-through-dual-enrollment/
- Familismo & Latino Students: Hurtado & Carter (1997), Ovink & Kalogrides (2015)
- Asian Mental Health: NAMI (2024), Hwang & Goto (2008)
- First-Gen Living: Soria & Stebleton (2012), Stephens et al. (2012)
- Latina Stress: Sy (2006), Castillo et al. (2010)
- Gender & Engagement: Kuh (2003)
- Johnson Dissertation Draft (November 2025)
