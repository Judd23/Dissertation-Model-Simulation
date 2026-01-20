import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useResearch } from "../app/contexts";
import GroupComparison from "../features/charts/GroupComparison";
import Toggle from "../components/ui/Toggle";
import GlossaryTerm from "../components/ui/GlossaryTerm";
import { InteractiveSurface } from "../components/ui/InteractiveSurface";
import {
  revealVariantsScale,
  containerVariants,
  itemVariants,
  VIEWPORT_CONFIG,
} from "../lib/transitionConfig";
import { fetchFastComparison } from "../data/adapters/fastComparison";
import { fetchSampleDescriptives } from "../data/adapters/sampleDescriptives";
import type { FastComparison } from "../data/types/fastComparison";
import type { SampleDescriptives } from "../data/types/sampleDescriptives";
import styles from "./DemographicsPage.module.css";

const groupingOptions = [
  {
    value: "race",
    label: "Race/Ethnicity",
    description:
      "Compare across Hispanic/Latino, White, Asian, Black/African American, and Other groups",
  },
  {
    value: "firstgen",
    label: "First-Generation",
    description:
      "Compare first-generation college students vs. students with college-educated parents",
  },
  {
    value: "pell",
    label: "Financial Need",
    description:
      "Compare students receiving Pell grants (lower income) vs. those who don't",
  },
  {
    value: "sex",
    label: "Gender",
    description: "Compare female vs. male students",
  },
  {
    value: "living",
    label: "Living Situation",
    description:
      "Compare students living with family, on-campus, or off-campus",
  },
] as const;

export default function DemographicsPage() {
  const { groupingVariable, setGroupingVariable } = useResearch();
  const [showComparison, setShowComparison] = useState(false);
  const [fastComparison, setFastComparison] = useState<FastComparison | null>(
    null,
  );
  const [sampleDescriptives, setSampleDescriptives] =
    useState<SampleDescriptives | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [comparison, descriptives] = await Promise.all([
          fetchFastComparison(),
          fetchSampleDescriptives(),
        ]);
        if (isMounted) {
          setFastComparison(comparison);
          setSampleDescriptives(descriptives);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("(NO $) [DemographicsPage] data load failed:", error);
        }
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!fastComparison || !sampleDescriptives) {
    return (
      <div className={styles.page}>
        <div className="container">
          <p style={{ padding: "2rem", textAlign: "center" }}>
            Loading demographics data...
          </p>
        </div>
      </div>
    );
  }

  // Early return if demographics data is malformed
  if (
    !sampleDescriptives.demographics ||
    typeof sampleDescriptives.demographics !== "object"
  ) {
    return (
      <div className={styles.page}>
        <div className="container">
          <p style={{ padding: "2rem", textAlign: "center" }}>
            Demographics data not available. Check console for details.
          </p>
        </div>
      </div>
    );
  }

  const demographics = sampleDescriptives.demographics;

  return (
    <div className={styles.page}>
      <div className="container">
        <motion.section
          className={styles.header}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={revealVariantsScale}
        >
          <div className={styles.headerContent}>
            <p className={styles.eyebrow}>Equity Framework</p>
            <h1>Do Effects Differ for Different Students?</h1>
            <p className="lead">
              An important question: Do dual enrollment credits affect all
              students the same way? We use{" "}
              <GlossaryTerm
                term="Multi-Group Analysis"
                definition="A statistical technique that tests whether relationships in our model differ across student groups (e.g., race, income, first-generation status). This helps identify whether some students benefit more or less from dual enrollment credits."
              >
                multi-group analysis
              </GlossaryTerm>{" "}
              to compare whether{" "}
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
              patterns differ across student backgrounds.
            </p>
          </div>
        </motion.section>

        {/* Demographics Breakdown with Comparison Toggle */}
        <motion.div
          className={styles.demographicsBreakdown}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={containerVariants}
        >
          <div className={styles.demographicsHeader}>
            <h2>Sample Demographics</h2>
            <Toggle
              checked={showComparison}
              onChange={() => setShowComparison(!showComparison)}
              label="Compare FASt vs Non-FASt"
              id="demographics-page-comparison-toggle"
            />
          </div>

          <motion.div
            className={`${styles.demographicsGrid} ${
              showComparison ? styles.comparing : ""
            }`}
            variants={containerVariants}
          >
            {/* Race/Ethnicity Breakdown */}
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                className={`${styles.demoCard} interactiveSurface`}
                style={{ transitionDelay: "0ms" }}
                hoverLift={4}
              >
                <h3>Race & Ethnicity</h3>
                <div className={styles.demoStats}>
                  {Object.entries(demographics.race ?? {}).map(
                    ([group, data]) => (
                      <div key={group} className={styles.demoStat}>
                        {!showComparison ? (
                          <>
                            <div className={styles.demoLabel}>
                              <span>{group}</span>
                              <span>{data.pct}%</span>
                            </div>
                            <div className={styles.demoBar}>
                              <div
                                className={styles.demoBarFill}
                                style={{ width: `${data.pct}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <div className={styles.demoComparison}>
                            <div className={styles.demoLabel}>
                              <span>{group}</span>
                            </div>
                            <div className={styles.comparisonRow}>
                              <span className={styles.comparisonLabel}>
                                FASt
                              </span>
                              <div className={styles.demoBar}>
                                <div
                                  className={styles.demoBarFill}
                                  style={{
                                    width: `${
                                      fastComparison.demographics.race[group]
                                        .fast.pct
                                    }%`,
                                    backgroundColor: "var(--color-fast)",
                                  }}
                                />
                              </div>
                              <span>
                                {
                                  fastComparison.demographics.race[group].fast
                                    .pct
                                }
                                %
                              </span>
                            </div>
                            <div className={styles.comparisonRow}>
                              <span className={styles.comparisonLabel}>
                                Non-FASt
                              </span>
                              <div className={styles.demoBar}>
                                <div
                                  className={styles.demoBarFill}
                                  style={{
                                    width: `${
                                      fastComparison.demographics.race[group]
                                        .nonfast.pct
                                    }%`,
                                    backgroundColor: "var(--color-text-muted)",
                                  }}
                                />
                              </div>
                              <span>
                                {
                                  fastComparison.demographics.race[group]
                                    .nonfast.pct
                                }
                                %
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </InteractiveSurface>
            </motion.div>

            {/* First-Gen & Pell */}
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                className={`${styles.demoCard} interactiveSurface`}
                style={{ transitionDelay: "100ms" }}
                hoverLift={4}
              >
                <h3>Access & Equity</h3>
                <div className={styles.demoStats}>
                  <div className={styles.demoStat}>
                    <div className={styles.demoLabel}>
                      <span>First-Generation</span>
                      <span>
                        {!showComparison
                          ? `${demographics.firstgen.yes.pct}%`
                          : ""}
                      </span>
                    </div>
                    {!showComparison ? (
                      <div className={styles.demoBar}>
                        <div
                          className={styles.demoBarFill}
                          style={{ width: `${demographics.firstgen.yes.pct}%` }}
                        />
                      </div>
                    ) : (
                      <div className={styles.demoComparison}>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>FASt</span>
                          <div className={styles.demoBar}>
                            <div
                              className={styles.demoBarFill}
                              style={{
                                width: `${fastComparison.demographics.firstgen.yes.fast.pct}%`,
                                backgroundColor: "var(--color-fast)",
                              }}
                            />
                          </div>
                          <span>
                            {fastComparison.demographics.firstgen.yes.fast.pct}%
                          </span>
                        </div>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>
                            Non-FASt
                          </span>
                          <div className={styles.demoBar}>
                            <div
                              className={styles.demoBarFill}
                              style={{
                                width: `${fastComparison.demographics.firstgen.yes.nonfast.pct}%`,
                                backgroundColor: "var(--color-text-muted)",
                              }}
                            />
                          </div>
                          <span>
                            {
                              fastComparison.demographics.firstgen.yes.nonfast
                                .pct
                            }
                            %
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={styles.demoStat}>
                    <div className={styles.demoLabel}>
                      <span>Pell Grant Recipients</span>
                      <span>
                        {!showComparison ? `${demographics.pell.yes.pct}%` : ""}
                      </span>
                    </div>
                    {!showComparison ? (
                      <div className={styles.demoBar}>
                        <div
                          className={styles.demoBarFill}
                          style={{ width: `${demographics.pell.yes.pct}%` }}
                        />
                      </div>
                    ) : (
                      <div className={styles.demoComparison}>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>FASt</span>
                          <div className={styles.demoBar}>
                            <div
                              className={styles.demoBarFill}
                              style={{
                                width: `${fastComparison.demographics.pell.yes.fast.pct}%`,
                                backgroundColor: "var(--color-fast)",
                              }}
                            />
                          </div>
                          <span>
                            {fastComparison.demographics.pell.yes.fast.pct}%
                          </span>
                        </div>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>
                            Non-FASt
                          </span>
                          <div className={styles.demoBar}>
                            <div
                              className={styles.demoBarFill}
                              style={{
                                width: `${fastComparison.demographics.pell.yes.nonfast.pct}%`,
                                backgroundColor: "var(--color-text-muted)",
                              }}
                            />
                          </div>
                          <span>
                            {fastComparison.demographics.pell.yes.nonfast.pct}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </InteractiveSurface>
            </motion.div>

            {/* Gender */}
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                className={`${styles.demoCard} interactiveSurface`}
                style={{ transitionDelay: "200ms" }}
                hoverLift={4}
              >
                <h3>Gender</h3>
                <div className={styles.demoStats}>
                  {Object.entries(demographics.sex ?? {}).map(
                    ([group, data]) => (
                      <div key={group} className={styles.demoStat}>
                        {!showComparison ? (
                          <>
                            <div className={styles.demoLabel}>
                              <span>{group}</span>
                              <span>{data.pct}%</span>
                            </div>
                            <div className={styles.demoBar}>
                              <div
                                className={styles.demoBarFill}
                                style={{ width: `${data.pct}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <div className={styles.demoComparison}>
                            <div className={styles.demoLabel}>
                              <span>{group}</span>
                            </div>
                            <div className={styles.comparisonRow}>
                              <span className={styles.comparisonLabel}>
                                FASt
                              </span>
                              <div className={styles.demoBar}>
                                <div
                                  className={styles.demoBarFill}
                                  style={{
                                    width: `${
                                      fastComparison.demographics.sex[group]
                                        .fast.pct
                                    }%`,
                                    backgroundColor: "var(--color-fast)",
                                  }}
                                />
                              </div>
                              <span>
                                {
                                  fastComparison.demographics.sex[group].fast
                                    .pct
                                }
                                %
                              </span>
                            </div>
                            <div className={styles.comparisonRow}>
                              <span className={styles.comparisonLabel}>
                                Non-FASt
                              </span>
                              <div className={styles.demoBar}>
                                <div
                                  className={styles.demoBarFill}
                                  style={{
                                    width: `${
                                      fastComparison.demographics.sex[group]
                                        .nonfast.pct
                                    }%`,
                                    backgroundColor: "var(--color-text-muted)",
                                  }}
                                />
                              </div>
                              <span>
                                {
                                  fastComparison.demographics.sex[group].nonfast
                                    .pct
                                }
                                %
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </InteractiveSurface>
            </motion.div>

            {/* Living Situation */}
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                className={`${styles.demoCard} interactiveSurface`}
                style={{ transitionDelay: "300ms" }}
                hoverLift={4}
              >
                <h3>Living Situation</h3>
                <div className={styles.demoStats}>
                  {Object.entries(demographics.living ?? {}).map(
                    ([group, data]) => (
                      <div key={group} className={styles.demoStat}>
                        {!showComparison ? (
                          <>
                            <div className={styles.demoLabel}>
                              <span>{group}</span>
                              <span>{data.pct}%</span>
                            </div>
                            <div className={styles.demoBar}>
                              <div
                                className={styles.demoBarFill}
                                style={{ width: `${data.pct}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <div className={styles.demoComparison}>
                            <div className={styles.demoLabel}>
                              <span>{group}</span>
                            </div>
                            <div className={styles.comparisonRow}>
                              <span className={styles.comparisonLabel}>
                                FASt
                              </span>
                              <div className={styles.demoBar}>
                                <div
                                  className={styles.demoBarFill}
                                  style={{
                                    width: `${
                                      fastComparison.demographics.living[group]
                                        .fast.pct
                                    }%`,
                                    backgroundColor: "var(--color-fast)",
                                  }}
                                />
                              </div>
                              <span>
                                {
                                  fastComparison.demographics.living[group].fast
                                    .pct
                                }
                                %
                              </span>
                            </div>
                            <div className={styles.comparisonRow}>
                              <span className={styles.comparisonLabel}>
                                Non-FASt
                              </span>
                              <div className={styles.demoBar}>
                                <div
                                  className={styles.demoBarFill}
                                  style={{
                                    width: `${
                                      fastComparison.demographics.living[group]
                                        .nonfast.pct
                                    }%`,
                                    backgroundColor: "var(--color-text-muted)",
                                  }}
                                />
                              </div>
                              <span>
                                {
                                  fastComparison.demographics.living[group]
                                    .nonfast.pct
                                }
                                %
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </InteractiveSurface>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.section
          className={styles.sampleInfo}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={containerVariants}
        >
          <h2>FASt vs Non-FASt Snapshot</h2>
          <p className={styles.sampleIntro}>
            A quick look at sample size and baseline characteristics for each
            group.
          </p>
          <p className={styles.plainTalk}>
            Plain talk: FASt students came in with more credits but have similar
            demographic backgrounds.
          </p>
          <motion.div
            className={styles.sampleGrid}
            variants={containerVariants}
          >
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                className={`${styles.sampleCard} interactiveSurface`}
              >
                <div className={styles.sampleHeader}>
                  <span className={styles.sampleLabel}>FASt Students</span>
                  <span className={styles.sampleCount}>
                    {fastComparison.overall.fast_n.toLocaleString()}
                  </span>
                </div>
                <div className={styles.sampleDetail}>
                  12+ dual enrollment credits from high school
                </div>
                <div className={styles.sampleStats}>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Avg credits:</span>{" "}
                    <strong>
                      {fastComparison.demographics.transferCredits.fast.mean.toFixed(
                        1,
                      )}
                    </strong>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>First-Gen:</span>{" "}
                    <strong>
                      {fastComparison.demographics.firstgen.yes.fast.pct.toFixed(
                        1,
                      )}
                      %
                    </strong>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Pell:</span>{" "}
                    <strong>
                      {fastComparison.demographics.pell.yes.fast.pct.toFixed(1)}
                      %
                    </strong>
                  </div>
                </div>
              </InteractiveSurface>
            </motion.div>
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                className={`${styles.sampleCard} interactiveSurface`}
              >
                <div className={styles.sampleHeader}>
                  <span className={styles.sampleLabel}>Non-FASt Students</span>
                  <span className={styles.sampleCount}>
                    {fastComparison.overall.nonfast_n.toLocaleString()}
                  </span>
                </div>
                <div className={styles.sampleDetail}>
                  Fewer than 12 dual enrollment credits
                </div>
                <div className={styles.sampleStats}>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Avg credits:</span>{" "}
                    <strong>
                      {fastComparison.demographics.transferCredits.nonfast.mean.toFixed(
                        1,
                      )}
                    </strong>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>First-Gen:</span>{" "}
                    <strong>
                      {fastComparison.demographics.firstgen.yes.nonfast.pct.toFixed(
                        1,
                      )}
                      %
                    </strong>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Pell:</span>{" "}
                    <strong>
                      {fastComparison.demographics.pell.yes.nonfast.pct.toFixed(
                        1,
                      )}
                      %
                    </strong>
                  </div>
                </div>
              </InteractiveSurface>
            </motion.div>
          </motion.div>
        </motion.section>

        <motion.section
          className={styles.controls}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={revealVariantsScale}
        >
          <label className={styles.selectLabel}>Compare students by:</label>
          <div
            className={styles.groupButtons}
            role="group"
            aria-label="Student grouping options"
          >
            {groupingOptions.map((option) => (
              <InteractiveSurface
                key={option.value}
                as="button"
                className={`${styles.groupButton} ${
                  groupingVariable === option.value ? styles.active : ""
                } interactiveSurface`}
                onClick={() => setGroupingVariable(option.value)}
                aria-pressed={groupingVariable === option.value}
                hoverLift={3}
              >
                {option.label}
              </InteractiveSurface>
            ))}
          </div>
          <p className={styles.groupDescription}>
            {
              groupingOptions.find((o) => o.value === groupingVariable)
                ?.description
            }
          </p>
          <p className={styles.plainTalk}>
            Plain talk: we’re checking whether the same credit effect looks
            different for each group.
          </p>
        </motion.section>

        <motion.div
          className={styles.charts}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <InteractiveSurface
              className={`${styles.chartContainer} interactiveSurface`}
              hoverLift={4}
            >
              <h2>
                Effect on Stress by{" "}
                {
                  groupingOptions.find((o) => o.value === groupingVariable)
                    ?.label
                }
              </h2>
              <p className={styles.chartDescription}>
                Does earning dual enrollment credits lead to different stress
                levels across equity groups?
              </p>
              <GroupComparison
                grouping={groupingVariable}
                pathway="a1"
                aria-label="Chart comparing stress outcomes across equity groups"
              />
            </InteractiveSurface>
          </motion.div>

          <motion.div variants={itemVariants}>
            <InteractiveSurface
              className={`${styles.chartContainer} interactiveSurface`}
              hoverLift={4}
            >
              <h2>
                Effect on Engagement by{" "}
                {
                  groupingOptions.find((o) => o.value === groupingVariable)
                    ?.label
                }
              </h2>
              <p className={styles.chartDescription}>
                Does earning dual enrollment credits change campus engagement
                differently across equity groups?
              </p>
              <GroupComparison
                grouping={groupingVariable}
                pathway="a2"
                aria-label="Chart comparing engagement outcomes across equity groups"
              />
            </InteractiveSurface>
          </motion.div>
        </motion.div>

        <motion.div
          className={styles.interpretation}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={containerVariants}
        >
          <h2>Why This Matters for Equity</h2>
          <motion.div
            className={styles.interpretationGrid}
            variants={containerVariants}
          >
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                as="article"
                className={`${styles.interpretationCard} interactiveSurface`}
                hoverLift={4}
              >
                <h3>Fair Comparisons</h3>
                <p>
                  Before comparing groups, we tested for{" "}
                  <GlossaryTerm
                    term="Measurement Invariance"
                    definition="A statistical test verifying that survey questions measure the same underlying concepts equally well across different student groups. Without this, group comparisons could be misleading."
                  >
                    measurement invariance
                  </GlossaryTerm>{" "}
                  to ensure our survey questions work the same way for all
                  students. This confirms we're measuring the same things across
                  different backgrounds.
                </p>
              </InteractiveSurface>
            </motion.div>
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                as="article"
                className={`${styles.interpretationCard} interactiveSurface`}
                hoverLift={4}
              >
                <h3>Looking for Differences</h3>
                <p>
                  If the{" "}
                  <GlossaryTerm
                    term="Effect Size"
                    definition="A standardized measure of how strong a relationship is. In forest plots, effect sizes near zero indicate little to no effect, while larger values (positive or negative) indicate stronger effects."
                  >
                    effect sizes
                  </GlossaryTerm>{" "}
                  look similar across groups, it means dual enrollment credits
                  affect students similarly regardless of background. If they
                  differ, some students might need different support.
                </p>
              </InteractiveSurface>
            </motion.div>
            <motion.div variants={itemVariants}>
              <InteractiveSurface
                as="article"
                className={`${styles.interpretationCard} interactiveSurface`}
                hoverLift={4}
              >
                <h3>Targeted Support</h3>
                <p>
                  If effects are similar for everyone, universal programs may
                  work best. If{" "}
                  <GlossaryTerm
                    term="Moderation"
                    definition="When the relationship between two variables changes depending on a third variable. For example, if the effect of dual enrollment credits on stress is stronger for first-generation students than continuing-generation students."
                  >
                    moderation by demographics
                  </GlossaryTerm>{" "}
                  exists, colleges might need specialized support for specific
                  student populations.
                </p>
              </InteractiveSurface>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.section
          className={styles.nextStep}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_CONFIG}
          variants={revealVariantsScale}
        >
          <h2>Next: How We Ran the Study</h2>
          <p>
            See the step-by-step method we used to make fair comparisons and
            test the model.
          </p>
          <InteractiveSurface
            as="link"
            to="/methods"
            className="button button-primary button-lg interactiveSurface"
          >
            Go to Methods
          </InteractiveSurface>
        </motion.section>
      </div>
    </div>
  );
}
