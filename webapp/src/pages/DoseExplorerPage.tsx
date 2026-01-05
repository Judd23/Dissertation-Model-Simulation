import { useResearch } from '../context/ResearchContext';
import { useModelData } from '../context/ModelDataContext';
import Slider from '../components/ui/Slider';
import Toggle from '../components/ui/Toggle';
import DoseResponseCurve from '../components/charts/DoseResponseCurve';
import StatCard from '../components/ui/StatCard';
import DataTimestamp from '../components/ui/DataTimestamp';
import { useScrollReveal, useStaggeredReveal } from '../hooks/useScrollReveal';
import styles from './DoseExplorerPage.module.css';

export default function DoseExplorerPage() {
  const { selectedDose, setSelectedDose, showCIs, toggleCIs } = useResearch();
  const { doseCoefficients } = useModelData();

  // Scroll reveal refs
  const headerRef = useScrollReveal<HTMLElement>({ threshold: 0.2 });
  const effectsRef = useScrollReveal<HTMLElement>();
  const chartsRef = useStaggeredReveal<HTMLElement>();
  const interpretRef = useStaggeredReveal<HTMLElement>();

  // Calculate conditional effects at selected dose (from dynamic pipeline data)
  // These formulas come from the model: effect = main + (dose * moderation)
  const doseInUnits = (selectedDose - 12) / 10; // 10-credit units above threshold
  const distressEffect = doseCoefficients.distress.main + (doseInUnits * doseCoefficients.distress.moderation);
  const engagementEffect = doseCoefficients.engagement.main + (doseInUnits * doseCoefficients.engagement.moderation);

  return (
    <div className={styles.page}>
      <div className="container">
        <header ref={headerRef} className={`${styles.header} reveal`}>
          <span className={styles.eyebrow}>Dose-Response Analysis</span>
          <h1>Does the Number of Credits Matter?</h1>
          <p className="lead">
            Some students earn just a few college credits in high school, while others
            earn many. Use the slider below to explore whether more credits lead to
            different first-year experiences.
          </p>
        </header>

        <section className={styles.controls}>
          <div className={styles.sliderContainer}>
            <Slider
              id="credit-dose"
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
          <div className={styles.toggleContainer}>
            <Toggle
              id="show-cis"
              label="Show Uncertainty Ranges"
              checked={showCIs}
              onChange={toggleCIs}
            />
          </div>
        </section>

        <section ref={effectsRef} className={`${styles.conditionalEffects} reveal`}>
          <h2>What Happens at {selectedDose} Credits?</h2>
          <div className={styles.effectCards}>
            <StatCard
              label="Effect on Stress"
              value={distressEffect > 0 ? `+${distressEffect.toFixed(2)}` : distressEffect.toFixed(2)}
              subtext={distressEffect > 0 ? '↑ Higher stress' : '↓ Lower stress'}
              color={distressEffect > 0 ? 'negative' : 'positive'}
            />
            <StatCard
              label="Effect on Engagement"
              value={engagementEffect > 0 ? `+${engagementEffect.toFixed(2)}` : engagementEffect.toFixed(2)}
              subtext={engagementEffect > 0 ? '↑ More engaged' : '↓ Less engaged'}
              color={engagementEffect > 0 ? 'positive' : 'negative'}
            />
          </div>
          <DataTimestamp />
        </section>

        <section ref={chartsRef} className={`${styles.charts} stagger-children`}>
          <div className={`${styles.chartContainer} reveal`}>
            <h3>Stress Levels by Credit Amount</h3>
            <p className={styles.chartDescription}>
              Students with transfer credits report higher stress regardless of how many
              credits they earned. The number of credits doesn't significantly change
              this pattern—whether you have 12 or 40 credits, the stress increase is similar.
            </p>
            <DoseResponseCurve outcome="distress" selectedDose={selectedDose} />
          </div>

          <div className={`${styles.chartContainer} reveal`}>
            <h3>Campus Engagement by Credit Amount</h3>
            <p className={styles.chartDescription}>
              There's a hint of an interesting pattern here: students with fewer transfer
              credits seem to engage more with campus, while those with many credits
              engage slightly less. However, we'd need more evidence to be confident.
            </p>
            <DoseResponseCurve outcome="engagement" selectedDose={selectedDose} />
          </div>
        </section>

        <section ref={interpretRef} className={`${styles.interpretation} stagger-children`}>
          <h2>Understanding These Numbers</h2>
          <div className={styles.interpretationContent}>
            <article className={`${styles.interpretationCard} reveal`}>
              <h3>What Do the Numbers Mean?</h3>
              <p>
                The effect sizes are in "standard deviation" units. An effect of +0.13
                means transfer students score about 0.13 standard deviations higher on
                stress measures—a small but meaningful difference in a group of students.
              </p>
            </article>
            <article className={`${styles.interpretationCard} reveal`}>
              <h3>Why Credit Amount Matters</h3>
              <p>
                Not all accelerated students are alike. Someone with 12 credits took
                a few college courses, while someone with 45 credits may have earned
                nearly an associate degree. Their experiences might differ substantially.
              </p>
            </article>
            <article className={`${styles.interpretationCard} reveal`}>
              <h3>What This Means for Colleges</h3>
              <p>
                These findings suggest colleges might need to support transfer students
                differently based on how many credits they bring. Students with many
                credits might need extra help connecting with campus community.
              </p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
