import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useResearch } from '../../context/ResearchContext';
import { useTheme } from '../../context/ThemeContext';
import { useModelData } from '../../context/ModelDataContext';
import { colors } from '../../utils/colorScales';
import DataTimestamp from '../ui/DataTimestamp';
import styles from './DoseResponseCurve.module.css';

interface DoseResponseCurveProps {
  outcome: 'distress' | 'engagement' | 'adjustment';
  selectedDose: number;
}

export default function DoseResponseCurve({
  outcome,
  selectedDose,
}: DoseResponseCurveProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { showCIs } = useResearch();
  const { resolvedTheme } = useTheme();
  const { doseCoefficients } = useModelData();
  const [dimensions, setDimensions] = useState({ width: 500, height: 300 });

  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const width = Math.max(320, Math.min(containerWidth, 600));
        const height = Math.max(220, width * 0.6);
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Add background for proper dark mode support
    const chartBg = getComputedStyle(document.documentElement).getPropertyValue('--color-chart-background').trim() || '#ffffff';
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', chartBg)
      .attr('rx', 8);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Generate data points (from dynamic context)
    const coef = doseCoefficients[outcome];
    const doseRange = d3.range(0, 81, 1);
    const data = doseRange.map((dose) => {
      const doseUnits = (dose - 12) / 10;
      const effect = coef.main + doseUnits * coef.moderation;
      // Approximate CI based on SE (simplified)
      const ci = 1.96 * coef.se * (1 + Math.abs(doseUnits) * 0.1);
      return { dose, effect, ciLower: effect - ci, ciUpper: effect + ci };
    });

    // Scales
    const xScale = d3.scaleLinear().domain([0, 80]).range([0, innerWidth]);
    const yExtent = d3.extent(data.flatMap((d) => [d.ciLower, d.ciUpper])) as [number, number];
    const yPadding = (yExtent[1] - yExtent[0]) * 0.2;
    const yScale = d3
      .scaleLinear()
      .domain([Math.min(yExtent[0] - yPadding, -0.1), Math.max(yExtent[1] + yPadding, 0.3)])
      .range([innerHeight, 0]);

    // Color for this outcome
    const color = outcome === 'distress' ? colors.distress :
                 outcome === 'engagement' ? colors.engagement : colors.belonging;

    // Get CSS variable values for theming
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--color-chart-grid').trim() || '#e0e0e0';
    const axisColor = getComputedStyle(document.documentElement).getPropertyValue('--color-chart-axis').trim() || '#cccccc';

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).tickSize(-innerHeight).tickFormat(() => ''))
      .call((g) => g.selectAll('line').attr('stroke', gridColor).attr('stroke-dasharray', '2,2'))
      .call((g) => g.select('.domain').remove());

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(() => ''))
      .call((g) => g.selectAll('line').attr('stroke', gridColor).attr('stroke-dasharray', '2,2'))
      .call((g) => g.select('.domain').remove());

    if (showCIs) {
      const area = d3
        .area<(typeof data)[0]>()
        .x((d) => xScale(d.dose))
        .y0((d) => yScale(d.ciLower))
        .y1((d) => yScale(d.ciUpper))
        .curve(d3.curveMonotoneX);

      // CI ribbon fill
      g.append('path')
        .datum(data)
        .attr('fill', color)
        .attr('opacity', 0.15)
        .attr('d', area)
        .attr('class', 'ci-area');

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
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.5)
        .attr('d', upperLine);

      g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.5)
        .attr('d', lowerLine);
    }

    // Main line
    const line = d3
      .line<(typeof data)[0]>()
      .x((d) => xScale(d.dose))
      .y((d) => yScale(d.effect));

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 3)
      .attr('d', line);

    // Zero reference line
    const textMutedColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text-muted').trim() || '#666666';
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', textMutedColor)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4');

    // FASt threshold line
    g.append('line')
      .attr('x1', xScale(12))
      .attr('x2', xScale(12))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', colors.fast)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,3');

    g.append('text')
      .attr('x', xScale(12) + 5)
      .attr('y', 15)
      .attr('fill', colors.fast)
      .attr('font-size', 11)
      .text('FASt threshold');

    // Selected dose indicator
    const selectedData = data.find((d) => d.dose === selectedDose);
    if (selectedData) {
      g.append('circle')
        .attr('cx', xScale(selectedData.dose))
        .attr('cy', yScale(selectedData.effect))
        .attr('r', 8)
        .attr('fill', color)
        .attr('stroke', 'white')
        .attr('stroke-width', 2);

      g.append('text')
        .attr('x', xScale(selectedData.dose))
        .attr('y', yScale(selectedData.effect) - 15)
        .attr('text-anchor', 'middle')
        .attr('fill', color)
        .attr('font-family', 'var(--font-mono)')
        .attr('font-size', 12)
        .attr('font-weight', 600)
        .text(selectedData.effect.toFixed(3));
    }

    // Axes
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(8))
      .call((g) => g.select('.domain').attr('stroke', axisColor))
      .call((g) => g.selectAll('line').attr('stroke', axisColor))
      .call((g) => g.selectAll('text').attr('fill', 'var(--color-text-muted)'));

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(6))
      .call((g) => g.select('.domain').attr('stroke', axisColor))
      .call((g) => g.selectAll('line').attr('stroke', axisColor))
      .call((g) => g.selectAll('text').attr('fill', 'var(--color-text-muted)'));

    // Axis labels
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--color-text-muted)')
      .attr('font-size', 12)
      .text('Dual Enrollment Credits');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--color-text-muted)')
      .attr('font-size', 12)
      .text(`Effect on ${outcome === 'distress' ? 'Distress' : outcome === 'engagement' ? 'Engagement' : 'Adjustment'}`);

  }, [outcome, selectedDose, dimensions, showCIs, resolvedTheme, doseCoefficients]);

  return (
    <div ref={containerRef} className={styles.container}>
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className={styles.svg} />
      <DataTimestamp />
    </div>
  );
}
