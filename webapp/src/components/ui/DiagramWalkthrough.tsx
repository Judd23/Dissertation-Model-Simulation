import { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './DiagramWalkthrough.module.css';

export const WALKTHROUGH_STORAGE_KEY = 'pathway-walkthrough-seen';

export type HighlightedPath = 'distress' | 'engagement' | 'serial' | 'direct' | null;

interface WalkthroughStep {
  title: string;
  description: string;
  highlightedPath: HighlightedPath;
}

const STEPS: WalkthroughStep[] = [
  {
    title: 'Welcome to the Model',
    description: 'This diagram shows how earning college credits in high school (FASt status) affects first-year adjustment through two main routes.',
    highlightedPath: null,
  },
  {
    title: 'The Stress Route',
    description: 'The red arrows trace the stress pathway. FASt students report higher stress (a₁), and stress strongly hurts adjustment (b₁). This is the "cost" of early credits.',
    highlightedPath: 'distress',
  },
  {
    title: 'The Engagement Route',
    description: 'The blue arrows trace the engagement pathway. FASt status doesn\'t significantly change engagement (a₂), but engagement strongly helps adjustment (b₂).',
    highlightedPath: 'engagement',
  },
  {
    title: 'Direct Effects',
    description: 'The gray arrow shows FASt\'s direct benefit to adjustment—effects beyond stress and engagement. Line thickness indicates effect strength. Click any path for details.',
    highlightedPath: 'direct',
  },
];

interface DiagramWalkthroughProps {
  isOpen: boolean;
  currentStep: number;
  onStepChange: (step: number, highlightedPath: HighlightedPath) => void;
  onClose: () => void;
}

export default function DiagramWalkthrough({
  isOpen,
  currentStep,
  onStepChange,
  onClose,
}: DiagramWalkthroughProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const totalSteps = STEPS.length;
  const step = STEPS[currentStep] ?? STEPS[0];
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  // Body scroll lock when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Focus trap - focus the card when opened
  useEffect(() => {
    if (isOpen && cardRef.current) {
      cardRef.current.focus();
    }
  }, [isOpen]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onClose();
    } else {
      const nextStep = currentStep + 1;
      onStepChange(nextStep, STEPS[nextStep].highlightedPath);
    }
  }, [currentStep, isLastStep, onClose, onStepChange]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      const prevStep = currentStep - 1;
      onStepChange(prevStep, STEPS[prevStep].highlightedPath);
    }
  }, [currentStep, isFirstStep, onStepChange]);

  const handleDotClick = useCallback((index: number) => {
    onStepChange(index, STEPS[index].highlightedPath);
  }, [onStepChange]);

  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handleBack();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handleBack]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Card */}
          <motion.div
            ref={cardRef}
            className={styles.card}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25, duration: 0.5 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="walkthrough-title"
            tabIndex={-1}
          >
            {/* Step indicator */}
            <div className={styles.stepIndicator} aria-label="Walkthrough steps">
              {STEPS.map((_, index) => (
                <button
                  key={index}
                  className={`${styles.dot} ${index === currentStep ? styles.active : ''}`}
                  onClick={() => handleDotClick(index)}
                  aria-label={`Go to step ${index + 1} of ${totalSteps}${index === currentStep ? ' (current)' : ''}`}
                  aria-current={index === currentStep ? 'step' : undefined}
                  type="button"
                />
              ))}
            </div>

            {/* Content with step transition */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={styles.content}
              >
                <h3 id="walkthrough-title" className={styles.title}>
                  {step.title}
                </h3>
                <p className={styles.description}>
                  {step.description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className={styles.navigation}>
              <button
                className={styles.skipButton}
                onClick={handleSkip}
                type="button"
              >
                Skip
              </button>

              <div className={styles.buttons}>
                <button
                  className={styles.backButton}
                  onClick={handleBack}
                  disabled={isFirstStep}
                  type="button"
                >
                  Back
                </button>
                <button
                  className={styles.nextButton}
                  onClick={handleNext}
                  type="button"
                >
                  {isLastStep ? 'Got it' : 'Next'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
