import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Mic, 
  Award, 
  TrendingUp 
} from 'lucide-react';
import { ApiError } from '../api';
import { useAuth } from '../auth';

export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const signingUp = mode === 'signup';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Password validation indicators
  const hasMinLength = pw.length >= 8;
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const passwordsMatch = signingUp ? pw && pw === pw2 : true;

  async function submit() {
    setErr('');
    if (signingUp) {
      if (name.trim().length < 2) return setErr('Please enter your full name (minimum 2 characters).');
      if (!hasMinLength || !hasLower || !hasUpper || !hasDigit) {
        return setErr('Password requires at least 8 characters with uppercase, lowercase, and a number.');
      }
      if (pw !== pw2) return setErr('Passwords do not match. Please re-enter.');
    } else if (!email || !pw) {
      return setErr('Please provide both your email address and password.');
    }

    setBusy(true);
    try {
      if (signingUp) await signup(name.trim(), email.trim(), pw);
      else await login(email.trim(), pw);
      navigate('/');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'VALIDATION_ERROR' && Array.isArray(e.details)) {
        setErr((e.details as { field: string; issue: string }[]).map((d) => `${d.field}: ${d.issue}`).join('. '));
      } else {
        setErr(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void submit();
  };

  return (
    <div className="wrap" style={{ paddingTop: 20 }}>
      <div className="auth-container">
        {/* Left Side: Rich Product Showcase */}
        <div className="auth-hero-card">
          <div>
            <div className="hero-badge" style={{ background: 'rgba(255,255,255,0.18)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)' }}>
              <Sparkles size={14} /> Next-Gen AI Mock Interviews
            </div>
            <h1 style={{ color: '#ffffff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', lineHeight: 1.18, marginBottom: 16 }}>
              Practice interviews that <span style={{ textDecoration: 'underline', textDecorationColor: '#cbd5e1' }}>read your resume</span> and talk back.
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.05rem', marginBottom: 28, lineHeight: 1.5 }}>
              Level up your tech career with realistic, voice-interactive mock interviews. The AI extracts questions directly from your projects, scores your spoken answers live, and generates custom 7-day roadmaps.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="auth-feature-pill">
                <FileText size={18} />
                <span><strong>Resume Deep-Scan:</strong> Analyzes your PDF projects, tools, and technical experience.</span>
              </div>
              <div className="auth-feature-pill">
                <Mic size={18} />
                <span><strong>Natural Voice Dialog:</strong> AI asks questions out loud and listens to your spoken answers.</span>
              </div>
              <div className="auth-feature-pill">
                <Award size={18} />
                <span><strong>Instant Scoring:</strong> Detailed 1-10 ratings, identified strengths, and ideal answers.</span>
              </div>
              <div className="auth-feature-pill">
                <TrendingUp size={18} />
                <span><strong>7-Day Prep Roadmap:</strong> Tailored study plan targeting your exact weak spots.</span>
              </div>
            </div>
          </div>

          {/* Social Proof Quote */}
          <div style={{ marginTop: 32, padding: '16px 20px', borderRadius: 14, background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.92rem', color: '#ffffff', opacity: 0.95 }}>
              "The AI specifically grilled me on the Redis caching layer from my second resume project. The practice made my real senior interview feel effortless."
            </p>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#ffffff', color: '#4f46e5', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                AS
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Ananya S. • Full-Stack Engineer</span>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="card" style={{ margin: 0, padding: '36px 30px' }}>
          {/* Tab Navigation */}
          <div className="segmented-control" style={{ marginBottom: 24 }}>
            <Link 
              to="/login" 
              className={`segmented-btn ${!signingUp ? 'active' : ''}`}
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Sign In
            </Link>
            <Link 
              to="/signup" 
              className={`segmented-btn ${signingUp ? 'active' : ''}`}
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Create Account
            </Link>
          </div>

          <h2 style={{ fontSize: '1.45rem', marginBottom: 6 }}>
            {signingUp ? 'Start practicing for free' : 'Welcome back'}
          </h2>
          <p className="card-desc" style={{ marginBottom: 20 }}>
            {signingUp ? 'Create an account to upload your resume and begin voice interviews.' : 'Sign in to access your interview history and performance reports.'}
          </p>

          <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            {signingUp && (
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label htmlFor="auth-name">Full name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="auth-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={onEnter}
                    autoComplete="name"
                    placeholder="e.g. Alex Chen"
                    style={{ paddingLeft: 42 }}
                  />
                  <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx-subtle)', pointerEvents: 'none' }} />
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label htmlFor="auth-email">Work or personal email</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={onEnter}
                  autoComplete="email"
                  placeholder="name@example.com"
                  style={{ paddingLeft: 42 }}
                />
                <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx-subtle)', pointerEvents: 'none' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: signingUp ? 14 : 20 }}>
              <label htmlFor="auth-pw">Password</label>
              <div className="pw-field">
                <input
                  id="auth-pw"
                  type={show ? 'text' : 'password'}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  onKeyDown={onEnter}
                  autoComplete={signingUp ? 'new-password' : 'current-password'}
                  placeholder="••••••••••••"
                  style={{ paddingLeft: 42 }}
                />
                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx-subtle)', pointerEvents: 'none' }} />
                <button
                  type="button"
                  className="pw-toggle-btn"
                  onClick={() => setShow(!show)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {signingUp && (
              <>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label htmlFor="auth-pw2">Confirm password</label>
                  <div className="pw-field">
                    <input
                      id="auth-pw2"
                      type={show ? 'text' : 'password'}
                      value={pw2}
                      onChange={(e) => setPw2(e.target.value)}
                      onKeyDown={onEnter}
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      style={{ paddingLeft: 42 }}
                    />
                    <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx-subtle)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Password strength checklist */}
                <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 18, border: '1px solid var(--border)' }}>
                  <span className="small mut" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Password requirements:</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.8rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: hasMinLength ? 'var(--emerald)' : 'var(--tx-subtle)' }}>
                      <CheckCircle2 size={13} /> 8+ characters
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: hasUpper ? 'var(--emerald)' : 'var(--tx-subtle)' }}>
                      <CheckCircle2 size={13} /> Uppercase letter
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: hasLower ? 'var(--emerald)' : 'var(--tx-subtle)' }}>
                      <CheckCircle2 size={13} /> Lowercase letter
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: hasDigit ? 'var(--emerald)' : 'var(--tx-subtle)' }}>
                      <CheckCircle2 size={13} /> Number (0-9)
                    </span>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              className="full"
              disabled={busy}
              style={{ minHeight: 48, fontSize: '1rem', marginTop: 8 }}
            >
              {busy ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Connecting to secure account…</span>
                </>
              ) : (
                <>
                  <span>{signingUp ? 'Create free account' : 'Sign in to workspace'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {err && (
            <div className="err" role="alert">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{err}</span>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <p className="mut small" style={{ margin: 0 }}>
              {signingUp ? 'Already have an account? ' : 'First time practicing here? '}
              <Link to={signingUp ? '/login' : '/signup'} style={{ fontWeight: 600 }}>
                {signingUp ? 'Sign in' : 'Create an account'}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
