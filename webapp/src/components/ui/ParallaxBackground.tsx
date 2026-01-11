import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { usePointerParallax } from '../../lib/hooks/usePointerParallax';
import { DANCE_SPRING_HEAVY } from '../../lib/transitionConfig';
import styles from './ParallaxBackground.module.css';

/**
 * ParallaxBackground
 * 
 * Three-layer fixed parallax background system with:
 * - Scroll-based parallax (layers move at different speeds)
 * - Pointer-based parallax (subtle world reaction to mouse)
 * - Uses existing "How It Works" gradients and glow layers
 * 
 * Architecture:
 * - bgFar: slowest layer, deep ambient gradients
 * - bgMid: medium layer, glow orbs
 * - bgNear: fastest layer, subtle highlights
 */
export function ParallaxBackground() {
  const { scrollY } = useScroll();

  // Pointer position for subtle world parallax
  const pointer = usePointerParallax({ smoothing: 0.05, enabled: true });

  // Make pointer values motion-native so we can compose them with scroll MotionValues
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  pointerX.set(pointer.x);
  pointerY.set(pointer.y);

  // Scroll-based transforms for each layer
  // Far layer moves slowest (creates depth)
  const farY = useTransform(scrollY, [0, 3000], [0, -150]);
  const midY = useTransform(scrollY, [0, 3000], [0, -300]);
  const nearY = useTransform(scrollY, [0, 3000], [0, -500]);

  // Combine scroll + pointer into ONE x/y per layer (prevents y vs translateY conflicts)
  const farX = useTransform(pointerX, (v) => v * 8);
  const farYCombined = useTransform([farY, pointerY], ([sy, py]: number[]) => sy + py * 6);

  const midX = useTransform(pointerX, (v) => v * 15);
  const midYCombined = useTransform([midY, pointerY], ([sy, py]: number[]) => sy + py * 12);

  const nearX = useTransform(pointerX, (v) => v * 25);
  const nearYCombined = useTransform([nearY, pointerY], ([sy, py]: number[]) => sy + py * 20);

  // Heavy spring feel (use the shared preset as the spring config)
  const farYSpring = useSpring(farYCombined, DANCE_SPRING_HEAVY);
  const midYSpring = useSpring(midYCombined, DANCE_SPRING_HEAVY);
  const nearYSpring = useSpring(nearYCombined, DANCE_SPRING_HEAVY);

  const farXSpring = useSpring(farX, DANCE_SPRING_HEAVY);
  const midXSpring = useSpring(midX, DANCE_SPRING_HEAVY);
  const nearXSpring = useSpring(nearX, DANCE_SPRING_HEAVY);

  return (
    <div className={styles.container} aria-hidden="true">
      {/* FAR LAYER - Deep ambient gradients (slowest) */}
      <motion.div
        className={styles.layerFar}
        style={{
          y: farYSpring,
          x: farXSpring,
        }}
      />

      {/* MID LAYER - Glow orbs (medium speed) */}
      <motion.div
        className={styles.layerMid}
        style={{
          y: midYSpring,
          x: midXSpring,
        }}
      />

      {/* NEAR LAYER - Subtle highlights (fastest) */}
      <motion.div
        className={styles.layerNear}
        style={{
          y: nearYSpring,
          x: nearXSpring,
        }}
      />

      {/* GRAIN/NOISE overlay (static, no parallax) */}
      <div className={styles.grain} />
    </div>
  );
}

export default ParallaxBackground;
