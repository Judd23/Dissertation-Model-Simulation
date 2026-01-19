import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { TransitionNavLink } from "../../features/transitions";
import {
  DANCE_SPRING_HEAVY,
  HOVER_SUBTLE,
  TAP_SUBTLE,
} from "../../lib/transitionConfig";
import { navItems } from "./navItems";
import styles from "./Header.module.css";

export default function Header() {
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastBucketRef = useRef(-1);
  const location = useLocation();

  // Don't show progress bar on landing page (HashRouter initially shows '/')
  const showProgress =
    location.pathname !== "/" && location.pathname !== "/home";

  useEffect(() => {
    const handleScroll = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        const scrollTop = window.scrollY;
        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
        const width = `${progress * 100}%`;
        const progressBar = progressBarRef.current;

        if (progressBar) {
          progressBar.style.width = width;
          progressBar.setAttribute("data-progress", `${Math.round(progress * 100)}`);
        }

        const bucket = Math.floor(progress * 20);
        if (bucket !== lastBucketRef.current) {
          lastBucketRef.current = bucket;
          console.log("[DEBUG][Header](NO $) Scroll progress:", {
            scrollTop,
            docHeight,
            progress,
            width,
            showProgress,
          });
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial calculation
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  return (
    <header className={styles.header}>
      {showProgress && (
        <div
          className={styles.progressBar}
          aria-hidden="true"
          ref={progressBarRef}
          style={{ width: "0%" }}
        />
      )}
      <div className={styles.container}>
        <TransitionNavLink
          to="/home"
          className={styles.brandLink}
          aria-label="Go to home"
        >
          <div className={styles.brand}>
            <h1 className={styles.title}>
              Dual Credit & Developmental Adjustment
            </h1>
            <span className={styles.subtitle}>
              Psychosocial Effects Among California's Equity-Impacted Students
            </span>
          </div>
        </TransitionNavLink>
        <nav className={styles.nav} aria-label="Primary navigation">
          {navItems.map((item) => (
            <motion.span
              key={item.to}
              whileHover={HOVER_SUBTLE}
              whileTap={TAP_SUBTLE}
              transition={DANCE_SPRING_HEAVY}
              style={{ display: "inline-block" }}
            >
              <TransitionNavLink
                to={item.to}
                className={({ isActive }) =>
                  `${styles.navLink} interactiveSurface ${
                    isActive ? styles.active : ""
                  }`
                }
                end={item.to === "/home"}
              >
                {item.label}
              </TransitionNavLink>
            </motion.span>
          ))}
        </nav>
      </div>
    </header>
  );
}
