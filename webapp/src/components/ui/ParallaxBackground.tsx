import styles from './ParallaxBackground.module.css';

/**
 * ParallaxBackground
 * 
 * Static cinematic background with color orbs and grain.
 * Rendered once by Layout - no motion, no hooks, no animation.
 */
export function ParallaxBackground() {
  return (
    <div className={styles.container} aria-hidden="true">
      {/* Static background layer with cosmic gradients */}
      <div className={styles.background} />

      {/* Grain/noise overlay */}
      <div className={styles.grain} />
    </div>
  );
}

export default ParallaxBackground;
