import styles from './Badge.module.css';

export type BadgeVariant = 'default' | 'positive' | 'negative' | 'accent' | 'warning' | 'muted';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Optional dot indicator before the text */
  showDot?: boolean;
  /** Makes the badge pill-shaped (full rounded corners) */
  pill?: boolean;
  /** Optional icon component to render before the text */
  icon?: React.ReactNode;
  /** Additional CSS class name */
  className?: string;
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  showDot = false,
  pill = false,
  icon,
  className = '',
}: BadgeProps) {
  const classes = [
    styles.badge,
    styles[variant],
    styles[size],
    pill ? styles.pill : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      {showDot && <span className={styles.dot} />}
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.text}>{children}</span>
    </span>
  );
}
