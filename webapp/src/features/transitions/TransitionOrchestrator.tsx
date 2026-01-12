/**
 * TransitionOrchestrator.tsx
 * ==========================
 * Wraps routes with AnimatePresence for seamless page transitions.
 * 
 * Uses mode="popLayout" to avoid layout stacking:
 * - Exiting page is popped out of layout (prevents height jumps)
 * - SharedElements morph via layoutId during transition
 * - Enter animation staggers content in
 * 
 * @link See transitionConfig.ts for page variants
 * @link See ChoreographerContext.tsx for phase management
 */

import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useChoreographer } from '../../app/contexts';
import { pageVariants } from '../../lib/transitionConfig';

interface TransitionOrchestratorProps {
  children: ReactNode;
  /** Whether to scroll to top on route change */
  scrollOnTransition?: boolean;
  /** Callback fired after exit completes */
  onExitComplete?: () => void;
  /** Delay before firing onExitComplete (ms) */
  exitCompleteDelayMs?: number;
}

/**
 * TransitionOrchestrator - Seamless page transitions
 * 
 * Design:
 * - mode="popLayout": Exiting page doesn't affect layout
 * - No forced fade-out: Keeps shared morph as the primary cue
 * - SharedElements morph via layoutId
 * - Content reveals via staggered enter animation
 */
export default function TransitionOrchestrator({
  children,
  scrollOnTransition = true,
  onExitComplete,
  exitCompleteDelayMs = 0,
}: TransitionOrchestratorProps) {
  const location = useLocation();
  const { reducedMotion } = useChoreographer();
  const exitCompleteTimerRef = useRef<number | null>(null);

  // Instant scroll to top on route change
  useEffect(() => {
    if (scrollOnTransition) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [location.pathname, scrollOnTransition]);

  useEffect(() => {
    if (!reducedMotion) return;
    onExitComplete?.();
  }, [location.pathname, onExitComplete, reducedMotion]);

  const handleExitComplete = useCallback(() => {
    if (!onExitComplete) return;
    if (!exitCompleteDelayMs) {
      onExitComplete();
      return;
    }

    if (exitCompleteTimerRef.current) {
      window.clearTimeout(exitCompleteTimerRef.current);
    }

    exitCompleteTimerRef.current = window.setTimeout(() => {
      onExitComplete();
      exitCompleteTimerRef.current = null;
    }, exitCompleteDelayMs);
  }, [exitCompleteDelayMs, onExitComplete]);

  useEffect(() => {
    return () => {
      if (exitCompleteTimerRef.current) {
        window.clearTimeout(exitCompleteTimerRef.current);
      }
    };
  }, []);

  // Handle reduced motion preference
  if (reducedMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" onExitComplete={handleExitComplete}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{ minHeight: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// SIMPLIFIED PAGE WRAPPER
// =============================================================================

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * Simplified page wrapper that applies page variants
 * Use when you need more control than TransitionOrchestrator provides
 */
export function PageWrapper({ children, className }: PageWrapperProps) {
  const { reducedMotion } = useChoreographer();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
