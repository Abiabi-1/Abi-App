// Dashboard and Analytics – every number uses the shared data box; every tile and bar opens its records.
import { signal } from '@preact/signals';
import type { JSX } from 'preact';
import { rev } from '../data/store';
import { deals, wonDeals, lostDeals, tickets, isClosedT, allTasks, renewalOf, lostValue, bestHours } from '../domain/crm';
import { DEAL_STAGES, WON, LOST, entriesOf, allEntryDays, daysWithEntries, Entry, entryText, planLabel, normPlan, PLANS, stageTone } from '../domain/dayend';
import { calc, status } from '../domain/hr';
import { addDays, csv, download, dur, fmtDay, fmtNum, keyOf, parseKey, todayKey, MONTHS } from '../lib/util';
import { Btn, Empty, PageHead, Seg, Sheet, Stat, Tiles, closeModal, openModal } from '../ui/kit';
import { Bars, Columns } from '../ui/charts';
import { go } from '../ui/state';

function listSheet(title: string, rows: { t: string; s?: string; go?: () => void }[]) {
  openModal(() => <Sheet title={title + ' (' + rows.length + ')'} onClose={closeModal} foot={<Btn icon="down" onClick={() => download(title.toLowerCase().replace(/\W+/g, '-') + '.csv', csv([['Item', 'Details'], ...rows.map(r => [r.t, r.s || ''])]))}>CSV</Btn>}>
    {rows.length ? rows.map(r => <div class="item" style={{ cursor: r.go ? 'pointer' : 'default' }} onClick={() => { if (r.go) { closeModal(); r.go(); } }}><div class="main"><div class="t">{r.t}</div>{r.s && <div class="s">{r.s}</div>}</div></div>) : <Empty>Nothing here.</Empty>}
  </Sheet>);
}
const entryRow = (e: Entry) => ({ t: e.deal || entryText(e).slice(0, 80) || '(entry)', s: fmtDay(e.day) + ' · ' + e.hk + (e.stage ? ' · ' + e.stage : ''), go: () => { import('./dayend').then(m => { m.selDay.value = e.day; go('day'); }); } });

export function Dashboard() {
  void rev.value; const td = todayKey(), te = entriesOf(td), st = status(), c = calc(st.key);
  const tasks = allTasks().filter(t => !t.done), due = tasks.filter(t => t.due && t.due <= td);
  const tOpen = tickets().filter(t => !isClosedT(t)), D = deals(), W = wonDeals(), L = lostDeals();
  const wonM = W.filter(w => w.day.slice(0, 7) === td.slice(0, 7)), lostM = L.filter(l => l.kind === 'lost' && l.day.slice(0, 7) === td.slice(0, 7));
  const mrr = W.reduce((n, w) => n + renewalOf(w).mrr, 0), ren30 = W.filter(w => { const r = renewalOf(w); return r.due && r.due >= td && r.due <= addDays(td, 30); });
  const follow = D.filter(d => d.follow && d.follow <= td);
  const byStage = DEAL_STAGES.map(s => ({ k: s, label: s, v: D.filter(d => d.stage === s).length }));
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(td, i - 13)).map(k => ({ k, label: k.slice(8), v: entriesOf(k).length }));
  return <div class="page">
    <PageHead icon="dash" title="Dashboard" sub={fmtDay(td, true)} />
    <div class="h2">Today</div>
    <Tiles>
      <Stat l="Entries today" v={te.length} tone={te.length ? 'acc' : ''} c={te.filter(e => e.sk === 'tasks').length + ' tasks · ' + te.filter(e => e.sk === 'calls').length + ' calls'} onClick={() => go('day')} />
      <Stat l="Tasks due" v={due.length} tone={due.length ? 'bad' : ''} c={tasks.length + ' open'} onClick={() => go('tasks')} />
      <Stat l="Open tickets" v={tOpen.length} onClick={() => go('tickets')} />
      <Stat l="Worked" v={c.n ? dur(c.worked, true) : '—'} c={st.state === 'out' ? 'clocked out' : st.state === 'break' ? 'on break' : 'clocked in'} onClick={() => go('hr')} />
    </Tiles>
    <div class="h2">Deals</div>
    <Tiles>
      <Stat l="Won this month" v={wonM.length} tone={wonM.length ? 'good' : ''} onClick={() => listSheet('Won this month', wonM.map(w => ({ t: w.deal, s: fmtDay(w.day) + ' · ' + planLabel(w), go: () => go('deals') })))} />
      <Stat l="Win rate (month)" v={wonM.length + lostM.length ? Math.round((wonM.length / (wonM.length + lostM.length)) * 100) + '%' : '–'} c={lostM.length + ' lost'} />
      <Stat l="MRR" v={'$' + fmtNum(mrr)} c={'ARR $' + fmtNum(mrr * 12)} onClick={() => go('deals')} />
      <Stat l="Renewals in 30 days" v={ren30.length} tone={ren30.length ? 'acc' : ''} onClick={() => listSheet('Renewals in 30 days', ren30.map(w => ({ t: w.deal, s: 'due ' + fmtDay(renewalOf(w).due) })))} />
      <Stat l="Follow-ups due" v={follow.length} onClick={() => listSheet('Follow-ups due', follow.map(d => ({ t: d.name, s: 'follow-up ' + fmtDay(d.follow), go: () => go('dealboard', d.key) })))} />
    </Tiles>
    <div class="grid2" style={{ marginTop: '12px' }}>
      <div class="card"><div class="lbl">Deals per stage</div><Bars data={byStage} onPick={k => listSheet(k, D.filter(d => d.stage === k).map(d => ({ t: d.name, s: planLabel(d), go: () => go('dealboard', d.key) })))} /></div>
      <div class="card"><div class="lbl">Entries, last 14 days</div><Columns data={last14} onPick={k => listSheet(fmtDay(k), entriesOf(k).map(entryRow))} /></div>
    </div>
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
    <div class="ctl"><Seg value={r} onChange={x => { R.value = x; }} opts={[['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['month', 'This month'], ['year', 'This year'], ['all', 'All time']]} /></div>
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
