import StatCard from '../components/ui/StatCard';
import Icon from '../components/ui/Icon';
import GlossaryTerm from '../components/ui/GlossaryTerm';
import KeyTakeaway from '../components/ui/KeyTakeaway';
import PathwayDiagram from '../components/charts/PathwayDiagram';
import DataTimestamp from '../components/ui/DataTimestamp';
import { Link } from 'react-router-dom';
import { useModelData } from '../context/ModelDataContext';
import useParallax from '../hooks/useParallax';
import styles from './HomePage.module.css';

export default function HomePage() {
  const { sampleSize, fitMeasures, paths, fastPercent } = useModelData();

  const parallaxOffset = useParallax({ speed: 0.1, max: 32 });

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
    <div className={`${styles.page} page-fade`}>
      {/* Hero Section - Full viewport */}
      <section
        className={styles.hero}
        style={{ ['--parallax-offset' as string]: `${parallaxOffset}px` }}
      >
        <div className="container">
          <p className={styles.eyebrow}>
            Research Findings
          </p>
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


      {/* Key Stats */}
      <div className={styles.stats}>
        <div className="container">
          <div className={styles.statsGrid}>
            <StatCard
              label="Sample Size"
              value={keyFindings.totalN.toLocaleString()}
              subtext="CSU first-year students"
              size="large"
            />
            <StatCard
              label={<span>Students with <GlossaryTerm term="FASt Status" definition="First-year Accelerated Status - students who earned 12 or more transferable college credits before enrolling in their first year of college.">FASt Status</GlossaryTerm></span>}
              value={`${keyFindings.fastPct}%`}
              subtext="12+ credits from high school"
              size="large"
              color="accent"
            />
            <StatCard
              label="Study Quality Score"
              value={keyFindings.cfi.toFixed(3)}
              subtext="Excellent statistical fit"
              size="large"
              color="positive"
            />
          </div>
          <DataTimestamp />
        </div>
      </div>

      {/* Key Findings - Editorial Layout */}
      <section className={styles.findings}>
        <div className="container">
          <h2 className={styles.findingsTitle}>Key Findings</h2>
          <hr className="section-divider" />
        </div>

        {/* Finding 1 */}
        <article className={styles.findingSection}>
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
        <article className={`${styles.findingSection} ${styles.findingSectionAlt}`}>
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
        <article className={styles.findingSection}>
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
      <section className={styles.preview}>
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
        <strong>Bottom Line:</strong> Earning college credits in high school affects first-year students in complex ways—increasing stress while potentially boosting campus engagement.{' '}
        <Link to="/so-what" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
          See what this means for students, advisors, and policy.
        </Link>
      </KeyTakeaway>

      {/* Navigation Cards */}
      <div className={styles.explore}>
        <div className="container">
          <h2>Explore the Research</h2>
          <div className={styles.exploreCards}>
            <Link to="/demographics" className={styles.exploreCard}>
              <span className={styles.exploreIcon}>
                <Icon name="users" size={40} />
              </span>
              <h3>Demographics</h3>
              <p>Compare findings across race, first-generation, Pell, and other subgroups.</p>
            </Link>
            <Link to="/methods" className={styles.exploreCard}>
              <span className={styles.exploreIcon}>
                <Icon name="microscope" size={40} />
              </span>
              <h3>Methods</h3>
              <p>Technical details on model specification, estimation, and diagnostics.</p>
            </Link>
            <Link to="/pathway" className={styles.exploreCard}>
              <span className={styles.exploreIcon}>
                <Icon name="network" size={40} />
              </span>
              <h3>Pathways</h3>
              <p>Interact with the full SEM mediation diagram and explore each pathway.</p>
            </Link>
            <Link to="/dose" className={styles.exploreCard}>
              <span className={styles.exploreIcon}>
                <Icon name="chart" size={40} />
              </span>
              <h3>Credit Levels</h3>
              <p>See how credit dose moderates treatment effects with interactive visualizations.</p>
            </Link>
            <Link to="/so-what" className={styles.exploreCard}>
              <span className={styles.exploreIcon}>
                <Icon name="lightbulb" size={40} />
              </span>
              <h3>So, What?</h3>
              <p>Practical implications for students, advisors, and policy makers.</p>
            </Link>
          </div>
        </div>
      </div>

      <section className={styles.nextStep}>
        <div className="container">
          <h2>Next: Explore Equity Differences</h2>
          <p>
            Start with the equity frame to see how effects differ across race, first-generation status,
            financial need, and living situations.
          </p>
          <Link to="/demographics" className="button button-primary button-lg">
            Go to Demographics
          </Link>
        </div>
      </section>
    </div>
  );
}
