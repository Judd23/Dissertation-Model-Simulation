/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { TIMING } from "../../lib/transitionConfig";

type TransitionMode = "none" | "particles" | "morph" | "auto";
type TransitionPhase = "idle" | "exiting" | "transitioning" | "entering";

interface SharedElementRect {
  id: string;
  rect: DOMRect;
  route: string;
}

interface TransitionContextValue {
  mode: TransitionMode;
  setMode: (mode: TransitionMode) => void;
  phase: TransitionPhase;
  setPhase: (phase: TransitionPhase) => void;
  sourceRoute: string | null;
  targetRoute: string | null;
  particleCount: number;
  sharedElements: Map<string, SharedElementRect>;
  registerSharedElement: (id: string, rect: DOMRect, route: string) => void;
  unregisterSharedElement: (id: string) => void;
  startTransition: (from: string, to: string) => Promise<void>;
  completeTransition: () => void;
  hasMatchingSharedElements: (targetRoute: string) => boolean;
}

const TransitionContext = createContext<TransitionContextValue | null>(null);

interface TransitionProviderProps {
  children: ReactNode;
}

export function TransitionProvider({ children }: TransitionProviderProps) {
  const [mode, setMode] = useState<TransitionMode>("morph");
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const [sourceRoute, setSourceRoute] = useState<string | null>(null);
  const [targetRoute, setTargetRoute] = useState<string | null>(null);
  const [particleCount, setParticleCount] = useState(200);
  const [sharedElements] = useState(() => new Map<string, SharedElementRect>());
  const [currentRoute, setCurrentRoute] = useState(() => {
    if (typeof window === "undefined") return "/";
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return "/";
    return hash.startsWith("/") ? hash : `/${hash}`;
  });

  useEffect(() => {
    const updateRoute = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) {
        setCurrentRoute("/");
        return;
      }
      setCurrentRoute(hash.startsWith("/") ? hash : `/${hash}`);
    };

    window.addEventListener("hashchange", updateRoute);
    window.addEventListener("popstate", updateRoute);
    updateRoute();
    return () => {
      window.removeEventListener("hashchange", updateRoute);
      window.removeEventListener("popstate", updateRoute);
    };
  }, []);

  // Detect device capability for particle count
  useEffect(() => {
    const cores = navigator.hardwareConcurrency || 4;
    // Defer state update to avoid synchronous setState in effect
    queueMicrotask(() => {
      if (cores >= 8) {
        setParticleCount(200);
      } else if (cores >= 4) {
        setParticleCount(100);
      } else {
        setParticleCount(50);
      }
    });
  }, []);

  const registerSharedElement = useCallback(
    (id: string, rect: DOMRect, route: string) => {
      sharedElements.set(id, { id, rect, route });
    },
    [sharedElements]
  );

  const unregisterSharedElement = useCallback(
    (id: string) => {
      sharedElements.delete(id);
    },
    [sharedElements]
  );

  const hasMatchingSharedElements = useCallback(
    (targetRoute: string) => {
      const activeRoute = sourceRoute ?? currentRoute;
      // Check if any shared elements exist on both current and target route
      const currentRouteElements = Array.from(sharedElements.values()).filter(
        (el) => el.route === activeRoute
      );
      // For auto-detection, we assume shared elements with same ID will exist on target
      return currentRouteElements.length > 0 && targetRoute !== activeRoute;
    },
    [sharedElements, sourceRoute, currentRoute]
  );

  const startTransition = useCallback(async (from: string, to: string) => {
    setSourceRoute(from);
    setTargetRoute(to);
    setPhase("exiting");

    // Wait for exit animation - uses centralized timing
    await new Promise((resolve) => setTimeout(resolve, TIMING.exit));

    setPhase("transitioning");

    // Wait for morph/particle transition - uses centralized timing
    await new Promise((resolve) => setTimeout(resolve, TIMING.morph));

    setPhase("entering");
  }, []);

  const completeTransition = useCallback(() => {
    setPhase("idle");
    setSourceRoute(null);
    setTargetRoute(null);
  }, []);

  return (
    <TransitionContext.Provider
      value={{
        mode,
        setMode,
        phase,
        setPhase,
        sourceRoute,
        targetRoute,
        particleCount,
        sharedElements,
        registerSharedElement,
        unregisterSharedElement,
        startTransition,
        completeTransition,
        hasMatchingSharedElements,
      }}
    >
      {children}
    </TransitionContext.Provider>
  );
}

// Default context for when TransitionProvider is not present
const defaultContext: TransitionContextValue = {
  mode: "none",
  setMode: () => {},
  phase: "idle",
  setPhase: () => {},
  sourceRoute: null,
  targetRoute: null,
  particleCount: 0,
  sharedElements: new Map(),
  registerSharedElement: () => {},
  unregisterSharedElement: () => {},
  startTransition: async () => {},
  completeTransition: () => {},
  hasMatchingSharedElements: () => false,
};

export function useTransition() {
  const context = useContext(TransitionContext);
  // Return default context if provider is not present (graceful degradation)
  return context ?? defaultContext;
}
