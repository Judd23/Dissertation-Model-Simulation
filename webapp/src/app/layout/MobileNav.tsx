import { motion } from 'framer-motion';
import { TransitionNavLink } from '../../features/transitions';
import { DANCE_SPRING_HEAVY } from '../../lib/transitionConfig';
import { navItems } from './navItems';
import styles from './MobileNav.module.css';

export default function MobileNav() {
  return (
    <nav className={styles.nav} aria-label="Mobile navigation">
      {navItems.map((item) => (
        <motion.span
          key={item.to}
          whileHover={{ y: -2 }}
          whileTap={{ y: 0, scale: 0.98 }}
          transition={DANCE_SPRING_HEAVY}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <TransitionNavLink
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
          </TransitionNavLink>
        </motion.span>
      ))}
    </nav>
  );
}
