import { Link } from 'react-router-dom';
import KeyTakeaway from '../components/ui/KeyTakeaway';
import { useScrollReveal, useStaggeredReveal } from '../hooks/useScrollReveal';
import { useModelData } from '../context/ModelDataContext';
import styles from './SoWhatPage.module.css';

export default function SoWhatPage() {
  const { paths, fastPercent } = useModelData();

  const heroRef = useScrollReveal<HTMLElement>({ threshold: 0.2 });
  const stakeholderRef = useStaggeredReveal<HTMLElement>();
  const actionRef = useStaggeredReveal<HTMLElement>();
  const limitRef = useScrollReveal<HTMLElement>();

  // Get effect directions from data
  const distressEffect = paths.a1?.estimate ?? 0;
  const engagementEffect = paths.a2?.estimate ?? 0;

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section ref={heroRef} className={`${styles.hero} reveal`}>
        <div className="container">
          <span className={styles.eyebrow}>Research Implications</span>
          <h1 className={styles.title}>So, What Does This Mean?</h1>
          <p className={styles.lead}>
            Research findings are only valuable if they can be translated into action.
            Here's what our study means for students, advisors, and policy makers.
          </p>
        </div>
      </section>

      {/* Key Insight Summary */}
      <KeyTakeaway>
        <strong>The Core Finding:</strong> Earning college credits in high school (FASt status) is associated with{' '}
        {distressEffect > 0 ? 'higher' : 'lower'} stress and{' '}
        {engagementEffect > 0 ? 'better' : 'reduced'} campus engagement—with effects that intensify
        based on how many credits students earn.
      </KeyTakeaway>

      {/* Stakeholder Implications */}
      <section ref={stakeholderRef} className={`${styles.stakeholders} stagger-children`}>
        <div className="container">
          <h2 className={`${styles.sectionTitle} reveal`}>Who Should Care?</h2>

          <div className={styles.stakeholderGrid}>
            {/* Students */}
            <article className={`${styles.stakeholderCard} reveal`}>
              <div className={styles.cardIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  <strong>If you have 12+ credits:</strong> You may experience higher stress than peers without
                  transfer credits. This isn't a personal failing—it's a documented pattern.
                </li>
                <li>
                  <strong>Seek support early:</strong> Don't wait until you're overwhelmed. Connect with
                  counseling services, peer mentors, or advising during your first semester.
                </li>
                <li>
                  <strong>Build campus connections:</strong> Transfer credits can sometimes make
                  campus feel less relevant. Actively engage with student organizations and faculty.
                </li>
              </ul>
            </article>

            {/* Advisors */}
            <article className={`${styles.stakeholderCard} reveal`}>
              <div className={styles.cardIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  <strong>Screen by credit dose:</strong> Students with 30+ transfer credits may be at
                  higher risk for adjustment challenges than those with 12-20 credits.
                </li>
                <li>
                  <strong>Tailor interventions:</strong> FASt students may benefit more from stress management
                  and belonging interventions than from academic skill-building.
                </li>
                <li>
                  <strong>Monitor engagement:</strong> Watch for signs of disengagement—students
                  with many credits may feel "above" campus involvement.
                </li>
              </ul>
            </article>

            {/* Policy Makers */}
            <article className={`${styles.stakeholderCard} reveal`}>
              <div className={styles.cardIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  <strong>Dual enrollment isn't neutral:</strong> Expanding access without support
                  structures may inadvertently increase stress among equity-impacted populations.
                </li>
                <li>
                  <strong>Consider credit caps:</strong> Our data suggests diminishing returns and
                  increasing stress above ~36 credits. "More" isn't always "better."
                </li>
                <li>
                  <strong>Fund transition support:</strong> Pair dual enrollment expansion with
                  first-year experience programs tailored for FASt students.
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* Actionable Takeaways */}
      <section ref={actionRef} className={`${styles.actions} stagger-children`}>
        <div className="container">
          <h2 className={`${styles.sectionTitle} reveal`}>Actionable Takeaways</h2>

          <div className={styles.actionGrid}>
            <div className={`${styles.actionCard} reveal`}>
              <span className={styles.actionNumber}>1</span>
              <div className={styles.actionContent}>
                <h4>Early Intervention Matters</h4>
                <p>
                  The stress pathway is significant. Institutions should implement proactive
                  mental health screening for FASt students during orientation.
                </p>
              </div>
            </div>

            <div className={`${styles.actionCard} reveal`}>
              <span className={styles.actionNumber}>2</span>
              <div className={styles.actionContent}>
                <h4>Credit Dose ≠ Preparation</h4>
                <p>
                  More credits don't equal better adjustment. Students with 40+ credits
                  may actually struggle more than those with 15.
                </p>
              </div>
            </div>

            <div className={`${styles.actionCard} reveal`}>
              <span className={styles.actionNumber}>3</span>
              <div className={styles.actionContent}>
                <h4>Engagement is Protective</h4>
                <p>
                  Campus engagement mediates positive outcomes. Programs that foster
                  connection may buffer against the stress pathway.
                </p>
              </div>
            </div>

            <div className={`${styles.actionCard} reveal`}>
              <span className={styles.actionNumber}>4</span>
              <div className={styles.actionContent}>
                <h4>Equity Lens Required</h4>
                <p>
                  {fastPercent}% of our sample had FASt status. Effects may differ for
                  first-generation, Pell-eligible, and racially minoritized students.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Limitations */}
      <section ref={limitRef} className={`${styles.limitations} reveal`}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Important Caveats</h2>
          <div className={styles.limitationsContent}>
            <div className={styles.limitationItem}>
              <h4>Correlation ≠ Causation</h4>
              <p>
                This is observational research. We used propensity score weighting to reduce
                selection bias, but cannot definitively prove that dual enrollment causes these outcomes.
              </p>
            </div>
            <div className={styles.limitationItem}>
              <h4>CSU-Specific Context</h4>
              <p>
                Our sample comes from California State University students. Results may not
                generalize to private institutions, community colleges, or other state systems.
              </p>
            </div>
            <div className={styles.limitationItem}>
              <h4>Self-Reported Data</h4>
              <p>
                Outcome measures (distress, engagement, adjustment) are based on student surveys,
                not objective behavioral indicators.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className={styles.cta}>
        <div className="container">
          <h2>Ready to Explore the Data?</h2>
          <p>
            Dive deeper into the statistical model, examine effects by demographic groups,
            or see how credit dose moderates the findings.
          </p>
          <div className={styles.ctaButtons}>
            <Link to="/pathway" className="button button-primary button-lg">
              Explore the Model
            </Link>
            <Link to="/dose" className="button button-secondary button-lg">
              See Dose Effects
            </Link>
            <Link to="/demographics" className="button button-secondary button-lg">
              View by Demographics
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
