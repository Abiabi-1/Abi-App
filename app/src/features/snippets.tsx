// Snippets (text shortcuts): type ".np" + space and it becomes the full text. Same engine, commands and starter pack as the
// old app (tools/snippets.tpl.js). Each shortcut is its own synced record ('snippets'); settings in cfg 'snippets'.
import { useEffect, useRef, useState } from 'preact/hooks';
import { all, get, put, del, rev } from '../data/store';
import { download, uid } from '../lib/util';
import { Btn, Field, Sheet, Switch, closeModal, openModal, toast, Empty, DangerBtn } from '../ui/kit';

export interface Snip { id: string; trigger: string; text: string; folder: string; on: boolean; imm: boolean; std?: number }
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], DAYN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const pad = (n: number) => (n < 10 ? '0' : '') + n;
export function fmt(d: Date, f?: string) {
  return String(f || 'DD/MM/YYYY').replace(/YYYY|YY|MMMM|MMM|MM|DDDD|DDD|DD|HH|hh|mm|ss|A|a/g, t => {
    switch (t) { case 'YYYY': return String(d.getFullYear()); case 'YY': return String(d.getFullYear()).slice(2); case 'MMMM': return MON[d.getMonth()]; case 'MMM': return MON[d.getMonth()].slice(0, 3); case 'MM': return pad(d.getMonth() + 1);
      case 'DDDD': return DAYN[d.getDay()]; case 'DDD': return DAYN[d.getDay()].slice(0, 3); case 'DD': return pad(d.getDate()); case 'HH': return pad(d.getHours()); case 'hh': return pad(d.getHours() % 12 || 12); case 'mm': return pad(d.getMinutes()); case 'ss': return pad(d.getSeconds()); case 'A': return d.getHours() < 12 ? 'AM' : 'PM'; default: return d.getHours() < 12 ? 'am' : 'pm'; }
  });
}
// ---------- starter pack (the same 76 shortcuts as before) ----------
const P: [string, [string, string][]][] = [
  ['Dates & time', [['d', '{date:DD/MM/YYYY}'], ['dl', '{date:DD MMMM YYYY}'], ['t', '{time:hh:mm A}'], ['t24', '{time:HH:mm}'], ['dt', '{date:DD/MM/YYYY} {time:hh:mm A}'], ['td', '{date+1:DD/MM/YYYY}'], ['yd', '{date-1:DD/MM/YYYY}'], ['nw', '{date+7:DD/MM/YYYY}'], ['2d', '{date+2:DD/MM/YYYY}'], ['3d', '{date+3:DD/MM/YYYY}'], ['wd', '{date:DDDD}'], ['mo', '{date:MMMM YYYY}'], ['tom', 'tomorrow ({date+1:DDDD})']]],
  ['Call outcomes', [['np', 'Did not pick up. Will try again later.'], ['na', 'No answer.'], ['so', 'Phone switched off.'], ['vm', 'Left a voicemail.'], ['busy', 'Customer busy — asked to call back later.'], ['cb', 'Asked to call back on {ask:When=tomorrow}.'], ['wn', 'Wrong number.'], ['ni', 'Not interested.'], ['int', 'Interested — wants a demo.'], ['spk', 'Spoke to {ask:Name}. {cursor}'], ['rch', 'Reached {ask:Name} — {cursor}']]],
  ['Deal progress', [['dem', 'Demo scheduled for {ask:Date and time}.'], ['dd', 'Demo done. {cursor}'], ['pay', 'Payment received.'], ['pp', 'Payment pending.'], ['inv', 'Invoice sent.'], ['qt', 'Quotation sent. Waiting for their reply.'], ['live', 'Going live on {ask:Date}.'], ['set', 'Setup in progress.'], ['trn', 'Staff training completed.'], ['reg', 'Added {ask:How many} extra register(s).'], ['won', 'Subscribed and paid — closed won.'], ['lost', 'Closed lost: {ask:Reason}.'], ['ch', 'Cancelled / churned: {ask:Reason}.'], ['ren', 'Renewal due {ask:Date}. {cursor}'], ['fu', 'Follow up on {date+7:DD/MM/YYYY}.'], ['fu3', 'Follow up on {date+3:DD/MM/YYYY}.']]],
  ['Reach & channels', [['wa', 'Sent details on WhatsApp.'], ['em', 'Sent details by email.'], ['nowa', 'Unable to send a WhatsApp message — not on WhatsApp.'], ['noem', 'Unable to email — address bounced / invalid.'], ['tl', 'Spoke on the phone, then sent a summary on WhatsApp.']]],
  ['Replies & sign-offs', [['hi', 'Hello {ask:Name},'], ['gm', 'Good morning,'], ['ga', 'Good afternoon,'], ['ge', 'Good evening,'], ['thx', 'Thank you for contacting us.'], ['thx2', 'Thank you for your patience.'], ['sry', 'Sorry for the inconvenience caused.'], ['wt', 'Please give us a moment while we check this for you.'], ['ok', 'Sure, noted.'], ['fb', 'Thank you for your feedback.'], ['res', 'This has been resolved. Please let us know if you need anything else.'], ['esc', 'I have escalated this to our technical team and will update you shortly.'], ['kr', 'Kind regards,\n{ask:Your name}'], ['br', 'Best regards,\n{ask:Your name}'], ['tkt', 'Ticket raised: {ask:Issue}. {cursor}']]],
  ['Symbols & misc', [['mvr', 'MVR {cursor}'], ['usd', 'USD {cursor}'], ['ck', '✓'], ['x', '✗'], ['ar', '→'], ['dsh', '—'], ['bl', '• '], ['num', '{number}'], ['dn', '{deal}'], ['cp', '{clipboard}']]],
  ['My shortcuts', [['1', 'Did not pick up'], ['2', 'Call back later'], ['3', 'Demo done'], ['4', 'Interested'], ['5', 'Payment received']]],
];
export function starter(): Snip[] { const o: Snip[] = []; let id = 0; P.forEach(g => g[1].forEach(x => o.push({ id: 's' + ++id, trigger: '.' + x[0], text: x[1], folder: g[0], on: true, imm: false, std: 1 }))); return o; }
export const snipCfg = () => ({ on: true, ci: true, ...(get<{ on?: boolean; ci?: boolean }>('cfg', 'snippets') || {}) });
export const snippets = () => all<Snip>('snippets').map(s => ({ ...s, folder: s.folder || 'General', on: s.on !== false, imm: !!s.imm }));
function maps() {
  const map: Record<string, Snip> = {}, lmap: Record<string, Snip> = {}; let maxLen = 0;
  snippets().forEach(s => { if (!s || s.on === false || !s.trigger) return; map[s.trigger] = s; const l = s.trigger.toLowerCase(); if (!lmap[l]) lmap[l] = s; if (s.trigger.length > maxLen) maxLen = s.trigger.length; });
  return { map, lmap, maxLen };
}
let M = { map: {} as Record<string, Snip>, lmap: {} as Record<string, Snip>, maxLen: 0 }, mRev = -1;
const mp = () => { if (mRev !== rev.value) { mRev = rev.value; M = maps(); } return M; };

// ---------- commands ----------
function ctxOf(el: Element) {
  const box = (el.closest('.section, form, .form, .ef, .entry, .sheet, [data-section]') || el.getRootNode()) as ParentNode;
  const v = (sel: string) => { const n = box.querySelector(sel) as HTMLInputElement | null; return n ? String(n.value || '').trim() : ''; };
  return { number: v('[data-f="number"]') || v('#fNumber'), deal: v('[data-f="deal"]') || v('#fDeal'), email: '', name: v('[data-f="deal"]') || v('#fDeal') } as Record<string, string>;
}
type Ask = { t: 'ask' | 'choose'; label: string; def?: string; opts?: string[] };
export function parse(text: string, el?: Element) {
  const asks: Ask[] = [], now = new Date(), C = el ? ctxOf(el) : { number: '', deal: '', email: '', name: '' };
  const out = String(text).replace(/\{(date|time|datetime)([+-]\d+)?(?::([^}]*))?\}/gi, (_m, k: string, off: string, f: string) => { const d = new Date(now); if (off) d.setDate(d.getDate() + parseInt(off, 10)); k = k.toLowerCase(); return fmt(d, f || (k === 'date' ? 'DD/MM/YYYY' : k === 'time' ? 'hh:mm A' : 'DD/MM/YYYY hh:mm A')); })
    .replace(/\{(weekday|day|month|year|tomorrow|yesterday|nextweek|number|deal|email|name)\}/gi, (_m, k: string) => {
      k = k.toLowerCase(); const d = new Date(now);
      if (k === 'weekday' || k === 'day') return DAYN[d.getDay()]; if (k === 'month') return MON[d.getMonth()]; if (k === 'year') return String(d.getFullYear());
      if (k === 'tomorrow') { d.setDate(d.getDate() + 1); return fmt(d, 'DD/MM/YYYY'); } if (k === 'yesterday') { d.setDate(d.getDate() - 1); return fmt(d, 'DD/MM/YYYY'); } if (k === 'nextweek') { d.setDate(d.getDate() + 7); return fmt(d, 'DD/MM/YYYY'); }
      return C[k] || '';
    })
    .replace(/\{(upper|lower|cap):([^}]*)\}/gi, (_m, k: string, t: string) => { k = k.toLowerCase(); return k === 'upper' ? t.toUpperCase() : k === 'lower' ? t.toLowerCase() : t.replace(/\b\w/g, c => c.toUpperCase()); })
    .replace(/\{ask:([^}=]*)(?:=([^}]*))?\}/gi, (_m, l: string, d: string) => { asks.push({ t: 'ask', label: l.trim() || 'Value', def: d || '' }); return '\u0001' + (asks.length - 1) + '\u0002'; })
    .replace(/\{choose:([^}]*)\}/gi, (_m, o: string) => { asks.push({ t: 'choose', label: 'Choose', opts: o.split('|').map(x => x.trim()) }); return '\u0001' + (asks.length - 1) + '\u0002'; });
  return { text: out, asks, clip: /\{clipboard\}/i.test(out) };
}
export function finish(pr: ReturnType<typeof parse>, answers: (string | null)[], clip: string) {
  let t = pr.text.replace(/\u0001(\d+)\u0002/g, (_m, i) => (answers[+i] == null ? '' : String(answers[+i]))).replace(/\{clipboard\}/gi, clip || '');
  const ci = t.indexOf('{cursor}'); t = t.replace(/\{cursor\}/g, ''); return { text: t, cur: ci < 0 ? t.length : ci };
}
export function preview(t: string) { const p = parse(t); return finish(p, p.asks.map(a => (a.t === 'choose' ? a.opts![0] : a.def || '‹' + a.label + '›')), '‹clipboard›').text; }
function askBox(asks: Ask[], cb: (v: string[] | null) => void) {
  openModal(() => <AskSheet asks={asks} cb={cb} />);
}
function AskSheet({ asks, cb }: { asks: Ask[]; cb: (v: string[] | null) => void }) {
  const [v, setV] = useState<string[]>(asks.map(a => (a.t === 'choose' ? a.opts![0] : a.def || '')));
  const done = (x: string[] | null) => { closeModal(); cb(x); };
  return <Sheet title="Fill in" onClose={() => done(null)} foot={<><Btn onClick={() => done(null)}>Cancel</Btn><button class="b-add" onClick={() => done(v)}>Insert</button></>}>
    <form onSubmit={e => { e.preventDefault(); done(v); }} class="form">{asks.map((a, i) => <Field label={a.label} full>{a.t === 'choose' ? <select class="in" value={v[i]} onChange={e => setV(v.map((x, j) => (j === i ? (e.target as HTMLSelectElement).value : x)))}>{a.opts!.map(o => <option>{o}</option>)}</select> : <input class="in" autoFocus={i === 0} data-sn-off="1" data-st-off="1" value={v[i]} onInput={e => setV(v.map((x, j) => (j === i ? (e.target as HTMLInputElement).value : x)))} />}</Field>)}<button type="submit" style={{ display: 'none' }} /></form>
  </Sheet>;
}

// ---------- which boxes expand ----------
const NO = /passw|otp|verification|card|iban|e-?mail|phone|^tel$|number|sender|search|date|time|price|amount|mvr|usd|qty|count|regs|renew/i;
function target(el: Element | null): HTMLInputElement | HTMLTextAreaElement | null {
  if (!el || !(el as HTMLElement).tagName) return null; const x = el as HTMLInputElement;
  if (x.tagName === 'TEXTAREA') return x.dataset.snOff ? null : x;
  if (x.tagName !== 'INPUT') return null; const t = (x.getAttribute('type') || 'text').toLowerCase(); if (t !== 'text') return null; if (x.dataset.snOff) return null;
  const id = [x.dataset.f || '', x.name || '', x.id || '', x.getAttribute('autocomplete') || ''].join(' ');
  if (/(^|\s)(number|fNumber|qNumber)(\s|$)/.test(id) || /link/i.test(x.placeholder || '')) return null;
  if (/(note|comment|reason|desc|message|inquiry|detail|subject|title|text|body|deal)/i.test(id + ' ' + (x.placeholder || '')) && !/passw|otp|card|iban/i.test(id)) return x;
  return NO.test(id + ' ' + (x.placeholder || '')) ? null : x;
}

// ---------- expansion ----------
const DELIM = /[\s.,;:!?)\]]/;
let last: { el: HTMLInputElement | HTMLTextAreaElement; start: number; len: number; trig: string; at: number } | null = null, busy = false, skipOnce: string | null = null;
function replaceRange(el: HTMLInputElement | HTMLTextAreaElement, from: number, to: number, text: string, caret: number | null) {
  busy = true;
  try { el.focus(); el.value = el.value.slice(0, from) + text + el.value.slice(to); el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertReplacementText' })); const c = from + (caret == null ? text.length : caret); el.setSelectionRange(c, c); } catch { /* */ }
  busy = false;
}
function insertSnippet(el: HTMLInputElement | HTMLTextAreaElement, sn: Snip, from: number, to: number, delim: string) {
  const pr = parse(sn.text, el);
  const after = (answers: (string | null)[], clip: string) => {
    const r = finish(pr, answers, clip), trail = delim && !/\n$/.test(r.text) && r.cur === r.text.length ? delim : '';
    let text = r.text; if (el.tagName === 'INPUT') text = text.replace(/\n/g, ' ');
    const full = text + trail; replaceRange(el, from, to, full, trail ? full.length : r.cur);
    last = { el, start: from, len: full.length, trig: sn.trigger + (delim || ''), at: Date.now() };
  };
  const clip = (cb: (c: string) => void) => { if (!pr.clip) return cb(''); try { navigator.clipboard.readText().then(t => cb(t || ''), () => cb('')); } catch { cb(''); } };
  if (pr.asks.length) { const snap = el.value; askBox(pr.asks, a => { if (a == null) return; if (el.value !== snap) return; clip(c => after(a, c)); }); }
  else clip(c => after([], c));
}
export function installSnippets() {
  const real = (e: Event) => (e.composedPath ? (e.composedPath()[0] as Element) : (e.target as Element));
  document.addEventListener('input', e => {
    if (busy || !snipCfg().on) return; const el = target(real(e)); if (!el) return;
    const ie = e as InputEvent; if (ie.inputType && /^delete/.test(ie.inputType)) return; if (ie.inputType === 'insertReplacementText') return;
    const pos = el.selectionStart; if (pos == null || pos !== el.selectionEnd) return;
    const txt = el.value, ch = txt.charAt(pos - 1); let delim = '', tokenEnd: number;
    if (ch && DELIM.test(ch)) { delim = ch; tokenEnd = pos - 1; } else tokenEnd = pos;
    let s = tokenEnd; while (s > 0 && !/\s/.test(txt.charAt(s - 1))) s--; const token = txt.slice(s, tokenEnd);
    const m = mp(); if (!token || token.length > m.maxLen + 1) return;
    const sn = m.map[token] || (snipCfg().ci !== false ? m.lmap[token.toLowerCase()] : undefined); if (!sn) return;
    if (skipOnce && skipOnce === (el.id || el.dataset.f || '') + '|' + token) { skipOnce = null; return; }
    if (delim) { insertSnippet(el, sn, s, pos, delim); return; }
    if (sn.imm) { const longer = Object.keys(m.map).some(k => k !== token && k.indexOf(token) === 0); if (!longer) insertSnippet(el, sn, s, pos, ''); }
  }, true);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Backspace' || !last || Date.now() - last.at > 10000) return; const el = real(e) as HTMLInputElement;
    if (el !== last.el) return; if (el.selectionStart !== last.start + last.len || el.selectionEnd !== el.selectionStart) return;
    e.preventDefault(); const trig = last.trig.replace(/[\s.,;:!?)\]]$/, ''); skipOnce = (el.id || el.dataset.f || '') + '|' + trig; replaceRange(el, last.start, last.start + last.len, trig, null); last = null;
  }, true);
  let g = 0; document.addEventListener('keydown', e => { const t = real(e) as HTMLElement; if (/INPUT|TEXTAREA|SELECT/.test(t.tagName || '') || t.isContentEditable) return; const k = (e.key || '').toLowerCase(); if (Date.now() - g < 1500 && k === 's') { g = 0; e.preventDefault(); openSnippets(); } else if (k === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) g = Date.now(); else g = 0; });
}
/** Old hub_snippets_v1 → records; with no old data, the starter pack. Ids kept, so two devices match. */
export function importSnippetsLegacy(raw: string | null, putFn: (c: string, id: string, d: any) => void) {
  let o: any = null; try { o = JSON.parse(raw || 'null'); } catch { o = null; }
  const list: Snip[] = o && Array.isArray(o.items) ? o.items : starter();
  list.forEach(s => { if (!s || !s.trigger) return; putFn('snippets', String(s.id || 'u' + s.trigger), { trigger: s.trigger, text: String(s.text || ''), folder: s.folder || 'General', on: s.on !== false, imm: !!s.imm, ...(s.std ? { std: 1 } : {}) }); });
  if (o) putFn('cfg', 'snippets', { on: o.on !== false, ...(o.ci === false ? { ci: false } : {}) });
  return list.length;
}

// ---------- manager ----------
const CMDS: [string, string][] = [['{date}', 'Today'], ['{date+1}', 'Tomorrow'], ['{date-1}', 'Yesterday'], ['{date+7}', 'Next week'], ['{time}', 'Time'], ['{weekday}', 'Weekday'], ['{month}', 'Month'], ['{ask:Label}', 'Ask me'], ['{choose:A|B|C}', 'Choose'], ['{clipboard}', 'Clipboard'], ['{deal}', 'Deal'], ['{cursor}', 'Cursor']];
export function openSnippets() { openModal(() => <SnipManager />); }
function SnipManager() {
  void rev.value; const cfg = snipCfg(), list0 = snippets();
  const [q, setQ] = useState(''), [fo, setFo] = useState(''), [ed, setEd] = useState<Partial<Snip> | null>(null);
  const folders = Array.from(new Set(list0.map(s => s.folder || 'General'))).sort();
  const qq = q.trim().toLowerCase(), list = list0.filter(s => (!fo || (s.folder || 'General') === fo) && (!qq || (s.trigger + ' ' + s.text + ' ' + s.folder).toLowerCase().indexOf(qq) >= 0)).sort((a, b) => a.folder.localeCompare(b.folder) || a.trigger.localeCompare(b.trigger));
  if (ed) return <SnipForm s={ed} folders={folders} onClose={() => setEd(null)} />;
  return <Sheet title="Snippets (text shortcuts)" onClose={closeModal} wide>
    <div class="ctl" style={{ flexWrap: 'wrap' }}>
      <input class="in grow" placeholder="Search shortcuts" value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} data-sn-off="1" data-st-off="1" />
      <select class="in" style={{ width: 'auto' }} value={fo} onChange={e => setFo((e.target as HTMLSelectElement).value)}><option value="">All folders</option>{folders.map(f => <option>{f}</option>)}</select>
      <label class="ctl" style={{ margin: 0 }}><Switch on={cfg.on} onChange={v => put('cfg', 'snippets', { on: v })} label="All shortcuts" /><span>{cfg.on ? 'Enabled' : 'All off'}</span></label>
    </div>
    <div class="ctl" style={{ flexWrap: 'wrap' }}>
      <button class="b-add" onClick={() => setEd({ trigger: '.', text: '', folder: fo || 'My shortcuts', imm: false, on: true })}>+ New shortcut</button>
      <Btn onClick={() => { const f = document.createElement('input'); f.type = 'file'; f.accept = '.json,application/json'; f.onchange = async () => { const file = f.files && f.files[0]; if (!file) return; try { const o = JSON.parse(await file.text()); const arr: Snip[] = Array.isArray(o) ? o : o.snippets || o.items || []; const have = new Set(snippets().map(s => s.trigger)); let n = 0; arr.forEach(s => { if (!s || !s.trigger || have.has(s.trigger)) return; put('snippets', uid('u'), { trigger: s.trigger, text: String(s.text || ''), folder: s.folder || 'Imported', on: s.on !== false, imm: !!s.imm }); n++; }); toast('Imported ' + n + ' shortcut' + (n === 1 ? '' : 's')); } catch { toast('That is not a snippets file'); } }; f.click(); }}>Import</Btn>
      <Btn onClick={() => download('snippets.json', JSON.stringify({ snippets: snippets() }, null, 2), 'application/json')}>Export</Btn>
      <Btn title="Bring back any starter shortcuts you deleted" onClick={() => { const have = new Set(snippets().map(s => s.trigger)); let n = 0; starter().forEach(s => { if (have.has(s.trigger)) return; put('snippets', 'st-' + s.trigger.slice(1), { trigger: s.trigger, text: s.text, folder: s.folder, on: true, imm: false, std: 1 }); n++; }); toast(n ? 'Restored ' + n + ' starter shortcut' + (n === 1 ? '' : 's') : 'Nothing to restore'); }}>Restore starter pack</Btn>
      <span class="faint" style={{ fontSize: '.76rem' }}>{list0.length} shortcuts · works in every text box in the app · press g then s to open</span>
    </div>
    {list.length ? list.map(s => <div class={'item sn-row' + (s.on === false ? ' off' : '')}>
      <code class="mono" style={{ minWidth: '56px', color: 'var(--accent2)' }}>{s.trigger}</code>
      <div class="main"><div class="t" style={{ fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.text}>{preview(s.text).replace(/\n/g, ' ↵ ')}</div><div class="s">{s.folder || 'General'}{s.imm ? ' · instant' : ''}</div></div>
      <div class="acts"><Switch on={s.on !== false} onChange={v => put('snippets', s.id, { on: v })} label={'Shortcut ' + s.trigger} /><Btn onClick={() => setEd(s)}>Edit</Btn><Btn onClick={() => setEd({ ...s, id: undefined, trigger: s.trigger + '2' })}>Duplicate</Btn><DangerBtn onConfirm={() => del('snippets', s.id)}>Delete</DangerBtn></div>
    </div>) : <Empty>No shortcuts match.</Empty>}
  </Sheet>;
}
function SnipForm({ s, folders, onClose }: { s: Partial<Snip>; folders: string[]; onClose: () => void }) {
  const [f, setF] = useState({ trigger: s.trigger || '.', text: s.text || '', folder: s.folder || 'General', imm: !!s.imm }); const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ta.current?.focus(); }, []);
  const save = () => {
    const tr = f.trigger.trim(); if (!tr || /\s/.test(tr)) return toast('A shortcut is one word without spaces, e.g. .np'); if (!f.text.trim()) return toast('Type the text it becomes');
    if (snippets().some(x => x.trigger === tr && x.id !== s.id)) return toast('Another shortcut already uses ' + tr);
    put('snippets', s.id || uid('u'), { trigger: tr, text: f.text, folder: f.folder.trim() || 'General', imm: f.imm, on: s.on !== false }); onClose(); toast('Shortcut saved');
  };
  const ins = (c: string) => { const el = ta.current; if (!el) return; const a = el.selectionStart, b = el.selectionEnd; const t = f.text.slice(0, a) + c + f.text.slice(b); setF({ ...f, text: t }); setTimeout(() => { el.focus(); el.setSelectionRange(a + c.length, a + c.length); }, 0); };
  return <Sheet title={s.id ? 'Edit shortcut' : 'New shortcut'} onClose={onClose} wide foot={<><Btn onClick={onClose}>Cancel</Btn><button class="b-add" onClick={save}>{s.id ? 'Save' : 'Add shortcut'}</button></>}>
    <div class="form">
      <Field label="Shortcut (what you type)"><input class="in" value={f.trigger} placeholder=".np" data-sn-off="1" data-st-off="1" onInput={e => setF({ ...f, trigger: (e.target as HTMLInputElement).value })} /></Field>
      <Field label="Folder"><input class="in" list="snFol" value={f.folder} data-sn-off="1" data-st-off="1" onInput={e => setF({ ...f, folder: (e.target as HTMLInputElement).value })} /><datalist id="snFol">{folders.map(x => <option value={x} />)}</datalist></Field>
      <Field label="Text it becomes" full><textarea ref={ta} class="in" rows={5} value={f.text} placeholder="Did not pick up. Will try again {date+1}." data-sn-off="1" data-st-off="1" onInput={e => setF({ ...f, text: (e.target as HTMLTextAreaElement).value })} /></Field>
      <div class="full row-scroll" style={{ flexWrap: 'wrap' }}>{CMDS.map(c => <button type="button" class="chip" title={'Insert ' + c[0]} onClick={() => ins(c[0])}>{c[1]}</button>)}</div>
      <label class="ctl full" style={{ margin: 0 }}><Switch on={f.imm} onChange={v => setF({ ...f, imm: v })} label="Expand instantly" /><span>Expand instantly (no space needed)</span></label>
      <div class="full"><div class="lbl">Preview</div><pre class="rep" style={{ maxHeight: '140px' }}>{preview(f.text)}</pre></div>
      <p class="full faint" style={{ fontSize: '.74rem', margin: 0 }}>Commands: {'{date} {date+3} {date:DD MMMM YYYY} {time} {weekday} {month} {year} {tomorrow} {ask:Label} {ask:Label=default} {choose:A|B} {clipboard} {deal} {cursor} {upper:text}'}. Tip: in any text box, Backspace right after an expansion undoes it.</p>
    </div>
  </Sheet>;
}
