/**
 * MeasurementModel.tsx
 * Part 2.4: CFA-style diagram showing latent variables and indicators
 */

import { motion } from 'framer-motion';
import styles from './MeasurementModel.module.css';

interface MeasurementModelProps {
  className?: string;
}

const constructs = [
  { 
    id: 'EmoDiss',
    label: 'Emotional\nDistress', 
    color: '#f87171',
    indicators: 6,
    shortLabel: 'Stress'
  },
  { 
    id: 'QualEngag',
    label: 'Quality of\nEngagement', 
    color: '#06b6d4',
    indicators: 5,
    shortLabel: 'Engage'
  },
  { 
    id: 'DevAdj',
    label: 'Developmental\nAdjustment', 
    color: '#8b5cf6',
    indicators: 15,
    shortLabel: 'Adjust'
  },
];

export function MeasurementModel({ className }: MeasurementModelProps) {
  return (
    <div className={`${styles.container} ${className || ''}`} role="img" aria-label="Measurement model showing three latent constructs with their survey indicators">
      <div className={styles.constructs}>
        {constructs.map((construct, i) => (
          <motion.div
            key={construct.id}
            className={styles.constructGroup}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
          >
            {/* Latent variable (ellipse) */}
            <div 
              className={styles.latent}
              style={{ 
                borderColor: construct.color,
                background: `${construct.color}15`
              }}
            >
              <span className={styles.latentLabel} style={{ color: construct.color }}>
                {construct.shortLabel}
              </span>
            </div>

            {/* Arrows connecting to indicators */}
            <div className={styles.arrows}>
              {Array.from({ length: Math.min(construct.indicators, 4) }).map((_, j) => (
                <motion.div
                  key={j}
                  className={styles.arrow}
                  style={{ background: construct.color }}
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.15 + j * 0.05 + 0.3 }}
                />
              ))}
              {construct.indicators > 4 && (
                <span className={styles.moreIndicator} style={{ color: construct.color }}>
                  +{construct.indicators - 4}
                </span>
              )}
            </div>

            {/* Indicator boxes */}
            <div className={styles.indicators}>
              {Array.from({ length: Math.min(construct.indicators, 4) }).map((_, j) => (
                <motion.div
                  key={j}
                  className={styles.indicator}
                  style={{ borderColor: `${construct.color}50` }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.15 + j * 0.05 + 0.4 }}
                >
                  <span className={styles.indicatorLabel}>Q{j + 1}</span>
                </motion.div>
              ))}
            </div>

            {/* Indicator count badge */}
            <div 
              className={styles.countBadge}
              style={{ background: construct.color }}
            >
              {construct.indicators} items
            </div>
          </motion.div>
        ))}
      </div>

      {/* Total summary */}
      <div className={styles.summary}>
        <span className={styles.summaryText}>26 survey items → 3 latent constructs</span>
      </div>
    </div>
  );
}

export default MeasurementModel;
