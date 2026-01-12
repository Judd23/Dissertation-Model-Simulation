import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import BackToTop from '../../components/ui/BackToTop';
import MobileNav from './MobileNav';
import { useModelData } from '../contexts';
import styles from './Layout.module.css';

export default function Layout() {
  const location = useLocation();
  const { validation } = useModelData();
  const showDataInvalidBanner = import.meta.env.DEV && !validation.isValid;
  
  // Hide header/footer on landing page
  const isLandingPage = location.pathname === '/';

  return (
    <div className={styles.layout}>
      {showDataInvalidBanner && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            padding: '8px 12px',
            fontSize: 12,
            background: 'rgba(180, 30, 30, 0.9)',
            color: '#fff',
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          }}
          role="status"
          aria-live="polite"
        >
          Data invalid (dev): {validation.errors[0] ?? 'Unknown error'}
        </div>
      )}
      {!isLandingPage && (
        <a href="#main-content" className={styles.skipLink}>
          Skip to main content
        </a>
      )}
      {!isLandingPage && <Header />}
      <main
        id="main-content"
        className={styles.main}
      >
        <Outlet />
      </main>
      {!isLandingPage && <BackToTop />}
      {!isLandingPage && <MobileNav />}
      {!isLandingPage && <Footer />}
    </div>
  );
}
