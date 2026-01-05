import { useNavigate } from 'react-router-dom';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.landing}>
      <div className={styles.background}>
        <div className={styles.gradient} />
      </div>
      
      <main className={styles.content}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>
            Dual Credit & Developmental Adjustment
          </h1>
          <div className={styles.titleDivider} />
          <p className={styles.subtitle}>A Conditional Process Structural Equation Model Analysis</p>
          <p className={styles.longTitle}>
            The Psychosocial Effects of Dual Credit Accumulation on Developmental Adjustment Among Equity Impacted Student Populations in California
          </p>
        </div>

        <div className={styles.authorBlock}>
          <p className={styles.by}>by</p>
          <p className={styles.author}>Jay Johnson</p>
          <p className={styles.affiliation}>San Diego State University</p>
          <p className={styles.degree}>Doctoral Candidate</p>
          <div className={styles.logoWrap} aria-hidden="true">
            <img
              className={styles.logo}
              src={`${import.meta.env.BASE_URL}researcher/sdsu_primary-logo_rgb_horizontal_reverse.png`}
              alt=""
              loading="lazy"
            />
          </div>
        </div>

        <button
          className={styles.enterButton}
          onClick={() => navigate('/home')}
        >
          Explore the Findings
        </button>

        <footer className={styles.footer}>
          <p>Ed.D. Dissertation Research · 2026</p>
        </footer>

        <button
          className={styles.scrollIndicator}
          onClick={() => navigate('/home')}
          aria-label="Scroll to explore the research"
        >
          <span className={styles.scrollText}>Scroll to explore</span>
          <svg
            className={styles.scrollChevron}
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </main>
    </div>
  );
}
