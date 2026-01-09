import { useState } from 'react';
import { useResearch } from '../context/ResearchContext';
import GroupComparison from '../components/charts/GroupComparison';
import Toggle from '../components/ui/Toggle';
import GlossaryTerm from '../components/ui/GlossaryTerm';
import useParallax from '../hooks/useParallax';
import { Link } from 'react-router-dom';
import fastComparisonData from '../data/fastComparison.json';
import sampleDescriptives from '../data/sampleDescriptives.json';
import styles from './DemographicsPage.module.css';

// Type for race comparison data
interface RaceComparisonData {
  fast: { n: number; pct: number };
  nonfast: { n: number; pct: number };
}

// Type for transfer credits stats
interface TransferCreditsStats {
  fast: { mean: number; sd: number; min: number; max: number; median: number };
  nonfast: { mean: number; sd: number; min: number; max: number; median: number };
}

// Type for the fastComparison data
interface FastComparisonType {
  overall: { n: number; fast_n: number; nonfast_n: number };
  demographics: {
    race: Record<string, RaceComparisonData>;
    firstgen: Record<string, RaceComparisonData>;
    pell: Record<string, RaceComparisonData>;
    sex: Record<string, RaceComparisonData>;
    living: Record<string, RaceComparisonData>;
    transferCredits: TransferCreditsStats;
  };
}

// Cast imported JSON to proper type
const fastComparison = fastComparisonData as FastComparisonType;

const groupingOptions = [
  { value: 'race', label: 'Race/Ethnicity', description: 'Compare across Hispanic/Latino, White, Asian, Black/African American, and Other groups' },
  { value: 'firstgen', label: 'First-Generation', description: 'Compare first-generation college students vs. students with college-educated parents' },
  { value: 'pell', label: 'Financial Need', description: 'Compare students receiving Pell grants (lower income) vs. those who don\'t' },
  { value: 'sex', label: 'Gender', description: 'Compare female vs. male students' },
  { value: 'living', label: 'Living Situation', description: 'Compare students living with family, on-campus, or off-campus' },
] as const;

export default function DemographicsPage() {
  const { groupingVariable, setGroupingVariable } = useResearch();
  const [showComparison, setShowComparison] = useState(false);
  const demographics = sampleDescriptives.demographics;
  const parallaxOffset = useParallax({ speed: 0.1, max: 28 });

  return (
    <div className={`${styles.page} page-fade`}>
      <div className="container">
        <section
          className={styles.header}
          style={{ ['--parallax-offset' as string]: `${parallaxOffset}px` }}
        >
          <p className={styles.eyebrow}>
            Equity Framework
          </p>
          <h1>Do Effects Differ for Different Students?</h1>
          <p className="lead">
            An important question: Do dual enrollment credits affect all students the same way?
            We use <GlossaryTerm term="Multi-Group Analysis" definition="A statistical technique that tests whether relationships in our model differ across student groups (e.g., race, income, first-generation status). This helps identify whether some students benefit more or less from dual enrollment credits.">multi-group analysis</GlossaryTerm>{' '}
            to compare whether <GlossaryTerm term="Emotional Distress" definition="A latent construct measuring students' challenges during their first year, including academic difficulties, loneliness, mental health concerns, exhaustion, sleep problems, and financial stress.">stress</GlossaryTerm>{' '}
            and <GlossaryTerm term="Quality of Engagement" definition="A latent construct measuring the quality of students' interactions on campus with other students, advisors, faculty, staff, and administrators.">engagement</GlossaryTerm> patterns differ across
            student backgrounds.
          </p>
        </section>

        {/* Demographics Breakdown with Comparison Toggle */}
        <div className={styles.demographicsBreakdown}>
          <div className={styles.demographicsHeader}>
              <h2>Sample Demographics</h2>
              <Toggle
                checked={showComparison}
                onChange={() => setShowComparison(!showComparison)}
                label="Compare FASt vs Non-FASt"
                id="demographics-page-comparison-toggle"
              />
            </div>

            <div className={styles.demographicsGrid}>
              {/* Race/Ethnicity Breakdown */}
              <div className={`${styles.demoCard} reveal`} style={{ transitionDelay: '0ms' }}>
                <h3>Race & Ethnicity</h3>
                <div className={styles.demoStats}>
                  {Object.entries(demographics.race).map(([group, data]) => (
                    <div key={group} className={styles.demoStat}>
                      {!showComparison ? (
                        <>
                          <div className={styles.demoLabel}>
                            <span>{group}</span>
                            <span>{data.pct}%</span>
                          </div>
                          <div className={styles.demoBar}>
                            <div className={styles.demoBarFill} style={{ width: `${data.pct}%` }} />
                          </div>
                        </>
                      ) : (
                        <div className={styles.demoComparison}>
                          <div className={styles.demoLabel}><span>{group}</span></div>
                          <div className={styles.comparisonRow}>
                            <span className={styles.comparisonLabel}>FASt</span>
                            <div className={styles.demoBar}>
                              <div className={styles.demoBarFill} style={{
                                width: `${fastComparison.demographics.race[group]?.fast.pct || 0}%`,
                                backgroundColor: 'var(--color-fast)'
                              }} />
                            </div>
                            <span>{fastComparison.demographics.race[group]?.fast.pct || 0}%</span>
                          </div>
                          <div className={styles.comparisonRow}>
                            <span className={styles.comparisonLabel}>Non-FASt</span>
                            <div className={styles.demoBar}>
                              <div className={styles.demoBarFill} style={{
                                width: `${fastComparison.demographics.race[group]?.nonfast.pct || 0}%`,
                                backgroundColor: 'var(--color-text-muted)'
                              }} />
                            </div>
                            <span>{fastComparison.demographics.race[group]?.nonfast.pct || 0}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* First-Gen & Pell */}
              <div className={`${styles.demoCard} reveal`} style={{ transitionDelay: '100ms' }}>
                <h3>Access & Equity</h3>
                <div className={styles.demoStats}>
                  <div className={styles.demoStat}>
                    <div className={styles.demoLabel}>
                      <span>First-Generation</span>
                      <span>{!showComparison ? `${demographics.firstgen.yes.pct}%` : ''}</span>
                    </div>
                    {!showComparison ? (
                      <div className={styles.demoBar}>
                        <div className={styles.demoBarFill} style={{ width: `${demographics.firstgen.yes.pct}%` }} />
                      </div>
                    ) : (
                      <div className={styles.demoComparison}>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>FASt</span>
                          <div className={styles.demoBar}>
                            <div className={styles.demoBarFill} style={{
                              width: `${fastComparison.demographics.firstgen.yes.fast.pct}%`,
                              backgroundColor: 'var(--color-fast)'
                            }} />
                          </div>
                          <span>{fastComparison.demographics.firstgen.yes.fast.pct}%</span>
                        </div>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>Non-FASt</span>
                          <div className={styles.demoBar}>
                            <div className={styles.demoBarFill} style={{
                              width: `${fastComparison.demographics.firstgen.yes.nonfast.pct}%`,
                              backgroundColor: 'var(--color-text-muted)'
                            }} />
                          </div>
                          <span>{fastComparison.demographics.firstgen.yes.nonfast.pct}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={styles.demoStat}>
                    <div className={styles.demoLabel}>
                      <span>Pell Grant Recipients</span>
                      <span>{!showComparison ? `${demographics.pell.yes.pct}%` : ''}</span>
                    </div>
                    {!showComparison ? (
                      <div className={styles.demoBar}>
                        <div className={styles.demoBarFill} style={{ width: `${demographics.pell.yes.pct}%` }} />
                      </div>
                    ) : (
                      <div className={styles.demoComparison}>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>FASt</span>
                          <div className={styles.demoBar}>
                            <div className={styles.demoBarFill} style={{
                              width: `${fastComparison.demographics.pell.yes.fast.pct}%`,
                              backgroundColor: 'var(--color-fast)'
                            }} />
                          </div>
                          <span>{fastComparison.demographics.pell.yes.fast.pct}%</span>
                        </div>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>Non-FASt</span>
                          <div className={styles.demoBar}>
                            <div className={styles.demoBarFill} style={{
                              width: `${fastComparison.demographics.pell.yes.nonfast.pct}%`,
                              backgroundColor: 'var(--color-text-muted)'
                            }} />
                          </div>
                          <span>{fastComparison.demographics.pell.yes.nonfast.pct}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
        </div>

        <section className={styles.sampleInfo}>
          <h2>FASt vs Non-FASt Snapshot</h2>
          <p className={styles.sampleIntro}>
            A quick look at sample size and baseline characteristics for each group.
          </p>
          <div className={styles.sampleGrid}>
            <div className={styles.sampleCard}>
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
            <div className={styles.sampleCard}>
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

        <section className={styles.controls}>
          <label className={styles.selectLabel}>Compare students by:</label>
          <div className={styles.groupButtons}>
            {groupingOptions.map((option) => (
              <button
                key={option.value}
                className={`${styles.groupButton} ${groupingVariable === option.value ? styles.active : ''}`}
                onClick={() => setGroupingVariable(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className={styles.groupDescription}>
            {groupingOptions.find((o) => o.value === groupingVariable)?.description}
          </p>
          <p className={styles.plainTalk}>
            Plain talk: we’re checking whether the same credit effect looks different for each group.
          </p>
        </section>

        <div className={styles.charts}>
          <div className={styles.chartContainer}>
              <h2>Effect on Stress by {groupingOptions.find((o) => o.value === groupingVariable)?.label}</h2>
              <p className={styles.chartDescription}>
                Does earning dual enrollment credits lead to different stress levels across equity groups?
              </p>
              <GroupComparison grouping={groupingVariable} pathway="a1" />
            </div>

            <div className={styles.chartContainer}>
              <h2>Effect on Engagement by {groupingOptions.find((o) => o.value === groupingVariable)?.label}</h2>
              <p className={styles.chartDescription}>
                Does earning dual enrollment credits change campus engagement differently across equity groups?
              </p>
              <GroupComparison grouping={groupingVariable} pathway="a2" />
            </div>
        </div>

        <div className={styles.interpretation}>
          <h2>Why This Matters for Equity</h2>
          <div className={styles.interpretationGrid}>
            <article className={styles.interpretationCard}>
                <h3>Fair Comparisons</h3>
                <p>
                  Before comparing groups, we tested for{' '}
                  <GlossaryTerm term="Measurement Invariance" definition="A statistical test verifying that survey questions measure the same underlying concepts equally well across different student groups. Without this, group comparisons could be misleading.">measurement invariance</GlossaryTerm>{' '}
                  to ensure our survey questions work the same way for all students.
                  This confirms we're measuring the same things across different backgrounds.
                </p>
              </article>
            <article className={styles.interpretationCard}>
                <h3>Looking for Differences</h3>
                <p>
                  If the <GlossaryTerm term="Effect Size" definition="A standardized measure of how strong a relationship is. In forest plots, effect sizes near zero indicate little to no effect, while larger values (positive or negative) indicate stronger effects.">effect sizes</GlossaryTerm>{' '}
                  look similar across groups, it means dual enrollment credits
                  affect students similarly regardless of background. If they differ,
                  some students might need different support.
                </p>
              </article>
            <article className={styles.interpretationCard}>
                <h3>Targeted Support</h3>
                <p>
                  If effects are similar for everyone, universal programs may work best.
                  If <GlossaryTerm term="Moderation" definition="When the relationship between two variables changes depending on a third variable. For example, if the effect of dual enrollment credits on stress is stronger for first-generation students than continuing-generation students.">moderation by demographics</GlossaryTerm> exists, colleges might need specialized support for
                  specific student populations.
                </p>
              </article>
          </div>
        </div>

        <section className={styles.nextStep}>
          <h2>Next: How We Ran the Study</h2>
          <p>
            See the step-by-step method we used to make fair comparisons and test the model.
          </p>
          <Link to="/methods" className="button button-primary button-lg">
            Go to Methods
          </Link>
        </section>
      </div>
    </div>
  );
}
