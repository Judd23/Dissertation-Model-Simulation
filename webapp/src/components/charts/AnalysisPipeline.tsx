import { useScrollReveal } from '../../hooks/useScrollReveal';
import styles from './AnalysisPipeline.module.css';

interface PipelineStep {
  number: number;
  title: string;
  description: string;
  details: string[];
  color: string;
}

const steps: PipelineStep[] = [
  {
    number: 1,
    title: 'Propensity Score Weighting',
    description: 'Balance groups on pre-treatment covariates',
    details: [
      'Overlap weighting (PSW)',
      'Target population: equipoise',
      'Balances demographics & background',
    ],
    color: 'var(--color-fast)',
  },
  {
    number: 2,
    title: 'Weighted SEM Analysis',
    description: 'Estimate path model with weights',
    details: [
      'Full Information ML (FIML)',
      'Parallel mediation design',
      'Moderated by credit dose',
    ],
    color: 'var(--color-engagement)',
  },
  {
    number: 3,
    title: 'Bootstrap Inference',
    description: 'Generate confidence intervals',
    details: [
      '2,000 resamples',
      'Bias-corrected accelerated (BCa)',
      'Indirect effect CIs',
    ],
    color: 'var(--color-belonging)',
  },
];

export default function AnalysisPipeline() {
  const containerRef = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });

  return (
    <div ref={containerRef} className={`${styles.container} reveal`}>
      <div className={styles.pipeline}>
        {steps.map((step, index) => (
          <div key={step.number} className={styles.step}>
            {/* Step Box */}
            <div className={styles.stepBox} style={{ '--step-color': step.color } as React.CSSProperties}>
              <div className={styles.stepNumber}>{step.number}</div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDescription}>{step.description}</p>
              <ul className={styles.stepDetails}>
                {step.details.map((detail, i) => (
                  <li key={i}>{detail}</li>
                ))}
              </ul>
            </div>

            {/* Arrow to next step */}
            {index < steps.length - 1 && (
              <div className={styles.arrow} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile version - vertical stack */}
      <div className={styles.pipelineMobile}>
        {steps.map((step, index) => (
          <div key={step.number} className={styles.stepMobile}>
            <div className={styles.stepBoxMobile} style={{ '--step-color': step.color } as React.CSSProperties}>
              <div className={styles.stepNumberMobile}>{step.number}</div>
              <h3 className={styles.stepTitleMobile}>{step.title}</h3>
              <p className={styles.stepDescriptionMobile}>{step.description}</p>
              <ul className={styles.stepDetailsMobile}>
                {step.details.map((detail, i) => (
                  <li key={i}>{detail}</li>
                ))}
              </ul>
            </div>

            {index < steps.length - 1 && (
              <div className={styles.arrowMobile} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
