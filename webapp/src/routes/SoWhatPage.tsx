import { motion } from "framer-motion";
import KeyTakeaway from "../components/ui/KeyTakeaway";
import { InteractiveSurface } from "../components/ui/InteractiveSurface";
import { useModelData } from "../app/contexts";
import {
  revealVariantsScale,
  containerVariants,
  itemVariants,
  VIEWPORT_CONFIG,
} from "../lib/transitionConfig";

import styles from "./SoWhatPage.module.css";

export default function SoWhatPage() {
  const { paths, fastPercent } = useModelData();

  // Get effect directions from data
  const distressEffect = paths.a1?.estimate ?? 0;
  const engagementEffect = paths.a2?.estimate ?? 0;

  return (
    <div className={styles.page}>
      {/* Hero */}
      <motion.section
        className={styles.hero}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        variants={revealVariantsScale}
      >
        <div className="container">
          <p className={styles.eyebrow}>Research Implications</p>
          <h1 className={styles.title}>So, What Does This Mean?</h1>
          <p className={styles.lead}>
            Early college credits come with hidden trade-offs. Here's what the
            data means for students, advisors, and policy makers—and what to do
            about it.
          </p>
        </div>
      </motion.section>

      {/* Key Insight Summary */}
      <KeyTakeaway icon="💡">
        <strong>The Core Finding:</strong> Earning college credits in high
        school (FASt status) is associated with{" "}
        {distressEffect > 0 ? "higher" : "lower"} stress and{" "}
        {engagementEffect > 0 ? "better" : "reduced"} campus engagement—with
        effects that intensify based on how many credits students earn.
      </KeyTakeaway>

      {/* Stakeholder Implications */}
      <motion.div
        className={styles.stakeholders}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        variants={containerVariants}
      >
        <div className="container">
          <h2 className={styles.sectionTitle}>Who Should Care?</h2>

          <motion.div
            className={styles.stakeholderGrid}
            variants={containerVariants}
          >
            {/* Students */}
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                as="article"
                className={`${styles.stakeholderCard} interactiveSurface`}
              >
                <div className={styles.cardIcon}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3>For Students</h3>
                <p className={styles.cardLead}>
                  Understand how your background shapes your college experience.
                </p>
                <ul className={styles.cardList}>
                  <li>
                    <strong>Recognize the pattern:</strong> If you have 12+
                    credits, you may experience higher stress than peers without
                    transfer credits. This isn't a personal failing—it's a
                    documented trend.
                  </li>
                  <li>
                    <strong>Seek support early:</strong> Connect with counseling
                    services, peer mentors, or advising during your first
                    semester—don't wait.
                  </li>
                  <li>
                    <strong>Build campus connections:</strong> Transfer credits
                    can sometimes make campus feel less relevant. Join student
                    organizations and visit office hours.
                  </li>
                </ul>
              </InteractiveSurface>
            </motion.div>

            {/* Advisors */}
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                as="article"
                className={`${styles.stakeholderCard} interactiveSurface`}
              >
                <div className={styles.cardIcon}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </div>
                <h3>For Advisors & Counselors</h3>
                <p className={styles.cardLead}>
                  Identify which students may need proactive outreach.
                </p>
                <ul className={styles.cardList}>
                  <li>
                    <strong>Screen by credit dose:</strong> Flag students with
                    30+ transfer credits for proactive outreach—they may face
                    more adjustment challenges than those with 12-20 credits.
                  </li>
                  <li>
                    <strong>Tailor interventions:</strong> Prioritize stress
                    management and belonging workshops for FASt students over
                    academic skill-building.
                  </li>
                  <li>
                    <strong>Monitor engagement:</strong> Watch for disengagement
                    signs—students with many credits may feel "above" campus
                    involvement.
                  </li>
                </ul>
              </InteractiveSurface>
            </motion.div>

            {/* Policy Makers */}
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                as="article"
                className={`${styles.stakeholderCard} interactiveSurface`}
              >
                <div className={styles.cardIcon}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                </div>
                <h3>For Policy Makers</h3>
                <p className={styles.cardLead}>
                  Make evidence-based decisions about dual enrollment expansion.
                </p>
                <ul className={styles.cardList}>
                  <li>
                    <strong>Acknowledge trade-offs:</strong> Expanding dual
                    enrollment without support structures may inadvertently
                    increase stress among equity-impacted populations.
                  </li>
                  <li>
                    <strong>Consider credit caps:</strong> Our data suggests
                    diminishing returns and increasing stress above ~36 credits.
                    Evaluate "more is better" assumptions.
                  </li>
                  <li>
                    <strong>Fund transition support:</strong> Pair dual
                    enrollment expansion with first-year experience programs
                    tailored for FASt students.
                  </li>
                </ul>
              </InteractiveSurface>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Actionable Takeaways */}
      <motion.div
        className={styles.actions}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        variants={containerVariants}
      >
        <div className="container">
          <h2 className={styles.sectionTitle}>Actionable Takeaways</h2>

          <motion.div
            className={styles.actionGrid}
            variants={containerVariants}
          >
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                className={`${styles.actionCard} interactiveSurface`}
                hoverLift={4}
              >
                <span className={styles.actionNumber}>1</span>
                <div className={styles.actionContent}>
                  <h4>Early Intervention Matters</h4>
                  <p>
                    The stress pathway is significant. Institutions should
                    implement proactive mental health screening for FASt
                    students during orientation.
                  </p>
                </div>
              </InteractiveSurface>
            </motion.div>

            <motion.div variants={itemVariants}>
              <InteractiveSurface
                className={`${styles.actionCard} interactiveSurface`}
                hoverLift={4}
              >
                <span className={styles.actionNumber}>2</span>
                <div className={styles.actionContent}>
                  <h4>Credit Dose ≠ Preparation</h4>
                  <p>
                    More credits don't equal better adjustment. Students with
                    40+ credits may actually struggle more than those with 15.
                  </p>
                </div>
              </InteractiveSurface>
            </motion.div>

            <motion.div variants={itemVariants}>
              <InteractiveSurface
                className={`${styles.actionCard} interactiveSurface`}
                hoverLift={4}
              >
                <span className={styles.actionNumber}>3</span>
                <div className={styles.actionContent}>
                  <h4>Engagement is Protective</h4>
                  <p>
                    Campus engagement mediates positive outcomes. Programs that
                    foster connection may buffer against the stress pathway.
                  </p>
                </div>
              </InteractiveSurface>
            </motion.div>

            <motion.div variants={itemVariants}>
              <InteractiveSurface
                className={`${styles.actionCard} interactiveSurface`}
                hoverLift={4}
              >
                <span className={styles.actionNumber}>4</span>
                <div className={styles.actionContent}>
                  <h4>Equity Lens Required</h4>
                  <p>
                    {fastPercent}% of our sample had FASt status. Effects may
                    differ for first-generation, Pell-eligible, and racially
                    minoritized students.
                  </p>
                </div>
              </InteractiveSurface>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Limitations */}
      <motion.section
        className={styles.limitations}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        variants={containerVariants}
      >
        <div className="container">
          <h2 className={styles.sectionTitle}>Important Caveats</h2>
          <motion.div
            className={styles.limitationsContent}
            variants={containerVariants}
          >
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                className={`${styles.limitationItem} interactiveSurface`}
                hoverLift={3}
              >
                <h4>Correlation ≠ Causation</h4>
                <p>
                  This is observational research. We used propensity score
                  weighting to reduce selection bias, but cannot definitively
                  prove that dual enrollment causes these outcomes.
                </p>
              </InteractiveSurface>
            </motion.div>
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                className={`${styles.limitationItem} interactiveSurface`}
                hoverLift={3}
              >
                <h4>CSU-Specific Context</h4>
                <p>
                  Our sample comes from California State University students.
                  Results may not generalize to private institutions, community
                  colleges, or other state systems.
                </p>
              </InteractiveSurface>
            </motion.div>
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                className={`${styles.limitationItem} interactiveSurface`}
                hoverLift={3}
              >
                <h4>Self-Reported Data</h4>
                <p>
                  Outcome measures (distress, engagement, adjustment) are based
                  on student surveys, not objective behavioral indicators.
                </p>
              </InteractiveSurface>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Resources */}
      <motion.section
        className={styles.resources}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        variants={revealVariantsScale}
      >
        <div className="container">
          <h2 className={styles.sectionTitle}>Further Reading</h2>
          <ul className={styles.resourceList}>
            <li>
              <a
                href="https://ccrc.tc.columbia.edu/publications/what-we-know-about-dual-enrollment.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                What We Know About Dual Enrollment (CCRC)
              </a>
            </li>
            <li>
              <a
                href="https://nces.ed.gov/programs/coe/indicator/tob"
                target="_blank"
                rel="noopener noreferrer"
              >
                Dual Enrollment Trends (NCES)
              </a>
            </li>
            <li>
              <a
                href="https://www.air.org/resource/brief/dual-enrollment-and-college-readiness"
                target="_blank"
                rel="noopener noreferrer"
              >
                Dual Enrollment and College Readiness (AIR)
              </a>
            </li>
          </ul>
        </div>
      </motion.section>

      {/* Call to Action */}
      <motion.section
        className={styles.cta}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        variants={revealVariantsScale}
      >
        <div className="container">
          <h2>Next: Meet the Researcher</h2>
          <p>
            Learn more about the researcher's background, dissertation focus,
            and the equity motivation behind this study.
          </p>
          <div className={styles.ctaButtons}>
            <InteractiveSurface
              as="link"
              to="/researcher"
              className="button button-primary button-lg interactiveSurface"
            >
              Meet the Researcher
            </InteractiveSurface>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
