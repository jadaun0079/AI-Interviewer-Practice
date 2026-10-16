import { ShieldCheck, Cpu, Mic } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--emerald)' }} />
          <span>AI Interview Voice Engine • Ready</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <ShieldCheck size={15} color="var(--emerald)" /> Privacy-First (No Audio Stored)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Mic size={15} color="var(--ac)" /> Web Speech Synthesis & Recognition
          </span>
        </div>
        <div>
          <span>© {new Date().getFullYear()} AI Interviewer. Built for candidate success.</span>
        </div>
      </div>
    </footer>
  );
}
