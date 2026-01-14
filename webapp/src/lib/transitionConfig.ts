/**
 * transitionConfig.ts
 * ==================
 * CANONICAL ANIMATION SETTINGS - DO NOT OVERRIDE IN COMPONENTS
 *
 * Single source of truth for all transition timing, spring physics, and animation orchestration.
 * All components MUST import from this file. Do not define inline springs or timing.
 *
 * PERMANENT SETTINGS (Established 2026-01-14):
 * - DANCE_SPRING: stiffness=45, damping=18, mass=1.4 (~1600ms)
 * - DANCE_SPRING_LIGHT: stiffness=60, damping=16, mass=1.0 (~1100ms)
 * - DANCE_SPRING_HEAVY: stiffness=70, damping=12, mass=1.2 (~1200ms + bounce)
 * - Hover: y=-8px, scale=1.035
 * - Tap: scale=0.98
 * - Reveal travel: 48-50px vertical, 60-70px horizontal
 * - Stagger: 150-200ms between elements
 *
 * DESIGN PRINCIPLES:
 * - "Everything moves like an organized dance" — NO fast transitions
 * - Center-out awareness — elements closer to viewport center animate first
 * - Phase orchestration — exit completes → morph happens → enter begins
 * - Spring physics — natural motion with unified spring constants
 *
 * @link See variables.css for CSS-side timing tokens
 */

import { type Transition, type Variants } from "framer-motion";

// =============================================================================
// SPRING PHYSICS
// =============================================================================

/**
 * The "dance" spring - elegant, slow, natural motion
 * ~1600ms settle time at stiffness=45, damping=18, mass=1.4
 */
export const DANCE_SPRING = {
  type: "spring" as const,
  stiffness: 45,
  damping: 18,
  mass: 1.4,
} satisfies Transition;

/**
 * Lighter spring for smaller elements (cards, buttons)
 * ~1100ms settle time with graceful deceleration
 */
export const DANCE_SPRING_LIGHT = {
  type: "spring" as const,
  stiffness: 60,
  damping: 16,
  mass: 1.0,
} satisfies Transition;

/**
 * Heavier spring for page-level morphs and interactive elements
 * Lower damping creates visible bounce/overshoot
 * ~1200ms settle time with dramatic bounce
 */
export const DANCE_SPRING_HEAVY = {
  type: "spring" as const,
  stiffness: 70,
  damping: 12,
  mass: 1.2,
} satisfies Transition;

/**
 * Page fade transition - use tween for opacity (springs look weird on opacity)
 * Graceful, unhurried fade for editorial feel
 */
export const PAGE_FADE = {
  duration: 0.6,
  ease: [0.16, 1, 0.3, 1], // Expo out for elegant deceleration
} satisfies Transition;

// =============================================================================
// TIMING CONSTANTS (match variables.css)
// =============================================================================

export const TIMING = {
  /** Interactive feedback (hover, press) */
  hover: 800,
  /** Element reveals (scroll, viewport enter) */
  reveal: 1400,
  /** Orchestrated entrances (page load, route change) */
  enter: 1600,
  /** Exit phase duration */
  exit: 900,
  /** Morph/transition phase duration */
  morph: 1200,
  /** Stagger delay between sequential elements */
  stagger: 200,
  /** Total page transition time */
  pageTransition: 3700, // exit + morph + enter
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
  from: "center" as const,
  /** Easing redistribution for stagger timing */
  ease: "easeOut" as const,
} as const;

// =============================================================================
// HOVER PRESETS - Use these instead of inline values
// =============================================================================

/** Standard hover animation props for interactive elements */
export const HOVER_PROPS = {
  y: -8,
  scale: 1.035,
} as const;

/** Standard tap animation props */
export const TAP_PROPS = {
  scale: 0.98,
} as const;

/** Subtle hover for small elements (nav links, toggles) */
export const HOVER_SUBTLE = {
  y: -4,
  scale: 1.02,
} as const;

/** Subtle tap for small elements */
export const TAP_SUBTLE = {
  y: 0,
  scale: 0.98,
} as const;

// =============================================================================
// VIEWPORT CONFIG - For whileInView reveals
// =============================================================================

/** Standard viewport detection for scroll reveals */
export const VIEWPORT_CONFIG = {
  once: true,
  amount: 0.2,
  margin: "0px 0px -100px 0px",
} as const;

/** Looser viewport for large elements */
export const VIEWPORT_LOOSE = {
  once: true,
  amount: 0.1,
  margin: "0px 0px -50px 0px",
} as const;

// =============================================================================
// BREATHING ANIMATION - For infinite subtle animations
// =============================================================================

/** Slow breathing animation for scroll indicators, loading states */
export const BREATHING_ANIMATION = {
  animate: {
    y: [0, 8, 0],
    scale: [1, 1.05, 1],
    opacity: [0.5, 1, 0.5],
  },
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
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
      duration: 0.5,
      ease: EASING.dance,
      when: "beforeChildren",
      staggerChildren: 0.12,
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
    y: 50,
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
    scale: 0.9,
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
    x: -60,
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
    x: 60,
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
    y: 50,
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
      when: "beforeChildren",
      staggerChildren: TIMING_SECONDS.stagger,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      when: "afterChildren",
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

export type MorphCategory = "hero" | "card" | "text" | "chart" | "decoration";

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
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name}`)
    .trim();
}

/**
 * Get timing value from CSS variable (returns number in ms)
 */
export function getCSSTimingMs(name: string): number {
  const value = getCSSVariable(name);
  if (value.endsWith("ms")) {
    return parseInt(value, 10);
  }
  if (value.endsWith("s")) {
    return parseFloat(value) * 1000;
  }
  return parseInt(value, 10) || 0;
}
