import { useResearch } from '../context/ResearchContext';
import PathwayDiagram from '../components/charts/PathwayDiagram';
import Toggle from '../components/ui/Toggle';
import Slider from '../components/ui/Slider';
import styles from './PathwayPage.module.css';

// Path coefficient data with plain-language labels
const pathData = [
  {
    id: 'a1',
    label: 'Transfer Credits → Stress',
    estimate: 0.127,
    se: 0.037,
    pvalue: 0.0007,
    interpretation: 'Students who earned college credits in high school report somewhat higher stress levels during their first year.',
    type: 'distress',
  },
  {
    id: 'a1z',
    label: 'Does credit amount change stress?',
    estimate: 0.003,
    se: 0.015,
    pvalue: 0.854,
    interpretation: 'The number of credits earned doesn\'t change this pattern—stress levels are similar whether students earned 12 or 40 credits.',
    type: 'moderation',
  },
  {
    id: 'a2',
    label: 'Transfer Credits → Engagement',
    estimate: -0.010,
    se: 0.036,
    pvalue: 0.778,
    interpretation: 'Transfer credits alone don\'t significantly change how engaged students are with campus life.',
    type: 'engagement',
  },
  {
    id: 'a2z',
    label: 'Does credit amount change engagement?',
    estimate: -0.014,
    se: 0.014,
    pvalue: 0.319,
    interpretation: 'There\'s a hint that students with many credits engage less with campus, but we\'re not confident this pattern is real.',
    type: 'moderation',
  },
  {
    id: 'b1',
    label: 'Stress → College Success',
    estimate: -0.203,
    se: 0.008,
    pvalue: 0,
    interpretation: 'Strong connection: students with more stress have a harder time adjusting to college life.',
    type: 'distress',
  },
  {
    id: 'b2',
    label: 'Engagement → College Success',
    estimate: 0.160,
    se: 0.007,
    pvalue: 0,
    interpretation: 'Strong connection: students who engage more with campus do better overall.',
    type: 'engagement',
  },
  {
    id: 'c',
    label: 'Transfer Credits → Success (Direct)',
    estimate: 0.041,
    se: 0.013,
    pvalue: 0.002,
    interpretation: 'Beyond the stress and engagement effects, transfer credits give a small direct boost to college success.',
    type: 'direct',
  },
  {
    id: 'cz',
    label: 'Does credit amount change the direct benefit?',
    estimate: -0.009,
    se: 0.005,
    pvalue: 0.060,
    interpretation: 'There\'s a hint that the direct benefit decreases when students have many credits, but we need more evidence.',
    type: 'moderation',
  },
];

export default function PathwayPage() {
  const { highlightedPath, setHighlightedPath, showCIs, toggleCIs, selectedDose, setSelectedDose } = useResearch();

  const pathwayButtons = [
    { id: null, label: 'Show All', color: 'var(--color-text)' },
    { id: 'distress', label: 'Stress Route', color: 'var(--color-distress)' },
    { id: 'engagement', label: 'Engagement Route', color: 'var(--color-engagement)' },
    { id: 'direct', label: 'Direct Benefit', color: 'var(--color-nonfast)' },
  ] as const;

  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <h1>How Transfer Credits Affect First-Year Success</h1>
          <p className="lead">
            This diagram shows the different ways that earning college credits in high school
            can influence a student's first-year college experience. Click the buttons below
            to highlight different connections.
          </p>
        </header>

        <section className={styles.controls}>
          <div className={styles.pathwayButtons}>
            {pathwayButtons.map((btn) => (
              <button
                key={btn.id || 'all'}
                className={`${styles.pathwayButton} ${highlightedPath === btn.id ? styles.active : ''}`}
                onClick={() => setHighlightedPath(btn.id)}
                style={{ '--button-color': btn.color } as React.CSSProperties}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <div className={styles.toggleContainer}>
            <Toggle
              id="show-cis-pathway"
              label="Show Uncertainty Ranges"
              checked={showCIs}
              onChange={toggleCIs}
            />
          </div>
        </section>

        <section className={styles.diagram}>
          <PathwayDiagram width={800} height={450} interactive />
        </section>

        <section className={styles.doseControl}>
          <h2>How Many Credits Matter?</h2>
          <p className={styles.doseDescription}>
            Not all students earn the same number of credits. Use the slider to see
            how the effects might change for students with different credit totals.
          </p>
          <div className={styles.sliderContainer}>
            <Slider
              id="pathway-dose"
              label="College Credits Earned"
              value={selectedDose}
              onChange={setSelectedDose}
              min={0}
              max={80}
              step={1}
              formatValue={(v) => `${v} credits`}
              showThreshold={12}
              thresholdLabel="12+ = FASt Student"
            />
          </div>
        </section>

        <section className={styles.coefficients}>
          <h2>Key Findings</h2>
          <div className={styles.coefficientGrid}>
            {pathData.map((path) => {
              const isHighlighted = !highlightedPath ||
                (highlightedPath === 'distress' && (path.id === 'a1' || path.id === 'b1' || path.id === 'a1z')) ||
                (highlightedPath === 'engagement' && (path.id === 'a2' || path.id === 'b2' || path.id === 'a2z')) ||
                (highlightedPath === 'direct' && (path.id === 'c' || path.id === 'cz'));

              const strengthBadge = path.pvalue < 0.001 ? 'Strong evidence' :
                                    path.pvalue < 0.05 ? 'Good evidence' :
                                    path.pvalue < 0.10 ? 'Suggestive' : 'Uncertain';

              return (
                <article
                  key={path.id}
                  className={`${styles.coefficientCard} ${!isHighlighted ? styles.dimmed : ''}`}
                >
                  <div className={styles.coefficientHeader}>
                    <span className={styles.coefficientLabel}>{path.label}</span>
                    <span className={styles.strengthBadge}>{strengthBadge}</span>
                  </div>
                  <div className={styles.coefficientValue}>
                    Effect size: {path.estimate > 0 ? '+' : ''}{path.estimate.toFixed(2)}
                  </div>
                  <p className={styles.coefficientInterpretation}>{path.interpretation}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.summary}>
          <h2>The Big Picture</h2>
          <div className={styles.summaryGrid}>
            <article className={styles.summaryCard}>
              <h3>The Stress Route</h3>
              <p>
                Students with transfer credits report <strong>higher stress</strong> in their first year.
                Since stress hurts college adjustment, this creates a <strong>negative ripple effect</strong>.
                This is the "cost" side of accelerated credit.
              </p>
            </article>
            <article className={styles.summaryCard}>
              <h3>The Engagement Route</h3>
              <p>
                Transfer credits don't clearly change how engaged students are with campus life.
                However, engagement is <strong>really important</strong> for success—students who
                connect more with campus do much better overall.
              </p>
            </article>
            <article className={styles.summaryCard}>
              <h3>Direct Benefits</h3>
              <p>
                Beyond stress and engagement, transfer credits provide a <strong>small direct boost</strong>
                to college success. This might reflect academic preparation, confidence, or
                other benefits we didn't measure directly.
              </p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
