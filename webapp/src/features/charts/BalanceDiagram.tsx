/**
 * BalanceDiagram.tsx
 * Part 2.1: Visual showing covariate balance before/after PSW
 * Shows FASt vs non-FASt groups with bar heights representing covariate means
 */

import { motion } from 'framer-motion';
import styles from './BalanceDiagram.module.css';

interface BalanceDiagramProps {
  className?: string;
}

const covariates = [
  { label: 'GPA', before: { fast: 0.85, nonfast: 0.55 }, after: { fast: 0.72, nonfast: 0.70 } },
  { label: 'Parent Ed', before: { fast: 0.70, nonfast: 0.45 }, after: { fast: 0.58, nonfast: 0.56 } },
  { label: 'Pell', before: { fast: 0.40, nonfast: 0.65 }, after: { fast: 0.52, nonfast: 0.54 } },
  { label: 'AP/CL', before: { fast: 0.75, nonfast: 0.35 }, after: { fast: 0.55, nonfast: 0.53 } },
];

export function BalanceDiagram({ className }: BalanceDiagramProps) {
  return (
    <div className={`${styles.container} ${className || ''}`} role="img" aria-label="Covariate balance diagram showing how propensity score weighting creates comparable groups">
      <div className={styles.panels}>
        {/* Before Panel */}
        <div className={styles.panel}>
          <div className={styles.panelLabel}>Before Weighting</div>
          <div className={styles.barsContainer}>
            {covariates.map((cov, i) => (
              <div key={cov.label} className={styles.barGroup}>
                <div className={styles.barPair}>
                  <motion.div
                    className={`${styles.bar} ${styles.barFast}`}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${cov.before.fast * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                  />
                  <motion.div
                    className={`${styles.bar} ${styles.barNonfast}`}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${cov.before.nonfast * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.1 + 0.05 }}
                  />
                </div>
                <span className={styles.barLabel}>{cov.label}</span>
              </div>
            ))}
          </div>
          <div className={styles.imbalanceIndicator}>
            <span className={styles.imbalanceIcon}>⚠</span>
            <span>Imbalanced</span>
          </div>
        </div>

        {/* Arrow */}
        <div className={styles.arrow}>
          <svg width="32" height="24" viewBox="0 0 32 24" fill="none" aria-hidden="true">
            <path d="M2 12h24M20 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className={styles.arrowLabel}>PSW</span>
        </div>

        {/* After Panel */}
        <div className={styles.panel}>
          <div className={styles.panelLabel}>After Weighting</div>
          <div className={styles.barsContainer}>
            {covariates.map((cov, i) => (
              <div key={cov.label} className={styles.barGroup}>
                <div className={styles.barPair}>
                  <motion.div
                    className={`${styles.bar} ${styles.barFast}`}
                    initial={{ height: `${cov.before.fast * 100}%` }}
                    whileInView={{ height: `${cov.after.fast * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                  />
                  <motion.div
                    className={`${styles.bar} ${styles.barNonfast}`}
                    initial={{ height: `${cov.before.nonfast * 100}%` }}
                    whileInView={{ height: `${cov.after.nonfast * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.5 + i * 0.1 + 0.05 }}
                  />
                </div>
                <span className={styles.barLabel}>{cov.label}</span>
              </div>
            ))}
          </div>
          <div className={styles.balanceIndicator}>
            <span className={styles.balanceIcon}>✓</span>
            <span>Balanced</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendFast}`} />
          <span>FASt Students</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendNonfast}`} />
          <span>Non-FASt Students</span>
        </div>
      </div>
    </div>
  );
}

export default BalanceDiagram;
