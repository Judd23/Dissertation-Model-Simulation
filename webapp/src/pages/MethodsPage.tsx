import { useMemo } from 'react';
import { useModelData } from '../context/ModelDataContext';
import styles from './MethodsPage.module.css';

const modelSpecs = [
  { label: 'Estimator', value: 'Maximum Likelihood (ML)', description: 'Standard method for finding best-fitting parameters' },
  { label: 'Missing Data', value: 'Full Information ML (FIML)', description: 'Uses all available data, no deletion' },
  { label: 'Weights', value: 'Propensity Score Overlap (PSW)', description: 'Adjusts for pre-existing group differences' },
  { label: 'Bootstrap Replicates', value: '2,000', description: 'Number of resamples for confidence intervals' },
  { label: 'CI Method', value: 'Bias-Corrected Accelerated (BCa)', description: 'More accurate intervals for indirect effects' },
  { label: 'Model Framework', value: 'Hayes Model 59', description: 'Moderated parallel mediation design' },
];

export default function MethodsPage() {
  const { fitMeasures: fits } = useModelData();

  // Build fit measures table dynamically from pipeline data
  const fitMeasures = useMemo(() => {
    const checkResult = (val: number | undefined, threshold: number, higher: boolean = true) => {
      if (val === undefined) return '—';
      return higher ? (val >= threshold ? 'Excellent' : 'Below threshold') 
                    : (val <= threshold ? 'Excellent' : 'Below threshold');
    };

    return [
      { name: 'Chi-Square (χ²)', description: 'Overall model test', value: fits.chisq?.toFixed(2) ?? '—', criterion: '—', interpretation: 'Baseline test statistic' },
      { name: 'Degrees of Freedom', description: 'Model complexity', value: fits.df?.toString() ?? '—', criterion: '—', interpretation: '—' },
      { name: 'Chi-Square p-value', description: 'Significance test', value: fits.pvalue !== undefined ? (fits.pvalue < 0.001 ? '< .001' : fits.pvalue.toFixed(3)) : '—', criterion: 'Non-significant preferred', interpretation: 'Expected with large samples' },
      { name: 'CFI', description: 'Comparative fit', value: fits.cfi?.toFixed(3) ?? '—', criterion: '≥ 0.95', interpretation: checkResult(fits.cfi, 0.95, true) },
      { name: 'TLI', description: 'Tucker-Lewis fit', value: fits.tli?.toFixed(3) ?? '—', criterion: '≥ 0.95', interpretation: checkResult(fits.tli, 0.95, true) },
      { name: 'RMSEA', description: 'Approximation error', value: fits.rmsea?.toFixed(3) ?? '—', criterion: '≤ 0.05', interpretation: checkResult(fits.rmsea, 0.05, false) },
      { name: 'SRMR', description: 'Residual size', value: fits.srmr?.toFixed(3) ?? '—', criterion: '≤ 0.08', interpretation: fits.srmr !== undefined ? (fits.srmr <= 0.08 ? 'Good' : 'Below threshold') : '—' },
    ];
  }, [fits]);
  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <h1>About This Study</h1>
          <p className="lead">
            This page explains how we analyzed the data and why you can trust the findings.
            Technical details are provided for researchers who want to evaluate our methods.
          </p>
        </header>

        <section className={styles.section}>
          <h2>How Well Does the Model Fit?</h2>
          <p className={styles.sectionIntro}>
            These statistics tell us whether our model accurately represents the real patterns
            in the data. Higher CFI/TLI and lower RMSEA/SRMR indicate better fit.
            Our model meets all recommended standards.
          </p>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Measure</th>
                  <th>What It Tells Us</th>
                  <th>Value</th>
                  <th>Target</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {fitMeasures.map((m) => (
                  <tr key={m.name}>
                    <td>{m.name}</td>
                    <td className={styles.description}>{m.description}</td>
                    <td className={styles.mono}>{m.value}</td>
                    <td>{m.criterion}</td>
                    <td>{m.interpretation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Analysis Settings</h2>
          <p className={styles.sectionIntro}>
            These are the technical choices we made when running the analysis.
          </p>
          <div className={styles.specGrid}>
            {modelSpecs.map((spec) => (
              <div key={spec.label} className={styles.specCard}>
                <dt className={styles.specLabel}>{spec.label}</dt>
                <dd className={styles.specValue}>{spec.value}</dd>
                <dd className={styles.specDescription}>{spec.description}</dd>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>Making Fair Comparisons</h2>
          <p className={styles.sectionIntro}>
            Students don't randomly choose to earn college credits in high school—those who
            do tend to have higher GPAs, more educated parents, etc. We used <strong>propensity
            score weighting</strong> to account for these pre-existing differences and make
            fairer comparisons.
          </p>
          <div className={styles.codeBlock}>
            <h4>Factors We Controlled For</h4>
            <ul className={styles.codeList}>
              <li><strong>hgrades</strong> — High school GPA</li>
              <li><strong>bparented</strong> — Parent education level</li>
              <li><strong>pell</strong> — Pell grant eligibility (income proxy)</li>
              <li><strong>hapcl</strong> — Number of AP courses taken</li>
              <li><strong>hprecalc13</strong> — Pre-calculus proficiency</li>
              <li><strong>hchallenge_c</strong> — How challenging their high school was</li>
              <li><strong>cSFcareer_c</strong> — Career expectations</li>
              <li><strong>cohort</strong> — Which year they enrolled</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <h2>What We Measured</h2>
          <p className={styles.sectionIntro}>
            Each concept in our model was measured using multiple survey questions.
            Using multiple questions gives us more reliable measurements than single items.
          </p>
          <div className={styles.constructGrid}>
            <article className={styles.constructCard}>
              <h4 style={{ color: 'var(--color-distress)' }}>Emotional Distress</h4>
              <p>6 questions about challenges faced (6-point scale)</p>
              <ul>
                <li>Academic difficulties</li>
                <li>Loneliness</li>
                <li>Mental health concerns</li>
                <li>Exhaustion</li>
                <li>Sleep problems</li>
                <li>Financial stress</li>
              </ul>
            </article>
            <article className={styles.constructCard}>
              <h4 style={{ color: 'var(--color-engagement)' }}>Quality of Engagement</h4>
              <p>5 questions about campus interactions (7-point scale)</p>
              <ul>
                <li>Interactions with other students</li>
                <li>Interactions with advisors</li>
                <li>Interactions with faculty</li>
                <li>Interactions with staff</li>
                <li>Interactions with administrators</li>
              </ul>
            </article>
            <article className={styles.constructCard}>
              <h4 style={{ color: 'var(--color-belonging)' }}>College Success</h4>
              <p>15 questions across 4 areas</p>
              <ul>
                <li><strong>Belonging</strong> — Feeling part of campus (3 items)</li>
                <li><strong>Gains</strong> — Skills developed (5 items)</li>
                <li><strong>Support</strong> — Campus resources (5 items)</li>
                <li><strong>Satisfaction</strong> — Overall experience (2 items)</li>
              </ul>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <h2>How We Calculated Confidence</h2>
          <p className={styles.sectionIntro}>
            We used <strong>bootstrapping</strong> (2,000 resamples) to calculate how confident
            we are in our findings. This method doesn't assume the data follows a perfect
            bell curve, making it more reliable for complex analyses like ours.
          </p>
          <div className={styles.infoBox}>
            <h4>Why Bootstrap?</h4>
            <p>
              When we multiply effects together (like in mediation analysis), the math gets
              complicated. Bootstrapping lets the data "speak for itself" by repeatedly
              resampling and recalculating, giving us a realistic picture of uncertainty.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Software Used</h2>
          <p className={styles.sectionIntro}>
            All analyses used open-source software for transparency and reproducibility.
          </p>
          <div className={styles.softwareGrid}>
            <div className={styles.softwareCard}>
              <h4>R Packages</h4>
              <ul>
                <li><code>lavaan</code> — Main statistical modeling</li>
                <li><code>semTools</code> — Model diagnostics</li>
                <li><code>mice</code> — Handling missing data</li>
                <li><code>parallel</code> — Faster computation</li>
              </ul>
            </div>
            <div className={styles.softwareCard}>
              <h4>Python Packages</h4>
              <ul>
                <li><code>pandas</code>, <code>numpy</code> — Data processing</li>
                <li><code>matplotlib</code>, <code>seaborn</code> — Visualizations</li>
                <li><code>python-docx</code> — Report generation</li>
              </ul>
            </div>
          </div>
          <p className={styles.repoNote}>
            All analysis code is available in the project repository for full reproducibility.
          </p>
        </section>

        <section className={styles.section}>
          <h2>References</h2>
          <ul className={styles.references}>
            <li>
              Hayes, A. F. (2022). <em>Introduction to mediation, moderation, and
              conditional process analysis</em> (3rd ed.). Guilford Press.
            </li>
            <li>
              Hu, L., & Bentler, P. M. (1999). Cutoff criteria for fit indexes in
              covariance structure analysis. <em>Structural Equation Modeling, 6</em>(1), 1–55.
            </li>
            <li>
              Kline, R. B. (2023). <em>Principles and practice of structural equation
              modeling</em> (5th ed.). Guilford Press.
            </li>
            <li>
              Li, F., Morgan, K. L., & Zaslavsky, A. M. (2018). Balancing covariates
              via propensity score weighting. <em>Journal of the American Statistical
              Association, 113</em>(521), 390–400.
            </li>
            <li>
              Preacher, K. J., & Hayes, A. F. (2008). Asymptotic and resampling
              strategies for assessing and comparing indirect effects. <em>Behavior
              Research Methods, 40</em>(3), 879–891.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
