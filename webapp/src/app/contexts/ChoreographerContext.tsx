/**
 * ChoreographerContext.tsx
 * ========================
 * Unified animation orchestration for viewport-aware transitions.
 * 
 * Extends TransitionContext with:
 * - Viewport center tracking for center-out stagger
 * - Element registration for morph coordination
 * - Phase state for orchestrated sequences
 * 
 * @link See transitionConfig.ts for timing constants
 * @link See Debugs.md Phase 27 for implementation details
 */
/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { TIMING, STAGGER_CONFIG, calculateCenterOutDelay } from '../../lib/transitionConfig';

// =============================================================================
// TYPES
// =============================================================================

export type ChoreographerPhase = 'idle' | 'exiting' | 'morphing' | 'entering';

export type MorphCategory = 'hero' | 'card' | 'text' | 'chart' | 'decoration';

interface RegisteredElement {
  id: string;
  category: MorphCategory;
  rect: DOMRect;
  distanceFromCenter: number;
}

interface ViewportCenter {
  x: number;
  y: number;
}

interface ChoreographerContextValue {
  // Phase management
  phase: ChoreographerPhase;
  setPhase: (phase: ChoreographerPhase) => void;
  
  // Viewport tracking
  viewportCenter: ViewportCenter;
  visibleElements: Map<string, RegisteredElement>;
  
  // Element registration
  registerElement: (id: string, category: MorphCategory, rect: DOMRect) => void;
  unregisterElement: (id: string) => void;
  updateElementRect: (id: string, rect: DOMRect) => void;
  
  // Stagger calculation
  getStaggerDelay: (elementId: string) => number;
  getDistanceFromCenter: (elementId: string) => number;
  
  // Transition orchestration
  startOrchestration: () => Promise<void>;
  completeOrchestration: () => void;
  
  // Accessibility
  reducedMotion: boolean;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ChoreographerContext = createContext<ChoreographerContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface ChoreographerProviderProps {
  children: ReactNode;
}

export function ChoreographerProvider({ children }: ChoreographerProviderProps) {
  const [phase, setPhase] = useState<ChoreographerPhase>('idle');
  const [visibleElements] = useState(() => new Map<string, RegisteredElement>());
  const [viewportCenter, setViewportCenter] = useState<ViewportCenter>({ x: 0, y: 0 });

  // ALWAYS false - all users get full cinematic experience (no reduced motion)
  const reducedMotion = false;

  // Track viewport center
  useEffect(() => {
    const updateViewportCenter = () => {
      setViewportCenter({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
    };

    updateViewportCenter();
    window.addEventListener('resize', updateViewportCenter);
    return () => window.removeEventListener('resize', updateViewportCenter);
  }, []);

  // Calculate distance from viewport center
  const calculateDistanceFromCenter = useCallback(
    (rect: DOMRect): number => {
      const elementCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      
      const dx = elementCenter.x - viewportCenter.x;
      const dy = elementCenter.y - viewportCenter.y;
      
      // Normalize to viewport diagonal
      const viewportDiagonal = Math.sqrt(
        viewportCenter.x ** 2 + viewportCenter.y ** 2
      );
      
      return Math.sqrt(dx ** 2 + dy ** 2) / viewportDiagonal;
    },
    [viewportCenter]
  );

  // Register element
  const registerElement = useCallback(
    (id: string, category: MorphCategory, rect: DOMRect) => {
      const distanceFromCenter = calculateDistanceFromCenter(rect);
      visibleElements.set(id, { id, category, rect, distanceFromCenter });
    },
    [visibleElements, calculateDistanceFromCenter]
  );

  // Unregister element
  const unregisterElement = useCallback(
    (id: string) => {
      visibleElements.delete(id);
    },
    [visibleElements]
  );

  // Update element rect (for resize/scroll updates)
  const updateElementRect = useCallback(
    (id: string, rect: DOMRect) => {
      const existing = visibleElements.get(id);
      if (existing) {
        const distanceFromCenter = calculateDistanceFromCenter(rect);
        visibleElements.set(id, { ...existing, rect, distanceFromCenter });
      }
    },
    [visibleElements, calculateDistanceFromCenter]
  );

  // Get stagger delay for element
  const getStaggerDelay = useCallback(
    (elementId: string): number => {
      const element = visibleElements.get(elementId);
      if (!element) return 0;
      return calculateCenterOutDelay(element.distanceFromCenter);
    },
    [visibleElements]
  );

  // Get distance from center
  const getDistanceFromCenter = useCallback(
    (elementId: string): number => {
      const element = visibleElements.get(elementId);
      return element?.distanceFromCenter ?? 0;
    },
    [visibleElements]
  );

  // Orchestrated transition sequence
  const startOrchestration = useCallback(async () => {
    if (reducedMotion) {
      return; // Skip animation entirely
    }

    // Phase 1: Exit
    setPhase('exiting');
    await new Promise((resolve) => setTimeout(resolve, TIMING.exit));

    // Phase 2: Morph
    setPhase('morphing');
    await new Promise((resolve) => setTimeout(resolve, TIMING.morph));

    // Phase 3: Enter
    setPhase('entering');
    await new Promise((resolve) => setTimeout(resolve, TIMING.enter));

    // Complete
    setPhase('idle');
  }, [reducedMotion]);

  const completeOrchestration = useCallback(() => {
    setPhase('idle');
  }, []);

  // Memoized context value
  const value = useMemo<ChoreographerContextValue>(
    () => ({
      phase,
      setPhase,
      viewportCenter,
      visibleElements,
      registerElement,
      unregisterElement,
      updateElementRect,
      getStaggerDelay,
      getDistanceFromCenter,
      startOrchestration,
      completeOrchestration,
      reducedMotion, // Always false - full cinematic experience
    }),
    [
      phase,
      viewportCenter,
      visibleElements,
      registerElement,
      unregisterElement,
      updateElementRect,
      getStaggerDelay,
      getDistanceFromCenter,
      startOrchestration,
      completeOrchestration,
    ]
  );

  return (
    <ChoreographerContext.Provider value={value}>
      {children}
    </ChoreographerContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Main hook to access choreographer functionality
 */
export function useChoreographer(): ChoreographerContextValue {
  const context = useContext(ChoreographerContext);
  if (!context) {
    throw new Error('useChoreographer must be used within ChoreographerProvider');
  }
  return context;
}

/**
 * Hook to check if orchestration is active
 */
export function useIsOrchestrating(): boolean {
  const { phase } = useChoreographer();
  return phase !== 'idle';
}

/**
 * Hook to get current phase
 */
export function useOrchestrationPhase(): ChoreographerPhase {
  const { phase } = useChoreographer();
  return phase;
}

/**
 * Hook for element-specific stagger delay
 */
export function useStaggerDelay(elementId: string): number {
  const { getStaggerDelay, reducedMotion } = useChoreographer();
  return reducedMotion ? 0 : getStaggerDelay(elementId);
}

/**
 * Hook for viewport center-out distance (0-1)
 */
export function useDistanceFromCenter(elementId: string): number {
  const { getDistanceFromCenter } = useChoreographer();
  return getDistanceFromCenter(elementId);
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Calculate stagger delays for a list of elements based on viewport position
 * Sorts by distance from center and assigns sequential delays
 */
export function calculateGroupStagger(
  elements: { id: string; distanceFromCenter: number }[]
): Map<string, number> {
  const sorted = [...elements].sort((a, b) => a.distanceFromCenter - b.distanceFromCenter);
  const delays = new Map<string, number>();
  
  sorted.forEach((el, index) => {
    delays.set(el.id, index * STAGGER_CONFIG.delay);
  });
  
  return delays;
}
