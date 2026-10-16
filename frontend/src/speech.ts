// Voice helpers built on the browser's Web Speech API (Chrome, Edge, Safari).
const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
export const voiceSupported = !!(SR && 'speechSynthesis' in window);

export function speak(text: string, lang: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.onend = u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}
export const stopSpeaking = () => window.speechSynthesis?.cancel();

interface Handlers {
  onText: (text: string) => void;
  onSilence: () => void;
  onError: (message: string) => void;
  onState: (listening: boolean) => void;
}

export function createListener(lang: string, h: Handlers) {
  let rec: any = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stop = () => {
    clearTimeout(timer);
    try {
      rec?.stop();
    } catch {
      /* already stopped */
    }
    rec = null;
    h.onState(false);
  };

  const start = (current: string) => {
    stop();
    if (!SR) return;
    const base = current.trim();
    rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      h.onText((base ? base + ' ' : '') + t.trim());
      clearTimeout(timer);
      timer = setTimeout(h.onSilence, 4000); // auto-submit after 4s of silence
    };
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        h.onError('Microphone is blocked. Allow it in your browser settings, or type your answer.');
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        h.onError('Microphone error: ' + e.error);
      }
    };
    rec.onend = () => h.onState(false);
    try {
      rec.start();
      h.onState(true);
    } catch {
      /* start() can throw if already running */
    }
  };

  return { start, stop };
}
