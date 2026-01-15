import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PAGE_FADE,
  DANCE_SPRING,
  DANCE_SPRING_HEAVY,
  HOVER_SUBTLE,
  TAP_SUBTLE,
} from "../lib/transitionConfig";
import styles from "./LandingPageAlt.module.css";

// ============================================
// PARTICLE SPHERE ANIMATION
// ============================================
function useParticleSphere(
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles: {
      x: number;
      y: number;
      z: number;
      baseX: number;
      baseY: number;
      baseZ: number;
    }[] = [];
    const particleCount = 800;
    const radius = 180;
    let animationId: number;
    let rotation = 0;

    // Initialize particles on sphere surface
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      particles.push({ x, y, z, baseX: x, baseY: y, baseZ: z });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      rotation += 0.003;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Sort by z for depth
      const sortedParticles = particles
        .map((p) => {
          // Rotate around Y axis
          const cosR = Math.cos(rotation);
          const sinR = Math.sin(rotation);
          const x = p.baseX * cosR - p.baseZ * sinR;
          const z = p.baseX * sinR + p.baseZ * cosR;
          return { ...p, x, z, y: p.baseY };
        })
        .sort((a, b) => a.z - b.z);

      sortedParticles.forEach((p) => {
        const scale = (p.z + radius * 1.5) / (radius * 3);
        const alpha = Math.max(0.1, Math.min(1, scale));
        const size = Math.max(1, 3 * scale);

        // Two-tone sphere: cyan on top, violet on bottom
        const normalizedY = (p.y + radius) / (radius * 2); // 0 = top, 1 = bottom
        const cyanR = 6,
          cyanG = 244,
          cyanB = 255;
        const violetR = 196,
          violetG = 181,
          violetB = 253;
        const r = Math.round(cyanR + (violetR - cyanR) * normalizedY);
        const g = Math.round(cyanG + (violetG - cyanG) * normalizedY);
        const b = Math.round(cyanB + (violetB - cyanB) * normalizedY);

        ctx.beginPath();
        ctx.arc(centerX + p.x, centerY + p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [canvasRef]);
}

// ============================================
// ANIMATION VARIANTS
// ============================================
const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: DANCE_SPRING,
  },
};

export default function LandingPageAlt() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useParticleSphere(canvasRef);

  const handleEnter = () => {
    navigate("/home");
  };

  const logoSrc = `${
    import.meta.env.BASE_URL
  }researcher/sdsu_primary-logo_rgb_horizontal_reverse.png`;

  console.log("LandingPageAlt mounted", styles);

  return (
    <motion.div
      className={styles.landing}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={PAGE_FADE}
      style={{ background: "#030712", minHeight: "100vh" }}
    >
      {/* Background Ambient Glow Blobs */}
      <div className={`${styles.blob} ${styles.blobCyan}`} />
      <div className={`${styles.blob} ${styles.blobViolet}`} />

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          {/* Logo */}
          <div className={styles.logoGroup}>
            <div className={styles.logoIcon}>DC</div>
            <span className={styles.logoText}>
              Dual Credit<span className={styles.logoMuted}>.Study</span>
            </span>
          </div>

          {/* Institution Badge */}
          <motion.a
            href="https://www.sdsu.edu"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.institutionBadge}
            whileHover={HOVER_SUBTLE}
            transition={DANCE_SPRING}
          >
            <img
              src={logoSrc}
              alt="San Diego State University"
              className={styles.institutionLogo}
            />
          </motion.a>
        </div>
      </nav>

      {/* Main Content */}
      <main className={styles.main}>
        <motion.div
          className={styles.hero}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Live Badge */}
          <motion.div className={styles.liveBadge} variants={fadeUpVariants}>
            <span className={styles.liveDot}>
              <span className={styles.livePing} />
              <span className={styles.liveCore} />
            </span>
            ED.D. DISSERTATION RESEARCH
          </motion.div>

          {/* Title */}
          <motion.h1 className={styles.title} variants={fadeUpVariants}>
            Psychosocial Effects of
            <br />
            Accelerated Dual Credit
          </motion.h1>

          {/* Subtitle */}
          <motion.p className={styles.subtitle} variants={fadeUpVariants}>
            How early college credits shape student
            success and well-being.
          </motion.p>
        </motion.div>

        {/* Particle Sphere Container */}
        <motion.div
          className={styles.sphereContainer}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: [0.97, 1.03, 0.97] }}
          transition={{ opacity: { duration: 0.8 }, scale: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
        >
          <canvas
            ref={canvasRef}
            className={styles.particleCanvas}
            width={512}
            height={512}
          />

          {/* Inner Breathing Orb */}
          <div className={styles.innerOrb} />

          {/* Central Pulse Ring */}
          <div className={styles.pulseRingWrapper}>
            <div className={styles.pulseRing} />
          </div>

          {/* Floating Stats */}
          <motion.div
            className={`${styles.floatingStat} ${styles.floatLeft}`}
            animate={{ y: [-8, 8, -8] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className={styles.statLabel}>FASt</span>
            <span className={styles.statValue}>Designation</span>
          </motion.div>

          <motion.div
            className={`${styles.floatingStat} ${styles.floatRight}`}
            animate={{ y: [8, -8, 8] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className={styles.statLabel}>N = 5,000</span>
            <span className={styles.statValue}>Sample Size</span>
          </motion.div>
        </motion.div>

        {/* Author Attribution */}
        <motion.div
          className={styles.author}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className={styles.authorName}>Jay Johnson</h2>
          <span className={styles.authorTitle}>Doctoral Candidate</span>
        </motion.div>
        {/* CTA Button */}
        <motion.div
          className={styles.ctaWrapper}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...DANCE_SPRING, delay: 1.0 }}
        >
          <div className={styles.ctaGlow} />
          <motion.button
            className={styles.cta}
            onClick={handleEnter}
            whileHover={HOVER_SUBTLE}
            whileTap={TAP_SUBTLE}
            transition={DANCE_SPRING_HEAVY}
          >
            <span>Explore the Research</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </motion.button>
        </motion.div>

      </main>
    </motion.div>
  );
}
