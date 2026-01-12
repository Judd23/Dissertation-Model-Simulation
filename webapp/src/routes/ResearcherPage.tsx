import { useTheme } from '../app/contexts';
import { useScrollReveal, useStaggeredReveal } from '../lib/hooks';
import GlossaryTerm from '../components/ui/GlossaryTerm';
import styles from './ResearcherPage.module.css';

export default function ResearcherPage() {
  const { resolvedTheme } = useTheme();
  const sdsuLogo = resolvedTheme === 'dark'
    ? `${import.meta.env.BASE_URL}researcher/SDSUforDark.png`
    : `${import.meta.env.BASE_URL}researcher/SDSUColor.png`;

  // Scroll reveals
  const heroRef = useScrollReveal<HTMLElement>({ threshold: 0.1, id: 'researcher-hero' });
  const factsRef = useStaggeredReveal<HTMLElement>({ id: 'researcher-facts' });
  const blockARef = useScrollReveal<HTMLElement>({ id: 'researcher-blockA' });
  const blockBRef = useScrollReveal<HTMLElement>({ id: 'researcher-blockB' });
  const blockCRef = useScrollReveal<HTMLElement>({ id: 'researcher-blockC' });
  const blockDRef = useScrollReveal<HTMLElement>({ id: 'researcher-blockD' });

  return (
    <div
      className={styles.page}
    >
      <header ref={heroRef} className={styles.hero}>
        <div className={styles.heroGrid}>
          <figure className={styles.heroFigure}>
            <div className={styles.heroMedia}>
              <picture>
                <source
                  srcSet={
                    `${import.meta.env.BASE_URL}researcher/researcher-800.jpg 800w, ` +
                    `${import.meta.env.BASE_URL}researcher/researcher-1600.jpg 1600w, ` +
                    `${import.meta.env.BASE_URL}researcher/researcher-2400.jpg 2400w, ` +
                    `${import.meta.env.BASE_URL}researcher/researcher-3200.jpg 3200w`
                  }
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 680px"
                  type="image/jpeg"
                />
                <img
                  src={`${import.meta.env.BASE_URL}researcher/researcher-1600.jpg`}
                  alt="Jay Johnson, Ed.D. candidate, smiling in professional attire"
                  loading="eager"
                />
              </picture>
            </div>
            <figcaption className={styles.heroCaption}>
              <span className={styles.captionKicker}>Doctoral Candidate</span>
            </figcaption>
          </figure>

          <div className={styles.heroIntro}>
            <div className={styles.institutionPanel}>
              <img
                src={sdsuLogo}
                alt="San Diego State University - College of Education"
                className={styles.institutionLogo}
              />
            </div>
            <p className={styles.kicker}>Researcher</p>
            <h1 className={styles.name}>Jay Johnson</h1>
            <div className={styles.metaLine}>
              <span className={styles.credentials}>M.F.A., Ed.D.-(May '26)</span>
              <span className={styles.dot} aria-hidden="true">•</span>
              <span className={styles.role}>Higher Education Leadership & Policy Scholar</span>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section ref={factsRef} className={`${styles.factsStrip} stagger-children`}>
          <div className={styles.factsInner}>
            <div className={`${styles.fact} reveal-up`} style={{ animationDelay: '0ms' }}>
              <div className={styles.factLabel}>Focus</div>
              <div className={styles.factValue}>
                <GlossaryTerm
                  term="Student Development"
                  definition="The holistic growth of students during their college experience, encompassing cognitive, psychosocial, and identity development as they navigate higher education."
                >
                  Student development
                </GlossaryTerm>{' '}
                | equity | pathways
              </div>
            </div>
            <div className={`${styles.fact} reveal-up`} style={{ animationDelay: '100ms' }}>
              <div className={styles.factLabel}>Methods</div>
              <div className={styles.factValue}>
                <GlossaryTerm
                  term="Structural Equation Modeling"
                  definition="A multivariate statistical technique combining factor analysis and path analysis to test complex relationships between observed and latent variables simultaneously."
                >
                  SEM
                </GlossaryTerm>
                ,{' '}
                <GlossaryTerm
                  term="Causal Inference"
                  definition="Statistical methods that attempt to estimate the effect of one variable on another, going beyond correlation to understand cause-and-effect relationships using techniques like propensity score matching."
                >
                  causal inference
                </GlossaryTerm>
                , process models
              </div>
            </div>
            <div className={`${styles.fact} reveal-up`} style={{ animationDelay: '200ms' }}>
              <div className={styles.factLabel}>Email</div>
              <a href="mailto:jjohnson4039@SDSU.edu" className={styles.factLink}>
                <svg className={styles.emailIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 6l-10 7L2 6" />
                </svg>
                jjohnson4039@SDSU.edu
              </a>
            </div>
          </div>
        </section>

        <section className={styles.grid}>
          <article ref={blockARef} className={`${styles.blockA} reveal-left`} style={{ animationDelay: '0ms' }}>
            <div className={styles.blockHeader}>
              <span className={styles.blockNum}>01</span>
              <h2>Background</h2>
            </div>
            <p>
              I came to research through teaching and advising. Years of watching students navigate
              systems that weren't built for them made me want to understand the patterns underneath.
            </p>
            <p>
              Now I study how early college experiences shape who stays, who thrives, and who feels
              like they belong. The numbers matter, but so do the stories behind them.
            </p>
          </article>

          <aside ref={blockBRef} className={`${styles.blockB} reveal-right`} style={{ animationDelay: '100ms' }}>
            <div className={styles.quotePanel}>
              <blockquote className={styles.pullQuote}>
                <p>
                  "The arts taught me what statistics later confirmed: people make <em>meaning</em> before they make decisions."
                </p>
                <footer className={styles.quoteAttribution}>— On my path from M.F.A. to Ed.D.</footer>
              </blockquote>
              <blockquote className={styles.pullQuoteAlt}>
                <p>
                  "Belonging is made in the quiet minutes, in the ordinary grace of being remembered, of being welcomed, of being regarded as worthy of <em>attention</em>."
                </p>
                <footer className={styles.quoteAttribution}>— Research philosophy</footer>
              </blockquote>
            </div>
          </aside>

          <article ref={blockCRef} className={`${styles.blockC} reveal-left`} style={{ animationDelay: '200ms' }}>
            <div className={styles.blockHeader}>
              <span className={styles.blockNum}>02</span>
              <h2>Research Areas</h2>
            </div>
            <ul className={styles.list}>
              <li>
                <GlossaryTerm
                  term="First-Year Transition"
                  definition="The critical period when students adjust from high school to college, involving academic, social, and personal adaptation that significantly impacts retention and success."
                >
                  First-year transition
                </GlossaryTerm>{' '}
                and developmental adjustment
              </li>
              <li>
                <GlossaryTerm
                  term="Dual Enrollment"
                  definition="Programs allowing high school students to take college courses for credit, accelerating their path to degree completion and potentially easing the transition to higher education."
                >
                  Dual enrollment
                </GlossaryTerm>{' '}
                and accelerated credit pathways
              </li>
              <li>Equity-focused student success research</li>
              <li>
                Quantitative methods with{' '}
                <GlossaryTerm
                  term="Latent Variable Models"
                  definition="Statistical models that include variables that are not directly observed but inferred from other measured variables, commonly used to measure complex constructs like 'belonging' or 'engagement.'"
                >
                  latent-variable models
                </GlossaryTerm>
              </li>
            </ul>
          </article>

          <article ref={blockDRef} className={`${styles.blockD} reveal-right`} style={{ animationDelay: '300ms' }}>
            <div className={styles.blockHeader}>
              <span className={styles.blockNum}>03</span>
              <h2>Connect</h2>
            </div>
            <p>
              For collaboration, speaking, or questions about the work, email me directly.
            </p>
            <a href="mailto:jjohnson4039@SDSU.edu" className={styles.cta}>
              <svg className={styles.ctaIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
              <span>jjohnson4039@SDSU.edu</span>
              <span className={styles.ctaArrow} aria-hidden="true">→</span>
            </a>
          </article>
        </section>
      </main>
    </div>
  );
}
