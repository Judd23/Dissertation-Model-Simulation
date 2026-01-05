import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const termRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

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
      <span
        ref={termRef}
        className={styles.term}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        tabIndex={0}
        role="button"
        aria-label={`Definition: ${definition}`}
      >
        {children}
        <span className={styles.indicator} aria-hidden="true">?</span>
      </span>
      {isOpen &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`${styles.tooltip} ${styles[position]}`}
            role="tooltip"
            style={{ left: coords.left, top: coords.top }}
          >
            <div className={styles.tooltipTerm}>{term}</div>
            <div className={styles.tooltipDefinition}>{definition}</div>
          </div>,
          document.body
        )}
    </span>
  );
}
