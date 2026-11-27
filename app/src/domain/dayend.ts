// Day End Report: model, pricing, stats and the report texts. The texts are the same, line for line, as the old app.
import { all, get, put, del, rev } from '../data/store';
import { MONTHS, fmt12, fmtDay, fmtNum, hasVal, minToTime, parseKey, parsePrice, r2, timeToMin, todayKey, uid } from '../lib/util';
import { dayLines, dayCells, t as hrT } from './hr';
import { lsJSON } from '../lib/util';

export type SK = 'tasks' | 'calls' | 'whatsapp' | 'tickets' | 'other';
export const SECTION_KEYS: SK[] = ['tasks', 'calls', 'whatsapp', 'tickets', 'other'];
export interface Entry {
  id: string; day: string; hk: string; sk: SK; ord: number; at?: number; text?: string;
  number?: string; deal?: string; notes?: string; stage?: string; plan?: string; billing?: string; price?: string; mvr?: string; regs?: string; pricing?: string;
  wa?: string; em?: string; tk?: { wa?: string; em?: string }; noMerge?: boolean; mergeInto?: string; tid?: string;
}
export interface Day { id: string; shiftStart: string; shiftEnd: string }
export const SECTIONS: { key: SK; label: string; sub: string; fields: { name: string; ph: string }[]; color: string }[] = [
  { key: 'tasks', label: 'Tasks Completed', sub: 'HubSpot link + Deal + Notes', color: 'green', fields: [{ name: 'number', ph: 'HubSpot deal link' }, { name: 'deal', ph: 'Deal name' }, { name: 'notes', ph: 'Reason / Notes' }] },
  { key: 'calls', label: 'Support Calls', sub: 'Deal / ticket + Reason', color: 'blue', fields: [{ name: 'number', ph: 'Deal / ticket name' }, { name: 'reason', ph: 'Reason' }] },
  { key: 'whatsapp', label: 'Whatsapp Inquiries', sub: 'Deal / ticket + Inquiry', color: 'amber', fields: [{ name: 'sender', ph: 'Deal / ticket name' }, { name: 'inquiry', ph: 'Inquiry' }] },
  { key: 'tickets', label: 'Tickets Attended', sub: 'Ticket type + Description', color: 'purple', fields: [{ name: 'type', ph: 'Type (e.g. SUPPORT)' }, { name: 'desc', ph: 'Description' }] },
  { key: 'other', label: 'Other', sub: 'Anything else', color: 'pink', fields: [{ name: 'note', ph: 'Note' }] },
];
export const CAT_LABELS: Record<SK, string> = { tasks: 'Tasks Completed', calls: 'Support Calls', whatsapp: 'Whatsapp Inquiries', tickets: 'Tickets Attended', other: 'Other' };
export const STAGES = ['Overdue', 'Churn', 'Lead', 'No response', 'Interested', 'Demo Completed', 'Going Live', 'Waiting on Contact', 'Closed Won All', 'Closed Lost All'];
export const DEAL_STAGES = ['Lead', 'Interested', 'Demo Completed', 'Going Live', 'Closed Won All', 'No response', 'Waiting on Contact', 'Overdue', 'Churn', 'Closed Lost All'];
export const WON = 'Closed Won All', LOST = 'Closed Lost All';
export const PLANS = ['Free', 'Starter', 'Professional'], CYCLES = ['Monthly', 'Biannual', 'Annual'];

// ---------- pricing (same table as before) ----------
export const PRICE_TABLE: Record<string, Record<string, [number, number]>> = {
  Starter: { Monthly: [39, 600], Biannual: [175, 2700], Annual: [350, 5400] },
  Professional: { Monthly: [59, 909.78], Biannual: [292, 4500], Annual: [584, 9000] } };
export const REG_PRICE: [number, number] = [20, 300], MVR_RATE = 15.42;
export const isPaid = (p: string) => p === 'Starter' || p === 'Professional';
export const hasRegs = (p: string) => p === 'Professional';
export const regMult = (b: string) => (b === 'Annual' ? 12 : b === 'Biannual' ? 6 : 1);
export function calcPrice(plan: string, billing: string, regs: unknown): [number, number] | null {
  const b = PRICE_TABLE[plan]?.[billing]; if (!b) return null;
  const n = hasRegs(plan) ? Math.max(0, parseInt(String(regs), 10) || 0) : 0, k = n * regMult(billing);
  return [r2(b[0] + k * REG_PRICE[0]), r2(b[1] + k * REG_PRICE[1])];
}
export const numStr = (n: number) => String(r2(n));
export const regsOf = (e: { regs?: unknown }) => Math.max(0, parseInt(String(e.regs ?? ''), 10) || 0);
export function moneyUsd(v: unknown) { const n = parsePrice(v); return isNaN(n) ? String(v) : '$' + fmtNum(n); }
export function priceText(e: { price?: unknown; mvr?: unknown }) {
  if (!hasVal(e.price)) return ''; const m = parsePrice(e.mvr);
  return moneyUsd(e.price) + (hasVal(e.mvr) && !isNaN(m) ? ' (' + fmtNum(m) + ' MVR)' : '');
}
export const totText = (usd: number, mvr: number, pn: number, mn: number) => '$' + fmtNum(usd) + (pn && pn === mn ? ' (' + fmtNum(mvr) + ' MVR)' : '');
export function normStage(s: unknown) {
  const l = String(s || '').toLowerCase().replace(/[^a-z]/g, ''); if (!l) return '';
  for (const st of STAGES) if (st.toLowerCase().replace(/[^a-z]/g, '') === l) return st;
  if (l === 'closedwon' || l === 'won') return WON; if (l === 'closedlost' || l === 'lost') return LOST;
  if (l === 'noreply') return 'No response'; if (l === 'demo') return 'Demo Completed'; if (l === 'waiting') return 'Waiting on Contact';
  return '';
}
export function normPlan(s: unknown) { const v = String(s || '').trim(); if (!v) return ''; const l = v.toLowerCase(); if (/^free/.test(l)) return 'Free'; if (/^starter/.test(l)) return 'Starter'; if (/^pro/.test(l)) return 'Professional'; return v; }
export function normCycle(s: unknown) {
  const l = String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); if (!l) return '';
  if (/^(bi|semi|half)/.test(l) || /^(6|six)month/.test(l)) return 'Biannual'; if (/^month/.test(l)) return 'Monthly'; if (/^(annual|year|12|twelve)/.test(l)) return 'Annual'; return '';
}
export function cycleOf(d: { billing?: string; plan?: string }) {
  const c = normCycle(d.billing); if (c) return c; const l = String(d.plan || '').toLowerCase();
  if (/bi-?\s?annual|semi|half|6\s?-?month|six\s?month/.test(l)) return 'Biannual'; if (/month/.test(l)) return 'Monthly'; if (/annual|year|12\s?-?month/.test(l)) return 'Annual'; return '';
}
export function planLabel(e: { plan?: string; billing?: string }) { const c = e.billing && normPlan(e.plan) !== 'Free' ? e.billing : ''; return (e.plan || '') + (c ? ' (' + c + ')' : ''); }
export function inferPricing(e: Partial<Entry>) {
  if (e.pricing === 'custom') return 'custom'; if (!hasVal(e.price)) return '';
  const c = calcPrice(normPlan(e.plan), normCycle(e.billing), e.regs), pr = parsePrice(e.price);
  if (c && Math.abs(c[0] - pr) < 0.005 && (!hasVal(e.mvr) || Math.abs(c[1] - parsePrice(e.mvr)) < 0.005)) return ''; return 'custom';
}
export function stageTone(st?: string) {
  if (st === WON) return 'good'; if (st === LOST || st === 'Churn' || st === 'Overdue') return 'bad';
  if (st === 'Interested' || st === 'Demo Completed' || st === 'Going Live') return 'acc'; return '';
}

// ---------- entry text ----------
export function entryText(e: Partial<Entry>) {
  if (e.text != null) return e.text;
  return [e.deal, e.notes].filter(Boolean).join(', ');
}
function linkInReport() { return !!lsJSON<{ linkInReport?: boolean }>('hub_priv_v1', {}).linkInReport; }
export function reportEntry(e: Entry) {
  let s = entryText(e);
  if (e.sk === 'tasks' && e.text == null) {
    const parts: string[] = [];
    if (e.stage) parts.push('Stage: ' + e.stage);
    if (e.plan) parts.push('Plan: ' + planLabel(e));
    if (e.price) parts.push('Price: ' + priceText(e));
    if (regsOf(e)) parts.push('Registers: +' + regsOf(e));
    if (e.number && linkInReport()) parts.push('Link: ' + e.number);
    if (parts.length) s += ' | ' + parts.join(' | ');
  }
  return s;
}
export function splitTicket(t: string) {
  if (t.charAt(0) !== '[') return null; let depth = 0;
  for (let i = 0; i < t.length; i++) { if (t[i] === '[') depth++; else if (t[i] === ']') { depth--; if (depth === 0) return { type: t.slice(1, i), desc: t.slice(i + 1).trim() }; } }
  return null;
}
export function ticketKind(type: string) { const m = type.match(/^\s*\[([^\]]+)\]/); return (m ? m[1] : type).trim().toUpperCase(); }
export function joinFields(sk: SK, v: Record<string, string>) {
  if (sk === 'calls') return (v.number || '') + (v.reason ? (v.number ? ': ' : '') + v.reason : '');
  if (sk === 'whatsapp') return (v.sender || '') + (v.inquiry ? (v.sender ? ': ' : '') + v.inquiry : '');
  if (sk === 'tickets') return v.type && v.desc ? '[' + v.type.toUpperCase() + '] ' + v.desc : v.type || v.desc;
  if (sk === 'other') return v.note;
  return '';
}
export function editFields(e: Entry): Record<string, string> {
  const split = (x: string) => { const i = x.indexOf(': '); return i < 0 ? [x, ''] : [x.slice(0, i), x.slice(i + 2)]; };
  if (e.sk === 'tasks') {
    if (e.text != null) { const p = split(e.text); return { number: '', deal: p[1] ? p[1] : p[0], notes: '' }; }
    return { number: e.number || '', deal: e.deal || '', notes: e.notes || '', stage: normStage(e.stage) || e.stage || '', plan: e.plan || '', billing: e.billing || '', price: e.price || '', mvr: e.mvr || '', regs: regsOf(e) ? String(regsOf(e)) : '', pricing: inferPricing(e) };
  }
  const t = entryText(e);
  if (e.sk === 'calls') { const p = split(t); return { number: p[0], reason: p[1] }; }
  if (e.sk === 'whatsapp') { const p = split(t); return { sender: p[0], inquiry: p[1] }; }
  if (e.sk === 'tickets') { const sp = splitTicket(t); return sp ? { type: sp.type, desc: sp.desc } : { type: '', desc: t }; }
  return { note: t };
}

// ---------- WhatsApp / Email marks (auto from note text; click cycles) ----------
const MK_RX: Record<'wa' | 'em', RegExp> = {
  wa: /\b(?:sending|sent|send|messaged|messaging|texted|texting)\b[^.;\n]{0,60}?\bwhats\s?app\b|\bwhats\s?apped\b|\bwhats\s?app\s+(?:sent|done)\b/i,
  em: /\be-?mailed\b|\b(?:sending|sent|send)\b[^.;\n]{0,40}?\be-?mail\b|\be-?mail\s+(?:sent|done)\b/i };
const MK_RED: Record<'wa' | 'em', RegExp> = {
  wa: /\b(?:unable|not able|can'?t|cannot|couldn'?t|could not|failed|fail)\b[^.;,\n]{0,25}?\b(?:send|sending|message|messaging|text|texting|reach|contact)\b[^.;,\n]{0,60}?\bwhats\s?app\b|\b(?:unable|not able|can'?t|cannot|couldn'?t)\s+to\s+whats\s?app\b|\bnot on whats\s?app\b/i,
  em: /\b(?:unable|not able|can'?t|cannot|couldn'?t|could not|failed|fail)\b[^.;,\n]{0,25}?\b(?:send|sending)\b[^.;,\n]{0,60}?\be-?mail\b|\b(?:unable|not able|can'?t|cannot|couldn'?t|could not|failed|fail)\b[^.;,\n]{0,15}?\be-?mail(?:ed|ing)?\b/i };
export const mkAuto = (tx: string, k: 'wa' | 'em') => (MK_RED[k].test(tx) ? 'r' : MK_RX[k].test(tx) ? 'g' : '');
export function mkOf(e: Partial<Entry>, k: 'wa' | 'em') { const v = e[k]; if (v) return v === 'x' ? '' : v; return mkAuto(entryText(e), k); }
export const tkOf = (e: Partial<Entry>, k: 'wa' | 'em') => (e.tk && e.tk[k]) || '';
export function cycleMark(e: Entry, k: 'wa' | 'em') {
  const cur = mkOf(e, k), next = cur === '' ? 'g' : cur === 'g' ? 'r' : '';
  put('entries', e.id, { [k]: next ? next : mkAuto(entryText(e), k) ? 'x' : undefined });
}
export function cycleTick(e: Entry, k: 'wa' | 'em') {
  const cur = tkOf(e, k), next = cur === '' ? 'y' : cur === 'y' ? 'n' : '';
  const tk = { ...(e.tk || {}) }; if (next) tk[k] = next; else delete tk[k];
  put('entries', e.id, { tk: Object.keys(tk).length ? tk : undefined });
}

// ---------- reading days ----------
let idxRev = -1; let idx: Map<string, Entry[]> = new Map();
function index() {
  if (idxRev === rev.value) return idx; idxRev = rev.value; idx = new Map();
  all<Entry>('entries').forEach(e => { let a = idx.get(e.day); if (!a) { a = []; idx.set(e.day, a); } a.push(e); });
  idx.forEach(a => a.sort((x, y) => (x.ord - y.ord) || (x.id < y.id ? -1 : 1)));
  return idx;
}
export function entriesOf(day: string): Entry[] { return index().get(day) || []; }
export function allEntryDays() { return Array.from(index().keys()).sort(); }
export function daysWithEntries() { return allEntryDays().filter(k => entriesOf(k).length > 0); }
export function getDay(k: string): Day {
  const d = get<Day>('days', k); if (d) return d;
  const prev = all<Day>('days').filter(x => x.id < k).sort((a, b) => (a.id < b.id ? -1 : 1)).pop();
  return { id: k, shiftStart: prev?.shiftStart || '09:00', shiftEnd: prev?.shiftEnd || '17:00' };
}
export function setShift(k: string, shiftStart: string, shiftEnd: string) { put('days', k, { shiftStart, shiftEnd }); }
export function generateHours(d: { shiftStart: string; shiftEnd: string }) {
  const s = timeToMin(d.shiftStart); let e = timeToMin(d.shiftEnd); if (e <= s) e = s + 60;
  const h: string[] = []; for (let t = s; t < e; t += 60) h.push(minToTime(t)); return h;
}
export function slotOf(day: string, hk: string): Record<SK, Entry[]> {
  const o: Record<SK, Entry[]> = { tasks: [], calls: [], whatsapp: [], tickets: [], other: [] };
  entriesOf(day).forEach(e => { if (e.hk === hk && o[e.sk]) o[e.sk].push(e); }); return o;
}
export function currentHour(day: string) {
  const d = getDay(day), hs = generateHours(d);
  if (day === todayKey()) { const c = minToTime(Math.floor((new Date().getHours() * 60) / 60) * 60); if (hs.indexOf(c) >= 0) return c; }
  return hs[0] || d.shiftStart;
}

// ---------- writing ----------
export function addEntry(day: string, hk: string, sk: SK, data: Partial<Entry>): string {
  const now = Date.now(), id = uid('e');
  if (!get('days', day)) { const d = getDay(day); put('days', day, { shiftStart: d.shiftStart, shiftEnd: d.shiftEnd }); }
  put('entries', id, { ...data, day, hk, sk, ord: now, at: data.at || now });
  return id;
}
export function updateEntry(id: string, data: Partial<Entry>) { put('entries', id, data); }
export function removeEntry(id: string) { del('entries', id); }
export function makeTask(v: Record<string, string>): Partial<Entry> {
  const e: Partial<Entry> = { number: v.number || '', deal: v.deal || '', notes: v.notes || '', stage: v.stage || '', plan: '', billing: '', price: '' };
  if (e.stage === WON) {
    e.plan = v.plan || '';
    if (isPaid(e.plan)) { e.billing = v.billing || ''; if (hasRegs(e.plan) && parseInt(v.regs, 10) > 0) e.regs = String(parseInt(v.regs, 10)); }
    e.price = v.price || ''; if (v.mvr) e.mvr = v.mvr; if (v.pricing === 'custom' && (e.price || e.mvr)) e.pricing = 'custom';
  }
  return e;
}

// ---------- stats ----------
export function planStats(list: Partial<Entry>[]) {
  const S = { total: list.length, price: 0, priced: 0, mvr: 0, mvrN: 0, groups: {} as Record<string, any>, other: { n: 0 }, none: { n: 0 } };
  PLANS.forEach(p => { S.groups[p] = { n: 0, price: 0, pn: 0, mvr: 0, mn: 0, nocyc: 0, cyc: { Monthly: { n: 0 }, Biannual: { n: 0 }, Annual: { n: 0 } } }; });
  list.forEach(d => {
    const p = normPlan(d.plan), pr = parsePrice(d.price), has = !isNaN(pr), mv = parsePrice(d.mvr), hasM = has && hasVal(d.mvr) && !isNaN(mv);
    if (has) { S.price += pr; S.priced++; if (hasM) { S.mvr += mv; S.mvrN++; } }
    if (!p) { S.none.n++; return; } const g = S.groups[p]; if (!g) { S.other.n++; return; }
    g.n++; if (has) { g.price += pr; g.pn++; if (hasM) { g.mvr += mv; g.mn++; } }
    if (p !== 'Free') { const c = cycleOf(d); if (c) g.cyc[c].n++; else g.nocyc++; }
  });
  return S;
}
export function stageStats(list: Entry[]) {
  const S = { total: list.length, none: 0, stages: {} as Record<string, number>, price: 0, priced: 0, mvr: 0, mvrN: 0, cw: planStats([]) };
  STAGES.forEach(s => { S.stages[s] = 0; }); const won: Entry[] = [];
  list.forEach(e => {
    if (e.text != null) { S.none++; return; }
    const st = normStage(e.stage); if (!st) S.none++; else { S.stages[st]++; if (st === WON) won.push(e); }
    const pr = parsePrice(e.price); if (!isNaN(pr)) { S.price += pr; S.priced++; const mv = parsePrice(e.mvr); if (hasVal(e.mvr) && !isNaN(mv)) { S.mvr += mv; S.mvrN++; } }
  });
  S.cw = planStats(won); return S;
}
const cycLine = (g: any) => ' (Monthly ' + g.cyc.Monthly.n + ' · Biannual ' + g.cyc.Biannual.n + ' · Annual ' + g.cyc.Annual.n + (g.nocyc ? ' · No billing set ' + g.nocyc : '') + ')';
export function stageLines(list: Entry[]) {
  if (!list.length) return [];
  const S = stageStats(list), L = ['Deal Stages']; let any = false;
  STAGES.forEach(s => {
    if (!S.stages[s]) return; any = true; L.push('  ' + s + ': ' + S.stages[s]);
    if (s === WON) {
      PLANS.forEach(p => { const g = S.cw.groups[p]; if (g.n) L.push('    ' + p + ': ' + g.n + (p !== 'Free' ? cycLine(g) : '')); });
      if (S.cw.other.n) L.push('    Other plan: ' + S.cw.other.n); if (S.cw.none.n) L.push('    No plan selected: ' + S.cw.none.n);
    }
  });
  if (S.none) { any = true; L.push('  No stage: ' + S.none); }
  if (!any) return [];
  if (S.priced) L.push('Total price: ' + totText(S.price, S.mvr, S.priced, S.mvrN));
  return L;
}
function idKey(s: string) { const t = String(s).trim(), i = t.indexOf(': '); const id = (i < 0 ? t : t.slice(0, i)).trim().toLowerCase(); return /^[\d+\-\s().]+$/.test(id) ? id.replace(/\D/g, '') : id; }
export function actStats(keys: string[]) {
  const S = { calls: { n: 0, ids: {} as Record<string, number>, uniq: 0, repeat: 0 }, whatsapp: { n: 0, ids: {} as Record<string, number>, uniq: 0, repeat: 0 }, tickets: { n: 0, types: {} as Record<string, number>, none: 0 }, other: { n: 0 }, any: false };
  keys.forEach(k => entriesOf(k).forEach(e => {
    if (e.sk === 'calls' || e.sk === 'whatsapp') { const s = S[e.sk]; s.n++; const id = idKey(entryText(e)); if (id) s.ids[id] = (s.ids[id] || 0) + 1; }
    else if (e.sk === 'tickets') { S.tickets.n++; const sp = splitTicket(entryText(e)), t = sp ? ticketKind(sp.type) : ''; if (t) S.tickets.types[t] = (S.tickets.types[t] || 0) + 1; else S.tickets.none++; }
    else if (e.sk === 'other') S.other.n++;
  }));
  (['calls', 'whatsapp'] as const).forEach(sk => { const ids = Object.keys(S[sk].ids); S[sk].uniq = ids.length; S[sk].repeat = ids.filter(i => S[sk].ids[i] > 1).length; });
  S.any = !!(S.calls.n || S.whatsapp.n || S.tickets.n || S.other.n); return S;
}
export const ticketTypes = (S: ReturnType<typeof actStats>) => Object.keys(S.tickets.types).sort((a, b) => (S.tickets.types[b] - S.tickets.types[a]) || a.localeCompare(b));
export function activityLines(S: ReturnType<typeof actStats>) {
  if (!S.any) return []; const L = ['Activity Breakdown'];
  if (S.calls.n) L.push('  Support Calls: ' + S.calls.n + ' (Unique callers ' + S.calls.uniq + ' · Repeat callers ' + S.calls.repeat + ')');
  if (S.whatsapp.n) L.push('  Whatsapp Inquiries: ' + S.whatsapp.n + ' (Unique senders ' + S.whatsapp.uniq + ' · Repeat senders ' + S.whatsapp.repeat + ')');
  if (S.tickets.n) { L.push('  Tickets Attended: ' + S.tickets.n); ticketTypes(S).forEach(t => L.push('    ' + t + ': ' + S.tickets.types[t])); if (S.tickets.none) L.push('    No type: ' + S.tickets.none); }
  if (S.other.n) L.push('  Other Items: ' + S.other.n);
  return L;
}

// ---------- report texts (same format as before) ----------
const atSuffix = (e: Entry) => (e.at ? '  [' + hrT(e.at) + ']' : '');
export function dayBodyLines(day: string, acc: { totals: Record<string, number>; tasks: Entry[] }) {
  const d = getDay(day), lines: string[] = []; let logged = 0;
  generateHours(d).forEach(hk => {
    const slot = slotOf(day, hk); const tot = SECTION_KEYS.reduce((n, k) => n + slot[k].length, 0); if (!tot) return;
    logged++; lines.push(fmt12(hk) + ' - ' + fmt12(minToTime(timeToMin(hk) + 60)));
    const block = (label: string, sk: SK) => { lines.push(label + ': ' + slot[sk].length); if (slot[sk].length) slot[sk].forEach(e => lines.push('  • ' + reportEntry(e) + atSuffix(e))); else lines.push('  • —'); };
    block('Tasks Completed', 'tasks'); block('Support Calls', 'calls'); block('Whatsapp Inquiries', 'whatsapp'); block('Tickets Attended', 'tickets'); block('Other', 'other');
    lines.push('');
    acc.totals.tasks += slot.tasks.length; acc.totals.calls += slot.calls.length; acc.totals.wa += slot.whatsapp.length; acc.totals.tickets += slot.tickets.length; acc.totals.other += slot.other.length;
    slot.tasks.forEach(e => acc.tasks.push(e));
  });
  return { lines, logged };
}
export function dayReport(day: string) {
  const d = getDay(day);
  const dateStr = parseKey(day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const acc = { totals: { tasks: 0, calls: 0, wa: 0, tickets: 0, other: 0 }, tasks: [] as Entry[] }, L: string[] = [];
  L.push('Day End Report — ' + dateStr); L.push('Shift: ' + fmt12(d.shiftStart) + ' – ' + fmt12(d.shiftEnd)); L.push('');
  dayLines(day).forEach(l => L.push(l));
  const body = dayBodyLines(day, acc); body.lines.forEach(l => L.push(l));
  if (!body.logged) { L.push('No activity logged yet'); L.push(''); }
  const t = acc.totals;
  L.push('─────────────────────', 'Totals', 'Tasks Completed: ' + t.tasks, 'Support Calls: ' + t.calls, 'Whatsapp Inquiries: ' + t.wa, 'Tickets Attended: ' + t.tickets, 'Other Items: ' + t.other);
  const sl = stageLines(acc.tasks); if (sl.length) { L.push(''); sl.forEach(l => L.push(l)); }
  const al = activityLines(actStats([day])); if (al.length) { L.push(''); al.forEach(l => L.push(l)); }
  return L.join('\n');
}
export type PeriodMode = 'month' | 'year' | 'all';
export function periodTitle(m: PeriodMode, y: number, mo: number) { return m === 'all' ? 'All days' : m === 'month' ? MONTHS[mo - 1] + ' ' + y : String(y); }
export function periodDays(m: PeriodMode, y: number, mo: number) { const pre = m === 'all' ? '' : m === 'month' ? y + '-' + String(mo).padStart(2, '0') : String(y); return daysWithEntries().filter(k => k.indexOf(pre) === 0); }
export function periodReport(m: PeriodMode, y: number, mo: number) {
  const L = ['Day End Report — ' + periodTitle(m, y, mo), ''], dk = periodDays(m, y, mo);
  const tot: Record<string, number> = { tasks: 0, calls: 0, wa: 0, tickets: 0, other: 0 }, tasks: Entry[] = [], perMonth: Record<number, number> = {};
  if (!dk.length) { L.push('No activity logged for this period'); L.push(''); }
  else {
    L.push('Days logged: ' + dk.length); L.push(''); let curM = '';
    dk.forEach(k => {
      const d = getDay(k);
      if (m !== 'month' && k.slice(0, 7) !== curM) { curM = k.slice(0, 7); L.push('━━ ' + MONTHS[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4) + ' ━━'); L.push(''); }
      L.push('▸ ' + fmtDay(k, true)); L.push('Shift: ' + fmt12(d.shiftStart) + ' – ' + fmt12(d.shiftEnd)); L.push('');
      dayLines(k).forEach(l => L.push(l));
      const t: Record<string, number> = { tasks: 0, calls: 0, wa: 0, tickets: 0, other: 0 };
      dayBodyLines(k, { totals: t, tasks }).lines.forEach(l => L.push(l));
      const sum = t.tasks + t.calls + t.wa + t.tickets + t.other;
      L.push('Day total: Tasks ' + t.tasks + ' · Calls ' + t.calls + ' · WA ' + t.wa + ' · Tickets ' + t.tickets + ' · Other ' + t.other); L.push('');
      Object.keys(tot).forEach(x => { tot[x] += t[x]; }); const mm = +k.slice(5, 7); perMonth[mm] = (perMonth[mm] || 0) + sum;
    });
  }
  L.push('─────────────────────', 'Totals', 'Tasks Completed: ' + tot.tasks, 'Support Calls: ' + tot.calls, 'Whatsapp Inquiries: ' + tot.wa, 'Tickets Attended: ' + tot.tickets, 'Other Items: ' + tot.other);
  if (m !== 'month' && dk.length) L.push('By month: ' + Object.keys(perMonth).map(Number).sort((a, b) => a - b).map(x => MONTHS[x - 1].slice(0, 3) + ' ' + perMonth[x]).join(' · '));
  const sl = stageLines(tasks); if (sl.length) { L.push(''); sl.forEach(l => L.push(l)); }
  const al = activityLines(actStats(dk)); if (al.length) { L.push(''); al.forEach(l => L.push(l)); }
  return L.join('\n');
}
const priceCell = (v: unknown) => (/^-?\d+(\.\d+)?$/.test(String(v || '').trim()) ? Number(v) : (v || ''));
export function entryRows(keys: string[]) {
  const rows: unknown[][] = [['Day', 'Hour', 'Category', '#', 'HubSpot link', 'Deal Name', 'Notes', 'Deal Stage', 'Plan', 'Billing', 'Price', 'Price (MVR)', 'Extra Registers', 'Details', 'Shift Start', 'Shift End', 'Logged At', 'Clock In', 'Clock Out', 'Breaks', 'Break Total', 'Worked']];
  keys.forEach(k => {
    const d = getDay(k), hks = Array.from(new Set(entriesOf(k).map(e => e.hk))).sort();
    hks.forEach(hk => { const slot = slotOf(k, hk); SECTION_KEYS.forEach(sk => slot[sk].forEach((e, i) => {
      const la = e.at ? hrT(e.at) : '', cc = dayCells(k);
      if (e.text != null) rows.push([k, hk, CAT_LABELS[sk], i + 1, '', '', '', '', '', '', '', '', '', e.text, d.shiftStart, d.shiftEnd, la, ...cc]);
      else rows.push([k, hk, CAT_LABELS[sk], i + 1, sk === 'tasks' ? e.number || '' : '', e.deal || '', e.notes || '', e.stage || '', e.plan || '', e.billing || '', priceCell(e.price), priceCell(e.mvr), regsOf(e) || '', '', d.shiftStart, d.shiftEnd, la, ...cc]);
    })); });
  });
  return rows;
}
export const XLSX_WIDTHS = [12, 8, 20, 5, 18, 24, 28, 50, 18, 14, 10, 10, 12, 10, 60, 11, 11, 13, 13, 13, 30, 12, 12, 28];
