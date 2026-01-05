import { Link } from 'react-router-dom';
import { useState } from 'react';
import StatCard from '../components/ui/StatCard';
import Icon from '../components/ui/Icon';
import GlossaryTerm from '../components/ui/GlossaryTerm';
import KeyTakeaway from '../components/ui/KeyTakeaway';
import Toggle from '../components/ui/Toggle';
import PathwayDiagram from '../components/charts/PathwayDiagram';
import DataTimestamp from '../components/ui/DataTimestamp';
import { useModelData } from '../context/ModelDataContext';
import { useScrollReveal, useStaggeredReveal } from '../hooks/useScrollReveal';
import sampleDescriptives from '../data/sampleDescriptives.json';
import fastComparison from '../data/fastComparison.json';
import styles from './HomePage.module.css';

export default function HomePage() {
  const { sampleSize, fitMeasures, paths, fastPercent } = useModelData();
  const demographics = sampleDescriptives.demographics;
  const [showComparison, setShowComparison] = useState(false);

  // Scroll reveal refs
  const heroRef = useScrollReveal<HTMLElement>({ threshold: 0.2 });
  const demographicsRef = useStaggeredReveal<HTMLElement>();
  const statsRef = useStaggeredReveal<HTMLElement>();
  const finding1Ref = useScrollReveal<HTMLElement>();
  const finding2Ref = useScrollReveal<HTMLElement>();
  const finding3Ref = useScrollReveal<HTMLElement>();
  const previewRef = useScrollReveal<HTMLElement>();
  const exploreRef = useStaggeredReveal<HTMLElement>();

  // Derive key findings dynamically from pipeline data
  const keyFindings = {
    totalN: sampleSize,
    fastPct: fastPercent,
    cfi: fitMeasures.cfi ?? 0.997,
    distressEffect: paths.a1?.estimate ?? 0,
    engagementEffect: paths.a2?.estimate ?? 0,
    adjustmentDirect: paths.c?.estimate ?? 0,
  };
  return (
    <div className={styles.page}>
      {/* Hero Section - Full viewport */}
      <section ref={heroRef} className={`${styles.hero} reveal`}>
        <div className="container">
          <span className={styles.eyebrow}>Research Findings</span>
          <h1 className={styles.title}>
            How College Credits Earned in High School Affect First-Year Success
          </h1>
          <p className={styles.lead}>
            Explore what happens when students enter college with <GlossaryTerm term="Dual Enrollment Credits" definition="College credits earned while in high school through dual enrollment programs, allowing students to take college courses before graduating high school.">dual enrollment credits</GlossaryTerm> from
            high school. We studied California State University students to understand
            how earning credits early affects their stress levels, campus involvement,
            and overall <GlossaryTerm term="Developmental Adjustment" definition="A student's overall success in transitioning to college, including sense of belonging, personal growth, feeling supported, and satisfaction with their college experience.">adjustment to college life</GlossaryTerm>.
          </p>
        </div>
      </section>

      {/* Sample Demographics */}
      <section ref={demographicsRef} className={`${styles.demographics} stagger-children`}>
        <div className="container">
          <div className={styles.demographicsHeader}>
            <div className={styles.demographicsHeaderTop}>
              <div>
                <h2>Our Student Population</h2>
                <p className={styles.demographicsLead}>
                  {sampleSize.toLocaleString()} California State University first-year students representing diverse backgrounds and experiences
                </p>
              </div>
              <Toggle
                checked={showComparison}
                onChange={() => setShowComparison(!showComparison)}
                label="Compare FASt vs Non-FASt"
                id="demographics-comparison-toggle"
              />
            </div>
          </div>

          <div className={styles.demographicsGrid}>
            {/* Race/Ethnicity */}
            <div className={`${styles.demoCard} reveal`}>
              <h3 className={styles.demoCardTitle}>Race & Ethnicity</h3>
              <div className={styles.demoStats}>
                {Object.entries(demographics.race).map(([group, data]) => (
                  <div key={`${group}-${showComparison ? 'compare' : 'default'}`} className={styles.demoStat}>
                    {!showComparison ? (
                      <>
                        <div className={styles.demoBar}>
                          <div
                            className={styles.demoBarFill}
                            style={{ width: `${data.pct}%` }}
                            aria-label={`${group}: ${data.pct}%`}
                          />
                        </div>
                        <div className={styles.demoLabel}>
                          <span className={styles.demoGroup}>{group}</span>
                          <span className={styles.demoPct}>{data.pct}%</span>
                        </div>
                        <div className={styles.demoCount}>{data.n.toLocaleString()} students</div>
                      </>
                    ) : (
                      <div className={styles.demoComparison}>
                        <div className={styles.demoLabel}>
                          <span className={styles.demoGroup}>{group}</span>
                        </div>
                        <div className={styles.demoComparisonRow}>
                          <span className={styles.comparisonLabel}>FASt</span>
                          <div className={styles.demoBar}>
                            <div
                              className={styles.demoBarFill}
                              style={{
                                width: `${(fastComparison.demographics.race as any)[group]?.fast.pct || 0}%`,
                                backgroundColor: 'var(--color-fast)'
                              }}
                            />
                          </div>
                          <span className={styles.demoPct}>
                            {(fastComparison.demographics.race as any)[group]?.fast.pct || 0}%
                          </span>
                        </div>
                        <div className={styles.demoComparisonRow}>
                          <span className={styles.comparisonLabel}>Non-FASt</span>
                          <div className={styles.demoBar}>
                            <div
                              className={styles.demoBarFill}
                              style={{
                                width: `${(fastComparison.demographics.race as any)[group]?.nonfast.pct || 0}%`,
                                backgroundColor: 'var(--color-text-muted)'
                              }}
                            />
                          </div>
                          <span className={styles.demoPct}>
                            {(fastComparison.demographics.race as any)[group]?.nonfast.pct || 0}%
                          </span>
                        </div>
                        <div className={styles.demoCount}>
                          FASt: {(fastComparison.demographics.race as any)[group]?.fast.n.toLocaleString() || 0} |
                          Non-FASt: {(fastComparison.demographics.race as any)[group]?.nonfast.n.toLocaleString() || 0}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* FASt Access Equity */}
            <div className={`${styles.demoCard} reveal`}>
              <h3 className={styles.demoCardTitle}>FASt Program Access</h3>
              <p className={styles.demoSubtitle}>
                {!showComparison 
                  ? "Percentage of each group participating in FASt"
                  : "Composition of FASt vs Non-FASt groups"
                }
              </p>
              <div className={styles.demoStats}>
                {!showComparison ? (
                  <>
                    <div className={styles.donutRow}>
                      <div className={styles.demoCircle}>
                        <svg viewBox="0 0 36 36" className={styles.demoDonut}>
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="var(--color-border-light)"
                            strokeWidth="3"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="var(--color-fast)"
                            strokeWidth="3"
                            strokeDasharray={`${Math.round(100 * fastComparison.demographics.firstgen.yes.fast.n / demographics.firstgen.yes.n)}, 100`}
                          />
                          <text x="18" y="18" className={styles.demoPercentage}>
                            {Math.round(100 * fastComparison.demographics.firstgen.yes.fast.n / demographics.firstgen.yes.n)}%
                          </text>
                        </svg>
                      </div>
                      <div className={styles.donutInfo}>
                        <span className={styles.demoGroup}>First-Generation</span>
                        <span className={styles.demoCount}>{fastComparison.demographics.firstgen.yes.fast.n.toLocaleString()} of {demographics.firstgen.yes.n.toLocaleString()} are FASt</span>
                      </div>
                    </div>

                    <div className={styles.donutRow}>
                      <div className={styles.demoCircle}>
                        <svg viewBox="0 0 36 36" className={styles.demoDonut}>
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="var(--color-border-light)"
                            strokeWidth="3"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="var(--color-fast)"
                            strokeWidth="3"
                            strokeDasharray={`${Math.round(100 * fastComparison.demographics.pell.yes.fast.n / demographics.pell.yes.n)}, 100`}
                          />
                          <text x="18" y="18" className={styles.demoPercentage}>
                            {Math.round(100 * fastComparison.demographics.pell.yes.fast.n / demographics.pell.yes.n)}%
                          </text>
                        </svg>
                      </div>
                      <div className={styles.donutInfo}>
                        <span className={styles.demoGroup}>Pell Grant Recipients</span>
                        <span className={styles.demoCount}>{fastComparison.demographics.pell.yes.fast.n.toLocaleString()} of {demographics.pell.yes.n.toLocaleString()} are FASt</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Comparison: First-Gen composition within FASt vs Non-FASt */}
                    <div className={styles.comparisonDonutPair}>
                      <div className={styles.comparisonDonutLabel}>First-Generation</div>
                      <div className={styles.comparisonDonutRow}>
                        <div className={styles.comparisonDonutItem}>
                          <div className={styles.demoCircle}>
                            <svg viewBox="0 0 36 36" className={styles.demoDonut}>
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-border-light)" strokeWidth="3" />
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-fast)" strokeWidth="3" strokeDasharray={`${Math.round(100 * fastComparison.demographics.firstgen.yes.fast.n / fastComparison.overall.fast_n)}, 100`} />
                              <text x="18" y="18" className={styles.demoPercentage}>{Math.round(100 * fastComparison.demographics.firstgen.yes.fast.n / fastComparison.overall.fast_n)}%</text>
                            </svg>
                          </div>
                          <span className={styles.comparisonDonutCaption}>FASt</span>
                        </div>
                        <div className={styles.comparisonDonutItem}>
                          <div className={styles.demoCircle}>
                            <svg viewBox="0 0 36 36" className={styles.demoDonut}>
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-border-light)" strokeWidth="3" />
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-text-muted)" strokeWidth="3" strokeDasharray={`${Math.round(100 * fastComparison.demographics.firstgen.yes.nonfast.n / fastComparison.overall.nonfast_n)}, 100`} />
                              <text x="18" y="18" className={styles.demoPercentage}>{Math.round(100 * fastComparison.demographics.firstgen.yes.nonfast.n / fastComparison.overall.nonfast_n)}%</text>
                            </svg>
                          </div>
                          <span className={styles.comparisonDonutCaption}>Non-FASt</span>
                        </div>
                      </div>
                    </div>

                    {/* Comparison: Pell composition within FASt vs Non-FASt */}
                    <div className={styles.comparisonDonutPair}>
                      <div className={styles.comparisonDonutLabel}>Pell Grant Recipients</div>
                      <div className={styles.comparisonDonutRow}>
                        <div className={styles.comparisonDonutItem}>
                          <div className={styles.demoCircle}>
                            <svg viewBox="0 0 36 36" className={styles.demoDonut}>
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-border-light)" strokeWidth="3" />
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-fast)" strokeWidth="3" strokeDasharray={`${Math.round(100 * fastComparison.demographics.pell.yes.fast.n / fastComparison.overall.fast_n)}, 100`} />
                              <text x="18" y="18" className={styles.demoPercentage}>{Math.round(100 * fastComparison.demographics.pell.yes.fast.n / fastComparison.overall.fast_n)}%</text>
                            </svg>
                          </div>
                          <span className={styles.comparisonDonutCaption}>FASt</span>
                        </div>
                        <div className={styles.comparisonDonutItem}>
                          <div className={styles.demoCircle}>
                            <svg viewBox="0 0 36 36" className={styles.demoDonut}>
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-border-light)" strokeWidth="3" />
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-text-muted)" strokeWidth="3" strokeDasharray={`${Math.round(100 * fastComparison.demographics.pell.yes.nonfast.n / fastComparison.overall.nonfast_n)}, 100`} />
                              <text x="18" y="18" className={styles.demoPercentage}>{Math.round(100 * fastComparison.demographics.pell.yes.nonfast.n / fastComparison.overall.nonfast_n)}%</text>
                            </svg>
                          </div>
                          <span className={styles.comparisonDonutCaption}>Non-FASt</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Gender & STEM (if needed, we can add living situation instead) */}
            <div className={`${styles.demoCard} reveal`}>
              <h3 className={styles.demoCardTitle}>Student Profile</h3>
              <div className={styles.demoStats}>
                <div className={styles.demoStat}>
                  <div className={styles.demoBar}>
                    <div
                      className={styles.demoBarFill}
                      style={{ width: `${demographics.sex.women.pct}%` }}
                      aria-label={`Female: ${demographics.sex.women.pct}%`}
                    />
                  </div>
                  <div className={styles.demoLabel}>
                    <span className={styles.demoGroup}>Female</span>
                    <span className={styles.demoPct}>{demographics.sex.women.pct}%</span>
                  </div>
                  <div className={styles.demoCount}>{demographics.sex.women.n.toLocaleString()} students</div>
                </div>

                <div className={styles.demoStat}>
                  <div className={styles.demoBar}>
                    <div
                      className={styles.demoBarFill}
                      style={{ width: `${demographics.sex.men.pct}%` }}
                      aria-label={`Male: ${demographics.sex.men.pct}%`}
                    />
                  </div>
                  <div className={styles.demoLabel}>
                    <span className={styles.demoGroup}>Male</span>
                    <span className={styles.demoPct}>{demographics.sex.men.pct}%</span>
                  </div>
                  <div className={styles.demoCount}>{demographics.sex.men.n.toLocaleString()} students</div>
                </div>

                {!showComparison ? (
                  <div className={styles.demoHighlight}>
                    <div className={styles.demoHighlightValue}>{demographics.transferCredits.mean.toFixed(1)}</div>
                    <div className={styles.demoHighlightLabel}>Average Dual Enrollment Credits</div>
                    <div className={styles.demoHighlightRange}>
                      Range: {demographics.transferCredits.min}–{demographics.transferCredits.max} credits
                    </div>
                  </div>
                ) : (
                  <div className={styles.demoHighlight}>
                    <div className={styles.comparisonCreditsGrid}>
                      <div className={styles.comparisonCreditsItem}>
                        <div className={styles.comparisonCreditsLabel}>FASt Students</div>
                        <div className={styles.demoHighlightValue} style={{ fontSize: 'var(--font-size-2xl)' }}>
                          {fastComparison.demographics.transferCredits.fast.mean.toFixed(1)}
                        </div>
                        <div className={styles.demoHighlightRange}>
                          Range: {fastComparison.demographics.transferCredits.fast.min}–{fastComparison.demographics.transferCredits.fast.max}
                        </div>
                      </div>
                      <div className={styles.comparisonCreditsItem}>
                        <div className={styles.comparisonCreditsLabel}>Non-FASt Students</div>
                        <div className={styles.demoHighlightValue} style={{ fontSize: 'var(--font-size-2xl)' }}>
                          {fastComparison.demographics.transferCredits.nonfast.mean.toFixed(1)}
                        </div>
                        <div className={styles.demoHighlightRange}>
                          Range: {fastComparison.demographics.transferCredits.nonfast.min}–{fastComparison.demographics.transferCredits.nonfast.max}
                        </div>
                      </div>
                    </div>
                    <div className={styles.demoHighlightLabel} style={{ marginTop: 'var(--spacing-sm)' }}>
                      Average Dual Enrollment Credits
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Stats */}
      <section ref={statsRef} className={`${styles.stats} stagger-children`}>
        <div className="container">
          <div className={styles.statsGrid}>
            <div className="reveal">
              <StatCard
                label="Sample Size"
                value={keyFindings.totalN.toLocaleString()}
                subtext="CSU first-year students"
                size="large"
              />
            </div>
            <div className="reveal">
              <StatCard
                label={<span>Students with <GlossaryTerm term="FASt Status" definition="First-year Accelerated Status - students who earned 12 or more transferable college credits before enrolling in their first year of college.">FASt Status</GlossaryTerm></span>}
                value={`${keyFindings.fastPct}%`}
                subtext="12+ credits from high school"
                size="large"
                color="accent"
              />
            </div>
            <div className="reveal">
              <StatCard
                label="Study Quality Score"
                value={keyFindings.cfi.toFixed(3)}
                subtext="Excellent statistical fit"
                size="large"
                color="positive"
              />
            </div>
          </div>
          <DataTimestamp />
        </div>
      </section>

      {/* Key Findings - Editorial Layout */}
      <section className={styles.findings}>
        <div className="container">
          <h2 className={styles.findingsTitle}>Key Findings</h2>
          <hr className="section-divider" />
        </div>

        {/* Finding 1 */}
        <article ref={finding1Ref} className={`${styles.findingSection} reveal`}>
          <div className="container">
            <div className={styles.findingContent}>
              <div className={styles.findingNumber} style={{ color: 'var(--color-distress)' }}>
                01
              </div>
              <div className={styles.findingText}>
                <h3>The Stress Connection</h3>
                <p>
                  Students who earned college credits in high school report <strong>higher stress
                  and anxiety</strong> during their first year, which makes it harder for them
                  to adjust to college.
                </p>
                <p className={styles.implication}>
                  Earning credits early can create unexpected pressure that affects how well
                  students settle into college life.
                </p>
              </div>
            </div>
          </div>
        </article>

        {/* Finding 2 */}
        <article ref={finding2Ref} className={`${styles.findingSection} ${styles.findingSectionAlt} reveal`}>
          <div className="container">
            <div className={styles.findingContent}>
              <div className={styles.findingNumber} style={{ color: 'var(--color-engagement)' }}>
                02
              </div>
              <div className={styles.findingText}>
                <h3>Campus Involvement Matters</h3>
                <p>
                  There's a <strong>sweet spot</strong> for dual enrollment credits: students with a
                  moderate amount engage more on campus, while those with lots of credits
                  tend to be less involved. This is called a <GlossaryTerm term="Dose-Response Effect" definition="The relationship between the amount of something (like dual enrollment credits) and its impact. In this study, we examine how different amounts of credits produce different effects on student outcomes.">dose-response effect</GlossaryTerm>.
                </p>
                <p className={styles.implication}>
                  How many credits you earn in high school can shape how connected you feel
                  to your college community.
                </p>
              </div>
            </div>
          </div>
        </article>

        {/* Finding 3 */}
        <article ref={finding3Ref} className={`${styles.findingSection} reveal`}>
          <div className="container">
            <div className={styles.findingContent}>
              <div className={styles.findingNumber} style={{ color: 'var(--color-fast)' }}>
                03
              </div>
              <div className={styles.findingText}>
                <h3>More Credits = Bigger Impact</h3>
                <p>
                  The <strong>amount of credits matters</strong>: having 12 credits affects you
                  differently than having 30+. More credits intensify both the benefits and
                  the challenges.
                </p>
                <p className={styles.implication}>
                  Students with 12 credits need different support than those who completed
                  a full year or more of college in high school.
                </p>
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* Interactive Preview */}
      <section ref={previewRef} className={`${styles.preview} reveal-scale`}>
        <div className="container">
          <h2>How It All Connects</h2>
          <p className={styles.previewText}>
            We studied how earning college credits in high school affects student success
            through two main paths: stress levels and campus involvement. The diagram below
            shows these connections using a <GlossaryTerm term="Mediation Model" definition="A statistical approach that examines how one variable affects another through intermediate pathways. In this study, we test whether dual enrollment credits affect college adjustment indirectly through stress and engagement.">mediation model</GlossaryTerm>, revealing how the number of credits changes the story.
          </p>
          <div className={styles.diagramContainer}>
            <PathwayDiagram />
          </div>
          <div className={styles.actions}>
            <Link to="/pathway" className="button button-primary button-lg">
              Explore the Connections
            </Link>
            <Link to="/dose" className="button button-secondary button-lg">
              See How Credit Amount Matters
            </Link>
          </div>
        </div>
      </section>

      {/* Key Takeaway */}
      <KeyTakeaway>
        <strong>Bottom Line:</strong> Earning college credits in high school affects first-year students in complex ways—increasing stress while potentially boosting campus engagement, with effects intensifying as credit amounts grow.
      </KeyTakeaway>

      {/* Navigation Cards */}
      <section ref={exploreRef} className={`${styles.explore} stagger-children`}>
        <div className="container">
          <h2>Explore the Research</h2>
          <div className={styles.exploreCards}>
            <Link to="/dose" className={`${styles.exploreCard} reveal`}>
              <span className={styles.exploreIcon}>
                <Icon name="chart" size={40} />
              </span>
              <h3>Dose Effects</h3>
              <p>See how credit dose moderates treatment effects with interactive visualizations.</p>
            </Link>
            <Link to="/demographics" className={`${styles.exploreCard} reveal`}>
              <span className={styles.exploreIcon}>
                <Icon name="users" size={40} />
              </span>
              <h3>Demographics</h3>
              <p>Compare findings across race, first-generation, Pell, and other subgroups.</p>
            </Link>
            <Link to="/pathway" className={`${styles.exploreCard} reveal`}>
              <span className={styles.exploreIcon}>
                <Icon name="network" size={40} />
              </span>
              <h3>Pathways</h3>
              <p>Interact with the full SEM mediation diagram and explore each pathway.</p>
            </Link>
            <Link to="/methods" className={`${styles.exploreCard} reveal`}>
              <span className={styles.exploreIcon}>
                <Icon name="microscope" size={40} />
              </span>
              <h3>Methods</h3>
              <p>Technical details on model specification, estimation, and diagnostics.</p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
