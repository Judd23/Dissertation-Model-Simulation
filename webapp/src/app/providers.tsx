import type { ReactNode } from 'react';
import { HashRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ResearchProvider, ThemeProvider, ModelDataProvider, ChoreographerProvider, TransitionProvider } from '../app/contexts';
import { DANCE_SPRING_HEAVY } from '../lib/transitionConfig';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Global spring physics configuration.
 * All Framer Motion components inherit this transition by default.
 * reducedMotion="never" intentionally ignores user motion-reduction preferences
 * so all depth, parallax, and spring effects always run.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MotionConfig reducedMotion="never" transition={DANCE_SPRING_HEAVY}>
          <ModelDataProvider>
            <ResearchProvider>
              <TransitionProvider>
                <ChoreographerProvider>
                  <HashRouter>
                    {children}
                  </HashRouter>
                </ChoreographerProvider>
              </TransitionProvider>
            </ResearchProvider>
          </ModelDataProvider>
        </MotionConfig>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
