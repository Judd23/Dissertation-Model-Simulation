import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import * as d3 from "d3";
import { useResearch, useTheme, useModelData } from "../../app/contexts";
import { colors } from "../../lib/colorScales";
import { formatNumber } from "../../lib/formatters";
import { DANCE_SPRING_HEAVY } from "../../lib/transitionConfig";
import DataTimestamp from "../../components/ui/DataTimestamp";
import styles from "./PathwayDiagram.module.css";

// Node positions (relative coordinates, will be scaled)
const nodePositions: Record<string, { x: number; y: number }> = {
  FASt: { x: 0.12, y: 0.5 },
  Distress: { x: 0.5, y: 0.18 },
  Engagement: { x: 0.5, y: 0.82 },
  Adjustment: { x: 0.88, y: 0.5 },
  Dose: { x: 0.12, y: 0.12 },
};

const mobileNodePositions: Record<string, { x: number; y: number }> = {
  Dose: { x: 0.5, y: 0.08 },
  FASt: { x: 0.5, y: 0.28 },
  Distress: { x: 0.32, y: 0.5 },
  Engagement: { x: 0.68, y: 0.5 },
  Adjustment: { x: 0.5, y: 0.82 },
};

// Node descriptions for tooltips
const nodeDescriptions: Record<string, { title: string; description: string }> =
  {
    FASt: {
      title: "FASt Student Status",
      description:
        "Students who earned 12+ college credits in high school before enrolling (First-year Accelerated Status).",
    },
    Distress: {
      title: "Emotional Distress",
      description:
        "A measure of stress, loneliness, exhaustion, and mental health challenges during the first year.",
    },
    Engagement: {
      title: "Quality of Engagement",
      description:
        "How much students interact with faculty, advisors, staff, and peers on campus.",
    },
    Adjustment: {
      title: "Developmental Adjustment",
      description:
        "Overall first-year success: sense of belonging, personal growth, support environment, and satisfaction.",
    },
    Dose: {
      title: "Credit Dose (Moderator)",
      description:
        "The number of dual enrollment credits earned. More credits may intensify or weaken these effects.",
    },
  };

interface TooltipContent {
  type: "path" | "node";
  title: string;
  description: string;
  estimate?: number;
  pvalue?: number;
  finding?: string;
  plainTalk?: string;
}

// Generate plain-language interpretation of effect
function getPlainInterpretation(
  pathId: string,
  estimate: number,
  pvalue: number
): string {
  const magnitude = Math.abs(estimate);
  const strength =
    magnitude > 0.3 ? "strong" : magnitude > 0.15 ? "moderate" : "slight";
  const direction = estimate > 0 ? "positive" : "negative";
  const significant = pvalue < 0.05;

  if (!significant) {
    return "This relationship is not statistically reliable in this sample.";
  }

  const interpretations: Record<string, string> = {
    a1: `FASt students show a ${strength} increase in stress levels.`,
    a2: `FASt status has a ${strength} effect on campus engagement.`,
    b1: `Higher stress leads to ${strength}ly lower first-year success.`,
    b2: `More engagement leads to ${strength}ly better first-year outcomes.`,
    c: `FASt status provides a ${strength} direct boost to college success.`,
  };

  return (
    interpretations[pathId] ||
    `This path shows a ${strength} ${direction} effect.`
  );
}

// Clamp tooltip position to viewport
function clampToViewport(
  x: number,
  y: number,
  isTouch: boolean = false
): { x: number; y: number } {
  const padding = 20;
  const tooltipWidth = 320;
  const tooltipHeight = 180;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // For touch, position above finger
  const yOffset = isTouch ? -tooltipHeight - 50 : 15;
  const xOffset = isTouch ? -tooltipWidth / 2 : 15;

  let clampedX = x + xOffset;
  let clampedY = y + yOffset;

  // Clamp to viewport bounds
  clampedX = Math.max(
    padding,
    Math.min(clampedX, viewportWidth - tooltipWidth - padding)
  );
  clampedY = Math.max(
    padding,
    Math.min(clampedY, viewportHeight - tooltipHeight - padding)
  );

  return { x: clampedX, y: clampedY };
}

interface PathwayDiagramProps {
  width?: number;
  height?: number;
  interactive?: boolean;
  showLegend?: boolean;
  /** Unique ID for cross-page morphing */
  layoutId?: string;
}

export default function PathwayDiagram({
  width: initialWidth = 700,
  height: initialHeight = 400,
  interactive = true,
  showLegend = true,
  layoutId,
}: PathwayDiagramProps) {
  const tooltipId = "pathway-diagram-tooltip";
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({
    width: initialWidth,
    height: initialHeight,
  });
  const [isMobile, setIsMobile] = useState(false);
  const { highlightedPath, setHighlightedPath, selectedDose, showPathLabels } =
    useResearch();
  const { resolvedTheme } = useTheme();
  const { paths, doseCoefficients } = useModelData();
  console.log('(NO $) [PathwayDiagram] data snapshot:', {
    selectedDose,
    showPathLabels,
    a1: paths.a1?.estimate,
    a2: paths.a2?.estimate,
    b1: paths.b1?.estimate,
    b2: paths.b2?.estimate,
    c: paths.c?.estimate,
    distressMain: doseCoefficients.distress.main,
    engagementMain: doseCoefficients.engagement.main,
  });

  // Memoized dimension updater to prevent memory leaks from recreating listener
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const computed = getComputedStyle(containerRef.current);
      const paddingLeft = parseFloat(computed.paddingLeft) || 0;
      const paddingRight = parseFloat(computed.paddingRight) || 0;
      const usableWidth = Math.max(
        0,
        containerWidth - paddingLeft - paddingRight
      );
      const mobile = usableWidth < 520;
      setIsMobile(mobile);
      const responsiveWidth = mobile
        ? Math.max(320, usableWidth)
        : Math.max(320, Math.min(initialWidth, usableWidth));
      const aspectRatio = initialHeight / initialWidth;
      const tunedRatio = mobile ? Math.max(aspectRatio, 1.05) : aspectRatio;
      const responsiveHeight = Math.max(
        mobile ? 420 : 520,
        responsiveWidth * tunedRatio
      );
      setDimensions({ width: responsiveWidth, height: responsiveHeight });
    }
  }, [initialWidth, initialHeight]);

  // Responsive sizing with stable listener reference
  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [updateDimensions]);
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    content: TooltipContent;
  } | null>(null);

  // Build model data from context (dynamic from JSON)
  const modelData = useMemo(() => {
    const pathDescriptions: Record<
      string,
      { title: string; description: string; finding: string }
    > = {
      a1: {
        title: "FASt Status → Stress",
        description:
          "Students with FASt status report slightly higher stress during their first year.",
        finding:
          paths.a1 && paths.a1.pvalue < 0.05
            ? "Significant increase"
            : "No significant effect",
      },
      a2: {
        title: "FASt Status → Engagement",
        description:
          "FASt status alone doesn't significantly change how much students engage with campus life.",
        finding:
          paths.a2 && paths.a2.pvalue < 0.05
            ? "Significant effect"
            : "No significant effect",
      },
      b1: {
        title: "Stress → College Success",
        description: "Higher stress strongly predicts lower adjustment.",
        finding:
          paths.b1 && paths.b1.pvalue < 0.05
            ? "Strong negative effect"
            : "No significant effect",
      },
      b2: {
        title: "Engagement → College Success",
        description:
          "Students who engage more with campus adjust better to college life.",
        finding:
          paths.b2 && paths.b2.pvalue < 0.05
            ? "Strong positive effect"
            : "No significant effect",
      },
      c: {
        title: "Direct Benefit of FASt Status",
        description:
          "Beyond indirect effects, FASt status provides a direct boost to college success.",
        finding:
          paths.c && paths.c.pvalue < 0.05
            ? "Small positive effect"
            : "No significant effect",
      },
    };

    return {
      paths: [
        {
          from: "FASt",
          to: "Distress",
          id: "a1",
          estimate: paths.a1?.estimate ?? 0,
          pvalue: paths.a1?.pvalue ?? 1,
          label: "a₁",
          ...pathDescriptions.a1,
        },
        {
          from: "FASt",
          to: "Engagement",
          id: "a2",
          estimate: paths.a2?.estimate ?? 0,
          pvalue: paths.a2?.pvalue ?? 1,
          label: "a₂",
          ...pathDescriptions.a2,
        },
        {
          from: "Distress",
          to: "Adjustment",
          id: "b1",
          estimate: paths.b1?.estimate ?? 0,
          pvalue: paths.b1?.pvalue ?? 1,
          label: "b₁",
          ...pathDescriptions.b1,
        },
        {
          from: "Engagement",
          to: "Adjustment",
          id: "b2",
          estimate: paths.b2?.estimate ?? 0,
          pvalue: paths.b2?.pvalue ?? 1,
          label: "b₂",
          ...pathDescriptions.b2,
        },
        {
          from: "FASt",
          to: "Adjustment",
          id: "c",
          estimate: paths.c?.estimate ?? 0,
          pvalue: paths.c?.pvalue ?? 1,
          label: "c'",
          ...pathDescriptions.c,
        },
      ],
      moderation: [
        {
          path: "a1z",
          estimate: paths.a1z?.estimate ?? 0,
          pvalue: paths.a1z?.pvalue ?? 1,
          label: "a₁z",
        },
        {
          path: "a2z",
          estimate: paths.a2z?.estimate ?? 0,
          pvalue: paths.a2z?.pvalue ?? 1,
          label: "a₂z",
        },
        {
          path: "cz",
          estimate: paths.cz?.estimate ?? 0,
          pvalue: paths.cz?.pvalue ?? 1,
          label: "c'z",
        },
      ],
    };
  }, [paths]);

  // Mirror the Dose Explorer convention: interpret the slider in 10-credit units above/below the 12-credit threshold.
  const doseInUnits = (selectedDose - 12) / 10;

  const getAdjustedEstimate = useCallback(
    (pathId: string, baseEstimate: number) => {
      const moderation =
        pathId === "a1"
          ? doseCoefficients.distress.moderation
          : pathId === "a2"
          ? doseCoefficients.engagement.moderation
          : pathId === "c"
          ? doseCoefficients.adjustment.moderation
          : 0;
      return baseEstimate + moderation * doseInUnits;
    },
    [doseCoefficients, doseInUnits]
  );

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const margin = isMobile
      ? { top: 24, right: 24, bottom: 32, left: 24 }
      : { top: 40, right: 40, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Get theme-aware colors
    const surfaceColor =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--color-surface")
        .trim() || "#ffffff";
    const chartBg =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--color-chart-background")
        .trim() || "#ffffff";

    // Add background FIRST for proper dark mode support
    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", chartBg)
      .attr("rx", 8);

    // Create main group AFTER background
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Scale positions
    const layoutNodes = isMobile ? mobileNodePositions : nodePositions;
    const scaledNodes = Object.entries(layoutNodes).map(([id, pos]) => ({
      id,
      x: pos.x * innerWidth,
      y: pos.y * innerHeight,
    }));

    const getNode = (id: string) => scaledNodes.find((n) => n.id === id)!;

    // Draw moderation arrow from Dose to paths
    const doseNode = getNode("Dose");
    const fastNode = getNode("FASt");

    g.append("path")
      .attr(
        "d",
        `M${doseNode.x},${doseNode.y} Q${doseNode.x + 50},${doseNode.y + 30} ${
          fastNode.x + 40
        },${fastNode.y - 20}`
      )
      .attr("fill", "none")
      .attr("stroke", colors.credits)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,3")
      .attr("marker-end", "url(#arrow-dose)")
      .attr("opacity", 0)
      .transition()
      .delay(200)
      .duration(400)
      .attr("opacity", 1);

    // Define arrow markers and filters
    const defs = svg.append("defs");

    // Glow filter for highlighted paths
    const glowFilter = defs
      .append("filter")
      .attr("id", "glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    glowFilter
      .append("feGaussianBlur")
      .attr("stdDeviation", "3")
      .attr("result", "coloredBlur");
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Arrow for paths
    ["distress", "engagement", "direct", "dose"].forEach((type) => {
      defs
        .append("marker")
        .attr("id", `arrow-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 8)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr(
          "fill",
          type === "distress"
            ? colors.distress
            : type === "engagement"
            ? colors.engagement
            : type === "dose"
            ? colors.credits
            : colors.fast
        );
    });

    // Draw paths
    const pathsGroup = g.append("g").attr("class", "paths").attr("opacity", 0);
    const getFocusPosition = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };

    modelData.paths.forEach((path) => {
      const from = getNode(path.from);
      const to = getNode(path.to);

      let pathType: "distress" | "engagement" | "direct";
      if (path.id === "a1" || path.id === "b1") pathType = "distress";
      else if (path.id === "a2" || path.id === "b2") pathType = "engagement";
      else pathType = "direct";

      const color =
        pathType === "distress"
          ? colors.distress
          : pathType === "engagement"
          ? colors.engagement
          : colors.fast;

      // Handle serial pathway highlighting (both mediation routes)
      const isSerialPath =
        path.id === "a1" ||
        path.id === "b1" ||
        path.id === "a2" ||
        path.id === "b2";
      const isHighlighted =
        !highlightedPath ||
        highlightedPath === pathType ||
        (highlightedPath === "serial" && isSerialPath);
      const allowHoverHighlight = !highlightedPath;
      const isSelected =
        !!highlightedPath &&
        (highlightedPath === pathType ||
          (highlightedPath === "serial" && isSerialPath));
      const opacity = isHighlighted ? 1 : 0.15;
      const adjustedEstimate = getAdjustedEstimate(path.id, path.estimate);
      const strokeWidth = Math.max(2.5, Math.abs(adjustedEstimate) * 12);
      const baseStrokeWidth = isSelected ? strokeWidth + 1.5 : strokeWidth;
      const selectedFilter = isSelected ? "url(#glow)" : null;

      // Calculate path - all straight lines
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const fromOffset =
        path.from === "FASt" ? (isMobile ? 46 : 52) : isMobile ? 50 : 58;
      const toOffset =
        path.to === "Adjustment" ? (isMobile ? 56 : 62) : isMobile ? 52 : 58;
      const offsetX1 = (dx / len) * fromOffset;
      const offsetY1 = (dy / len) * 32;
      const offsetX2 = (dx / len) * toOffset;
      const offsetY2 = (dy / len) * 32;
      const d = `M${from.x + offsetX1},${from.y + offsetY1} L${
        to.x - offsetX2
      },${to.y - offsetY2}`;

      const pathElement = pathsGroup
        .append("path")
        .attr("d", d)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", baseStrokeWidth)
        .attr("stroke-linecap", "round")
        .attr("opacity", opacity)
        .attr("marker-end", `url(#arrow-${pathType})`)
        .attr("cursor", interactive ? "pointer" : "default")
        .attr("filter", selectedFilter)
        .style(
          "transition",
          "opacity 0.2s ease, filter 0.2s ease, stroke-width 0.2s ease"
        )
        .attr("tabindex", interactive ? 0 : null)
        .attr("role", interactive ? "button" : null)
        .attr(
          "aria-label",
          `${path.title}. ${path.description} Effect ${formatNumber(
            adjustedEstimate
          )}. ${
            path.pvalue < 0.05
              ? "Statistically significant."
              : "Not statistically significant."
          }`
        )
        .attr("aria-describedby", interactive ? tooltipId : null);

      if (interactive) {
        const plainTalk = getPlainInterpretation(
          path.id,
          adjustedEstimate,
          path.pvalue
        );

        pathElement
          .on("mouseenter", function (event) {
            d3.select(this)
              .attr("filter", "url(#glow)")
              .attr("stroke-width", baseStrokeWidth + 2);
            if (allowHoverHighlight) {
              setHighlightedPath(pathType);
            }
            const pos = clampToViewport(event.clientX, event.clientY);
            setTooltip({
              show: true,
              x: pos.x,
              y: pos.y,
              content: {
                type: "path",
                title: path.title,
                description: path.description,
                estimate: adjustedEstimate,
                pvalue: path.pvalue,
                finding: path.finding,
                plainTalk,
              },
            });
          })
          .on("mouseleave", function () {
            d3.select(this)
              .attr("filter", selectedFilter)
              .attr("stroke-width", baseStrokeWidth);
            if (allowHoverHighlight) {
              setHighlightedPath(null);
            }
            setTooltip(null);
          })
          .on(
            "touchstart",
            function (event) {
              event.preventDefault();
              const touch = event.touches[0];
              d3.select(this)
                .attr("filter", "url(#glow)")
                .attr("stroke-width", baseStrokeWidth + 2);
              if (allowHoverHighlight) {
                setHighlightedPath(pathType);
              }
              // Haptic feedback if available
              if (navigator.vibrate) navigator.vibrate(10);
              const pos = clampToViewport(touch.clientX, touch.clientY, true);
              setTooltip({
                show: true,
                x: pos.x,
                y: pos.y,
                content: {
                  type: "path",
                  title: path.title,
                  description: path.description,
                  estimate: adjustedEstimate,
                  pvalue: path.pvalue,
                  finding: path.finding,
                  plainTalk,
                },
              });
              // Auto-hide after 3s on touch
              setTimeout(() => {
                setTooltip(null);
                d3.select(this)
                  .attr("filter", selectedFilter)
                  .attr("stroke-width", baseStrokeWidth);
                if (allowHoverHighlight) {
                  setHighlightedPath(null);
                }
              }, 3000);
            },
            { passive: false }
          )
          .on("touchend", function () {
            // Keep tooltip visible, will auto-hide
          })
          .on("focus", function () {
            const { x, y } = getFocusPosition(this);
            d3.select(this)
              .attr("filter", "url(#glow)")
              .attr("stroke-width", baseStrokeWidth + 2);
            if (allowHoverHighlight) {
              setHighlightedPath(pathType);
            }
            const pos = clampToViewport(x, y);
            setTooltip({
              show: true,
              x: pos.x,
              y: pos.y,
              content: {
                type: "path",
                title: path.title,
                description: path.description,
                estimate: adjustedEstimate,
                pvalue: path.pvalue,
                finding: path.finding,
                plainTalk,
              },
            });
          })
          .on("blur", function () {
            d3.select(this)
              .attr("filter", selectedFilter)
              .attr("stroke-width", baseStrokeWidth);
            if (allowHoverHighlight) {
              setHighlightedPath(null);
            }
            setTooltip(null);
          })
          .on("keydown", function (event) {
            if (event.key === "Escape") {
              setTooltip(null);
            }
          });
      }

      if (!isMobile && showPathLabels) {
        let labelX: number, labelY: number;
        if (path.id === "a1") {
          labelX = (from.x + to.x) / 2 - 20;
          labelY = (from.y + to.y) / 2 - 15;
        } else if (path.id === "a2") {
          labelX = (from.x + to.x) / 2 - 20;
          labelY = (from.y + to.y) / 2 + 25;
        } else if (path.id === "b1") {
          labelX = (from.x + to.x) / 2;
          labelY = (from.y + to.y) / 2 - 15;
        } else if (path.id === "b2") {
          labelX = (from.x + to.x) / 2;
          labelY = (from.y + to.y) / 2 + 25;
        } else {
          labelX = (from.x + to.x) / 2;
          labelY = from.y + 20;
        }

        const labelText = `${path.label} = ${formatNumber(path.estimate)}${
          path.pvalue < 0.05 ? "*" : ""
        }`;
        const textNode = pathsGroup
          .append("text")
          .attr("x", labelX)
          .attr("y", labelY)
          .attr("text-anchor", "middle")
          .attr("font-family", "var(--font-mono)")
          .attr("font-size", 11)
          .attr("font-weight", 500)
          .attr("fill", color)
          .attr("opacity", opacity)
          .text(labelText);

        const bbox = (textNode.node() as SVGTextElement)?.getBBox();
        if (bbox) {
          pathsGroup
            .insert("rect", "text")
            .attr("x", bbox.x - 3)
            .attr("y", bbox.y - 1)
            .attr("width", bbox.width + 6)
            .attr("height", bbox.height + 2)
            .attr("fill", chartBg)
            .attr("opacity", opacity * 0.9);
        }
      }
    });

    // Fade in paths group
    pathsGroup.transition().delay(300).duration(500).attr("opacity", 1);

    // Draw nodes
    const nodesGroup = g.append("g").attr("class", "nodes").attr("opacity", 0);

    const nodeData = [
      { id: "FASt", label: "FASt\nStudent", color: colors.fast },
      { id: "Distress", label: "Emotional\nDistress", color: colors.distress },
      {
        id: "Engagement",
        label: "Campus\nEngagement",
        color: colors.engagement,
      },
      {
        id: "Adjustment",
        label: "First-Year\nSuccess",
        color: colors.belonging,
      },
      { id: "Dose", label: "Credit\nAmount", color: colors.credits },
    ];

    nodeData.forEach((node) => {
      const pos = getNode(node.id);
      const nodeDesc = nodeDescriptions[node.id];
      const nodeAriaLabel = nodeDesc
        ? `${nodeDesc.title}. ${nodeDesc.description}`
        : node.label;
      const nodeG = nodesGroup
        .append("g")
        .attr("transform", `translate(${pos.x}, ${pos.y})`)
        .attr("cursor", interactive ? "pointer" : "default")
        .attr("tabindex", interactive ? 0 : null)
        .attr("role", interactive ? "button" : null)
        .attr("aria-label", nodeAriaLabel)
        .attr("aria-describedby", interactive ? tooltipId : null);

      // Add invisible hit area for better interaction
      nodeG
        .append("ellipse")
        .attr("rx", 60)
        .attr("ry", 40)
        .attr("fill", "transparent");

      // Node circle/ellipse
      if (node.id === "Dose") {
        nodeG
          .append("rect")
          .attr("x", -40)
          .attr("y", -22)
          .attr("width", 80)
          .attr("height", 44)
          .attr("rx", 8)
          .attr("fill", surfaceColor)
          .attr("stroke", node.color)
          .attr("stroke-width", 2.5)
          .attr("stroke-dasharray", "6,4");
      } else if (node.id === "Adjustment") {
        // Double ellipse for latent outcome
        nodeG
          .append("ellipse")
          .attr("rx", 58)
          .attr("ry", 38)
          .attr("fill", surfaceColor)
          .attr("stroke", node.color)
          .attr("stroke-width", 3);
        nodeG
          .append("ellipse")
          .attr("rx", 50)
          .attr("ry", 30)
          .attr("fill", surfaceColor)
          .attr("stroke", node.color)
          .attr("stroke-width", 1.5);
      } else {
        nodeG
          .append("ellipse")
          .attr("rx", node.id === "FASt" ? 48 : 52)
          .attr("ry", 32)
          .attr("fill", surfaceColor)
          .attr("stroke", node.color)
          .attr("stroke-width", 2.5);
      }

      // Add hover effect
      if (interactive) {
        nodeG
          .on("mouseenter", function (event) {
            d3.select(this)
              .selectAll("ellipse, rect")
              .transition()
              .duration(150)
              .attr("stroke-width", 4);

            const desc = nodeDescriptions[node.id];
            setTooltip({
              show: true,
              x: event.clientX,
              y: event.clientY,
              content: {
                type: "node",
                title: desc.title,
                description: desc.description,
              },
            });
          })
          .on("mouseleave", function () {
            d3.select(this)
              .selectAll("ellipse, rect")
              .transition()
              .duration(150)
              .attr("stroke-width", node.id === "Adjustment" ? 3 : 2.5);
            setTooltip(null);
          })
          .on("focus", function () {
            d3.select(this)
              .selectAll("ellipse, rect")
              .transition()
              .duration(150)
              .attr("stroke-width", 4);
            const { x, y } = getFocusPosition(this);
            const desc = nodeDescriptions[node.id];
            setTooltip({
              show: true,
              x,
              y,
              content: {
                type: "node",
                title: desc.title,
                description: desc.description,
              },
            });
          })
          .on("blur", function () {
            d3.select(this)
              .selectAll("ellipse, rect")
              .transition()
              .duration(150)
              .attr("stroke-width", node.id === "Adjustment" ? 3 : 2.5);
            setTooltip(null);
          })
          .on("keydown", function (event) {
            if (event.key === "Escape") {
              setTooltip(null);
            }
          });
      }

      // Node label
      const lines = node.label.split("\n");
      lines.forEach((line, i) => {
        nodeG
          .append("text")
          .attr("text-anchor", "middle")
          .attr("dy", lines.length > 1 ? (i - 0.5) * 15 + 5 : 5)
          .attr("font-family", "var(--font-body)")
          .attr("font-size", 12)
          .attr("font-weight", 600)
          .attr("fill", "var(--color-text)")
          .attr("pointer-events", "none")
          .text(line);
      });
    });

    // Fade in nodes group
    nodesGroup.transition().delay(500).duration(500).attr("opacity", 1);

    if (showLegend && !isMobile) {
      const legendX = Math.min(width - 160, width - 155);
      const legendBg = svg
        .append("g")
        .attr("transform", `translate(${legendX}, 12)`)
        .attr("opacity", 0);

      legendBg
        .append("rect")
        .attr("x", -8)
        .attr("y", -8)
        .attr("width", 145)
        .attr("height", 80)
        .attr("fill", chartBg)
        .attr("stroke", "var(--color-border)")
        .attr("stroke-width", 1)
        .attr("rx", 6)
        .attr("opacity", 0.95);

      const legend = legendBg.append("g");

      const legendItems = [
        { label: "Stress route", color: colors.distress, desc: "(indirect)" },
        {
          label: "Engagement route",
          color: colors.engagement,
          desc: "(indirect)",
        },
        { label: "Direct benefit", color: colors.nonfast, desc: "" },
      ];

      legendItems.forEach((item, i) => {
        const itemG = legend
          .append("g")
          .attr("transform", `translate(0, ${i * 22})`);
        itemG
          .append("line")
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", 28)
          .attr("y2", 0)
          .attr("stroke", item.color)
          .attr("stroke-width", 3)
          .attr("stroke-linecap", "round");
        itemG
          .append("circle")
          .attr("cx", 28)
          .attr("cy", 0)
          .attr("r", 3)
          .attr("fill", item.color);
        itemG
          .append("text")
          .attr("x", 36)
          .attr("y", 4)
          .attr("font-size", 11)
          .attr("font-weight", 500)
          .attr("fill", "var(--color-text)")
          .text(item.label);
      });

      // Fade in legend
      legendBg.transition().delay(800).duration(400).attr("opacity", 1);
    }
  }, [
    dimensions,
    highlightedPath,
    interactive,
    setHighlightedPath,
    resolvedTheme,
    selectedDose,
    modelData,
    getAdjustedEstimate,
    isMobile,
    showLegend,
    showPathLabels,
  ]);

  return (
    <motion.div
      ref={containerRef}
      className={styles.container}
      layoutId={layoutId}
      layout={!!layoutId}
      transition={DANCE_SPRING_HEAVY}
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className={styles.svg}
        role="img"
        aria-label="Pathway diagram showing FASt treatment effects through emotional distress and engagement mediators to developmental adjustment"
      />
      {showLegend && isMobile && (
        <div className={styles.mobileLegend} aria-hidden="true">
          <div className={styles.legendItem}>
            <span
              className={styles.legendLine}
              style={{ background: colors.distress }}
            />
            <span className={styles.legendLabel}>Stress route</span>
          </div>
          <div className={styles.legendItem}>
            <span
              className={styles.legendLine}
              style={{ background: colors.engagement }}
            />
            <span className={styles.legendLabel}>Engagement route</span>
          </div>
          <div className={styles.legendItem}>
            <span
              className={styles.legendLine}
              style={{ background: colors.nonfast }}
            />
            <span className={styles.legendLabel}>Direct benefit</span>
          </div>
        </div>
      )}
      {tooltip?.show && (
        <div
          className={`${styles.tooltip} ${
            tooltip.content.type === "path"
              ? styles.pathTooltip
              : styles.nodeTooltip
          }`}
          id={tooltipId}
          role="tooltip"
          aria-live="polite"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className={styles.tooltipTitle}>{tooltip.content.title}</div>
          <div className={styles.tooltipDescription}>
            {tooltip.content.description}
          </div>
          {tooltip.content.type === "path" && (
            <>
              {tooltip.content.plainTalk && (
                <div className={styles.tooltipPlainTalk}>
                  <strong>Plain talk:</strong> {tooltip.content.plainTalk}
                </div>
              )}
              <div className={styles.tooltipStats}>
                <span className={styles.tooltipFinding}>
                  {tooltip.content.finding}
                </span>
                <span className={styles.tooltipEffect}>
                  β = {formatNumber(tooltip.content.estimate!)}
                </span>
                <span className={styles.tooltipPvalue}>
                  {tooltip.content.pvalue! < 0.001
                    ? "p < .001"
                    : tooltip.content.pvalue! < 0.05
                    ? `p = ${tooltip.content.pvalue!.toFixed(3)}`
                    : "Not significant"}
                </span>
              </div>
            </>
          )}
        </div>
      )}
      <DataTimestamp />
      <p className={styles.dataNote}>Data simulated for illustration</p>
    </motion.div>
  );
}
