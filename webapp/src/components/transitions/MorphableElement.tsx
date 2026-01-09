/**
 * MorphableElement.tsx
 * ====================
 * Smart wrapper that auto-registers with viewport tracking and applies
 * category-specific spring physics for morphing transitions.
 * 
 * @link See ChoreographerContext.tsx for viewport tracking
 * @link See transitionConfig.ts for category springs
 */

import { useEffect, useRef, forwardRef, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { useChoreographer, type MorphCategory } from '../../context/ChoreographerContext';
import { 
  CATEGORY_SPRINGS, 
  revealVariantsDynamic,
} from '../../config/transitionConfig';

interface MorphableElementProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  /** Unique identifier for cross-page morphing (becomes layoutId) */
  layoutId: string;
  /** Category determines spring physics: hero, card, text, chart, decoration */
  category?: MorphCategory;
  /** Children to render */
  children: ReactNode;
  /** Whether to track this element's viewport position */
  trackViewport?: boolean;
  /** Whether to apply reveal animation when entering viewport */
  revealOnScroll?: boolean;
  /** Direction for reveal animation */
  revealDirection?: 'up' | 'down' | 'left' | 'right' | 'scale';
  /** Additional className */
  className?: string;
  /** Data attribute for debugging */
  'data-morph-id'?: string;
}

/**
 * MorphableElement - Smart wrapper for morphing transitions
 * 
 * Features:
 * - Auto-registers with ChoreographerContext for viewport tracking
 * - Applies category-specific spring physics
 * - Supports cross-page morphing via layoutId
 * - Optional scroll-triggered reveal animation
 * 
 * @example
 * ```tsx
 * // Hero element that morphs between pages
 * <MorphableElement layoutId="hero" category="hero">
 *   <HeroContent />
 * </MorphableElement>
 * 
 * // Card that reveals on scroll with center-out stagger
 * <MorphableElement 
 *   layoutId="card-1" 
 *   category="card"
 *   revealOnScroll
 * >
 *   <CardContent />
 * </MorphableElement>
 * ```
 */
const MorphableElement = forwardRef<HTMLDivElement, MorphableElementProps>(
  function MorphableElement(
    {
      layoutId,
      category = 'card',
      children,
      trackViewport = true,
      revealOnScroll = false,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      revealDirection = 'up',
      className,
      ...motionProps
    },
    forwardedRef
  ) {
    const internalRef = useRef<HTMLDivElement>(null);
    const ref = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;
    
    const {
      registerElement,
      unregisterElement,
      updateElementRect,
      getDistanceFromCenter,
      reducedMotion,
    } = useChoreographer();

    // Get category-specific spring
    const spring = CATEGORY_SPRINGS[category];

    // Register with choreographer on mount
    useEffect(() => {
      if (!trackViewport) return;
      
      const element = ref.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      registerElement(layoutId, category, rect);

      // Set up resize observer for rect updates
      const resizeObserver = new ResizeObserver(() => {
        const newRect = element.getBoundingClientRect();
        updateElementRect(layoutId, newRect);
      });
      resizeObserver.observe(element);

      return () => {
        resizeObserver.disconnect();
        unregisterElement(layoutId);
      };
    }, [layoutId, category, trackViewport, registerElement, unregisterElement, updateElementRect, ref]);

    // Get distance for stagger calculation
    const distanceFromCenter = trackViewport ? getDistanceFromCenter(layoutId) : 0;

    // Handle reduced motion
    if (reducedMotion) {
      return (
        <div 
          ref={ref} 
          className={className}
          data-morph-id={layoutId}
        >
          {children}
        </div>
      );
    }

    // Build motion props based on configuration
    const motionConfig: HTMLMotionProps<'div'> = {
      layoutId,
      layout: true,
      transition: {
        ...spring,
        layout: spring,
      },
      'data-morph-id': layoutId,
      ...motionProps,
    };

    // Add reveal animation if enabled
    if (revealOnScroll) {
      motionConfig.variants = revealVariantsDynamic;
      motionConfig.initial = 'hidden';
      motionConfig.whileInView = 'visible';
      motionConfig.viewport = { once: true, amount: 0.3 };
      motionConfig.custom = distanceFromCenter;
    }

    return (
      <motion.div
        ref={ref}
        className={className}
        {...motionConfig}
      >
        {children}
      </motion.div>
    );
  }
);

export default MorphableElement;

// =============================================================================
// PRESET VARIANTS
// =============================================================================

/**
 * Pre-configured morphable elements for common use cases
 */

export function MorphableHero({ children, layoutId, ...props }: Omit<MorphableElementProps, 'category'>) {
  return (
    <MorphableElement layoutId={layoutId} category="hero" {...props}>
      {children}
    </MorphableElement>
  );
}

export function MorphableCard({ children, layoutId, ...props }: Omit<MorphableElementProps, 'category'>) {
  return (
    <MorphableElement layoutId={layoutId} category="card" revealOnScroll {...props}>
      {children}
    </MorphableElement>
  );
}

export function MorphableChart({ children, layoutId, ...props }: Omit<MorphableElementProps, 'category'>) {
  return (
    <MorphableElement layoutId={layoutId} category="chart" revealOnScroll {...props}>
      {children}
    </MorphableElement>
  );
}

export function MorphableText({ children, layoutId, ...props }: Omit<MorphableElementProps, 'category'>) {
  return (
    <MorphableElement layoutId={layoutId} category="text" {...props}>
      {children}
    </MorphableElement>
  );
}
