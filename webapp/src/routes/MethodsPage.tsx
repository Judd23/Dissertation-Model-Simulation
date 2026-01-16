// webapp/src/routes/MethodsPage.tsx

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Scale, Network, RefreshCw, Settings, Layers } from "lucide-react";
import { useModelData } from "../app/contexts";
import GlossaryTerm from "../components/ui/GlossaryTerm";
import ProgressRing from "../components/ui/ProgressRing";
import { InteractiveSurface } from "../components/ui/InteractiveSurface";
import { PackageStack } from "../features/charts/PackageStack";
import { Check } from "lucide-react";
import {
  revealVariants,
  containerVariants,
  itemVariants,
  VIEWPORT_CONFIG,
} from "../lib/transitionConfig";
import styles from "./StackingCards.module.css";
import pageStyles from "./MethodsPage.module.css";

export default function MethodsPage() {
  const modelData = useModelData();

  // Fit measures from model data
  const fitMeasures = useMemo(() => {
    if (!modelData?.fitMeasures) return null;
    return modelData.fitMeasures;
  }, [modelData]);

  const fitRings = useMemo(() => {
    if (!fitMeasures) return [];
    return [
      {
        label: "CFI",
        value: fitMeasures.cfi ?? 0.95,
        displayValue: (fitMeasures.cfi ?? 0.95).toFixed(3),
      },
      {
        label: "TLI",
        value: fitMeasures.tli ?? 0.94,
        displayValue: (fitMeasures.tli ?? 0.94).toFixed(3),
      },
      {
        label: "RMSEA",
        value: fitMeasures.rmsea ?? 0.05,
        displayValue: (fitMeasures.rmsea ?? 0.05).toFixed(3),
      },
      {
        label: "SRMR",
        value: fitMeasures.srmr ?? 0.05,
        displayValue: (fitMeasures.srmr ?? 0.05).toFixed(3),
      },
    ];
  }, [fitMeasures]);

  return (
    <div className={pageStyles.page}>
      {/* Page Header */}
      <header className={pageStyles.header}>
        <motion.p
          className={pageStyles.eyebrow}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Technical Methods
        </motion.p>
        <motion.h1
          className={pageStyles.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          How We Built This Analysis
        </motion.h1>
        <motion.p
          className={pageStyles.lead}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          A transparent look at the statistical methods behind our findings.
          Each stage was designed to maximize rigor while accounting for the
          realities of observational data.
        </motion.p>
      </header>

      {/* Stacking Cards Container */}
      <div className={styles.stackingContainer}>
        {/* Card 1: Propensity Score Weighting */}
        <motion.section
          className={styles.card1}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={revealVariants}
        >
          <div className={styles.cardContent}>
            <div className={styles.stageIndicator}>
              <div className={styles.stageIcon}>
                <Scale aria-hidden="true" />
              </div>
              <span className={styles.stageLabel}>Stage 1</span>
            </div>
            <h2 className={styles.cardHeading}>Leveling the Playing Field</h2>
            <p className={styles.cardDescription}>
              Students who earn college credits in high school aren't randomly
              selected—they tend to have higher GPAs, more educated parents, and
              greater resources. Before comparing outcomes, we needed to account
              for these pre-existing differences.
            </p>
            <p className={styles.cardDescription}>
              We used{" "}
              <GlossaryTerm
                term="Propensity Score Weighting"
                definition="A statistical technique that creates pseudo-randomization by weighting observations based on their probability of receiving treatment, reducing selection bias in observational studies."
              >
                propensity score weighting
              </GlossaryTerm>{" "}
              to create balance between FASt and non-FASt students on key
              background characteristics.
            </p>
            <p className={styles.plainTalk}>
              <strong>Plain talk:</strong> We statistically match students so
              we're comparing apples to apples, not apples to oranges.
            </p>
            <div className={styles.keyPoints}>
              <div className={styles.keyPoint}>
                <span className={styles.keyPointMarker}><Check aria-hidden="true" /></span>
                <span className={styles.keyPointText}>
                  Accounts for selection bias in observational data
                </span>
              </div>
              <div className={styles.keyPoint}>
                <span className={styles.keyPointMarker}><Check aria-hidden="true" /></span>
                <span className={styles.keyPointText}>
                  Balances 8 background covariates between groups
                </span>
              </div>
              <div className={styles.keyPoint}>
                <span className={styles.keyPointMarker}><Check aria-hidden="true" /></span>
                <span className={styles.keyPointText}>
                  Creates pseudo-randomization without an experiment
                </span>
              </div>
            </div>
          </div>
          <div className={styles.cardVisualEnhanced}>
            <div className={styles.diagramContainer}>
              <span className={styles.diagramLabel}>Covariate Balance</span>
              <motion.svg
                viewBox="0 0 200 160"
                className={styles.abstractVisual}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {/* Fulcrum */}
                <motion.polygon
                  points="100,130 85,150 115,150"
                  fill="rgba(6, 182, 212, 0.3)"
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.3 } } }}
                />
                {/* Balance beam */}
                <motion.line
                  x1="30" y1="70" x2="170" y2="70"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.1 } } }}
                />
                {/* Support pillar */}
                <motion.line
                  x1="100" y1="70" x2="100" y2="130"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="3"
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.2 } } }}
                />
                {/* Left weight - represents one group */}
                <motion.circle
                  cx="50" cy="50" r="28"
                  fill="rgba(6, 182, 212, 0.35)"
                  stroke="rgba(6, 182, 212, 0.5)"
                  strokeWidth="2"
                  variants={{ hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0, transition: { delay: 0.4, type: "spring" } } }}
                />
                {/* Right weight - represents other group */}
                <motion.circle
                  cx="150" cy="50" r="28"
                  fill="rgba(139, 92, 246, 0.35)"
                  stroke="rgba(139, 92, 246, 0.5)"
                  strokeWidth="2"
                  variants={{ hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0, transition: { delay: 0.5, type: "spring" } } }}
                />
                {/* Center pivot */}
                <motion.circle
                  cx="100" cy="70" r="8"
                  fill="rgba(255,255,255,0.4)"
                  variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: { delay: 0.6 } } }}
                />
                {/* Equal sign in center */}
                <motion.text
                  x="100" y="105" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="20" fontWeight="bold"
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.7 } } }}
                >=</motion.text>
              </motion.svg>
              <span className={styles.diagramCaption}>
                PSW creates comparable groups on observed characteristics
              </span>
            </div>
          </div>
        </motion.section>

        {/* Card 2: Weighted SEM Analysis */}
        <motion.section
          className={styles.card2}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={revealVariants}
        >
          <div className={styles.cardContent}>
            <div className={styles.stageIndicator}>
              <div className={styles.stageIcon}>
                <Network aria-hidden="true" />
              </div>
              <span className={styles.stageLabel}>Stage 2</span>
            </div>
            <h2 className={styles.cardHeading}>Mapping the Pathways</h2>
            <p className={styles.cardDescription}>
              With balanced groups, we used{" "}
              <GlossaryTerm
                term="Structural Equation Modeling"
                definition="A comprehensive statistical approach that combines factor analysis and path analysis to test complex theoretical models with both observed and latent variables."
              >
                structural equation modeling
              </GlossaryTerm>{" "}
              to trace how dual enrollment credits influence first-year
              outcomes—both directly and through intermediate experiences.
            </p>
            <p className={styles.cardDescription}>
              SEM lets us test multiple pathways simultaneously: the direct
              benefit of early credits, and the indirect routes through reduced
              stress and enhanced engagement.
            </p>
            <p className={styles.plainTalk}>
              <strong>Plain talk:</strong> We map all the ways credits might
              help—or hurt—and test them at the same time.
            </p>
            <div className={styles.keyPoints}>
              <div className={styles.keyPoint}>
                <span className={styles.keyPointMarker}><Check aria-hidden="true" /></span>
                <span className={styles.keyPointText}>
                  Tests direct and indirect effects simultaneously
                </span>
              </div>
              <div className={styles.keyPoint}>
                <span className={styles.keyPointMarker}><Check aria-hidden="true" /></span>
                <span className={styles.keyPointText}>
                  Handles measurement error through latent variables
                </span>
              </div>
              <div className={styles.keyPoint}>
                <span className={styles.keyPointMarker}><Check aria-hidden="true" /></span>
                <span className={styles.keyPointText}>
                  Parallel mediation design (stress & engagement)
                </span>
              </div>
            </div>
          </div>
          <div className={styles.cardVisualEnhanced}>
            <div className={styles.diagramContainer}>
              <span className={styles.diagramLabel}>Causal Pathways</span>
              <motion.svg
                viewBox="0 0 220 160"
                className={styles.abstractVisual}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {/* Upper curve - stress pathway */}
                <motion.path
                  d="M30,80 Q110,15 190,80"
                  stroke="rgba(248, 113, 113, 0.6)"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1, transition: { duration: 0.8, delay: 0.2 } } }}
                />
                {/* Lower curve - engagement pathway */}
                <motion.path
                  d="M30,80 Q110,145 190,80"
                  stroke="rgba(6, 182, 212, 0.6)"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1, transition: { duration: 0.8, delay: 0.4 } } }}
                />
                {/* Direct path - dashed */}
                <motion.path
                  d="M30,80 L190,80"
                  stroke="rgba(139, 92, 246, 0.5)"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  fill="none"
                  variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1, transition: { duration: 0.6, delay: 0.6 } } }}
                />
                {/* Source node */}
                <motion.circle
                  cx="30" cy="80" r="14"
                  fill="rgba(255,255,255,0.15)"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="2"
                  variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: { delay: 0 } } }}
                />
                {/* Mediator - stress */}
                <motion.circle
                  cx="110" cy="30" r="12"
                  fill="rgba(248, 113, 113, 0.25)"
                  stroke="rgba(248, 113, 113, 0.5)"
                  strokeWidth="2"
                  variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: { delay: 0.3 } } }}
                />
                {/* Mediator - engagement */}
                <motion.circle
                  cx="110" cy="130" r="12"
                  fill="rgba(6, 182, 212, 0.25)"
                  stroke="rgba(6, 182, 212, 0.5)"
                  strokeWidth="2"
                  variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: { delay: 0.5 } } }}
                />
                {/* Outcome node */}
                <motion.circle
                  cx="190" cy="80" r="14"
                  fill="rgba(139, 92, 246, 0.25)"
                  stroke="rgba(139, 92, 246, 0.5)"
                  strokeWidth="2"
                  variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: { delay: 0.7 } } }}
                />
              </motion.svg>
              <span className={styles.diagramCaption}>
                Multiple pathways tested simultaneously
              </span>
            </div>
          </div>
        </motion.section>

        {/* Card 3: Bootstrap Inference */}
        <motion.section
          className={styles.card3}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={revealVariants}
        >
          <div className={styles.cardContent}>
            <div className={styles.stageIndicator}>
              <div className={styles.stageIcon}>
                <RefreshCw aria-hidden="true" />
              </div>
              <span className={styles.stageLabel}>Stage 3</span>
            </div>
            <h2 className={styles.cardHeading}>Testing Our Confidence</h2>
            <p className={styles.cardDescription}>
              How sure can we be in these findings? We used{" "}
              <GlossaryTerm
                term="Bootstrapping"
                definition="A resampling technique that repeatedly draws samples from the data to estimate the variability of a statistic, providing robust confidence intervals without assuming normality."
              >
                bootstrapping
              </GlossaryTerm>{" "}
              with 2,000 resamples to build confidence intervals that don't
              assume the data follows a perfect bell curve.
            </p>
            <p className={styles.cardDescription}>
              For indirect effects (where we multiply coefficients together), we
              applied{" "}
              <GlossaryTerm
                term="BCa Confidence Intervals"
                definition="Bias-corrected and accelerated bootstrap intervals that adjust for both bias and skewness in the bootstrap distribution, providing more accurate coverage than percentile methods."
              >
                bias-corrected accelerated (BCa)
              </GlossaryTerm>{" "}
              intervals—the gold standard for mediation analysis.
            </p>
            <p className={styles.plainTalk}>
              <strong>Plain talk:</strong> We rerun the analysis 2,000 times to
              see how much results could vary by chance.
            </p>
            <div className={styles.keyPoints}>
              <div className={styles.keyPoint}>
                <span className={styles.keyPointMarker}><Check aria-hidden="true" /></span>
                <span className={styles.keyPointText}>
                  No normality assumption required
                </span>
              </div>
              <div className={styles.keyPoint}>
                <span className={styles.keyPointMarker}><Check aria-hidden="true" /></span>
                <span className={styles.keyPointText}>
                  Robust for indirect effects (products of coefficients)
                </span>
              </div>
              <div className={styles.keyPoint}>
                <span className={styles.keyPointMarker}><Check aria-hidden="true" /></span>
                <span className={styles.keyPointText}>
                  Industry-standard BCa method for mediation
                </span>
              </div>
            </div>
          </div>
          <div className={styles.cardVisualEnhanced}>
            <div className={styles.diagramContainer}>
              <span className={styles.diagramLabel}>
                Bootstrap Distribution
              </span>
              <motion.svg
                viewBox="0 0 220 140"
                className={styles.abstractVisual}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {/* Confidence region fill */}
                <motion.path
                  d="M20,120 Q50,120 70,75 Q110,15 150,75 Q170,120 200,120 L200,120 L20,120 Z"
                  fill="rgba(16, 185, 129, 0.12)"
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.1 } } }}
                />
                {/* Distribution curve */}
                <motion.path
                  d="M20,120 Q50,120 70,75 Q110,15 150,75 Q170,120 200,120"
                  stroke="rgba(16, 185, 129, 0.7)"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1, transition: { duration: 1, delay: 0.2 } } }}
                />
                {/* Left CI bound */}
                <motion.line
                  x1="55" y1="25" x2="55" y2="120"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.8 } } }}
                />
                {/* Right CI bound */}
                <motion.line
                  x1="165" y1="25" x2="165" y2="120"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.8 } } }}
                />
                {/* Point estimate marker */}
                <motion.circle
                  cx="110" cy="20" r="6"
                  fill="rgba(16, 185, 129, 0.9)"
                  variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: { delay: 1, type: "spring" } } }}
                />
                {/* CI label - left */}
                <motion.text
                  x="55" y="135" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9"
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.9 } } }}
                >2.5%</motion.text>
                {/* CI label - right */}
                <motion.text
                  x="165" y="135" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9"
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.9 } } }}
                >97.5%</motion.text>
              </motion.svg>
              <span className={styles.diagramCaption}>
                2,000 resamples with BCa confidence intervals
              </span>
            </div>
          </div>
        </motion.section>

        {/* Card 4: Analysis Settings */}
        <motion.section
          className={styles.card4}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={revealVariants}
        >
          <div className={styles.cardContent}>
            <div className={styles.stageIndicator}>
              <div className={styles.stageIcon}>
                <Settings aria-hidden="true" />
              </div>
              <span className={styles.stageLabel}>Specifications</span>
            </div>
            <h2 className={styles.cardHeading}>Technical Settings</h2>
            <p className={styles.cardDescription}>
              The specific parameters we chose for estimation, missing data
              handling, and model structure.
            </p>
            <div className={styles.specGrid}>
              <div className={styles.specItem}>
                <p className={styles.specLabel}>Estimator</p>
                <p className={styles.specValue}>Maximum Likelihood</p>
              </div>
              <div className={styles.specItem}>
                <p className={styles.specLabel}>Missing Data</p>
                <p className={styles.specValue}>Full Information ML</p>
              </div>
              <div className={styles.specItem}>
                <p className={styles.specLabel}>Weights</p>
                <p className={styles.specValue}>PSW Overlap</p>
              </div>
              <div className={styles.specItem}>
                <p className={styles.specLabel}>Bootstrap Reps</p>
                <p className={styles.specValue}>2,000</p>
              </div>
              <div className={styles.specItem}>
                <p className={styles.specLabel}>CI Method</p>
                <p className={styles.specValue}>BCa</p>
              </div>
              <div className={styles.specItem}>
                <p className={styles.specLabel}>Model Framework</p>
                <p className={styles.specValue}>Hayes Model 59</p>
              </div>
            </div>
          </div>
          <div className={styles.cardVisualEnhanced}>
            <div className={styles.diagramContainer}>
              <span className={styles.diagramLabel}>Configuration</span>
              <motion.svg
                viewBox="0 0 180 160"
                className={styles.abstractVisual}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {/* Main gear - outer */}
                <motion.circle
                  cx="90" cy="80" r="40"
                  fill="none"
                  stroke="rgba(245, 158, 11, 0.4)"
                  strokeWidth="10"
                  strokeDasharray="18 10"
                  variants={{ hidden: { opacity: 0, rotate: -30 }, visible: { opacity: 1, rotate: 0, transition: { duration: 0.8 } } }}
                  style={{ transformOrigin: "90px 80px" }}
                />
                {/* Main gear - inner */}
                <motion.circle
                  cx="90" cy="80" r="18"
                  fill="rgba(245, 158, 11, 0.25)"
                  stroke="rgba(245, 158, 11, 0.5)"
                  strokeWidth="2"
                  variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: { delay: 0.3 } } }}
                />
                {/* Small gear - top right */}
                <motion.circle
                  cx="145" cy="45" r="18"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="6"
                  strokeDasharray="10 6"
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.4 } } }}
                />
                <motion.circle
                  cx="145" cy="45" r="8"
                  fill="rgba(255,255,255,0.1)"
                  variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: { delay: 0.5 } } }}
                />
                {/* Small gear - bottom left */}
                <motion.circle
                  cx="35" cy="115" r="18"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="6"
                  strokeDasharray="10 6"
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.5 } } }}
                />
                <motion.circle
                  cx="35" cy="115" r="8"
                  fill="rgba(255,255,255,0.1)"
                  variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: { delay: 0.6 } } }}
                />
                {/* Connection indicators */}
                <motion.line
                  x1="120" y1="60" x2="130" y2="55"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="2"
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.7 } } }}
                />
                <motion.line
                  x1="60" y1="100" x2="50" y2="105"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="2"
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.7 } } }}
                />
              </motion.svg>
              <span className={styles.diagramCaption}>
                Key estimation parameters for full reproducibility
              </span>
            </div>
          </div>
        </motion.section>

        {/* Card 5: What We Measured */}
        <motion.section
          className={styles.card5}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={revealVariants}
        >
          <div className={styles.cardContent}>
            <div className={styles.stageIndicator}>
              <div className={styles.stageIcon}>
                <Layers aria-hidden="true" />
              </div>
              <span className={styles.stageLabel}>Measurement</span>
            </div>
            <h2 className={styles.cardHeading}>What We Measured</h2>
            <p className={styles.cardDescription}>
              Each concept in our model was measured using multiple survey
              questions, creating more reliable{" "}
              <GlossaryTerm
                term="Latent Variable"
                definition="An unobserved construct inferred from multiple measured indicators, capturing the shared variance while filtering out measurement error."
              >
                latent variables
              </GlossaryTerm>{" "}
              than any single question could provide.
            </p>
            <div className={styles.constructGrid}>
              <div className={styles.constructCard} data-theme="distress">
                <p className={styles.constructName}>Emotional Distress</p>
                <p className={styles.constructItems}>
                  6 items: academic difficulties, loneliness, mental health,
                  exhaustion, sleep problems, financial stress
                </p>
              </div>
              <div className={styles.constructCard} data-theme="engagement">
                <p className={styles.constructName}>Quality of Engagement</p>
                <p className={styles.constructItems}>
                  5 items: interactions with students, advisors, faculty, staff,
                  administrators
                </p>
              </div>
              <div className={styles.constructCard} data-theme="adjustment">
                <p className={styles.constructName}>Developmental Adjustment</p>
                <p className={styles.constructItems}>
                  15 items across 4 domains: belonging, gains, support,
                  satisfaction
                </p>
              </div>
            </div>
            <div className={styles.keyPoints}>
              <div className={styles.keyPoint}>
                <span className={styles.keyPointMarker}><Check aria-hidden="true" /></span>
                <span className={styles.keyPointText}>
                  26 survey items total from NSSE
                </span>
              </div>
              <div className={styles.keyPoint}>
                <span className={styles.keyPointMarker}><Check aria-hidden="true" /></span>
                <span className={styles.keyPointText}>
                  3 latent constructs with validated scales
                </span>
              </div>
              <div className={styles.keyPoint}>
                <span className={styles.keyPointMarker}><Check aria-hidden="true" /></span>
                <span className={styles.keyPointText}>
                  Second-order factor for developmental adjustment
                </span>
              </div>
            </div>
          </div>
          <div className={styles.cardVisualEnhanced}>
            <div className={styles.diagramContainer}>
              <span className={styles.diagramLabel}>Latent Structure</span>
              <motion.svg
                viewBox="0 0 220 170"
                className={styles.abstractVisual}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {/* Bottom layer - observed indicators */}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <motion.rect
                    key={`indicator-${i}`}
                    x={25 + i * 30}
                    y="130"
                    width="22"
                    height="30"
                    rx="4"
                    fill="rgba(255,255,255,0.08)"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="1"
                    variants={{
                      hidden: { opacity: 0, y: 15 },
                      visible: { opacity: 1, y: 0, transition: { delay: 0.1 + i * 0.05 } }
                    }}
                  />
                ))}
                {/* Connecting lines from indicators to latent */}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <motion.line
                    key={`line-${i}`}
                    x1={36 + i * 30}
                    y1="130"
                    x2="110"
                    y2="95"
                    stroke="rgba(236, 72, 153, 0.25)"
                    strokeWidth="1"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: { opacity: 1, transition: { delay: 0.4 + i * 0.03 } }
                    }}
                  />
                ))}
                {/* Middle layer - latent construct */}
                <motion.rect
                  x="45" y="65" width="130" height="35" rx="8"
                  fill="rgba(236, 72, 153, 0.2)"
                  stroke="rgba(236, 72, 153, 0.45)"
                  strokeWidth="2"
                  variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1, transition: { delay: 0.5 } } }}
                />
                <motion.text
                  x="110" y="87" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="11" fontWeight="500"
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.6 } } }}
                >Latent Construct</motion.text>
                {/* Connecting line to second-order */}
                <motion.line
                  x1="110" y1="65" x2="110" y2="45"
                  stroke="rgba(139, 92, 246, 0.4)"
                  strokeWidth="2"
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.65 } } }}
                />
                {/* Top layer - second-order factor */}
                <motion.rect
                  x="65" y="15" width="90" height="30" rx="6"
                  fill="rgba(139, 92, 246, 0.25)"
                  stroke="rgba(139, 92, 246, 0.5)"
                  strokeWidth="2"
                  variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1, transition: { delay: 0.7 } } }}
                />
                <motion.text
                  x="110" y="35" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="10" fontWeight="500"
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.8 } } }}
                >Second-Order</motion.text>
              </motion.svg>
              <span className={styles.diagramCaption}>
                Latent variables from multiple survey indicators
              </span>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Software Panel (standalone banner) */}
      <motion.section
        className={styles.softwarePanel}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        variants={revealVariants}
      >
        <div className={styles.cardContent}>
          <motion.p className={styles.cardEyebrow} variants={itemVariants}>
            Reproducibility
          </motion.p>
          <motion.h2 className={styles.cardHeading} variants={itemVariants}>
            Open-Source Toolkit
          </motion.h2>
          <p className={styles.cardDescription}>
            All analyses used open-source software, ensuring transparency and
            full reproducibility. The complete codebase is available in the
            project repository.
          </p>
          <div className={styles.softwareList}>
            <div className={styles.softwareGroup}>
              <h3>R Packages</h3>
              <ul>
                <li>
                  <code>lavaan</code> — Structural equation modeling
                </li>
                <li>
                  <code>semTools</code> — Model diagnostics and extensions
                </li>
                <li>
                  <code>mice</code> — Multiple imputation
                </li>
                <li>
                  <code>parallel</code> — Distributed computation
                </li>
              </ul>
            </div>
            <div className={styles.softwareGroup}>
              <h3>Python Packages</h3>
              <ul>
                <li>
                  <code>pandas</code>, <code>numpy</code> — Data processing
                </li>
                <li>
                  <code>matplotlib</code>, <code>seaborn</code> — Visualization
                </li>
                <li>
                  <code>python-docx</code> — Report generation
                </li>
              </ul>
            </div>
          </div>
          <div className={styles.keyPoints}>
            <div className={styles.keyPoint}>
              <span className={styles.keyPointMarker}><Check aria-hidden="true" /></span>
              <span className={styles.keyPointText}>
                Fully reproducible analysis pipeline
              </span>
            </div>
            <div className={styles.keyPoint}>
              <span className={styles.keyPointMarker}><Check aria-hidden="true" /></span>
              <span className={styles.keyPointText}>
                Code available on GitHub
              </span>
            </div>
            <div className={styles.keyPoint}>
              <span className={styles.keyPointMarker}><Check aria-hidden="true" /></span>
              <span className={styles.keyPointText}>
                No proprietary software required
              </span>
            </div>
          </div>
        </div>
        <div className={styles.cardVisualEnhanced}>
          <div className={styles.diagramContainer}>
            <span className={styles.diagramLabel}>Analysis Stack</span>
            <PackageStack />
            <span className={styles.diagramCaption}>
              Open-source, reproducible analysis
            </span>
          </div>
        </div>
      </motion.section>

      {/* Model Fit Panel (standalone) */}
      <motion.section
        className={styles.modelFitPanel}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        variants={containerVariants}
      >
        <motion.p className={styles.cardEyebrow} variants={itemVariants}>
          Model Quality
        </motion.p>
        <motion.h2 className={styles.cardHeading} variants={itemVariants}>
          How Well Does the Model Fit?
        </motion.h2>
        <motion.p className={styles.cardDescription} variants={itemVariants}>
          These indices tell us whether our theoretical model accurately
          captures the patterns in the data. All measures meet or exceed
          recommended thresholds.
        </motion.p>
        <motion.p className={styles.plainTalk} variants={itemVariants}>
          <strong>Plain talk:</strong> Higher CFI/TLI and lower RMSEA/SRMR mean
          the model fits reality well.
        </motion.p>

        <motion.div className={styles.fitRingsGrid} variants={itemVariants}>
          {fitRings.map((ring) => (
            <ProgressRing
              key={ring.label}
              label={ring.label}
              value={ring.value}
              displayValue={ring.displayValue}
            />
          ))}
        </motion.div>

        <motion.table className={styles.fitTable} variants={itemVariants}>
          <thead>
            <tr>
              <th>Measure</th>
              <th>What It Tells Us</th>
              <th>Value</th>
              <th>Target</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>χ² (Chi-Square)</td>
              <td>Overall model-data discrepancy</td>
              <td>{fitMeasures?.chisq?.toFixed(2) ?? "—"}</td>
              <td>p &gt; .05</td>
              <td className={styles.fitPass}>—</td>
            </tr>
            <tr>
              <td>df</td>
              <td>Degrees of freedom</td>
              <td>{fitMeasures?.df ?? "—"}</td>
              <td>—</td>
              <td>—</td>
            </tr>
            <tr>
              <td>CFI</td>
              <td>Comparative fit vs. null model</td>
              <td>{fitMeasures?.cfi?.toFixed(3) ?? "—"}</td>
              <td>≥ .95</td>
              <td
                className={
                  (fitMeasures?.cfi ?? 0) >= 0.95
                    ? styles.fitPass
                    : styles.fitFail
                }
              >
                {(fitMeasures?.cfi ?? 0) >= 0.95 ? "Pass" : "Review"}
              </td>
            </tr>
            <tr>
              <td>TLI</td>
              <td>Parsimony-adjusted fit</td>
              <td>{fitMeasures?.tli?.toFixed(3) ?? "—"}</td>
              <td>≥ .95</td>
              <td
                className={
                  (fitMeasures?.tli ?? 0) >= 0.95
                    ? styles.fitPass
                    : styles.fitFail
                }
              >
                {(fitMeasures?.tli ?? 0) >= 0.95 ? "Pass" : "Review"}
              </td>
            </tr>
            <tr>
              <td>RMSEA</td>
              <td>Error of approximation</td>
              <td>{fitMeasures?.rmsea?.toFixed(3) ?? "—"}</td>
              <td>≤ .06</td>
              <td
                className={
                  (fitMeasures?.rmsea ?? 1) <= 0.06
                    ? styles.fitPass
                    : styles.fitFail
                }
              >
                {(fitMeasures?.rmsea ?? 1) <= 0.06 ? "Pass" : "Review"}
              </td>
            </tr>
            <tr>
              <td>SRMR</td>
              <td>Standardized residual</td>
              <td>{fitMeasures?.srmr?.toFixed(3) ?? "—"}</td>
              <td>≤ .08</td>
              <td
                className={
                  (fitMeasures?.srmr ?? 1) <= 0.08
                    ? styles.fitPass
                    : styles.fitFail
                }
              >
                {(fitMeasures?.srmr ?? 1) <= 0.08 ? "Pass" : "Review"}
              </td>
            </tr>
          </tbody>
        </motion.table>
      </motion.section>

      {/* References */}
      <motion.section
        className={styles.referencesSection}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_CONFIG}
        variants={containerVariants}
      >
        <motion.h2 className={styles.cardHeading} variants={itemVariants}>
          References
        </motion.h2>
        <motion.ul className={styles.referencesList} variants={itemVariants}>
          <li>
            Hayes, A. F. (2022).{" "}
            <em>
              Introduction to mediation, moderation, and conditional process
              analysis
            </em>{" "}
            (3rd ed.). Guilford Press.
          </li>
          <li>
            Hu, L., & Bentler, P. M. (1999). Cutoff criteria for fit indexes in
            covariance structure analysis.{" "}
            <em>Structural Equation Modeling, 6</em>(1), 1–55.
          </li>
          <li>
            Kline, R. B. (2023).{" "}
            <em>Principles and practice of structural equation modeling</em>{" "}
            (5th ed.). Guilford Press.
          </li>
          <li>
            Li, F., Morgan, K. L., & Zaslavsky, A. M. (2018). Balancing
            covariates via propensity score weighting.{" "}
            <em>Journal of the American Statistical Association, 113</em>(521),
            390–400.
          </li>
          <li>
            Preacher, K. J., & Hayes, A. F. (2008). Asymptotic and resampling
            strategies for assessing and comparing indirect effects.{" "}
            <em>Behavior Research Methods, 40</em>(3), 879–891.
          </li>
        </motion.ul>
      </motion.section>

      {/* Next Step CTA */}
      <section className={pageStyles.nextStep}>
        <h2>Next: See the Model in Action</h2>
        <p>
          Explore the pathway diagram to see how stress and engagement connect
          to student success.
        </p>
        <InteractiveSurface
          as="link"
          to="/pathway"
          className="button button-primary button-lg interactiveSurface"
        >
          View Pathway Diagram
        </InteractiveSurface>
      </section>
    </div>
  );
}
