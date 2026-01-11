import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InteractiveSurface } from './InteractiveSurface';
import { DANCE_SPRING_HEAVY } from '../../lib/transitionConfig';
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={DANCE_SPRING_HEAVY}
        >
          <InteractiveSurface
            as="button"
            type="button"
            className={`${styles.button} ${styles.visible} interactiveSurface`}
            onClick={handleClick}
            aria-label="Back to top"
          >
            <span className={styles.arrow} aria-hidden="true">↑</span>
            <span className={styles.label}>Top</span>
          </InteractiveSurface>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
