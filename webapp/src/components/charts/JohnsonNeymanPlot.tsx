import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import doseEffects from '../../data/doseEffects.json';
import styles from './JohnsonNeymanPlot.module.css';

interface JohnsonNeymanPlotProps {
  outcome: 'distress' | 'engagement';
  selectedDose?: number;
  width?: number;
  height?: number;
}

export default function JohnsonNeymanPlot({
  outcome,
  selectedDose = 24,
  width = 600,
  height = 350,
}: JohnsonNeymanPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Get the JN point for this outcome
  const jnPoint = useMemo(() => {
    const jn = doseEffects.johnsonNeymanPoints[outcome];
    if (outcome === 'engagement' && 'crossover' in jn) {
      return jn.crossover;
    }
    return null;
  }, [outcome]);

  // Process data
  const data = useMemo(() => {
    return doseEffects.effects.map((d) => ({
      dose: d.creditDose,
      effect: outcome === 'distress' ? d.distressEffect : d.engagementEffect,
      ciLower: outcome === 'distress' ? d.distressCI[0] : d.engagementCI[0],
      ciUpper: outcome === 'distress' ? d.distressCI[1] : d.engagementCI[1],
    }));
  }, [outcome]);

  // Colors
  const colors = useMemo(
    () => ({
      distress: {
        main: '#d62728',
        light: 'rgba(214, 39, 40, 0.15)',
        significant: 'rgba(214, 39, 40, 0.3)',
      },
      engagement: {
        main: '#1f77b4',
        light: 'rgba(31, 119, 180, 0.15)',
        significant: 'rgba(31, 119, 180, 0.3)',
      },
    }),
    []
  );

  const color = colors[outcome];

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 30, right: 30, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, 80])
      .range([0, innerWidth]);

    const yExtent = d3.extent(data.flatMap((d) => [d.ciLower, d.ciUpper, d.effect])) as [
      number,
      number
    ];
    const yPadding = (yExtent[1] - yExtent[0]) * 0.15;
    const yScale = d3
      .scaleLinear()
      .domain([Math.min(yExtent[0] - yPadding, -0.1), Math.max(yExtent[1] + yPadding, 0.1)])
      .range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', styles.grid)
      .selectAll('line')
      .data(yScale.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.5);

    // Zero line (reference)
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', 'var(--color-text-muted)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,4');

    // Significance regions
    if (jnPoint !== null) {
      // Non-significant region (before JN point)
      g.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', xScale(jnPoint))
        .attr('height', innerHeight)
        .attr('fill', 'var(--color-border-light)')
        .attr('opacity', 0.4);

      // Significant region (after JN point)
      g.append('rect')
        .attr('x', xScale(jnPoint))
        .attr('y', 0)
        .attr('width', innerWidth - xScale(jnPoint))
        .attr('height', innerHeight)
        .attr('fill', color.significant)
        .attr('opacity', 0.4);

      // JN point vertical line
      g.append('line')
        .attr('x1', xScale(jnPoint))
        .attr('x2', xScale(jnPoint))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', color.main)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '8,4');

      // JN point label
      g.append('text')
        .attr('x', xScale(jnPoint))
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('fill', color.main)
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .text(`JN Point: ${jnPoint} credits`);
    } else {
      // All significant (for distress)
      g.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', innerWidth)
        .attr('height', innerHeight)
        .attr('fill', color.significant)
        .attr('opacity', 0.3);
    }

    // Confidence interval area
    const areaGenerator = d3
      .area<(typeof data)[0]>()
      .x((d) => xScale(d.dose))
      .y0((d) => yScale(d.ciLower))
      .y1((d) => yScale(d.ciUpper))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', color.light)
      .attr('d', areaGenerator);

    // CI boundary lines
    const upperLine = d3
      .line<(typeof data)[0]>()
      .x((d) => xScale(d.dose))
      .y((d) => yScale(d.ciUpper))
      .curve(d3.curveMonotoneX);

    const lowerLine = d3
      .line<(typeof data)[0]>()
      .x((d) => xScale(d.dose))
      .y((d) => yScale(d.ciLower))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color.main)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,2')
      .attr('opacity', 0.6)
      .attr('d', upperLine);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color.main)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,2')
      .attr('opacity', 0.6)
      .attr('d', lowerLine);

    // Effect line
    const lineGenerator = d3
      .line<(typeof data)[0]>()
      .x((d) => xScale(d.dose))
      .y((d) => yScale(d.effect))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color.main)
      .attr('stroke-width', 3)
      .attr('d', lineGenerator);

    // Selected dose marker
    const interpolatedEffect =
      doseEffects.coefficients[outcome].main +
      ((selectedDose - 12) / 10) * doseEffects.coefficients[outcome].moderation;

    g.append('circle')
      .attr('cx', xScale(selectedDose))
      .attr('cy', yScale(interpolatedEffect))
      .attr('r', 8)
      .attr('fill', 'white')
      .attr('stroke', color.main)
      .attr('stroke-width', 3);

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(8).tickFormat((d) => `${d}`);
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.2f'));

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr('font-size', '12px')
      .attr('color', 'var(--color-text-muted)');

    g.append('g')
      .call(yAxis)
      .attr('font-size', '12px')
      .attr('color', 'var(--color-text-muted)');

    // Axis labels
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--color-text-muted)')
      .attr('font-size', '13px')
      .text('Transfer Credits');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--color-text-muted)')
      .attr('font-size', '13px')
      .text('Effect Size (β)');

    // Legend
    const legend = g.append('g').attr('transform', `translate(${innerWidth - 150}, 10)`);

    legend
      .append('rect')
      .attr('width', 145)
      .attr('height', 70)
      .attr('fill', 'var(--color-surface)')
      .attr('stroke', 'var(--color-border)')
      .attr('rx', 4);

    legend
      .append('line')
      .attr('x1', 10)
      .attr('x2', 30)
      .attr('y1', 20)
      .attr('y2', 20)
      .attr('stroke', color.main)
      .attr('stroke-width', 3);

    legend
      .append('text')
      .attr('x', 35)
      .attr('y', 24)
      .attr('font-size', '11px')
      .attr('fill', 'var(--color-text)')
      .text('Effect');

    legend
      .append('rect')
      .attr('x', 10)
      .attr('y', 35)
      .attr('width', 20)
      .attr('height', 10)
      .attr('fill', color.light);

    legend
      .append('text')
      .attr('x', 35)
      .attr('y', 44)
      .attr('font-size', '11px')
      .attr('fill', 'var(--color-text)')
      .text('95% CI');

    legend
      .append('line')
      .attr('x1', 10)
      .attr('x2', 30)
      .attr('y1', 58)
      .attr('y2', 58)
      .attr('stroke', 'var(--color-text-muted)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,4');

    legend
      .append('text')
      .attr('x', 35)
      .attr('y', 62)
      .attr('font-size', '11px')
      .attr('fill', 'var(--color-text)')
      .text('Zero (null)');
  }, [data, width, height, outcome, selectedDose, jnPoint, color]);

  const outcomeLabel = outcome === 'distress' ? 'Emotional Distress' : 'Campus Engagement';
  const interpretation = useMemo(() => {
    if (outcome === 'engagement' && jnPoint !== null) {
      return `The effect on ${outcomeLabel.toLowerCase()} becomes statistically significant at ${jnPoint} credits. Below this point, the confidence interval crosses zero.`;
    }
    return `The effect on ${outcomeLabel.toLowerCase()} is statistically significant across all credit levels—the confidence interval never crosses zero.`;
  }, [outcome, jnPoint, outcomeLabel]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          Johnson-Neyman Analysis: {outcomeLabel}
        </h3>
        <p className={styles.subtitle}>
          When does the effect become statistically significant?
        </p>
      </div>
      <svg ref={svgRef} width={width} height={height} className={styles.svg} />
      <div className={styles.interpretation}>
        <div className={styles.interpretationIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
        <p>{interpretation}</p>
      </div>
      {jnPoint !== null && (
        <div className={styles.regions}>
          <div className={styles.region}>
            <span className={styles.regionDot} style={{ background: 'var(--color-border)' }} />
            <span className={styles.regionLabel}>Not Significant</span>
            <span className={styles.regionRange}>0–{jnPoint} credits</span>
          </div>
          <div className={styles.region}>
            <span className={styles.regionDot} style={{ background: color.main }} />
            <span className={styles.regionLabel}>Significant</span>
            <span className={styles.regionRange}>{jnPoint}+ credits</span>
          </div>
        </div>
      )}
    </div>
  );
}
