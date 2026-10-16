import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  BookOpen, 
  Flag, 
  Loader2, 
  AlertCircle, 
  Award, 
  Tag, 
  Quote, 
  ChevronDown, 
  ChevronUp, 
  FileText 
} from 'lucide-react';
import { api, errMsg } from '../api';
import { createListener, speak, stopSpeaking, voiceSupported } from '../speech';
import AudioWave from '../components/AudioWave';

interface Q {
  index: number;
  q: string;
  topic: string;
  ref?: string;
}

interface Ev {
  score: number;
  strengths: string;
  improve: string;
  ideal: string;
}

interface Iv {
  id: string;
  role: string;
  language: string;
  status: string;
  summary: string;
  skills: string[];
  questions: Q[];
  answers: {
    index: number;
    answer: string;
    evaluation: Ev;
  }[];
}

const say = (ev: Ev, lang: string) =>
  lang === 'hi-IN'
    ? `आपका स्कोर ${ev.score} है। ${ev.improve}`
    : `You scored ${ev.score} out of 10. ${ev.improve}`;

function QuestionBubble({
  q,
  onPlayAudio,
  playing,
}: {
  q: Q;
  onPlayAudio?: () => void;
  playing?: boolean;
}) {
  return (
    <div className="message-bubble ai">
      <div className="message-meta">
        <span className="topic-tag">
          <Tag size={12} /> {q.topic}
        </span>
        {q.ref && (
          <span className="resume-ref-tag" title="Question derived from this section of your resume">
            <Quote size={12} /> Resume: {q.ref}
          </span>
        )}
        {onPlayAudio && (
          <button
            type="button"
            className="icon-btn"
            style={{ width: 28, height: 28, marginLeft: 'auto' }}
            onClick={onPlayAudio}
            title="Listen to question audio"
            aria-label="Listen to question"
          >
            <Volume2 size={15} style={{ color: playing ? 'var(--ac)' : 'currentColor' }} />
          </button>
        )}
      </div>
      <div style={{ fontSize: '1.02rem', fontWeight: 600, color: 'var(--tx)', marginTop: 4 }}>
        {q.q}
      </div>
    </div>
  );
}

function AnswerBubble({ answer }: { answer: string }) {
  return (
    <div className="message-bubble me">
      <div style={{ fontSize: '0.8rem', opacity: 0.85, marginBottom: 4, fontWeight: 600 }}>
        Your Spoken Answer
      </div>
      <div style={{ fontSize: '0.98rem' }}>{answer}</div>
    </div>
  );
}

function FeedbackCard({ ev }: { ev: Ev }) {
  const [showIdeal, setShowIdeal] = useState(false);
  const scoreColor = ev.score >= 8 ? 'var(--emerald)' : ev.score >= 6 ? 'var(--amber)' : 'var(--rose)';

  return (
    <div className="feedback-box">
      <div className="feedback-header">
        <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--tx-muted)' }}>
          AI Live Evaluation
        </span>
        <span className="feedback-score" style={{ color: scoreColor }}>
          <Award size={16} /> Score: {ev.score} / 10
        </span>
      </div>

      <div className="feedback-item" style={{ color: 'var(--tx)' }}>
        <CheckCircle2 size={16} style={{ color: 'var(--emerald)', flexShrink: 0, marginTop: 2 }} />
        <span><strong>Strength:</strong> {ev.strengths}</span>
      </div>

      <div className="feedback-item" style={{ color: 'var(--tx)' }}>
        <AlertTriangle size={16} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 2 }} />
        <span><strong>Key Improvement:</strong> {ev.improve}</span>
      </div>

      {ev.ideal && (
        <div style={{ marginTop: 4 }}>
          <button
            type="button"
            className="ghost sm"
            onClick={() => setShowIdeal(!showIdeal)}
            style={{ fontSize: '0.8rem', padding: '4px 10px', height: 'auto', minHeight: 28 }}
          >
            <BookOpen size={13} />
            <span>{showIdeal ? 'Hide Model Answer' : 'View Recommended Model Answer'}</span>
            {showIdeal ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showIdeal && (
            <div className="ideal-answer-box">
              <span style={{ fontWeight: 600, display: 'block', marginBottom: 2 }}>Model Response:</span>
              {ev.ideal}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Interview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [iv, setIv] = useState<Iv | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [voice, setVoice] = useState(voiceSupported);
  const [mic, setMic] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [pending, setPending] = useState<{ a: string; ev: Ev } | null>(null);

  const textRef = useRef('');
  const submitRef = useRef<() => void>(() => {});
  const listener = useRef<ReturnType<typeof createListener> | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  const updateText = (t: string) => {
    setText(t);
    textRef.current = t;
  };

  useEffect(() => {
    api<Iv>(`/interviews/${id}`)
      .then(({ data }) => setIv(data))
      .catch((e) => setErr(errMsg(e)));
  }, [id]);

  useEffect(() => {
    if (!iv) return;
    listener.current = createListener(iv.language, {
      onText: updateText,
      onSilence: () => submitRef.current(),
      onError: (m) => {
        setErr(m);
        setVoice(false);
      },
      onState: setMic,
    });
    return () => {
      listener.current?.stop();
      stopSpeaking();
    };
  }, [iv?.id]);

  const cur = iv ? iv.answers.length : 0;
  const finished = !!iv && cur >= iv.questions.length;

  // Speak new question automatically when voice mode is active
  useEffect(() => {
    if (!iv || finished || !voice) return;
    let cancelled = false;
    (async () => {
      setSpeaking(true);
      await speak(iv.questions[cur].q, iv.language);
      setSpeaking(false);
      if (!cancelled) {
        listener.current?.start(textRef.current);
      }
    })();
    return () => {
      cancelled = true;
      setSpeaking(false);
      stopSpeaking();
      listener.current?.stop();
    };
  }, [cur, voice, iv?.id]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cur, pending, iv?.answers.length]);

  async function finish() {
    if (!iv) return;
    setErr('');
    setBusy(true);
    try {
      await api(`/interviews/${iv.id}/finish`, { method: 'POST' });
      navigate(`/report/${iv.id}`);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!iv || busy || finished) return;
    const a = textRef.current.trim();
    if (a.length < 10) {
      return setErr('Please provide a complete answer (at least a sentence).');
    }
    listener.current?.stop();
    stopSpeaking();
    setErr('');
    setBusy(true);
    try {
      const { data } = await api<{ evaluation: Ev; done: boolean }>(`/interviews/${iv.id}/answer`, {
        method: 'POST',
        body: { index: cur, answer: a },
      });
      setPending({ a, ev: data.evaluation });
      updateText('');
      if (voice) {
        setSpeaking(true);
        await speak(say(data.evaluation, iv.language), iv.language);
        setSpeaking(false);
      }
      setPending(null);
      setIv({
        ...iv,
        answers: [...iv.answers, { index: cur, answer: a, evaluation: data.evaluation }],
      });
      if (data.done) {
        setBusy(false);
        return void finish();
      }
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  submitRef.current = submit;

  async function playCurrentQuestion() {
    if (!iv || finished) return;
    listener.current?.stop();
    setSpeaking(true);
    await speak(iv.questions[cur].q, iv.language);
    setSpeaking(false);
    if (voice) {
      listener.current?.start(textRef.current);
    }
  }

  if (!iv) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '64px 20px' }}>
        {err ? (
          <div className="err">{err}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <Loader2 size={32} className="ico" style={{ animation: 'spin 1s linear infinite', color: 'var(--ac)' }} />
            <span style={{ fontWeight: 600, color: 'var(--tx-muted)' }}>Preparing interview session…</span>
          </div>
        )}
      </div>
    );
  }

  const progressPercent = Math.min(100, Math.round((cur / iv.questions.length) * 100));

  return (
    <div className="card">
      {/* Header Bar */}
      <div className="interview-header">
        <div>
          <span className="badge" style={{ background: 'var(--ac-soft)', color: 'var(--ac)', marginBottom: 6 }}>
            {iv.language === 'hi-IN' ? '🇮🇳 Hindi' : 'English'} Interview
          </span>
          <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{iv.role} Voice Studio</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--tx)' }}>
            {finished ? 'All Questions Answered' : `Question ${cur + 1} of ${iv.questions.length}`}
          </span>
          <span className="plan-chip">{progressPercent}%</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="progress-track" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Candidate Resume Skills Cloud */}
      {iv.skills && iv.skills.length > 0 && (
        <div className="skills-cloud">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--tx-muted)', textTransform: 'uppercase' }}>
            Resume Focus:
          </span>
          {iv.skills.map((s) => (
            <span key={s} className="skill-chip">
              <Sparkles size={11} color="var(--ac)" /> {s}
            </span>
          ))}
        </div>
      )}

      {/* Conversational Feed */}
      <div className="chat-container">
        {/* Intro Message */}
        <div className="message-bubble ai">
          <div className="message-meta">
            <span className="topic-tag">AI Interviewer</span>
          </div>
          <div style={{ fontSize: '0.96rem' }}>
            Hello! I have reviewed your resume and extracted key projects and tools. {iv.summary} Let's begin the interview.
          </div>
        </div>

        {/* Completed Q&A exchanges */}
        {iv.answers.map((a) => {
          const q = iv.questions[a.index];
          return (
            <div key={a.index} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <QuestionBubble q={q} />
              <AnswerBubble answer={a.answer} />
              <FeedbackCard ev={a.evaluation} />
            </div>
          );
        })}

        {/* Current Active or Pending Question */}
        {pending && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <QuestionBubble q={iv.questions[cur]} />
            <AnswerBubble answer={pending.a} />
            <FeedbackCard ev={pending.ev} />
          </div>
        )}

        {!pending && !finished && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <QuestionBubble
              q={iv.questions[cur]}
              onPlayAudio={playCurrentQuestion}
              playing={speaking}
            />
          </div>
        )}

        <div ref={chatEnd} />
      </div>

      {/* Interaction Controls */}
      {finished ? (
        <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <Sparkles size={36} color="var(--ac)" style={{ marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 8px' }}>Interview Completed!</h3>
          <p className="mut small" style={{ maxWidth: '50ch', margin: '0 auto 18px' }}>
            Great job! You have answered all {iv.questions.length} questions. Generate your comprehensive performance report and 7-day study plan now.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={finish}
            style={{ minHeight: 48, padding: '12px 32px', fontSize: '1rem' }}
          >
            {busy ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Compiling Comprehensive Report…</span>
              </>
            ) : (
              <>
                <Award size={18} />
                <span>Generate Official Report</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <>
          {/* Mic Command Center */}
          <div className="mic-control-center">
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <label className="inline">
                <input
                  type="checkbox"
                  checked={voice}
                  disabled={!voiceSupported}
                  onChange={(e) => setVoice(e.target.checked)}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Voice Auto-Speak Mode</span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AudioWave active={mic || speaking} />
                <span className="small mut">
                  {mic ? 'Microphone Active' : speaking ? 'AI Speaking…' : 'Microphone Ready'}
                </span>
              </div>
            </div>

            {/* Central Push-to-Talk Radar Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, margin: '8px 0' }}>
              <button
                type="button"
                className={`mic-btn ${mic ? 'active-rec' : ''}`}
                title={mic ? 'Stop microphone' : 'Start speaking your answer'}
                onClick={() => {
                  if (mic) listener.current?.stop();
                  else listener.current?.start(textRef.current);
                }}
                aria-label={mic ? 'Stop microphone' : 'Start microphone'}
              >
                {mic ? <MicOff size={28} /> : <Mic size={28} />}
              </button>
            </div>

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 600, color: mic ? 'var(--rose)' : 'var(--tx-muted)' }}>
                {mic
                  ? 'Listening… your answer will auto-submit after 4 seconds of silence, or click Submit.'
                  : 'Click the microphone to answer with your voice, or type in the box below.'}
              </span>
              {!voiceSupported && (
                <span className="mut small" style={{ display: 'block', marginTop: 4 }}>
                  Voice features require Chrome, Edge, or Safari. You can type your answers instead.
                </span>
              )}
            </div>
          </div>

          {/* Fallback & Review Textarea */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label htmlFor="interview-answer-text" style={{ margin: 0 }}>
                Your Answer Draft
              </label>
              <button
                type="button"
                className="ghost sm"
                onClick={playCurrentQuestion}
                style={{ padding: '4px 10px', height: 'auto', minHeight: 28 }}
              >
                <Volume2 size={14} />
                <span>Repeat Question Audio</span>
              </button>
            </div>
            <textarea
              id="interview-answer-text"
              value={text}
              onChange={(e) => updateText(e.target.value)}
              placeholder="Speak with the microphone, or type your answer here…"
              style={{ minHeight: 100 }}
            />
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                disabled={busy || text.trim().length < 5}
                onClick={submit}
                style={{ minHeight: 46, padding: '10px 24px' }}
              >
                {busy ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Evaluating Response…</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Submit Answer</span>
                  </>
                )}
              </button>
              <span className="mut small">{text.trim().length} characters</span>
            </div>

            {cur >= 1 && (
              <button
                type="button"
                className="ghost sm"
                disabled={busy}
                onClick={() => {
                  if (window.confirm('Finish the interview early and generate the performance report?')) {
                    void finish();
                  }
                }}
              >
                <Flag size={15} />
                <span>Wrap Up &amp; Get Report</span>
              </button>
            )}
          </div>
        </>
      )}

      {err && (
        <div className="err" role="alert" style={{ marginTop: 18 }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{err}</span>
        </div>
      )}
    </div>
  );
}
