import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  UploadCloud, 
  FileText, 
  Trash2, 
  Check, 
  Play, 
  Clock, 
  BarChart2, 
  Shield, 
  AlertCircle, 
  Loader2, 
  Languages, 
  Target, 
  Briefcase, 
  Layers, 
  PlusCircle, 
  ChevronRight, 
  CheckCircle2, 
  Calendar,
  Award
} from 'lucide-react';
import { api, ApiError, errMsg } from '../api';

interface Resume {
  id: string;
  fileName: string;
  characters: number;
  createdAt: string;
}

interface Hist {
  id: string;
  role: string;
  difficulty: string;
  status: string;
  overallScore: number | null;
  createdAt: string;
}

interface Me {
  usage: {
    interviewsThisMonth: number;
    interviewsLimit: number;
  };
  plan: string;
}

const ROLES = [
  'Software Engineer',
  'Backend Developer',
  'Frontend Developer',
  'Full-Stack Developer',
  'DevOps / Cloud Engineer',
  'AI / ML Engineer',
  'Data Analyst',
];

export default function Dashboard() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [hist, setHist] = useState<Hist[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [resumeId, setResumeId] = useState('');
  const [paste, setPaste] = useState(false);
  const [pasted, setPasted] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [type, setType] = useState('MIXED');
  const [num, setNum] = useState(5);
  const [language, setLanguage] = useState('en-IN');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, h, m] = await Promise.all([
        api<Resume[]>('/resumes'),
        api<Hist[]>('/interviews?limit=10'),
        api<Me>('/users/me'),
      ]);
      setResumes(r.data);
      setHist(h.data);
      setMe(m.data);
      setResumeId((cur) => cur || r.data[0]?.id || '');
    } catch (e) {
      setErr(errMsg(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return setErr('Please upload a PDF document format only.');
    }
    if (file.size > 5 * 1024 * 1024) {
      return setErr('Resume file size must be less than 5 MB.');
    }

    setErr('');
    setBusy('Analyzing PDF structure and extracting text…');
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api<Resume>('/resumes', { method: 'POST', form });
      await load();
      setResumeId(data.id);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function savePasted() {
    if (pasted.trim().length < 80) {
      return setErr('Resume text must be at least 80 characters long.');
    }
    setErr('');
    setBusy('Parsing and saving your resume text…');
    try {
      const { data } = await api<Resume>('/resumes/text', { method: 'POST', body: { text: pasted } });
      setPasted('');
      setPaste(false);
      await load();
      setResumeId(data.id);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }

  async function start() {
    if (!resumeId) {
      return setErr('Please upload or select an active resume first.');
    }
    setErr('');
    setBusy('Analyzing your resume and generating tailored technical questions…');
    try {
      const { data } = await api<{ id: string }>('/interviews', {
        method: 'POST',
        body: { resumeId, role, difficulty, type, numQuestions: num, language },
      });
      navigate(`/interview/${data.id}`);
    } catch (e) {
      setErr(
        e instanceof ApiError && e.status === 402
          ? `${e.message} Upgrade your plan to continue practicing.`
          : errMsg(e)
      );
      setBusy('');
    }
  }

  async function removeResume(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this resume?')) return;
    try {
      await api(`/resumes/${id}`, { method: 'DELETE' });
      setResumeId((cur) => (cur === id ? '' : cur));
      await load();
    } catch (errCatch) {
      setErr(errMsg(errCatch));
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      void upload(e.dataTransfer.files[0]);
    }
  };

  const completedCount = hist.filter((h) => h.status === 'COMPLETED').length;
  const avgScore = completedCount
    ? (
        hist
          .filter((h) => h.status === 'COMPLETED' && h.overallScore != null)
          .reduce((acc, h) => acc + (h.overallScore || 0), 0) /
        (hist.filter((h) => h.status === 'COMPLETED' && h.overallScore != null).length || 1)
      ).toFixed(1)
    : null;

  return (
    <>
      {/* Hero Welcome Section */}
      <section className="hero">
        <div className="hero-badge">
          <Sparkles size={14} /> AI Practice Studio
        </div>
        <h1>
          Master Technical Interviews <span className="gradient-text">Built From Your Resume</span>
        </h1>
        <p>
          Upload your resume and let our intelligent voice AI challenge you with real-world technical and behavioral questions tailored directly to your actual experience.
        </p>
      </section>

      {/* Metrics Stat Row */}
      {me && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon">
              <BarChart2 size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {me.usage.interviewsThisMonth}
                {me.plan === 'FREE' && <span style={{ fontSize: '0.9rem', color: 'var(--tx-muted)' }}> / {me.usage.interviewsLimit}</span>}
              </span>
              <span className="stat-label">Interviews This Month ({me.plan})</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--emerald-soft)', color: 'var(--emerald)' }}>
              <FileText size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{resumes.length}</span>
              <span className="stat-label">Resumes in Library</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
              <Target size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{completedCount}</span>
              <span className="stat-label">Completed Sessions</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--ac-soft)', color: 'var(--ac)' }}>
              <Award size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{avgScore ? `${avgScore} / 10` : '—'}</span>
              <span className="stat-label">Average Performance Rating</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: RESUME HUB */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <span className="step-indicator">1</span>
            <div>
              <h2>Your Resume</h2>
              <div className="card-desc">The AI scans your resume to generate relevant, authentic interview questions.</div>
            </div>
          </div>
          <button 
            type="button" 
            className="ghost sm" 
            onClick={() => setPaste(!paste)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <PlusCircle size={15} />
            <span>{paste ? 'Cancel Text Input' : 'Or Paste Raw Text'}</span>
          </button>
        </div>

        {/* Dropzone Upload */}
        <div
          className={`dropzone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
          aria-label="Upload PDF resume"
        >
          <div className="dropzone-icon">
            <UploadCloud size={28} />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--tx)', display: 'block' }}>
              Click to browse, or drag & drop your PDF resume
            </span>
            <span className="mut small" style={{ display: 'block', marginTop: 4 }}>
              Supports standard PDF documents up to 5 MB
            </span>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hide"
          onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])}
        />

        {/* Raw Text Accordion */}
        {paste && (
          <div style={{ marginTop: 18, padding: 18, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <label htmlFor="paste-resume-area" style={{ marginTop: 0, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span>Paste Resume Contents</span>
              <span className="mut small">{pasted.length} characters (min 80 required)</span>
            </label>
            <textarea
              id="paste-resume-area"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="Paste your resume text here (projects, technologies, work history, education)…"
              style={{ minHeight: 140, background: 'var(--bg-surface)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                type="button"
                disabled={pasted.trim().length < 80 || !!busy}
                onClick={savePasted}
              >
                Save & Analyze Resume
              </button>
            </div>
          </div>
        )}

        {/* Saved Resumes List */}
        {resumes.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--tx-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Select Active Resume ({resumes.length})
            </span>
            <div className="resume-list">
              {resumes.map((r) => {
                const isSelected = resumeId === r.id;
                return (
                  <div
                    key={r.id}
                    className={`resume-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setResumeId(r.id)}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setResumeId(r.id); }}
                  >
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? 'var(--ac)' : 'var(--border-strong)'}`,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0
                    }}>
                      {isSelected && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ac)' }} />}
                    </div>
                    <FileText size={18} style={{ color: isSelected ? 'var(--ac)' : 'var(--tx-muted)', flexShrink: 0 }} />
                    <span className="resume-title">{r.fileName}</span>
                    <span className="resume-meta">{r.characters.toLocaleString()} chars</span>
                    <span className="resume-meta" style={{ display: 'none' }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={(e) => void removeResume(r.id, e)}
                      title="Delete resume"
                      style={{ width: 32, height: 32, marginLeft: 8 }}
                      aria-label={`Delete ${r.fileName}`}
                    >
                      <Trash2 size={15} style={{ color: 'var(--rose)' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {resumes.length === 0 && !paste && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--tx-muted)', fontSize: '0.9rem' }}>
            No resumes uploaded yet. Upload a PDF or paste text above to start practicing.
          </div>
        )}
      </div>

      {/* STEP 2: INTERVIEW SETUP */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <span className="step-indicator">2</span>
            <div>
              <h2>Interview Setup</h2>
              <div className="card-desc">Customize the role, difficulty, interview type, and language for your session.</div>
            </div>
          </div>
        </div>

        <div className="setup-grid">
          {/* Role */}
          <div className="form-group">
            <label htmlFor="setup-role" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Briefcase size={16} /> Target Role
            </label>
            <select
              id="setup-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div className="form-group">
            <label htmlFor="setup-diff" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={16} /> Difficulty
            </label>
            <div className="segmented-control" id="setup-diff">
              {(['EASY', 'MEDIUM', 'HARD'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`segmented-btn ${difficulty === d ? 'active' : ''}`}
                  onClick={() => setDifficulty(d)}
                >
                  {d === 'EASY' ? 'Junior' : d === 'MEDIUM' ? 'Mid-Level' : 'Senior'}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div className="form-group">
            <label htmlFor="setup-type" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Target size={16} /> Focus Type
            </label>
            <select
              id="setup-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="MIXED">Mixed (Technical + Behavioral)</option>
              <option value="TECHNICAL">Technical Deep-Dive Only</option>
              <option value="HR">Behavioral / Leadership (STAR)</option>
            </select>
          </div>

          {/* Questions Count */}
          <div className="form-group">
            <label htmlFor="setup-num" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} /> Questions ({num} questions · ~{num * 3} mins)
            </label>
            <input
              id="setup-num"
              type="number"
              min={3}
              max={10}
              value={num}
              onChange={(e) => setNum(Math.min(10, Math.max(3, +e.target.value || 5)))}
            />
          </div>

          {/* Language */}
          <div className="form-group">
            <label htmlFor="setup-lang" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Languages size={16} /> Voice Language
            </label>
            <select
              id="setup-lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en-IN">🇮🇳 English (India)</option>
              <option value="en-US">🇺🇸 English (US)</option>
              <option value="hi-IN">🇮🇳 Hindi (हिन्दी)</option>
            </select>
          </div>
        </div>

        {/* Start Button */}
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={!!busy || !resumeId}
            onClick={start}
            style={{ minHeight: 52, padding: '12px 28px', fontSize: '1.05rem' }}
          >
            {busy ? (
              <>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                <span>{busy}</span>
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" />
                <span>Start Voice Interview</span>
              </>
            )}
          </button>
          {!resumeId && (
            <span className="mut small">
              Please select or upload a resume to enable voice interview.
            </span>
          )}
        </div>

        {err && (
          <div className="err" role="alert" style={{ marginTop: 18 }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{err}</span>
          </div>
        )}
      </div>

      {/* STEP 3: INTERVIEW HISTORY */}
      {hist.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <span className="step-indicator">3</span>
              <div>
                <h2>Your Practice Sessions</h2>
                <div className="card-desc">Review your past scores, breakdown evaluations, and 7-day study roadmaps.</div>
              </div>
            </div>
          </div>

          <div className="history-list">
            {hist.map((h) => {
              const isCompleted = h.status === 'COMPLETED';
              const targetUrl = isCompleted ? `/report/${h.id}` : `/interview/${h.id}`;
              const diffClass = h.difficulty === 'EASY' ? 'badge-easy' : h.difficulty === 'HARD' ? 'badge-hard' : 'badge-medium';

              return (
                <Link
                  key={h.id}
                  to={targetUrl}
                  className="history-card"
                  title={isCompleted ? 'View Full Performance Report' : 'Resume Interview'}
                >
                  <div className="history-info">
                    <span className="history-role">{h.role}</span>
                    <div className="history-tags">
                      <span className={`badge ${diffClass}`}>{h.difficulty}</span>
                      <span className="mut small" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={13} /> {new Date(h.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {isCompleted ? (
                      <span className="score-badge">
                        {h.overallScore != null ? `${h.overallScore}/10` : 'Completed'}
                      </span>
                    ) : (
                      <span className="btn ghost sm" style={{ color: 'var(--ac)', pointerEvents: 'none' }}>
                        Continue Session
                      </span>
                    )}
                    <ChevronRight size={18} style={{ color: 'var(--tx-subtle)' }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
