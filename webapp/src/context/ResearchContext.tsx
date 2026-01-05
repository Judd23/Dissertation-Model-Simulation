import { createContext, useContext, useState, type ReactNode } from 'react';

interface ResearchContextType {
  // Credit dose slider value (0-80 credits)
  selectedDose: number;
  setSelectedDose: (dose: number) => void;

  // Selected demographic group for comparisons
  selectedGroup: string | null;
  setSelectedGroup: (group: string | null) => void;

  // Grouping variable for demographics page
  groupingVariable: 'race' | 'firstgen' | 'pell' | 'sex' | 'living';
  setGroupingVariable: (variable: 'race' | 'firstgen' | 'pell' | 'sex' | 'living') => void;

  // Show confidence intervals toggle
  showCIs: boolean;
  toggleCIs: () => void;

  // Highlighted pathway in diagram
  highlightedPath: 'distress' | 'engagement' | 'direct' | 'serial' | null;
  setHighlightedPath: (path: 'distress' | 'engagement' | 'direct' | 'serial' | null) => void;

  // Toggle coefficient labels on PathwayDiagram
  showPathLabels: boolean;
  togglePathLabels: () => void;
}

const ResearchContext = createContext<ResearchContextType | null>(null);

export function ResearchProvider({ children }: { children: ReactNode }) {
  const [selectedDose, setSelectedDose] = useState(12); // Default at FASt threshold
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupingVariable, setGroupingVariable] = useState<'race' | 'firstgen' | 'pell' | 'sex' | 'living'>('race');
  const [showCIs, setShowCIs] = useState(true);
  const [highlightedPath, setHighlightedPath] = useState<'distress' | 'engagement' | 'direct' | 'serial' | null>(null);
  const [showPathLabels, setShowPathLabels] = useState(true);

  const toggleCIs = () => setShowCIs(!showCIs);
  const togglePathLabels = () => setShowPathLabels(!showPathLabels);

  return (
    <ResearchContext.Provider
      value={{
        selectedDose,
        setSelectedDose,
        selectedGroup,
        setSelectedGroup,
        groupingVariable,
        setGroupingVariable,
        showCIs,
        toggleCIs,
        highlightedPath,
        setHighlightedPath,
        showPathLabels,
        togglePathLabels,
      }}
    >
      {children}
    </ResearchContext.Provider>
  );
}

export function useResearch() {
  const context = useContext(ResearchContext);
  if (!context) {
    throw new Error('useResearch must be used within a ResearchProvider');
  }
  return context;
}
