import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useTheme } from '../../context/ThemeContext';
import { getRaceColor, getSignificanceColor } from '../../utils/colorScales';
import DataTimestamp from '../ui/DataTimestamp';
import groupComparisons from '../../data/groupComparisons.json';
import sampleDescriptives from '../../data/sampleDescriptives.json';
import styles from './GroupComparison.module.css';

// Build group data from pipeline output + sample descriptives for sample sizes
const buildGroupData = () => {
  const demographics = sampleDescriptives.demographics;
  const raceData = groupComparisons.byRace;
  
  // Sample sizes from descriptives
  const raceSizes: Record<string, number> = {
    'Hispanic/Latino': demographics.race['Hispanic/Latino'].n,
    'White': demographics.race['White'].n,
    'Asian': demographics.race['Asian'].n,
    'Black/African American': demographics.race['Black/African American'].n,
    'Other/Multiracial': demographics.race['Other/Multiracial/Unknown'].n,
  };
  
  // Build race group data from pipeline
  const raceGroups = {
    a1: {
      groups: raceData.groups.map(g => ({
        label: g.label,
        estimate: g.effects.a1.estimate,
        se: g.effects.a1.se,
        pvalue: g.effects.a1.pvalue,
        n: raceSizes[g.label] || 0
      }))
    },
    a2: {
      groups: raceData.groups.map(g => ({
        label: g.label,
        estimate: g.effects.a2.estimate,
        se: g.effects.a2.se,
        pvalue: g.effects.a2.pvalue,
        n: raceSizes[g.label] || 0
      }))
    }
  };

  // Other groupings use sample data (until MG models are run for these)
  return {
    race: raceGroups,
    firstgen: {
      a1: {
        groups: [
          { label: 'First-Gen', estimate: 0.138, se: 0.048, pvalue: 0.004, n: demographics.firstgen.yes.n },
          { label: 'Continuing-Gen', estimate: 0.114, se: 0.052, pvalue: 0.028, n: demographics.firstgen.no.n },
        ],
      },
      a2: {
        groups: [
          { label: 'First-Gen', estimate: -0.022, se: 0.047, pvalue: 0.640, n: demographics.firstgen.yes.n },
          { label: 'Continuing-Gen', estimate: 0.005, se: 0.051, pvalue: 0.922, n: demographics.firstgen.no.n },
        ],
      },
    },
    pell: {
      a1: {
        groups: [
          { label: 'Pell Eligible', estimate: 0.142, se: 0.047, pvalue: 0.003, n: demographics.pell.yes.n },
          { label: 'Not Pell Eligible', estimate: 0.109, se: 0.053, pvalue: 0.039, n: demographics.pell.no.n },
        ],
      },
      a2: {
        groups: [
          { label: 'Pell Eligible', estimate: -0.018, se: 0.046, pvalue: 0.696, n: demographics.pell.yes.n },
          { label: 'Not Pell Eligible', estimate: 0.002, se: 0.052, pvalue: 0.969, n: demographics.pell.no.n },
        ],
      },
    },
    sex: {
      a1: {
        groups: [
          { label: 'Women', estimate: 0.135, se: 0.046, pvalue: 0.003, n: demographics.sex.women.n },
          { label: 'Men', estimate: 0.115, se: 0.058, pvalue: 0.047, n: demographics.sex.men.n },
        ],
      },
      a2: {
        groups: [
          { label: 'Women', estimate: -0.008, se: 0.045, pvalue: 0.859, n: demographics.sex.women.n },
          { label: 'Men', estimate: -0.014, se: 0.057, pvalue: 0.806, n: demographics.sex.men.n },
        ],
      },
    },
    living: {
      a1: {
        groups: [
          { label: 'With Family', estimate: 0.128, se: 0.049, pvalue: 0.009, n: 2360 },
          { label: 'Off-Campus', estimate: 0.132, se: 0.068, pvalue: 0.052, n: 1315 },
          { label: 'On-Campus', estimate: 0.118, se: 0.072, pvalue: 0.101, n: 1325 },
        ],
      },
      a2: {
        groups: [
          { label: 'With Family', estimate: -0.012, se: 0.048, pvalue: 0.802, n: 2360 },
          { label: 'Off-Campus', estimate: 0.008, se: 0.067, pvalue: 0.905, n: 1315 },
          { label: 'On-Campus', estimate: -0.015, se: 0.071, pvalue: 0.833, n: 1325 },
        ],
      },
    },
  };
};

const groupData = buildGroupData();

interface GroupComparisonProps {
  grouping: 'race' | 'firstgen' | 'pell' | 'sex' | 'living';
  pathway: 'a1' | 'a2';
}

export default function GroupComparison({
  grouping,
  pathway,
}: GroupComparisonProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    estimate: number;
    se: number;
    pvalue: number;
    n: number;
  } | null>(null);

  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // Maintain aspect ratio of 2:1, with min width 300
        const width = Math.max(300, Math.min(containerWidth, 600));
        const height = Math.max(200, width * 0.5);
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

    const data = groupData[grouping]?.[pathway]?.groups || [];
    if (data.length === 0) return;

    // Responsive margins
    const isMobile = width < 400;
    const margin = {
      top: 30,
      right: isMobile ? 80 : 120,
      bottom: 40,
      left: isMobile ? 100 : 150
    };
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
      const color = grouping === 'race' ? getRaceColor(d.label) : getSignificanceColor(d.pvalue);

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
      const point = g.append('circle')
        .attr('cx', xScale(d.estimate))
        .attr('cy', y)
        .attr('r', 8)
        .attr('fill', color)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .attr('cursor', 'pointer');

      point
        .on('mouseenter', (event) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          setTooltip({
            x: event.clientX - rect.left + 12,
            y: event.clientY - rect.top + 12,
            label: d.label,
            estimate: d.estimate,
            se: d.se,
            pvalue: d.pvalue,
            n: d.n,
          });
        })
        .on('mouseleave', () => setTooltip(null));

      // Value label
      g.append('text')
        .attr('x', innerWidth + 10)
        .attr('y', y)
        .attr('dy', '0.35em')
        .attr('font-family', 'var(--font-mono)')
        .attr('font-size', isMobile ? 9 : 11)
        .attr('fill', 'var(--color-text-muted)')
        .text(`${d.estimate.toFixed(3)}${d.pvalue < 0.05 ? '*' : ''}`);

      // N label (hide on very small screens)
      if (!isMobile) {
        g.append('text')
          .attr('x', innerWidth + 70)
          .attr('y', y)
          .attr('dy', '0.35em')
          .attr('font-size', 10)
          .attr('fill', 'var(--color-text-light)')
          .text(`n=${d.n.toLocaleString()}`);
      }
    });

    // Y axis (group labels)
    g.append('g')
      .call(d3.axisLeft(yScale))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('line').remove())
      .call((g) =>
        g.selectAll('text')
          .attr('font-size', isMobile ? 10 : 12)
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

  }, [grouping, pathway, dimensions, resolvedTheme]);

  return (
    <div ref={containerRef} className={styles.container}>
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className={styles.svg} />
      {tooltip && (
        <div className={styles.tooltip} style={{ left: tooltip.x, top: tooltip.y }}>
          <div className={styles.tooltipTitle}>{tooltip.label}</div>
          <div className={styles.tooltipRow}>Effect: {tooltip.estimate.toFixed(3)}</div>
          <div className={styles.tooltipRow}>SE: {tooltip.se.toFixed(3)}</div>
          <div className={styles.tooltipRow}>p: {tooltip.pvalue.toFixed(3)}</div>
          <div className={styles.tooltipRow}>n: {tooltip.n.toLocaleString()}</div>
        </div>
      )}
      <p className={styles.note}>
        * p &lt; .05. Error bars represent 95% confidence intervals.
      </p>
      <DataTimestamp />
    </div>
  );
}
