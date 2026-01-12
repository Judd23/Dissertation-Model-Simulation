import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { PAGE_FADE } from '../lib/transitionConfig';
import styles from './LandingPage.module.css';

// ============================================
// MOTION SYSTEM - Heavy, cinematic springs
// ============================================

// Heavy spring for long-travel entrances (120-200px travel)
const HEAVY_SPRING = {
  type: 'spring' as const,
  mass: 1.2,
  stiffness: 80,
  damping: 18,
};

// Gentle spring for subtle movements
const GENTLE_SPRING = {
  type: 'spring' as const,
  mass: 0.8,
  stiffness: 120,
  damping: 16,
};

// Stagger timing
const STAGGER_BASE = 0.08;

// Container variants for staggered children
const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER_BASE,
      delayChildren: 0.15,
    },
  },
};

// From top entrance (kicker, title, subtitle)
const fromTopVariants = {
  hidden: { 
    opacity: 0, 
    y: -100,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: HEAVY_SPRING,
  },
};

// From bottom entrance (description, nameplate, CTA)
const fromBottomVariants = {
  hidden: { 
    opacity: 0, 
    y: 120,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: HEAVY_SPRING,
  },
};

// Center scale entrance (divider)
const scaleVariants = {
  hidden: { 
    opacity: 0, 
    scaleX: 0,
  },
  visible: { 
    opacity: 1, 
    scaleX: 1,
    transition: {
      ...HEAVY_SPRING,
      scaleX: { ...HEAVY_SPRING, stiffness: 100 },
    },
  },
};

// Scroll indicator entrance
const scrollIndicatorVariants = {
  hidden: { 
    opacity: 0, 
    y: 60,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      ...HEAVY_SPRING,
      delay: 0.5,
    },
  },
};

// Pathway silhouette fade
const pathwayVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      delay: 0.2,
    },
  },
};

export default function LandingPage() {
  const navigate = useNavigate();

  // Dark mode only - always use reverse logo
  const logoSrc = `${import.meta.env.BASE_URL}researcher/sdsu_primary-logo_rgb_horizontal_reverse.png`;

  const handleEnter = () => {
    navigate('/home');
  };

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
        variants={pathwayVariants}
        initial="hidden"
        animate="visible"
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
      </motion.svg>

      {/* Main Content */}
      <motion.main 
        className={styles.content}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className={styles.titleGhost} aria-hidden="true">
          Psychosocial Effects of Accelerated Dual Credit
        </div>
        
        {/* Kicker */}
        <motion.p 
          className={styles.kicker}
          variants={fromTopVariants}
        >
          Ed.D. Dissertation Research
        </motion.p>

        {/* Title */}
        <motion.h1 
          className={styles.title}
          variants={fromTopVariants}
        >
          <span className={styles.titleLine}>Psychosocial Effects of</span>
          <span className={styles.titleLine}>
            <span className={styles.titleAccent}>
              Accelerated Dual Credit
            </span>
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p 
          className={styles.subtitle}
          variants={fromTopVariants}
        >
          On First-Year Developmental Adjustment
        </motion.p>

        {/* Divider - CENTER (scale) */}
        <motion.div 
          className={styles.divider}
          variants={scaleVariants}
        />

        {/* Description - FROM BOTTOM */}
        <motion.p 
          className={styles.description}
          variants={fromBottomVariants}
        >
          Investigating how <strong>accelerated dual credit</strong> accumulation affects
          psychosocial development among equity-impacted California students.
        </motion.p>

        {/* Author Nameplate */}
        <motion.div 
          className={styles.nameplate}
          variants={fromBottomVariants}
        >
          <h2 className={styles.authorName}>Jay Johnson</h2>
          <p className={styles.authorTitle}>Doctoral Candidate</p>
          <motion.div 
            className={styles.institution}
            whileHover={{ scale: 1.02 }}
            transition={GENTLE_SPRING}
          >
            <img
              className={styles.logo}
              src={logoSrc}
              alt="San Diego State University"
            />
          </motion.div>
        </motion.div>

        {/* CTA Button */}
        <motion.div variants={fromBottomVariants}>
          <motion.button
            className={`${styles.cta} interactiveSurface`}
            onClick={handleEnter}
            aria-label="Enter the research visualization"
            whileHover={{ y: -2 }}
            whileTap={{ y: 1, scale: 0.99 }}
            transition={GENTLE_SPRING}
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
          </motion.button>
        </motion.div>
      </motion.main>

      {/* Scroll Indicator - FROM BOTTOM */}
      <motion.div
        className={styles.scrollIndicatorWrapper}
        variants={scrollIndicatorVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.button
          className={`${styles.scrollIndicator} interactiveSurface`}
          onClick={handleEnter}
          aria-label="Scroll to explore"
          whileHover={{ y: -2 }}
          transition={GENTLE_SPRING}
        >
          <span className={styles.scrollText}>Scroll to explore</span>
          <motion.svg 
            className={styles.scrollChevron} 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            animate={{
              y: [0, 6, 0],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </motion.svg>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
