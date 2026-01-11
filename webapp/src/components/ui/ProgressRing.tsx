import styles from './ProgressRing.module.css';

interface ProgressRingProps {
  label: string;
  value: number; // 0 to 1
  displayValue: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
}

export default function ProgressRing({
  label,
  value,
  displayValue,
  color = 'var(--color-accent)',
  size = 96,
  strokeWidth = 8,
}: ProgressRingProps) {
  const normalized = Math.min(Math.max(value, 0), 1);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - normalized);

  return (
    <div
      className={styles.ring}
      role="progressbar"
      aria-valuenow={normalized}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-label={label}
    >
      <svg width={size} height={size} className={styles.svg} aria-hidden="true">
        <circle
          className={styles.track}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className={styles.progress}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          style={{ stroke: color, strokeDasharray: circumference, strokeDashoffset: dashOffset }}
        />
      </svg>
      <div className={styles.value}>{displayValue}</div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
