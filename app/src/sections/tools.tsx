// Tools (Round 61): the old Tools menu, rebuilt on the new bases. Hub page at #/tools, each tool at #/tools/<id>.
import { useMemo, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { rev, all, get, put, del } from '../data/store';
import { deals, Deal, wonDeals, lostDeals, tickets, allTasks, renewalOf, lostValue } from '../domain/crm';
import { entriesOf, allEntryDays, entryText, Entry, WON, LOST, planLabel, normPlan, PLANS, CYCLES, SECTIONS as DE_SECTIONS } from '../domain/dayend';
import { calc } from '../domain/hr';
import { CollList, CDef } from '../features/coll';
import { OUTS, logCall, heat, profile, slotLabel, callbackQueue, events, answered } from '../features/calls';
import { addDays, copyText, csv, download, dur, fmtDay, fmtNum, keyOf, parsePrice, todayKey, uid, cx, MONTHS, parseKey } from '../lib/util';
import { Btn, Empty, Field, IconBtn, PageHead, Seg, Sheet, Stat, Tiles, closeModal, openModal, toast } from '../ui/kit';
import { Bars, Columns } from '../ui/charts';
import { Icon } from '../ui/icons';
import { route, go } from '../ui/state';
import { TOOLS2 } from './tools2';

export interface Tool { id: string; label: string; icon: string; desc: string; C: () => JSX.Element; group: string }
export const dealName = (k: string) => deals().find(d => d.key === k)?.name || k.replace(/^n-/, '');
const openDeal = (d: Deal) => go('dealboard', d.key);
export function DealPick({ value, onChange, label = 'Deal' }: { value: string; onChange: (k: string) => void; label?: string }) {
  const L = deals(); return <select class="in" aria-label={label} value={value} onChange={e => onChange((e.target as HTMLSelectElement).value)}><option value="">{label}…</option>{L.slice(0, 600).map(d => <option value={d.key}>{d.name}</option>)}</select>;
}

// ================= Message templates =================
const TPL_DEF = [
  { id: 'tp_intro', name: 'Intro', ch: 'WhatsApp', subject: '', body: 'Hi, this is Abi. Thanks for your interest in {deal}. Would you like a quick walkthrough this week?' },
  { id: 'tp_follow', name: 'Follow-up', ch: 'WhatsApp', subject: '', body: 'Hi, just following up on {deal}. Is there anything I can help you with?' },
  { id: 'tp_demo', name: 'Demo reminder', ch: 'WhatsApp', subject: '', body: 'Hi, a quick reminder about our demo for {deal}. Let me know if the time still works for you.' },
  { id: 'tp_pay', name: 'Payment reminder', ch: 'Email', subject: 'Payment reminder – {deal}', body: 'Hi,\n\nThis is a friendly reminder that the payment for {deal} ({plan}, {price}) is due. Please let me know if you need anything from my side.\n\nThank you,\nAbi' },
  { id: 'tp_renew', name: 'Renewal', ch: 'Email', subject: 'Your {deal} subscription renewal', body: 'Hi,\n\nYour subscription for {deal} is coming up for renewal. Would you like to continue with the {plan} plan?\n\nThank you,\nAbi' },
  { id: 'tp_thanks', name: 'Thank you', ch: 'Email', subject: 'Thank you', body: 'Hi,\n\nThank you for choosing us. If you need any help getting started with {deal}, just reply to this message.\n\nBest,\nAbi' },
];
export function seedTemplates() { if (get('cfg', 'tplseeded') || all('templates').length) return; TPL_DEF.forEach(t => { const { id, ...r } = t; put('templates', id, r); }); put('cfg', 'tplseeded', { at: Date.now() }); }
const TPL: CDef = { label: 'Message templates', ttl: 'name', sub: ['ch', 'cat'], hint: 'Placeholders: {deal} {name} (= deal name) {plan} {price} {stage} {date}. Phone numbers and e-mails are not stored.', f: [{ k: 'name', label: 'Name', req: true }, { k: 'ch', label: 'Channel', type: 'select', opts: ['WhatsApp', 'Email'] }, { k: 'cat', label: 'Category' }, { k: 'subject', label: 'Subject (email)' }, { k: 'body', label: 'Message', type: 'textarea', req: true }] };
export function fillTpl(s: string, d?: Deal | null) {
  const v: Record<string, string> = { deal: d?.name || '', name: d?.name || '', plan: d ? planLabel(d) : '', price: d?.price ? '$' + d.price : '', stage: d?.stage || '', date: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long' }), number: d?.links[0] || '', email: '' };
  return String(s || '').replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
}
export function pickTemplate(d: Deal) { seedTemplates(); openModal(() => <Sheet title={'Message for ' + d.name} onClose={closeModal}>{all<any>('templates').map(t => <div class="item" style={{ cursor: 'pointer' }} onClick={() => useTemplate(t, d)}><span class="pill">{t.ch}</span><div class="main"><div class="t">{t.name}</div><div class="s">{fillTpl(t.body, d).slice(0, 90)}</div></div></div>)}</Sheet>); }
export function useTemplate(t: any, d?: Deal | null) { openModal(() => <UseTpl t={t} d0={d || null} />); }
function UseTpl({ t, d0 }: { t: any; d0: Deal | null }) {
  const [dk, setDk] = useState(d0?.key || ''), d = deals().find(x => x.key === dk) || null, sub = fillTpl(t.subject, d), body = fillTpl(t.body, d);
  return <Sheet title={'Use · ' + t.name} onClose={closeModal} foot={<>
    <Btn icon="copy" onClick={() => { copyText(body); toast('Copied'); }}>Copy</Btn>
    {t.ch === 'Email' ? <Btn icon="em" onClick={() => window.open('mailto:?subject=' + encodeURIComponent(sub) + '&body=' + encodeURIComponent(body))}>Open mail</Btn> : <Btn icon="wa" onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent(body), '_blank', 'noopener')}>Open WhatsApp</Btn>}</>}>
    <DealPick value={dk} onChange={setDk} />
    {sub && <div class="lbl" style={{ marginTop: '10px' }}>Subject: {sub}</div>}
    <pre class="tpl-prev">{body}</pre>
  </Sheet>;
}
function Templates() {
  seedTemplates();
  return <CollList def={TPL} c="templates" addLabel="New template" extra={x => <div class="ctl" style={{ margin: '6px 0 0' }} onClick={e => e.stopPropagation()}><Btn icon="copy" onClick={() => useTemplate(x)}>Use</Btn></div>} />;
}

// ================= Quick Add templates & chips =================
export const QA_TPL_DEF = [{ n: 'Demo booked', notes: 'Demo booked' }, { n: 'Going live', notes: 'Going live – setup in progress' }, { n: 'Follow up tomorrow', notes: 'Follow up tomorrow' }, { n: 'Paid', notes: 'Paid' }];
export function qaTemplates(): { id: string; n: string; notes: string }[] { void rev.value; const L = all<any>('qatpl').sort((a, b) => (a.ord || 0) - (b.ord || 0)); return L.length || get('cfg', 'qatplset') ? L : QA_TPL_DEF.map((x, i) => ({ id: 'def' + i, ...x })); }
export function qaChips(def: string[]): string[] { void rev.value; const c = get<{ list?: string[] }>('cfg', 'chips'); return c && c.list && c.list.length ? c.list : def; }
const QT: CDef = { label: 'Quick Add templates', ttl: 'n', sub: ['notes'], f: [{ k: 'n', label: 'Button name', req: true }, { k: 'notes', label: 'Text it writes into the notes', type: 'textarea', req: true }] };
function QaTemplates() {
  const ensure = () => { if (!all('qatpl').length && !get('cfg', 'qatplset')) QA_TPL_DEF.forEach((x, i) => put('qatpl', 'qt' + i, { ...x, ord: i })); put('cfg', 'qatplset', { at: Date.now() }); };
  const chips = qaChips(['No answer', 'Busy', 'Call back later', 'Interested', 'Not interested', 'Demo booked', 'Wrong person']), [nc, setNc] = useState('');
  return <>
    <p class="faint" style={{ marginTop: 0, fontSize: '.78rem' }}>These buttons show in Quick Add. A template writes its text into the notes; Smart text then suggests what usually follows.</p>
    {!get('cfg', 'qatplset') && !all('qatpl').length ? <div class="ctl"><Btn onClick={ensure}>Edit the templates</Btn><span class="faint">{QA_TPL_DEF.map(x => x.n).join(' · ')}</span></div> : <CollList def={QT} c="qatpl" compact />}
    <div class="h2">Outcome chips (Deal entries)</div>
    <div class="row-scroll" style={{ flexWrap: 'wrap' }}>{chips.map((c, i) => <span class="chip on">{c}<button type="button" class="x-mini" aria-label={'Remove ' + c} onClick={() => put('cfg', 'chips', { list: chips.filter((_, j) => j !== i) })}>×</button></span>)}</div>
    <div class="ctl" style={{ marginTop: '8px' }}><input class="in grow" placeholder="New chip, e.g. Sent details" value={nc} onInput={e => setNc((e.target as HTMLInputElement).value)} /><Btn icon="plus" onClick={() => { const v = nc.trim(); if (!v) return; put('cfg', 'chips', { list: [...chips, v] }); setNc(''); }}>Add chip</Btn><Btn onClick={() => put('cfg', 'chips', { list: [] })}>Reset</Btn></div>
  </>;
}

// ================= Lists =================
function Lists() {
  void rev.value; const L = all<any>('lists'), [open, setOpen] = useState(''), [nm, setNm] = useState(''), [dk, setDk] = useState(''), [tk, setTk] = useState('');
  const cur = L.find(l => l.id === open), T = tickets();
  const nameOf = (i: any) => (i.k === 't' ? T.find(t => t.id === i.id)?.subject || 'Ticket' : dealName(i.id));
  if (cur) return <>
    <div class="ctl"><IconBtn icon="left" title="Back to lists" onClick={() => setOpen('')} /><b>{cur.name}</b><span class="faint">{(cur.items || []).length} items</span></div>
    <div class="ctl" style={{ flexWrap: 'wrap' }}><DealPick value={dk} onChange={setDk} label="Add a deal" /><Btn icon="plus" onClick={() => { if (!dk) return; if ((cur.items || []).some((i: any) => i.k === 'd' && i.id === dk)) return toast('Already in the list'); put('lists', cur.id, { items: [...(cur.items || []), { k: 'd', id: dk }] }); setDk(''); }}>Add deal</Btn>
      <select class="in" aria-label="Add a ticket" value={tk} onChange={e => setTk((e.target as HTMLSelectElement).value)}><option value="">Add a ticket…</option>{T.slice(0, 300).map(t => <option value={t.id}>{t.subject}</option>)}</select><Btn icon="plus" onClick={() => { if (!tk) return; put('lists', cur.id, { items: [...(cur.items || []), { k: 't', id: tk }] }); setTk(''); }}>Add ticket</Btn></div>
    {(cur.items || []).length ? (cur.items || []).map((i: any, j: number) => <div class="item"><span class="pill">{i.k === 't' ? 'Ticket' : 'Deal'}</span><div class="main" style={{ cursor: 'pointer' }} onClick={() => (i.k === 't' ? go('tickets', i.id) : go('dealboard', i.id))}><div class="t">{nameOf(i)}</div></div><IconBtn icon="x" sm title="Remove from list" onClick={() => put('lists', cur.id, { items: cur.items.filter((_: any, x: number) => x !== j) })} /></div>) : <Empty>Empty list.</Empty>}
    <div class="ctl" style={{ marginTop: '10px' }}><Btn icon="copy" onClick={() => { copyText((cur.items || []).map(nameOf).join('\n')); toast('Copied'); }}>Copy names</Btn><Btn icon="trash" onClick={() => { del('lists', cur.id); setOpen(''); toast('List deleted'); }}>Delete list</Btn></div>
  </>;
  return <>
    <div class="ctl"><input class="in grow" placeholder="New list name" value={nm} onInput={e => setNm((e.target as HTMLInputElement).value)} onKeyDown={e => { if (e.key === 'Enter') (e.currentTarget.nextElementSibling as HTMLButtonElement)?.click(); }} /><button type="button" class="b-add" onClick={() => { if (!nm.trim()) return; const id = uid('l'); put('lists', id, { name: nm.trim(), items: [] }); setNm(''); setOpen(id); }}>+ New list</button></div>
    {L.length ? L.map(l => <div class="item" style={{ cursor: 'pointer' }} onClick={() => setOpen(l.id)}><div class="main"><div class="t">{l.name}</div><div class="s">{(l.items || []).length} items</div></div><Icon n="right" /></div>) : <Empty>No lists yet. Make one for a campaign, a follow-up round or a group of deals.</Empty>}
  </>;
}

// ================= Invoices =================
interface Inv { id: string; no: string; date: string; due: string; cust: string; items: { d: string; q: number; p: number }[]; tax: number; disc: number; note: string; paid?: boolean }
const invCo = () => ({ name: '', addr: '', tax: 0, cur: 'MVR', n: 1, ...(get<any>('cfg', 'invoices') || {}) });
const sumInv = (x: Inv) => { let sub = 0; (x.items || []).forEach(i => { sub += (+i.q || 0) * (+i.p || 0); }); const tx = sub * ((+x.tax || 0) / 100); return { sub, tax: tx, tot: sub + tx - (+x.disc || 0) }; };
const m2 = (n: number, cur: string) => cur + ' ' + (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s: unknown) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);
export function invText(x: Inv) { const co = invCo(), s = sumInv(x), L = ['INVOICE ' + x.no, 'Date: ' + x.date + (x.due ? '   Due: ' + x.due : ''), '', 'From: ' + (co.name || '—'), 'To: ' + x.cust, '']; (x.items || []).forEach(i => L.push(i.d + '  ' + i.q + ' × ' + m2(+i.p, co.cur) + ' = ' + m2((+i.q || 0) * (+i.p || 0), co.cur))); L.push('', 'Subtotal: ' + m2(s.sub, co.cur)); if (+x.tax) L.push('Tax ' + x.tax + '%: ' + m2(s.tax, co.cur)); if (+x.disc) L.push('Discount: -' + m2(+x.disc, co.cur)); L.push('TOTAL: ' + m2(s.tot, co.cur)); if (x.note) L.push('', x.note); return L.join('\n'); }
function invHtml(x: Inv) { const co = invCo(), s = sumInv(x); return '<!doctype html><meta charset="utf-8"><title>' + esc(x.no) + '</title><style>body{font:14px/1.5 system-ui,Arial,sans-serif;color:#111;margin:32px}h1{margin:0 0 4px;font-size:26px;letter-spacing:.04em}table{width:100%;border-collapse:collapse;margin:18px 0}th,td{padding:8px 6px;border-bottom:1px solid #ddd;text-align:left}th:nth-child(n+2),td:nth-child(n+2){text-align:right}.tot td{font-weight:700;border-top:2px solid #111}.m{color:#555;font-size:12px}.r{display:flex;justify-content:space-between;gap:20px}</style><div class="r"><div><h1>INVOICE</h1><div class="m">' + esc(x.no) + '<br>Date ' + esc(x.date) + (x.due ? '<br>Due ' + esc(x.due) : '') + '</div></div><div style="text-align:right"><b>' + esc(co.name) + '</b><div class="m">' + esc(co.addr).replace(/\n/g, '<br>') + '</div></div></div><p><b>Bill to:</b> ' + esc(x.cust) + '</p><table><tr><th>Description</th><th>Qty</th><th>Price</th><th>Amount</th></tr>' + (x.items || []).map(i => '<tr><td>' + esc(i.d) + '</td><td>' + esc(i.q) + '</td><td>' + m2(+i.p, co.cur) + '</td><td>' + m2((+i.q || 0) * (+i.p || 0), co.cur) + '</td></tr>').join('') + '<tr><td colspan="3">Subtotal</td><td>' + m2(s.sub, co.cur) + '</td></tr>' + (+x.tax ? '<tr><td colspan="3">Tax ' + esc(x.tax) + '%</td><td>' + m2(s.tax, co.cur) + '</td></tr>' : '') + (+x.disc ? '<tr><td colspan="3">Discount</td><td>-' + m2(+x.disc, co.cur) + '</td></tr>' : '') + '<tr class="tot"><td colspan="3">Total</td><td>' + m2(s.tot, co.cur) + '</td></tr></table>' + (x.note ? '<p class="m">' + esc(x.note).replace(/\n/g, '<br>') + '</p>' : '') + '<script>print()</script>'; }
function Invoices() {
  void rev.value; const co = invCo(), L = all<Inv>('invoices').sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const [coOpen, setCoOpen] = useState(!co.name && !L.length);
  return <>
    <div class="ctl"><button type="button" class="b-add" onClick={() => openModal(() => <InvForm />)}>+ New invoice</button><Btn onClick={() => setCoOpen(!coOpen)}>Company details</Btn><Btn icon="down" onClick={() => download('invoices.csv', csv([['Number', 'Date', 'Due', 'Customer', 'Subtotal', 'Tax', 'Discount', 'Total', 'Paid'], ...L.map(x => { const s = sumInv(x); return [x.no, x.date, x.due, x.cust, s.sub, s.tax, x.disc || 0, s.tot, x.paid ? 'yes' : '']; })]))}>CSV</Btn></div>
    {coOpen && <div class="card"><div class="form">
      <Field label="Company name"><input class="in" value={co.name} onChange={e => put('cfg', 'invoices', { name: (e.target as HTMLInputElement).value })} /></Field>
      <Field label="Default tax %"><input class="in" type="number" step="any" value={co.tax} onChange={e => put('cfg', 'invoices', { tax: +(e.target as HTMLInputElement).value || 0 })} /></Field>
      <Field label="Currency"><input class="in" value={co.cur} onChange={e => put('cfg', 'invoices', { cur: (e.target as HTMLInputElement).value.trim() || 'MVR' })} /></Field>
      <Field label="Next number"><input class="in" type="number" value={co.n} onChange={e => put('cfg', 'invoices', { n: +(e.target as HTMLInputElement).value || 1 })} /></Field>
      <Field label="Address (no phone / e-mail)" full><textarea class="in" rows={2} value={co.addr} onChange={e => put('cfg', 'invoices', { addr: (e.target as HTMLTextAreaElement).value })} /></Field>
    </div></div>}
    {L.length ? L.map(x => { const s = sumInv(x); return <div class="item"><div class="main" style={{ cursor: 'pointer' }} onClick={() => openModal(() => <InvForm cur={x} />)}><div class="t">{x.no} · {x.cust || '(no customer)'}</div><div class="s">{fmtDay(x.date)}{x.due ? ' · due ' + fmtDay(x.due) : ''} · {m2(s.tot, co.cur)}</div></div>
      <div class="acts"><span class={cx('pill', x.paid ? 'good' : x.due && x.due < todayKey() ? 'bad' : '')}>{x.paid ? 'paid' : x.due && x.due < todayKey() ? 'overdue' : 'open'}</span><IconBtn icon="copy" sm title="Copy as text" onClick={() => { copyText(invText(x)); toast('Invoice copied'); }} /><Btn onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(invHtml(x)); w.document.close(); } else download(x.no + '.html', invHtml(x), 'text/html'); }}>Print / PDF</Btn></div></div>; }) : <Empty>No invoices yet.</Empty>}
  </>;
}
function InvForm({ cur }: { cur?: Inv }) {
  const co = invCo(), [x, setX] = useState<Inv>(() => cur ? { ...cur, items: (cur.items || []).map(i => ({ ...i })) } : { id: '', no: 'INV-' + String(co.n).padStart(4, '0'), date: todayKey(), due: addDays(todayKey(), 14), cust: '', items: [{ d: '', q: 1, p: 0 }], tax: co.tax, disc: 0, note: '' });
  const set = (p: Partial<Inv>) => setX(o => ({ ...o, ...p })), s = sumInv(x);
  const setI = (j: number, p: Partial<Inv['items'][0]>) => set({ items: x.items.map((i, k) => (k === j ? { ...i, ...p } : i)) });
  const save = () => { if (!x.cust.trim()) return toast('Add the customer / deal name'); const { id, ...r } = x; const nid = id || uid('inv'); put('invoices', nid, { ...r, items: r.items.filter(i => i.d || i.p) }); if (!id) put('cfg', 'invoices', { n: co.n + 1 }); closeModal(); toast('Invoice saved'); };
  return <Sheet wide title={cur ? 'Invoice ' + x.no : 'New invoice'} onClose={closeModal} foot={<>{cur && <Btn icon="trash" onClick={() => { del('invoices', cur.id); closeModal(); toast('Invoice deleted'); }}>Delete</Btn>}<Btn onClick={() => set({ paid: !x.paid })} on={!!x.paid}>{x.paid ? 'Paid ✓' : 'Mark paid'}</Btn><button type="button" class="b-add" onClick={save}>Save</button></>}>
    <div class="form">
      <Field label="Number"><input class="in" value={x.no} onInput={e => set({ no: (e.target as HTMLInputElement).value })} /></Field>
      <Field label="Customer / deal"><input class="in" list="inv-deals" value={x.cust} onInput={e => set({ cust: (e.target as HTMLInputElement).value })} /><datalist id="inv-deals">{deals().slice(0, 300).map(d => <option value={d.name} />)}</datalist></Field>
      <Field label="Date"><input class="in" type="date" value={x.date} onInput={e => set({ date: (e.target as HTMLInputElement).value })} /></Field>
      <Field label="Due"><input class="in" type="date" value={x.due} onInput={e => set({ due: (e.target as HTMLInputElement).value })} /></Field>
    </div>
    <div class="lbl" style={{ marginTop: '10px' }}>Items</div>
    {x.items.map((i, j) => <div class="inv-row"><input class="in" placeholder="Description" value={i.d} onInput={e => setI(j, { d: (e.target as HTMLInputElement).value })} /><input class="in" type="number" step="any" aria-label="Quantity" value={i.q} onInput={e => setI(j, { q: +(e.target as HTMLInputElement).value })} /><input class="in" type="number" step="any" aria-label="Price" value={i.p} onInput={e => setI(j, { p: +(e.target as HTMLInputElement).value })} /><IconBtn icon="x" sm title="Remove line" onClick={() => set({ items: x.items.filter((_, k) => k !== j) })} /></div>)}
    <Btn icon="plus" onClick={() => set({ items: [...x.items, { d: '', q: 1, p: 0 }] })}>Add line</Btn>
    <div class="form" style={{ marginTop: '10px' }}>
      <Field label="Tax %"><input class="in" type="number" step="any" value={x.tax} onInput={e => set({ tax: +(e.target as HTMLInputElement).value })} /></Field>
      <Field label="Discount"><input class="in" type="number" step="any" value={x.disc} onInput={e => set({ disc: +(e.target as HTMLInputElement).value })} /></Field>
      <Field label="Note" full><textarea class="in" rows={2} value={x.note} onInput={e => set({ note: (e.target as HTMLTextAreaElement).value })} /></Field>
    </div>
    <div class="faint mono" style={{ marginTop: '8px' }}>Subtotal {m2(s.sub, co.cur)}{+x.tax ? ' · Tax ' + m2(s.tax, co.cur) : ''} · <b>Total {m2(s.tot, co.cur)}</b></div>
  </Sheet>;
}

// ================= Call log, best hours, call-back queue =================
export function logOutcomeSheet(dk0 = '') { openModal(() => <LogCall dk0={dk0} />); }
function LogCall({ dk0 }: { dk0: string }) {
  const [dk, setDk] = useState(dk0), p = dk ? profile(dk) : null;
  return <Sheet title="Log a call outcome" onClose={closeModal}>
    <DealPick value={dk} onChange={setDk} />
    <div class="row-scroll" style={{ flexWrap: 'wrap', marginTop: '10px' }}>{OUTS.map(o => <button type="button" class="chip" onClick={() => { if (!dk) return toast('Pick the deal first'); logCall(dk, o); const b = profile(dk).best; toast(o + ' logged' + (b >= 0 ? ' · best time ' + slotLabel(b) : '')); closeModal(); }}>{o}</button>)}</div>
    {p && <p class="faint" style={{ fontSize: '.78rem' }}>{p.n} calls / contacts · {p.ans} answered · best time {slotLabel(p.best)}{p.miss ? ' · ' + p.miss + ' unanswered in a row' : ''}</p>}
  </Sheet>;
}
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function Heatmap() {
  const g = heat(), hrs = Array.from({ length: 15 }, (_, i) => i + 7);
  return <div class="tw"><table class="heat" aria-label="Answer rate by weekday and hour"><thead><tr><th />{hrs.map(h => <th>{h % 12 || 12}{h < 12 ? 'a' : 'p'}</th>)}</tr></thead><tbody>{[1, 2, 3, 4, 5, 6, 0].map(d => <tr><th>{WD[d]}</th>{hrs.map(h => { const c = g[d][h], r = c.n ? c.a / c.n : -1; return <td title={c.n ? Math.round(r * 100) + '% answered · ' + c.n : 'no data'} style={{ background: r < 0 ? 'transparent' : `rgba(var(--accent-rgb), ${0.12 + r * 0.75})` }}>{c.n ? Math.round(r * 100) : ''}</td>; })}</tr>)}</tbody></table></div>;
}
function Calls() {
  void rev.value; const [tab, setTab] = useState<'log' | 'queue' | 'best'>('log'), ev = all<any>('calls').sort((a, b) => b.ts - a.ts), q = callbackQueue();
  return <>
    <div class="ctl"><Seg value={tab} onChange={setTab} opts={[['log', 'Call log'], ['queue', 'Call-back queue (' + q.length + ')'], ['best', 'Best hours']]} /><button type="button" class="b-add" onClick={() => logOutcomeSheet()}>+ Log outcome</button></div>
    {tab === 'log' && (ev.length ? ev.slice(0, 200).map(e => <div class="item"><span class={cx('pill', answered(e.oc) ? 'good' : 'bad')}>{e.oc}</span><div class="main"><div class="t">{dealName(e.dk)}</div><div class="s">{new Date(e.ts).toLocaleString()}</div></div><IconBtn icon="trash" sm bad title="Delete" onClick={() => del('calls', e.id)} /></div>) : <Empty>No outcomes logged yet. Press “+ Log outcome” after a call (or use the call buttons in a deal).</Empty>)}
    {tab === 'queue' && (q.length ? q.map(x => <div class="item"><div class="main" style={{ cursor: 'pointer' }} onClick={() => openDeal(x.d)}><div class="t">{x.d.name}{x.now && <span class="pill good" style={{ marginLeft: '6px' }}>best time now</span>}</div><div class="s">Last: {x.p.last!.oc} · {fmtDay(keyOf(new Date(x.p.last!.ts)))} · best {slotLabel(x.p.best)}{x.p.miss > 1 ? ' · ' + x.p.miss + ' unanswered in a row' : ''}</div></div><Btn onClick={() => logOutcomeSheet(x.d.key)}>Log</Btn></div>) : <Empty>Nobody is waiting for a call back.</Empty>)}
    {tab === 'best' && <BestHours />}
  </>;
}
function BestHours() {
  const ev = events(), byH = Array.from({ length: 24 }, (_, h) => ({ k: String(h), label: String(h % 12 || 12) + (h < 12 ? 'a' : 'p'), v: 0, n: 0 }));
  ev.forEach(e => { const h = new Date(e.ts).getHours(); byH[h].n++; if (answered(e.oc)) byH[h].v++; });
  const top = deals().filter(d => d.stage !== WON && d.stage !== LOST).map(d => ({ d, p: profile(d.key) })).filter(x => x.p.best >= 0 && x.p.n >= 2).sort((a, b) => b.p.n - a.p.n).slice(0, 40);
  return <>
    <p class="faint" style={{ marginTop: 0, fontSize: '.78rem' }}>From the outcomes you log plus an estimate from your Day End entries (notes like “no answer” count as not answered).</p>
    <div class="h2 first">Answer rate by weekday and hour</div><Heatmap />
    <div class="h2">Answered contacts by hour</div><Columns data={byH.slice(7, 22)} />
    <div class="h2">Best time per open deal</div>
    {top.length ? top.map(x => <div class="item" style={{ cursor: 'pointer' }} onClick={() => openDeal(x.d)}><div class="main"><div class="t">{x.d.name}</div><div class="s">{x.d.stage} · {x.p.ans}/{x.p.n} answered</div></div><span class="pill acc">{slotLabel(x.p.best)}</span></div>) : <Empty>Not enough data yet.</Empty>}
  </>;
}

// ================= Speed report =================
function Speed() {
  const W = wonDeals(), D = deals(), rows = W.map(w => { const d = D.find(x => x.name.toLowerCase() === String(w.deal || '').toLowerCase()); const first = d && d.first ? keyOf(new Date(d.first)) : w.day; const days = Math.max(0, Math.round((+parseKey(w.day) - +parseKey(first)) / 864e5)); return { w, first, days, touches: d ? d.entries.length : 1 }; }).sort((a, b) => a.days - b.days);
  const ds = rows.map(r => r.days), avg = ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : 0, med = ds.length ? ds[Math.floor(ds.length / 2)] : 0;
  const buckets = [['same day', 0, 0], ['1–7 days', 1, 7], ['8–30 days', 8, 30], ['31–90 days', 31, 90], ['90+ days', 91, 1e9]].map(([l, a, b]) => ({ k: String(l), label: String(l), v: ds.filter(x => x >= +a && x <= +b).length }));
  return <>
    <Tiles><Stat l="Won deals" v={rows.length} /><Stat l="Average days to win" v={rows.length ? fmtNum(avg) : '–'} tone="acc" /><Stat l="Median" v={rows.length ? med : '–'} /><Stat l="Fastest" v={rows.length ? ds[0] + ' d' : '–'} tone="good" /><Stat l="Slowest" v={rows.length ? ds[ds.length - 1] + ' d' : '–'} /><Stat l="Average touches" v={rows.length ? fmtNum(rows.reduce((n, r) => n + r.touches, 0) / rows.length) : '–'} c="entries before won" /></Tiles>
    <div class="h2">Time to win</div><Bars data={buckets} />
    <div class="h2">Deals</div>
    {rows.length ? rows.slice().reverse().map(r => <div class="item"><div class="main"><div class="t">{r.w.deal || '(no name)'}</div><div class="s">first seen {fmtDay(r.first)} · won {fmtDay(r.w.day)} · {r.touches} entries</div></div><span class="pill">{r.days} d</span></div>) : <Empty>No won deals yet.</Empty>}
  </>;
}

// ================= Week in review =================
export function weekStats(end: string) {
  const keys = Array.from({ length: 7 }, (_, i) => addDays(end, i - 6)), E = keys.flatMap(k => entriesOf(k)), W = wonDeals().filter(w => keys.indexOf(w.day) >= 0), L = lostDeals().filter(l => keys.indexOf(l.day) >= 0 && l.kind === 'lost');
  const done = allTasks().filter(t => t.done && t.doneAt && keys.indexOf(keyOf(new Date(t.doneAt))) >= 0).length, worked = keys.reduce((n, k) => n + calc(k).worked, 0);
  const per = keys.map(k => ({ k, n: entriesOf(k).length })), best = per.slice().sort((a, b) => b.n - a.n)[0];
  return { keys, E: E.length, won: W.length, usd: W.reduce((n, w) => n + (parsePrice(w.price) || 0), 0), lost: L.length, done, worked, best, per, calls: E.filter(e => e.sk === 'calls').length, wa: E.filter(e => e.sk === 'whatsapp').length, tickets: E.filter(e => e.sk === 'tickets').length };
}
function Week() {
  const [end, setEnd] = useState(todayKey()), a = weekStats(end), b = weekStats(addDays(end, -7));
  const ch = (x: number, y: number) => (y ? (x >= y ? '+' : '') + Math.round((x - y) / y * 100) + '% vs last week' : x ? 'new' : '');
  const text = ['Week in review — ' + fmtDay(a.keys[0]) + ' to ' + fmtDay(end), '', 'Entries: ' + a.E + ' (' + ch(a.E, b.E) + ')', 'Support calls: ' + a.calls + ' · WhatsApp: ' + a.wa + ' · Tickets: ' + a.tickets, 'Won deals: ' + a.won + ' ($' + fmtNum(a.usd) + ')', 'Lost deals: ' + a.lost, 'Tasks done: ' + a.done, 'Worked: ' + dur(a.worked, true), a.best && a.best.n ? 'Best day: ' + fmtDay(a.best.k) + ' (' + a.best.n + ' entries)' : ''].filter(Boolean).join('\n');
  return <>
    <div class="ctl"><IconBtn icon="left" title="Previous week" onClick={() => setEnd(addDays(end, -7))} /><b>{fmtDay(a.keys[0])} – {fmtDay(end)}</b><IconBtn icon="right" title="Next week" onClick={() => setEnd(addDays(end, 7))} /><Btn icon="copy" onClick={() => { copyText(text); toast('Week in review copied'); }}>Copy</Btn></div>
    <Tiles><Stat l="Entries" v={a.E} c={ch(a.E, b.E)} tone="acc" /><Stat l="Won" v={a.won} c={'$' + fmtNum(a.usd) + ' · ' + ch(a.won, b.won)} tone={a.won ? 'good' : ''} /><Stat l="Lost" v={a.lost} c={ch(a.lost, b.lost)} /><Stat l="Tasks done" v={a.done} c={ch(a.done, b.done)} /><Stat l="Worked" v={dur(a.worked, true)} /><Stat l="Best day" v={a.best && a.best.n ? fmtDay(a.best.k).slice(0, 10) : '–'} c={a.best && a.best.n ? a.best.n + ' entries' : ''} /></Tiles>
    <div class="h2">Entries per day</div><Columns data={a.per.map(x => ({ k: x.k, label: fmtDay(x.k).slice(0, 3), v: x.n }))} onPick={k => import('./dayend').then(m => { m.selDay.value = k; go('day'); })} />
    <pre class="tpl-prev">{text}</pre>
  </>;
}

// ================= Deeper insights =================
const OBJ: [string, RegExp][] = [['Price', /\b(price|expensive|cost|budget|cheaper|discount)\b/i], ['Timing', /\b(later|next month|not now|busy|after (eid|ramadan))\b/i], ['Competitor', /\b(competitor|another (system|software)|already using|other provider)\b/i], ['Features', /\b(feature|missing|doesn'?t have|need(s)? (a|an)|integration)\b/i], ['Owner / decision', /\b(owner|boss|partner|decide|decision|manager)\b/i], ['Trust / support', /\b(support|trust|reliab|problem|issue)\b/i], ['No response', /\b(no (answer|response|reply)|not (answer|respond)|didn'?t (pick|reply))\b/i]];
function Insights() {
  const [tab, setTab] = useState('months'); void rev.value;
  const days = allEntryDays(), E = useMemo(() => days.flatMap(k => entriesOf(k)), [rev.value]), W = wonDeals(), L = lostDeals();
  const tabs: [string, string][] = [['months', 'Months'], ['wl', 'Win / loss'], ['plans', 'Plans & prices'], ['prod', 'Productivity'], ['obj', 'Objections'], ['phr', 'Phrases'], ['scr', 'Scripts'], ['dq', 'Data quality'], ['wr', 'Weekly review']];
  let body: JSX.Element;
  if (tab === 'months') { const ms = Array.from(new Set(days.map(k => k.slice(0, 7)))).sort().slice(-12); body = <><div class="tw"><table class="table"><thead><tr><th>Month</th><th>Entries</th><th>Won</th><th>Won USD</th><th>Lost</th><th>Win rate</th></tr></thead><tbody>{ms.map(m => { const e = E.filter(x => x.day.slice(0, 7) === m).length, w = W.filter(x => x.day.slice(0, 7) === m), l = L.filter(x => x.kind === 'lost' && x.day.slice(0, 7) === m).length; return <tr><td>{MONTHS[+m.slice(5) - 1].slice(0, 3)} {m.slice(0, 4)}</td><td class="mono">{e}</td><td class="mono">{w.length}</td><td class="mono">${fmtNum(w.reduce((n, x) => n + (parsePrice(x.price) || 0), 0))}</td><td class="mono">{l}</td><td class="mono">{w.length + l ? Math.round(w.length / (w.length + l) * 100) + '%' : '–'}</td></tr>; })}</tbody></table></div><div class="h2">Won deals per month</div><Columns data={ms.map(m => ({ k: m, label: MONTHS[+m.slice(5) - 1].slice(0, 3), v: W.filter(x => x.day.slice(0, 7) === m).length }))} /></>; }
  else if (tab === 'wl') { const lost = L.filter(l => l.kind === 'lost'), R: Record<string, number> = {}; lost.forEach(l => { R[l.reason || 'No reason'] = (R[l.reason || 'No reason'] || 0) + 1; }); body = <><Tiles><Stat l="Won" v={W.length} tone="good" /><Stat l="Lost" v={lost.length} tone="bad" /><Stat l="Win rate" v={W.length + lost.length ? Math.round(W.length / (W.length + lost.length) * 100) + '%' : '–'} /><Stat l="Lost value" v={'$' + fmtNum(lost.reduce((n, l) => n + lostValue(l), 0))} /><Stat l="Churned" v={L.filter(l => l.kind === 'churn').length} /></Tiles><div class="h2">Lost reasons</div><Bars data={Object.keys(R).sort((a, b) => R[b] - R[a]).map(k => ({ k, label: k, v: R[k] }))} /></>; }
  else if (tab === 'plans') { const P: Record<string, { n: number; usd: number }> = {}; W.forEach(w => { const k = (normPlan(w.plan) || 'No plan') + (w.billing ? ' · ' + w.billing : ''); const o = P[k] = P[k] || { n: 0, usd: 0 }; o.n++; o.usd += parsePrice(w.price) || 0; }); const ks = Object.keys(P).sort((a, b) => P[b].n - P[a].n); body = <><Bars data={ks.map(k => ({ k, label: k, v: P[k].n, note: '$' + fmtNum(P[k].usd) }))} /><div class="h2">Average price</div><Tiles>{PLANS.map(p => { const L2 = W.filter(w => normPlan(w.plan) === p && parsePrice(w.price) > 0); return <Stat l={p} v={L2.length ? '$' + fmtNum(L2.reduce((n, w) => n + parsePrice(w.price), 0) / L2.length) : '–'} c={L2.length + ' deals'} />; })}{CYCLES.map(c => <Stat l={c} v={W.filter(w => w.billing === c).length} c="won deals" />)}</Tiles></>; }
  else if (tab === 'prod') { const byH = Array.from({ length: 24 }, (_, h) => ({ k: String(h), label: String(h % 12 || 12) + (h < 12 ? 'a' : 'p'), v: 0 })), byD = WD.map((l, i) => ({ k: String(i), label: l, v: 0 })); E.forEach(e => { const h = parseInt(e.hk, 10); if (h >= 0 && h < 24) byH[h].v++; byD[parseKey(e.day).getDay()].v++; }); const act = days.filter(k => entriesOf(k).length); body = <><Tiles><Stat l="Active days" v={act.length} /><Stat l="Entries per active day" v={act.length ? fmtNum(E.length / act.length) : '–'} tone="acc" /><Stat l="Busiest hour" v={byH.slice().sort((a, b) => b.v - a.v)[0]?.v ? byH.slice().sort((a, b) => b.v - a.v)[0].label : '–'} /><Stat l="Busiest weekday" v={byD.slice().sort((a, b) => b.v - a.v)[0]?.v ? byD.slice().sort((a, b) => b.v - a.v)[0].label : '–'} /></Tiles><div class="h2">Entries by hour</div><Columns data={byH.slice(6, 23)} /><div class="h2">Entries by weekday</div><Columns data={byD} /></>; }
  else if (tab === 'obj') { const O = OBJ.map(([l, rx]) => ({ k: l, label: l, v: E.filter(e => rx.test(entryText(e))).length })); body = <><p class="faint" style={{ marginTop: 0, fontSize: '.78rem' }}>Words in your Day End notes that point to a reason the deal is not moving. Tap a bar to see the entries.</p><Bars data={O.sort((a, b) => b.v - a.v)} onPick={k => { const rx = OBJ.find(o => o[0] === k)![1]; openModal(() => <Sheet title={k} onClose={closeModal}>{E.filter(e => rx.test(entryText(e))).slice(-80).reverse().map(e => <div class="item"><div class="main"><div class="t">{e.deal || DE_SECTIONS.find(s => s.key === e.sk)?.label}</div><div class="s">{fmtDay(e.day)} · {entryText(e)}</div></div></div>)}</Sheet>); }} /></>; }
  else if (tab === 'phr') { const C2: Record<string, number> = {}; E.forEach(e => String(e.notes || e.text || '').toLowerCase().split(/[.!?\n;]+/).map(s => s.trim()).filter(s => s.length >= 6 && s.length <= 60).forEach(s => { C2[s] = (C2[s] || 0) + 1; })); const ks = Object.keys(C2).filter(k => C2[k] > 1).sort((a, b) => C2[b] - C2[a]).slice(0, 40); body = ks.length ? <Bars data={ks.map(k => ({ k, label: k, v: C2[k] }))} /> : <Empty>No repeated phrases yet.</Empty>; }
  else if (tab === 'scr') { body = <><p class="faint" style={{ marginTop: 0, fontSize: '.78rem' }}>Your scripts are your message templates. The phrases that came before a win are shown below.</p><Templates /><div class="h2">Said in deals that were won</div>{(() => { const won = new Set(W.map(w => String(w.deal || '').toLowerCase())), C2: Record<string, number> = {}; E.filter(e => e.deal && won.has(String(e.deal).toLowerCase()) && e.stage !== WON).forEach(e => String(e.notes || '').split(/[.!?\n]+/).map(s => s.trim()).filter(s => s.length >= 6).forEach(s => { C2[s] = (C2[s] || 0) + 1; })); const ks = Object.keys(C2).sort((a, b) => C2[b] - C2[a]).slice(0, 25); return ks.length ? <Bars data={ks.map(k => ({ k, label: k, v: C2[k] }))} /> : <Empty>Nothing yet.</Empty>; })()}</>; }
  else if (tab === 'dq') { const tasks = E.filter(e => e.sk === 'tasks'), noStage = tasks.filter(e => !e.stage), noLink = deals().filter(d => !d.links.length), wonMiss = tasks.filter(e => e.stage === WON && (!e.plan || !e.price)); body = <><Tiles><Stat l="Deal entries without a stage" v={noStage.length} tone={noStage.length ? 'bad' : 'good'} /><Stat l="Deals without a HubSpot link" v={noLink.length} tone={noLink.length ? 'bad' : 'good'} onClick={() => go('tools', 'missing')} /><Stat l="Closed Won without plan / price" v={wonMiss.length} tone={wonMiss.length ? 'bad' : 'good'} onClick={() => go('tools', 'missing')} /><Stat l="Possible duplicates" v="→" onClick={() => go('tools', 'dupes')} /></Tiles><p class="faint" style={{ fontSize: '.78rem' }}>Missing information and the Duplicate finder fix these.</p></>; }
  else { body = <Week />; }
  return <><div class="row-scroll" style={{ marginBottom: '10px' }}>{tabs.map(([k, l]) => <button type="button" class={cx('chip', tab === k && 'on')} onClick={() => setTab(k)}>{l}</button>)}</div>{body}</>;
}

// ================= registry + hub =================
export const TOOLS: Tool[] = [
  { id: 'templates', label: 'Message templates', icon: 'wa', desc: 'WhatsApp / email texts with the deal filled in', C: Templates, group: 'Messages' },
  { id: 'qatpl', label: 'Quick Add templates & chips', icon: 'bolt', desc: 'The buttons in Quick Add', C: QaTemplates, group: 'Messages' },
  { id: 'calls', label: 'Call log & best hours', icon: 'clock', desc: 'Log outcomes, call-back queue, heatmap', C: Calls, group: 'Calls' },
  { id: 'lists', label: 'Lists', icon: 'list', desc: 'Named lists of deals and tickets', C: Lists, group: 'Deals' },
  { id: 'invoices', label: 'Invoices', icon: 'note', desc: 'Numbered invoices, print / PDF', C: Invoices, group: 'Deals' },
  { id: 'speed', label: 'Speed report', icon: 'bolt', desc: 'How fast deals are won', C: Speed, group: 'Insights' },
  { id: 'week', label: 'Week in review', icon: 'cal', desc: 'Weekly summary to copy', C: Week, group: 'Insights' },
  { id: 'insights', label: 'Deeper insights', icon: 'chart', desc: 'Months, win/loss, plans, productivity, objections…', C: Insights, group: 'Insights' },
  ...TOOLS2,
];
export function ToolsPage() {
  void rev.value; const id = route.value.t === 'tools' ? route.value.id : undefined, t = TOOLS.find(x => x.id === id);
  const [q, setQ] = useState('');
  if (t) { const C = t.C; return <div class="page" data-tool={t.id}><PageHead icon={t.icon} title={t.label} sub={t.desc} right={<Btn icon="left" onClick={() => go('tools')}>All tools</Btn>} /><C /></div>; }
  const sc = all<any>('shortcuts'), groups = Array.from(new Set(TOOLS.map(x => x.group))), qq = q.trim().toLowerCase();
  return <div class="page">
    <PageHead icon="board" title="Tools" sub="Everything from the old Tools menu" />
    <div class="ctl"><input class="in grow" placeholder="Find a tool…" value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} /></div>
    {groups.map(g => { const L = TOOLS.filter(x => x.group === g && (!qq || (x.label + ' ' + x.desc).toLowerCase().indexOf(qq) >= 0)); return L.length ? <><div class="h2">{g}</div><div class="tool-grid">{L.map(x => <button type="button" class="tool-tile" data-tool={x.id} onClick={() => go('tools', x.id)}><Icon n={x.icon} size={18} /><b>{x.label}</b><span>{x.desc}</span></button>)}</div></> : null; })}
    {sc.length > 0 && <><div class="h2">My shortcuts</div><div class="tool-grid">{sc.map(s => <button type="button" class="tool-tile" onClick={() => openShortcut(s.url)}><Icon n="link" size={18} /><b>{s.label}</b><span>{s.url}</span></button>)}</div></>}
  </div>;
}
export function openShortcut(u: string) { const url = /^https?:/i.test(u) ? u : 'https://' + u; window.open(url, '_blank', 'noopener'); }
export { invHtml };

