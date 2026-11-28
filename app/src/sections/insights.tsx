// Dashboard and Analytics – every number uses the shared data box; every tile and bar opens its records.
import { signal } from '@preact/signals';
import type { JSX } from 'preact';
import { rev } from '../data/store';
import { deals, wonDeals, lostDeals, tickets, isClosedT, allTasks, renewalOf, lostValue, bestHours } from '../domain/crm';
import { DEAL_STAGES, WON, LOST, entriesOf, allEntryDays, daysWithEntries, Entry, entryText, planLabel, normPlan, PLANS, stageTone } from '../domain/dayend';
import { calc, status } from '../domain/hr';
import { addDays, csv, download, dur, fmtDay, fmtNum, keyOf, parseKey, todayKey, MONTHS } from '../lib/util';
import { Btn, Empty, PageHead, Seg, Sheet, Stat, Tiles, closeModal, openModal, toast } from '../ui/kit';
import { buildXlsx, XLSX_MIME } from '../lib/xlsx';
import { copyText } from '../lib/util';
import { Bars, Columns } from '../ui/charts';
import { go, isPhone } from '../ui/state';
import { DashCustomize, DashWidgets, dashOrder, dashHidden, SavedReports } from './dashbuild';

function listSheet(title: string, rows: { t: string; s?: string; go?: () => void }[]) {
  openModal(() => <Sheet title={title + ' (' + rows.length + ')'} onClose={closeModal} foot={<Btn icon="down" onClick={() => download(title.toLowerCase().replace(/\W+/g, '-') + '.csv', csv([['Item', 'Details'], ...rows.map(r => [r.t, r.s || ''])]))}>CSV</Btn>}>
    {rows.length ? rows.map(r => <div class="item" style={{ cursor: r.go ? 'pointer' : 'default' }} onClick={() => { if (r.go) { closeModal(); r.go(); } }}><div class="main"><div class="t">{r.t}</div>{r.s && <div class="s">{r.s}</div>}</div></div>) : <Empty>Nothing here.</Empty>}
  </Sheet>);
}
const entryRow = (e: Entry) => ({ t: e.deal || entryText(e).slice(0, 80) || '(entry)', s: fmtDay(e.day) + ' · ' + e.hk + (e.stage ? ' · ' + e.stage : ''), go: () => { import('./dayend').then(m => { m.selDay.value = e.day; go('day'); }); } });

const DP = signal<'all' | 'today' | '7' | 'month'>('month');
const inDP = (k: string) => { const td = todayKey(), p = DP.value; return p === 'all' || (p === 'today' ? k === td : p === '7' ? k > addDays(td, -7) && k <= td : k.slice(0, 7) === td.slice(0, 7)); };
const DPL: Record<string, string> = { all: 'All time', today: 'Today', '7': 'Last 7 days', month: 'This month' };
/** Daily / weekly report text (as the old Dashboard's "Daily and weekly report"). */
export function summaryRows(keys: string[]) {
  return keys.map(k => { const e = entriesOf(k), c = calc(k), W = wonDeals().filter(w => w.day === k), L = lostDeals().filter(l => l.day === k), done = allTasks().filter(t => t.done && t.doneAt && keyOf(new Date(t.doneAt)) === k).length;
    return { k, tasks: e.filter(x => x.sk === 'tasks').length, calls: e.filter(x => x.sk === 'calls').length, wa: e.filter(x => x.sk === 'whatsapp').length, tickets: e.filter(x => x.sk === 'tickets').length, other: e.filter(x => x.sk === 'other').length, won: W.length, wonUsd: W.reduce((n, w) => n + (parseFloat(w.price) || 0), 0), lost: L.length, done, worked: c.n ? dur(c.worked, true) : '' }; });
}
export function summaryText(kind: 'daily' | 'weekly') {
  const td = todayKey(), keys = kind === 'daily' ? [td] : Array.from({ length: 7 }, (_, i) => addDays(td, i - 6)), R = summaryRows(keys);
  const L = [(kind === 'daily' ? 'Daily report — ' + fmtDay(td, true) : 'Weekly report — ' + fmtDay(keys[0]) + ' to ' + fmtDay(td)), ''];
  R.forEach(r => { if (kind === 'weekly') L.push('▸ ' + fmtDay(r.k)); L.push('Entries: ' + (r.tasks + r.calls + r.wa + r.tickets + r.other) + ' (Tasks ' + r.tasks + ' · Calls ' + r.calls + ' · WA ' + r.wa + ' · Tickets ' + r.tickets + ' · Other ' + r.other + ')'); L.push('Won deals: ' + r.won + (r.wonUsd ? ' ($' + fmtNum(r.wonUsd) + ')' : '') + ' · Lost: ' + r.lost + ' · Tasks done: ' + r.done + (r.worked ? ' · Worked: ' + r.worked : '')); L.push(''); });
  if (kind === 'weekly') { const t = R.reduce((a, r) => ({ e: a.e + r.tasks + r.calls + r.wa + r.tickets + r.other, w: a.w + r.won, l: a.l + r.lost, d: a.d + r.done }), { e: 0, w: 0, l: 0, d: 0 }); L.push('─────────────────────', 'Week totals', 'Entries: ' + t.e + ' · Won: ' + t.w + ' · Lost: ' + t.l + ' · Tasks done: ' + t.d); }
  return { text: L.join('\n'), rows: R };
}
function sumXlsx(kind: 'daily' | 'weekly') { const { rows } = summaryText(kind); download(kind + '-report-' + todayKey() + '.xlsx', buildXlsx([['Day', 'Tasks', 'Calls', 'WhatsApp', 'Tickets', 'Other', 'Won deals', 'Won (USD)', 'Lost', 'Tasks done', 'Worked'], ...rows.map(r => [r.k, r.tasks, r.calls, r.wa, r.tickets, r.other, r.won, r.wonUsd, r.lost, r.done, r.worked])], [12, 8, 8, 10, 8, 8, 10, 10, 8, 10, 10], 'Report'), XLSX_MIME); toast('Excel file downloaded'); }
export function Dashboard() {
  void rev.value; const td = todayKey(), te = entriesOf(td), st = status(), c = calc(st.key);
  const tasks = allTasks().filter(t => !t.done), due = tasks.filter(t => t.due && t.due <= td);
  const tOpen = tickets().filter(t => !isClosedT(t)), D = deals(), W = wonDeals(), L = lostDeals();
  const wonM = W.filter(w => inDP(w.day)), lostM = L.filter(l => l.kind === 'lost' && inDP(l.day));
  const mrr = W.reduce((n, w) => n + renewalOf(w).mrr, 0), ren30 = W.filter(w => { const r = renewalOf(w); return r.due && r.due >= td && r.due <= addDays(td, 30); });
  const follow = D.filter(d => d.follow && d.follow <= td);
  const byStage = DEAL_STAGES.map(s => ({ k: s, label: s, v: D.filter(d => d.stage === s).length }));
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(td, i - 13)).map(k => ({ k, label: k.slice(8), v: entriesOf(k).length }));
  return <div class="page">
    <PageHead icon="dash" title="Dashboard" sub={fmtDay(td, true)} right={<><Btn icon="gear" onClick={() => openModal(() => <DashCustomize />)}>{isPhone.value ? '' : 'Customize'}</Btn><select class="in" style={{ width: 'auto' }} aria-label="Period" value={DP.value} onChange={e => { DP.value = (e.target as HTMLSelectElement).value as any; }}>{Object.keys(DPL).map(k => <option value={k}>{DPL[k]}</option>)}</select></>} />
    {dashOrder().map(id => { if (dashHidden().indexOf(id) >= 0) return null; switch (id) {
      case 'today': return <>
    <div class="h2">Today</div>
    <Tiles>
      <Stat l="Entries today" v={te.length} tone={te.length ? 'acc' : ''} c={te.filter(e => e.sk === 'tasks').length + ' tasks · ' + te.filter(e => e.sk === 'calls').length + ' calls'} onClick={() => go('day')} />
      <Stat l="Tasks due" v={due.length} tone={due.length ? 'bad' : ''} c={tasks.length + ' open'} onClick={() => go('tasks')} />
      <Stat l="Open tickets" v={tOpen.length} onClick={() => go('tickets')} />
      <Stat l="Worked" v={c.n ? dur(c.worked, true) : '—'} c={st.state === 'out' ? 'clocked out' : st.state === 'break' ? 'on break' : 'clocked in'} onClick={() => go('hr')} />
    </Tiles>
      </>;
      case 'deals': return <>
    <div class="h2">Deals</div>
    <Tiles>
      <Stat l={'Won · ' + DPL[DP.value]} v={wonM.length} tone={wonM.length ? 'good' : ''} onClick={() => listSheet('Won · ' + DPL[DP.value], wonM.map(w => ({ t: w.deal, s: fmtDay(w.day) + ' · ' + planLabel(w), go: () => go('deals') })))} />
      <Stat l={'Win rate · ' + DPL[DP.value]} v={wonM.length + lostM.length ? Math.round((wonM.length / (wonM.length + lostM.length)) * 100) + '%' : '–'} c={lostM.length + ' lost'} />
      <Stat l="MRR" v={'$' + fmtNum(mrr)} c={'ARR $' + fmtNum(mrr * 12)} onClick={() => go('deals')} />
      <Stat l="Renewals in 30 days" v={ren30.length} tone={ren30.length ? 'acc' : ''} onClick={() => listSheet('Renewals in 30 days', ren30.map(w => ({ t: w.deal, s: 'due ' + fmtDay(renewalOf(w).due) })))} />
      <Stat l="Follow-ups due" v={follow.length} onClick={() => listSheet('Follow-ups due', follow.map(d => ({ t: d.name, s: 'follow-up ' + fmtDay(d.follow), go: () => go('dealboard', d.key) })))} />
    </Tiles>
      </>;
      case 'charts': return <>
    <div class="grid2" style={{ marginTop: '12px' }}>
      <div class="card"><div class="lbl">Deals per stage</div><Bars data={byStage} onPick={k => listSheet(k, D.filter(d => d.stage === k).map(d => ({ t: d.name, s: planLabel(d), go: () => go('dealboard', d.key) })))} /></div>
      <div class="card"><div class="lbl">Entries, last 14 days</div><Columns data={last14} onPick={k => listSheet(fmtDay(k), entriesOf(k).map(entryRow))} /></div>
    </div>
      </>;
      case 'reports': return <>
    <div class="grid2" style={{ marginTop: '12px' }}>{(['daily', 'weekly'] as const).map(kind => { const t = summaryText(kind).text; return <div><div class="h2">{kind === 'daily' ? 'Daily report' : 'Weekly report'}<span class="r"><Btn icon="copy" onClick={async () => toast((await copyText(t)) ? 'Copied' : 'Copy failed')}>Copy</Btn><Btn icon="down" onClick={() => download(kind + '-report-' + todayKey() + '.txt', t)}>Download</Btn><Btn onClick={() => sumXlsx(kind)}>Excel</Btn></span></div><pre class="rep">{t}</pre></div>; })}</div>
      </>;
      case 'widgets': return <DashWidgets />;
      default: return null; } })}
  </div>;
}

type Range = '7' | '30' | '90' | 'month' | 'year' | 'all';
const R = signal<Range>('30');
function rangeKeys(r: Range): [string, string] { const td = todayKey(); if (r === 'all') return ['0000', '9999']; if (r === 'month') return [td.slice(0, 7) + '-01', td]; if (r === 'year') return [td.slice(0, 4) + '-01-01', td]; return [addDays(td, -(+r - 1)), td]; }
export function Analytics() {
  void rev.value; const r = R.value, [from, to] = rangeKeys(r), inR = (k: string) => k >= from && k <= to;
  const keys = daysWithEntries().filter(inR), ents: Entry[] = []; keys.forEach(k => entriesOf(k).forEach(e => ents.push(e)));
  const tasksE = ents.filter(e => e.sk === 'tasks');
  const D = deals(), W = wonDeals().filter(w => inR(w.day)), L = lostDeals().filter(l => inR(l.day));
  // funnel: deals that reached a stage or went further
  const FUN = ['Lead', 'Interested', 'Demo Completed', 'Going Live', WON];
  const reached = (d: typeof D[number], s: string) => { const order = FUN.indexOf(s); const sts = new Set([d.stage, ...d.entries.map(e => e.stage || '')]); return FUN.some((x, i) => i >= order && sts.has(x)); };
  const Dr = D.filter(d => inR(keyOf(new Date(d.first || d.ts || 0))));
  const funnel = FUN.map((s, i) => { const v = Dr.filter(d => reached(d, s)).length; const prev = i ? Dr.filter(d => reached(d, FUN[i - 1])).length : 0; return { k: s, label: s, v, note: i && prev ? Math.round((v / prev) * 100) + '% of ' + FUN[i - 1] : undefined }; });
  // activity per day
  let days: string[] = []; if (keys.length) { let k = r === 'all' ? keys[0] : from; while (k <= to && days.length < 400) { days.push(k); k = addDays(k, 1); } }
  const perDay = days.map(k => ({ k, label: String(+k.slice(8)), v: entriesOf(k).length }));
  const plans = PLANS.map(p => ({ k: p, label: p, v: W.filter(w => normPlan(w.plan) === p).length }));
  const reasons: Record<string, number> = {}; L.forEach(l => { const x = l.reason || 'No reason'; reasons[x] = (reasons[x] || 0) + 1; });
  const hours = bestHours(); const hcount: Record<number, number> = {}; tasksE.forEach(e => { const h = e.at ? new Date(e.at).getHours() : parseInt(e.hk, 10); hcount[h] = (hcount[h] || 0) + 1; });
  const hourData = Object.keys(hcount).map(Number).sort((a, b) => a - b).map(h => ({ k: String(h), label: (h % 12 || 12) + (h < 12 ? 'am' : 'pm'), v: hcount[h] }));
  const won = W.length, lost = L.filter(l => l.kind === 'lost').length, valWon = W.reduce((n, w) => n + (parseFloat(w.price) || 0), 0), valLost = L.reduce((n, l) => n + lostValue(l), 0);
  const avgClose = (() => { const a = D.filter(d => d.stage === WON && d.first && d.ts).map(d => (d.ts - d.first) / 864e5); return a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0; })();
  const exportAll = () => download('analytics-' + r + '.csv', csv([['Day', 'Entries', 'Tasks', 'Calls', 'WhatsApp', 'Tickets', 'Other'], ...days.map(k => { const e = entriesOf(k); return [k, e.length, ...(['tasks', 'calls', 'whatsapp', 'tickets', 'other'] as const).map(s => e.filter(x => x.sk === s).length)]; })]));
  return <div class="page">
    <PageHead icon="chart" title="Analytics" sub="Press any bar or number to see the records behind it." right={<Btn icon="down" onClick={exportAll}>CSV</Btn>} />
    <div class="ctl" style={{ flexWrap: 'wrap' }}><Seg value={r} onChange={x => { R.value = x; }} opts={[['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['month', 'This month'], ['year', 'This year'], ['all', 'All time']]} /><SavedReports cur={r} apply={x => { R.value = x as Range; }} /></div>
    <Tiles>
      <Stat l="Entries" v={ents.length} c={keys.length + ' days logged'} tone="acc" onClick={() => listSheet('Entries', ents.slice(-300).reverse().map(entryRow))} />
      <Stat l="Lead → Closed Won" v={funnel[0].v ? Math.round((funnel[4].v / funnel[0].v) * 100) + '%' : '–'} c={funnel[4].v + ' of ' + funnel[0].v + ' deals'} />
      <Stat l="Won" v={won} tone={won ? 'good' : ''} c={'$' + fmtNum(valWon)} onClick={() => listSheet('Won', W.map(w => ({ t: w.deal, s: fmtDay(w.day) + ' · ' + planLabel(w) })))} />
      <Stat l="Lost" v={lost} tone={lost ? 'bad' : ''} c={'$' + fmtNum(valLost) + ' lost'} onClick={() => go('lost')} />
      <Stat l="Typical time to close" v={avgClose + ' days'} c="first entry → won" />
    </Tiles>
    <div class="grid2" style={{ marginTop: '12px' }}>
      <div class="card"><div class="lbl">Entries per day</div>{perDay.length ? <Columns data={perDay} onPick={k => listSheet(fmtDay(k), entriesOf(k).map(entryRow))} /> : <Empty>No entries in this range.</Empty>}</div>
      <div class="card"><div class="lbl">Pipeline funnel</div><Bars data={funnel} total={funnel[0].v} onPick={k => listSheet(k, Dr.filter(d => reached(d, k)).map(d => ({ t: d.name, s: d.stage, go: () => go('dealboard', d.key) })))} /><p class="faint" style={{ fontSize: '.72rem', margin: '6px 0 0' }}>Each bar counts deals that reached that stage or went further.</p></div>
      <div class="card"><div class="lbl">Closed plans</div><Bars data={plans} onPick={k => listSheet(k, W.filter(w => normPlan(w.plan) === k).map(w => ({ t: w.deal, s: fmtDay(w.day) + ' · ' + planLabel(w) })))} /></div>
      <div class="card"><div class="lbl">Why deals are lost</div><Bars data={Object.keys(reasons).sort((a, b) => reasons[b] - reasons[a]).map(x => ({ k: x, label: x, v: reasons[x] }))} onPick={k => listSheet(k, L.filter(l => (l.reason || 'No reason') === k).map(l => ({ t: l.deal, s: fmtDay(l.day) })))} /></div>
      <div class="card"><div class="lbl">Task entries by hour</div>{hourData.length ? <Columns data={hourData} /> : <Empty>No entries.</Empty>}<p class="faint" style={{ fontSize: '.72rem', margin: '6px 0 0' }}>Best hours (not “no answer”): {hours.slice(0, 3).map(h => (h % 12 || 12) + (h < 12 ? 'am' : 'pm')).join(', ') || '—'}</p></div>
      <div class="card"><div class="lbl">Activity mix</div><Bars data={(['tasks', 'calls', 'whatsapp', 'tickets', 'other'] as const).map(s => ({ k: s, label: { tasks: 'Tasks Completed', calls: 'Support Calls', whatsapp: 'Whatsapp Inquiries', tickets: 'Tickets Attended', other: 'Other' }[s], v: ents.filter(e => e.sk === s).length }))} onPick={k => listSheet(k, ents.filter(e => e.sk === k).map(entryRow))} /></div>
    </div>
  </div>;
}
export const _unused: (JSX.Element | string | number | typeof MONTHS | typeof stageTone | typeof parseKey | typeof allEntryDays)[] = [];
