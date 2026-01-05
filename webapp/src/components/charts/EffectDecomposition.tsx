import { useMemo } from 'react';
import { useModelData } from '../../context/ModelDataContext';
import { colors } from '../../utils/colorScales';
import styles from './EffectDecomposition.module.css';

export default function EffectDecomposition() {
  const { paths } = useModelData();

  const metrics = useMemo(() => {
    const indirectStress = (paths.a1?.estimate ?? 0) * (paths.b1?.estimate ?? 0);
    const indirectEngagement = (paths.a2?.estimate ?? 0) * (paths.b2?.estimate ?? 0);
    const direct = paths.c?.estimate ?? 0;
    const total = direct + indirectStress + indirectEngagement;

    return {
      indirectStress,
      indirectEngagement,
      direct,
      total,
    };
  }, [paths]);

  const segments = [
    { key: 'Stress (indirect)', value: metrics.indirectStress, color: colors.distress },
    { key: 'Engagement (indirect)', value: metrics.indirectEngagement, color: colors.engagement },
    { key: 'Direct', value: metrics.direct, color: colors.nonfast },
  ];

  const { width, height, bars, zeroX, min, max } = useMemo(() => {
    const width = 520;
    const height = 80;
    const positiveTotal = segments.filter((s) => s.value >= 0).reduce((sum, s) => sum + s.value, 0);
    const negativeTotal = segments.filter((s) => s.value < 0).reduce((sum, s) => sum + s.value, 0);
    const min = Math.min(0, negativeTotal);
    const max = Math.max(0, positiveTotal);
    const range = max - min || 1;
    const scale = (val: number) => ((val - min) / range) * width;

    let pos = 0;
    let neg = 0;
    const bars = segments.map((segment) => {
      if (segment.value >= 0) {
        const start = scale(pos);
        const end = scale(pos + segment.value);
        pos += segment.value;
        return { ...segment, x: start, width: end - start };
      }
      const start = scale(neg + segment.value);
      const end = scale(neg);
      neg += segment.value;
      return { ...segment, x: start, width: end - start };
    });

    return {
      width,
      height,
      bars,
      zeroX: scale(0),
      min,
      max,
    };
  }, [segments]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Effect Decomposition</h3>
        <p>
          Total effect = direct + indirect (stress) + indirect (engagement)
        </p>
      </div>
      <div className={styles.chart}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Effect decomposition chart">
          <line
            x1={zeroX}
            x2={zeroX}
            y1={10}
            y2={height - 10}
            stroke="var(--color-border)"
            strokeWidth="2"
          />
          {bars.map((bar) => (
            <rect
              key={bar.key}
              x={bar.x}
              y={22}
              width={Math.max(0, bar.width)}
              height={36}
              rx={6}
              fill={bar.color}
              opacity={0.85}
            />
          ))}
        </svg>
        <div className={styles.scale}>
          <span>{min.toFixed(2)}</span>
          <span>0</span>
          <span>{max.toFixed(2)}</span>
        </div>
      </div>
      <div className={styles.legend}>
        {segments.map((segment) => (
          <div key={segment.key} className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: segment.color }} />
            <span className={styles.legendLabel}>{segment.key}</span>
            <span className={styles.legendValue}>{segment.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className={styles.total}>
        Total effect: <strong>{metrics.total >= 0 ? '+' : ''}{metrics.total.toFixed(2)}</strong>
      </div>
    </div>
  );
}
