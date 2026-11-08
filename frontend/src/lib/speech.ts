export function speak(text: string, rate = 1.0, lang = 'en-US'): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  const voices = window.speechSynthesis.getVoices();
  const en = voices.find((v) => v.lang.startsWith('en') && v.localService) ?? voices.find((v) => v.lang.startsWith('en'));
  if (en) u.voice = en;
  window.speechSynthesis.speak(u);
}

export function stopSpeak(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

type RecogCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function recogCtor(): RecogCtor | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition as RecogCtor) ?? (w.webkitSpeechRecognition as RecogCtor) ?? null;
}

export function speechSupported(): boolean {
  return recogCtor() !== null;
}

export function listenOnce(lang = 'en-US', timeoutMs = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = recogCtor();
    if (!Ctor) {
      reject(new Error('Speech recognition is not supported in this browser. Use Chrome.'));
      return;
    }
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    let done = false;
    const timer = window.setTimeout(() => {
      if (!done) {
        done = true;
        try {
          rec.stop();
        } catch {
          /* noop */
        }
        reject(new Error('Listening timed out.'));
      }
    }, timeoutMs);
    rec.onresult = (ev) => {
      done = true;
      window.clearTimeout(timer);
      resolve(ev.results[0][0].transcript);
    };
    rec.onerror = (ev) => {
      if (!done) {
        done = true;
        window.clearTimeout(timer);
        reject(new Error('Recognition error: ' + ev.error));
      }
    };
    rec.onend = () => {
      if (!done) {
        done = true;
        window.clearTimeout(timer);
        reject(new Error('No speech detected.'));
      }
    };
    try {
      rec.start();
    } catch (e) {
      window.clearTimeout(timer);
      reject(e instanceof Error ? e : new Error('Could not start recognition.'));
    }
  });
}

export interface WordMark {
  word: string;
  hit: boolean;
}

function norm(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9']/g, '');
}

function similar(a: string, b: string): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (Math.abs(a.length - b.length) > 2) return false;
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[m][n] / Math.max(m, n) >= 0.8;
}

/** Compare reference vs transcript, marking matched words (green) and missed (red). */
export function markWords(reference: string, transcript: string): WordMark[] {
  const refWords = reference.split(/\s+/).filter(Boolean);
  const heard = new Set(transcript.split(/\s+/).map(norm));
  const heardList = [...heard];
  return refWords.map((w) => {
    const n = norm(w);
    const hit = heard.has(n) || heardList.some((h) => similar(h, n));
    return { word: w, hit };
  });
}
