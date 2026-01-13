/**
 * transitionConfig.ts
 * ==================
 * Single source of truth for all transition timing, spring physics, and animation orchestration.
 * 
 * DESIGN PRINCIPLES:
 * - "Everything moves like an organized dance" — NO fast transitions
 * - Center-out awareness — elements closer to viewport center animate first
 * - Phase orchestration — exit completes → morph happens → enter begins
 * - Spring physics — natural motion with unified spring constants
 * 
 * @link See variables.css for CSS-side timing tokens
 * @link See Debugs.md Phase 27 for implementation checklist
 */

import { type Transition, type Variants } from 'framer-motion';

// =============================================================================
// SPRING PHYSICS
// =============================================================================

/**
 * The "dance" spring - elegant, slow, natural motion
 * ~1200ms settle time at stiffness=60, damping=20, mass=1.2
 */
export const DANCE_SPRING = {
  type: 'spring' as const,
  stiffness: 60,
  damping: 20,
  mass: 1.2,
} satisfies Transition;

/**
 * Lighter spring for smaller elements (cards, buttons)
 * ~800ms settle time
 */
export const DANCE_SPRING_LIGHT = {
  type: 'spring' as const,
  stiffness: 80,
  damping: 18,
  mass: 0.8,
} satisfies Transition;

/**
 * Heavier spring for page-level morphs and interactive elements
 * Lower damping creates visible bounce/overshoot
 * ~900ms settle time with noticeable bounce
 */
export const DANCE_SPRING_HEAVY = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 14,
  mass: 1.0,
} satisfies Transition;

/**
 * Page fade transition - use tween for opacity (springs look weird on opacity)
 * Quick, clean fade with no bounce
 */
export const PAGE_FADE = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1], // Material Design standard easing
} satisfies Transition;

// =============================================================================
// TIMING CONSTANTS (match variables.css)
// =============================================================================

export const TIMING = {
  /** Interactive feedback (hover, press) */
  hover: 600,
  /** Element reveals (scroll, viewport enter) */
  reveal: 1000,
  /** Orchestrated entrances (page load, route change) */
  enter: 1200,
  /** Exit phase duration */
  exit: 700,
  /** Morph/transition phase duration */
  morph: 900,
  /** Stagger delay between sequential elements */
  stagger: 150,
  /** Total page transition time */
  pageTransition: 2800, // exit + morph + enter
} as const;

export const TIMING_SECONDS = {
  hover: TIMING.hover / 1000,
  reveal: TIMING.reveal / 1000,
  enter: TIMING.enter / 1000,
  exit: TIMING.exit / 1000,
  morph: TIMING.morph / 1000,
  stagger: TIMING.stagger / 1000,
  pageTransition: TIMING.pageTransition / 1000,
} as const;

// =============================================================================
// STAGGER CONFIGURATION
// =============================================================================

export const STAGGER_CONFIG = {
  /** Base delay between elements (seconds) */
  delay: 0.15,
  /** Stagger direction: center-out creates ripple effect */
  from: 'center' as const,
  /** Easing redistribution for stagger timing */
  ease: 'easeOut' as const,
} as const;

/**
 * Calculate stagger delay based on distance from viewport center
 * Elements closer to center animate first
 */
export function calculateCenterOutDelay(
  distanceFromCenter: number,
  maxDistance: number = 1
): number {
  const normalizedDistance = Math.min(distanceFromCenter / maxDistance, 1);
  return normalizedDistance * STAGGER_CONFIG.delay;
}

// =============================================================================
// EASING CURVES
// =============================================================================

export const EASING = {
  /** Primary easing - elegant deceleration */
  dance: [0.16, 1, 0.3, 1] as [number, number, number, number],
  /** Expo out - fast start, slow end */
  outExpo: [0.16, 1, 0.3, 1] as [number, number, number, number],
  /** Back out - slight overshoot */
  outBack: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  /** Smooth in-out for symmetrical transitions */
  inOutQuart: [0.76, 0, 0.24, 1] as [number, number, number, number],
} as const;

// =============================================================================
// PAGE VARIANTS - Seamless transitions (no exit fade)
// =============================================================================

/**
 * Page transition variants for seamless "one page" feel.
 * 
 * NO EXIT: Pages swap instantly via mode="sync"
 * MORPH: SharedElements animate via layoutId
 * ENTER: Content fades in with staggered children
 */
export const pageVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.25,
      ease: EASING.dance,
      when: 'beforeChildren',
      staggerChildren: 0.06,
    },
  },
  exit: {
    // No exit animation - instant swap for seamless feel
    opacity: 1,
    transition: { duration: 0 },
  },
};

/**
 * Page variants with subtle fade (for pages needing softer transition)
 */
export const pageVariantsSubtle: Variants = {
  hidden: { opacity: 0.8 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: EASING.dance },
  },
  exit: {
    opacity: 1,
    transition: { duration: 0 },
  },
};

// =============================================================================
// REVEAL VARIANTS
// =============================================================================

export const revealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: DANCE_SPRING_HEAVY,
  },
};

export const revealVariantsScale: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: DANCE_SPRING_HEAVY,
  },
};

export const revealVariantsLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -30,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: DANCE_SPRING_HEAVY,
  },
};

export const revealVariantsRight: Variants = {
  hidden: {
    opacity: 0,
    x: 30,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: DANCE_SPRING_HEAVY,
  },
};

// =============================================================================
// DYNAMIC VARIANTS (with custom prop support)
// =============================================================================

/**
 * Reveal variants that accept a custom distance value for stagger
 * Usage: <motion.div custom={distanceFromCenter} variants={revealVariantsDynamic} />
 */
export const revealVariantsDynamic: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: (distanceFromCenter: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      ...DANCE_SPRING_HEAVY,
      delay: calculateCenterOutDelay(distanceFromCenter),
    },
  }),
};

// =============================================================================
// CONTAINER VARIANTS (for orchestrating children)
// =============================================================================

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: 'beforeChildren',
      staggerChildren: TIMING_SECONDS.stagger,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      when: 'afterChildren',
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: DANCE_SPRING_HEAVY,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: DANCE_SPRING_HEAVY,
  },
};

// =============================================================================
// MORPH ELEMENT CATEGORIES
// =============================================================================

export type MorphCategory = 'hero' | 'card' | 'text' | 'chart' | 'decoration';

/**
 * Spring configs by element category
 * Heavier elements move slower, lighter elements are snappier
 */
export const CATEGORY_SPRINGS: Record<MorphCategory, Transition> = {
  hero: DANCE_SPRING_HEAVY,
  card: DANCE_SPRING_HEAVY,
  text: DANCE_SPRING_HEAVY,
  chart: DANCE_SPRING_HEAVY,
  decoration: DANCE_SPRING_HEAVY,
};

// =============================================================================
// VIEWPORT CONFIGURATION
// =============================================================================

export const VIEWPORT_CONFIG = {
  /** IntersectionObserver thresholds for tracking */
  thresholds: [0, 0.1, 0.25, 0.5, 0.75, 1],
  /** Trigger reveal when element is 30% visible */
  revealAmount: 0.3,
  /** Only animate once (don't re-trigger on scroll back) */
  once: true,
  /** Root margin for early triggering */
  margin: '-50px 0px -50px 0px',
} as const;

// =============================================================================
// REDUCED MOTION
// =============================================================================

/**
 * Transition to use when user prefers reduced motion
 * Instant transitions, no springs
 */
export const REDUCED_MOTION_TRANSITION: Transition = {
  duration: 0,
};

/**
 * Get appropriate transition based on reduced motion preference
 */
export function getTransition(
  preferredTransition: Transition,
  reducedMotion: boolean
): Transition {
  return reducedMotion ? REDUCED_MOTION_TRANSITION : preferredTransition;
}

// =============================================================================
// CSS VARIABLE HELPERS
// =============================================================================

/**
 * Read a CSS variable value from the document
 */
export function getCSSVariable(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name}`)
    .trim();
}

/**
 * Get timing value from CSS variable (returns number in ms)
 */
export function getCSSTimingMs(name: string): number {
  const value = getCSSVariable(name);
  if (value.endsWith('ms')) {
    return parseInt(value, 10);
  }
  if (value.endsWith('s')) {
    return parseFloat(value) * 1000;
  }
  return parseInt(value, 10) || 0;
}
