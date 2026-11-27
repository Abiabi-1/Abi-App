// Won Deals – own page. Deals are Day End "Closed Won All" entries (one deal per customer, later entries = note history).
import { signal } from '@preact/signals';
import { useMemo, useState } from 'preact/hooks';
import { rev, put } from '../data/store';
import { WonDeal, wonDeals, renewalOf, markRenewed } from '../domain/crm';
import { CYCLES, PLANS, WON, Entry, planLabel, planStats, priceText, regsOf, removeEntry, totText, currentHour, getDay } from '../domain/dayend';
import { MONTHS, copyText, download, fmtDay, fmtNum, isKey, shiftDayKey, todayKey, addDays, cx, parsePrice, lsJSON } from '../lib/util';
import { openUrl } from '../lib/privacy';
import { buildXlsx } from '../lib/xlsx';
import { Add, Btn, DangerBtn, Empty, IconBtn, PageHead, Seg, Sheet, Stat, Tiles, closeModal, openModal, toast, openMenu } from '../ui/kit';
import { EntryForm } from './entryform';
import { go } from '../ui/state';

const day = signal(todayKey());
const scope = signal<'day' | 'month' | 'year' | 'all'>('day');
const linkInReport = () => !!lsJSON<{ linkInReport?: boolean }>('hub_priv_v1', {}).linkInReport;
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
  return L.join('\n');
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

export function WonDeals() {
  void rev.value; const k = day.value, list = sorted().filter(d => d.day === k), all = wonDeals();
  const [edit, setEdit] = useState<Entry | null>(null);
  const sc = scope.value;
  const sl = sc === 'day' ? list : sc === 'month' ? all.filter(d => d.day.slice(0, 7) === k.slice(0, 7)) : sc === 'year' ? all.filter(d => d.day.slice(0, 4) === k.slice(0, 4)) : all;
  const S = planStats(sl as any);
  const td = todayKey(), in30 = addDays(td, 30);
  const ren = all.map(d => ({ d, r: renewalOf(d) }));
  const mrr = ren.reduce((n, x) => n + x.r.mrr, 0), due30 = ren.filter(x => x.r.due && x.r.due >= td && x.r.due <= in30), overdue = ren.filter(x => x.r.due && x.r.due < td);
  const wonMonth = all.filter(d => d.day.slice(0, 7) === td.slice(0, 7));
  const days = Array.from(new Set(all.map(d => d.day))).sort().reverse();
  const P = useState({ m: 'month' as 'month' | 'year' | 'all', y: new Date().getFullYear(), mo: new Date().getMonth() + 1 }), pr = P[0], setPr = P[1];
  const per = useMemo(() => wonPeriodReport(pr.m, pr.y, pr.mo), [pr.m, pr.y, pr.mo, rev.value]);
  const rep = useMemo(() => wonReport(k), [k, rev.value]);
  return <div class="page">
    <PageHead icon="won" title="Won Deals" sub="Closed Won All deals, one per customer" right={<span class="hide-phone"><Btn onClick={() => go('dealboard')}>Deals</Btn><Btn onClick={() => go('lost')}>Lost Deals</Btn></span>} />
    <Tiles>
      <Stat l="Won this month" v={wonMonth.length} tone={wonMonth.length ? 'good' : ''} />
      <Stat l="MRR" v={'$' + fmtNum(mrr)} c={'ARR $' + fmtNum(mrr * 12)} />
      <Stat l="Due in 30 days" v={due30.length} tone={due30.length ? 'acc' : ''} onClick={() => openModal(() => <RenewList title="Due in 30 days" items={due30} />)} />
      <Stat l="Overdue" v={overdue.length} tone={overdue.length ? 'bad' : ''} onClick={() => openModal(() => <RenewList title="Overdue renewals" items={overdue} />)} />
      <Stat l="All deals" v={all.length} />
    </Tiles>
    <div class="card tex de-nav" style={{ marginTop: '12px' }}>
      <div class="de-nav-r"><IconBtn icon="left" title="Previous day" onClick={() => { day.value = shiftDayKey(k, -1); }} /><input class="in de-date" type="date" value={k} onChange={e => { const v = (e.target as HTMLInputElement).value; if (isKey(v)) day.value = v; }} /><IconBtn icon="right" title="Next day" onClick={() => { day.value = shiftDayKey(k, 1); }} /><Btn on={k === td} onClick={() => { day.value = td; }}>Today</Btn><span class="de-dl">{fmtDay(k, true)} · {list.length} deal{list.length === 1 ? '' : 's'}</span></div>
      <div class="row-scroll de-chips">{days.slice(0, 60).map(x => <button class={cx('chip mono', x === k && 'on')} onClick={() => { day.value = x; }}>{fmtDay(x)} · {all.filter(d => d.day === x).length}</button>)}</div>
    </div>
    <div class="card" style={{ marginTop: '12px' }}>
      <div class="h2" style={{ marginTop: 0 }}>{edit ? 'Edit deal' : 'Add a won deal'}</div>
      <EntryForm sk="tasks" day={k} hk={currentHour(k)} edit={edit} initial={edit ? undefined : { stage: WON }} onDone={() => setEdit(null)} />
    </div>
    <div style={{ marginTop: '12px' }}>{list.length ? list.map((d, i) => <WonRow d={d} i={i} onEdit={() => setEdit(d.entry)} />) : <Empty>No deals for this day yet. Add one above.</Empty>}</div>
    <div class="h2">Plan breakdown<span class="r"><Seg value={sc} onChange={v => { scope.value = v; }} opts={[['day', 'Day'], ['month', 'Month'], ['year', 'Year'], ['all', 'All time']]} /></span></div>
    <Tiles>{PLANS.map(p => { const g = S.groups[p]; return <Stat l={p} v={g.n} c={g.price ? 'Total · ' + totText(g.price, g.mvr, g.pn, g.mn) : ' '} rows={p !== 'Free' ? CYCLES.map(c => [c, g.cyc[c].n, g.n] as [string, number, number]) : undefined} />; })}<Stat l="Total price" v={'$' + fmtNum(S.price)} c={S.mvrN ? fmtNum(S.mvr) + ' MVR' : ' '} /></Tiles>
    <div class="grid2" style={{ marginTop: '6px' }}>
      <div><div class="h2">Deals Report<span class="r"><Btn icon="copy" onClick={async () => toast((await copyText(rep)) ? 'Report copied' : 'Copy failed')}>Copy</Btn><Btn icon="down" onClick={() => download('deals-report-' + k + '.txt', rep)}>Download</Btn><Btn onClick={() => list.length ? download('deals-' + k + '.xlsx', buildXlsx(dealRows(list), [12, 5, 18, 24, 50, 18, 12, 10, 12, 14])) : toast('Nothing to export yet')}>Excel</Btn></span></div><pre class="rep">{rep}</pre></div>
      <div><div class="h2">Monthly / Yearly<span class="r"><Btn icon="copy" onClick={async () => toast((await copyText(per.text)) ? 'Report copied' : 'Copy failed')}>Copy</Btn><Btn onClick={() => per.list.length ? download('deals-' + per.title.replace(/\s+/g, '-').toLowerCase() + '.xlsx', buildXlsx(dealRows(per.list), [12, 5, 18, 24, 50, 18, 12, 10, 12, 14])) : toast('Nothing to export yet')}>Excel</Btn></span></div>
        <div class="ctl"><Seg value={pr.m} onChange={m => setPr({ ...pr, m })} opts={[['month', 'Month'], ['year', 'Year'], ['all', 'All days']]} />
          {pr.m === 'month' && <select class="in" style={{ width: 'auto' }} value={pr.mo} onChange={e => setPr({ ...pr, mo: +(e.target as HTMLSelectElement).value })}>{MONTHS.map((m, i) => <option value={i + 1}>{m}</option>)}</select>}
          {pr.m !== 'all' && <select class="in" style={{ width: 'auto' }} value={pr.y} onChange={e => setPr({ ...pr, y: +(e.target as HTMLSelectElement).value })}>{Array.from(new Set([pr.y, new Date().getFullYear(), ...all.map(d => +d.day.slice(0, 4))])).sort((a, b) => b - a).map(y => <option value={y}>{y}</option>)}</select>}</div>
        <pre class="rep">{per.text}</pre></div>
    </div>
  </div>;
}
function WonRow({ d, i, onEdit }: { d: WonDeal; i: number; onEdit: () => void }) {
  const lk = openUrl(d.number), r = renewalOf(d), td = todayKey();
  return <div class="item">
    <span class="ent-n mono">{i + 1}</span>
    <div class="main"><div class="t">{d.deal}{lk && <a class="ent-l" href={lk} target="_blank" rel="noopener">↗ HubSpot</a>}</div>
      <div class="pills">{d.plan && <span class="pill acc">{planLabel(d)}</span>}{d.price && <span class="pill warn">{priceText(d)}</span>}{regsOf(d) > 0 && <span class="pill">+{regsOf(d)} registers</span>}{d.history.length > 0 && <span class={'pill ' + (d.status === WON ? 'good' : '')}>{d.status}</span>}{r.due && <span class={cx('pill', r.due < td ? 'bad' : '')}>Due {fmtDay(r.due)}</span>}</div>
      {d.notes && <div class="n">{d.notes}</div>}
      {d.history.length > 0 && <details class="hist"><summary class="faint">Note history ({d.history.length})</summary>{d.history.map(h => <div class="s">{fmtDay(h.day)}{h.stage ? ' · ' + h.stage : ''} — {h.notes || h.deal}</div>)}</details>}
    </div>
    <div class="acts"><Btn onClick={onEdit}>Edit</Btn>
      <IconBtn icon="dots" title="More" onClick={e => openMenu(e, [
        { label: 'Mark renewed', fn: () => { markRenewed(d); toast('Marked renewed'); } },
        { label: 'Set activation date', fn: () => { const v = prompt('Activation date (YYYY-MM-DD)', r.activation); if (v && isKey(v.trim())) put('billing', d.id, { activation: v.trim() }); } },
        { label: 'Set due date', fn: () => { const v = prompt('Next due date (YYYY-MM-DD)', r.due); if (v != null) put('billing', d.id, { due: v.trim() || undefined }); } },
        { label: 'Keep as a separate deal', fn: () => put('entries', d.id, { noMerge: true }) },
      ])} />
      <DangerBtn onConfirm={() => { removeEntry(d.id); toast('Deal deleted', { label: 'Undo', fn: () => import('../data/store').then(m => m.restore('entries', d.id)) }); }}>Delete</DangerBtn></div>
  </div>;
}
function RenewList({ title, items }: { title: string; items: { d: WonDeal; r: ReturnType<typeof renewalOf> }[] }) {
  return <Sheet title={title} onClose={closeModal}>{items.length ? items.sort((a, b) => (a.r.due < b.r.due ? -1 : 1)).map(x => <div class="item"><div class="main"><div class="t">{x.d.deal}</div><div class="s">{planLabel(x.d)} · {priceText(x.d)} · due {fmtDay(x.r.due)}</div></div><Btn onClick={() => { markRenewed(x.d); toast('Marked renewed'); }}>Mark renewed</Btn></div>) : <Empty>Nothing here.</Empty>}</Sheet>;
}
export { parsePrice, getDay };
