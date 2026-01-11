import { useEffect, useRef, useState } from 'react';

interface ParallaxOptions {
  speed?: number;
  max?: number;
  disabled?: boolean;
}

export default function useParallax({ speed = 0.15, max = 40, disabled = false }: ParallaxOptions = {}) {
  const [offset, setOffset] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (disabled) {
      // Defer state update to avoid synchronous setState in effect
      queueMicrotask(() => setOffset(0));
      return;
    }

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        const y = window.scrollY || window.pageYOffset || 0;
        const mobileMax = window.innerWidth < 480 ? max * 0.5 : window.innerWidth < 640 ? max * 0.65 : max;
        const next = Math.max(-mobileMax, Math.min(mobileMax, y * speed));
        setOffset(next);
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [speed, max, disabled]);

  return offset;
}
