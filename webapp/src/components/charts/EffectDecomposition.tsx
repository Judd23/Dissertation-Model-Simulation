import { useMemo } from 'react';
import { useModelData } from '../../context/ModelDataContext';
import { colors } from '../../utils/colorScales';
import styles from './EffectDecomposition.module.css';

interface Segment {
  key: string;
  value: number;
  color: string;
}

interface Bar extends Segment {
  x: number;
  width: number;
}

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

  const segments: Segment[] = useMemo(() => [
    { key: 'Stress (indirect)', value: metrics.indirectStress, color: colors.distress },
    { key: 'Engagement (indirect)', value: metrics.indirectEngagement, color: colors.engagement },
    { key: 'Direct', value: metrics.direct, color: colors.nonfast },
  ], [metrics]);

  const { width, height, bars, zeroX, min, max } = useMemo(() => {
    const width = 520;
    const height = 80;
    const positiveTotal = segments.filter((s) => s.value >= 0).reduce((sum, s) => sum + s.value, 0);
    const negativeTotal = segments.filter((s) => s.value < 0).reduce((sum, s) => sum + s.value, 0);
    const min = Math.min(0, negativeTotal);
    const max = Math.max(0, positiveTotal);
    const range = max - min || 1;
    const scale = (val: number) => ((val - min) / range) * width;

    // Separate positive and negative segments for proper stacking
    const positiveSegments = segments.filter((s) => s.value >= 0);
    const negativeSegments = segments.filter((s) => s.value < 0);

    const bars: Bar[] = [];

    // Stack positive segments from zero going right
    let posOffset = 0;
    for (const segment of positiveSegments) {
      const start = scale(posOffset);
      const end = scale(posOffset + segment.value);
      bars.push({ ...segment, x: start, width: end - start });
      posOffset += segment.value;
    }

    // Stack negative segments from zero going left
    let negOffset = 0;
    for (const segment of negativeSegments) {
      const start = scale(negOffset + segment.value);
      const end = scale(negOffset);
      bars.push({ ...segment, x: start, width: end - start });
      negOffset += segment.value;
    }

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
