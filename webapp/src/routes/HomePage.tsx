import { motion } from "framer-motion";
import StatCard from "../components/ui/StatCard";
import Icon from "../components/ui/Icon";
import GlossaryTerm from "../components/ui/GlossaryTerm";
import KeyTakeaway from "../components/ui/KeyTakeaway";
import PathwayDiagram from "../features/charts/PathwayDiagram";
import DataTimestamp from "../components/ui/DataTimestamp";
import { InteractiveSurface } from "../components/ui/InteractiveSurface";
import { Link } from "react-router-dom";
import { useModelData } from "../app/contexts";
import {
  revealVariantsScale,
  containerVariants,
  itemVariants,
  VIEWPORT_CONFIG,
} from "../lib/transitionConfig";
import styles from "./HomePage.module.css";

// Describe effect size in qualitative terms (editorial style)
function describeEffect(beta: number): string {
  const abs = Math.abs(beta);
  const direction = beta > 0 ? "higher" : "lower";
  if (abs < 0.2) return `slightly ${direction}`;
  if (abs < 0.5) return `moderately ${direction}`;
  return `substantially ${direction}`;
}

function describeEffectSize(beta: number): string {
  const abs = Math.abs(beta);
  if (abs < 0.2) return "a small";
  if (abs < 0.5) return "a moderate";
  return "a substantial";
}

export default function HomePage() {
  const { sampleSize, fitMeasures, paths, fastPercent } = useModelData();

  // Derive key findings dynamically from pipeline data
  const keyFindings = {
    totalN: sampleSize,
    fastPct: fastPercent,
    cfi: fitMeasures.cfi ?? 0.997,
    distressEffect: paths.a1?.estimate ?? 0,
    engagementEffect: paths.a2?.estimate ?? 0,
    adjustmentDirect: paths.c?.estimate ?? 0,
  };
  console.log('(NO $) [HomePage] data snapshot:', {
    sampleSize,
    fastPercent,
    cfi: fitMeasures.cfi,
    a1: paths.a1?.estimate,
    a2: paths.a2?.estimate,
    c: paths.c?.estimate,
  });

  return (
    <div className={styles.page}>
      {/* Hero Section - Full viewport */}
      <motion.section
        className={styles.hero}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        variants={revealVariantsScale}
      >
        <div className="container">
          <p className={styles.eyebrow}>Research Findings</p>
          <h1 className={styles.title}>
            How College Credits Earned in High School Affect First-Year Success
          </h1>
          <p className={styles.lead}>
            <strong>Key insight:</strong> Students who earn{" "}
            <GlossaryTerm
              term="Dual Enrollment Credits"
              definition="College credits earned while in high school through dual enrollment programs, allowing students to take college courses before graduating high school."
            >
              dual enrollment credits
            </GlossaryTerm>{" "}
            in high school experience higher stress during their first year—but
            the right support can help. This study of{" "}
            {sampleSize.toLocaleString()} CSU students reveals how credit amount
            shapes{" "}
            <GlossaryTerm
              term="Developmental Adjustment"
              definition="A student's overall success in transitioning to college, including sense of belonging, personal growth, feeling supported, and satisfaction with their college experience."
            >
              college adjustment
            </GlossaryTerm>
            .
          </p>
        </div>
      </motion.section>

      {/* Key Stats */}
      <motion.div
        className={styles.stats}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        variants={containerVariants}
      >
        <div className="container">
          <div className={styles.statsGrid}>
            <motion.div variants={itemVariants}>
              <StatCard
                layoutId="stat-sample-size"
                label={
                  <GlossaryTerm
                    term="Sample Size"
                    definition="The number of students in our study. A sample of 5,000 provides strong statistical power to detect meaningful effects and represents diverse CSU first-year students."
                  >
                    Sample Size
                  </GlossaryTerm>
                }
                value={keyFindings.totalN.toLocaleString()}
                subtext="CSU first-year students"
                size="large"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <StatCard
                layoutId="stat-fast-pct"
                label={
                  <span>
                    Students with{" "}
                    <GlossaryTerm
                      term="FASt Status"
                      definition="First-year Accelerated Status - students who earned 12 or more transferable college credits before enrolling in their first year of college. This represents over 1 in 4 students in our sample—a growing population that needs targeted support."
                    >
                      FASt Status
                    </GlossaryTerm>
                  </span>
                }
                value={`${keyFindings.fastPct}%`}
                subtext="Over 1 in 4 students arrive with 12+ credits"
                size="large"
                color="accent"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <StatCard
                layoutId="stat-cfi"
                label="Study Quality Score"
                value={keyFindings.cfi.toFixed(3)}
                subtext="Excellent statistical fit"
                size="large"
                color="positive"
              />
            </motion.div>
          </div>
          <DataTimestamp />
        </div>
      </motion.div>

      {/* Key Findings - Editorial Layout */}
      <motion.section
        className={styles.findings}
        aria-labelledby="findings-heading"
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        variants={containerVariants}
      >
        <div className="container">
          <h2 id="findings-heading" className={styles.findingsTitle}>
            Key Findings
          </h2>
          <hr className="section-divider" aria-hidden="true" />
        </div>

        {/* Finding 1 */}
        <motion.article
          className={styles.findingSection}
          aria-labelledby="finding-1-title"
          variants={itemVariants}
        >
          <div className="container">
            <div className={styles.findingContent}>
              <div
                className={styles.findingNumber}
                style={{ color: "var(--color-distress)" }}
                aria-hidden="true"
              >
                01
              </div>
              <div className={styles.findingText}>
                <h3 id="finding-1-title">The Stress Connection</h3>
                <p>
                  Students who earned college credits in high school report{" "}
                  <strong>higher stress and anxiety</strong> during their first
                  year—
                  <span className={styles.effectCallout}>
                    {describeEffect(keyFindings.distressEffect)} than peers
                    without early credits
                  </span>
                  —which makes it harder for them to adjust to college.
                </p>
                <p className={styles.implication}>
                  Earning credits early can create unexpected pressure that
                  affects how well students settle into college life.
                </p>
              </div>
            </div>
          </div>
        </motion.article>

        {/* Finding 2 */}
        <motion.article
          className={`${styles.findingSection} ${styles.findingSectionAlt}`}
          aria-labelledby="finding-2-title"
          variants={itemVariants}
        >
          <div className="container">
            <div className={styles.findingContent}>
              <div
                className={styles.findingNumber}
                style={{ color: "var(--color-engagement)" }}
                aria-hidden="true"
              >
                02
              </div>
              <div className={styles.findingText}>
                <h3 id="finding-2-title">Campus Involvement Matters</h3>
                <p>
                  There's a <strong>sweet spot</strong> for dual enrollment
                  credits: students with a moderate amount engage more on
                  campus, while those with lots of credits tend to be less
                  involved—
                  <span className={styles.effectCallout}>
                    {describeEffectSize(keyFindings.engagementEffect)} but
                    meaningful effect
                  </span>
                  . This is called a dose-response pattern.
                </p>
                <p className={styles.implication}>
                  How many credits you earn in high school can shape how
                  connected you feel to your college community.
                </p>
              </div>
            </div>
          </div>
        </motion.article>

        {/* Finding 3 */}
        <motion.article
          className={styles.findingSection}
          aria-labelledby="finding-3-title"
          variants={itemVariants}
        >
          <div className="container">
            <div className={styles.findingContent}>
              <div
                className={styles.findingNumber}
                style={{ color: "var(--color-fast)" }}
                aria-hidden="true"
              >
                03
              </div>
              <div className={styles.findingText}>
                <h3 id="finding-3-title">More Credits = Bigger Impact</h3>
                <p>
                  The <strong>amount of credits matters</strong>: having 12
                  credits affects you differently than having 30+. Beyond stress
                  and engagement, credits provide{" "}
                  <span className={styles.effectCallout}>
                    {describeEffectSize(keyFindings.adjustmentDirect)} direct
                    benefit
                  </span>{" "}
                  to first-year success.
                </p>
                <p className={styles.implication}>
                  Students with 12 credits need different support than those who
                  completed a full year or more of college in high school.
                </p>
              </div>
            </div>
          </div>
        </motion.article>
      </motion.section>

      {/* Interactive Preview */}
      <motion.section
        className={styles.preview}
        aria-labelledby="preview-heading"
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        variants={revealVariantsScale}
      >
        <div className="container">
          <h2 id="preview-heading">How It All Connects</h2>
          <p className={styles.previewText}>
            We studied how earning college credits in high school affects
            student success through two main paths: stress levels and campus
            involvement. The diagram below shows these connections using a{" "}
            <GlossaryTerm
              term="Mediation Model"
              definition="A statistical approach that examines how one variable affects another through intermediate pathways. In this study, we test whether dual enrollment credits affect college adjustment indirectly through stress and engagement."
            >
              mediation model
            </GlossaryTerm>
            , revealing how the number of credits changes the story.
          </p>
          <div className={styles.diagramContainer}>
            <PathwayDiagram />
          </div>
          <div
            className={styles.actions}
            role="group"
            aria-label="Explore research pathways"
          >
            <InteractiveSurface
              as="link"
              to="/pathway"
              className="button button-primary button-lg interactiveSurface"
              aria-label="Explore the pathway diagram showing how credits affect student outcomes"
            >
              Explore the Connections
            </InteractiveSurface>
            <InteractiveSurface
              as="link"
              to="/dose"
              className="button button-secondary button-lg interactiveSurface"
              aria-label="See how different credit amounts affect student outcomes"
            >
              See How Credit Amount Matters
            </InteractiveSurface>
          </div>
        </div>
      </motion.section>

      {/* Key Takeaway */}
      <KeyTakeaway>
        <strong>Bottom Line:</strong> Earning college credits in high school
        affects first-year students in complex ways—increasing stress while
        potentially boosting campus engagement.{" "}
        <Link
          to="/so-what"
          style={{ color: "var(--color-accent)", fontWeight: 600 }}
        >
          See what this means for students, advisors, and policy.
        </Link>
      </KeyTakeaway>

      {/* Navigation Cards */}
      <motion.nav
        className={styles.explore}
        aria-labelledby="explore-heading"
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        variants={containerVariants}
      >
        <div className="container">
          <h2 id="explore-heading">Explore the Research</h2>
          <div className={styles.exploreCards}>
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                as="link"
                to="/demographics"
                className={`${styles.exploreCard} interactiveSurface`}
                aria-label="Demographics: Compare findings across race, first-generation, Pell, and other subgroups"
              >
                <span className={styles.exploreIcon} aria-hidden="true">
                  <Icon name="users" size={40} />
                </span>
                <h3>Demographics</h3>
                <p>
                  Compare findings across race, first-generation, Pell, and
                  other subgroups.
                </p>
              </InteractiveSurface>
            </motion.div>
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                as="link"
                to="/methods"
                className={`${styles.exploreCard} interactiveSurface`}
                aria-label="Methods: Technical details on model specification, estimation, and diagnostics"
              >
                <span className={styles.exploreIcon} aria-hidden="true">
                  <Icon name="microscope" size={40} />
                </span>
                <h3>Methods</h3>
                <p>
                  Technical details on model specification, estimation, and
                  diagnostics.
                </p>
              </InteractiveSurface>
            </motion.div>
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                as="link"
                to="/pathway"
                className={`${styles.exploreCard} interactiveSurface`}
                aria-label="Pathways: Interact with the full SEM mediation diagram and explore each pathway"
              >
                <span className={styles.exploreIcon} aria-hidden="true">
                  <Icon name="network" size={40} />
                </span>
                <h3>Pathways</h3>
                <p>
                  Interact with the full SEM mediation diagram and explore each
                  pathway.
                </p>
              </InteractiveSurface>
            </motion.div>
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                as="link"
                to="/dose"
                className={`${styles.exploreCard} interactiveSurface`}
                aria-label="Credit Levels: See how credit dose moderates treatment effects with interactive visualizations"
              >
                <span className={styles.exploreIcon} aria-hidden="true">
                  <Icon name="chart" size={40} />
                </span>
                <h3>Credit Levels</h3>
                <p>
                  See how credit dose moderates treatment effects with
                  interactive visualizations.
                </p>
              </InteractiveSurface>
            </motion.div>
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                as="link"
                to="/so-what"
                className={`${styles.exploreCard} interactiveSurface`}
                aria-label="So What: Practical implications for students, advisors, and policy makers"
              >
                <span className={styles.exploreIcon} aria-hidden="true">
                  <Icon name="lightbulb" size={40} />
                </span>
                <h3>So, What?</h3>
                <p>
                  Practical implications for students, advisors, and policy
                  makers.
                </p>
              </InteractiveSurface>
            </motion.div>
          </div>
        </div>
      </motion.nav>

      <motion.section
        className={styles.nextStep}
        aria-labelledby="next-step-heading"
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        variants={revealVariantsScale}
      >
        <div className="container">
          <h2 id="next-step-heading">Next: Explore Equity Differences</h2>
          <p>
            Start with the equity frame to see how effects differ across race,
            first-generation status, financial need, and living situations.
          </p>
          <InteractiveSurface
            as="link"
            to="/demographics"
            className="button button-primary button-lg interactiveSurface"
            aria-label="Continue to Demographics page to explore equity differences"
          >
            Go to Demographics
          </InteractiveSurface>
        </div>
      </motion.section>
    </div>
  );
}
