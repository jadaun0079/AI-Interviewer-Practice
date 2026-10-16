import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Sun, 
  Moon, 
  LogOut, 
  Menu, 
  X, 
  FileText, 
  Headphones, 
  ShieldCheck 
} from 'lucide-react';
import { useAuth } from '../auth';

export function toggleTheme() {
  const root = document.documentElement;
  const isDark = root.dataset.theme === 'dark' || (!root.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const nextTheme = isDark ? 'light' : 'dark';
  root.dataset.theme = nextTheme;
  localStorage.setItem('theme', nextTheme);
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initial = (user?.name ?? '').trim().charAt(0).toUpperCase() || '?';

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="topbar-wrapper">
      <div className="topbar">
        {/* Brand Logo */}
        <Link to="/" className="logo" onClick={() => setMobileOpen(false)}>
          <div className="logo-icon-box" aria-hidden="true">
            <Sparkles size={20} />
          </div>
          <span>AI Interviewer</span>
          <span className="logo-badge">Pro Studio</span>
        </Link>

        {/* Desktop Controls */}
        <div className="nr desktop-only">
          {user && (
            <div className="user-pill" title={user.email}>
              <span className="avatar" aria-hidden="true">{initial}</span>
              <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </span>
              <span className="plan-chip">{user.plan || 'Free'}</span>
            </div>
          )}

          {/* Theme Toggle */}
          <button 
            type="button" 
            className="icon-btn" 
            onClick={toggleTheme} 
            title="Toggle theme (Light / Dark)"
            aria-label="Toggle color theme"
          >
            <Moon className="ico-moon ico" aria-hidden="true" />
            <Sun className="ico-sun ico" aria-hidden="true" />
          </button>

          {/* Logout Action */}
          {user && (
            <button 
              type="button" 
              className="ghost sm" 
              onClick={handleLogout}
              title="Log out of your account"
            >
              <LogOut size={16} aria-hidden="true" />
              <span>Log out</span>
            </button>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="nr mobile-toggle">
          <button 
            type="button" 
            className="icon-btn" 
            onClick={toggleTheme} 
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            <Moon className="ico-moon ico" aria-hidden="true" />
            <Sun className="ico-sun ico" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 4px', borderBottom: '1px solid var(--border)' }}>
              <span className="avatar">{initial}</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{user.name}</span>
                <span className="mut small">{user.email}</span>
              </div>
              <span className="plan-chip" style={{ marginLeft: 'auto' }}>{user.plan || 'FREE'}</span>
            </div>
          )}

          <Link 
            to="/" 
            className="btn ghost full" 
            onClick={() => setMobileOpen(false)}
            style={{ justifyContent: 'flex-start' }}
          >
            <FileText size={18} />
            <span>Dashboard & Resumes</span>
          </Link>

          {user && (
            <button 
              type="button" 
              className="btn danger full" 
              onClick={() => { setMobileOpen(false); void handleLogout(); }}
              style={{ justifyContent: 'flex-start', marginTop: 6 }}
            >
              <LogOut size={18} />
              <span>Log out</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}
