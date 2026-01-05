import { useMemo, useState, useEffect, useRef } from 'react';
import { useResearch } from '../context/ResearchContext';
import { useModelData } from '../context/ModelDataContext';
import PathwayDiagram from '../components/charts/PathwayDiagram';
import Toggle from '../components/ui/Toggle';
import Slider from '../components/ui/Slider';
import KeyTakeaway from '../components/ui/KeyTakeaway';
import GlossaryTerm from '../components/ui/GlossaryTerm';
import { useScrollReveal, useStaggeredReveal } from '../hooks/useScrollReveal';
import fastComparison from '../data/fastComparison.json';
import styles from './PathwayPage.module.css';

export default function PathwayPage() {
  const { highlightedPath, setHighlightedPath, showCIs, toggleCIs, selectedDose, setSelectedDose } = useResearch();
  const { paths } = useModelData();
  const [isStuck, setIsStuck] = useState(false);
  const [showSampleInfo, setShowSampleInfo] = useState(false);
  const controlsRef = useRef<HTMLElement>(null);

  // Scroll reveal refs
  const headerRef = useScrollReveal<HTMLElement>({ threshold: 0.2 });
  const diagramRef = useScrollReveal<HTMLElement>({ threshold: 0.1 });
  const doseRef = useScrollReveal<HTMLElement>();
  const coefficientsRef = useStaggeredReveal<HTMLElement>();
  const summaryRef = useStaggeredReveal<HTMLElement>();

  // Detect sticky state (using -10px rootMargin for reliable triggering across zoom levels)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting);
      },
      { threshold: [1], rootMargin: '-10px 0px 0px 0px' }
    );

    if (controlsRef.current) {
      observer.observe(controlsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Build path data dynamically from pipeline outputs
  const pathData = useMemo(() => [
    {
      id: 'a1',
      label: 'FASt Status → Stress',
      estimate: paths.a1?.estimate ?? 0,
      se: paths.a1?.se ?? 0,
      pvalue: paths.a1?.pvalue ?? 1,
      interpretation: 'Students who earned dual enrollment credits in high school report somewhat higher stress levels during their first year.',
      type: 'distress',
    },
    {
      id: 'a1z',
      label: 'Does credit amount change stress?',
      estimate: paths.a1z?.estimate ?? 0,
      se: paths.a1z?.se ?? 0,
      pvalue: paths.a1z?.pvalue ?? 1,
      interpretation: 'The number of credits earned doesn\'t change this pattern—stress levels are similar whether students earned 12 or 40 credits.',
      type: 'moderation',
    },
    {
      id: 'a2',
      label: 'FASt Status → Engagement',
      estimate: paths.a2?.estimate ?? 0,
      se: paths.a2?.se ?? 0,
      pvalue: paths.a2?.pvalue ?? 1,
      interpretation: 'Dual enrollment credits alone don\'t significantly change how engaged students are with campus life.',
      type: 'engagement',
    },
    {
      id: 'a2z',
      label: 'Does credit amount change engagement?',
      estimate: paths.a2z?.estimate ?? 0,
      se: paths.a2z?.se ?? 0,
      pvalue: paths.a2z?.pvalue ?? 1,
      interpretation: 'There\'s a hint that students with many credits engage less with campus, but we\'re not confident this pattern is real.',
      type: 'moderation',
    },
    {
      id: 'b1',
      label: 'Stress → College Success',
      estimate: paths.b1?.estimate ?? 0,
      se: paths.b1?.se ?? 0,
      pvalue: paths.b1?.pvalue ?? 1,
      interpretation: 'Strong connection: students with more stress have a harder time adjusting to college life.',
      type: 'distress',
    },
    {
      id: 'b2',
      label: 'Engagement → College Success',
      estimate: paths.b2?.estimate ?? 0,
      se: paths.b2?.se ?? 0,
      pvalue: paths.b2?.pvalue ?? 1,
      interpretation: 'Strong connection: students who engage more with campus do better overall.',
      type: 'engagement',
    },
    {
      id: 'c',
      label: 'FASt Status → Success (Direct)',
      estimate: paths.c?.estimate ?? 0,
      se: paths.c?.se ?? 0,
      pvalue: paths.c?.pvalue ?? 1,
      interpretation: 'Beyond the stress and engagement effects, dual enrollment credits give a small direct boost to college success.',
      type: 'direct',
    },
    {
      id: 'cz',
      label: 'Does credit amount change the direct benefit?',
      estimate: paths.cz?.estimate ?? 0,
      se: paths.cz?.se ?? 0,
      pvalue: paths.cz?.pvalue ?? 1,
      interpretation: 'There\'s a hint that the direct benefit decreases when students have many credits, but we need more evidence.',
      type: 'moderation',
    },
  ], [paths]);

  const pathwayButtons = [
    { id: null, label: 'Show All', color: 'var(--color-text)' },
    { id: 'distress', label: 'Stress Route', color: 'var(--color-distress)' },
    { id: 'engagement', label: 'Engagement Route', color: 'var(--color-engagement)' },
    { id: 'serial', label: 'Serial Mediation', color: 'var(--color-belonging)' },
    { id: 'direct', label: 'Direct Benefit', color: 'var(--color-nonfast)' },
  ] as const;

  return (
    <div className={styles.page}>
      <div className="container">
        <header ref={headerRef} className={`${styles.header} reveal`}>
          <span className={styles.eyebrow}>Interactive Model</span>
          <h1>How Dual Enrollment Credits Affect First-Year Success</h1>
          <p className="lead">
            This diagram shows the different ways that earning college credits in high school
            can influence a student's first-year college experience. The model uses {' '}
            <GlossaryTerm term="Mediation Analysis" definition="A statistical technique that examines whether an independent variable (dual enrollment credits) affects an outcome (adjustment) through intermediate variables (stress and engagement). It reveals the 'how' of cause and effect.">mediation analysis</GlossaryTerm>{' '}
            to trace effects through <GlossaryTerm term="Emotional Distress" definition="A latent construct measuring students' challenges during their first year, including academic difficulties, loneliness, mental health concerns, exhaustion, sleep problems, and financial stress.">stress</GlossaryTerm>{' '}
            and <GlossaryTerm term="Quality of Engagement" definition="A latent construct measuring the quality of students' interactions on campus with other students, advisors, faculty, staff, and administrators.">engagement</GlossaryTerm> pathways.
          </p>
        </header>

        <section ref={controlsRef} className={`${styles.controls} ${isStuck ? styles.stuck : ''}`}>
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
            <Toggle
              id="show-sample-info-pathway"
              label="Show Sample Breakdown"
              checked={showSampleInfo}
              onChange={() => setShowSampleInfo(!showSampleInfo)}
            />
          </div>
        </section>

        {showSampleInfo && (
          <section className={styles.sampleInfo}>
            <h3>Sample Composition: FASt vs Non-FASt Students</h3>
            <div className={styles.sampleGrid}>
              <div className={styles.sampleCard} style={{ transitionDelay: '0ms' }}>
                <div className={styles.sampleHeader}>
                  <span className={styles.sampleLabel}>FASt Students</span>
                  <span className={styles.sampleCount}>{fastComparison.overall.fast_n.toLocaleString()}</span>
                </div>
                <div className={styles.sampleDetail}>12+ dual enrollment credits from high school</div>
                <div className={styles.sampleStats}>
                  <div>Avg credits: <strong>{fastComparison.demographics.transferCredits.fast.mean}</strong></div>
                  <div>First-Gen: <strong>{fastComparison.demographics.firstgen.yes.fast.pct}%</strong></div>
                  <div>Pell: <strong>{fastComparison.demographics.pell.yes.fast.pct}%</strong></div>
                </div>
              </div>
              <div className={styles.sampleCard} style={{ transitionDelay: '100ms' }}>
                <div className={styles.sampleHeader}>
                  <span className={styles.sampleLabel}>Non-FASt Students</span>
                  <span className={styles.sampleCount}>{fastComparison.overall.nonfast_n.toLocaleString()}</span>
                </div>
                <div className={styles.sampleDetail}>Fewer than 12 dual enrollment credits</div>
                <div className={styles.sampleStats}>
                  <div>Avg credits: <strong>{fastComparison.demographics.transferCredits.nonfast.mean}</strong></div>
                  <div>First-Gen: <strong>{fastComparison.demographics.firstgen.yes.nonfast.pct}%</strong></div>
                  <div>Pell: <strong>{fastComparison.demographics.pell.yes.nonfast.pct}%</strong></div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section ref={diagramRef} className={`${styles.diagram} reveal-scale`}>
          <PathwayDiagram width={800} height={450} interactive />
        </section>

        <section ref={doseRef} className={`${styles.doseControl} reveal`}>
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
              tickMarks={[12, 24, 36, 48, 60]}
            />
          </div>
        </section>

        <section ref={coefficientsRef} className={`${styles.coefficients} stagger-children`}>
          <h2>Key Findings</h2>
          <div className={styles.coefficientGrid}>
            {pathData.map((path) => {
              const isHighlighted = !highlightedPath ||
                (highlightedPath === 'distress' && (path.id === 'a1' || path.id === 'b1' || path.id === 'a1z')) ||
                (highlightedPath === 'engagement' && (path.id === 'a2' || path.id === 'b2' || path.id === 'a2z')) ||
                (highlightedPath === 'serial' && (path.id === 'a1' || path.id === 'b1' || path.id === 'a2' || path.id === 'b2')) ||
                (highlightedPath === 'direct' && (path.id === 'c' || path.id === 'cz'));

              const strengthBadge = path.pvalue < 0.001 ? 'Strong evidence' :
                                    path.pvalue < 0.05 ? 'Good evidence' :
                                    path.pvalue < 0.10 ? 'Suggestive' : 'Uncertain';

              return (
                <article
                  key={path.id}
                  className={`${styles.coefficientCard} ${!isHighlighted ? styles.dimmed : ''} reveal`}
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

        <section ref={summaryRef} className={`${styles.summary} stagger-children`}>
          <h2>The Big Picture</h2>
          <div className={styles.summaryGrid}>
            <article className={`${styles.summaryCard} reveal`} style={{ transitionDelay: '0ms' }}>
              <h3>The Stress Route</h3>
              <p>
                Students with FASt status report <strong>higher stress</strong> in their first year.
                Since stress hurts college adjustment, this creates a{' '}
                <GlossaryTerm term="Indirect Effect" definition="The portion of the total effect that works through an intermediate variable. Here, FASt status affects adjustment indirectly by first increasing stress, which then reduces adjustment.">negative indirect effect</GlossaryTerm>.
                This is the "cost" side of accelerated credit.
              </p>
            </article>
            <article className={`${styles.summaryCard} reveal`} style={{ transitionDelay: '100ms' }}>
              <h3>The Engagement Route</h3>
              <p>
                Dual enrollment credits don't clearly change how engaged students are with campus life.
                However, engagement is <strong>really important</strong> for success—the{' '}
                <GlossaryTerm term="Path Coefficient" definition="A standardized measure of the strength and direction of a relationship between two variables in our model. Values range from -1 to +1, with larger absolute values indicating stronger relationships.">path from engagement to adjustment</GlossaryTerm>{' '}
                is one of the strongest in our model.
              </p>
            </article>
            <article className={`${styles.summaryCard} reveal`} style={{ transitionDelay: '200ms' }}>
              <h3>Direct Benefits</h3>
              <p>
                Beyond stress and engagement, dual enrollment credits provide a{' '}
                <GlossaryTerm term="Direct Effect" definition="The portion of the total effect that doesn't go through the mediators (stress and engagement). It represents other ways dual enrollment credits might help students that we didn't explicitly measure.">small direct boost</GlossaryTerm>{' '}
                to college success. This might reflect academic preparation, confidence, or
                other benefits we didn't measure directly.
              </p>
            </article>
          </div>
        </section>

        {/* Key Takeaway */}
        <KeyTakeaway>
          Dual enrollment credits create <strong>competing forces</strong>: they increase stress (hurting adjustment) while offering direct academic benefits—with the balance shifting based on credit dose.
        </KeyTakeaway>
      </div>
    </div>
  );
}
