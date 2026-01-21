import { useRef, useEffect, useMemo, useState } from "react";
import * as d3 from "d3";
import { fetchDoseEffects } from "../../data/adapters/doseEffects";
import type { DoseEffectsData } from "../../data/types/doseEffects";
import styles from "./JohnsonNeymanPlot.module.css";

interface JohnsonNeymanPlotProps {
  outcome: "distress" | "engagement";
  selectedDose?: number;
}

export default function JohnsonNeymanPlot({
  outcome,
  selectedDose = 24,
}: JohnsonNeymanPlotProps) {
  const tooltipId = `jn-tooltip-${outcome}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 350 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    dose: number;
    effect: number;
    ciLower: number;
    ciUpper: number;
  } | null>(null);
  const [doseEffects, setDoseEffects] = useState<DoseEffectsData | null>(null);
  const outcomeLabel =
    outcome === "distress" ? "Emotional Distress" : "Campus Engagement";

  // Fetch dose effects data
  useEffect(() => {
    let isMounted = true;
    fetchDoseEffects().then((data) => {
      if (isMounted && data) setDoseEffects(data);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Get the JN point for this outcome
  const jnPoint = useMemo(() => {
    if (outcome !== "engagement" || !doseEffects) return null;
    const crossover = doseEffects.johnsonNeymanPoints.engagement.crossover;
    return typeof crossover === "number" ? crossover : null;
  }, [outcome, doseEffects]);

  // Process data
  const data = useMemo(() => {
    if (!doseEffects) return [];
    return doseEffects.effects.map((d) => ({
      dose: d.creditDose,
      effect: outcome === "distress" ? d.distressEffect : d.engagementEffect,
      ciLower: outcome === "distress" ? d.distressCI[0] : d.engagementCI[0],
      ciUpper: outcome === "distress" ? d.distressCI[1] : d.engagementCI[1],
    }));
  }, [outcome, doseEffects]);

  const pointByDose = useMemo(() => {
    return new Map(data.map((d) => [d.dose, d] as const));
  }, [data]);

  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const width = Math.max(320, Math.min(containerWidth, 600));
        const height = Math.max(250, width * 0.58);
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const { width, height } = dimensions;

  // Colors
  const colors = useMemo(
    () => ({
      distress: {
        main: "#d62728",
        light: "rgba(214, 39, 40, 0.15)",
        significant: "rgba(214, 39, 40, 0.3)",
      },
      engagement: {
        main: "#1f77b4",
        light: "rgba(31, 119, 180, 0.15)",
        significant: "rgba(31, 119, 180, 0.3)",
      },
    }),
    [],
  );

  const color = colors[outcome];

  useEffect(() => {
    if (!svgRef.current || !doseEffects) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 30, right: 30, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear().domain([0, 80]).range([0, innerWidth]);

    const yExtent = d3.extent(
      data.flatMap((d) => [d.ciLower, d.ciUpper, d.effect]),
    ) as [number, number];
    const yPadding = (yExtent[1] - yExtent[0]) * 0.15;
    const yScale = d3
      .scaleLinear()
      .domain([
        Math.min(yExtent[0] - yPadding, -0.1),
        Math.max(yExtent[1] + yPadding, 0.1),
      ])
      .range([innerHeight, 0]);

    // Grid lines
    g.append("g")
      .attr("class", styles.grid)
      .selectAll("line")
      .data(yScale.ticks(5))
      .join("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", "var(--color-border)")
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0.5);

    // Zero line (reference)
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0))
      .attr("stroke", "var(--color-text-muted)")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "6,4");

    // Significance regions
    if (jnPoint !== null) {
      // Non-significant region (before JN point)
      g.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", xScale(jnPoint))
        .attr("height", innerHeight)
        .attr("fill", "var(--color-border-light)")
        .attr("opacity", 0.4);

      // Significant region (after JN point)
      g.append("rect")
        .attr("x", xScale(jnPoint))
        .attr("y", 0)
        .attr("width", innerWidth - xScale(jnPoint))
        .attr("height", innerHeight)
        .attr("fill", color.significant)
        .attr("opacity", 0.4);

      // JN point vertical line
      g.append("line")
        .attr("x1", xScale(jnPoint))
        .attr("x2", xScale(jnPoint))
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", color.main)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "8,4");

      // JN point label
      g.append("text")
        .attr("x", xScale(jnPoint))
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("fill", color.main)
        .attr("font-size", "12px")
        .attr("font-weight", "600")
        .text(`JN Point: ${jnPoint} credits`);
    } else {
      // All significant (for distress)
      g.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("fill", color.significant)
        .attr("opacity", 0.3);
    }

    // Confidence interval area
    const areaGenerator = d3
      .area<(typeof data)[0]>()
      .x((d) => xScale(d.dose))
      .y0((d) => yScale(d.ciLower))
      .y1((d) => yScale(d.ciUpper))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("fill", color.light)
      .attr("d", areaGenerator);

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

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", color.main)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,2")
      .attr("opacity", 0.6)
      .attr("d", upperLine);

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", color.main)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,2")
      .attr("opacity", 0.6)
      .attr("d", lowerLine);

    // Effect line
    const lineGenerator = d3
      .line<(typeof data)[0]>()
      .x((d) => xScale(d.dose))
      .y((d) => yScale(d.effect))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", color.main)
      .attr("stroke-width", 3)
      .attr("d", lineGenerator);

    // Selected dose marker
    const centeringConstant =
      doseEffects.creditDoseRange.centeringConstant ?? 0;
    const interpolatedEffect =
      doseEffects.coefficients[outcome].main +
      ((selectedDose - 12) / 10 - centeringConstant) *
        doseEffects.coefficients[outcome].moderation;

    g.append("circle")
      .attr("cx", xScale(selectedDose))
      .attr("cy", yScale(interpolatedEffect))
      .attr("r", 8)
      .attr("fill", "white")
      .attr("stroke", color.main)
      .attr("stroke-width", 3);

    // Axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(8)
      .tickFormat((d) => `${d}`);
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".2f"));

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr("font-size", "12px")
      .attr("color", "var(--color-text-muted)");

    g.append("g")
      .call(yAxis)
      .attr("font-size", "12px")
      .attr("color", "var(--color-text-muted)");

    // Axis labels
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 40)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--color-text-muted)")
      .attr("font-size", "13px")
      .text("Transfer Credits");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -45)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--color-text-muted)")
      .attr("font-size", "13px")
      .text("Effect Size (β)");

    const overlay = g
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "transparent")
      .attr("cursor", "crosshair")
      .attr("tabindex", 0)
      .attr("role", "img")
      .attr(
        "aria-label",
        `Johnson-Neyman plot for ${outcomeLabel}. Focus to read values at the selected dose.`,
      )
      .attr("aria-describedby", tooltipId);

    const showTooltipForDose = (dose: number) => {
      const point = pointByDose.get(dose);
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
      .on("mousemove", (event) => {
        const [x] = d3.pointer(event);
        const dose = Math.max(0, Math.min(80, Math.round(xScale.invert(x))));
        const point = pointByDose.get(dose);
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
      .on("mouseleave", () => setTooltip(null))
      .on("focus", () => showTooltipForDose(selectedDose))
      .on("blur", () => setTooltip(null))
      .on("keydown", (event) => {
        if (event.key === "Escape") {
          setTooltip(null);
        }
      });
  }, [
    data,
    pointByDose,
    width,
    height,
    outcome,
    selectedDose,
    jnPoint,
    color,
    outcomeLabel,
    tooltipId,
  ]);
  const interpretation = useMemo(() => {
    if (outcome === "engagement" && jnPoint !== null) {
      return `At about ${jnPoint} credits, we start to see a clear engagement effect: the confidence band stays on one side of zero. Below that, results are too uncertain.`;
    }
    return `For ${outcomeLabel.toLowerCase()}, the confidence band never crosses zero—so the effect is consistently present across all credit levels tested.`;
  }, [outcome, jnPoint, outcomeLabel]);

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          Johnson-Neyman Analysis: {outcomeLabel}
        </h3>
        <p className={styles.subtitle}>
          Where does this effect clearly differ from zero?
        </p>
        <p className={styles.description}>
          The shaded region shows where the confidence interval stays above or
          below zero— that’s where we can be confident the effect is real. The
          vertical line marks the credit level where that switch happens.
        </p>
      </div>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className={styles.svg}
        role="img"
        aria-label="Johnson-Neyman plot showing regions of statistical significance across credit dose levels"
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
          <div className={styles.tooltipRow}>
            Effect: {tooltip.effect.toFixed(3)}
          </div>
          <div className={styles.tooltipRow}>
            95% CI: {tooltip.ciLower.toFixed(3)} to {tooltip.ciUpper.toFixed(3)}
          </div>
        </div>
      )}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span
            className={styles.legendLine}
            style={{ background: color.main }}
          />
          <span className={styles.legendLabel}>Effect</span>
        </div>
        <div className={styles.legendItem}>
          <span
            className={styles.legendBand}
            style={{ background: color.light, borderColor: color.main }}
          />
          <span className={styles.legendLabel}>95% CI</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendLineMuted} />
          <span className={styles.legendLabel}>Zero (null)</span>
        </div>
      </div>
      <div className={styles.interpretation}>
        <div className={styles.interpretationIcon}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
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
            <span
              className={styles.regionDot}
              style={{ background: "var(--color-border)" }}
            />
            <span className={styles.regionLabel}>Not Significant</span>
            <span className={styles.regionRange}>0–{jnPoint} credits</span>
          </div>
          <div className={styles.region}>
            <span
              className={styles.regionDot}
              style={{ background: color.main }}
            />
            <span className={styles.regionLabel}>Significant</span>
            <span className={styles.regionRange}>{jnPoint}+ credits</span>
          </div>
        </div>
      )}
      <p className={styles.dataNote}>Data simulated for illustration</p>
    </div>
  );
}
