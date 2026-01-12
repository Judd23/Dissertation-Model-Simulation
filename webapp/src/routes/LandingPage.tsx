import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { InteractiveSurface } from '../components/ui/InteractiveSurface';
import { PAGE_FADE } from '../lib/transitionConfig';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);

  // Dark mode only - always use reverse logo
  const logoSrc = `${import.meta.env.BASE_URL}researcher/sdsu_primary-logo_rgb_horizontal_reverse.png`;

  useEffect(() => {
    // Trigger animations after mount
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsLoaded(true);
      });
    });
  }, []);

  const handleEnter = () => {
    navigate('/home');
  };

  return (
    <motion.div
      className={`${styles.landing} ${isLoaded ? styles.loaded : ''}`}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={PAGE_FADE}
    >
      {/* SEM Pathway Silhouette */}
      <svg
        className={styles.pathwaySilhouette}
        viewBox="0 0 800 400"
        aria-hidden="true"
      >
        {/* Connecting paths */}
        <path
          className={styles.pathwayLine}
          d="M120 200 Q 300 120, 400 120"
        />
        <path
          className={styles.pathwayLine}
          d="M120 200 Q 300 280, 400 280"
        />
        <path
          className={styles.pathwayLine}
          d="M400 120 Q 550 120, 680 200"
        />
        <path
          className={styles.pathwayLine}
          d="M400 280 Q 550 280, 680 200"
        />
        <path
          className={styles.pathwayLine}
          d="M120 200 L 680 200"
        />
        {/* Nodes */}
        <circle className={styles.pathwayNode} cx="120" cy="200" r="24" />
        <circle className={styles.pathwayNode} cx="400" cy="120" r="20" />
        <circle className={styles.pathwayNode} cx="400" cy="280" r="20" />
        <circle className={styles.pathwayNode} cx="680" cy="200" r="24" />
      </svg>

      {/* Main Content */}
      <main className={styles.content}>
        <div className={styles.titleGhost} aria-hidden="true">
          Psychosocial Effects of Accelerated Dual Credit
        </div>
        {/* Kicker */}
        <p className={`${styles.kicker} ${styles.fromTop}`}>Ed.D. Dissertation Research</p>

        {/* Title */}
        <h1 className={`${styles.title} ${styles.fromTop}`}>
            <span className={styles.titleLine}>Psychosocial Effects of</span>
            <span className={styles.titleLine}>
              <span className={styles.titleAccent}>
                Accelerated Dual Credit
              </span>
            </span>
          </h1>

        {/* Subtitle */}
        <p className={`${styles.subtitle} ${styles.fromTop}`}>
          On First-Year Developmental Adjustment
        </p>

        {/* Divider - CENTER (scale) */}
        <div className={styles.divider} />

        {/* Description - FROM BOTTOM */}
        <p className={`${styles.description} ${styles.fromBottom}`}>
          Investigating how <strong>accelerated dual credit</strong> accumulation affects
          psychosocial development among equity-impacted California students.
        </p>

        {/* Author Nameplate */}
        <div className={`${styles.nameplate} ${styles.fromBottom}`}>
          <h2 className={styles.authorName}>Jay Johnson</h2>
          <p className={styles.authorTitle}>Doctoral Candidate</p>
          <div className={styles.institution}>
            <img
              className={styles.logo}
              src={logoSrc}
              alt="San Diego State University"
            />
          </div>
        </div>

        {/* CTA Button */}
        <InteractiveSurface
          as="button"
          className={`${styles.cta} ${styles.fromBottom} interactiveSurface`}
          onClick={handleEnter}
          aria-label="Enter the research visualization"
        >
          <span>Explore the Research</span>
          <svg className={styles.ctaIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </InteractiveSurface>
      </main>

      {/* Entry Button - FROM BOTTOM */}
      <InteractiveSurface
        as="button"
        className={`${styles.scrollIndicator} ${styles.fromBottom} interactiveSurface`}
        onClick={handleEnter}
        aria-label="Begin exploring the research"
      >
        <span className={styles.scrollText}>Begin</span>
        <svg className={styles.scrollChevron} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </InteractiveSurface>
    </motion.div>
  );
}
