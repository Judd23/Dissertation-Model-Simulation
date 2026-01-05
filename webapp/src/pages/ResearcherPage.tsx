import styles from './ResearcherPage.module.css';

export default function ResearcherPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
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
                  alt="Jay Johnson"
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
                src={`${import.meta.env.BASE_URL}researcher/sdsu-logo.png`}
                alt="SDSU College of Education - Community College Leadership Ed.D"
                className={styles.institutionLogo}
              />
            </div>
            <div className={styles.kicker}>Researcher</div>
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
        <section className={styles.factsStrip}>
          <div className={styles.factsInner}>
            <div className={styles.fact}>
              <div className={styles.factLabel}>Focus</div>
              <div className={styles.factValue}>Student development | equity | pathways</div>
            </div>
            <div className={styles.fact}>
              <div className={styles.factLabel}>Methods</div>
              <div className={styles.factValue}>SEM, causal inference, process models</div>
            </div>
            <div className={styles.fact}>
              <div className={styles.factLabel}>Email</div>
              <a href="mailto:jjohnson4039@SDSU.edu" className={styles.factLink}>
                jjohnson4039@SDSU.edu
              </a>
            </div>
          </div>
        </section>

        <section className={styles.grid}>
          <article className={styles.blockA}>
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

          <aside className={styles.blockB}>
            <div className={styles.quotePanel}>
              <blockquote className={styles.pullQuote}>
                <p>
                  “The arts taught me what statistics later confirmed: people make meaning before they make decisions.”
                </p>
              </blockquote>
              <blockquote className={styles.pullQuoteAlt}>
                <p>
                  “Belonging is made in the quiet minutes, in the ordinary grace of being remembered, of being welcomed, of being regarded as worthy of attention.”
                </p>
              </blockquote>
            </div>
          </aside>

          <article className={styles.blockC}>
            <div className={styles.blockHeader}>
              <span className={styles.blockNum}>02</span>
              <h2>Research Areas</h2>
            </div>
            <ul className={styles.list}>
              <li>First-year transition and developmental adjustment</li>
              <li>Dual enrollment and accelerated credit pathways</li>
              <li>Equity-focused student success research</li>
              <li>Quantitative methods with latent-variable models</li>
            </ul>
          </article>

          <article className={styles.blockD}>
            <div className={styles.blockHeader}>
              <span className={styles.blockNum}>03</span>
              <h2>Connect</h2>
            </div>
            <p>
              For collaboration, speaking, or questions about the work, email me directly.
            </p>
            <a href="mailto:jjohnson4039@SDSU.edu" className={styles.cta}>
              <span>jjohnson4039@SDSU.edu</span>
              <span className={styles.ctaArrow} aria-hidden="true">→</span>
            </a>
          </article>
        </section>
      </main>
    </div>
  );
}
