/**
 * TransitionOrchestrator.tsx
 * ==========================
 * Wraps routes with AnimatePresence for seamless page transitions.
 * 
 * Uses mode="sync" for instant page swaps:
 * - NO exit fade (pages swap instantly)
 * - SharedElements morph via layoutId during transition
 * - Enter animation staggers content in
 * 
 * @link See transitionConfig.ts for page variants
 * @link See ChoreographerContext.tsx for phase management
 */

import { type ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useChoreographer } from '../../context/ChoreographerContext';
import { pageVariants } from '../../config/transitionConfig';

interface TransitionOrchestratorProps {
  children: ReactNode;
  /** Whether to scroll to top on route change */
  scrollOnTransition?: boolean;
}

/**
 * TransitionOrchestrator - Seamless page transitions
 * 
 * Design:
 * - mode="sync": Pages swap instantly (no exit delay)
 * - No fade-out: Creates connected "one page" feel
 * - SharedElements morph via layoutId
 * - Content reveals via staggered enter animation
 */
export default function TransitionOrchestrator({
  children,
  scrollOnTransition = true,
}: TransitionOrchestratorProps) {
  const location = useLocation();
  const { reducedMotion } = useChoreographer();

  // Instant scroll to top on route change
  useEffect(() => {
    if (scrollOnTransition) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [location.pathname, scrollOnTransition]);

  // Handle reduced motion preference
  if (reducedMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="sync">
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
