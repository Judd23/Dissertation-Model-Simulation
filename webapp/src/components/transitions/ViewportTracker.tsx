/**
 * ViewportTracker.tsx
 * ===================
 * Tracks elements entering/leaving viewport using IntersectionObserver.
 * Provides ref callback for automatic registration with ChoreographerContext.
 * 
 * @link See ChoreographerContext.tsx for state management
 * @link See transitionConfig.ts for viewport configuration
 */
/* eslint-disable react-refresh/only-export-components */

import { useEffect, useRef, useCallback, type RefCallback } from 'react';
import { useChoreographer, type MorphCategory } from '../../context/ChoreographerContext';
import { VIEWPORT_CONFIG } from '../../config/transitionConfig';

interface UseViewportTrackerOptions {
  /** Unique identifier for this element */
  id: string;
  /** Category affects spring physics */
  category?: MorphCategory;
  /** Custom thresholds for intersection detection */
  thresholds?: number[];
  /** Root margin for early/late triggering */
  rootMargin?: string;
  /** Callback when visibility changes */
  onVisibilityChange?: (isVisible: boolean, entry: IntersectionObserverEntry) => void;
}

interface ViewportTrackerResult<T extends HTMLElement> {
  /** Ref to attach to tracked element */
  ref: RefCallback<T>;
  /** Whether element is currently in viewport */
  isVisible: boolean;
  /** Normalized distance from viewport center (0-1) */
  distanceFromCenter: number;
  /** Calculated stagger delay based on position */
  staggerDelay: number;
}

/**
 * Hook to track an element's viewport position and register with Choreographer
 * 
 * @example
 * ```tsx
 * function Card({ id }: { id: string }) {
 *   const { ref, distanceFromCenter, staggerDelay } = useViewportTracker({
 *     id: `card-${id}`,
 *     category: 'card',
 *   });
 *   
 *   return (
 *     <motion.div 
 *       ref={ref} 
 *       custom={distanceFromCenter}
 *       transition={{ delay: staggerDelay }}
 *     >
 *       Content
 *     </motion.div>
 *   );
 * }
 * ```
 */
export function useViewportTracker<T extends HTMLElement>({
  id,
  category = 'card',
  thresholds = [...VIEWPORT_CONFIG.thresholds],
  rootMargin = VIEWPORT_CONFIG.margin,
  onVisibilityChange,
}: UseViewportTrackerOptions): ViewportTrackerResult<T> {
  const elementRef = useRef<T | null>(null);
  const isVisibleRef = useRef(false);
  const distanceRef = useRef(0);
  const delayRef = useRef(0);

  const {
    registerElement,
    unregisterElement,
    updateElementRect,
    getDistanceFromCenter,
    getStaggerDelay,
    reducedMotion,
  } = useChoreographer();

  // Ref callback for element registration
  const ref = useCallback<RefCallback<T>>(
    (node) => {
      // Cleanup previous element
      if (elementRef.current && elementRef.current !== node) {
        unregisterElement(id);
      }

      elementRef.current = node;

      // Register new element
      if (node) {
        const rect = node.getBoundingClientRect();
        registerElement(id, category, rect);
        distanceRef.current = getDistanceFromCenter(id);
        delayRef.current = getStaggerDelay(id);
      }
    },
    [id, category, registerElement, unregisterElement, getDistanceFromCenter, getStaggerDelay]
  );

  // Set up IntersectionObserver
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Skip observation if reduced motion
    if (reducedMotion) {
      isVisibleRef.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const wasVisible = isVisibleRef.current;
          isVisibleRef.current = entry.isIntersecting;

          // Update rect when visible
          if (entry.isIntersecting) {
            updateElementRect(id, entry.boundingClientRect);
            distanceRef.current = getDistanceFromCenter(id);
            delayRef.current = getStaggerDelay(id);
          }

          // Notify visibility change
          if (wasVisible !== isVisibleRef.current && onVisibilityChange) {
            onVisibilityChange(isVisibleRef.current, entry);
          }
        });
      },
      {
        threshold: thresholds,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      unregisterElement(id);
    };
  }, [
    id,
    thresholds,
    rootMargin,
    reducedMotion,
    updateElementRect,
    unregisterElement,
    getDistanceFromCenter,
    getStaggerDelay,
    onVisibilityChange,
  ]);

  // Update on scroll/resize
  useEffect(() => {
    const element = elementRef.current;
    if (!element || reducedMotion) return;

    const updatePosition = () => {
      const rect = element.getBoundingClientRect();
      updateElementRect(id, rect);
      distanceRef.current = getDistanceFromCenter(id);
      delayRef.current = getStaggerDelay(id);
    };

    // Throttled scroll handler
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updatePosition();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updatePosition);
    };
  }, [id, reducedMotion, updateElementRect, getDistanceFromCenter, getStaggerDelay]);

  return {
    ref,
    isVisible: isVisibleRef.current,
    distanceFromCenter: distanceRef.current,
    staggerDelay: delayRef.current,
  };
}

// =============================================================================
// COMPONENT VERSION
// =============================================================================

interface ViewportTrackerProps {
  /** Unique identifier */
  id: string;
  /** Category for spring physics */
  category?: MorphCategory;
  /** Children receive tracking data via render prop */
  children: (data: {
    ref: RefCallback<HTMLElement>;
    isVisible: boolean;
    distanceFromCenter: number;
    staggerDelay: number;
  }) => React.ReactNode;
}

/**
 * Component version for render prop pattern
 * 
 * @example
 * ```tsx
 * <ViewportTracker id="hero" category="hero">
 *   {({ ref, staggerDelay }) => (
 *     <motion.div ref={ref} transition={{ delay: staggerDelay }}>
 *       Content
 *     </motion.div>
 *   )}
 * </ViewportTracker>
 * ```
 */
export function ViewportTracker({ id, category, children }: ViewportTrackerProps) {
  const trackingData = useViewportTracker<HTMLElement>({ id, category });
  return <>{children(trackingData)}</>;
}

export default ViewportTracker;
