import { useEffect, useMemo, useRef, useState } from 'react';
import { useModelData } from '../../app/contexts';
import { colors } from '../../lib/colorScales';
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
  const { paths, totalEffectPath, modelSelections } = useModelData();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 520, height: 80 });

  const metrics = useMemo(() => {
    const a1 = paths.a1?.estimate ?? null;
    const b1 = paths.b1?.estimate ?? null;
    const a2 = paths.a2?.estimate ?? null;
    const b2 = paths.b2?.estimate ?? null;
    const c = paths.c?.estimate ?? null;

    const safeMul = (x: number | null, y: number | null) =>
      x !== null && y !== null && Number.isFinite(x) && Number.isFinite(y) ? x * y : null;

    const indirectStress = safeMul(a1, b1);
    const indirectEngagement = safeMul(a2, b2);
    const direct = Number.isFinite(c) ? c! : null;
    const hasData =
      Number.isFinite(indirectStress) ||
      Number.isFinite(indirectEngagement) ||
      Number.isFinite(direct);

    return {
      indirectStress: indirectStress ?? 0,
      indirectEngagement: indirectEngagement ?? 0,
      direct: direct ?? 0,
      hasData,
    };
  }, [paths]);

  const totalEffectEstimate = useMemo(() => {
    if (totalEffectPath && Number.isFinite(totalEffectPath.estimate)) {
      return totalEffectPath.estimate;
    }
    return null;
  }, [totalEffectPath]);

  const segments: Segment[] = useMemo(() => [
    { key: 'Stress (indirect)', value: metrics.indirectStress, color: colors.distress },
    { key: 'Engagement (indirect)', value: metrics.indirectEngagement, color: colors.engagement },
    { key: 'Direct', value: metrics.direct, color: colors.nonfast },
  ], [metrics]);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      const nextWidth = Math.max(280, Math.min(containerRef.current?.clientWidth || 520, 640));
      setDimensions({ width: nextWidth, height: 80 });
    };
    update();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(update);
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const { width, height, bars, zeroX, min, max } = useMemo(() => {
    const { width, height } = dimensions;
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
  }, [segments, dimensions]);

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.header}>
        <h3>Effect Decomposition</h3>
        <p>
          Structural paths: {modelSelections.structural.label}
        </p>
      </div>
      {!metrics.hasData && (
        <div className={styles.empty} role="status" aria-live="polite">
          Data not available for effect decomposition.
        </div>
      )}
      {metrics.hasData && (
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
      )}
      <div className={styles.legend}>
        {segments.map((segment) => (
          <div key={segment.key} className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: segment.color }} />
            <span className={styles.legendLabel}>{segment.key}</span>
            <span className={styles.legendValue}>
              {metrics.hasData ? segment.value.toFixed(2) : '—'}
            </span>
          </div>
        ))}
      </div>
      <div className={styles.total}>
        Total effect ({modelSelections.totalEffect.label}):{' '}
        <strong>
          {totalEffectEstimate !== null ? `${totalEffectEstimate >= 0 ? '+' : ''}${totalEffectEstimate.toFixed(2)}` : '—'}
        </strong>
      </div>
      <p className={styles.dataNote}>
        Data simulated for illustration. Total effect displayed from {modelSelections.totalEffect.label}.
      </p>
    </div>
  );
}
