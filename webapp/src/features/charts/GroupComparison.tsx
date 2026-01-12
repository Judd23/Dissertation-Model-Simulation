import { useMemo } from 'react';
import { motion } from 'motion/react';
import { groupComparisons } from '../../data/adapters/groupComparisons';
import { sampleDescriptives } from '../../data/adapters/sampleDescriptives';
import styles from './GroupComparison.module.css';

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
  grouping: 'race' | 'firstgen' | 'pell' | 'sex' | 'living';
  pathway: 'a1' | 'a2';
}

/* ─────────────────────────────────────────────────────────
   DATA BUILDER
   ───────────────────────────────────────────────────────── */
function getGroupData(grouping: GroupComparisonProps['grouping'], pathway: 'a1' | 'a2'): GroupEffect[] {
  const demographics = sampleDescriptives.demographics;
  
  const sampleSizes: Record<string, Record<string, number>> = {
    race: {
      'Hispanic/Latino': demographics.race['Hispanic/Latino']?.n || 2350,
      'White': demographics.race['White']?.n || 1069,
      'Asian': demographics.race['Asian']?.n || 835,
      'Black/African American': demographics.race['Black/African American']?.n || 200,
      'Other/Multiracial': demographics.race['Other/Multiracial/Unknown']?.n || 546,
    },
    firstgen: {
      'First-Gen': demographics.firstgen?.yes?.n || 2353,
      'Continuing-Gen': demographics.firstgen?.no?.n || 2647,
    },
    pell: {
      'Pell Eligible': demographics.pell?.yes?.n || 2158,
      'Not Pell Eligible': demographics.pell?.no?.n || 2842,
    },
    sex: {
      'Women': demographics.sex?.women?.n || 3104,
      'Men': demographics.sex?.men?.n || 1896,
    },
    living: {
      'With Family': 2946,
      'Off-Campus': 945,
      'On-Campus': 1109,
    },
  };

  const groupingMap: Record<string, keyof typeof groupComparisons> = {
    race: 'byRace',
    firstgen: 'byFirstgen',
    pell: 'byPell',
    sex: 'bySex',
    living: 'byLiving',
  };

  const jsonKey = groupingMap[grouping];
  const jsonData = groupComparisons[jsonKey];
  
  if (!jsonData?.groups) return [];

  return jsonData.groups.map(g => ({
    label: g.label,
    estimate: g.effects[pathway]?.estimate || 0,
    se: g.effects[pathway]?.se || 0.05,
    pvalue: g.effects[pathway]?.pvalue || 1,
    n: sampleSizes[grouping]?.[g.label] || 500,
  }));
}

/* ─────────────────────────────────────────────────────────
   COMPONENT
   ───────────────────────────────────────────────────────── */
export default function GroupComparison({ grouping, pathway }: GroupComparisonProps) {
  const data = useMemo(() => getGroupData(grouping, pathway), [grouping, pathway]);

  if (data.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.noData}>No data available for this grouping.</p>
      </div>
    );
  }

  // Calculate scale bounds
  const allValues = data.flatMap(d => [d.estimate - 1.96 * d.se, d.estimate + 1.96 * d.se]);
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
        <div 
          className={styles.zeroLine} 
          style={{ left: `${zeroPercent}%` }}
        />
        
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
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              {/* Label */}
              <div className={styles.label}>
                <span className={styles.groupName}>{d.label}</span>
                <span className={styles.sampleSize}>n = {d.n.toLocaleString()}</span>
              </div>
              
              {/* Chart area */}
              <div className={styles.chartArea}>
                {/* Confidence interval line */}
                <div 
                  className={styles.ciLine}
                  style={{
                    left: `${toPercent(ciLow)}%`,
                    width: `${toPercent(ciHigh) - toPercent(ciLow)}%`,
                  }}
                />
                
                {/* CI caps */}
                <div 
                  className={styles.ciCap}
                  style={{ left: `${toPercent(ciLow)}%` }}
                />
                <div 
                  className={styles.ciCap}
                  style={{ left: `${toPercent(ciHigh)}%` }}
                />
                
                {/* Point estimate */}
                <motion.div 
                  className={`${styles.point} ${isSignificant ? styles.significant : ''}`}
                  style={{ left: `${toPercent(d.estimate)}%` }}
                  whileHover={{ scale: 1.3 }}
                />
              </div>
              
              {/* Estimate value */}
              <div className={styles.estimate}>
                <span className={isSignificant ? styles.sigValue : ''}>
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
          <span className={`${styles.legendDot} ${styles.significant}`} />
          p &lt; .05
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} />
          p ≥ .05
        </span>
      </div>
    </div>
  );
}
