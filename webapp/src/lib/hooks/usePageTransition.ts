import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTransition } from "../../app/contexts/TransitionContext";

type TransitionType = "particles" | "morph" | "auto" | "none";

interface NavigateOptions {
  transition?: TransitionType;
  replace?: boolean;
}

export function usePageTransition() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, startTransition } = useTransition();

  const navigateWithTransition = useCallback(
    async (to: string, options?: NavigateOptions) => {
      // Don't transition to same route
      if (location.pathname === to) return;

      // Skip animation if transition is 'none'
      if (options?.transition === "none") {
        navigate(to, { replace: options?.replace });
        return;
      }

      // Determine transition type
      let transitionType = options?.transition ?? mode;

      if (transitionType === "auto") {
        // Force morph transitions (no particle effect).
        transitionType = "morph";
      }

      // For morph transitions, Framer Motion handles it automatically
      if (transitionType === "morph") {
        navigate(to, { replace: options?.replace });
        return;
      }

      // For particle transitions, run the animation sequence
      await startTransition(location.pathname, to);
      navigate(to, { replace: options?.replace });
    },
    [location.pathname, navigate, mode, startTransition]
  );

  return {
    navigate: navigateWithTransition,
    currentRoute: location.pathname,
  };
}
