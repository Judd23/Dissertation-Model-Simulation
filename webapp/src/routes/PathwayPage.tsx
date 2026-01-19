import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useResearch, useModelData } from "../app/contexts";
import PathwayDiagram from "../features/charts/PathwayDiagram";
import EffectDecomposition from "../features/charts/EffectDecomposition";
import Toggle from "../components/ui/Toggle";
import KeyTakeaway from "../components/ui/KeyTakeaway";
import GlossaryTerm from "../components/ui/GlossaryTerm";
import { InteractiveSurface } from "../components/ui/InteractiveSurface";
import { DiagramWalkthrough, WALKTHROUGH_STORAGE_KEY } from "../components/ui";
import type { HighlightedPath } from "../components/ui";
import {
  revealVariants,
  revealVariantsScale,
  containerVariants,
  itemVariants,
  VIEWPORT_CONFIG,
  VIEWPORT_LOOSE,
} from "../lib/transitionConfig";

import styles from "./PathwayPage.module.css";

export default function PathwayPage() {
  const {
    highlightedPath,
    setHighlightedPath,
    showPathLabels,
    togglePathLabels,
  } = useResearch();
  const { paths } = useModelData();

  const handleRefreshData = useCallback(() => {
    window.dispatchEvent(new Event('model-data-refresh'));
  }, []);

  console.log('(NO $) [PathwayPage] path snapshot:', {
    a1: paths.a1?.estimate,
    a2: paths.a2?.estimate,
    b1: paths.b1?.estimate,
    b2: paths.b2?.estimate,
    c: paths.c?.estimate,
    cz: paths.cz?.estimate,
  });
  const [isStuck, setIsStuck] = useState(false);
  const controlsRef = useRef<HTMLElement>(null);

  // Walkthrough state
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);

  // Check if first visit and auto-open walkthrough
  useEffect(() => {
    const hasSeenWalkthrough = localStorage.getItem(WALKTHROUGH_STORAGE_KEY);
    if (!hasSeenWalkthrough) {
      // Small delay to let page render first
      const timer = setTimeout(() => {
        setHighlightedPath(null); // Sync initial state (step 0 = show all)
        setShowWalkthrough(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [setHighlightedPath]);

  const handleWalkthroughStepChange = useCallback(
    (step: number, highlightedPath: HighlightedPath) => {
      setWalkthroughStep(step);
      setHighlightedPath(highlightedPath);
    },
    [setHighlightedPath]
  );

  const handleWalkthroughClose = useCallback(() => {
    setShowWalkthrough(false);
    setWalkthroughStep(0);
    setHighlightedPath(null);
    localStorage.setItem(WALKTHROUGH_STORAGE_KEY, "true");
  }, [setHighlightedPath]);

  const handleShowGuide = useCallback(() => {
    setWalkthroughStep(0);
    setHighlightedPath(null);
    setShowWalkthrough(true);
  }, [setHighlightedPath]);

  // Detect sticky state (using -10px rootMargin for reliable triggering across zoom levels)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting);
      },
      { threshold: [1], rootMargin: "-10px 0px 0px 0px" }
    );

    if (controlsRef.current) {
      observer.observe(controlsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Build path data dynamically from pipeline outputs
  const pathData = useMemo(
    () => [
      {
        id: "a1",
        label: "FASt Status → Stress",
        estimate: paths.a1?.estimate ?? 0,
        se: paths.a1?.se ?? 0,
        pvalue: paths.a1?.pvalue ?? 1,
        interpretation:
          "Students who earned dual enrollment credits in high school report somewhat higher stress levels during their first year.",
        type: "distress",
      },
      {
        id: "a1z",
        label: "Does credit amount change stress?",
        estimate: paths.a1z?.estimate ?? 0,
        se: paths.a1z?.se ?? 0,
        pvalue: paths.a1z?.pvalue ?? 1,
        interpretation:
          "The number of credits earned doesn't change this pattern—stress levels are similar whether students earned 12 or 40 credits.",
        type: "moderation",
      },
      {
        id: "a2",
        label: "FASt Status → Engagement",
        estimate: paths.a2?.estimate ?? 0,
        se: paths.a2?.se ?? 0,
        pvalue: paths.a2?.pvalue ?? 1,
        interpretation:
          "Dual enrollment credits alone don't significantly change how engaged students are with campus life.",
        type: "engagement",
      },
      {
        id: "a2z",
        label: "Does credit amount change engagement?",
        estimate: paths.a2z?.estimate ?? 0,
        se: paths.a2z?.se ?? 0,
        pvalue: paths.a2z?.pvalue ?? 1,
        interpretation:
          "There's a hint that students with many credits engage less with campus, but we're not confident this pattern is real.",
        type: "moderation",
      },
      {
        id: "b1",
        label: "Stress → College Success",
        estimate: paths.b1?.estimate ?? 0,
        se: paths.b1?.se ?? 0,
        pvalue: paths.b1?.pvalue ?? 1,
        interpretation:
          "Strong connection: students with more stress have a harder time adjusting to college life.",
        type: "distress",
      },
      {
        id: "b2",
        label: "Engagement → College Success",
        estimate: paths.b2?.estimate ?? 0,
        se: paths.b2?.se ?? 0,
        pvalue: paths.b2?.pvalue ?? 1,
        interpretation:
          "Strong connection: students who engage more with campus do better overall.",
        type: "engagement",
      },
      {
        id: "c",
        label: "FASt Status → Success (Direct)",
        estimate: paths.c?.estimate ?? 0,
        se: paths.c?.se ?? 0,
        pvalue: paths.c?.pvalue ?? 1,
        interpretation:
          "Beyond the stress and engagement effects, dual enrollment credits give a small direct boost to college success.",
        type: "direct",
      },
      {
        id: "cz",
        label: "Does credit amount change the direct benefit?",
        estimate: paths.cz?.estimate ?? 0,
        se: paths.cz?.se ?? 0,
        pvalue: paths.cz?.pvalue ?? 1,
        interpretation:
          "There's a hint that the direct benefit decreases when students have many credits, but we need more evidence.",
        type: "moderation",
      },
    ],
    [paths]
  );

  type PathwayButton = {
    id: "distress" | "engagement" | "serial" | "direct" | null;
    label: string;
    color: string;
    textColor?: string;
  };

  const pathwayButtons: PathwayButton[] = [
    {
      id: null,
      label: "Show All",
      color: "#1e3a5f",
    },
    { id: "distress", label: "Stress Route", color: "var(--color-distress)" },
    {
      id: "engagement",
      label: "Engagement Route",
      color: "var(--color-engagement)",
    },
    {
      id: "serial",
      label: "Serial Mediation",
      color: "var(--color-belonging)",
    },
    { id: "direct", label: "Direct Benefit", color: "var(--color-fast)" },
  ];

  return (
    <div className={styles.page}>
      <div className="container">
        <motion.header
          className={styles.header}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={revealVariants}
        >
          <p className={styles.eyebrow}>Interactive Model</p>
          <h1>How Dual Enrollment Credits Affect First-Year Success</h1>
          <p className="lead">
            This diagram shows the different ways that earning college credits
            in high school can influence a student's first-year college
            experience. The model uses{" "}
            <GlossaryTerm
              term="Mediation Analysis"
              definition="A statistical technique that examines whether an independent variable (dual enrollment credits) affects an outcome (adjustment) through intermediate variables (stress and engagement). It reveals the 'how' of cause and effect."
            >
              mediation analysis
            </GlossaryTerm>{" "}
            to trace effects through{" "}
            <GlossaryTerm
              term="Emotional Distress"
              definition="A latent construct measuring students' challenges during their first year, including academic difficulties, loneliness, mental health concerns, exhaustion, sleep problems, and financial stress."
            >
              stress
            </GlossaryTerm>{" "}
            and{" "}
            <GlossaryTerm
              term="Quality of Engagement"
              definition="A latent construct measuring the quality of students' interactions on campus with other students, advisors, faculty, staff, and administrators."
            >
              engagement
            </GlossaryTerm>{" "}
            pathways.
          </p>
        </motion.header>

        {/* Making Fair Comparisons - moved from Methods page */}
        <motion.section
          className={styles.fairComparisonsSection}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={revealVariants}
        >
          <InteractiveSurface
            className={`${styles.fairComparisonsCard} interactiveSurface`}
          >
            <h3>Making Fair Comparisons</h3>
            <p>
              Students who earn college credits in high school are not randomly
              selected—they tend to have higher GPAs, more educated parents, and
              greater resources. We used{" "}
              <GlossaryTerm
                term="Propensity Score Weighting"
                definition="A statistical technique that creates pseudo-randomization by weighting observations based on their probability of receiving treatment, reducing selection bias in observational studies."
              >
                propensity score weighting
              </GlossaryTerm>{" "}
              to account for these differences.
            </p>
            <details className={styles.covariatesDetails}>
              <summary>Factors We Controlled For</summary>
              <ul className={styles.covariatesList}>
                <li><strong>hgrades</strong> — High school GPA</li>
                <li><strong>bparented</strong> — Parent education level</li>
                <li><strong>pell</strong> — Pell grant eligibility (income proxy)</li>
                <li><strong>hapcl</strong> — Number of AP courses taken</li>
                <li><strong>hprecalc13</strong> — Pre-calculus proficiency</li>
                <li><strong>hchallenge_c</strong> — High school challenge level</li>
                <li><strong>cSFcareer_c</strong> — Career expectations</li>
                <li><strong>cohort</strong> — Enrollment year</li>
              </ul>
            </details>
          </InteractiveSurface>
        </motion.section>

        <section
          ref={controlsRef}
          className={`${styles.controls} ${isStuck ? styles.stuck : ""}`}
          aria-label="Diagram filter controls"
        >
          <div
            className={styles.pathwayButtons}
            role="group"
            aria-label="Filter pathways by route type"
          >
            {pathwayButtons.map((btn) => (
              <InteractiveSurface
                key={btn.id || "all"}
                as="button"
                className={`${styles.pathwayButton} ${
                  highlightedPath === btn.id ? styles.active : ""
                } interactiveSurface`}
                onClick={() => setHighlightedPath(btn.id)}
                style={
                  {
                    "--button-color": btn.color,
                    "--button-text": btn.textColor ?? "white",
                  } as React.CSSProperties
                }
                aria-pressed={highlightedPath === btn.id}
                aria-label={`${btn.label}: ${
                  btn.id === null
                    ? "Show all pathways"
                    : `Highlight ${btn.label.toLowerCase()} pathways`
                }`}
                hoverLift={3}
              >
                {btn.id === "serial" ? (
                  <GlossaryTerm
                    term="Serial Mediation"
                    definition="A model where the treatment affects the outcome through multiple linked mediators. Here, FASt status affects adjustment through both stress AND engagement pathways working together."
                  >
                    {btn.label}
                  </GlossaryTerm>
                ) : (
                  btn.label
                )}
                {highlightedPath === btn.id && (
                  <span className={styles.pathCount} aria-hidden="true">
                    {btn.id === null
                      ? pathData.length
                      : btn.id === "distress"
                      ? 3
                      : btn.id === "engagement"
                      ? 3
                      : btn.id === "serial"
                      ? 4
                      : 2}{" "}
                    paths
                  </span>
                )}
              </InteractiveSurface>
            ))}
          </div>
          <div className={styles.toggleContainer}>
            <Toggle
              id="show-path-labels"
              label="Show Path Labels"
              checked={showPathLabels}
              onChange={togglePathLabels}
            />
            <button
              className={styles.guideButton}
              onClick={handleShowGuide}
              type="button"
              aria-label="Show diagram walkthrough guide"
            >
              Show Guide
            </button>
          </div>
        </section>

        <motion.section
          className={styles.diagram}
          aria-labelledby="diagram-heading"
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_LOOSE}
          variants={revealVariantsScale}
        >
          <h2 id="diagram-heading" className="sr-only">
            Interactive Pathway Diagram
          </h2>
          <PathwayDiagram width={800} height={450} interactive />
          <p className={styles.mobileHint} aria-hidden="true">
            ← Scroll horizontally to see full diagram →
          </p>
        </motion.section>

        <motion.section
          className={styles.coefficients}
          aria-labelledby="coefficients-heading"
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={containerVariants}
        >
          <h2 id="coefficients-heading">Key Findings</h2>
          <InteractiveSurface as="div" className={styles.keyFindingsCard} hoverLift={0}>
          <p className={styles.coefficientNote}>
            Evidence badges reflect p-value thresholds:{" "}
            <span className={styles.badgeLegend}>
              <span className={styles.legendStrong}>Strong (p&lt;.001)</span>{" "}
              <span className={styles.legendGood}>Good (p&lt;.05)</span>{" "}
              <span className={styles.legendSuggestive}>
                Suggestive (p&lt;.10)
              </span>{" "}
              <span className={styles.legendUncertain}>Uncertain (p≥.10)</span>
            </span>
          </p>
          <div className={styles.coefficientGrid}>
            {pathData.map((path) => {
              const isHighlighted =
                !highlightedPath ||
                (highlightedPath === "distress" &&
                  (path.id === "a1" ||
                    path.id === "b1" ||
                    path.id === "a1z")) ||
                (highlightedPath === "engagement" &&
                  (path.id === "a2" ||
                    path.id === "b2" ||
                    path.id === "a2z")) ||
                (highlightedPath === "serial" &&
                  (path.id === "a1" ||
                    path.id === "b1" ||
                    path.id === "a2" ||
                    path.id === "b2")) ||
                (highlightedPath === "direct" &&
                  (path.id === "c" || path.id === "cz"));

              const strengthBadge =
                path.pvalue < 0.001
                  ? "Strong evidence"
                  : path.pvalue < 0.05
                  ? "Good evidence"
                  : path.pvalue < 0.1
                  ? "Suggestive"
                  : "Uncertain";
              const badgeClass =
                path.pvalue < 0.001
                  ? styles.strong
                  : path.pvalue < 0.05
                  ? styles.good
                  : path.pvalue < 0.1
                  ? styles.suggestive
                  : styles.uncertain;

              return (
                <motion.div key={path.id} variants={itemVariants}>
                  <InteractiveSurface
                    as="article"
                    className={`${styles.coefficientCard} ${
                      !isHighlighted ? styles.dimmed : ""
                    } interactiveSurface`}
                    hoverLift={4}
                  >
                    <div className={styles.coefficientHeader}>
                      <span className={styles.coefficientLabel}>
                        {path.label}
                      </span>
                      <span className={`${styles.strengthBadge} ${badgeClass}`}>
                        {strengthBadge}
                      </span>
                    </div>
                    <div className={styles.coefficientValue}>
                      Effect size: {path.estimate > 0 ? "+" : ""}
                      {path.estimate.toFixed(2)}
                    </div>
                    <p className={styles.coefficientInterpretation}>
                      {path.interpretation}
                    </p>
                  </InteractiveSurface>
                </motion.div>
              );
            })}
          </div>
          <div className={styles.cardFooter}>
            <InteractiveSurface
              as="button"
              type="button"
              className="button button-secondary button-sm interactiveSurface"
              onClick={handleRefreshData}
              aria-label="Refresh data from the latest model run"
            >
              Refresh data
            </InteractiveSurface>
          </div>
          </InteractiveSurface>
        </motion.section>

        <motion.section
          className={styles.indirectEffects}
          aria-labelledby="indirect-heading"
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={containerVariants}
        >
          <h2 id="indirect-heading">Understanding Indirect Effects</h2>
          <p className={styles.indirectIntro}>
            Indirect effects show how FASt status affects adjustment{" "}
            <em>through</em> stress and engagement. They're calculated by
            multiplying path coefficients together.
          </p>
          <div className={styles.indirectGrid}>
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                as="article"
                className={`${styles.indirectCard} interactiveSurface`}
                hoverLift={4}
              >
                <div className={styles.indirectHeader}>
                  <h3>Stress Route (Indirect)</h3>
                  <span
                    className={`${styles.indirectBadge} ${styles.indirectBadgeDistress}`}
                  >
                    a₁ × b₁
                  </span>
                </div>
                <div className={styles.indirectFormula}>
                  <div className={styles.formulaRow}>
                    <span className={styles.formulaLabel}>FASt → Stress</span>
                    <span className={styles.formulaValue}>
                      a₁ = {paths.a1?.estimate?.toFixed(3) ?? "—"}
                    </span>
                  </div>
                  <div className={styles.formulaMultiply}>×</div>
                  <div className={styles.formulaRow}>
                    <span className={styles.formulaLabel}>
                      Stress → Adjustment
                    </span>
                    <span className={styles.formulaValue}>
                      b₁ = {paths.b1?.estimate?.toFixed(3) ?? "—"}
                    </span>
                  </div>
                  <div className={styles.formulaEquals}>=</div>
                  <div className={styles.formulaResult}>
                    <span className={styles.resultLabel}>Indirect Effect</span>
                    <span className={styles.resultValue}>
                      {(
                        (paths.a1?.estimate ?? 0) * (paths.b1?.estimate ?? 0)
                      ).toFixed(3)}
                    </span>
                  </div>
                </div>
                <p className={styles.indirectInterpretation}>
                  This <strong>negative indirect effect</strong> means FASt
                  status increases stress, which in turn reduces adjustment.
                  This is the "cost" pathway.
                </p>
              </InteractiveSurface>
            </motion.div>

            <motion.div variants={itemVariants}>
              <InteractiveSurface
                as="article"
                className={`${styles.indirectCard} interactiveSurface`}
                hoverLift={4}
              >
                <div className={styles.indirectHeader}>
                  <h3>Engagement Route (Indirect)</h3>
                  <span
                    className={`${styles.indirectBadge} ${styles.indirectBadgeEngagement}`}
                  >
                    a₂ × b₂
                  </span>
                </div>
                <div className={styles.indirectFormula}>
                  <div className={styles.formulaRow}>
                    <span className={styles.formulaLabel}>
                      FASt → Engagement
                    </span>
                    <span className={styles.formulaValue}>
                      a₂ = {paths.a2?.estimate?.toFixed(3) ?? "—"}
                    </span>
                  </div>
                  <div className={styles.formulaMultiply}>×</div>
                  <div className={styles.formulaRow}>
                    <span className={styles.formulaLabel}>
                      Engagement → Adjustment
                    </span>
                    <span className={styles.formulaValue}>
                      b₂ = {paths.b2?.estimate?.toFixed(3) ?? "—"}
                    </span>
                  </div>
                  <div className={styles.formulaEquals}>=</div>
                  <div className={styles.formulaResult}>
                    <span className={styles.resultLabel}>Indirect Effect</span>
                    <span className={styles.resultValue}>
                      {(
                        (paths.a2?.estimate ?? 0) * (paths.b2?.estimate ?? 0)
                      ).toFixed(3)}
                    </span>
                  </div>
                </div>
                <p className={styles.indirectInterpretation}>
                  This indirect effect is <strong>close to zero</strong> because
                  FASt status doesn't significantly change engagement. The
                  benefit comes through the direct path instead.
                </p>
              </InteractiveSurface>
            </motion.div>
          </div>
          <motion.div
            className={styles.decompositionChart}
            variants={itemVariants}
          >
            <EffectDecomposition />
          </motion.div>
        </motion.section>

        <motion.section
          className={styles.summary}
          aria-labelledby="summary-heading"
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={containerVariants}
        >
          <h2 id="summary-heading">The Big Picture</h2>
          <div className={styles.summaryGrid}>
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                as="article"
                className={`${styles.summaryCard} interactiveSurface`}
              >
                <h3>The Stress Route</h3>
                <p>
                  Dual enrollment credits{" "}
                  <strong>increase first-year stress</strong>, which hurts
                  adjustment. This is the main negative pathway. The effect is
                  small but statistically reliable across different student
                  groups.
                </p>
              </InteractiveSurface>
            </motion.div>
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                as="article"
                className={`${styles.summaryCard} interactiveSurface`}
              >
                <h3>The Engagement Route</h3>
                <p>
                  The engagement pathway is <strong>not significant</strong>
                  —dual enrollment status alone doesn't change how much students
                  engage with campus. However, the{" "}
                  <GlossaryTerm
                    term="Path Coefficient"
                    definition="A standardized measure of the strength and direction of a relationship between two variables in our model. Values range from -1 to +1, with larger absolute values indicating stronger relationships."
                  >
                    path from engagement to adjustment
                  </GlossaryTerm>{" "}
                  is one of the strongest in our model.
                </p>
              </InteractiveSurface>
            </motion.div>
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                as="article"
                className={`${styles.summaryCard} interactiveSurface`}
              >
                <h3>Direct Benefits</h3>
                <p>
                  Beyond stress and engagement, dual enrollment credits provide
                  a{" "}
                  <GlossaryTerm
                    term="Direct Effect"
                    definition="The portion of the total effect that doesn't go through the mediators (stress and engagement). It represents other ways dual enrollment credits might help students that we didn't explicitly measure."
                  >
                    small direct boost
                  </GlossaryTerm>{" "}
                  to college success. This might reflect academic preparation,
                  confidence, or other benefits we didn't measure directly.
                </p>
              </InteractiveSurface>
            </motion.div>
          </div>
        </motion.section>

        {/* Key Takeaway */}
        <KeyTakeaway>
          Dual enrollment credits create <strong>competing forces</strong>: they
          increase stress (hurting adjustment) while offering direct academic
          benefits—with the balance shifting based on credit dose.
        </KeyTakeaway>

        <section
          className={styles.nextStep}
          aria-labelledby="next-step-pathway-heading"
        >
          <h2 id="next-step-pathway-heading">Next: Explore Credit Levels</h2>
          <p>
            See how different credit doses change the stress and engagement
            pathways in the model.
          </p>
          <InteractiveSurface
            as="link"
            to="/dose"
            className="button button-primary button-lg interactiveSurface"
            aria-label="Continue to Credit Levels page"
          >
            Go to Credit Levels
          </InteractiveSurface>
        </section>
      </div>

      {/* Diagram Walkthrough */}
      <DiagramWalkthrough
        isOpen={showWalkthrough}
        currentStep={walkthroughStep}
        onStepChange={handleWalkthroughStepChange}
        onClose={handleWalkthroughClose}
      />
    </div>
  );
}
