import { useEffect, useState, useRef, useMemo } from 'react';
import styles from './StatCard.module.css';

interface StatCardProps {
  label: string | React.ReactNode;
  value: string | number;
  subtext?: string;
  color?: 'default' | 'positive' | 'negative' | 'accent';
  size?: 'small' | 'medium' | 'large';
  animate?: boolean;
}

// Parse a formatted string value to extract numeric part and format info
function parseFormattedValue(value: string | number): {
  numericValue: number | null;
  prefix: string;
  suffix: string;
  decimals: number;
  useLocale: boolean;
} {
  if (typeof value === 'number') {
    return {
      numericValue: value,
      prefix: '',
      suffix: '',
      decimals: Number.isInteger(value) ? 0 : String(value).split('.')[1]?.length || 0,
      useLocale: false,
    };
  }

  // Detect if number uses locale formatting (has commas)
  const useLocale = value.includes(',');

  // Extract prefix (like $, £) and suffix (like %, K, M)
  const match = value.match(/^([^0-9.-]*)([0-9,.-]+)([^0-9]*)$/);

  if (!match) {
    return { numericValue: null, prefix: '', suffix: '', decimals: 0, useLocale: false };
  }

  const [, prefix = '', numStr, suffix = ''] = match;
  const cleanNum = numStr.replace(/,/g, '');
  const numericValue = parseFloat(cleanNum);

  if (isNaN(numericValue)) {
    return { numericValue: null, prefix: '', suffix: '', decimals: 0, useLocale: false };
  }

  // Detect decimal places
  const decimalPart = cleanNum.split('.')[1];
  const decimals = decimalPart ? decimalPart.length : 0;

  return { numericValue, prefix, suffix, decimals, useLocale };
}

// Format number with the same format as original
function formatValue(
  value: number,
  decimals: number,
  prefix: string,
  suffix: string,
  useLocale: boolean
): string {
  let formatted: string;

  if (useLocale) {
    formatted = value.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } else {
    formatted = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
  }

  return `${prefix}${formatted}${suffix}`;
}

export default function StatCard({
  label,
  value,
  subtext,
  color = 'default',
  size = 'medium',
  animate = true,
}: StatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  // Parse the value once
  const parsed = useMemo(() => parseFormattedValue(value), [value]);

  const [displayValue, setDisplayValue] = useState<string>(() => {
    // Show 0 initially if animatable, otherwise show actual value
    if (animate && parsed.numericValue !== null) {
      return formatValue(0, parsed.decimals, parsed.prefix, parsed.suffix, parsed.useLocale);
    }
    return String(value);
  });

  useEffect(() => {
    // Reset animation state if value changes
    const newParsed = parseFormattedValue(value);

    // If not animatable, just show the value
    if (!animate || newParsed.numericValue === null) {
      setDisplayValue(String(value));
      return;
    }

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayValue(String(value));
      hasAnimated.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;

          const { numericValue, prefix, suffix, decimals, useLocale } = newParsed;
          if (numericValue === null) return;

          const duration = 1500; // ms - slightly longer for more dramatic effect
          const start = performance.now();
          const startValue = 0;
          const endValue = numericValue;

          const runAnimation = (currentTime: number) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out-expo for smooth, satisfying deceleration
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const current = startValue + (endValue - startValue) * eased;

            setDisplayValue(formatValue(current, decimals, prefix, suffix, useLocale));

            if (progress < 1) {
              requestAnimationFrame(runAnimation);
            } else {
              // Ensure final value is exact
              setDisplayValue(formatValue(endValue, decimals, prefix, suffix, useLocale));
            }
          };

          requestAnimationFrame(runAnimation);
        }
      },
      { threshold: 0.3, rootMargin: '0px 0px -50px 0px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [value, animate]);

  return (
    <div ref={cardRef} className={`${styles.card} ${styles[size]}`}>
      <div className={styles.label}>{label}</div>
      <div className={`${styles.value} ${styles[color]}`}>{displayValue}</div>
      {subtext && <div className={styles.subtext}>{subtext}</div>}
    </div>
  );
}
