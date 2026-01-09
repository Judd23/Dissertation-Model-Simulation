import { useTheme } from '../context/ThemeContext';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LandingPage.module.css';

// Generate tiny dust particles with gentle floating motion
function generateDustParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    // Random starting position across the viewport
    left: `${Math.random() * 100}%`,
    top: `${20 + Math.random() * 70}%`, // Keep in middle 70% of screen
    // Tiny size: 1.5-4px
    size: 1.5 + Math.random() * 2.5,
    // Staggered start times
    delay: Math.random() * 12,
    // Varied durations
    duration: 12 + Math.random() * 15,
    // More visible opacity: 0.15-0.4
    opacity: 0.15 + Math.random() * 0.25,
    // Muted colors
    color: [
      'rgba(100, 100, 120, 0.6)',
      'rgba(80, 90, 110, 0.5)',
      'rgba(30, 58, 95, 0.4)',
    ][Math.floor(Math.random() * 3)],
  }));
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);

  const logoSrc = resolvedTheme === 'light'
    ? `${import.meta.env.BASE_URL}researcher/SDSUPrmary Bar.png`
    : `${import.meta.env.BASE_URL}researcher/sdsu_primary-logo_rgb_horizontal_reverse.png`;

  // Generate dust particles once - reduced for performance
  const dustParticles = useMemo(() => generateDustParticles(30), []);

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
    <div className={`${styles.landing} ${isLoaded ? styles.loaded : ''} page-fade`}>
      {/* Tiny Dust Particles */}
      <div className={styles.particles} aria-hidden="true">
        {dustParticles.map((p) => (
          <div
            key={p.id}
            className={styles.particle}
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
              ['--float-duration' as string]: `${p.duration}s`,
              ['--dust-opacity' as string]: p.opacity,
            }}
          />
        ))}
      </div>

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
          Dual Credit Outcomes &amp; First Year Achievement
        </div>
        {/* Kicker */}
        <p className={`${styles.kicker} ${styles.fromTop}`}>Ed.D. Dissertation Research</p>

        {/* Title */}
        <h1 className={`${styles.title} ${styles.fromTop}`}>
            <span className={styles.titleLine}>Dual Credit Outcomes</span>
            <span className={styles.titleLine}>
              <span className={styles.titleAccent}>
                &amp; First Year Achievement
              </span>
            </span>
          </h1>

        {/* Subtitle */}
        <p className={`${styles.subtitle} ${styles.fromTop}`}>
          A Conditional Process SEM Analysis
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
        <button
          className={`${styles.cta} ${styles.fromBottom}`}
          onClick={handleEnter}
          aria-label="Enter the research visualization"
        >
          <span>Explore the Research</span>
          <svg className={styles.ctaIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </main>

      {/* Scroll Indicator - FROM BOTTOM */}
      <button
        className={`${styles.scrollIndicator} ${styles.fromBottom}`}
        onClick={handleEnter}
        aria-label="Scroll to explore"
      >
        <span className={styles.scrollText}>Scroll to explore</span>
        <svg className={styles.scrollChevron} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  );
}
