import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { 
  Award, 
  Download, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  FileText, 
  Copy, 
  Check, 
  Sparkles, 
  ChevronRight, 
  BarChart, 
  ArrowLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { api, ApiError, errMsg } from '../api';

interface BreakdownItem {
  index: number;
  topic: string;
  question: string;
  score: number;
  improve: string;
}

interface Rep {
  overallScore: number;
  verdict: string;
  strengths: string[];
  weak_topics: string[];
  plan: string[];
  resume_tips: string[];
  breakdown: BreakdownItem[];
  role: string;
  difficulty: string;
}

export default function Report() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [rep, setRep] = useState<Rep | null>(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<Rep>(`/interviews/${id}/report`)
      .then(({ data }) => {
        setRep(data);
        // Trigger celebratory confetti if score is high
        if (data.overallScore >= 7) {
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          } catch {
            /* ignore confetti error in strict environments */
          }
        }
      })
      .catch((e) => {
        if (e instanceof ApiError && e.code === 'SESSION_NOT_COMPLETED') {
          navigate(`/interview/${id}`, { replace: true });
        } else {
          setErr(errMsg(e));
        }
      });
  }, [id, navigate]);

  function getReportText(r: Rep) {
    return (
      `======================================================\n` +
      `AI INTERVIEW PERFORMANCE REPORT: ${r.role} (${r.difficulty})\n` +
      `Overall Score: ${r.overallScore} / 10\n` +
      `======================================================\n\n` +
      `EXECUTIVE VERDICT:\n${r.verdict}\n\n` +
      `KEY STRENGTHS:\n${r.strengths.map((s) => `• ${s}`).join('\n')}\n\n` +
      `AREAS TO IMPROVE:\n${r.weak_topics.map((w) => `• ${w}`).join('\n')}\n\n` +
      `7-DAY TARGETED STUDY ROADMAP:\n${r.plan.map((p, i) => `Day ${i + 1}: ${p}`).join('\n')}\n\n` +
      `RESUME ENHANCEMENT TIPS:\n${r.resume_tips.map((t) => `• ${t}`).join('\n')}\n\n` +
      `QUESTION BREAKDOWN:\n` +
      r.breakdown
        .map(
          (b) =>
            `Q${b.index + 1} [${b.topic}] - Score: ${b.score}/10\n` +
            `Question: ${b.question}\n` +
            `Critique: ${b.improve}\n`
        )
        .join('\n')
    );
  }

  function download() {
    if (!rep) return;
    const txt = getReportText(rep);
    const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-report-${rep.role.toLowerCase().replace(/[^a-z0-9]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copySummary() {
    if (!rep) return;
    try {
      await navigator.clipboard.writeText(getReportText(rep));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* fallback */
    }
  }

  if (err) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center' }}>
        <div className="err" role="alert">{err}</div>
        <div style={{ marginTop: 18 }}>
          <Link to="/" className="btn ghost sm">
            <ArrowLeft size={16} /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!rep) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '64px 20px' }}>
        <Loader2 size={36} className="ico" style={{ animation: 'spin 1s linear infinite', color: 'var(--ac)', margin: '0 auto 16px' }} />
        <h3 style={{ margin: '0 0 6px' }}>Generating Your Official Performance Report</h3>
        <p className="mut small">Analyzing topic breakdowns, computing benchmarks, and building your 7-day roadmap…</p>
      </div>
    );
  }

  const scoreColor = rep.overallScore >= 8 ? 'var(--emerald)' : rep.overallScore >= 6 ? 'var(--amber)' : 'var(--rose)';
  const scoreVerdictLabel =
    rep.overallScore >= 8.5
      ? 'Outstanding Candidate'
      : rep.overallScore >= 7
      ? 'Strong Performance'
      : rep.overallScore >= 5
      ? 'Developing Competence'
      : 'Requires Focused Prep';

  return (
    <>
      {/* Top Breadcrumb / Return */}
      <div style={{ marginBottom: 16 }}>
        <Link to="/" className="btn ghost sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={15} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Hero Performance Header */}
      <section className="report-hero">
        <div className="score-display-circle" style={{ borderColor: scoreColor }}>
          <span className="score-num" style={{ color: scoreColor }}>{rep.overallScore}</span>
          <span className="score-max">OUT OF 10</span>
        </div>

        <div className="badge" style={{ background: 'var(--ac-soft)', color: 'var(--ac)', marginBottom: 8 }}>
          {rep.role} · {rep.difficulty} Level
        </div>

        <h1 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', margin: '0 0 10px' }}>
          {scoreVerdictLabel}
        </h1>

        <p className="verdict-text">{rep.verdict}</p>

        {/* Action Toolbar */}
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/">
            <button type="button" style={{ minHeight: 46 }}>
              <RotateCcw size={16} />
              <span>Practice Another Interview</span>
            </button>
          </Link>

          <button type="button" className="ghost" onClick={download} style={{ minHeight: 46 }}>
            <Download size={16} />
            <span>Download Report (.txt)</span>
          </button>

          <button type="button" className="ghost" onClick={copySummary} style={{ minHeight: 46 }}>
            {copied ? <Check size={16} color="var(--emerald)" /> : <Copy size={16} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
          </button>
        </div>
      </section>

      {/* 2x2 Core Analysis Grid */}
      <div className="report-grid">
        {/* Key Strengths */}
        <div className="report-section" style={{ borderTop: '4px solid var(--emerald)' }}>
          <h3>
            <CheckCircle2 size={20} color="var(--emerald)" />
            <span>Demonstrated Strengths</span>
          </h3>
          <ul className="report-list">
            {rep.strengths.map((str, i) => (
              <li key={i} className="report-list-item">
                <CheckCircle2 size={16} color="var(--emerald)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Priority Areas to Improve */}
        <div className="report-section" style={{ borderTop: '4px solid var(--amber)' }}>
          <h3>
            <AlertTriangle size={20} color="var(--amber)" />
            <span>Key Areas to Strengthen</span>
          </h3>
          <ul className="report-list">
            {rep.weak_topics.map((weak, i) => (
              <li key={i} className="report-list-item">
                <AlertTriangle size={16} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{weak}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 7-Day Study Plan */}
        <div className="report-section" style={{ borderTop: '4px solid var(--ac)' }}>
          <h3>
            <Calendar size={20} color="var(--ac)" />
            <span>7-Day Targeted Study Roadmap</span>
          </h3>
          <ul className="report-list">
            {rep.plan.map((item, i) => (
              <li key={i} className="report-list-item">
                <span className="badge" style={{ background: 'var(--ac-soft)', color: 'var(--ac)', flexShrink: 0 }}>
                  Day {i + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Resume Advice */}
        <div className="report-section" style={{ borderTop: '4px solid var(--violet)' }}>
          <h3>
            <FileText size={20} color="var(--ac2)" />
            <span>Resume Optimization Tips</span>
          </h3>
          <ul className="report-list">
            {rep.resume_tips.map((tip, i) => (
              <li key={i} className="report-list-item">
                <Sparkles size={16} color="var(--ac2)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Question-by-Question Deep Dive */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <span className="step-indicator">
              <BarChart size={18} />
            </span>
            <div>
              <h2>Question-by-Question Breakdown</h2>
              <div className="card-desc">Detailed assessment and constructive advice for each prompt.</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {rep.breakdown.map((b) => {
            const bScoreColor = b.score >= 8 ? 'var(--emerald)' : b.score >= 6 ? 'var(--amber)' : 'var(--rose)';
            return (
              <div key={b.index} className="breakdown-card">
                <div className="breakdown-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="badge" style={{ background: 'var(--bg)', color: 'var(--tx)', border: '1px solid var(--border)' }}>
                      Q{b.index + 1}
                    </span>
                    <span className="topic-tag">{b.topic}</span>
                  </div>
                  <span className="score-badge" style={{ color: bScoreColor, fontSize: '0.95rem', padding: '4px 10px' }}>
                    Score: {b.score} / 10
                  </span>
                </div>

                <div style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--tx)' }}>
                  {b.question}
                </div>

                <div style={{ fontSize: '0.9rem', color: 'var(--tx-muted)', lineHeight: 1.5, background: 'var(--card)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <strong>Evaluator Recommendation:</strong> {b.improve}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
