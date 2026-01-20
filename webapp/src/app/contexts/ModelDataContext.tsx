/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { fetchModelData, parseModelData } from '../../data/adapters/modelData';
import type { ModelData } from '../../data/types/modelData';
import { fetchRunsIndex, type RunIndexEntry } from '../../lib/runs';

const ModelDataContext = createContext<ModelData | null>(null);
const ModelDataActionsContext = createContext<{
  isRefreshing: boolean;
  refreshModelData: () => Promise<void>;
  currentRunId: string | null;
  availableRuns: RunIndexEntry[];
  setCurrentRunId: (runId: string) => void;
} | null>(null);
const POLL_INTERVAL_MS = 15000;

const initialModelData = parseModelData();

export function ModelDataProvider({ children }: { children: ReactNode }) {
  const [modelData, setModelData] = useState<ModelData>(initialModelData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentRunId, setCurrentRunIdState] = useState<string | null>(null);
  const [availableRuns, setAvailableRuns] = useState<RunIndexEntry[]>([]);
  const isMountedRef = useRef(true);

  // Load available runs on mount
  useEffect(() => {
    const loadRuns = async () => {
      try {
        const runs = await fetchRunsIndex();
        if (isMountedRef.current && runs.length > 0) {
          setAvailableRuns(runs);
          // Auto-select the latest run (first in list, sorted by timestamp desc)
          if (!currentRunId) {
            setCurrentRunIdState(runs[0].run_id);
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[ModelDataProvider] fetchRunsIndex failed:', error);
        }
      }
    };
    loadRuns();
  }, [currentRunId]);

  // Load model data when run changes
  const loadData = useCallback(async () => {
    if (!currentRunId) return;
    try {
      const latest = await fetchModelData(currentRunId);
      if (isMountedRef.current) {
        setModelData(latest);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[ModelDataProvider] fetchModelData failed:', error);
      }
    }
  }, [currentRunId]);

  useEffect(() => {
    if (!currentRunId) return;

    loadData();
    const interval = window.setInterval(loadData, POLL_INTERVAL_MS);
    const handleRefresh = () => {
      loadData();
    };
    window.addEventListener('model-data-refresh', handleRefresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('model-data-refresh', handleRefresh);
    };
  }, [currentRunId, loadData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setCurrentRunId = useCallback((runId: string) => {
    setCurrentRunIdState(runId);
  }, []);

  return (
    <ModelDataContext.Provider value={modelData}>
      <ModelDataActionsContext.Provider
        value={{
          isRefreshing,
          currentRunId,
          availableRuns,
          setCurrentRunId,
          refreshModelData: async () => {
            if (isRefreshing || !currentRunId) {
              return;
            }
            if (isMountedRef.current) {
              setIsRefreshing(true);
            }
            try {
              const latest = await fetchModelData(currentRunId);
              if (isMountedRef.current) {
                setModelData(latest);
              }
            } catch (error) {
              if (import.meta.env.DEV) {
                console.error('[ModelDataProvider] refreshModelData failed:', error);
              }
            } finally {
              if (isMountedRef.current) {
                setIsRefreshing(false);
              }
            }
          },
        }}
      >
        {children}
      </ModelDataActionsContext.Provider>
    </ModelDataContext.Provider>
  );
}

export function useModelData(): ModelData {
  const context = useContext(ModelDataContext);
  if (!context) {
    throw new Error('useModelData must be used within ModelDataProvider');
  }
  return context;
}

export function useModelDataActions() {
  const context = useContext(ModelDataActionsContext);
  if (!context) {
    throw new Error('useModelDataActions must be used within ModelDataProvider');
  }
  return context;
}
