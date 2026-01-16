import type { ReactNode } from "react";
import { HashRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import {
  ResearchProvider,
  ThemeProvider,
  ModelDataProvider,
  ChoreographerProvider,
  TransitionProvider,
} from "../app/contexts";
import { DANCE_SPRING_HEAVY } from "../lib/transitionConfig";
import { ErrorBoundary } from "../components/ErrorBoundary";

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Global spring physics configuration.
 * All Framer Motion components inherit this transition by default.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MotionConfig transition={DANCE_SPRING_HEAVY}>
          <ModelDataProvider>
            <ResearchProvider>
              <TransitionProvider>
                <ChoreographerProvider>
                  <HashRouter>{children}</HashRouter>
                </ChoreographerProvider>
              </TransitionProvider>
            </ResearchProvider>
          </ModelDataProvider>
        </MotionConfig>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
