import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import BackToTop from '../ui/BackToTop';
import MobileNav from './MobileNav';
import styles from './Layout.module.css';

export default function Layout() {
  return (
    <div className={styles.layout}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <div className={styles.background}>
        <div className={styles.gradient} />
      </div>
      <Header />
      <main id="main-content" className={styles.main}>
        <Outlet />
      </main>
      <BackToTop />
      <MobileNav />
      <Footer />
    </div>
  );
}
