import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from './auth';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Interview from './pages/Interview';
import Report from './pages/Report';

function Splash() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div className="logo-icon-box" style={{ width: 48, height: 48, borderRadius: 14 }}>
        <Sparkles size={26} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--tx-muted)', fontSize: '0.95rem', fontWeight: 500 }}>
        <Loader2 className="ico" style={{ animation: 'spin 1s linear infinite' }} />
        <span>Initializing interview workspace…</span>
      </div>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />
      <a href="#main" className="skip">Skip to main content</a>
      <Navbar />
      <main id="main" tabIndex={-1} className="wrap">
        {children}
      </main>
      <Footer />
    </>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return user ? <Shell>{children}</Shell> : <Navigate to="/login" replace />;
}

function Public({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return user ? <Navigate to="/" replace /> : <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Public><AuthPage mode="login" /></Public>} />
      <Route path="/signup" element={<Public><AuthPage mode="signup" /></Public>} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/interview/:id" element={<Protected><Interview /></Protected>} />
      <Route path="/report/:id" element={<Protected><Report /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}