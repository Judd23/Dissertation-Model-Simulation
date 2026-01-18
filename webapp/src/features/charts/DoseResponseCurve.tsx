import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResearch, useTheme, useModelData } from '../../app/contexts';
import { colors } from '../../lib/colorScales';
import DataTimestamp from '../../components/ui/DataTimestamp';
import styles from './DoseResponseCurve.module.css';

interface DoseResponseCurveProps {
  outcome: 'distress' | 'engagement' | 'adjustment';
  selectedDose: number;
}

export default function DoseResponseCurve({
  outcome,
  selectedDose,
}: DoseResponseCurveProps) {
  const tooltipId = `dose-response-tooltip-${outcome}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { showCIs } = useResearch();
  const { resolvedTheme } = useTheme();
  const { doseCoefficients } = useModelData();
  console.log('(NO $) [DoseResponseCurve] data snapshot:', {
    outcome,
    showCIs,
    main: doseCoefficients[outcome].main,
    moderation: doseCoefficients[outcome].moderation,
    se: doseCoefficients[outcome].se,
  });
  const [dimensions, setDimensions] = useState({ width: 500, height: 300 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    dose: number;
    effect: number;
    ciLower: number;
    ciUpper: number;
  } | null>(null);
  const outcomeColor =
    outcome === 'distress' ? colors.distress :
    outcome === 'engagement' ? colors.engagement : colors.belonging;
  const data = useMemo(() => {
    const coef = doseCoefficients[outcome];
    const doseRange = d3.range(0, 81, 1);
    return doseRange.map((dose) => {
      const doseUnits = (dose - 12) / 10;
      const effect = coef.main + doseUnits * coef.moderation;
      const ci = 1.96 * coef.se * (1 + Math.abs(doseUnits) * 0.1);
      return { dose, effect, ciLower: effect - ci, ciUpper: effect + ci };
    });
  }, [doseCoefficients, outcome]);

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

    // Scales
    const xScale = d3.scaleLinear().domain([0, 80]).range([0, innerWidth]);
    const yExtent = d3.extent(data.flatMap((d) => [d.ciLower, d.ciUpper])) as [number, number];
    const yPadding = (yExtent[1] - yExtent[0]) * 0.2;
    const yScale = d3
      .scaleLinear()
      .domain([Math.min(yExtent[0] - yPadding, -0.1), Math.max(yExtent[1] + yPadding, 0.3)])
      .range([innerHeight, 0]);

    // Color for this outcome - reuse outcomeColor from component scope
    const color = outcomeColor;

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
        .attr('opacity', 0)
        .attr('d', area)
        .attr('class', 'ci-area')
        .transition()
        .delay(300)
        .duration(600)
        .attr('opacity', 0.15);

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
        .attr('opacity', 0)
        .attr('d', upperLine)
        .transition()
        .delay(300)
        .duration(600)
        .attr('opacity', 0.5);

      g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0)
        .attr('d', lowerLine)
        .transition()
        .delay(300)
        .duration(600)
        .attr('opacity', 0.5);
    }

    // Main line
    const line = d3
      .line<(typeof data)[0]>()
      .x((d) => xScale(d.dose))
      .y((d) => yScale(d.effect));

    const mainLine = g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 3)
      .attr('d', line);

    // Stroke draw-on animation
    const totalLength = (mainLine.node() as SVGPathElement)?.getTotalLength() || 0;
    mainLine
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .delay(400)
      .duration(800)
      .ease(d3.easeQuadOut)
      .attr('stroke-dashoffset', 0);

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

    if (outcome === 'engagement') {
      const isCompact = innerWidth < 360;
      const sweetStart = 12;
      const sweetEnd = 35;
      const diminishStart = 36;
      const labelY = 28;

      g.append('line')
        .attr('x1', xScale(diminishStart))
        .attr('x2', xScale(diminishStart))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', colors.engagement)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '6,4')
        .attr('opacity', 0.6);

      g.append('text')
        .attr('x', xScale((sweetStart + sweetEnd) / 2))
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('fill', colors.engagement)
        .attr('font-size', 11)
        .attr('font-weight', 600)
        .text(isCompact ? 'Sweet spot' : 'Sweet spot (12–35)');

      g.append('text')
        .attr('x', xScale((diminishStart + 80) / 2))
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('fill', colors.engagement)
        .attr('font-size', 11)
        .attr('font-weight', 600)
        .text(isCompact ? 'Diminishing' : 'Diminishing returns');
    }

    // Selected dose indicator
    const selectedData = data.find((d) => d.dose === selectedDose);
    if (selectedData) {
      g.append('circle')
        .attr('cx', xScale(selectedData.dose))
        .attr('cy', yScale(selectedData.effect))
        .attr('r', 0)
        .attr('fill', color)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .transition()
        .delay(900)
        .duration(400)
        .ease(d3.easeBackOut.overshoot(1.5))
        .attr('r', 8);

      g.append('text')
        .attr('x', xScale(selectedData.dose))
        .attr('y', yScale(selectedData.effect) - 15)
        .attr('text-anchor', 'middle')
        .attr('fill', color)
        .attr('font-family', 'var(--font-mono)')
        .attr('font-size', 12)
        .attr('font-weight', 600)
        .attr('opacity', 0)
        .text(selectedData.effect.toFixed(3))
        .transition()
        .delay(900)
        .duration(400)
        .attr('opacity', 1);
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

    const overlay = g.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair')
      .attr('tabindex', 0)
      .attr('role', 'img')
      .attr(
        'aria-label',
        `Dose-response chart for ${outcome}. Focus to read values at the selected dose.`
      )
      .attr('aria-describedby', tooltipId);

    const showTooltipForDose = (dose: number) => {
      const point = data.find((d) => d.dose === dose);
      if (!point) return;
      setTooltip({
        x: margin.left + xScale(point.dose) + 12,
        y: margin.top + yScale(point.effect) + 12,
        dose: point.dose,
        effect: point.effect,
        ciLower: point.ciLower,
        ciUpper: point.ciUpper,
      });
    };

    overlay
      .on('mousemove', (event) => {
        const [x] = d3.pointer(event);
        const dose = Math.max(0, Math.min(80, Math.round(xScale.invert(x))));
        const point = data[dose];
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect || !point) return;
        setTooltip({
          x: event.clientX - rect.left + 12,
          y: event.clientY - rect.top + 12,
          dose: point.dose,
          effect: point.effect,
          ciLower: point.ciLower,
          ciUpper: point.ciUpper,
        });
      })
      .on('mouseleave', () => setTooltip(null))
      .on('focus', () => showTooltipForDose(selectedDose))
      .on('blur', () => setTooltip(null))
      .on('keydown', (event) => {
        if (event.key === 'Escape') {
          setTooltip(null);
        }
      });

  }, [outcome, selectedDose, dimensions, showCIs, resolvedTheme, doseCoefficients, data, tooltipId, outcomeColor]);

  return (
    <div ref={containerRef} className={styles.container}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className={styles.svg}
        role="img"
        aria-label="Dose-response curve showing how treatment effects change with credit dose"
      />
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x, top: tooltip.y }}
          id={tooltipId}
          role="tooltip"
          aria-live="polite"
        >
          <div className={styles.tooltipTitle}>{tooltip.dose} credits</div>
          <div className={styles.tooltipRow}>Effect: {tooltip.effect.toFixed(3)}</div>
          {showCIs && (
            <div className={styles.tooltipRow}>
              95% CI: {tooltip.ciLower.toFixed(3)} to {tooltip.ciUpper.toFixed(3)}
            </div>
          )}
        </div>
      )}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendLine} style={{ background: outcomeColor }} />
          <span className={styles.legendLabel}>Effect</span>
        </div>
        {showCIs && (
          <div className={styles.legendItem}>
            <span
              className={styles.legendBand}
              style={{
                background: `${outcomeColor}26`,
                borderColor: `${outcomeColor}55`,
              }}
            />
            <span className={styles.legendLabel}>95% CI</span>
          </div>
        )}
        <div className={styles.legendItem}>
          <span className={styles.legendMarker} style={{ borderColor: outcomeColor }} />
          <span className={styles.legendLabel}>Selected dose</span>
        </div>
      </div>
      <DataTimestamp />
      <p className={styles.dataNote}>Data simulated for illustration</p>
    </div>
  );
}
