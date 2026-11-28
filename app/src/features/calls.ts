// Call outcomes (Round 61): one tap logs an outcome for a deal; best hours, answer-rate heatmap and the call-back queue.
// Data: explicit outcomes ('calls': { dk: deal key, ts, oc }) + estimates read from Day End task entries ("no answer" etc.).
import { all, put, rev } from '../data/store';
import { deals, Deal } from '../domain/crm';
import { entryText, WON, LOST } from '../domain/dayend';
import { uid } from '../lib/util';

export const OUTS = ['Answered', 'No answer', 'Busy', 'Voicemail', 'Call back', 'Wrong number'];
const UNANS = /\b(no answer|not answer(ing|ed)?|did ?n[o']?t (pick|answer)|didn't pick|not picking|no response|unreachable|switched off|busy|voicemail|call back later)\b/i;
export interface Ev { ts: number; oc: string; dk: string; est?: boolean }
export const answered = (oc: string) => oc === 'Answered' || oc === 'Call back';

export function logCall(dk: string, oc: string, ts = Date.now()) { if (!dk || OUTS.indexOf(oc) < 0) return false; put('calls', uid('c'), { dk, ts, oc }); return true; }
export function events(): Ev[] {
  void rev.value; const out: Ev[] = all<any>('calls').map(c => ({ ts: +c.ts || 0, oc: String(c.oc || ''), dk: String(c.dk || '') }));
  deals().forEach(d => d.entries.forEach(e => { const ts = e.at || Date.parse(e.day + 'T' + e.hk + ':00') || 0; if (!ts) return; const t = entryText(e); out.push({ ts, oc: UNANS.test(t) ? 'No answer' : 'Answered', dk: d.key, est: true }); }));
  return out;
}
/** answer rate by weekday (0 = Sunday) × hour. */
export function heat() {
  const g: { a: number; n: number }[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ a: 0, n: 0 })));
  events().forEach(e => { const d = new Date(e.ts), c = g[d.getDay()][d.getHours()]; c.n++; if (answered(e.oc)) c.a++; });
  return g;
}
export function profile(dk: string) {
  const ev = events().filter(e => e.dk === dk), h = Array.from({ length: 24 }, () => ({ a: 0, n: 0 }));
  ev.forEach(e => { const x = h[new Date(e.ts).getHours()]; x.n++; if (answered(e.oc)) x.a++; });
  let best = -1, bs = -1; h.forEach((x, i) => { if (!x.n) return; const s = (x.a + 1) / (x.n + 2) + x.a * 0.02; if (s > bs) { bs = s; best = i; } });
  const exp = ev.filter(e => !e.est).sort((a, b) => b.ts - a.ts);
  let miss = 0; for (const e of exp) { if (answered(e.oc)) break; miss++; }
  return { best, n: ev.length, ans: ev.filter(e => answered(e.oc)).length, last: exp[0] || null, miss };
}
export const slotLabel = (h: number) => (h < 0 ? '—' : (h % 12 || 12) + (h < 12 ? 'am' : 'pm') + '–' + (((h + 1) % 12) || 12) + ((h + 1) % 24 < 12 ? 'am' : 'pm'));
/** open deals waiting for a call back: last explicit outcome not answered (or "Call back"), newest first; deals whose best hour is now on top. */
export function callbackQueue(): { d: Deal; p: ReturnType<typeof profile>; now: boolean }[] {
  const h = new Date().getHours(), cut = Date.now() - 21 * 864e5;
  return deals().filter(d => d.stage !== WON && d.stage !== LOST).map(d => ({ d, p: profile(d.key) })).filter(x => x.p.last && x.p.last.ts > cut && (x.p.last.oc === 'Call back' || !answered(x.p.last.oc)))
    .map(x => ({ ...x, now: x.p.best === h })).sort((a, b) => (+b.now - +a.now) || (b.p.last!.ts - a.p.last!.ts));
}
