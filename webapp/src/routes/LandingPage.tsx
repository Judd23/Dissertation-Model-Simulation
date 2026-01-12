import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'motion/react';
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

  const containerVariants: Variants = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: 0.14,
          delayChildren: 0.08,
        },
      },
    }),
    []
  );

  const springSoft = useMemo(
    () => ({
      type: 'spring' as const,
      stiffness: 70,
      damping: 22,
      mass: 1.1,
    }),
    []
  );

  const fromTop = useMemo(
    () => ({
      hidden: (enterY: number = -120) => ({ opacity: 0, y: enterY }),
      visible: {
        opacity: 1,
        y: 0,
        transition: springSoft,
      },
    }),
    [springSoft]
  );

  const fromBottom = useMemo(
    () => ({
      hidden: (enterY: number = 120) => ({ opacity: 0, y: enterY }),
      visible: {
        opacity: 1,
        y: 0,
        transition: springSoft,
      },
    }),
    [springSoft]
  );

  const dividerVariants: Variants = useMemo(
    () => ({
      hidden: { opacity: 0, scaleX: 0.45 },
      visible: {
        opacity: 1,
        scaleX: 1,
        transition: {
          type: 'spring',
          stiffness: 60,
          damping: 20,
          mass: 1.0,
        },
      },
    }),
    []
  );

  const lineDraw: Variants = useMemo(
    () => ({
      hidden: { pathLength: 0, opacity: 0 },
      visible: {
        pathLength: 1,
        opacity: 0.32,
        transition: {
          duration: 2.4,
          ease: [0.22, 1, 0.36, 1],
        },
      },
    }),
    []
  );

  const nodePop: Variants = useMemo(
    () => ({
      hidden: { opacity: 0, scale: 0.2 },
      visible: {
        opacity: 0.45,
        scale: 1,
        transition: {
          type: 'spring',
          stiffness: 220,
          damping: 18,
          mass: 0.7,
        },
      },
    }),
    []
  );

  return (
    <motion.div
      className={styles.landing}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={PAGE_FADE}
    >
      {/* SEM Pathway Silhouette */}
      <motion.svg
        className={styles.pathwaySilhouette}
        viewBox="0 0 800 400"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={isLoaded ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
      >
        {/* Connecting paths */}
        <motion.path
          className={styles.pathwayLine}
          d="M120 200 Q 300 120, 400 120"
          variants={lineDraw}
          initial="hidden"
          animate={isLoaded ? 'visible' : 'hidden'}
          transition={{ delay: 0.55 }}
        />
        <motion.path
          className={styles.pathwayLine}
          d="M120 200 Q 300 280, 400 280"
          variants={lineDraw}
          initial="hidden"
          animate={isLoaded ? 'visible' : 'hidden'}
          transition={{ delay: 0.70 }}
        />
        <motion.path
          className={styles.pathwayLine}
          d="M400 120 Q 550 120, 680 200"
          variants={lineDraw}
          initial="hidden"
          animate={isLoaded ? 'visible' : 'hidden'}
          transition={{ delay: 0.85 }}
        />
        <motion.path
          className={styles.pathwayLine}
          d="M400 280 Q 550 280, 680 200"
          variants={lineDraw}
          initial="hidden"
          animate={isLoaded ? 'visible' : 'hidden'}
          transition={{ delay: 1.00 }}
        />
        <motion.path
          className={styles.pathwayLine}
          d="M120 200 L 680 200"
          variants={lineDraw}
          initial="hidden"
          animate={isLoaded ? 'visible' : 'hidden'}
          transition={{ delay: 1.15 }}
        />

        {/* Nodes */}
        <motion.circle
          className={styles.pathwayNode}
          cx="120"
          cy="200"
          r="24"
          variants={nodePop}
          initial="hidden"
          animate={isLoaded ? 'visible' : 'hidden'}
          transition={{ delay: 1.20 }}
        />
        <motion.circle
          className={styles.pathwayNode}
          cx="400"
          cy="120"
          r="20"
          variants={nodePop}
          initial="hidden"
          animate={isLoaded ? 'visible' : 'hidden'}
          transition={{ delay: 1.34 }}
        />
        <motion.circle
          className={styles.pathwayNode}
          cx="400"
          cy="280"
          r="20"
          variants={nodePop}
          initial="hidden"
          animate={isLoaded ? 'visible' : 'hidden'}
          transition={{ delay: 1.48 }}
        />
        <motion.circle
          className={styles.pathwayNode}
          cx="680"
          cy="200"
          r="24"
          variants={nodePop}
          initial="hidden"
          animate={isLoaded ? 'visible' : 'hidden'}
          transition={{ delay: 1.62 }}
        />
      </motion.svg>

      {/* Main Content */}
      <motion.main
        className={styles.content}
        variants={containerVariants}
        initial="hidden"
        animate={isLoaded ? 'visible' : 'hidden'}
      >
        <div className={styles.titleGhost} aria-hidden="true">
          Psychosocial Effects of Accelerated Dual Credit
        </div>
        {/* Kicker */}
        <motion.p
          className={styles.kicker}
          variants={fromTop}
          custom={-88}
          initial={{}}
        >
          Ed.D. Dissertation Research
        </motion.p>

        {/* Title */}
        <motion.h1 className={styles.title} variants={fromTop} custom={-140}>
          <span className={styles.titleLine}>Psychosocial Effects of</span>
          <span className={styles.titleLine}>
            <span className={styles.titleAccent}>Accelerated Dual Credit</span>
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p className={styles.subtitle} variants={fromTop} custom={-96}>
          On First-Year Developmental Adjustment
        </motion.p>

        {/* Divider - CENTER (scale) */}
        <motion.div
          className={styles.divider}
          variants={dividerVariants}
          style={{ transformOrigin: 'center' }}
        />

        {/* Description - FROM BOTTOM */}
        <motion.p className={styles.description} variants={fromBottom} custom={108}>
          Investigating how <strong>accelerated dual credit</strong> accumulation affects
          psychosocial development among equity-impacted California students.
        </motion.p>

        {/* Author Nameplate */}
        <motion.div className={styles.nameplate} variants={fromBottom} custom={132}>
          <h2 className={styles.authorName}>Jay Johnson</h2>
          <p className={styles.authorTitle}>Doctoral Candidate</p>
          <div className={styles.institution}>
            <img
              className={styles.logo}
              src={logoSrc}
              alt="San Diego State University"
            />
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div variants={fromBottom} custom={120}>
          <InteractiveSurface
            as="button"
            className={`${styles.cta} interactiveSurface`}
            onClick={handleEnter}
            aria-label="Enter the research visualization"
          >
            <span>Explore the Research</span>
            <svg
              className={styles.ctaIcon}
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </InteractiveSurface>
        </motion.div>
      </motion.main>

      {/* Entry Button - FROM BOTTOM */}
      <motion.div
        variants={fromBottom}
        custom={84}
        initial="hidden"
        animate={isLoaded ? 'visible' : 'hidden'}
      >
        <InteractiveSurface
          as="button"
          className={`${styles.scrollIndicator} interactiveSurface`}
          onClick={handleEnter}
          aria-label="Begin exploring the research"
        >
          <span className={styles.scrollText}>Begin</span>
          <svg
            className={styles.scrollChevron}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </InteractiveSurface>
      </motion.div>
    </motion.div>
  );
}
