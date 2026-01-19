/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { fetchModelData, parseModelData } from '../../data/adapters/modelData';
import type { ModelData } from '../../data/types/modelData';

const ModelDataContext = createContext<ModelData | null>(null);
const ModelDataActionsContext = createContext<{
  isRefreshing: boolean;
  refreshModelData: () => Promise<void>;
} | null>(null);
const POLL_INTERVAL_MS = 15000;

const initialModelData = parseModelData();

export function ModelDataProvider({ children }: { children: ReactNode }) {
  const [modelData, setModelData] = useState<ModelData>(initialModelData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const latest = await fetchModelData();
        if (isMountedRef.current) {
          setModelData(latest);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('(NO $) [ModelDataProvider] fetchModelData failed:', error);
        }
      }
    };

    loadData();
    const interval = window.setInterval(loadData, POLL_INTERVAL_MS);
    const handleRefresh = () => {
      loadData();
    };
    window.addEventListener('model-data-refresh', handleRefresh);

    return () => {
      isMountedRef.current = false;
      window.clearInterval(interval);
      window.removeEventListener('model-data-refresh', handleRefresh);
    };
  }, []);

  return (
    <ModelDataContext.Provider value={modelData}>
      <ModelDataActionsContext.Provider
        value={{
          isRefreshing,
          refreshModelData: async () => {
            if (isRefreshing) {
              return;
            }
            if (isMountedRef.current) {
              setIsRefreshing(true);
            }
            try {
              const latest = await fetchModelData();
              if (isMountedRef.current) {
                setModelData(latest);
              }
            } catch (error) {
              if (import.meta.env.DEV) {
                console.error('(NO $) [ModelDataProvider] refreshModelData failed:', error);
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
