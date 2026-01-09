/**
 * ScrollToTop.tsx
 * ===============
 * Legacy scroll-to-top on route change.
 * 
 * NOTE: With TransitionOrchestrator, smooth scrolling is handled via
 * onExitComplete callback. This component provides fallback instant scroll
 * for cases where orchestrator isn't used.
 * 
 * @link See TransitionOrchestrator.tsx for choreographed scrolling
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // Instant scroll as fallback - TransitionOrchestrator handles
    // smooth animated scroll via its onExitComplete callback.
    // This ensures scroll happens even if orchestrator isn't present.
    window.scrollTo({
      top: 0,
      behavior: 'auto',
    });
  }, [pathname, search, hash]);

  return null;
}
