/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchModelData, parseModelData } from '../../data/adapters/modelData';
import type { ModelData } from '../../data/types/modelData';

const ModelDataContext = createContext<ModelData | null>(null);
const POLL_INTERVAL_MS = 15000;

const initialModelData = parseModelData();

export function ModelDataProvider({ children }: { children: ReactNode }) {
  const [modelData, setModelData] = useState<ModelData>(initialModelData);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (import.meta.env.DEV) {
        console.log('(NO $) [ModelDataProvider] poll tick:', {
          intervalMs: POLL_INTERVAL_MS,
          at: new Date().toISOString(),
        });
      }
      try {
        const latest = await fetchModelData();
        if (isMounted) {
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

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <ModelDataContext.Provider value={modelData}>
      {children}
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
