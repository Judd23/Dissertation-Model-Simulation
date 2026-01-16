/**
 * PathDiagramMini.tsx
 * Part 2.2: Simplified SEM path diagram
 * Shows X → M₁ → Y, X → M₂ → Y, X → Y pathways
 */

import { motion } from 'framer-motion';
import styles from './PathDiagramMini.module.css';

interface PathDiagramMiniProps {
  className?: string;
}

export function PathDiagramMini({ className }: PathDiagramMiniProps) {
  return (
    <div className={`${styles.container} ${className || ''}`} role="img" aria-label="Path diagram showing direct and indirect effects through emotional distress and quality of engagement">
      <svg viewBox="0 0 320 200" className={styles.svg}>
        <defs>
          {/* Arrow markers */}
          <marker id="arrow-coral" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#f87171" />
          </marker>
          <marker id="arrow-cyan" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#06b6d4" />
          </marker>
          <marker id="arrow-violet" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#8b5cf6" />
          </marker>
        </defs>

        {/* Paths - animated on scroll */}
        {/* X → M1 (Stress) */}
        <motion.path
          d="M70,100 Q120,50 150,50"
          fill="none"
          stroke="#f87171"
          strokeWidth="2"
          markerEnd="url(#arrow-coral)"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
        
        {/* M1 → Y */}
        <motion.path
          d="M200,50 Q230,50 250,100"
          fill="none"
          stroke="#f87171"
          strokeWidth="2"
          markerEnd="url(#arrow-coral)"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        />

        {/* X → M2 (Engagement) */}
        <motion.path
          d="M70,100 Q120,150 150,150"
          fill="none"
          stroke="#06b6d4"
          strokeWidth="2"
          markerEnd="url(#arrow-cyan)"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        />
        
        {/* M2 → Y */}
        <motion.path
          d="M200,150 Q230,150 250,100"
          fill="none"
          stroke="#06b6d4"
          strokeWidth="2"
          markerEnd="url(#arrow-cyan)"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        />

        {/* X → Y (direct) */}
        <motion.path
          d="M70,100 L250,100"
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2"
          strokeDasharray="6,4"
          markerEnd="url(#arrow-violet)"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
        />

        {/* Nodes */}
        {/* X Node - Dual Credit */}
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <rect x="20" y="80" width="50" height="40" rx="6" className={styles.nodeX} />
          <text x="45" y="104" className={styles.nodeLabel}>Dual</text>
          <text x="45" y="116" className={styles.nodeLabel}>Credit</text>
        </motion.g>

        {/* M1 Node - Stress */}
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <ellipse cx="175" cy="50" rx="30" ry="22" className={styles.nodeM1} />
          <text x="175" y="54" className={styles.nodeLabel}>Stress</text>
        </motion.g>

        {/* M2 Node - Engagement */}
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <ellipse cx="175" cy="150" rx="30" ry="22" className={styles.nodeM2} />
          <text x="175" y="154" className={styles.nodeLabel}>Engage</text>
        </motion.g>

        {/* Y Node - Adjustment */}
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <rect x="250" y="80" width="50" height="40" rx="6" className={styles.nodeY} />
          <text x="275" y="104" className={styles.nodeLabel}>Adjust</text>
        </motion.g>
      </svg>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendLine} ${styles.legendCoral}`} />
          <span>Via Stress</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendLine} ${styles.legendCyan}`} />
          <span>Via Engagement</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendLine} ${styles.legendViolet}`} />
          <span>Direct</span>
        </div>
      </div>
    </div>
  );
}

export default PathDiagramMini;
