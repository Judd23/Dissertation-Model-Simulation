/**
 * MorphProvider.tsx
 * =================
 * Unified provider for all transition orchestration.
 * Wraps MotionConfig, ChoreographerProvider, and LayoutGroup.
 * 
 * @link See transitionConfig.ts for spring/timing constants
 * @link See ChoreographerContext.tsx for phase management
 */

import { type ReactNode } from 'react';
import { LayoutGroup, MotionConfig } from 'framer-motion';
import { ChoreographerProvider } from '../../context/ChoreographerContext';
import { DANCE_SPRING_HEAVY } from '../../config/transitionConfig';

interface MorphProviderProps {
  children: ReactNode;
}

/**
 * Top-level provider that unifies all transition systems:
 * - MotionConfig: Global default transition (DANCE_SPRING_HEAVY)
 * - ChoreographerProvider: Phase state and viewport tracking
 * - LayoutGroup: Synchronized layout animations across routes
 */
export default function MorphProvider({ children }: MorphProviderProps) {
  return (
    <MotionConfig transition={DANCE_SPRING_HEAVY} reducedMotion="user">
      <ChoreographerProvider>
        <LayoutGroup id="route-morph">
          {children}
        </LayoutGroup>
      </ChoreographerProvider>
    </MotionConfig>
  );
}
