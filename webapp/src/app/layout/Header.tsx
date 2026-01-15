import { useEffect, useState } from "react";
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
  const [scrollProgress, setScrollProgress] = useState(0);
  const location = useLocation();

  // Don't show progress bar on landing page (HashRouter initially shows '/')
  const showProgress =
    location.pathname !== "/" && location.pathname !== "/home";

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
      setScrollProgress(progress);
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
          data-progress={Math.round(scrollProgress * 100)}
          role="progressbar"
          aria-valuenow={Math.round(scrollProgress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Page scroll progress"
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
