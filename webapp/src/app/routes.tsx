import { LayoutGroup } from "framer-motion";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./layout/Layout";
import LandingPage from "../routes/LandingPage";
import LandingPageAlt from "../routes/LandingPageAlt";
import HomePage from "../routes/HomePage";

import SoWhatPage from "../routes/SoWhatPage";
import DoseExplorerPage from "../routes/DoseExplorerPage";
import DemographicsPage from "../routes/DemographicsPage";
import PathwayPage from "../routes/PathwayPage";
import MethodsPage from "../routes/MethodsPage";
import ResearcherPage from "../routes/ResearcherPage";

/**
 * AppRoutes - Handles route transitions with shared layout scope.
 *
 * Architecture:
 * - LayoutGroup namespaces all layoutId morphs within "app" scope
 * - Page transitions are handled inside Layout via TransitionOrchestrator
 *   to keep shared-layout morphs in sync with the outlet
 * - All pages including LandingPage are wrapped in Layout for consistent background
 */
export function AppRoutes() {
  return (
    <LayoutGroup id="app">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<LandingPageAlt />} />
          <Route path="landing-alt" element={<Navigate to="/" replace />} />
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
    </LayoutGroup>
  );
}
