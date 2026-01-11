import { useEffect, useRef } from 'react';

// Global set to track elements that have been revealed (survives page navigation)
const revealedElements = new Set<string>();

interface ScrollRevealOptions {
  /** Intersection threshold (0-1). Default: 0.1 */
  threshold?: number;
  /** Root margin for earlier/later triggering. Default: '0px 0px -50px 0px' */
  rootMargin?: string;
  /** Only trigger once? Default: true */
  once?: boolean;
  /** Custom class to add when visible. Default: 'visible' */
  visibleClass?: string;
  /** Unique ID to track reveal state across navigations */
  id?: string;
}

/**
 * Hook for scroll-triggered reveal animations using Intersection Observer.
 * Returns a ref to attach to the element you want to animate.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const revealRef = useScrollReveal<HTMLDivElement>();
 *   return <div ref={revealRef} className="reveal">Content</div>;
 * }
 * ```
 */
export function useScrollReveal<T extends HTMLElement>(
  options: ScrollRevealOptions = {}
) {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    once = true,
    visibleClass = 'visible',
    id,
  } = options;

  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // If this element has a tracking ID and was already revealed, show immediately
    if (id && once && revealedElements.has(id)) {
      element.classList.add(visibleClass);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add(visibleClass);
          if (id) revealedElements.add(id);
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          element.classList.remove(visibleClass);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, once, visibleClass, id]);

  return ref;
}

/**
 * Hook for observing multiple elements at once (useful for staggered animations).
 * Adds 'visible' class to children when container enters viewport.
 *
 * @example
 * ```tsx
 * function CardGrid() {
 *   const containerRef = useStaggeredReveal<HTMLDivElement>();
 *   return (
 *     <div ref={containerRef} className="stagger-children">
 *       <div className="reveal">Card 1</div>
 *       <div className="reveal">Card 2</div>
 *       <div className="reveal">Card 3</div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useStaggeredReveal<T extends HTMLElement>(
  options: ScrollRevealOptions = {}
) {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    once = true,
    visibleClass = 'visible',
    id,
  } = options;

  const ref = useRef<T>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    // Get all reveal children
    const children = container.querySelectorAll('.reveal, .reveal-fade, .reveal-up, .reveal-scale, .reveal-left, .reveal-right');

    // If this container has a tracking ID and was already revealed, show immediately
    if (id && once && revealedElements.has(id)) {
      children.forEach((child) => {
        child.classList.add(visibleClass);
      });
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          children.forEach((child) => {
            child.classList.add(visibleClass);
          });
          if (id) revealedElements.add(id);
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          children.forEach((child) => {
            child.classList.remove(visibleClass);
          });
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, [threshold, rootMargin, once, visibleClass, id]);

  return ref;
}

/**
 * Hook to track scroll progress (0-1) for progress bars or parallax effects.
 *
 * @example
 * ```tsx
 * function Header() {
 *   const progress = useScrollProgress();
 *   return (
 *     <header>
 *       <div style={{ width: `${progress * 100}%` }} className="progress-bar" />
 *     </header>
 *   );
 * }
 * ```
 */
export function useScrollProgress() {
  const progressRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      progressRef.current = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;

      // Update CSS custom property for use in stylesheets
      document.documentElement.style.setProperty(
        '--scroll-progress',
        `${progressRef.current * 100}%`
      );
    };

    // Initial calculation
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return progressRef;
}

/**
 * Callback-based reveal for complex animations or integration with other libraries.
 *
 * @example
 * ```tsx
 * function Chart() {
 *   const ref = useRevealCallback<HTMLDivElement>((isVisible) => {
 *     if (isVisible) startChartAnimation();
 *   });
 *   return <div ref={ref}>Chart</div>;
 * }
 * ```
 */
export function useRevealCallback<T extends HTMLElement>(
  callback: (isVisible: boolean) => void,
  options: Omit<ScrollRevealOptions, 'visibleClass'> = {}
) {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    once = true,
  } = options;

  const ref = useRef<T>(null);
  const callbackRef = useRef(callback);
  
  // Update callback ref in effect to avoid ref access during render
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        callbackRef.current(entry.isIntersecting);
        if (entry.isIntersecting && once) {
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return ref;
}

export default useScrollReveal;
