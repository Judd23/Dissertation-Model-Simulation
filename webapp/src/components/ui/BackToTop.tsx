import { useEffect, useState } from 'react';
import styles from './BackToTop.module.css';

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      className={`${styles.button} ${isVisible ? styles.visible : ''}`}
      onClick={handleClick}
      aria-label="Back to top"
    >
      <span className={styles.arrow} aria-hidden="true">↑</span>
      <span className={styles.label}>Top</span>
    </button>
  );
}
