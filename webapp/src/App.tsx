import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, MotionConfig } from 'framer-motion';
import { ResearchProvider } from './context/ResearchContext';
import { ThemeProvider } from './context/ThemeContext';
import { ModelDataProvider } from './context/ModelDataContext';
import { ChoreographerProvider } from './context/ChoreographerContext';
import Layout from './components/layout/Layout';
import ScrollToTop from './components/ui/ScrollToTop';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import SoWhatPage from './pages/SoWhatPage';
import DoseExplorerPage from './pages/DoseExplorerPage';
import DemographicsPage from './pages/DemographicsPage';
import PathwayPage from './pages/PathwayPage';
import MethodsPage from './pages/MethodsPage';
import ResearcherPage from './pages/ResearcherPage';
import './styles/global.css';

/**
 * AnimatedRoutes - Handles route transitions with shared layout scope
 * 
 * Architecture:
 * - LayoutGroup namespaces all layoutId morphs within "app" scope
 * - AnimatePresence mode="sync" keeps both pages mounted during handoff
 *   (required for shared-element layout animations to work)
 * - Routes keyed by pathname triggers AnimatePresence transitions
 */
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <LayoutGroup id="app">
      <AnimatePresence mode="sync">
        <Routes location={location} key={location.pathname}>
          <Route index element={<LandingPage />} />
          <Route path="/" element={<Layout />}>
            <Route path="home" element={<HomePage />} />
            <Route path="so-what" element={<SoWhatPage />} />
            <Route path="dose" element={<DoseExplorerPage />} />
            <Route path="demographics" element={<DemographicsPage />} />
            <Route path="pathway" element={<PathwayPage />} />
            <Route path="methods" element={<MethodsPage />} />
            <Route path="researcher" element={<ResearcherPage />} />
            <Route path="about" element={<Navigate to="/researcher" replace />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </LayoutGroup>
  );
}

/**
 * App - Root component with providers and router
 * 
 * Provider order (outside → inside):
 * 1. ThemeProvider - CSS variables for theming
 * 2. MotionConfig - Global reduced motion handling (respects prefers-reduced-motion)
 * 3. ModelDataProvider - Research data context
 * 4. ResearchProvider - Research state
 * 5. ChoreographerProvider - Viewport tracking for center-out stagger
 * 6. HashRouter - Client-side routing (GitHub Pages compatible)
 */
function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <ModelDataProvider>
          <ResearchProvider>
            <ChoreographerProvider>
              <HashRouter>
                <ScrollToTop />
                <AnimatedRoutes />
              </HashRouter>
            </ChoreographerProvider>
          </ResearchProvider>
        </ModelDataProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}

export default App;
