import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ResearchProvider } from './context/ResearchContext';
import { ThemeProvider } from './context/ThemeContext';
import { ModelDataProvider } from './context/ModelDataContext';
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

function App() {
  return (
    <ThemeProvider>
      <ModelDataProvider>
        <ResearchProvider>
          <HashRouter>
            <ScrollToTop />
            <Routes>
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
          </HashRouter>
        </ResearchProvider>
      </ModelDataProvider>
    </ThemeProvider>
  );
}

export default App;
