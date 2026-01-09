import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { DANCE_SPRING_HEAVY } from '../../config/transitionConfig';
import styles from './PageTransition.module.css';

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion
    ? { duration: 0 }
    : DANCE_SPRING_HEAVY;

  return (
    <div className={styles.transitionWrap} aria-live="polite">
      <motion.div
        initial={{
          opacity: 0,
          scale: reduceMotion ? 1 : 0.98,
          y: reduceMotion ? 0 : 10,
          x: 0,
          rotateX: 0,
          rotateY: 0,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          x: 0,
          rotateX: 0,
          rotateY: 0,
        }}
        exit={{
          opacity: 0,
          scale: reduceMotion ? 1 : 0.985,
          y: reduceMotion ? 0 : -12,
          x: 0,
          rotateX: 0,
          rotateY: 0,
        }}
        transition={transition}
        className={styles.content}
      >
        {children}
      </motion.div>
    </div>
  );
}
