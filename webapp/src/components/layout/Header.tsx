import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import ThemeToggle from '../ui/ThemeToggle';
import styles from './Header.module.css';

const navItems = [
  { to: '/home', label: 'Home' },
  { to: '/dose', label: 'Credit Levels' },
  { to: '/demographics', label: 'Equity Frame' },
  { to: '/pathway', label: 'How It Works' },
  { to: '/methods', label: 'Methods' },
  { to: '/researcher', label: 'Researcher' },
];

export default function Header() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const location = useLocation();

  // Don't show progress bar on landing page
  const showProgress = location.pathname !== '/';

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  return (
    <header className={styles.header}>
      {showProgress && (
        <div
          className={styles.progressBar}
          style={{ width: `${scrollProgress * 100}%` }}
          role="progressbar"
          aria-valuenow={Math.round(scrollProgress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Page scroll progress"
        />
      )}
      <div className={styles.container}>
        <NavLink to="/home" className={styles.brandLink} aria-label="Go to home">
          <div className={styles.brand}>
            <h1 className={styles.title}>Dual Credit & Developmental Adjustment</h1>
            <span className={styles.subtitle}>Psychosocial Effects Among California's Equity-Impacted Students</span>
          </div>
        </NavLink>
        <nav className={styles.nav} aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
              end={item.to === '/home'}
            >
              {item.label}
            </NavLink>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
