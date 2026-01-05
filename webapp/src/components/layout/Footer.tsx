import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.citation}>
            <strong>Citation:</strong> Johnson, J. (2025). <em>Conditional-process SEM analysis of
            accelerated dual credit participation effects on first-year developmental adjustment
            among equity-impacted CSU students.</em> Ed.D. Dissertation.
          </div>
          <div className={styles.note}>
            Note: Data simulated to reflect CSU demographics and theorized treatment effects.
            All analyses use propensity score overlap weights for causal inference.
          </div>
        </div>
        <div className={styles.methodology}>
          <span className={styles.badge}>N = 5,000</span>
          <span className={styles.badge}>Bootstrap = 2,000</span>
          <span className={styles.badge}>Hayes Model 59</span>
        </div>
      </div>

      <div className={styles.attribution}>
        <div className={styles.attributionContent}>
          <span className={styles.attributionText}>
            Website designed and developed by <strong>J. Johnson</strong>
          </span>
          <span className={styles.separator}>|</span>
          <span className={styles.company}>ECHO Insite Analytics™</span>
          <span className={styles.separator}>|</span>
          <span className={styles.contact}>For inquiries, please contact: <a href="mailto:Judd23@gmail.com" className={styles.link}>Judd23@gmail.com</a></span>
        </div>
      </div>
    </footer>
  );
}
