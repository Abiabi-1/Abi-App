// Dashboard Customize / Arrange tiles / Build your own (Round 61) + saved Analytics reports.
import { useState } from 'preact/hooks';
import { rev, all, get, put, del } from '../data/store';
import { deals, wonDeals, lostDeals, tickets, allTasks, lostValue, ticketStageName } from '../domain/crm';
import { allEntryDays, entriesOf, entryText, normPlan, SECTIONS as DE_SECTIONS } from '../domain/dayend';
import { addDays, fmtDay, fmtNum, keyOf, parsePrice, parseKey, todayKey, uid, MONTHS } from '../lib/util';
import { Btn, Empty, Field, IconBtn, Sheet, Switch, closeModal, openModal, toast } from '../ui/kit';
import { Bars, Columns } from '../ui/charts';

export const BLOCKS: [string, string][] = [['today', 'Today'], ['deals', 'Deals'], ['charts', 'Deals per stage · Entries, last 14 days'], ['reports', 'Daily and weekly report'], ['widgets', 'My widgets']];
const cfg = () => { void rev.value; return (get<any>('cfg', 'dash') || {}) as { order?: string[]; hidden?: string[] }; };
export function dashOrder() { const o = (cfg().order || []).filter(x => BLOCKS.some(b => b[0] === x)); BLOCKS.forEach(b => { if (o.indexOf(b[0]) < 0) o.push(b[0]); }); return o; }
export const dashHidden = () => cfg().hidden || [];

export interface Widget { id: string; title: string; src: string; measure: string; group: string; shape: string; period: string; ord?: number }
const SRC: [string, string][] = [['dayend', 'Day End entries'], ['won', 'Won deals'], ['lost', 'Lost deals'], ['deals', 'Deals board'], ['tickets', 'Tickets'], ['tasks', 'Tasks']];
const GROUPS: [string, string][] = [['none', 'No grouping (one number)'], ['stage', 'Stage'], ['plan', 'Plan'], ['billing', 'Billing'], ['section', 'Day End section'], ['reason', 'Lost reason'], ['priority', 'Priority'], ['day', 'Day'], ['month', 'Month'], ['weekday', 'Weekday'], ['hour', 'Hour']];
const PERIODS: [string, string][] = [['all', 'All time'], ['today', 'Today'], ['7d', 'Last 7 days'], ['month', 'This month'], ['year', 'This year']];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
interface Row { name: string; stage: string; plan: string; billing: string; section: string; reason: string; priority: string; price: number; day: string; hour: number }
function rows(src: string): Row[] {
  const b = { name: '', stage: '', plan: '', billing: '', section: '', reason: '', priority: '', price: 0, day: '', hour: -1 };
  if (src === 'dayend') return allEntryDays().flatMap(k => entriesOf(k).map(e => ({ ...b, name: e.deal || entryText(e).slice(0, 40), stage: e.stage || '', plan: normPlan(e.plan), billing: e.billing || '', section: DE_SECTIONS.find(s => s.key === e.sk)?.label || e.sk, price: parsePrice(e.price) || 0, day: e.day, hour: e.at ? new Date(e.at).getHours() : parseInt(e.hk, 10) })));
  if (src === 'won') return wonDeals().map(w => ({ ...b, name: w.deal, stage: 'Closed Won All', plan: normPlan(w.plan), billing: w.billing || '', price: parsePrice(w.price) || 0, day: w.day, hour: w.ts ? new Date(w.ts).getHours() : -1 }));
  if (src === 'lost') return lostDeals().map(l => ({ ...b, name: l.deal, stage: l.kind === 'churn' ? 'Churn' : 'Closed Lost All', plan: normPlan(l.plan), billing: l.billing || '', reason: l.reason || 'No reason', price: lostValue(l), day: l.day }));
  if (src === 'deals') return deals().map(d => ({ ...b, name: d.name, stage: d.stage, plan: normPlan(d.plan), billing: d.billing || '', price: parsePrice(d.price) || 0, day: d.ts ? keyOf(new Date(d.ts)) : '', hour: d.ts ? new Date(d.ts).getHours() : -1 }));
  if (src === 'tickets') return tickets().map(t => ({ ...b, name: t.subject, stage: ticketStageName(t), priority: t.priority || '', day: t.created ? keyOf(new Date(t.created)) : '', hour: t.created ? new Date(t.created).getHours() : -1 }));
  if (src === 'tasks') return allTasks().map(t => ({ ...b, name: t.title, stage: t.done ? 'Done' : 'Open', priority: t.priority || '', day: t.due || '', hour: t.time ? parseInt(t.time, 10) : -1 }));
  return [];
}
function inPeriod(day: string, p: string) { const td = todayKey(); if (p === 'all') return true; if (!day) return false; if (p === 'today') return day === td; if (p === '7d') return day > addDays(td, -7) && day <= td; if (p === 'month') return day.slice(0, 7) === td.slice(0, 7); if (p === 'year') return day.slice(0, 4) === td.slice(0, 4); return true; }
function gkey(r: Row, g: string) { switch (g) { case 'day': return r.day; case 'month': return r.day.slice(0, 7); case 'weekday': return r.day ? WD[parseKey(r.day).getDay()] : ''; case 'hour': return r.hour >= 0 ? String(r.hour).padStart(2, '0') : ''; default: return String((r as any)[g] || '(none)'); } }
export function widgetData(w: Widget) {
  const L = rows(w.src).filter(r => inPeriod(r.day, w.period || 'all')), meas = (A: Row[]) => (w.measure === 'sum' ? Math.round(A.reduce((n, r) => n + r.price, 0)) : A.length);
  if (w.group === 'none') return { total: meas(L), n: L.length, data: [] as { k: string; label: string; v: number }[] };
  const o: Record<string, Row[]> = {}; L.forEach(r => { const k = gkey(r, w.group); if (!k) return; (o[k] = o[k] || []).push(r); });
  let ks = Object.keys(o); const time = ['day', 'month', 'hour'].indexOf(w.group) >= 0;
  ks = w.group === 'weekday' ? WD.filter(d => o[d]) : time ? ks.sort().slice(-31) : ks.sort((a, b) => meas(o[b]) - meas(o[a])).slice(0, 15);
  const label = (k: string) => (w.group === 'month' ? MONTHS[+k.slice(5) - 1].slice(0, 3) : w.group === 'day' ? String(+k.slice(8)) : k);
  return { total: meas(L), n: L.length, data: ks.map(k => ({ k, label: label(k), v: meas(o[k]) })) };
}
export const widgets = () => { void rev.value; return all<Widget>('widgets').sort((a, b) => (a.ord || 0) - (b.ord || 0)); };
export function DashWidgets() {
  const W = widgets(); if (!W.length) return null;
  return <><div class="h2">My widgets</div><div class="grid2">{W.map(w => { const d = widgetData(w); const fmt = (v: number) => (w.measure === 'sum' ? '$' + fmtNum(v) : String(v));
    return <div class="card dash-w" data-w={w.id}><div class="lbl">{w.title} · {PERIODS.find(p => p[0] === w.period)?.[1]}<span style={{ float: 'right' }}><IconBtn icon="edit" sm title="Edit widget" onClick={() => openModal(() => <WidgetForm cur={w} />)} /></span></div>
      {w.group === 'none' || w.shape === 'number' ? <div class="dash-n"><b class="mono">{fmt(d.total)}</b><span class="faint">{d.n} item{d.n === 1 ? '' : 's'}</span></div> : !d.data.length ? <Empty>No data.</Empty> : w.shape === 'columns' ? <Columns data={d.data} /> : <Bars data={d.data} />}</div>; })}</div></>;
}
export function WidgetForm({ cur }: { cur?: Widget }) {
  const [w, setW] = useState<Widget>(cur ? { ...cur } : { id: '', title: 'My widget', src: 'dayend', measure: 'count', group: 'section', shape: 'bars', period: 'month' }), set = (p: Partial<Widget>) => setW(o => ({ ...o, ...p }));
  const sel = (k: keyof Widget, label: string, opts: [string, string][]) => <Field label={label}><select class="in" data-w={k} value={String(w[k])} onChange={e => set({ [k]: (e.target as HTMLSelectElement).value } as any)}>{opts.map(([v, l]) => <option value={v}>{l}</option>)}</select></Field>;
  const save = () => { const { id, ...r } = w; put('widgets', id || uid('w'), { ...r, ord: cur?.ord ?? widgets().length }); closeModal(); toast('Widget saved'); };
  const d = widgetData(w);
  return <Sheet title={cur ? 'Edit widget' : 'Build your own widget'} onClose={closeModal} foot={<>{cur && <Btn icon="trash" onClick={() => { del('widgets', cur.id); closeModal(); }}>Delete</Btn>}<button type="button" class="b-add" onClick={save}>Save</button></>}>
    <div class="form"><Field label="Title" full><input class="in" data-w="title" value={w.title} onInput={e => set({ title: (e.target as HTMLInputElement).value })} /></Field>
      {sel('src', 'Data', SRC)}{sel('measure', 'Measure', [['count', 'Count'], ['sum', 'Sum of price (USD)']])}{sel('group', 'Group by', GROUPS)}{sel('shape', 'Look', [['bars', 'Bars'], ['columns', 'Columns'], ['number', 'Number']])}{sel('period', 'Period', PERIODS)}</div>
    <div class="lbl" style={{ marginTop: '10px' }}>Preview</div>
    {w.group === 'none' || w.shape === 'number' ? <div class="dash-n"><b class="mono">{w.measure === 'sum' ? '$' + fmtNum(d.total) : d.total}</b></div> : w.shape === 'columns' ? <Columns data={d.data} /> : <Bars data={d.data} />}
  </Sheet>;
}
export function DashCustomize() {
  void rev.value; const o = dashOrder(), h = dashHidden(), W = widgets();
  const save = (order: string[], hidden: string[]) => put('cfg', 'dash', { order, hidden });
  const mv = (i: number, d: number) => { const a = o.slice(), j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; save(a, h); };
  const mvW = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= W.length) return; put('widgets', W[i].id, { ord: j }); put('widgets', W[j].id, { ord: i }); };
  return <Sheet title="Customize the Dashboard" onClose={closeModal} foot={<><Btn onClick={() => save(BLOCKS.map(b => b[0]), [])}>Reset</Btn><button type="button" class="b-add" onClick={closeModal}>Done</button></>}>
    <div class="lbl">Arrange tiles · show / hide</div>
    {o.map((id, i) => <div class="item"><Switch on={h.indexOf(id) < 0} onChange={v => save(o, v ? h.filter(x => x !== id) : [...h, id])} label={'Show ' + id} /><div class="main"><div class="t">{BLOCKS.find(b => b[0] === id)?.[1]}</div></div><IconBtn icon="up" sm title="Move up" onClick={() => mv(i, -1)} /><IconBtn icon="down" sm title="Move down" onClick={() => mv(i, 1)} /></div>)}
    <div class="lbl" style={{ marginTop: '12px' }}>My widgets</div>
    {W.length ? W.map((w, i) => <div class="item"><div class="main" style={{ cursor: 'pointer' }} onClick={() => openModal(() => <WidgetForm cur={w} />)}><div class="t">{w.title}</div><div class="s">{SRC.find(s => s[0] === w.src)?.[1]} · {GROUPS.find(g => g[0] === w.group)?.[1]}</div></div><IconBtn icon="up" sm title="Move up" onClick={() => mvW(i, -1)} /><IconBtn icon="down" sm title="Move down" onClick={() => mvW(i, 1)} /></div>) : <Empty>No widgets yet.</Empty>}
    <Btn icon="plus" onClick={() => openModal(() => <WidgetForm />)}>Build your own</Btn>
  </Sheet>;
}

// ---------- saved Analytics reports ----------
const reports = (): { name: string; range: string }[] => { void rev.value; return get<any>('cfg', 'areports')?.list || []; };
export function SavedReports({ cur, apply }: { cur: string; apply: (r: string) => void }) {
  const L = reports();
  return <><select class="in" style={{ width: 'auto' }} aria-label="Saved reports" value="" onChange={e => { const n = (e.target as HTMLSelectElement).value; const x = L.find(r => r.name === n); if (x) { apply(x.range); toast('Report: ' + x.name); } }}><option value="">Saved reports{L.length ? ' (' + L.length + ')' : ''}</option>{L.map(r => <option>{r.name}</option>)}</select>
    <Btn icon="star" onClick={() => { const n = prompt('Name for this report'); if (!n || !n.trim()) return; put('cfg', 'areports', { list: [...L.filter(r => r.name !== n.trim()), { name: n.trim(), range: cur }] }); toast('Report saved'); }}>Save report</Btn>
    {L.length > 0 && <Btn onClick={() => { const n = prompt('Delete which saved report? (' + L.map(r => r.name).join(', ') + ')'); if (n) put('cfg', 'areports', { list: L.filter(r => r.name !== n.trim()) }); }}>Delete…</Btn>}</>;
}
void fmtDay;
