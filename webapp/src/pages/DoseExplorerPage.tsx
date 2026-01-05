import { useResearch } from '../context/ResearchContext';
import { useModelData } from '../context/ModelDataContext';
import Slider from '../components/ui/Slider';
import Toggle from '../components/ui/Toggle';
import DoseResponseCurve from '../components/charts/DoseResponseCurve';
import StatCard from '../components/ui/StatCard';
import KeyTakeaway from '../components/ui/KeyTakeaway';
import GlossaryTerm from '../components/ui/GlossaryTerm';
import DataTimestamp from '../components/ui/DataTimestamp';
import { useScrollReveal, useStaggeredReveal } from '../hooks/useScrollReveal';
import styles from './DoseExplorerPage.module.css';

export default function DoseExplorerPage() {
  const { selectedDose, setSelectedDose, showCIs, toggleCIs } = useResearch();
  const { doseCoefficients } = useModelData();

  // Scroll reveal refs
  const headerRef = useScrollReveal<HTMLElement>({ threshold: 0.2 });
  const controlsRef = useScrollReveal<HTMLElement>({ threshold: 0.3 });
  const effectsRef = useStaggeredReveal<HTMLElement>();
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
            earn many. This is called the <GlossaryTerm term="Credit Dose" definition="The total number of transferable college credits a student earned before starting college. Our model tests whether effects differ based on dose—a 'dose-response' relationship.">credit dose</GlossaryTerm>. Use the slider below to explore
            how different doses affect <GlossaryTerm term="Emotional Distress" definition="A latent construct measuring students' challenges during their first year, including academic difficulties, loneliness, mental health concerns, exhaustion, sleep problems, and financial stress.">stress</GlossaryTerm>{' '}
            and <GlossaryTerm term="Quality of Engagement" definition="A latent construct measuring the quality of students' interactions on campus with other students, advisors, faculty, staff, and administrators.">campus engagement</GlossaryTerm>.
          </p>
        </header>

        <section ref={controlsRef} className={`${styles.controls} reveal`}>
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
              thresholdLabel="FASt (12+)"
              tickMarks={[24, 36, 48, 60]}
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

        <section ref={effectsRef} className={`${styles.conditionalEffects} stagger-children`}>
          <h2>What Happens at {selectedDose} Credits?</h2>
          <div className={styles.effectCards}>
            <div className="reveal">
              <StatCard
                label="Effect on Stress"
                value={distressEffect > 0 ? `+${distressEffect.toFixed(2)}` : distressEffect.toFixed(2)}
                subtext={distressEffect > 0 ? '↑ Higher stress' : '↓ Lower stress'}
                color={distressEffect > 0 ? 'negative' : 'positive'}
              />
            </div>
            <div className="reveal">
              <StatCard
                label="Effect on Engagement"
                value={engagementEffect > 0 ? `+${engagementEffect.toFixed(2)}` : engagementEffect.toFixed(2)}
                subtext={engagementEffect > 0 ? '↑ More engaged' : '↓ Less engaged'}
                color={engagementEffect > 0 ? 'positive' : 'negative'}
              />
            </div>
          </div>
          <DataTimestamp />
        </section>

        <section ref={chartsRef} className={`${styles.charts} stagger-children`}>
          <div className={`${styles.chartContainer} reveal`}>
            <h3>Stress Levels by Credit Amount</h3>
            <p className={styles.chartDescription}>
              Students with FASt status report higher stress regardless of how many
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
                The <GlossaryTerm term="Effect Size" definition="A standardized measure of how strong a relationship is. Values are in standard deviation units—an effect of 0.10 is small, 0.30 is medium, and 0.50 is large.">effect sizes</GlossaryTerm> are in "standard deviation" units. An effect of +0.13
                means transfer students score about 0.13 standard deviations higher on
                stress measures—a small but meaningful difference in a group of students.
              </p>
            </article>
            <article className={`${styles.interpretationCard} reveal`}>
              <h3>Why Credit Amount Matters</h3>
              <p>
                This analysis tests for <GlossaryTerm term="Moderated Mediation" definition="A model where the indirect effect (through a mediator like stress) changes depending on a moderator variable (like credit dose). It answers: 'Does the mediation process work differently at different credit levels?'">moderated mediation</GlossaryTerm>—whether
                the pathway from credits to adjustment changes at different doses.
                Someone with 12 credits may experience different effects than someone with 45 credits.
              </p>
            </article>
            <article className={`${styles.interpretationCard} reveal`}>
              <h3>What This Means for Colleges</h3>
              <p>
                The <GlossaryTerm term="Confidence Interval" definition="A range of values within which we're 95% confident the true effect lies. Wider intervals mean more uncertainty. When an interval includes zero, we can't be confident the effect is real.">confidence intervals</GlossaryTerm> help us understand uncertainty.
                When they don't cross zero, we're more confident the effect is real.
                Colleges can use this to tailor support based on credit totals.
              </p>
            </article>
          </div>
        </section>

        {/* Key Takeaway */}
        <KeyTakeaway>
          The <strong>amount of dual enrollment credits matters</strong>—12 credits create different effects than 30+ credits, with higher doses amplifying both stress and engagement impacts.
        </KeyTakeaway>
      </div>
    </div>
  );
}
