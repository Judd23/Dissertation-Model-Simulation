/**
 * PackageStack.tsx
 * Part 2.6: Styled code block showing R/Python imports
 */

import { motion } from 'framer-motion';
import styles from './PackageStack.module.css';

interface PackageStackProps {
  className?: string;
}

const codeLines = [
  { num: 1, code: '# R Analysis Stack', type: 'comment' },
  { num: 2, code: 'library', args: '(lavaan)', type: 'function' },
  { num: 3, code: 'library', args: '(semTools)', type: 'function' },
  { num: 4, code: 'library', args: '(mice)', type: 'function' },
  { num: 5, code: 'library', args: '(WeightIt)', type: 'function' },
  { num: 6, code: '', type: 'blank' },
  { num: 7, code: '# Python Visualization', type: 'comment' },
  { num: 8, code: 'import', args: ' pandas as pd', type: 'import' },
  { num: 9, code: 'import', args: ' plotly.express as px', type: 'import' },
];

export function PackageStack({ className }: PackageStackProps) {
  return (
    <div className={`${styles.container} ${className || ''}`} role="img" aria-label="Code block showing R and Python packages used for analysis">
      {/* Terminal header */}
      <div className={styles.terminalHeader}>
        <div className={styles.terminalDots}>
          <span className={`${styles.dot} ${styles.dotRed}`} />
          <span className={`${styles.dot} ${styles.dotYellow}`} />
          <span className={`${styles.dot} ${styles.dotGreen}`} />
        </div>
        <span className={styles.terminalTitle}>analysis_packages.R</span>
      </div>

      {/* Code content */}
      <div className={styles.codeContent}>
        {codeLines.map((line, i) => (
          <motion.div
            key={line.num}
            className={styles.codeLine}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
          >
            <span className={styles.lineNumber}>{line.num}</span>
            {line.type === 'comment' && (
              <span className={styles.comment}>{line.code}</span>
            )}
            {line.type === 'function' && (
              <>
                <span className={styles.keyword}>{line.code}</span>
                <span className={styles.string}>{line.args}</span>
              </>
            )}
            {line.type === 'import' && (
              <>
                <span className={styles.keyword}>{line.code}</span>
                <span className={styles.plain}>{line.args}</span>
              </>
            )}
            {line.type === 'blank' && <span>&nbsp;</span>}
          </motion.div>
        ))}
      </div>

      {/* Footer badge */}
      <div className={styles.footer}>
        <span className={styles.githubLink}>
          <svg className={styles.githubIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          <span>Open Source</span>
        </span>
      </div>
    </div>
  );
}

export default PackageStack;
