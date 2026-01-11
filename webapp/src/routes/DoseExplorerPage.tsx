import { useMemo } from 'react';
import { useResearch, useModelData } from '../app/contexts';
import Slider from '../components/ui/Slider';
import Toggle from '../components/ui/Toggle';
import DoseResponseCurve from '../features/charts/DoseResponseCurve';
import JohnsonNeymanPlot from '../features/charts/JohnsonNeymanPlot';
import StatCard from '../components/ui/StatCard';
import KeyTakeaway from '../components/ui/KeyTakeaway';
import GlossaryTerm from '../components/ui/GlossaryTerm';
import DataTimestamp from '../components/ui/DataTimestamp';
import { InteractiveSurface } from '../components/ui/InteractiveSurface';

import styles from './DoseExplorerPage.module.css';

// Dose zone definitions
const DOSE_ZONES = [
  { id: 'low', label: 'Low Dose', range: '0–11 credits', min: 0, max: 11 },
  { id: 'moderate', label: 'Moderate', range: '12–35 credits', min: 12, max: 35 },
  { id: 'high', label: 'High Dose', range: '36+ credits', min: 36, max: 80 },
] as const;

// Get the current dose zone
function getDoseZone(dose: number): typeof DOSE_ZONES[number]['id'] {
  if (dose < 12) return 'low';
  if (dose < 36) return 'moderate';
  return 'high';
}

export default function DoseExplorerPage() {
  const { selectedDose, setSelectedDose, showCIs, toggleCIs } = useResearch();
  const { doseCoefficients } = useModelData();

  // Current dose zone
  const currentZone = useMemo(() => getDoseZone(selectedDose), [selectedDose]);

  // Calculate conditional effects at selected dose (from dynamic pipeline data)
  // These formulas come from the model: effect = main + (dose * moderation)
  const doseInUnits = (selectedDose - 12) / 10; // 10-credit units above threshold
  const distressEffect = doseCoefficients.distress.main + (doseInUnits * doseCoefficients.distress.moderation);
  const engagementEffect = doseCoefficients.engagement.main + (doseInUnits * doseCoefficients.engagement.moderation);

  return (
    <div className={styles.page}>
      <div className="container">
        <section className={`${styles.header} page-header-glow`}>
          <p className={styles.eyebrow}>Dose-Response Analysis</p>
          <h1>Does the Number of Credits Matter?</h1>
          <p className="lead">
            Some students earn just a few college credits in high school, while others
            earn many. This is called the <GlossaryTerm term="Credit Dose" definition="The total number of transferable college credits a student earned before starting college. Our model tests whether effects differ based on dose—a 'dose-response' relationship.">credit dose</GlossaryTerm>. Use the slider below to explore
            how different doses affect <GlossaryTerm term="Emotional Distress" definition="A latent construct measuring students' challenges during their first year, including academic difficulties, loneliness, mental health concerns, exhaustion, sleep problems, and financial stress.">stress</GlossaryTerm>{' '}
            and <GlossaryTerm term="Quality of Engagement" definition="A latent construct measuring the quality of students' interactions on campus with other students, advisors, faculty, staff, and administrators.">campus engagement</GlossaryTerm>.
          </p>
        </section>

        <div className={styles.controls}>
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
            {/* Dose Zone Indicators - click to snap slider */}
            <div className={styles.doseZones}>
              {DOSE_ZONES.map((zone) => {
                const midpoint = zone.id === 'high' ? 48 : Math.round((zone.min + zone.max) / 2);
                return (
                  <InteractiveSurface
                    key={zone.id}
                    as="button"
                    type="button"
                    className={`${styles.doseZone} ${styles[zone.id]} ${currentZone === zone.id ? styles.active : ''} interactiveSurface`}
                    onClick={() => setSelectedDose(midpoint)}
                    aria-pressed={currentZone === zone.id}
                    aria-label={`Set dose to ${zone.label} (${zone.range})`}
                    hoverLift={3}
                  >
                    <span className={styles.zoneDot} />
                    <span className={styles.zoneLabel}>{zone.label}</span>
                    <span className={styles.zoneRange}>{zone.range}</span>
                  </InteractiveSurface>
                );
              })}
            </div>
          </div>
          <div className={styles.toggleContainer}>
            <Toggle
              id="show-cis"
              label="Show Uncertainty Ranges"
              checked={showCIs}
              onChange={toggleCIs}
            />
            <p className={styles.toggleHint}>
              Shaded bands show 95% confidence intervals—where we expect the true effect to fall.
            </p>
          </div>
        </div>

        <div className={styles.conditionalEffects}>
          <h2>What Happens at {selectedDose} Credits?</h2>
          <div className={styles.effectCards}>
            <StatCard
              label="Effect on Stress"
              value={distressEffect > 0 ? `+${distressEffect.toFixed(2)}` : distressEffect.toFixed(2)}
              subtext={distressEffect > 0 ? '↑ Higher stress' : '↓ Lower stress'}
              color={distressEffect > 0 ? 'negative' : 'positive'}
              animate={false}
            />
            <StatCard
              label="Effect on Engagement"
              value={engagementEffect > 0 ? `+${engagementEffect.toFixed(2)}` : engagementEffect.toFixed(2)}
              subtext={engagementEffect > 0 ? '↑ More engaged' : '↓ Less engaged'}
              color={engagementEffect > 0 ? 'positive' : 'negative'}
              animate={false}
            />
          </div>
          <DataTimestamp />
        </div>

        <div className={styles.charts}>
          <div className={styles.chartContainer}>
            <h3>Stress Levels by Credit Amount</h3>
            <p className={styles.chartDescription}>
              Students with FASt status report higher stress regardless of how many
              credits they earned. The number of credits doesn't significantly change
              this pattern—whether you have 12 or 40 credits, the stress increase is similar.
            </p>
            <DoseResponseCurve outcome="distress" selectedDose={selectedDose} />
          </div>

          <div className={styles.chartContainer}>
            <h3>Campus Engagement by Credit Amount</h3>
            <p className={styles.chartDescription}>
              There's a hint of an interesting pattern here: students with fewer transfer
              credits seem to engage more with campus, while those with many credits
              engage slightly less. However, we'd need more evidence to be confident.
            </p>
            <DoseResponseCurve outcome="engagement" selectedDose={selectedDose} />
          </div>
        </div>

        {/* Johnson-Neyman Analysis */}
        <div className={styles.jnSection}>
          <h2>When Do Effects Become Significant?</h2>
          <p className={styles.jnIntro}>
            The <GlossaryTerm term="Johnson-Neyman Technique" definition="A statistical method that identifies the exact point(s) where a conditional effect becomes statistically significant. It shows where the confidence interval crosses zero.">Johnson-Neyman technique</GlossaryTerm> identifies
            the exact credit threshold where effects become statistically significant—where we can be confident the effect isn't just random variation.
          </p>
          <p className={styles.jnNote}>
            Significance is based on 95% confidence intervals that do not cross zero.
          </p>
          <div className={styles.jnCharts}>
            <JohnsonNeymanPlot outcome="engagement" selectedDose={selectedDose} />
            <JohnsonNeymanPlot outcome="distress" selectedDose={selectedDose} />
          </div>
        </div>

        <div className={styles.interpretation}>
          <h2>Understanding These Numbers</h2>
          <div className={styles.interpretationContent}>
            <InteractiveSurface as="article" className={`${styles.interpretationCard} interactiveSurface`} hoverLift={4}>
              <h3>What Do the Numbers Mean?</h3>
              <p>
                The <GlossaryTerm term="Effect Size" definition="A standardized measure of how strong a relationship is. Values are in standard deviation units—an effect of 0.10 is small, 0.30 is medium, and 0.50 is large.">effect sizes</GlossaryTerm> are in "standard deviation" units. An effect of +0.13
                means transfer students score about 0.13 standard deviations higher on
                stress measures—a small but meaningful difference in a group of students.
              </p>
            </InteractiveSurface>
            <InteractiveSurface as="article" className={`${styles.interpretationCard} interactiveSurface`} hoverLift={4}>
              <h3>Why Credit Amount Matters</h3>
              <p>
                This analysis tests for <GlossaryTerm term="Moderated Mediation" definition="A model where the indirect effect (through a mediator like stress) changes depending on a moderator variable (like credit dose). It answers: 'Does the mediation process work differently at different credit levels?'">moderated mediation</GlossaryTerm>—whether
                the pathway from credits to adjustment changes at different doses.
                Someone with 12 credits may experience different effects than someone with 45 credits.
              </p>
            </InteractiveSurface>
            <InteractiveSurface as="article" className={`${styles.interpretationCard} interactiveSurface`} hoverLift={4}>
              <h3>What This Means for Colleges</h3>
              <p>
                The <GlossaryTerm term="Confidence Interval" definition="A range of values within which we're 95% confident the true effect lies. Wider intervals mean more uncertainty. When an interval includes zero, we can't be confident the effect is real.">confidence intervals</GlossaryTerm> help us understand uncertainty.
                When they don't cross zero, we're more confident the effect is real.
                Colleges can use this to tailor support based on credit totals.
              </p>
            </InteractiveSurface>
          </div>
        </div>

        {/* Key Takeaway */}
        <KeyTakeaway>
          The <strong>amount of dual enrollment credits matters</strong>—12 credits create different effects than 30+ credits, with higher doses amplifying both stress and engagement impacts.
        </KeyTakeaway>

        <section className={styles.nextStep}>
          <h2>Next: See the Practical Implications</h2>
          <p>
            Translate the dose-response patterns into concrete recommendations for students,
            advisors, and policy leaders.
          </p>
          <InteractiveSurface as="link" to="/so-what" className="button button-primary button-lg interactiveSurface">
            Go to So, What?
          </InteractiveSurface>
        </section>
      </div>
    </div>
  );
}
