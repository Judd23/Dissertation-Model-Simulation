import { HashRouter, Routes, Route } from 'react-router-dom';
import { ResearchProvider } from './context/ResearchContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import DoseExplorerPage from './pages/DoseExplorerPage';
import DemographicsPage from './pages/DemographicsPage';
import PathwayPage from './pages/PathwayPage';
import MethodsPage from './pages/MethodsPage';
import './styles/global.css';

function App() {
  return (
    <ThemeProvider>
      <ResearchProvider>
        <HashRouter>
        <Routes>
          <Route index element={<LandingPage />} />
          <Route path="/" element={<Layout />}>
            <Route path="home" element={<HomePage />} />
            <Route path="dose" element={<DoseExplorerPage />} />
            <Route path="demographics" element={<DemographicsPage />} />
            <Route path="pathway" element={<PathwayPage />} />
            <Route path="methods" element={<MethodsPage />} />
          </Route>
        </Routes>
        </HashRouter>
      </ResearchProvider>
    </ThemeProvider>
  );
}

export default App;
