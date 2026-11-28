// Won Deals – its own page with the old look (the old page's stylesheet + structure, isolated), same rules as before:
// one deal per customer (later entries go into the note history), deals are Day End "Closed Won All" entries.
import { signal } from '@preact/signals';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import OLD_CSS from './won-old.css?inline';
import WICONS from './won-icons.json';
import DICONS from './dayend-icons.json';
import { rev, put, restore } from '../data/store';
import { WonDeal, wonDeals, renewalOf, markRenewed, setActivation, setDue, bestHours, addM } from '../domain/crm';
import { CYCLES, PLANS, WON, Entry, planLabel, planStats, priceText, regsOf, removeEntry, totText, currentHour, getDay, isPaid, hasRegs, makeTask, addEntry, updateEntry, editFields, mkOf, tkOf } from '../domain/dayend';
import { importDealsFile, importDealsReportText } from '../domain/dayimport';
import { MONTHS, copyText, download, fmtDay, fmtNum, isKey, shiftDayKey, todayKey, parsePrice, lsJSON, lsSet, r2, keyOf, parseKey } from '../lib/util';
import { openUrl, cleanLink, stripText } from '../lib/privacy';
import { buildXlsx, XLSX_MIME } from '../lib/xlsx';
import { toast, openModal, closeModal, Sheet, Btn } from '../ui/kit';
import { Shadow, svgHtml } from '../ui/shadow';
import { theme, PALETTES } from '../ui/state';
import { sync } from '../data/sync';
import { openTaskForm } from './tasks';
import { priced, regsStep } from './entryform';

const WI = WICONS as Record<string, string>, DI = DICONS as Record<string, string>;
const day = signal(todayKey());
const linkInReport = () => !!lsJSON<{ linkInReport?: boolean }>('hub_priv_v1', {}).linkInReport;

// ---------- report texts (same format as before) ----------
export function planLines(list: Partial<WonDeal>[]) {
  const S = planStats(list as any), L = ['Plans'];
  PLANS.forEach(p => { const g = S.groups[p]; let line = '  ' + p + ': ' + g.n; if (p !== 'Free' && g.n) line += ' (Monthly ' + g.cyc.Monthly.n + ' · Biannual ' + g.cyc.Biannual.n + ' · Annual ' + g.cyc.Annual.n + (g.nocyc ? ' · No billing set ' + g.nocyc : '') + ')'; L.push(line); });
  if (S.other.n) L.push('  Other: ' + S.other.n); if (S.none.n) L.push('  No plan: ' + S.none.n);
  if (S.priced) L.push('Total price: ' + totText(S.price, S.mvr, S.priced, S.mvrN)); return L;
}
const sorted = () => wonDeals().slice().sort((a, b) => (a.ts - b.ts) || (a.id < b.id ? -1 : 1));
export function wonReport(k: string) {
  const list = sorted().filter(d => d.day === k), L = ['Deals Report — ' + fmtDay(k, true), ''];
  if (!list.length) { L.push('No deals logged yet'); L.push(''); }
  else { L.push('Deals: ' + list.length); list.forEach((d, i) => { L.push((i + 1) + '. ' + d.deal); if (d.number && linkInReport()) L.push('  • Link: ' + d.number); if (d.plan) L.push('  • Plan: ' + planLabel(d)); if (d.notes) L.push('  • Notes: ' + d.notes); if (d.price) L.push('  • Price: ' + priceText(d)); if (regsOf(d)) L.push('  • Registers: +' + regsOf(d)); L.push(''); }); }
  L.push('─────────────────────', 'Totals', 'Deals: ' + list.length, 'All days: ' + wonDeals().length);
  if (list.length) { L.push(''); planLines(list).forEach(l => L.push(l)); }
  const ren = list.map(d => ({ d, r: renewalOf(d) })).filter(x => x.r.paid).map(x => x.d.deal + ': ' + (x.r.act ? 'activated ' + x.r.act + ', ' : '') + 'due ' + x.r.due);
  return L.join('\n') + (ren.length ? '\n\nRenewals\n' + ren.join('\n') : '');
}
export function wonPeriodReport(mode: 'month' | 'year' | 'all', y: number, mo: number) {
  const pre = mode === 'all' ? '' : mode === 'month' ? y + '-' + String(mo).padStart(2, '0') : String(y);
  const title = mode === 'all' ? 'All days' : mode === 'month' ? MONTHS[mo - 1] + ' ' + y : String(y);
  const list = sorted().filter(d => d.day.indexOf(pre) === 0).sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0)), L = ['Deals Report — ' + title, ''];
  if (!list.length) { L.push('No deals logged for this period'); L.push(''); }
  else {
    L.push('Deals: ' + list.length); const groups: { k: string; items: WonDeal[] }[] = [], idx: Record<string, number> = {};
    list.forEach(d => { const k = mode === 'month' ? d.day : d.day.slice(0, 7); if (!(k in idx)) { idx[k] = groups.length; groups.push({ k, items: [] }); } groups[idx[k]].items.push(d); });
    groups.forEach(g => { L.push(''); L.push('— ' + (mode === 'month' ? fmtDay(g.k, true) : MONTHS[+g.k.slice(5) - 1] + ' ' + g.k.slice(0, 4)) + ' (' + g.items.length + ')');
      g.items.forEach((d, i) => { L.push((i + 1) + '. ' + d.deal); if (mode !== 'month') L.push('  • Day: ' + fmtDay(d.day)); if (d.number && linkInReport()) L.push('  • Link: ' + d.number); if (d.plan) L.push('  • Plan: ' + planLabel(d)); if (d.notes) L.push('  • Notes: ' + d.notes); if (d.price) L.push('  • Price: ' + priceText(d)); if (regsOf(d)) L.push('  • Registers: +' + regsOf(d)); L.push(''); }); });
  }
  L.push('─────────────────────', 'Totals', 'Deals: ' + list.length);
  if (mode !== 'month' && list.length) { const mc: Record<number, number> = {}; list.forEach(d => { const m = +d.day.slice(5, 7); mc[m] = (mc[m] || 0) + 1; }); L.push('By month: ' + Object.keys(mc).map(Number).sort((a, b) => a - b).map(m => MONTHS[m - 1].slice(0, 3) + ' ' + mc[m]).join(' · ')); }
  if (list.length) { L.push(''); planLines(list).forEach(l => L.push(l)); }
  return { text: L.join('\n'), list, title };
}
const priceCell = (v: unknown) => (/^-?\d+(\.\d+)?$/.test(String(v || '').trim()) ? Number(v) : (v || ''));
function dealRows(list: WonDeal[]) { const rows: unknown[][] = [['Day', '#', 'HubSpot link', 'Deal Name', 'Notes', 'Plan', 'Billing', 'Price', 'Price (MVR)', 'Extra Registers']], seq: Record<string, number> = {}; list.forEach(d => { seq[d.day] = (seq[d.day] || 0) + 1; rows.push([d.day, seq[d.day], d.number || '', d.deal || '', d.notes || '', d.plan || '', d.billing || '', priceCell(d.price), priceCell(d.mvr), regsOf(d) || '']); }); return rows; }
const W_WIDTHS = [12, 5, 18, 24, 50, 18, 12, 10, 12, 14];
const money = (u: number, v: number) => '$' + fmtNum(u) + (v ? ' (' + fmtNum(v) + ' MVR)' : '');
function htmlReport(title: string, text: string) {
  const dark = theme.value.mode !== 'light', bg = dark ? '#000000' : '#eef1f8', fg = dark ? '#f6eceb' : '#1a2135', card = dark ? '#0a0304' : '#ffffff', muted = dark ? '#b9a2a4' : '#4a5470', accent = dark ? '#ef3340' : '#3b6fe0';
  const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Deals Report — ' + e(title) + '</title><style>body{margin:0;font-family:system-ui,sans-serif;background:' + bg + ';color:' + fg + ';padding:32px 18px} .sheet{max-width:760px;margin:0 auto;background:' + card + ';border-radius:16px;padding:28px} h1{color:' + accent + ';margin:0 0 6px} .sub{color:' + muted + ';font-size:.82rem;margin-bottom:22px} pre{font-family:ui-monospace,Menlo,monospace;white-space:pre-wrap;font-size:.82rem;line-height:1.7}</style></head><body><div class="sheet"><h1>Deals Report</h1><div class="sub">' + e(title) + '</div><pre>' + e(text) + '</pre></div></body></html>';
}

// ---------- page ----------
type Ord = { m: 'time' | 'new' | 'name' | 'price'; b: '' | 'now' | 'next' };
const ordS = signal<Ord>(lsJSON<Ord>('hub_won_ord', { m: 'time', b: '' }));
const filtS = signal<{ wa: string; em: string }>({ wa: '', em: '' });
const scopeS = signal<'all' | 'day' | 'month' | 'year'>('all');
const pmS = signal({ m: 'month' as 'month' | 'year' | 'all', y: new Date().getFullYear(), mo: new Date().getMonth() + 1 });
export function WonDeals() {
  void rev.value; const k = day.value, all = wonDeals(), th = theme.value;
  const [edit, setEdit] = useState<WonDeal | null>(null), [merging, setMerging] = useState<string | null>(null);
  const keys = Array.from(new Set(all.map(d => d.day))); if (keys.indexOf(k) < 0) keys.push(k); keys.sort().reverse();
  let list = sorted().filter(d => d.day === k);
  const o = ordS.value, f = filtS.value, hrs = bestHours(), h = new Date().getHours();
  if (o.b) list = list.filter(d => { const bh = bestHours(d.deal).slice(0, 3); return o.b === 'now' ? bh.indexOf(h) >= 0 : bh.indexOf(h) >= 0 || bh.indexOf(h + 1) >= 0; });
  if (f.wa || f.em) list = list.filter(d => (!f.wa || mkOf(d.entry, 'wa') === f.wa) && (!f.em || mkOf(d.entry, 'em') === f.em));
  if (o.m === 'new') list = list.slice().reverse(); else if (o.m === 'name') list = list.slice().sort((a, b) => a.deal.localeCompare(b.deal)); else if (o.m === 'price') list = list.slice().sort((a, b) => (parsePrice(b.price) || 0) - (parsePrice(a.price) || 0));
  void hrs;
  const syncTxt = sync.status.value === 'synced' ? 'Saved · synced' : sync.status.value === 'offline' ? 'Saved on this device · offline' : sync.status.value === 'syncing' ? 'Saving…' : 'Saved on this device';
  return <Shadow css={OLD_CSS + EXTRA}>
    <div class="wrap">
      <header>
        <div class="brand"><div class="brand-logo">{svgHtml(WI.brand)}</div><div><h1>Won Deals</h1><div class="subtitle">HubSpot link · Deal · Notes · Plan</div></div></div>
        <div class="header-right"><div class={'sync ' + (sync.status.value === 'error' ? 'err' : 'ok')} id="sync">{syncTxt}</div>
          <div class="date-pill" id="dateLabel">{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <button type="button" class="theme-toggle" title="Colour palette" aria-label="Colour palette" style={{ marginRight: '8px' }} onClick={() => { const i = PALETTES.findIndex(x => x.id === th.pal); theme.value = { ...th, pal: PALETTES[(i + 1) % PALETTES.length].id }; }}>{svgHtml(DI.pal)}</button>
          <button class="theme-toggle" id="themeToggle" title="Toggle theme" aria-label="Toggle theme" onClick={() => { theme.value = { ...th, mode: th.mode === 'dark' ? 'light' : 'dark' }; }}>{svgHtml(th.mode === 'dark' ? DI.theme : DI.sun)}</button>
        </div>
      </header>
      <div class="day-card"><div class="day-row">
        <button class="btn" aria-label="Previous day" onClick={() => { day.value = shiftDayKey(k, -1); }}>←</button>
        <input type="date" id="dayPick" aria-label="Pick or add a day" value={k} onChange={e => { const v = (e.target as HTMLInputElement).value; if (isKey(v)) day.value = v; }} />
        <button class="btn" aria-label="Next day" onClick={() => { day.value = shiftDayKey(k, 1); }}>→</button>
        <button class="btn" onClick={() => { day.value = todayKey(); }}>Today</button>
        <div class="day-label" id="dayLabel">{fmtDay(k, true)}{k === todayKey() ? ' · Today' : ''}</div>
      </div><div class="day-chips" id="dayChips">{keys.map(x => <button class={'day-chip' + (x === k ? ' active' : '')} onClick={() => { day.value = x; }}>{fmtDay(x)} · {all.filter(d => d.day === x).length}</button>)}</div></div>
      <div class="deals-card">
        <div class="card-head"><div class="head-left"><div class="section-icon">{svgHtml(WI.deals)}</div><div><div class="section-title">Deals</div><div class="section-sub">Add every deal here</div></div></div><div class="section-count" id="count">{sorted().filter(d => d.day === k).length}</div></div>
        <div class="card-body">
          <WonForm k={k} edit={edit} onDone={() => setEdit(null)} />
          <div class="q39-row q39-fb" id="q39Fb"><span class="q39-lb">Filter</span>
            {(['wa', 'em'] as const).map(c => <button type="button" class="q39-ft" data-f={c} data-s={f[c]} aria-pressed={!!f[c]} title={(c === 'wa' ? 'WhatsApp' : 'Email') + ': ' + (f[c] === 'g' ? 'green' : f[c] === 'r' ? 'red' : 'off')} aria-label={(c === 'wa' ? 'WhatsApp' : 'Email') + ' filter'} onClick={() => { filtS.value = { ...f, [c]: f[c] === '' ? 'g' : f[c] === 'g' ? 'r' : '' }; }}>{svgHtml(c === 'wa' ? DI.ftwa : DI.ftem)}</button>)}
          </div>
          <div id="r36Ord"><label>Order by <select aria-label="Order deals by" value={o.m} onChange={e => setOrd({ ...o, m: (e.target as HTMLSelectElement).value as Ord['m'] })}><option value="time">Time added</option><option value="new">Newest first</option><option value="name">Name A–Z</option><option value="price">Price (high to low)</option></select></label>
            <label>Show <select aria-label="Filter by best time to call" value={o.b} onChange={e => setOrd({ ...o, b: (e.target as HTMLSelectElement).value as Ord['b'] })}><option value="">All</option><option value="now">Answers now</option><option value="next">Now or next hour</option></select></label></div>
          <div class="entries" id="entries">
            {!list.length && <div class="empty">No deals for this day yet. Add one above.</div>}
            {list.map((d, i) => <WonEntry d={d} i={i} editing={edit?.id === d.id} merging={merging === d.id} onEdit={() => setEdit(d)} onMerge={() => setMerging(merging === d.id ? null : d.id)} />)}
          </div>
        </div>
      </div>
      <Revenue />
      <PlanCard k={k} />
      <FinalCard k={k} />
      <PeriodCard k={k} />
    </div>
  </Shadow>;
}
const setOrd = (o: Ord) => { ordS.value = o; lsSet('hub_won_ord', JSON.stringify(o)); };
const EXTRA = `
.entry.hl{outline:2px solid var(--accent);outline-offset:2px}
.empty{text-align:center;opacity:.6;padding:18px;font-size:.86rem}
.merge-panel{margin-top:10px}
`;

function WonForm({ k, edit, onDone }: { k: string; edit: WonDeal | null; onDone: () => void }) {
  const blank = (): Record<string, string> => (edit ? { ...editFields(edit.entry), stage: WON } : { stage: WON });
  const [v, setV] = useState<Record<string, string>>(blank); const first = useRef<HTMLInputElement>(null);
  useEffect(() => { setV(blank()); if (edit) setTimeout(() => first.current?.focus(), 20); }, [edit?.id]);
  const set = (f: string, val: string) => setV(o => (/^(plan|billing|pricing|price|mvr)$/.test(f) ? priced({ ...o, [f]: val }, f) : { ...o, [f]: val }));
  const std = isPaid(v.plan || '') && v.pricing !== 'custom';
  const submit = () => {
    const vals: Record<string, string> = {}; Object.keys(v).forEach(f => { if (f.charAt(0) !== '_') vals[f] = String(v[f] ?? '').trim(); });
    let cut = 0; const u = vals.number ? cleanLink(vals.number) : ''; if (u !== vals.number) { cut++; vals.number = u; }
    ['deal', 'notes'].forEach(f => { const r = stripText(vals[f]); if (r.n) { cut += r.n; vals[f] = r.s; } });
    if (cut) toast('Phone numbers & emails aren’t stored – they were left out');
    if (!vals.deal && !vals.number) return toast('Add a deal name or the HubSpot link');
    if (vals.price && isNaN(parsePrice(vals.price))) return toast('Price should be a number');
    if (vals.mvr && isNaN(parsePrice(vals.mvr))) return toast('MVR price should be a number');
    const data = { ...makeTask({ ...vals, stage: WON }), text: undefined } as Partial<Entry>;
    if (edit) { updateEntry(edit.id, data); toast('Deal updated'); } else { addEntry(k, currentHour(k), 'tasks', data); toast('Deal added'); }
    setV({ stage: WON }); onDone();
  };
  const key = (e: KeyboardEvent) => { if (e.key === 'Enter' && !(e.target as HTMLElement).matches('textarea')) { e.preventDefault(); submit(); } };
  return <div class="form" id="form">
    <div class="field"><label for="fNumber">HubSpot deal link</label><div class="inline-add"><input id="fNumber" ref={first} type="text" inputMode="url" placeholder="Paste the HubSpot deal link" autoComplete="off" value={v.number || ''} onInput={e => set('number', (e.target as HTMLInputElement).value)} onKeyDown={key} onBlur={e => { const t = (e.target as HTMLInputElement).value; if (t && cleanLink(t) !== t) { set('number', cleanLink(t)); toast(cleanLink(t) ? 'Link cleaned' : 'Only a HubSpot link is kept here'); } }} /><button type="button" class="plus-btn open-link" title="Open the HubSpot deal link" aria-label="Open the HubSpot deal link" onClick={() => { const x = openUrl(v.number); if (x) window.open(x, '_blank', 'noopener'); else toast('Paste the HubSpot deal link first'); }}>↗</button></div></div>
    <div class="field"><label for="fDeal">Deal name</label><input id="fDeal" type="text" placeholder="Deal name" autoComplete="off" value={v.deal || ''} onInput={e => set('deal', (e.target as HTMLInputElement).value)} onKeyDown={key} /></div>
    <div class="field"><label for="fPlan">Plan</label><select id="fPlan" value={v.plan || ''} onChange={e => set('plan', (e.target as HTMLSelectElement).value)}><option value="">Select plan</option>{PLANS.map(p => <option value={p}>{p}</option>)}{v.plan && PLANS.indexOf(v.plan) < 0 && <option value={v.plan}>{v.plan}</option>}</select></div>
    <div class={'field' + (isPaid(v.plan || '') ? '' : ' hidden')} id="billingField"><label for="fBilling">Billing</label><select id="fBilling" value={v.billing || ''} onChange={e => set('billing', (e.target as HTMLSelectElement).value)}><option value="">Select billing</option>{CYCLES.map(c => <option value={c}>{c}</option>)}</select></div>
    <div class="field wide"><label for="fNotes">Notes</label><textarea id="fNotes" placeholder="Notes" value={v.notes || ''} onInput={e => set('notes', (e.target as HTMLTextAreaElement).value)} /></div>
    <div class={'field' + (v.plan ? '' : ' hidden')} id="pricingField"><label for="fPricing">Pricing</label><select id="fPricing" value={v.pricing || ''} onChange={e => set('pricing', (e.target as HTMLSelectElement).value)}><option value="">Standard price</option><option value="custom">Custom price</option></select></div>
    <div class="field"><label for="fPrice">Price (USD)</label><input id="fPrice" type="text" inputMode="decimal" placeholder="0.00" readOnly={std} class={std ? 'ro' : ''} value={v.price || ''} onInput={e => set('price', (e.target as HTMLInputElement).value)} onKeyDown={key} /></div>
    <div class="field"><label for="fMvr">Price (MVR)</label><input id="fMvr" type="text" inputMode="decimal" placeholder="0.00" readOnly={std} class={std ? 'ro' : ''} value={v.mvr || ''} onInput={e => set('mvr', (e.target as HTMLInputElement).value)} onKeyDown={key} /></div>
    <div class={'field' + (hasRegs(v.plan || '') ? '' : ' hidden')} id="regsField"><label>Extra registers</label><div class="regs"><button type="button" aria-label="Fewer registers" onClick={() => setV(o => regsStep(o, -1))}>▼</button><b id="regsVal">{v.regs || '0'}</b><button type="button" aria-label="More registers" onClick={() => setV(o => regsStep(o, 1))}>▲</button><small>Professional only · $20 / 300 MVR per month each (×6 biannual, ×12 annual)</small></div></div>
    <div class="form-actions">{edit && <button class="btn" onClick={() => { setV({ stage: WON }); onDone(); }}>Cancel</button>}<button class="btn-add" id="addBtn" onClick={submit}>{edit ? 'Save' : 'Add'}</button></div>
  </div>;
}

function Armed({ label, cls, onConfirm }: { label: string; cls?: string; onConfirm: () => void }) {
  const [a, setA] = useState(false); useEffect(() => { if (!a) return; const t = setTimeout(() => setA(false), 3500); return () => clearTimeout(t); }, [a]);
  return <button class={'icon-btn' + (cls ? ' ' + cls : '')} onClick={() => { if (a) { setA(false); onConfirm(); } else setA(true); }}>{a ? 'Sure?' : label}</button>;
}
function WonEntry({ d, i, editing, merging, onEdit, onMerge }: { d: WonDeal; i: number; editing: boolean; merging: boolean; onEdit: () => void; onMerge: () => void }) {
  const lk = openUrl(d.number), r = renewalOf(d), td = todayKey();
  const chip = r.due ? (() => { const n = Math.round((+parseKey(r.due) - +parseKey(td)) / 864e5); return n < 0 ? { t: 'Overdue ' + -n + 'd', k: 'od' } : n <= 30 ? { t: 'Due in ' + n + 'd', k: 'soon' } : { t: 'Due ' + r.due, k: 'later' }; })() : null;
  const cp = async (what: string) => { const t = what === 'num' ? d.number : what === 'name' ? d.deal : what === 'notes' ? d.notes : [d.deal, d.plan ? planLabel(d) : '', d.notes, d.price ? priceText(d) : '', d.number].filter(Boolean).join('\n'); if (!t) return toast('Nothing to copy'); toast((await copyText(t)) ? 'Copied' : 'Copy failed'); };
  return <div class={'entry' + (editing ? ' editing' : '')} data-id={d.id}>
    <div class="entry-num">{i + 1}</div>
    <div class="entry-main">
      <div class="entry-title">{d.deal}</div>
      {lk && <div class="entry-meta"><a class="entry-link" href={lk} target="_blank" rel="noopener" title="Open the HubSpot deal">↗ HubSpot</a></div>}
      {d.plan && <div class="entry-line"><b>Plan</b>{planLabel(d)}</div>}
      {d.notes && <div class="entry-line"><b>Notes</b>{d.notes}</div>}
      {d.price && <div class="entry-line"><b>Price</b>{priceText(d)}</div>}
      {regsOf(d) > 0 && <div class="entry-line"><b>Registers</b>+{regsOf(d)} extra</div>}
      {d.history.length > 0 && <div class="entry-line"><b>Stage</b>{d.status || WON}</div>}
      {d.history.length > 0 && <div class="hist"><div class="hist-title">Note history ({d.history.length})</div>{d.history.map(h => <div class="hist-item"><span class="when">{fmtDay(h.day)}</span>{h.stage && <span class="stg">{h.stage}</span>}{[h.deal && h.deal !== d.deal ? h.deal : '', h.notes, [h.plan ? planLabel(h as any) : '', h.price ? priceText(h as any) : ''].filter(Boolean).join(' · ')].filter(Boolean).join(' — ') || (h.won ? 'Closed Won All again' : 'Updated')}<Armed label={h.won ? 'Make separate deal' : 'Remove'} onConfirm={() => put('entries', h.tid, { noMerge: true, mergeInto: undefined })} /></div>)}</div>}
      {merging && <MergePanel d={d} onClose={onMerge} />}
      {r.paid && <div class="entry-line"><b>Revenue</b>{money(r2(r.mrr), r2(r.mrrMvr))} / month · due {r.due}{chip && <span class={'bl-chip ' + chip.k}>{chip.t}</span>}</div>}
      <div class="bl-act"><label>Activation date <input type="date" value={r.act} onChange={e => setActivation(d.id, (e.target as HTMLInputElement).value)} /></label>
        {r.paid && <><button class="icon-btn" onClick={() => { markRenewed(d); toast('Marked renewed'); }}>Mark renewed</button><label>Due <input type="date" title="Set due date" value={r.due} onChange={e => setDue(d.id, (e.target as HTMLInputElement).value)} /></label></>}</div>
    </div>
    <button type="button" class="entry-cpt" title="Copy…" aria-label="Copy options" onClick={() => cp('all')}>{svgHtml(DI.cpt)}</button>
    <div class="entry-actions">
      <button class="icon-btn" type="button" title="Add a follow-up task" onClick={() => openTaskForm({ title: 'Follow up — ' + d.deal, deal: d.deal })}>Follow-up</button>
      <button class="icon-btn" onClick={onEdit}>Edit</button><button class="icon-btn" onClick={onMerge}>Merge</button>
      <Armed label="Delete" cls="del" onConfirm={() => { removeEntry(d.id); toast('Deal deleted', { label: 'Undo', fn: () => restore('entries', d.id) }); }} />
    </div>
    <span class="entry-cp" role="group" aria-label="Copy from this deal">
      {d.number && <button type="button" class="cp-chip" title="Copy hubspot link" aria-label="Copy hubspot link" onClick={() => cp('num')}>{svgHtml(DI.cp_num)}</button>}
      <button type="button" class="cp-chip" title="Copy deal name" aria-label="Copy deal name" onClick={() => cp('name')}>{svgHtml(DI.cp_name)}</button>
      <button type="button" class="cp-chip" title="Copy notes" aria-label="Copy notes" onClick={() => cp('notes')}>{svgHtml(DI.cp_notes)}</button>
      <button type="button" class="cp-chip" title="Copy deal" aria-label="Copy deal" onClick={() => cp('all')}>{svgHtml(DI.cp_all)}</button>
    </span>
  </div>;
}
function MergePanel({ d, onClose }: { d: WonDeal; onClose: () => void }) {
  const [q, setQ] = useState('');
  const list = sorted().filter(x => x.id !== d.id && (!q.trim() || x.deal.toLowerCase().indexOf(q.trim().toLowerCase()) >= 0)).slice(0, 8);
  return <div class="merge-panel"><div class="hist-title">Merge with another deal (the earlier Closed Won All stays, the other goes into its note history)</div>
    <input type="search" placeholder="Search by deal name" autoComplete="off" value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} />
    <div class="merge-list">{list.length ? list.map(x => <div class="merge-res"><div><b>{x.deal || '(no name)'}</b><small>{fmtDay(x.day)}</small></div><Armed label="Merge" onConfirm={() => { const [a, b] = [d, x].sort((p, q2) => p.ts - q2.ts); put('entries', b.id, { mergeInto: a.id, noMerge: undefined }); toast('Merged into ' + a.deal); onClose(); }} /></div>) : <div class="hist-item">No other deals match.</div>}</div>
    <button class="icon-btn" onClick={onClose}>Close</button></div>;
}

function Revenue() {
  const all = wonDeals(), td = todayKey(), mk = td.slice(0, 7);
  const sum = (l: WonDeal[]) => { let u = 0, v = 0; l.forEach(d => { const a = parsePrice(d.price), c = parsePrice(d.mvr); if (!isNaN(a)) u += a; if (!isNaN(c)) v += c; }); return [u, v]; };
  const inf = all.map(d => ({ d, r: renewalOf(d) })), paid = inf.filter(x => x.r.paid);
  const month = all.filter(d => d.day.slice(0, 7) === mk), [mu, mv] = sum(month);
  const mrr = paid.reduce((n, x) => n + x.r.mrr, 0), mrrV = paid.reduce((n, x) => n + x.r.mrrMvr, 0);
  const due = paid.filter(x => x.r.due >= td && x.r.due <= addM(td, 1)), soon = paid.filter(x => { const n = Math.round((+parseKey(x.r.due) - +parseKey(td)) / 864e5); return n >= 0 && n <= 30; }), over = paid.filter(x => x.r.due < td);
  void due;
  const bars = Array.from({ length: 12 }, (_, i) => { const d = parseKey(td); d.setDate(1); d.setMonth(d.getMonth() - 11 + i); const key = keyOf(d).slice(0, 7); return { key, label: MONTHS[d.getMonth()].slice(0, 3), v: sum(all.filter(x => x.day.slice(0, 7) === key))[0] }; });
  const mx = Math.max(1, ...bars.map(b => b.v));
  const open = (title: string, l: { d: WonDeal; r?: ReturnType<typeof renewalOf> }[]) => openModal(() => <Sheet title={title + ' (' + l.length + ')'} onClose={closeModal}>{l.length ? l.map(x => <div class="item"><div class="main"><div class="t">{x.d.deal}</div><div class="s">{fmtDay(x.d.day)} · {planLabel(x.d)} · {priceText(x.d)}{x.r && x.r.due ? ' · due ' + fmtDay(x.r.due) : ''}</div></div>{x.r && x.r.paid && <Btn onClick={() => { markRenewed(x.d); toast('Marked renewed'); }}>Mark renewed</Btn>}</div>) : <div class="empty">Nothing here.</div>}</Sheet>);
  return <div id="blPanel" class="deals-card"><div class="card-head"><div><div class="section-title">Revenue &amp; Renewals</div><div class="section-sub">Press a box to see the deals</div></div></div>
    <div class="card-body"><div class="bl-grid">
      <button class="bl-t" data-k="month" onClick={() => open('Won this month', month.map(d => ({ d })))}><b>{money(mu, mv)}</b><span>Won this month</span></button>
      <button class="bl-t" data-k="mrr" onClick={() => open('Monthly revenue', paid)}><b>{money(r2(mrr), r2(mrrV))}</b><span>Monthly revenue (MRR)</span></button>
      <button class="bl-t" data-k="arr" onClick={() => open('Yearly revenue', paid)}><b>{money(r2(mrr * 12), r2(mrrV * 12))}</b><span>Yearly (ARR)</span></button>
      <button class="bl-t" data-k="due" onClick={() => open('Due in 30 days', soon)}><b>{soon.length}</b><span>Due in 30 days</span></button>
      <button class="bl-t" data-k="over" onClick={() => open('Overdue', over)}><b>{over.length}</b><span>Overdue</span></button>
    </div><div class="bl-bars">{bars.map(b => <div class="bl-bar" data-m={b.key} title={b.key + ': $' + fmtNum(b.v)} onClick={() => open('Won in ' + b.key, all.filter(x => x.day.slice(0, 7) === b.key).map(d => ({ d })))}><i style={{ height: Math.round((b.v / mx) * 70) + 'px' }} />{b.label}</div>)}</div></div></div>;
}
function PlanCard({ k }: { k: string }) {
  const sc = scopeS.value, all = wonDeals();
  const list = sc === 'day' ? all.filter(d => d.day === k) : sc === 'month' ? all.filter(d => d.day.slice(0, 7) === k.slice(0, 7)) : sc === 'year' ? all.filter(d => d.day.slice(0, 4) === k.slice(0, 4)) : all;
  const S = planStats(list as any), label = sc === 'day' ? fmtDay(k) : sc === 'month' ? MONTHS[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4) : sc === 'year' ? k.slice(0, 4) : 'All days';
  const foot = ['Total deals: ' + S.total]; if (S.other.n) foot.push('Other plans: ' + S.other.n); if (S.none.n) foot.push('No plan: ' + S.none.n); if (S.priced) foot.push('Total price: ' + totText(S.price, S.mvr, S.priced, S.mvrN));
  return <div class="deals-card" id="statsCard"><div class="card-head"><div class="head-left"><div class="section-icon">{svgHtml(WI.stats)}</div><div><div class="section-title">Plan Breakdown</div><div class="section-sub" id="statsSub">{label} · {list.length} deal{list.length === 1 ? '' : 's'}</div></div></div>
    <div class="seg" id="statScope">{([['all', 'All time'], ['day', 'Day'], ['month', 'Month'], ['year', 'Year']] as const).map(([x, l]) => <button data-s={x} class={sc === x ? 'active' : ''} onClick={() => { scopeS.value = x; }}>{l}</button>)}</div></div>
    <div class="card-body"><div class="stat-grid" id="statGrid">{PLANS.map(p => { const g = S.groups[p]; return <div class="stat-tile"><div class="stat-name">{p}</div><div class="stat-big">{g.n}</div>{p !== 'Free' && <div class="stat-sub">{CYCLES.map(c => <div class="mini"><b>{g.cyc[c].n}</b><span>{c}</span></div>)}</div>}{p !== 'Free' && g.nocyc > 0 && <div class="stat-note">{g.nocyc} with no billing set</div>}{g.price > 0 && <div class="stat-price">Total price · {totText(g.price, g.mvr, g.pn, g.mn)}</div>}</div>; })}</div>
      <div class="stat-foot" id="statFoot">{foot.join('   ·   ')}</div></div></div>;
}
function pick(k: string) { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.html,.htm,.txt'; inp.onchange = async () => { const f = inp.files && inp.files[0]; if (f) toast(await importDealsFile(f, k)); }; inp.click(); }
function paste(k: string) {
  let t = '';
  openModal(() => <Sheet title="Paste report" onClose={closeModal} foot={<><Btn onClick={closeModal}>Cancel</Btn><button class="b-add" onClick={() => { closeModal(); toast(importDealsReportText(t, k)); }}>Import</button></>}>
    <p class="muted" style={{ marginTop: 0, fontSize: '.82rem' }}>Paste the text of a Deals Report (a day, or Monthly / Yearly / All days).</p><textarea class="in" rows={12} placeholder="Deals Report — …" onInput={e => { t = (e.target as HTMLTextAreaElement).value; }} /></Sheet>);
}
const xl = (list: WonDeal[], name: string) => { if (!list.length) return toast('Nothing to export yet'); download(name, buildXlsx(dealRows(list), W_WIDTHS), XLSX_MIME); toast('Excel file downloaded'); };
function FinalCard({ k }: { k: string }) {
  const txt = useMemo(() => wonReport(k), [k, rev.value]), list = sorted().filter(d => d.day === k);
  return <div class="report-card"><div class="card-head"><div class="section-title">Final Report</div><div class="actions">
    <button class="btn btn-reset" onClick={() => { if (!list.length) return toast('Nothing to reset'); if (!confirm('Delete all deals of this day?')) return; const ids = list.map(d => d.id); ids.forEach(removeEntry); toast('Day reset', { label: 'Undo', fn: () => ids.forEach(id => restore('entries', id)) }); }}>Reset day</button>
    <button class="btn btn-excel" title="Import an Excel export, a Download Report .html, or a Monthly/Yearly .txt" onClick={() => pick(k)}>Import file</button>
    <button class="btn btn-excel" title="Paste the text of a Final Report to import it" onClick={() => paste(k)}>Paste report</button>
    <button class="btn btn-excel" onClick={() => xl(list, 'deals-' + k + '.xlsx')}>Export day</button>
    <button class="btn btn-excel" onClick={() => xl(sorted().sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0)), 'deals-all-days.xlsx')}>Export all days</button>
    <button class="btn" onClick={() => { download('deals-report-' + k + '.html', htmlReport(fmtDay(k, true), txt), 'text/html;charset=utf-8'); toast('Report HTML downloaded'); }}>Download Report</button>
    <button class="btn btn-copy" onClick={async () => toast((await copyText(txt)) ? 'Copied to clipboard' : 'Copy failed')}>Copy</button>
  </div></div><div class="report-preview" id="reportPreview">{txt}</div></div>;
}
function PeriodCard({ k }: { k: string }) {
  const P = pmS.value, per = useMemo(() => wonPeriodReport(P.m, P.y, P.mo), [P.m, P.y, P.mo, rev.value]);
  const years = Array.from(new Set([P.y, new Date().getFullYear(), ...wonDeals().map(d => +d.day.slice(0, 4))])).sort((a, b) => b - a);
  const slug = per.title.replace(/\s+/g, '-').toLowerCase();
  return <div class="report-card" id="periodCard"><div class="card-head"><div class="section-title">Monthly &amp; Yearly Report</div>
    <div class="seg" id="periodMode">{([['month', 'Monthly'], ['year', 'Yearly'], ['all', 'All days']] as const).map(([m, l]) => <button data-m={m} class={P.m === m ? 'active' : ''} onClick={() => { pmS.value = { ...P, m }; }}>{l}</button>)}</div></div>
    <div class="period-row">
      <select id="pMonth" aria-label="Month" style={{ display: P.m === 'month' ? '' : 'none' }} value={P.mo} onChange={e => { pmS.value = { ...P, mo: +(e.target as HTMLSelectElement).value }; }}>{MONTHS.map((m, i) => <option value={i + 1}>{m}</option>)}</select>
      <select id="pYear" aria-label="Year" style={{ display: P.m === 'all' ? 'none' : '' }} value={P.y} onChange={e => { pmS.value = { ...P, y: +(e.target as HTMLSelectElement).value }; }}>{years.map(y => <option value={y}>{y}</option>)}</select>
      <div class="actions" style={{ marginLeft: 'auto' }}>
        <button class="btn btn-excel" onClick={() => pick(k)}>Import file</button><button class="btn btn-excel" onClick={() => paste(k)}>Paste report</button>
        <button class="btn btn-excel" onClick={() => xl(per.list, 'deals-' + slug + '.xlsx')}>Export Excel</button>
        <button class="btn" onClick={() => { download('deals-' + slug + '.txt', per.text); toast('Report downloaded'); }}>Download report</button>
        <button class="btn" onClick={() => { download('deals-' + slug + '.html', htmlReport(per.title, per.text), 'text/html;charset=utf-8'); toast('Report HTML downloaded'); }}>Download HTML</button>
        <button class="btn btn-copy" onClick={async () => toast((await copyText(per.text)) ? 'Copied to clipboard' : 'Copy failed')}>Copy</button>
      </div></div>
    <div class="report-preview" id="periodPreview">{per.text}</div></div>;
}
export { getDay, tkOf };
