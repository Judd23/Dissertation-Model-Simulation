/**
 * BootstrapDistribution.tsx
 * Part 2.3: Histogram showing bootstrap distribution with BCa intervals
 */

import { motion } from 'framer-motion';
import styles from './BootstrapDistribution.module.css';

interface BootstrapDistributionProps {
  className?: string;
}

// Simulated bootstrap distribution (bell-shaped)
const bars = [
  0.05, 0.08, 0.12, 0.18, 0.28, 0.42, 0.58, 0.75, 0.88, 0.95,
  1.0, 0.95, 0.88, 0.75, 0.58, 0.42, 0.28, 0.18, 0.12, 0.08, 0.05
];

export function BootstrapDistribution({ className }: BootstrapDistributionProps) {
  const lowerBoundIndex = 2;  // 2.5% position
  const upperBoundIndex = 18; // 97.5% position
  const peakIndex = 10;       // Point estimate

  return (
    <div className={`${styles.container} ${className || ''}`} role="img" aria-label="Bootstrap distribution histogram showing 2000 resamples with BCa confidence intervals">
      <div className={styles.histogram}>
        {/* Bars */}
        <div className={styles.barsWrapper}>
          {bars.map((height, i) => {
            const isInCI = i >= lowerBoundIndex && i <= upperBoundIndex;
            const isPeak = i === peakIndex;
            
            return (
              <motion.div
                key={i}
                className={`${styles.bar} ${isInCI ? styles.barInCI : ''} ${isPeak ? styles.barPeak : ''}`}
                initial={{ height: 0 }}
                whileInView={{ height: `${height * 100}%` }}
                viewport={{ once: true }}
                transition={{ 
                  duration: 0.4, 
                  delay: i * 0.03,
                  ease: "easeOut"
                }}
              />
            );
          })}
        </div>

        {/* CI Bounds */}
        <motion.div 
          className={`${styles.boundLine} ${styles.lowerBound}`}
          style={{ left: `${(lowerBoundIndex / bars.length) * 100}%` }}
          initial={{ opacity: 0, height: 0 }}
          whileInView={{ opacity: 1, height: '100%' }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          <span className={styles.boundLabel}>2.5%</span>
        </motion.div>
        
        <motion.div 
          className={`${styles.boundLine} ${styles.upperBound}`}
          style={{ left: `${(upperBoundIndex / bars.length) * 100}%` }}
          initial={{ opacity: 0, height: 0 }}
          whileInView={{ opacity: 1, height: '100%' }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.9 }}
        >
          <span className={styles.boundLabel}>97.5%</span>
        </motion.div>

        {/* Point estimate marker */}
        <motion.div 
          className={styles.pointEstimate}
          style={{ left: `${(peakIndex / bars.length) * 100}%` }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 1.0 }}
        >
          <span className={styles.pointLabel}>θ̂</span>
        </motion.div>
      </div>

      {/* Axis label */}
      <div className={styles.axisLabel}>Effect Size Distribution</div>

      {/* Stats summary */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>2,000</span>
          <span className={styles.statLabel}>Resamples</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>BCa</span>
          <span className={styles.statLabel}>Method</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>95%</span>
          <span className={styles.statLabel}>CI</span>
        </div>
      </div>
    </div>
  );
}

export default BootstrapDistribution;
