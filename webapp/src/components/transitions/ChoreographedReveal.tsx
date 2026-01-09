/**
 * ChoreographedReveal.tsx
 * =======================
 * Viewport-aware reveal components with staggered animations.
 * Uses Motion's whileInView for scroll-triggered reveals and
 * staggerChildren for orchestrated enter sequences.
 * 
 * Architecture:
 * - RevealContainer: Parent that orchestrates staggered children
 * - RevealItem: Individual animating child within container
 * - RevealSection/RevealArticle: Semantic presets for common patterns
 * 
 * @link See transitionConfig.ts for spring physics and timing
 */

import { forwardRef, type ReactNode, type CSSProperties } from 'react';
import { motion, type Variants, type HTMLMotionProps } from 'framer-motion';
import { useChoreographer } from '../../context/ChoreographerContext';
import { DANCE_SPRING_HEAVY, TIMING_SECONDS } from '../../config/transitionConfig';

// =============================================================================
// TYPES
// =============================================================================

type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade';

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const getDirectionVariants = (direction: RevealDirection): Variants => {
  const variants: Record<RevealDirection, Variants> = {
    up: {
      hidden: { opacity: 0, y: 24 },
      visible: { opacity: 1, y: 0 },
    },
    down: {
      hidden: { opacity: 0, y: -24 },
      visible: { opacity: 1, y: 0 },
    },
    left: {
      hidden: { opacity: 0, x: -24 },
      visible: { opacity: 1, x: 0 },
    },
    right: {
      hidden: { opacity: 0, x: 24 },
      visible: { opacity: 1, x: 0 },
    },
    scale: {
      hidden: { opacity: 0, scale: 0.95 },
      visible: { opacity: 1, scale: 1 },
    },
    fade: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
  };
  return variants[direction];
};

// =============================================================================
// REVEAL CONTAINER - orchestrates staggered children
// =============================================================================

interface RevealContainerProps {
  children: ReactNode;
  /** Stagger delay between children in seconds */
  staggerDelay?: number;
  /** Viewport amount required to trigger (0-1) */
  viewportAmount?: number;
  /** Only animate once */
  once?: boolean;
  /** Additional className */
  className?: string;
  /** Style prop */
  style?: CSSProperties;
}

/**
 * Container that staggers its motion children on mount.
 * Wrap RevealItem children for orchestrated reveals.
 * Triggers immediately when component mounts (not scroll-triggered).
 */
export function RevealContainer({
  children,
  staggerDelay = TIMING_SECONDS.stagger,
  viewportAmount: _viewportAmount = 0.2, // Kept for API compatibility
  once: _once = true, // Kept for API compatibility
  className,
  style,
}: RevealContainerProps) {
  const { reducedMotion } = useChoreographer();

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.05,
      },
    },
  };

  if (reducedMotion) {
    return <div className={className} style={style}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      style={style}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

// =============================================================================
// REVEAL ITEM - individual animated child
// =============================================================================

interface RevealItemProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: ReactNode;
  /** Direction of reveal animation */
  direction?: RevealDirection;
  /** Custom className */
  className?: string;
}

/**
 * Individual reveal item. Use inside RevealContainer for staggered animations,
 * or standalone with whileInView for single element reveals.
 */
export const RevealItem = forwardRef<HTMLDivElement, RevealItemProps>(
  function RevealItem({ children, direction = 'up', className, ...motionProps }, ref) {
    const { reducedMotion } = useChoreographer();
    const variants = getDirectionVariants(direction);

    // Add spring transition to visible state
    const enhancedVariants: Variants = {
      hidden: variants.hidden,
      visible: {
        ...variants.visible,
        transition: DANCE_SPRING_HEAVY,
      },
    };

    if (reducedMotion) {
      return <div ref={ref} className={className}>{children}</div>;
    }

    return (
      <motion.div
        ref={ref}
        className={className}
        variants={enhancedVariants}
        {...motionProps}
      >
        {children}
      </motion.div>
    );
  }
);

// =============================================================================
// REVEAL SECTION - semantic section with reveal
// =============================================================================

interface RevealSectionProps {
  children: ReactNode;
  /** Direction of reveal animation */
  direction?: RevealDirection;
  /** Viewport amount to trigger */
  viewportAmount?: number;
  /** Only animate once */
  once?: boolean;
  /** Additional className */
  className?: string;
  /** Style prop */
  style?: CSSProperties;
}

/**
 * Semantic <section> with reveal animation on mount.
 * Animates immediately when component mounts.
 */
export function RevealSection({
  children,
  direction = 'up',
  viewportAmount: _viewportAmount = 0.15,
  once: _once = true,
  className,
  style,
}: RevealSectionProps) {
  const { reducedMotion } = useChoreographer();
  const variants = getDirectionVariants(direction);

  const enhancedVariants: Variants = {
    hidden: variants.hidden,
    visible: {
      ...variants.visible,
      transition: DANCE_SPRING_HEAVY,
    },
  };

  if (reducedMotion) {
    return <section className={className} style={style}>{children}</section>;
  }

  return (
    <motion.section
      className={className}
      style={style}
      variants={enhancedVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.section>
  );
}

// =============================================================================
// REVEAL ARTICLE - semantic article with reveal
// =============================================================================

/**
 * Semantic <article> with reveal animation on mount.
 */
export function RevealArticle({
  children,
  direction = 'up',
  viewportAmount: _viewportAmount = 0.15,
  once: _once = true,
  className,
  style,
}: RevealSectionProps) {
  const { reducedMotion } = useChoreographer();
  const variants = getDirectionVariants(direction);

  const enhancedVariants: Variants = {
    hidden: variants.hidden,
    visible: {
      ...variants.visible,
      transition: DANCE_SPRING_HEAVY,
    },
  };

  if (reducedMotion) {
    return <article className={className} style={style}>{children}</article>;
  }

  return (
    <motion.article
      className={className}
      style={style}
      variants={enhancedVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.article>
  );
}

// =============================================================================
// REVEAL HEADER - semantic header with reveal
// =============================================================================

/**
 * Semantic <header> with reveal animation on mount.
 */
export function RevealHeader({
  children,
  direction = 'down',
  viewportAmount: _viewportAmount = 0.1,
  once: _once = true,
  className,
  style,
}: RevealSectionProps) {
  const { reducedMotion } = useChoreographer();
  const variants = getDirectionVariants(direction);

  const enhancedVariants: Variants = {
    hidden: variants.hidden,
    visible: {
      ...variants.visible,
      transition: DANCE_SPRING_HEAVY,
    },
  };

  if (reducedMotion) {
    return <header className={className} style={style}>{children}</header>;
  }

  return (
    <motion.header
      className={className}
      style={style}
      variants={enhancedVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.header>
  );
}

// =============================================================================
// DEFAULT EXPORT (backwards compatibility)
// =============================================================================

export default RevealSection;
