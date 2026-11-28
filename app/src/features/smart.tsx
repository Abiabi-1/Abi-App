// Smart text: learns the sentences you type and suggests them again. Same rules as the old app (script-04-smart-text.js):
// learning on leaving a box / Enter, sentence + phrase + paragraph units, fuzzy merge, ranking by frequency, recency,
// picks and box context, fading of one-off phrases. Each phrase is its own synced record ('smart').
// One listener on the document; composedPath() reaches the boxes inside the Day End / Won Deals pages too.
import { signal } from '@preact/signals';
import { useState } from 'preact/hooks';
import { all, get, put, del, rev } from '../data/store';
import { lsGet, lsSet } from '../lib/util';
import { Btn, Sheet, Switch, closeModal, openModal, toast, Empty, DangerBtn } from '../ui/kit';
import { allEntryDays, entriesOf, entryText } from '../domain/dayend';

const MAX_ITEMS = 700, DAY = 864e5, MAX_SHOW = 5;
const STOP: Record<string, 1> = {}; 'the a an and or to of in on for is are was were i we you it my me our at be this that with they he she not did do have has will can as by but if so them their'.split(' ').forEach(w => { STOP[w] = 1; });
const NOTE_RE = /note|comment|detail|descri|reason|message|inquiry|remark|body|subject|title/i;
const SKIP_RE = /number|phone|price|mvr|e-?mail|sender|search|passw|otp|verification|card|iban|link|hubspot|date|time/i;
const LABELS: Record<string, string> = { deal: 'Deal name', notes: 'Notes', 'calls:reason': 'Call reason', 'whatsapp:inquiry': 'WhatsApp', 'tickets:desc': 'Ticket', 'tickets:type': 'Ticket type', 'other:note': 'Other' };
export interface Phrase { id: string; text: string; forms: Record<string, number>; count: number; sel: number; ign: number; first: number; last: number; ctx: Record<string, number>; sub: Record<string, number>; pin: boolean; man: boolean; kind: 'sentence' | 'phrase' | 'paragraph' }
type It = Phrase & { n: string; _t?: string[] };

// ---------- text helpers (as before) ----------
const LETTER = /[\p{L}\p{N}\p{M}]/u;
function normMap(s: string, wantIdx?: boolean): any {
  let out = ''; const idx: number[] | null = wantIdx ? [] : null;
  for (let i = 0; i < s.length; i++) {
    const c = s.charAt(i); if (c === "'" || c === '’' || c === '`') continue;
    if (LETTER.test(c)) { const lc = c.toLowerCase(); for (let j = 0; j < lc.length; j++) { out += lc.charAt(j); if (idx) idx.push(i); } }
    else if (out && out.charAt(out.length - 1) !== ' ') { out += ' '; if (idx) idx.push(i); }
  }
  return idx ? { n: out, idx } : out;
}
export const norm = (s: unknown) => (normMap(String(s || '')) as string).replace(/ $/, '');
const toks = (n: string) => (n ? n.split(' ') : []);
function bigrams(s: string) { const m: Record<string, number> = {}; let n = 0; for (let i = 0; i < s.length - 1; i++) { const k = s.substr(i, 2); m[k] = (m[k] || 0) + 1; n++; } return { m, n }; }
function dice(a: string, b: string) { if (a === b) return 1; if (a.length < 2 || b.length < 2) return 0; const A = bigrams(a), B = bigrams(b); let inter = 0; for (const k in A.m) if (B.m[k]) inter += Math.min(A.m[k], B.m[k]); return (2 * inter) / (A.n + B.n); }
export function hid(t: string) { const n = norm(t); let h = 5381; for (let i = 0; i < n.length; i++) h = ((h * 33) ^ n.charCodeAt(i)) >>> 0; return 'h' + h.toString(36) + n.length.toString(36); }
function segments(t: string) { const out: string[] = [], re = /[.!?…]+["'”’)\]]*(?:\s+|$)|\n+/g; let last = 0, m: RegExpExecArray | null, seg: string; while ((m = re.exec(t))) { seg = t.slice(last, m.index + m[0].length).trim(); if (seg) out.push(seg); last = m.index + m[0].length; if (!m[0].length) re.lastIndex++; } seg = t.slice(last).trim(); if (seg) out.push(seg); return out; }
export function validUnit(u: string) {
  if (u.length < 3 || u.length > 600) return false; if (!/[\p{L}]/u.test(u)) return false;
  if (/(\d[\s\-().+]*){7,}/.test(u)) return false; if (/@|https?:\/\/|www\./i.test(u)) return false; return true;
}

// ---------- store (records 'smart'; settings cfg 'smart'; the "already learned" marks stay on this device) ----------
export const smartCfg = () => ({ learn: true, suggest: true, ...(get<{ learn?: boolean; suggest?: boolean }>('cfg', 'smart') || {}) });
let idxRev = -1, ITEMS: It[] = [], BYN: Record<string, It> = {};
function index() {
  if (idxRev === rev.value) return; idxRev = rev.value;
  ITEMS = all<Phrase>('smart').map(p => { const it = { ...p, forms: p.forms || {}, ctx: p.ctx || {}, sub: p.sub || {}, count: +p.count || 1, sel: +p.sel || 0, ign: +p.ign || 0, last: +p.last || +p.first || 0, n: norm(p.text) } as It; return it; });
  BYN = {}; ITEMS.forEach(it => { BYN[it.n] = it; for (const f in it.forms) { const k = norm(f); if (k && !BYN[k]) BYN[k] = it; } });
}
export function items() { index(); return ITEMS; }
const save = (it: It) => { const { n, _t, ...rest } = it; void n; void _t; put('smart', it.id, { ...rest, id: undefined }); };
function value(it: It) { if (it.pin || it.man) return 1e6; return 0.4 * Math.min(1, Math.log(1 + it.count) / Math.log(21)) + 0.3 * Math.pow(0.5, (Date.now() - it.last) / (21 * DAY)) + 0.3 * Math.min(1, Math.log(1 + it.sel) / Math.log(11)); }
function prune() {
  index(); const now = Date.now(); const gone: It[] = [];
  let keep = ITEMS.filter(it => { if (it.pin || it.man) return true; const age = now - it.last; if ((it.count <= 1 && it.sel < 1 && age > 75 * DAY) || (it.count <= 3 && it.sel < 1 && age > 180 * DAY)) { gone.push(it); return false; } return true; });
  if (keep.length > MAX_ITEMS) { keep.sort((a, b) => value(b) - value(a)); gone.push(...keep.slice(MAX_ITEMS)); keep = keep.slice(0, MAX_ITEMS); }
  gone.forEach(it => del('smart', it.id));
}
function fuzzyFind(n: string) { let best: It | null = null, bd = 0.88; for (const it of ITEMS) { if (Math.abs(it.n.length - n.length) > 0.3 * Math.max(it.n.length, n.length)) continue; const d = dice(n, it.n); if (d >= bd) { bd = d; best = it; } } return best; }
type Info = { key: string; fam: string; sub: string; sib: string };
function learnUnit(text: string, kind: Phrase['kind'], info: Info | null, ids: Record<string, 1>) {
  if (!validUnit(text)) return; const n = norm(text); if (n.length < 3) return;
  index(); let it = BYN[n] || fuzzyFind(n); const now = Date.now();
  if (!it) { it = { id: hid(text), text, forms: {}, count: 0, sel: 0, ign: 0, first: now, last: now, ctx: {}, sub: {}, pin: false, man: false, kind, n }; ITEMS.push(it); BYN[n] = it; }
  else { it = { ...it, forms: { ...it.forms }, ctx: { ...it.ctx }, sub: { ...it.sub } }; if (kind === 'sentence' && it.kind === 'phrase') it.kind = 'sentence'; }
  it.count++; it.last = now; it.forms[text] = (it.forms[text] || 0) + 1;
  const fk = Object.keys(it.forms); if (fk.length > 6) { fk.sort((a, b) => it!.forms[a] - it!.forms[b]); delete it.forms[fk[0]]; }
  if (it.forms[text] >= (it.forms[it.text] || 0)) it.text = text;
  if (info) { it.ctx[info.key] = (it.ctx[info.key] || 0) + 1; if (info.sub) it.sub[info.sub] = (it.sub[info.sub] || 0) + 1; }
  save(it); ids[it.id] = 1; idxRev = -1;
}
export function learnField(text: string, info: Info | null) {
  const ids: Record<string, 1> = {}, segs = segments(text.replace(/\r/g, '')).slice(0, 20);
  segs.forEach(sg => {
    if (sg.length > 400) return; const wc = toks(norm(sg)).length;
    if (segs.length === 1 ? wc >= 1 && sg.length >= 3 : wc >= 2) learnUnit(sg, 'sentence', info, ids);
    if (wc >= 8) { const cl = sg.split(/\s*[,;—–]\s+|\s+-\s+/).map(c => c.trim()).filter(c => toks(norm(c)).length >= 3 && c.length >= 12); if (cl.length >= 2) cl.slice(0, 6).forEach(c => learnUnit(c.replace(/[,;]+$/, ''), 'phrase', info, ids)); }
  });
  const whole = text.trim(); if (segs.length > 1 && whole.length >= 20 && whole.length <= 600) learnUnit(whole.replace(/\s*\n+\s*/g, '\n'), 'paragraph', info, ids);
  prune(); return ids;
}

// ---------- field context ----------
const famOf = (k: string) => (k === 'deal' ? 'deal' : k === 'tickets:type' ? 'type' : 'text');
function fieldInfo(el: HTMLInputElement | HTMLTextAreaElement): Info {
  const f = el.dataset.f || '', sec = el.closest('[data-section]') as HTMLElement | null, section = sec ? sec.dataset.section || '' : '';
  let key: string;
  if (el.id === 'fDeal' || f === 'deal') key = 'deal'; else if (el.id === 'fNotes' || f === 'notes') key = 'notes';
  else if (f) key = section ? section + ':' + f : f; else key = 'f:' + String(el.id || el.name || el.placeholder || 'text').toLowerCase().slice(0, 30);
  const root = (sec || el.closest('form, .form, .ef, .sheet') || el.parentElement) as HTMLElement | null;
  const st = root?.querySelector('[data-f="stage"]') as HTMLSelectElement | null;
  const sub = st && st.value ? st.value : el.id && /^f[A-Z]/.test(el.id) ? 'Closed Won All' : '';
  let sib = ''; if (f !== 'deal') { const d = root?.querySelector('[data-f="deal"], #fDeal') as HTMLInputElement | null; if (d && d !== el) sib = d.value || ''; }
  return { key, fam: famOf(key), sub, sib };
}
export function isField(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el || el.nodeType !== 1) return false; const t = el.tagName;
  if (t === 'INPUT') { if (((el.getAttribute('type') || 'text').toLowerCase()) !== 'text') return false; } else if (t !== 'TEXTAREA') return false;
  const x = el as HTMLInputElement; if (x.readOnly || x.disabled || x.dataset.stOff) return false;
  const f0 = x.dataset.f || '', ph0 = x.placeholder || '';
  if (/^(number|price|mvr|regs)$/.test(f0) || /link|hubspot/i.test(ph0)) return false;
  if (NOTE_RE.test(ph0) && !/search|passw|otp|verification|card|iban|e-?mail|link/i.test(ph0 + ' ' + x.id + ' ' + (x.name || ''))) return true;
  return !SKIP_RE.test([f0, x.id, x.name, ph0, x.getAttribute('autocomplete')].join(' '));
}

// ---------- suggestions ----------
function fragStart(before: string) { const re = /[.!?…]+["'”’)\]]*\s+|\n\s*/g; let m: RegExpExecArray | null, end = 0; while ((m = re.exec(before))) end = m.index + m[0].length; return end; }
const tokOf = (it: It) => it._t || (it._t = toks(it.n));
function relevance(it: It, qn: string, qt: string[], lastPartial: boolean) {
  const n = it.n; if (n.length >= qn.length && n.lastIndexOf(qn, 0) === 0) return 1;
  const q = qn.replace(/ $/, ''); let sig = 0, hit = 0; const itt = tokOf(it);
  for (let i = 0; i < qt.length; i++) { const t = qt[i]; if (t.length < 3 || STOP[t]) continue; sig++; if (itt.some(w => w === t || (i === qt.length - 1 && lastPartial && w.lastIndexOf(t, 0) === 0))) hit++; }
  if (sig && hit && hit / sig >= 0.6 && (sig >= 2 || q.length >= 4)) return 0.42 + 0.3 * (hit / sig);
  if (q.length >= 5 && n.length >= q.length) { const d = dice(q, n.slice(0, q.length + 2)); if (d >= 0.8) return 0.4 + 0.35 * d; }
  return 0;
}
function score(it: It, r: number, info: Info, sur: string[]) {
  const age = (Date.now() - it.last) / DAY, F = Math.min(1, Math.log(1 + it.count) / Math.log(21)), R = Math.pow(0.5, age / 21), S = Math.min(1, Math.log(1 + it.sel) / Math.log(11));
  const keys = Object.keys(it.ctx); let c: number;
  if (!keys.length) c = it.man ? 0.85 : 0.5; else if (it.ctx[info.key]) c = 1; else { c = 0.08; for (const k of keys) if (famOf(k) === info.fam) { c = 0.6; break; } }
  let s = r * (0.25 + 0.75 * (0.4 * F + 0.3 * R + 0.3 * S)) * c;
  if (info.sub && it.sub[info.sub]) s *= 1.12;
  if (sur.length) { const itt = tokOf(it); let m = 0; sur.forEach(t => { if (itt.indexOf(t) >= 0) m++; }); s *= 1 + 0.2 * (m / sur.length); }
  const net = it.ign - 2 * it.sel; if (net > 0) s /= 1 + 0.06 * net;
  if (it.kind === 'phrase') s *= 0.85; if (it.pin) s *= 1.4; return s;
}
type Sug = { it: It; s: number; r: number; start: number; end: number; scope: string; qn: string; snap: string; sep?: string };
function suggest(el: HTMLInputElement | HTMLTextAreaElement): Sug[] {
  index(); const v = el.value, caret = el.selectionStart; if (caret == null || caret !== el.selectionEnd) return [];
  const nx = v.charAt(caret); if (nx && LETTER.test(nx)) return [];
  const before = v.slice(0, caret), fs = fragStart(before), ws = before.length - before.replace(/^\s+/, '').length;
  const qs: { text: string; start: number; scope: string }[] = [{ text: before.slice(fs), start: fs, scope: 'frag' }];
  if (fs > ws && before.length - ws <= 400) qs.push({ text: before.slice(ws), start: ws, scope: 'whole' });
  const info = fieldInfo(el), sur = toks(norm(before.slice(0, fs) + ' ' + info.sib)).filter(t => t.length >= 4 && !STOP[t]);
  const maxLen = el.maxLength > 0 ? el.maxLength : 0, best: Record<string, Sug> = {};
  for (const q of qs) {
    const qm = normMap(q.text, true), qn: string = qm.n.replace(/^ /, ''); if (qn.replace(/ /g, '').length < 2) continue;
    const qt = toks(qn.replace(/ $/, '')), lp = !/\s$/.test(q.text);
    for (const it of ITEMS) {
      if (!it.pin && !it.man && it.count < 2 && it.sel < 1 && tokOf(it).length < 3) continue;
      const r = relevance(it, qn, qt, lp); if (!r) continue; if (r < 1 && q.scope === 'whole') continue;
      if (r === 1 && it.n === qn.replace(/ $/, '') && it.text === q.text.trim()) continue;
      if (maxLen && v.length - (caret - q.start) + it.text.length > maxLen) continue;
      const s = score(it, r, info, sur), cur = best[it.id];
      if (!cur || s > cur.s) best[it.id] = { it, s, r, start: q.start, end: caret, scope: q.scope, qn, snap: v };
    }
  }
  return Object.values(best).filter(b => b.s >= 0.07).sort((a, b) => b.s - a.s || b.it.count - a.it.count).slice(0, MAX_SHOW);
}
function options(el: HTMLInputElement | HTMLTextAreaElement): Sug[] {
  index(); const v = el.value, info = fieldInfo(el), sur = toks(norm(info.sib)).filter(t => t.length >= 4 && !STOP[t]), nv = norm(v), maxLen = el.maxLength > 0 ? el.maxLength : 0;
  const start = v.replace(/\s+$/, '').length, sep = start ? (/[.!?…]$/.test(v.replace(/\s+$/, '')) ? ' ' : '. ') : '';
  const out: Sug[] = [];
  ITEMS.forEach(it => { if (!it.pin && !it.man && it.count < 2 && it.sel < 1) return; if (nv && nv.indexOf(it.n) >= 0) return; if (maxLen && start + sep.length + it.text.length > maxLen) return; const sc = score(it, 0.6, info, sur); if (sc < 0.05) return; out.push({ it, s: sc, r: 0, start, end: v.length, scope: 'opt', qn: '', snap: v, sep }); });
  return out.sort((a, b) => b.s - a.s || b.it.count - a.it.count).slice(0, MAX_SHOW);
}
function hlLen(b: Sug) { if (b.r !== 1) return 0; const m = normMap(b.it.text, true), len = b.qn.length; if (!len || len > m.n.length) return 0; const at = m.idx[len - 1]; return at == null ? 0 : at + 1; }

// ---------- controller (one per app) ----------
type Sess = { start: string; last: string; touched: boolean; picked: boolean; shown: string[] };
const sess = new WeakMap<Element, Sess>();
const S = (el: HTMLInputElement | HTMLTextAreaElement) => { let s = sess.get(el); if (!s) { s = { start: el.value, last: el.value, touched: false, picked: false, shown: [] }; sess.set(el, s); } return s; };
let pop: HTMLDivElement | null = null, cur: { el: HTMLInputElement | HTMLTextAreaElement | null; list: Sug[]; act: number; sup: boolean } = { el: null, list: [], act: -1, sup: false }, prog = false, comp = false;
const real = (e: Event) => (e.composedPath ? (e.composedPath()[0] as Element) : (e.target as Element));
function hide() { if (!pop) return; pop.classList.remove('show'); pop.textContent = ''; cur.list = []; cur.act = -1; }
function place() {
  const el = cur.el; if (!el || !pop || !pop.classList.contains('show')) return;
  const r = el.getBoundingClientRect(), vw = innerWidth, vh = innerHeight; if (r.bottom < 0 || r.top > vh) { hide(); return; }
  const w = Math.min(Math.max(r.width, 280), Math.min(560, vw - 16)), left = Math.min(Math.max(8, r.left), vw - w - 8);
  pop.style.width = w + 'px'; pop.style.left = left + 'px'; pop.style.maxHeight = '';
  const h = pop.offsetHeight, below = vh - r.bottom - 8, above = r.top - 8;
  if (h <= below || below >= above) { pop.style.top = r.bottom + 4 + 'px'; if (h > below) pop.style.maxHeight = Math.max(90, below) + 'px'; }
  else { const hh = Math.min(h, above); pop.style.maxHeight = hh + 'px'; pop.style.top = r.top - 4 - hh + 'px'; }
}
function mark() { if (!pop) return; Array.from(pop.querySelectorAll('.st-it')).forEach(k => k.classList.toggle('act', +(k.getAttribute('data-i') || -1) === cur.act)); pop.querySelector('.act')?.scrollIntoView({ block: 'nearest' }); }
function render(el: HTMLInputElement | HTMLTextAreaElement, list: Sug[], head?: string) {
  if (!pop) return; cur.el = el; cur.list = list; cur.act = -1; pop.textContent = '';
  if (head) { const hd = document.createElement('div'); hd.className = 'st-hd'; hd.textContent = head; pop.appendChild(hd); }
  list.forEach((b, i) => {
    const row = document.createElement('div'); row.className = 'st-it'; row.setAttribute('role', 'option'); row.setAttribute('data-i', String(i));
    const tx = document.createElement('div'), hl = hlLen(b), text = b.it.text; tx.className = 'st-tx';
    if (hl > 0 && hl < text.length) { const d = document.createElement('span'); d.className = 'st-dim'; d.textContent = text.slice(0, hl); tx.append(d, document.createTextNode(text.slice(hl))); } else tx.textContent = text;
    row.appendChild(tx); if (b.it.pin) { const p = document.createElement('span'); p.className = 'st-pin'; p.title = 'Pinned'; p.textContent = '★'; row.appendChild(p); }
    pop!.appendChild(row);
  });
  const ft = document.createElement('div'); ft.className = 'st-ft'; ft.textContent = 'Click to insert · ↑↓ then Enter · Esc to close'; pop.appendChild(ft);
  pop.classList.add('show'); place(); S(el).shown = list.slice(0, 1).map(b => b.it.id);
}
function active(el: Element) { const r = el.getRootNode() as Document | ShadowRoot; return (r as any).activeElement === el; }
function refresh(el: HTMLInputElement | HTMLTextAreaElement) {
  if (!smartCfg().suggest || cur.sup || !isField(el) || !active(el)) { hide(); return; }
  const list = suggest(el); if (!list.length) { hide(); return; } render(el, list);
}
function fireInput(el: HTMLInputElement | HTMLTextAreaElement) { prog = true; try { el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertReplacementText' })); } catch { el.dispatchEvent(new Event('input', { bubbles: true })); } prog = false; }
function accept(i: number) {
  const b = cur.list[i], el = cur.el; if (!b || !el) return; const v = el.value; if (v !== b.snap) { hide(); return; }
  let text = b.it.text; if (el.tagName === 'INPUT') text = text.replace(/\s*\n+\s*/g, ' ');
  const after = v.slice(b.end); let ins = (b.sep || '') + text; if (after && !/^[\s.,;:!?)\]]/.test(after) && !/\s$/.test(ins)) ins += ' ';
  const nv = v.slice(0, b.start) + ins + after, caret = b.start + ins.length;
  el.value = nv; try { el.setSelectionRange(caret, caret); } catch { /* */ }
  fireInput(el); try { el.setSelectionRange(caret, caret); } catch { /* */ }
  const s = S(el); s.picked = true; s.touched = true; s.shown = [];
  put('smart', b.it.id, { sel: b.it.sel + 1, last: Date.now() }); hide();
}
function commit(el: HTMLInputElement | HTMLTextAreaElement) {
  try {
    if (!smartCfg().learn || !isField(el)) return; const s = S(el), v = el.value;
    if (!v.trim() || !s.touched || v === s.last) return;
    // read the box now, learn a moment later: a box can lose focus because its page is closing, and saving during that would
    // re-render the app in the middle of the page change
    const info = fieldInfo(el), picked = s.picked, shown = s.shown.slice();
    s.last = v; s.touched = false; s.picked = false; s.shown = [];
    setTimeout(() => { try { const ids = learnField(v, info); if (!picked) shown.forEach(id => { if (ids[id]) return; const it = items().find(x => x.id === id); if (it) put('smart', id, { ign: it.ign + 1 }); }); } catch { /* */ } }, 0);
  } catch { /* */ }
}
/** Round 54: after a quick note / template wrote into the box: focus, caret at the end, show continuations or the best options. */
export function smartActivate(el: Element | null | undefined) {
  try {
    if (!el || !smartCfg().suggest || !isField(el)) return false; el.focus(); const L = el.value.length; try { el.setSelectionRange(L, L); } catch { /* */ }
    cur.sup = false; S(el).picked = false; S(el).touched = true;
    let list = suggest(el), head = ''; if (!list.length) { list = options(el); head = 'Smart text options'; }
    if (!list.length) { hide(); return false; } render(el, list, head); return true;
  } catch { return false; }
}
// focus moving between boxes inside an isolated page (shadow root) does not reach the document, so those roots listen too
const onFocusIn = (e: Event) => { const el = real(e); if (!isField(el)) return; const s = S(el); if (s.touched) return; s.start = el.value; s.last = el.value; s.picked = false; s.shown = []; cur.sup = false; };
const onFocusOut = (e: Event) => { const el = real(e); if (!isField(el)) return; commit(el); if (cur.el === el) hide(); };
const roots = new WeakSet<Node>();
export function smartRoot(r: ShadowRoot) { if (roots.has(r)) return; roots.add(r); r.addEventListener('focusin', onFocusIn, true); r.addEventListener('focusout', onFocusOut, true); }
export function installSmart() {
  if (pop) return; pop = document.createElement('div'); pop.className = 'st-pop'; pop.setAttribute('role', 'listbox'); document.body.appendChild(pop);
  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('focusout', onFocusOut, true);
  document.addEventListener('compositionstart', () => { comp = true; }, true);
  document.addEventListener('compositionend', e => { comp = false; const el = real(e); if (isField(el)) { S(el).touched = true; refresh(el); } }, true);
  document.addEventListener('input', e => { const el = real(e); if (!isField(el)) return; if (!prog) { S(el).touched = true; cur.sup = false; } if (comp || prog) return; refresh(el); }, true);
  document.addEventListener('keydown', e => {
    try {
      const el = real(e); if (!isField(el) || e.isComposing || comp) return;
      const open = pop!.classList.contains('show') && cur.el === el && cur.list.length;
      if (open) {
        const key = e.key, needAlt = el.tagName === 'TEXTAREA' && el.value.indexOf('\n') >= 0;
        if ((key === 'ArrowDown' || key === 'ArrowUp') && (!needAlt || e.altKey)) { e.preventDefault(); e.stopPropagation(); const n = cur.list.length; cur.act = key === 'ArrowDown' ? (cur.act + 1) % n : cur.act <= 0 ? n - 1 : cur.act - 1; mark(); return; }
        if ((key === 'Enter' || key === 'Tab') && cur.act >= 0) { e.preventDefault(); e.stopImmediatePropagation(); accept(cur.act); return; }
        if (key === 'Escape') { e.preventDefault(); e.stopPropagation(); cur.sup = true; hide(); return; }
      }
      if (e.key === 'Enter' && el.tagName === 'INPUT' && !e.shiftKey) commit(el);
      if (/^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)) hide();
    } catch { /* */ }
  }, true);
  document.addEventListener('mousedown', e => { const t = real(e); if (pop!.contains(t)) e.preventDefault(); else if (t !== cur.el) hide(); }, true);
  pop.addEventListener('click', e => { const r = (e.target as Element).closest('.st-it'); if (r) { e.preventDefault(); accept(+(r.getAttribute('data-i') || 0)); } });
  document.addEventListener('scroll', place, true); addEventListener('resize', place);
  // learn from what is already saved: on start and every 90 s (only text not seen before)
  setTimeout(() => backfill(false), 3000); setInterval(() => { if (!document.hidden) backfill(false); }, 90000);
}

// ---------- learn from existing data (as before; the marks of what was read stay on this device) ----------
export function backfill(force: boolean) {
  if (!smartCfg().learn && !force) return 0;
  let seen: Record<string, 1> = {}; if (!force) { try { seen = JSON.parse(lsGet('v2_smart_seen') || '{}'); } catch { seen = {}; } }
  const n0 = items().length;
  const take = (t: unknown, key: string, stage = '', deal = '') => { if (typeof t !== 'string' || t.trim().length < 3 || t.length > 1500) return; const sh = hid(t) + ':' + key.charAt(0); if (seen[sh]) return; seen[sh] = 1; learnField(t, { key, fam: famOf(key), sub: stage, sib: deal }); };
  allEntryDays().forEach(k => entriesOf(k).forEach(e => { if (e.sk === 'tasks' && e.text == null) { take(e.deal, 'deal'); take(e.notes, 'notes', e.stage, e.deal); } else take(entryText(e).replace(/^[^:]*:\s*/, ''), 'notes'); }));
  all<any>('tasks').forEach(t => { take(t.title, 'notes'); take(t.notes, 'notes'); });
  all<any>('tickets').forEach(t => { take(t.subject, 'notes'); take(t.desc, 'notes'); (t.notes || []).forEach((n: any) => take(n && n.text, 'notes')); });
  all<any>('dealnotes').forEach(n => take(n.text, 'notes')); all<any>('lost').forEach(l => take(l.notes, 'notes'));
  const ks = Object.keys(seen); if (ks.length > 12000) { seen = {}; ks.slice(-8000).forEach(x => { seen[x] = 1; }); }
  lsSet('v2_smart_seen', JSON.stringify(seen)); idxRev = -1;
  return items().length - n0;
}
/** Old smartText_v1 → records (ids as in the old app, so two devices converting the same data match). */
export function importSmartLegacy(raw: string | null, putFn: (c: string, id: string, d: any) => void) {
  if (!raw) return 0; let p: any; try { p = JSON.parse(raw); } catch { return 0; } if (!p || !Array.isArray(p.items)) return 0;
  let n = 0;
  p.items.forEach((x: any) => { if (!x || typeof x.text !== 'string' || !x.text || !validUnit(x.text)) return; const id = x.id || hid(x.text); putFn('smart', id, { text: x.text, forms: x.forms || { [x.text]: 1 }, count: +x.count || 1, sel: +x.sel || 0, ign: +x.ign || 0, first: +x.first || Date.now(), last: +x.last || +x.first || Date.now(), ctx: x.ctx || {}, sub: x.sub || {}, pin: !!x.pin, man: !!x.man, kind: x.kind === 'phrase' || x.kind === 'paragraph' ? x.kind : 'sentence' }); n++; });
  putFn('cfg', 'smart', { learn: p.learn !== false, suggest: p.suggest !== false });
  return n;
}

// ---------- manager ----------
export const smartOpen = signal(false);
export function openSmart() { openModal(() => <SmartManager />); }
function ctxLabel(it: It) { const ks = Object.keys(it.ctx).sort((a, b) => it.ctx[b] - it.ctx[a]).slice(0, 2); return ks.map(k => LABELS[k] || (k.indexOf('f:') === 0 ? 'Other' : k)).filter((x, i, a) => a.indexOf(x) === i).join(', '); }
function SmartManager() {
  void rev.value; const cfg = smartCfg();
  const [q, setQ] = useState(''), [add, setAdd] = useState(''), [editing, setEditing] = useState<string | null>(null), [ed, setEd] = useState(''), [clr, setClr] = useState(false), [lb, setLb] = useState('Learn from existing data');
  const qq = norm(q), list = items().filter(it => !qq || it.n.indexOf(qq) >= 0).sort((a, b) => (+b.pin - +a.pin) || value(b) - value(a) || b.last - a.last);
  const doAdd = () => { const v = add.trim(); if (!validUnit(v)) return toast('Phrases need letters, no phone numbers, e-mails or links'); index(); const it = BYN[norm(v)]; if (it) put('smart', it.id, { pin: true, man: true }); else put('smart', hid(v), { text: v, forms: { [v]: 1 }, count: 1, sel: 0, ign: 0, first: Date.now(), last: Date.now(), ctx: {}, sub: {}, pin: false, man: true, kind: 'sentence' }); setAdd(''); };
  const saveEdit = (it: It) => {
    const v = ed.trim(); if (!validUnit(v)) return toast('Phrases need letters, no phone numbers, e-mails or links'); index(); const other = BYN[norm(v)];
    if (other && other.id !== it.id) { const ctx = { ...other.ctx }; for (const k in it.ctx) ctx[k] = (ctx[k] || 0) + it.ctx[k]; put('smart', other.id, { count: other.count + it.count, sel: other.sel + it.sel, pin: other.pin || it.pin, man: other.man || it.man, last: Math.max(other.last, it.last), ctx }); del('smart', it.id); }
    else put('smart', it.id, { text: v, forms: { [v]: it.count }, man: true });
    setEditing(null);
  };
  return <Sheet title="Smart text" onClose={closeModal} wide foot={<><span class="faint" style={{ marginRight: 'auto', fontSize: '.78rem' }}>{items().length} phrase{items().length === 1 ? '' : 's'}{qq ? ' · ' + list.length + ' shown' : ''}</span>
    <Btn onClick={() => { const n = backfill(true); setLb(n ? 'Learned ' + n + ' new phrases' : 'Nothing new to learn'); setTimeout(() => setLb('Learn from existing data'), 2500); }}>{lb}</Btn>
    <button class="b danger" onClick={() => { if (!clr) { setClr(true); setTimeout(() => setClr(false), 4000); return; } setClr(false); items().forEach(it => del('smart', it.id)); toast('Learned data cleared'); }}>{clr ? 'Click again to delete everything' : 'Clear learned data'}</button></>}>
    <p class="muted" style={{ marginTop: 0, fontSize: '.8rem' }}>Learns the sentences you type and suggests them again. Phone numbers, e-mails and links are never learned. Phrases sync between your devices.</p>
    <div class="ctl" style={{ flexWrap: 'wrap' }}>
      <label class="ctl" style={{ margin: 0 }}><Switch on={cfg.learn} onChange={v => put('cfg', 'smart', { learn: v })} label="Learn from my typing" /><span>Learn from my typing</span></label>
      <label class="ctl" style={{ margin: 0 }}><Switch on={cfg.suggest} onChange={v => { put('cfg', 'smart', { suggest: v }); if (!v) hide(); }} label="Show suggestions" /><span>Show suggestions</span></label>
    </div>
    <div class="ctl"><input class="in grow" placeholder="Search saved phrases" value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} data-st-off="1" /></div>
    <div class="ctl"><input class="in grow" placeholder="Add a phrase manually" value={add} onInput={e => setAdd((e.target as HTMLInputElement).value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } }} data-st-off="1" /><button class="b-add" onClick={doAdd}>Add</button></div>
    {!list.length ? <Empty>{items().length ? 'No phrases match your search.' : 'Nothing learned yet. Phrases you type in the app will appear here, or add one above.'}</Empty>
      : list.slice(0, 150).map(it => <div class="item st-row">
        {editing === it.id ? <div class="main"><textarea class="in" rows={3} value={ed} onInput={e => setEd((e.target as HTMLTextAreaElement).value)} data-st-off="1" /><div class="ctl" style={{ marginTop: '6px' }}><button class="b-add" onClick={() => saveEdit(it)}>Save</button><Btn onClick={() => setEditing(null)}>Cancel</Btn></div></div>
          : <><div class="main"><div class="t" style={{ fontWeight: 400, whiteSpace: 'pre-wrap' }}>{it.pin && <span style={{ color: 'var(--accent2)' }}>★ </span>}{it.text}</div><div class="s">{[it.man ? 'Saved by you' : 'Used ' + it.count + '×', it.sel ? 'Picked ' + it.sel + '×' : '', ctxLabel(it)].filter(Boolean).join(' · ')}</div></div>
            <div class="acts"><Btn onClick={() => put('smart', it.id, { pin: !it.pin })}>{it.pin ? 'Unpin' : 'Pin'}</Btn><Btn onClick={() => { setEditing(it.id); setEd(it.text); }}>Edit</Btn><DangerBtn onConfirm={() => del('smart', it.id)}>Delete</DangerBtn></div></>}
      </div>)}
  </Sheet>;
}
