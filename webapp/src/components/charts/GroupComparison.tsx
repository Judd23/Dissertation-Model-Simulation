import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useTheme } from '../../context/ThemeContext';
import { colors, getRaceColor } from '../../utils/colorScales';
import DataTimestamp from '../ui/DataTimestamp';
import styles from './GroupComparison.module.css';

// Sample group comparison data (would be imported from JSON)
const groupData: Record<string, Record<string, { groups: { label: string; estimate: number; se: number; pvalue: number; n: number }[] }>> = {
  race: {
    a1: {
      groups: [
        { label: 'Hispanic/Latino', estimate: 0.145, se: 0.052, pvalue: 0.005, n: 1850 },
        { label: 'White', estimate: 0.112, se: 0.068, pvalue: 0.098, n: 1200 },
        { label: 'Asian', estimate: 0.098, se: 0.071, pvalue: 0.168, n: 950 },
        { label: 'Black/African American', estimate: 0.165, se: 0.089, pvalue: 0.063, n: 550 },
        { label: 'Other/Multiracial', estimate: 0.108, se: 0.092, pvalue: 0.240, n: 450 },
      ],
    },
    a2: {
      groups: [
        { label: 'Hispanic/Latino', estimate: -0.015, se: 0.051, pvalue: 0.768, n: 1850 },
        { label: 'White', estimate: 0.008, se: 0.067, pvalue: 0.905, n: 1200 },
        { label: 'Asian', estimate: -0.032, se: 0.070, pvalue: 0.647, n: 950 },
        { label: 'Black/African American', estimate: 0.042, se: 0.088, pvalue: 0.633, n: 550 },
        { label: 'Other/Multiracial', estimate: -0.018, se: 0.091, pvalue: 0.843, n: 450 },
      ],
    },
  },
  firstgen: {
    a1: {
      groups: [
        { label: 'First-Gen', estimate: 0.138, se: 0.048, pvalue: 0.004, n: 2600 },
        { label: 'Continuing-Gen', estimate: 0.114, se: 0.052, pvalue: 0.028, n: 2400 },
      ],
    },
    a2: {
      groups: [
        { label: 'First-Gen', estimate: -0.022, se: 0.047, pvalue: 0.640, n: 2600 },
        { label: 'Continuing-Gen', estimate: 0.005, se: 0.051, pvalue: 0.922, n: 2400 },
      ],
    },
  },
  pell: {
    a1: {
      groups: [
        { label: 'Pell Eligible', estimate: 0.142, se: 0.047, pvalue: 0.003, n: 2500 },
        { label: 'Not Pell Eligible', estimate: 0.109, se: 0.053, pvalue: 0.039, n: 2500 },
      ],
    },
    a2: {
      groups: [
        { label: 'Pell Eligible', estimate: -0.018, se: 0.046, pvalue: 0.696, n: 2500 },
        { label: 'Not Pell Eligible', estimate: 0.002, se: 0.052, pvalue: 0.969, n: 2500 },
      ],
    },
  },
  sex: {
    a1: {
      groups: [
        { label: 'Women', estimate: 0.135, se: 0.046, pvalue: 0.003, n: 3000 },
        { label: 'Men', estimate: 0.115, se: 0.058, pvalue: 0.047, n: 2000 },
      ],
    },
    a2: {
      groups: [
        { label: 'Women', estimate: -0.008, se: 0.045, pvalue: 0.859, n: 3000 },
        { label: 'Men', estimate: -0.014, se: 0.057, pvalue: 0.806, n: 2000 },
      ],
    },
  },
  living: {
    a1: {
      groups: [
        { label: 'With Family', estimate: 0.128, se: 0.049, pvalue: 0.009, n: 2800 },
        { label: 'Off-Campus', estimate: 0.132, se: 0.068, pvalue: 0.052, n: 1200 },
        { label: 'On-Campus', estimate: 0.118, se: 0.072, pvalue: 0.101, n: 1000 },
      ],
    },
    a2: {
      groups: [
        { label: 'With Family', estimate: -0.012, se: 0.048, pvalue: 0.802, n: 2800 },
        { label: 'Off-Campus', estimate: 0.008, se: 0.067, pvalue: 0.905, n: 1200 },
        { label: 'On-Campus', estimate: -0.015, se: 0.071, pvalue: 0.833, n: 1000 },
      ],
    },
  },
};

interface GroupComparisonProps {
  grouping: 'race' | 'firstgen' | 'pell' | 'sex' | 'living';
  pathway: 'a1' | 'a2';
  width?: number;
  height?: number;
}

export default function GroupComparison({
  grouping,
  pathway,
  width = 600,
  height = 300,
}: GroupComparisonProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const data = groupData[grouping]?.[pathway]?.groups || [];
    if (data.length === 0) return;

    const margin = { top: 30, right: 120, bottom: 40, left: 150 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Get theme-aware colors
    const chartBg = getComputedStyle(document.documentElement).getPropertyValue('--color-chart-background').trim() || '#ffffff';
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--color-chart-grid').trim() || '#e0e0e0';
    const axisColor = getComputedStyle(document.documentElement).getPropertyValue('--color-chart-axis').trim() || '#cccccc';
    const textMutedColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text-muted').trim() || '#666666';

    // Add background for proper dark mode support
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', chartBg)
      .attr('rx', 8);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Scales
    const yScale = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, innerHeight])
      .padding(0.3);

    const xExtent = d3.extent(data.flatMap((d) => [d.estimate - 1.96 * d.se, d.estimate + 1.96 * d.se])) as [number, number];
    const xPadding = (xExtent[1] - xExtent[0]) * 0.2;
    const xScale = d3
      .scaleLinear()
      .domain([Math.min(xExtent[0] - xPadding, -0.15), Math.max(xExtent[1] + xPadding, 0.25)])
      .range([0, innerWidth]);

    // Zero reference line
    g.append('line')
      .attr('x1', xScale(0))
      .attr('x2', xScale(0))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', textMutedColor)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4');

    // Grid
    g.append('g')
      .call(d3.axisBottom(xScale).tickSize(innerHeight).tickFormat(() => ''))
      .call((g) => g.selectAll('line').attr('stroke', gridColor).attr('stroke-dasharray', '2,2'))
      .call((g) => g.select('.domain').remove());

    // Draw forest plot
    data.forEach((d) => {
      const y = yScale(d.label)! + yScale.bandwidth() / 2;
      const color = grouping === 'race' ? getRaceColor(d.label) :
                   d.pvalue < 0.05 ? colors.significant : colors.nonsignificant;

      // CI whisker
      g.append('line')
        .attr('x1', xScale(d.estimate - 1.96 * d.se))
        .attr('x2', xScale(d.estimate + 1.96 * d.se))
        .attr('y1', y)
        .attr('y2', y)
        .attr('stroke', color)
        .attr('stroke-width', 2);

      // CI caps
      g.append('line')
        .attr('x1', xScale(d.estimate - 1.96 * d.se))
        .attr('x2', xScale(d.estimate - 1.96 * d.se))
        .attr('y1', y - 6)
        .attr('y2', y + 6)
        .attr('stroke', color)
        .attr('stroke-width', 2);

      g.append('line')
        .attr('x1', xScale(d.estimate + 1.96 * d.se))
        .attr('x2', xScale(d.estimate + 1.96 * d.se))
        .attr('y1', y - 6)
        .attr('y2', y + 6)
        .attr('stroke', color)
        .attr('stroke-width', 2);

      // Point estimate
      g.append('circle')
        .attr('cx', xScale(d.estimate))
        .attr('cy', y)
        .attr('r', 8)
        .attr('fill', color)
        .attr('stroke', 'white')
        .attr('stroke-width', 2);

      // Value label
      g.append('text')
        .attr('x', innerWidth + 10)
        .attr('y', y)
        .attr('dy', '0.35em')
        .attr('font-family', 'var(--font-mono)')
        .attr('font-size', 11)
        .attr('fill', 'var(--color-text-muted)')
        .text(`${d.estimate.toFixed(3)}${d.pvalue < 0.05 ? '*' : ''}`);

      // N label
      g.append('text')
        .attr('x', innerWidth + 70)
        .attr('y', y)
        .attr('dy', '0.35em')
        .attr('font-size', 10)
        .attr('fill', 'var(--color-text-light)')
        .text(`n=${d.n.toLocaleString()}`);
    });

    // Y axis (group labels)
    g.append('g')
      .call(d3.axisLeft(yScale))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('line').remove())
      .call((g) =>
        g.selectAll('text')
          .attr('font-size', 12)
          .attr('fill', 'var(--color-text)')
      );

    // X axis
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(6))
      .call((g) => g.select('.domain').attr('stroke', axisColor))
      .call((g) => g.selectAll('line').attr('stroke', axisColor))
      .call((g) => g.selectAll('text').attr('fill', 'var(--color-text-muted)'));

    // X axis label
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 35)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--color-text-muted)')
      .attr('font-size', 12)
      .text('Effect Size (β)');

  }, [grouping, pathway, width, height, resolvedTheme]);

  return (
    <div className={styles.container}>
      <svg ref={svgRef} width={width} height={height} className={styles.svg} />
      <p className={styles.note}>
        * p &lt; .05. Error bars represent 95% confidence intervals.
      </p>
      <DataTimestamp />
    </div>
  );
}
