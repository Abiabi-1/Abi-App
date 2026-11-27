// Time clock: punches (in / break start / break end / out) with exact times. Same calculation and the same
// Day End report lines as the old HR module (Round 25/26), so reports read exactly as before.
import { all, put, get, del } from '../data/store';
import { addDays, dur, h12, keyOf, parseKey, todayKey, uid, timeToMin } from '../lib/util';

export interface Punch { id: string; day: string; k: 'in' | 'bs' | 'be' | 'out'; at: number; bt?: string; n?: string }
export interface HrSet { shiftStart: string; shiftEnd: string; grace: number; sec: boolean; autoOutH: number; autoBreakMin: number; autoBreakAfterH: number; dayH: number; week: number[]; punchRound: number }
const HR = 36e5;
export const HR_DEF: HrSet = { shiftStart: '09:00', shiftEnd: '17:00', grace: 10, sec: true, autoOutH: 0, autoBreakMin: 0, autoBreakAfterH: 5, dayH: 8, week: [0, 1, 2, 3, 4], punchRound: 0 };
export function hrSet(): HrSet { return { ...HR_DEF, ...(get('cfg', 'hr') || {}) } as HrSet; }
export const t = (ms: number) => h12(ms, hrSet().sec);

export function punchesOf(day: string): Punch[] { return all<Punch>('punches').filter(p => p.day === day).sort((a, b) => a.at - b.at); }
export interface Br { s: number; e: number | null; t: string; n: string; id: string }
export interface Ses { s: number; e: number | null; br: Br[]; id: string }
export function calc(day: string, nowMs = Date.now()) {
  const S = hrSet(), ps = punchesOf(day), ses: Ses[] = []; let cur: Ses | null = null, br: Br | null = null; const past = day < todayKey();
  ps.forEach(p => {
    if (p.k === 'in') { if (!cur) { cur = { s: p.at, e: null, br: [], id: p.id }; ses.push(cur); } }
    else if (p.k === 'bs') { if (cur && !br) { br = { s: p.at, e: null, t: p.bt || 'other', n: p.n || '', id: p.id }; cur.br.push(br); } }
    else if (p.k === 'be') { if (br) { br.e = p.at; br = null; } }
    else if (p.k === 'out') { if (cur) { if (br) { br.e = p.at; br = null; } cur.e = p.at; cur = null; } }
  });
  let auto = false;
  if (cur && S.autoOutH > 0 && nowMs - (cur as Ses).s > S.autoOutH * HR) { const c = cur as Ses; c.e = c.s + S.autoOutH * HR; if (br) { (br as Br).e = c.e; br = null; } cur = null; auto = true; }
  const rdn = (ms: number) => { const r = S.punchRound * 6e4; return r > 0 ? Math.round(ms / r) * r : ms; };
  let worked = 0, brk = 0, missed = false;
  ses.forEach(s => {
    const open = !s.e, end = s.e || ((past && nowMs - s.s > 16 * HR) ? s.s : nowMs); if (open && past && nowMs - s.s > 16 * HR) missed = true;
    let b = 0; s.br.forEach(x => { b += Math.max(0, (x.e || end) - x.s); });
    brk += b; worked += Math.max(0, rdn(end) - rdn(s.s) - b);
  });
  const mealTaken = ses.some(s => s.br.some(x => x.t === 'meal')); let autoBr = false;
  if (!mealTaken && S.autoBreakMin > 0 && ses.length && worked >= S.autoBreakAfterH * HR) { worked -= S.autoBreakMin * 6e4; brk += S.autoBreakMin * 6e4; autoBr = true; }
  return { ses, worked, brk, open: !!cur && !missed, onBreak: !!br && !missed, missed, first: ses[0] ? ses[0].s : 0, last: ses.length ? (ses[ses.length - 1].e || 0) : 0, n: ps.length, auto, autoBr };
}
export function activeDay() { const td = todayKey(), y = addDays(td, -1); return calc(y).open ? y : td; }
export function status() { const k = activeDay(), c = calc(k); return { key: k, c, state: (c.onBreak ? 'break' : c.open ? 'work' : 'out') as 'break' | 'work' | 'out' }; }
export function act(kind: Punch['k'], o: { bt?: string; at?: number } = {}): string {
  const st = status(); let k = st.key;
  if (kind === 'in') { if (st.state !== 'out') return 'Already clocked in'; k = todayKey(); }
  else if (kind === 'bs') { if (st.state !== 'work') return st.state === 'break' ? 'Already on break' : 'Clock in first'; }
  else if (kind === 'be') { if (st.state !== 'break') return 'Not on a break'; }
  else if (kind === 'out') { if (st.state === 'out') return 'Not clocked in'; }
  const at = o.at || Date.now(), id = uid('p');
  put('punches', id, { day: k, k: kind, at, ...(o.bt ? { bt: o.bt } : {}) });
  return ({ in: 'Clocked in at ', bs: 'Break started at ', be: 'Break ended at ', out: 'Clocked out at ' } as Record<string, string>)[kind] + t(at);
}
export function addPunch(day: string, kind: Punch['k'], at: number) { put('punches', uid('p'), { day, k: kind, at }); }
export function movePunch(id: string, at: number) { put('punches', id, { at }); }
export function removePunch(id: string) { del('punches', id); }

function isWork(k: string) { return hrSet().week.indexOf(parseKey(k).getDay()) >= 0; }
function setFor(k: string) { const S = hrSet(); const d = get<{ shiftStart: string; shiftEnd: string }>('days', k); return { s: d?.shiftStart || S.shiftStart, e: d?.shiftEnd || S.shiftEnd }; }
function lateMin(k: string, c: ReturnType<typeof calc>) { if (!c.first) return 0; const sh = setFor(k), d = new Date(c.first), m = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; return Math.max(0, Math.round(m - timeToMin(sh.s) - hrSet().grace)); }
function earlyMin(k: string, c: ReturnType<typeof calc>) { if (!c.last || c.open) return 0; const sh = setFor(k), d = new Date(c.last), m = d.getHours() * 60 + d.getMinutes(); return Math.max(0, Math.round(timeToMin(sh.e) - hrSet().grace - m)); }
function otMs(k: string, c: ReturnType<typeof calc>) { const lim = hrSet().dayH * HR; if (!isWork(k)) return c.worked; return Math.max(0, c.worked - lim); }
const cap = (s: string) => { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };

/** Lines in the Day End report (same text as before). */
export function dayLines(k: string): string[] {
  const c = calc(k); if (!c.n) return [];
  const L = ['Time Clock'];
  c.ses.forEach((s, i) => {
    L.push((c.ses.length > 1 ? 'Session ' + (i + 1) + ' — ' : '') + 'Clock in: ' + t(s.s));
    s.br.forEach((b, j) => L.push('  Break ' + (j + 1) + ' (' + cap(b.t) + '): ' + t(b.s) + ' – ' + (b.e ? t(b.e) + ' (' + dur(b.e - b.s) + ')' : 'not ended')));
    L.push('Clock out: ' + (s.e ? t(s.e) : 'not recorded'));
  });
  const ot = otMs(k, c), late = lateMin(k, c), early = earlyMin(k, c);
  L.push('Worked: ' + dur(c.worked) + ' · Breaks: ' + dur(c.brk) + ' · Overtime: ' + (ot ? dur(ot) : 'none'));
  if (late) L.push('Late by ' + late + ' min (after ' + hrSet().grace + ' min grace)');
  if (early) L.push('Left ' + early + ' min early');
  if (c.auto) L.push('Auto clock-out applied after ' + hrSet().autoOutH + 'h');
  if (c.autoBr) L.push('Meal break of ' + hrSet().autoBreakMin + ' min deducted automatically');
  if (c.missed) L.push('⚠ Missing clock-out');
  L.push(''); return L;
}
export function dayCells(k: string): string[] {
  const c = calc(k); if (!c.n) return ['', '', '', '', ''];
  const br: string[] = []; c.ses.forEach(s => s.br.forEach(b => br.push(t(b.s) + '–' + (b.e ? t(b.e) : '?'))));
  return [t(c.first), c.last ? t(c.last) : '', br.join(' | '), dur(c.brk, true), dur(c.worked, true)];
}
export function weekKeys(k: string) { const d = parseKey(k); const s = new Date(d); s.setDate(d.getDate() - ((d.getDay() + 6) % 7)); const a: string[] = []; for (let i = 0; i < 7; i++) { const x = new Date(s); x.setDate(s.getDate() + i); a.push(keyOf(x)); } return a; }
