import { Link } from 'react-router-dom';
import StatCard from '../components/ui/StatCard';
import PathwayDiagram from '../components/charts/PathwayDiagram';
import styles from './HomePage.module.css';

// Inline data for initial display - will be replaced with JSON import
const keyFindings = {
  totalN: 5000,
  fastPct: 27,
  cfi: 0.997,
  distressEffect: 0.127,
  engagementEffect: -0.010,
  adjustmentDirect: 0.041,
};

export default function HomePage() {
  return (
    <div className={styles.page}>
      <div className="container">
        {/* Hero Section */}
        <section className={styles.hero}>
          <h1 className={styles.title}>
            How College Credits Earned in High School Affect First-Year Success
          </h1>
          <p className={styles.lead}>
            Explore what happens when students enter college with transfer credits from
            high school. We studied California State University students to understand
            how earning credits early affects their stress levels, campus involvement,
            and overall adjustment to college life.
          </p>
        </section>

        {/* Key Stats */}
        <section className={styles.stats}>
          <StatCard
            label="Sample Size"
            value={keyFindings.totalN.toLocaleString()}
            subtext="CSU first-year students"
            size="large"
          />
          <StatCard
            label="Students with Transfer Credits"
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
        </section>

        {/* Key Finding Cards */}
        <section className={styles.findings}>
          <h2>Key Findings</h2>
          <div className={styles.findingCards}>
            <article className={styles.findingCard}>
              <div className={styles.findingNumber} style={{ color: 'var(--color-distress)' }}>
                <span>01</span>
              </div>
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
            </article>

            <article className={styles.findingCard}>
              <div className={styles.findingNumber} style={{ color: 'var(--color-engagement)' }}>
                <span>02</span>
              </div>
              <h3>Campus Involvement Matters</h3>
              <p>
                There's a <strong>sweet spot</strong> for transfer credits: students with a
                moderate amount engage more on campus, while those with lots of credits
                tend to be less involved.
              </p>
              <p className={styles.implication}>
                How many credits you earn in high school can shape how connected you feel
                to your college community.
              </p>
            </article>

            <article className={styles.findingCard}>
              <div className={styles.findingNumber} style={{ color: 'var(--color-fast)' }}>
                <span>03</span>
              </div>
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
            </article>
          </div>
        </section>

        {/* Interactive Preview */}
        <section className={styles.preview}>
          <h2>How It All Connects</h2>
          <p className={styles.previewText}>
            We studied how earning college credits in high school affects student success
            through two main paths: stress levels and campus involvement. The diagram below
            shows these connections and how the number of credits changes the story.
          </p>
          <div className={styles.diagramContainer}>
            <PathwayDiagram />
          </div>
          <div className={styles.actions}>
            <Link to="/pathway" className={styles.primaryButton}>
              Explore the Connections
            </Link>
            <Link to="/dose" className={styles.secondaryButton}>
              See How Credit Amount Matters
            </Link>
          </div>
        </section>

        {/* Navigation Cards */}
        <section className={styles.explore}>
          <h2>Explore the Research</h2>
          <div className={styles.exploreCards}>
            <Link to="/dose" className={styles.exploreCard}>
              <h3>Dose Effects</h3>
              <p>See how credit dose moderates treatment effects with interactive visualizations.</p>
            </Link>
            <Link to="/demographics" className={styles.exploreCard}>
              <h3>Demographics</h3>
              <p>Compare findings across race, first-generation, Pell, and other subgroups.</p>
            </Link>
            <Link to="/pathway" className={styles.exploreCard}>
              <h3>Pathways</h3>
              <p>Interact with the full SEM mediation diagram and explore each pathway.</p>
            </Link>
            <Link to="/methods" className={styles.exploreCard}>
              <h3>Methods</h3>
              <p>Technical details on model specification, estimation, and diagnostics.</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
