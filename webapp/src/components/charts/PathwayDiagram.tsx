import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useResearch } from '../../context/ResearchContext';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../utils/colorScales';
import { formatNumber } from '../../utils/formatters';
import styles from './PathwayDiagram.module.css';

// Model coefficients with plain language descriptions
const modelData = {
  paths: [
    { 
      from: 'FASt', to: 'Distress', id: 'a1', estimate: 0.127, pvalue: 0.0007, label: 'a₁',
      title: 'FASt Status → Stress',
      description: 'Students with FASt status report slightly higher stress during their first year. This may reflect the challenge of balancing higher expectations.',
      finding: 'Significant increase'
    },
    { 
      from: 'FASt', to: 'Engagement', id: 'a2', estimate: -0.010, pvalue: 0.778, label: 'a₂',
      title: 'FASt Status → Engagement',
      description: 'FASt status alone doesn\'t significantly change how much students engage with campus life.',
      finding: 'No significant effect'
    },
    { 
      from: 'Distress', to: 'Adjustment', id: 'b1', estimate: -0.203, pvalue: 0, label: 'b₁',
      title: 'Stress → College Success',
      description: 'Higher stress strongly predicts lower adjustment. Students struggling with stress have a harder time thriving in college.',
      finding: 'Strong negative effect'
    },
    { 
      from: 'Engagement', to: 'Adjustment', id: 'b2', estimate: 0.160, pvalue: 0, label: 'b₂',
      title: 'Engagement → College Success',
      description: 'Students who engage more with campus activities, faculty, and peers adjust better to college life.',
      finding: 'Strong positive effect'
    },
    { 
      from: 'FASt', to: 'Adjustment', id: 'c', estimate: 0.041, pvalue: 0.002, label: "c'",
      title: 'Direct Benefit of FASt Status',
      description: 'Beyond the indirect effects through stress and engagement, FASt status provides a small but meaningful direct boost to college success.',
      finding: 'Small positive effect'
    },
  ],
  moderation: [
    { path: 'a1z', estimate: 0.003, pvalue: 0.854, label: 'a₁z' },
    { path: 'a2z', estimate: -0.014, pvalue: 0.319, label: 'a₂z' },
    { path: 'cz', estimate: -0.009, pvalue: 0.060, label: "c'z" },
  ],
};

// Node positions (relative coordinates, will be scaled)
const nodePositions: Record<string, { x: number; y: number }> = {
  FASt: { x: 0.12, y: 0.5 },
  Distress: { x: 0.5, y: 0.18 },
  Engagement: { x: 0.5, y: 0.82 },
  Adjustment: { x: 0.88, y: 0.5 },
  Dose: { x: 0.12, y: 0.12 },
};

// Node descriptions for tooltips
const nodeDescriptions: Record<string, { title: string; description: string }> = {
  FASt: {
    title: 'FASt Student Status',
    description: 'Students who earned 12+ college credits in high school before enrolling (First-year Accelerated Status).'
  },
  Distress: {
    title: 'Emotional Distress',
    description: 'A measure of stress, loneliness, exhaustion, and mental health challenges during the first year.'
  },
  Engagement: {
    title: 'Quality of Engagement',
    description: 'How much students interact with faculty, advisors, staff, and peers on campus.'
  },
  Adjustment: {
    title: 'Developmental Adjustment',
    description: 'Overall first-year success: sense of belonging, personal growth, support environment, and satisfaction.'
  },
  Dose: {
    title: 'Credit Dose (Moderator)',
    description: 'The number of transfer credits earned. More credits may intensify or weaken these effects.'
  }
};

interface TooltipContent {
  type: 'path' | 'node';
  title: string;
  description: string;
  estimate?: number;
  pvalue?: number;
  finding?: string;
}

interface PathwayDiagramProps {
  width?: number;
  height?: number;
  interactive?: boolean;
}

export default function PathwayDiagram({
  width = 700,
  height = 400,
  interactive = true,
}: PathwayDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { highlightedPath, setHighlightedPath } = useResearch();
  const { resolvedTheme } = useTheme();
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    content: TooltipContent;
  } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Get theme-aware colors
    const surfaceColor = getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim() || '#ffffff';
    const chartBg = getComputedStyle(document.documentElement).getPropertyValue('--color-chart-background').trim() || '#ffffff';

    // Add background FIRST for proper dark mode support
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', chartBg)
      .attr('rx', 8);

    // Create main group AFTER background
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Scale positions
    const scaledNodes = Object.entries(nodePositions).map(([id, pos]) => ({
      id,
      x: pos.x * innerWidth,
      y: pos.y * innerHeight,
    }));

    const getNode = (id: string) => scaledNodes.find((n) => n.id === id)!;

    // Draw moderation arrow from Dose to paths
    const doseNode = getNode('Dose');
    const fastNode = getNode('FASt');

    g.append('path')
      .attr('d', `M${doseNode.x},${doseNode.y} Q${doseNode.x + 50},${doseNode.y + 30} ${fastNode.x + 40},${fastNode.y - 20}`)
      .attr('fill', 'none')
      .attr('stroke', colors.credits)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,3')
      .attr('marker-end', 'url(#arrow-dose)');

    // Define arrow markers and filters
    const defs = svg.append('defs');

    // Glow filter for highlighted paths
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Arrow for paths
    ['distress', 'engagement', 'direct', 'dose'].forEach((type) => {
      defs
        .append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', type === 'distress' ? colors.distress :
              type === 'engagement' ? colors.engagement :
              type === 'dose' ? colors.credits : colors.nonfast);
    });

    // Draw paths
    const pathsGroup = g.append('g').attr('class', 'paths');

    modelData.paths.forEach((path) => {
      const from = getNode(path.from);
      const to = getNode(path.to);

      let pathType: 'distress' | 'engagement' | 'direct';
      if (path.id === 'a1' || path.id === 'b1') pathType = 'distress';
      else if (path.id === 'a2' || path.id === 'b2') pathType = 'engagement';
      else pathType = 'direct';

      const color = pathType === 'distress' ? colors.distress :
                   pathType === 'engagement' ? colors.engagement : colors.nonfast;

      const isHighlighted = !highlightedPath || highlightedPath === pathType;
      const opacity = isHighlighted ? 1 : 0.15;
      const strokeWidth = Math.max(2.5, Math.abs(path.estimate) * 12);

      // Calculate path - all straight lines
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const fromOffset = path.from === 'FASt' ? 52 : 58;
      const toOffset = path.to === 'Adjustment' ? 62 : 58;
      const offsetX1 = (dx / len) * fromOffset;
      const offsetY1 = (dy / len) * 32;
      const offsetX2 = (dx / len) * toOffset;
      const offsetY2 = (dy / len) * 32;
      const d = `M${from.x + offsetX1},${from.y + offsetY1} L${to.x - offsetX2},${to.y - offsetY2}`;

      const pathElement = pathsGroup
        .append('path')
        .attr('d', d)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', strokeWidth)
        .attr('stroke-linecap', 'round')
        .attr('opacity', opacity)
        .attr('marker-end', `url(#arrow-${pathType})`)
        .attr('cursor', interactive ? 'pointer' : 'default')
        .style('transition', 'opacity 0.2s ease, filter 0.2s ease');

      if (interactive) {
        pathElement
          .on('mouseenter', function(event) {
            d3.select(this)
              .attr('filter', 'url(#glow)')
              .attr('stroke-width', strokeWidth + 2);
            setHighlightedPath(pathType);
            setTooltip({
              show: true,
              x: event.clientX,
              y: event.clientY,
              content: { 
                type: 'path',
                title: path.title,
                description: path.description,
                estimate: path.estimate, 
                pvalue: path.pvalue,
                finding: path.finding
              },
            });
          })
          .on('mouseleave', function() {
            d3.select(this)
              .attr('filter', null)
              .attr('stroke-width', strokeWidth);
            setHighlightedPath(null);
            setTooltip(null);
          });
      }

      // Path coefficient label - position away from the line
      let labelX: number, labelY: number;
      if (path.id === 'a1') {
        // FASt → Distress: label above
        labelX = (from.x + to.x) / 2 - 20;
        labelY = (from.y + to.y) / 2 - 15;
      } else if (path.id === 'a2') {
        // FASt → Engagement: label below
        labelX = (from.x + to.x) / 2 - 20;
        labelY = (from.y + to.y) / 2 + 25;
      } else if (path.id === 'b1') {
        // Distress → Adjustment: label above
        labelX = (from.x + to.x) / 2;
        labelY = (from.y + to.y) / 2 - 15;
      } else if (path.id === 'b2') {
        // Engagement → Adjustment: label below
        labelX = (from.x + to.x) / 2;
        labelY = (from.y + to.y) / 2 + 25;
      } else {
        // Direct path c': label below center
        labelX = (from.x + to.x) / 2;
        labelY = from.y + 20;
      }

      // Add background rect for label readability
      const labelText = `${path.label} = ${formatNumber(path.estimate)}${path.pvalue < 0.05 ? '*' : ''}`;
      const textNode = pathsGroup
        .append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'var(--font-mono)')
        .attr('font-size', 11)
        .attr('font-weight', 500)
        .attr('fill', color)
        .attr('opacity', opacity)
        .text(labelText);

      // Add background for better readability
      const bbox = (textNode.node() as SVGTextElement)?.getBBox();
      if (bbox) {
        pathsGroup.insert('rect', 'text')
          .attr('x', bbox.x - 3)
          .attr('y', bbox.y - 1)
          .attr('width', bbox.width + 6)
          .attr('height', bbox.height + 2)
          .attr('fill', chartBg)
          .attr('opacity', opacity * 0.9);
      }
    });

    // Draw nodes
    const nodesGroup = g.append('g').attr('class', 'nodes');

    const nodeData = [
      { id: 'FASt', label: 'FASt\nStudent', color: colors.fast },
      { id: 'Distress', label: 'Emotional\nDistress', color: colors.distress },
      { id: 'Engagement', label: 'Campus\nEngagement', color: colors.engagement },
      { id: 'Adjustment', label: 'First-Year\nSuccess', color: colors.belonging },
      { id: 'Dose', label: 'Credit\nAmount', color: colors.credits },
    ];

    nodeData.forEach((node) => {
      const pos = getNode(node.id);
      const nodeG = nodesGroup.append('g')
        .attr('transform', `translate(${pos.x}, ${pos.y})`)
        .attr('cursor', interactive ? 'pointer' : 'default');

      // Add invisible hit area for better interaction
      nodeG.append('ellipse')
        .attr('rx', 60)
        .attr('ry', 40)
        .attr('fill', 'transparent');

      // Node circle/ellipse
      if (node.id === 'Dose') {
        nodeG
          .append('rect')
          .attr('x', -40)
          .attr('y', -22)
          .attr('width', 80)
          .attr('height', 44)
          .attr('rx', 8)
          .attr('fill', surfaceColor)
          .attr('stroke', node.color)
          .attr('stroke-width', 2.5)
          .attr('stroke-dasharray', '6,4');
      } else if (node.id === 'Adjustment') {
        // Double ellipse for latent outcome
        nodeG
          .append('ellipse')
          .attr('rx', 58)
          .attr('ry', 38)
          .attr('fill', surfaceColor)
          .attr('stroke', node.color)
          .attr('stroke-width', 3);
        nodeG
          .append('ellipse')
          .attr('rx', 50)
          .attr('ry', 30)
          .attr('fill', surfaceColor)
          .attr('stroke', node.color)
          .attr('stroke-width', 1.5);
      } else {
        nodeG
          .append('ellipse')
          .attr('rx', node.id === 'FASt' ? 48 : 52)
          .attr('ry', 32)
          .attr('fill', surfaceColor)
          .attr('stroke', node.color)
          .attr('stroke-width', 2.5);
      }

      // Add hover effect
      if (interactive) {
        nodeG
          .on('mouseenter', function(event) {
            d3.select(this).selectAll('ellipse, rect')
              .transition()
              .duration(150)
              .attr('stroke-width', 4);
            
            const desc = nodeDescriptions[node.id];
            setTooltip({
              show: true,
              x: event.clientX,
              y: event.clientY,
              content: {
                type: 'node',
                title: desc.title,
                description: desc.description
              }
            });
          })
          .on('mouseleave', function() {
            d3.select(this).selectAll('ellipse, rect')
              .transition()
              .duration(150)
              .attr('stroke-width', node.id === 'Adjustment' ? 3 : 2.5);
            setTooltip(null);
          });
      }

      // Node label
      const lines = node.label.split('\n');
      lines.forEach((line, i) => {
        nodeG
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', lines.length > 1 ? (i - 0.5) * 15 + 5 : 5)
          .attr('font-family', 'var(--font-body)')
          .attr('font-size', 12)
          .attr('font-weight', 600)
          .attr('fill', 'var(--color-text)')
          .attr('pointer-events', 'none')
          .text(line);
      });
    });

    // Add legend with better styling
    const legendBg = svg.append('g')
      .attr('transform', `translate(${width - 160}, 12)`);
    
    legendBg.append('rect')
      .attr('x', -8)
      .attr('y', -8)
      .attr('width', 150)
      .attr('height', 80)
      .attr('fill', chartBg)
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', 1)
      .attr('rx', 6)
      .attr('opacity', 0.95);

    const legend = legendBg.append('g');

    const legendItems = [
      { label: 'Stress route', color: colors.distress, desc: '(indirect)' },
      { label: 'Engagement route', color: colors.engagement, desc: '(indirect)' },
      { label: 'Direct benefit', color: colors.nonfast, desc: '' },
    ];

    legendItems.forEach((item, i) => {
      const itemG = legend.append('g').attr('transform', `translate(0, ${i * 22})`);
      itemG
        .append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 28)
        .attr('y2', 0)
        .attr('stroke', item.color)
        .attr('stroke-width', 3)
        .attr('stroke-linecap', 'round');
      itemG
        .append('circle')
        .attr('cx', 28)
        .attr('cy', 0)
        .attr('r', 3)
        .attr('fill', item.color);
      itemG
        .append('text')
        .attr('x', 36)
        .attr('y', 4)
        .attr('font-size', 11)
        .attr('font-weight', 500)
        .attr('fill', 'var(--color-text)')
        .text(item.label);
    });

  }, [width, height, highlightedPath, interactive, setHighlightedPath, resolvedTheme]);

  return (
    <div className={styles.container}>
      <svg ref={svgRef} width={width} height={height} className={styles.svg} />
      {tooltip?.show && (
        <div
          className={`${styles.tooltip} ${tooltip.content.type === 'path' ? styles.pathTooltip : styles.nodeTooltip}`}
          style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}
        >
          <div className={styles.tooltipTitle}>{tooltip.content.title}</div>
          <div className={styles.tooltipDescription}>{tooltip.content.description}</div>
          {tooltip.content.type === 'path' && (
            <>
              <div className={styles.tooltipStats}>
                <span className={styles.tooltipFinding}>{tooltip.content.finding}</span>
                <span className={styles.tooltipEffect}>
                  β = {formatNumber(tooltip.content.estimate!)}
                </span>
                <span className={styles.tooltipPvalue}>
                  {tooltip.content.pvalue! < 0.001 ? 'p < .001' : 
                   tooltip.content.pvalue! < 0.05 ? `p = ${tooltip.content.pvalue!.toFixed(3)}` :
                   'Not significant'}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
