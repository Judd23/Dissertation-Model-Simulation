import { NavLink } from 'react-router-dom';
import { navItems } from './navItems';
import styles from './MobileNav.module.css';

export default function MobileNav() {
  return (
    <nav className={styles.nav} aria-label="Mobile navigation">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `${styles.link} ${isActive ? styles.active : ''}`
          }
          end={item.to === '/home'}
        >
          <svg 
            className={styles.icon} 
            viewBox="0 0 24 24" 
            fill="currentColor"
            aria-hidden="true"
          >
            <path d={item.icon} />
          </svg>
          <span className={styles.label}>{item.shortLabel}</span>
        </NavLink>
      ))}
    </nav>
  );
}
