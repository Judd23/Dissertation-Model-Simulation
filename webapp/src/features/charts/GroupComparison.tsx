import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DANCE_SPRING_HEAVY, TIMING_SECONDS } from "../../lib/transitionConfig";
import { fetchGroupComparisons } from "../../data/adapters/groupComparisons";
import { fetchSampleDescriptives } from "../../data/adapters/sampleDescriptives";
import type { GroupComparisonsJson } from "../../data/types/groupComparisons";
import type { SampleDescriptives } from "../../data/types/sampleDescriptives";
import styles from "./GroupComparison.module.css";

/* ─────────────────────────────────────────────────────────
   TYPES
   ───────────────────────────────────────────────────────── */
interface GroupEffect {
  label: string;
  estimate: number;
  se: number;
  pvalue: number;
  n: number;
}

interface GroupComparisonProps {
  grouping: "race" | "firstgen" | "pell" | "sex" | "living";
  pathway: "a1" | "a2";
}

/* ─────────────────────────────────────────────────────────
   DATA BUILDER
   ───────────────────────────────────────────────────────── */
function getGroupData(
  demographics: SampleDescriptives["demographics"],
  groupComparisons: GroupComparisonsJson,
  grouping: GroupComparisonProps["grouping"],
  pathway: "a1" | "a2"
): GroupEffect[] {
  const sampleSizes: Record<string, Record<string, number>> = {
    race: {
      "Hispanic/Latino": demographics.race["Hispanic/Latino"].n,
      White: demographics.race["White"].n,
      Asian: demographics.race["Asian"].n,
      "Black/African American":
        demographics.race["Black/African American"].n,
      "Other/Multiracial":
        demographics.race["Other/Multiracial/Unknown"].n,
    },
    firstgen: {
      "First-Gen": demographics.firstgen.yes.n,
      "Continuing-Gen": demographics.firstgen.no.n,
    },
    pell: {
      "Pell Eligible": demographics.pell.yes.n,
      "Not Pell Eligible": demographics.pell.no.n,
    },
    sex: {
      Women: demographics.sex.women.n,
      Men: demographics.sex.men.n,
    },
    living: {
      "With Family": demographics.living["With Family"].n,
      "Off-Campus": demographics.living["Off-Campus"].n,
      "On-Campus": demographics.living["On-Campus"].n,
    },
  };

  const groupingMap: Record<string, keyof typeof groupComparisons> = {
    race: "byRace",
    firstgen: "byFirstgen",
    pell: "byPell",
    sex: "bySex",
    living: "byLiving",
  };

  const jsonKey = groupingMap[grouping];
  const jsonData = groupComparisons[jsonKey];

  if (!jsonData?.groups) return [];

  return jsonData.groups.map((g) => ({
    label: g.label,
    estimate: g.effects[pathway].estimate,
    se: g.effects[pathway].se,
    pvalue: g.effects[pathway].pvalue,
    n: sampleSizes[grouping][g.label],
  }));
}

/* ─────────────────────────────────────────────────────────
   COMPONENT
   ───────────────────────────────────────────────────────── */
export default function GroupComparison({
  grouping,
  pathway,
}: GroupComparisonProps) {
  const [groupComparisons, setGroupComparisons] = useState<GroupComparisonsJson | null>(null);
  const [sampleDescriptives, setSampleDescriptives] = useState<SampleDescriptives | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [comparisons, descriptives] = await Promise.all([
          fetchGroupComparisons(),
          fetchSampleDescriptives(),
        ]);
        if (isMounted) {
          setGroupComparisons(comparisons);
          setSampleDescriptives(descriptives);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('(NO $) [GroupComparison] data load failed:', error);
        }
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // useMemo MUST be called before any early return to avoid React #310 error
  const data = useMemo(
    () => {
      if (!groupComparisons || !sampleDescriptives) return [];
      return getGroupData(sampleDescriptives.demographics, groupComparisons, grouping, pathway);
    },
    [grouping, pathway, groupComparisons, sampleDescriptives]
  );

  if (!groupComparisons || !sampleDescriptives) {
    return null;
  }

  if (data.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.noData}>No data available for this grouping.</p>
      </div>
    );
  }

  // Calculate scale bounds
  const allValues = data.flatMap((d) => [
    d.estimate - 1.96 * d.se,
    d.estimate + 1.96 * d.se,
  ]);
  const minVal = Math.min(...allValues, -0.1);
  const maxVal = Math.max(...allValues, 0.1);
  const range = maxVal - minVal;

  // Convert value to percentage position
  const toPercent = (val: number) => ((val - minVal) / range) * 100;
  const zeroPercent = toPercent(0);

  return (
    <div className={styles.container}>
      {/* Forest plot */}
      <div className={styles.forestPlot}>
        {/* Zero line */}
        <div className={styles.zeroLine} style={{ left: `${zeroPercent}%` }} />

        {/* Rows */}
        {data.map((d, i) => {
          const ciLow = d.estimate - 1.96 * d.se;
          const ciHigh = d.estimate + 1.96 * d.se;
          const isSignificant = d.pvalue < 0.05;

          return (
            <motion.div
              key={d.label}
              className={styles.row}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05, duration: 0.3 }}
            >
              {/* Label */}
              <div className={styles.label}>
                <span className={styles.groupName}>{d.label}</span>
                <span className={styles.sampleSize}>
                  n = {d.n.toLocaleString()}
                </span>
              </div>

              {/* Chart area */}
              <div className={styles.chartArea}>
                {/* Confidence interval line */}
                <motion.div
                  className={styles.ciLine}
                  style={{
                    left: `${toPercent(ciLow)}%`,
                    width: `${toPercent(ciHigh) - toPercent(ciLow)}%`,
                    transformOrigin: "left",
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{
                    delay: 0.3 + i * TIMING_SECONDS.stagger + 0.1,
                    duration: TIMING_SECONDS.stagger * 1.5,
                  }}
                />

                {/* CI caps */}
                <motion.div
                  className={styles.ciCap}
                  style={{ left: `${toPercent(ciLow)}%` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    delay: 0.3 + i * TIMING_SECONDS.stagger + 0.15,
                    duration: TIMING_SECONDS.stagger,
                  }}
                />
                <motion.div
                  className={styles.ciCap}
                  style={{ left: `${toPercent(ciHigh)}%` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    delay: 0.3 + i * TIMING_SECONDS.stagger + 0.15,
                    duration: TIMING_SECONDS.stagger,
                  }}
                />

                {/* Point estimate */}
                <motion.div
                  className={`${styles.point} ${
                    isSignificant ? styles.significant : ""
                  }`}
                  style={{ left: `${toPercent(d.estimate)}%` }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    delay: 0.3 + i * TIMING_SECONDS.stagger + 0.2,
                    ...DANCE_SPRING_HEAVY,
                  }}
                  whileHover={{ scale: 1.3 }}
                />
              </div>

              {/* Estimate value */}
              <div className={styles.estimate}>
                <span className={isSignificant ? styles.sigValue : ""}>
                  {d.estimate.toFixed(3)}
                </span>
                {isSignificant && <span className={styles.star}>*</span>}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className={styles.xAxis}>
        <span>{minVal.toFixed(2)}</span>
        <span className={styles.zeroLabel}>0</span>
        <span>{maxVal.toFixed(2)}</span>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.significant}`} />p &lt;
          .05
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} />p ≥ .05
        </span>
      </div>
      <p className={styles.dataNote}>Data simulated for illustration</p>
    </div>
  );
}
