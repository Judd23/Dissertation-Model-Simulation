import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DANCE_SPRING_HEAVY } from '../../config/transitionConfig';
import Header from './Header';
import Footer from './Footer';
import BackToTop from '../ui/BackToTop';
import MobileNav from './MobileNav';
import styles from './Layout.module.css';

export default function Layout() {
  const location = useLocation();

  return (
    <div className={styles.layout}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <div className={styles.background}>
        <div className={styles.gradient} />
      </div>
      <Header />
      <motion.main
        id="main-content"
        className={styles.main}
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={DANCE_SPRING_HEAVY}
      >
        <Outlet />
      </motion.main>
      <BackToTop />
      <MobileNav />
      <Footer />
    </div>
  );
}
