import { useState, useRef, useLayoutEffect, useId, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { DANCE_SPRING_HEAVY } from '../../lib/transitionConfig';
import styles from './GlossaryTerm.module.css';

interface GlossaryTermProps {
  term: string;
  definition: string;
  children: React.ReactNode;
}

export default function GlossaryTerm({ term, definition, children }: GlossaryTermProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom');
  const [coords, setCoords] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const termRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  // Detect touch device
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Close tooltip when tapping outside (touch devices)
  const handleClickOutside = useCallback((event: MouseEvent | TouchEvent) => {
    if (
      isOpen &&
      termRef.current &&
      !termRef.current.contains(event.target as Node) &&
      tooltipRef.current &&
      !tooltipRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isTouchDevice && isOpen) {
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('touchstart', handleClickOutside);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isTouchDevice, isOpen, handleClickOutside]);

  // Handle touch tap to toggle
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTouchDevice) {
      e.preventDefault();
      setIsOpen(prev => !prev);
    }
  };

  useLayoutEffect(() => {
    if (!isOpen || !termRef.current || !tooltipRef.current) return;

    const updatePosition = () => {
      if (!termRef.current || !tooltipRef.current) return;
      const termRect = termRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - termRect.bottom;
      const spaceAbove = termRect.top;

      const nextPosition =
        spaceBelow < tooltipRect.height + 12 && spaceAbove > tooltipRect.height + 12
          ? 'top'
          : 'bottom';
      setPosition(nextPosition);

      const top =
        nextPosition === 'bottom'
          ? termRect.bottom + 8
          : termRect.top - tooltipRect.height - 8;
      const left = termRect.left + termRect.width / 2 - tooltipRect.width / 2;
      const clampedLeft = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
      const clampedTop = Math.max(8, Math.min(top, window.innerHeight - tooltipRect.height - 8));

      setCoords({ left: clampedLeft, top: clampedTop });
    };

    // Measure after initial paint to avoid jitter from font loading.
    requestAnimationFrame(() => {
      requestAnimationFrame(updatePosition);
    });

    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  return (
    <span className={styles.container}>
      <motion.span
        ref={termRef}
        className={`${styles.term} interactiveSurface`}
        whileHover={{ y: -1, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={DANCE_SPRING_HEAVY}
        onMouseEnter={() => !isTouchDevice && setIsOpen(true)}
        onMouseLeave={() => !isTouchDevice && setIsOpen(false)}
        onTouchStart={handleTouchStart}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsOpen(false);
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`Definition: ${definition}`}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
      >
        {children}
        <span className={styles.indicator} aria-hidden="true">?</span>
      </motion.span>
      {isOpen &&
        createPortal(
          <motion.div
            ref={tooltipRef}
            className={`${styles.tooltip} ${styles[position]} glass-panel`}
            role="tooltip"
            id={tooltipId}
            style={{ left: coords.left, top: coords.top }}
            initial={{ opacity: 0, y: position === 'bottom' ? -8 : 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position === 'bottom' ? -8 : 8, scale: 0.96 }}
            transition={DANCE_SPRING_HEAVY}
          >
            <div className={styles.tooltipTerm}>{term}</div>
            <div className={styles.tooltipDefinition}>{definition}</div>
          </motion.div>,
          document.body
        )}
    </span>
  );
}
