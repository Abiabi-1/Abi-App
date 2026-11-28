// HR & Time (Round 61): every tab of the old HR module. The clock / attendance / settings core is the Round 57 code (HR in more.tsx).
import { useEffect, useState } from 'preact/hooks';
import { rev, put, get, all, del } from '../data/store';
import { calc, hrSet, isWork, otMs, lateMin, weekKeys, setFor, t as hrT, HR_DEF } from '../domain/hr';
import { C, TABS, TAB_LISTS, HRC, hrItems, balances, holiday, leaveOn, payCalc, payslipText, money, audit, auditLog, tsState, setTs, timer, startTimer, stopTimer, trackMs, hrAnalytics, leaveDays } from '../domain/hrlists';
import { CollList, editItem } from '../features/coll';
import { addDays, clock, copyText, csv, download, dur, fmtDay, MONTHS, todayKey, uid, cx, minToTime } from '../lib/util';
import { Btn, Empty, Field, IconBtn, PageHead, Sheet, Stat, Switch, Tiles, closeModal, openModal, toast } from '../ui/kit';
import { Columns } from '../ui/charts';
import { route, go } from '../ui/state';
import { HR } from './more';

const mLabel = (m: string) => { const [y, mo] = m.split('-'); return MONTHS[+mo - 1] + ' ' + y; };
const shiftMonth = (m: string, n: number) => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const setHr = (p: Record<string, unknown>, what?: string) => { put('cfg', 'hr', p); if (what) audit(what, 'settings'); };

export function HRPage() {
  void rev.value; const tab = route.value.t === 'hr' && route.value.id && TABS.some(t => t[0] === route.value.id) ? route.value.id : 'dash';
  const label = TABS.find(t => t[0] === tab)![1];
  return <div class="page">
    <PageHead icon="hr" title="HR & Time" sub={label} />
    <div class="row-scroll hr-tabs" role="tablist" aria-label="HR sections">{TABS.map(([k, l]) => <button type="button" role="tab" aria-selected={k === tab} class={cx('chip', k === tab && 'on')} onClick={() => go('hr', k)}>{l}</button>)}</div>
    <div class="hr-body" data-tab={tab}><TabBody tab={tab} /></div>
  </div>;
}
function TabBody({ tab }: { tab: string }) {
  if (TAB_LISTS[tab]) return <>{tab === 'leave' && <LeaveBalances />}{tab === 'rota' && <RotaWeek />}{TAB_LISTS[tab].map((c, i) => <>{TAB_LISTS[tab].length > 1 && <div class={cx('h2', i === 0 && 'first')}>{C[c].label}</div>}<CollList def={C[c]} c={HRC} col={c} onSaved={(_, v) => audit((C[c].label) + ': ' + String(v[C[c].ttl] || ''), 'saved')} extra={tab === 'leave' ? (x => <span class="faint" style={{ fontSize: '.72rem' }}>{leaveDays(x)} working day{leaveDays(x) === 1 ? '' : 's'}</span>) : undefined} /></>)}</>;
  switch (tab) {
    case 'dash': return <><HR part="dash" /><div class="h2">Leave balances · {new Date().getFullYear()}</div><LeaveBalances /><UpcomingHr /></>;
    case 'att': return <HR part="att" />;
    case 'ts': return <Timesheet />;
    case 'trk': return <Tracker />;
    case 'sched': return <Schedule />;
    case 'pay': return <Pay />;
    case 'slips': return <Slips />;
    case 'an': return <HrAnalytics />;
    case 'audit': return <Audit />;
    case 'set': return <HR part="set" />;
    default: return <Empty>Unknown tab.</Empty>;
  }
}

function LeaveBalances() {
  const B = balances();
  return <Tiles>{B.map(b => <Stat l={b.t.name} v={String(b.left)} c={'of ' + (b.ent + b.carry) + (b.carry ? ' (incl. ' + b.carry + ' carried)' : '') + ' · used ' + b.used + (b.pend ? ' · pending ' + b.pend : '')} tone={b.left < 0 ? 'bad' : ''} onClick={() => go('hr', 'leave')} />)}</Tiles>;
}
function UpcomingHr() {
  const td = todayKey(), soon = addDays(td, 30);
  const rows: { t: string; s: string; tab: string }[] = [];
  hrItems('holidays').filter(h => h.date >= td && h.date <= soon).forEach(h => rows.push({ t: h.name, s: fmtDay(h.date) + ' · holiday', tab: 'hol' }));
  hrItems('leave').filter(l => l.from >= td && l.from <= soon && l.status !== 'Rejected' && l.status !== 'Cancelled').forEach(l => rows.push({ t: l.type, s: fmtDay(l.from) + (l.to && l.to !== l.from ? ' – ' + fmtDay(l.to) : '') + ' · ' + l.status, tab: 'leave' }));
  [...hrItems('docs').map(d => ({ d, k: 'expires', tab: 'docs', n: d.title })), ...hrItems('benefits').map(d => ({ d, k: 'renews', tab: 'ben', n: d.name }))].filter(x => x.d[x.k] && x.d[x.k] <= soon).forEach(x => rows.push({ t: x.n, s: (x.d[x.k] < td ? 'expired ' : 'expires ') + fmtDay(x.d[x.k]), tab: x.tab }));
  if (!rows.length) return null;
  return <><div class="h2">Next 30 days</div>{rows.map(r => <div class="item" style={{ cursor: 'pointer' }} onClick={() => go('hr', r.tab)}><div class="main"><div class="t">{r.t}</div><div class="s">{r.s}</div></div></div>)}</>;
}

// ---------- timesheets ----------
function Timesheet() {
  const [wk, setWk] = useState(todayKey()); const w = weekKeys(wk), st = tsState(w[0]);
  const rows = w.map(k => { const c = calc(k), lv = leaveOn(k), note = holiday(k) || (lv ? lv.type : '') || (!isWork(k) ? 'Day off' : c.missed ? 'Missing out' : lateMin(k, c) ? 'Late ' + lateMin(k, c) + 'm' : ''); return { k, c, ot: otMs(k, c), note, mine: (get<any>('tsnotes', k)?.note as string) || '' }; });
  const tot = rows.reduce((a, r) => ({ w: a.w + r.c.worked, o: a.o + r.ot }), { w: 0, o: 0 }), locked = st.st === 'approved';
  const text = () => ['Timesheet ' + fmtDay(w[0]) + ' – ' + fmtDay(w[6]), ...rows.filter(r => r.c.n).map(r => fmtDay(r.k) + ': ' + hrT(r.c.first) + ' – ' + (r.c.last ? hrT(r.c.last) : '?') + ' · breaks ' + dur(r.c.brk, true) + ' · worked ' + dur(r.c.worked, true) + (r.ot ? ' · OT ' + dur(r.ot, true) : '') + (r.mine ? ' · ' + r.mine : '')), 'Total: ' + dur(tot.w, true) + ' · OT ' + dur(tot.o, true)].join('\n');
  return <>
    <div class="ctl"><IconBtn icon="left" title="Previous week" onClick={() => setWk(addDays(wk, -7))} /><b>{fmtDay(w[0])} – {fmtDay(w[6])}</b><IconBtn icon="right" title="Next week" onClick={() => setWk(addDays(wk, 7))} /><span class={cx('pill', st.st === 'approved' ? 'good' : st.st === 'submitted' ? 'acc' : '')}>{st.st}</span></div>
    <div class="tw"><table class="table"><thead><tr><th>Day</th><th>In</th><th>Out</th><th>Breaks</th><th>Worked</th><th>OT</th><th>Note</th><th>My note</th></tr></thead><tbody>
      {rows.map(r => <tr><td>{fmtDay(r.k)}</td><td class="mono">{r.c.first ? hrT(r.c.first) : ''}</td><td class="mono">{r.c.last ? hrT(r.c.last) : ''}</td><td class="mono">{r.c.n ? dur(r.c.brk, true) : ''}</td><td class="mono">{r.c.n ? dur(r.c.worked, true) : ''}</td><td class="mono">{r.ot ? dur(r.ot, true) : ''}</td><td>{r.note}</td>
        <td><input class="in ts-note" aria-label={'Note for ' + r.k} disabled={locked} value={r.mine} onChange={e => put('tsnotes', r.k, { note: (e.target as HTMLInputElement).value })} /></td></tr>)}
      <tr class="tot"><td>Total</td><td /><td /><td /><td class="mono">{dur(tot.w, true)}</td><td class="mono">{dur(tot.o, true)}</td><td colSpan={2}>target {hrSet().weekH}h</td></tr>
    </tbody></table></div>
    <div class="ctl" style={{ marginTop: '10px', flexWrap: 'wrap' }}>
      <Btn icon="copy" onClick={() => { copyText(text()); toast('Timesheet copied'); }}>Copy</Btn>
      <Btn icon="down" onClick={() => download('timesheet-' + w[0] + '.csv', csv([['Day', 'In', 'Out', 'Breaks', 'Worked', 'OT', 'Note', 'My note'], ...rows.map(r => [r.k, r.c.first ? hrT(r.c.first) : '', r.c.last ? hrT(r.c.last) : '', dur(r.c.brk, true), dur(r.c.worked, true), r.ot ? dur(r.ot, true) : '', r.note, r.mine])]))}>CSV</Btn>
      {st.st === 'draft' && <button type="button" class="b-add" onClick={() => setTs(w[0], 'submitted')}>Submit week</button>}
      {st.st === 'submitted' && <><button type="button" class="b-add" onClick={() => setTs(w[0], 'approved')}>Approve &amp; lock</button><Btn onClick={() => setTs(w[0], 'draft')}>Back to draft</Btn></>}
      {st.st === 'approved' && <Btn onClick={() => setTs(w[0], 'draft')}>Unlock</Btn>}
    </div>
    {st.at && <div class="faint" style={{ fontSize: '.74rem' }}>{st.st} · {new Date(st.at).toLocaleString()}</div>}
  </>;
}

// ---------- time tracker ----------
function Tracker() {
  const [, tick] = useState(0); useEffect(() => { const i = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(i); }, []);
  const T = timer(), [p, setP] = useState(''), [task, setTask] = useState(''), projs = hrItems('projects');
  const ent = hrItems('tracker'), cut = addDays(todayKey(), -30), tot: Record<string, { ms: number; amt: number }> = {};
  ent.forEach(e => { if ((e.date || '') < cut) return; const ms = trackMs(e), k = e.project && e.project !== '(no project)' ? e.project : '(no project)', pr = projs.find(x => x.name === e.project); const o = tot[k] = tot[k] || { ms: 0, amt: 0 }; o.ms += ms; if (pr && pr.billable === 'Billable') o.amt += ms / 36e5 * (+pr.rate || 0); });
  return <>
    {T ? <div class="card tex hr-clock"><div><div class="lbl">Running · {T.project || 'No project'}{T.task ? ' · ' + T.task : ''}</div><div class="mono hr-big">{clock(Date.now() - T.start)}</div><div class="faint">Started {hrT(T.start)}</div></div><div class="ctl" style={{ marginLeft: 'auto', marginBottom: 0 }}><Btn icon="stop" onClick={() => { stopTimer(); toast('Time saved'); }}>Stop</Btn></div></div>
      : <div class="ctl" style={{ flexWrap: 'wrap' }}><select class="in" style={{ width: 'auto' }} aria-label="Project" value={p} onChange={e => setP((e.target as HTMLSelectElement).value)}><option value="">(no project)</option>{projs.map(x => <option>{x.name}</option>)}</select><input class="in grow" placeholder="What are you working on?" value={task} onInput={e => setTask((e.target as HTMLInputElement).value)} /><button type="button" class="b-add" onClick={() => { startTimer(p, task); setTask(''); }}>Start timer</button></div>}
    {Object.keys(tot).length > 0 && <><div class="h2">Last 30 days</div><Tiles>{Object.keys(tot).map(k => <Stat l={k} v={dur(tot[k].ms, true)} c={tot[k].amt ? money(tot[k].amt) + ' billable' : ''} />)}</Tiles></>}
    <div class="h2">Tracked time</div>
    <CollList def={C.tracker} c={HRC} col="tracker" addLabel="Add time manually" extra={x => <span class="faint mono" style={{ fontSize: '.72rem' }}>{dur(trackMs(x), true)}</span>} />
    <div class="h2">Projects</div>
    <CollList def={C.projects} c={HRC} col="projects" />
  </>;
}

// ---------- weekly schedule ----------
const DOWS: [number, string][] = [[1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday'], [6, 'Saturday'], [0, 'Sunday']];
function Schedule() {
  const S = hrSet(), sc = { ...(S.sched || {}) };
  const offOf = (n: number) => { const r = sc[n] || {}; return r.off === true || (r.off == null && S.week.indexOf(n) < 0); };
  const save = (n: number, p: Record<string, unknown>, what?: string) => { const r = { s: S.shiftStart, e: S.shiftEnd, ...(sc[n] || {}), ...p }; setHr({ sched: { ...sc, [n]: r } }, what); };
  const [dk, setDk] = useState(todayKey()), [ds, setDs] = useState(S.shiftStart), [de, setDe] = useState(S.shiftEnd);
  const keys = Array.from(new Set([...Object.keys(S.dayoff || {}), ...Object.keys(S.dayshift || {})])).sort();
  return <>
    <p class="faint" style={{ fontSize: '.78rem', marginTop: 0 }}>Set a shift for each day of the week, or mark a day as Off. Attendance, lateness and overtime use this. A date-specific shift or off day wins over it.</p>
    {DOWS.map(([n, l]) => { const off = offOf(n), r = sc[n] || {}; return <div class={cx('item sched-row', off && 'done')}><div class="main"><div class="t">{l}</div></div>
      <Btn on={!off} onClick={() => save(n, { off: !off }, (off ? 'Working: ' : 'Set off: ') + l)}>{off ? 'Off' : 'Working'}</Btn>
      <input class="in mono" type="time" aria-label={l + ' start'} disabled={off} value={r.s || S.shiftStart} style={{ width: '110px' }} onChange={e => save(n, { s: (e.target as HTMLInputElement).value })} />
      <input class="in mono" type="time" aria-label={l + ' end'} disabled={off} value={r.e || S.shiftEnd} style={{ width: '110px' }} onChange={e => save(n, { e: (e.target as HTMLInputElement).value })} /></div>; })}
    <div class="ctl" style={{ marginTop: '8px' }}><Btn onClick={() => { const m = sc[1] || {}, s0 = m.s || S.shiftStart, e0 = m.e || S.shiftEnd, o: Record<string, any> = { ...sc }; DOWS.forEach(([n]) => { if (!offOf(n)) o[n] = { ...(o[n] || {}), s: s0, e: e0, off: false }; }); setHr({ sched: o }); toast('Applied ' + s0 + ' – ' + e0 + ' to working days'); }}>Copy Monday’s times to all working days</Btn></div>
    <div class="h2">Specific dates</div>
    <div class="ctl" style={{ flexWrap: 'wrap' }}><input class="in" type="date" aria-label="Date" value={dk} style={{ width: 'auto' }} onChange={e => setDk((e.target as HTMLInputElement).value || dk)} /><input class="in mono" type="time" aria-label="Start" value={ds} style={{ width: '110px' }} onChange={e => setDs((e.target as HTMLInputElement).value)} /><input class="in mono" type="time" aria-label="End" value={de} style={{ width: '110px' }} onChange={e => setDe((e.target as HTMLInputElement).value)} />
      <Btn onClick={() => { setHr({ dayshift: { ...(S.dayshift || {}), [dk]: { s: ds, e: de } } }, 'Shift set for ' + dk + ' ' + ds + ' – ' + de); }}>Set shift</Btn><Btn onClick={() => setHr({ dayoff: { ...(S.dayoff || {}), [dk]: 1 } }, 'Off day ' + dk)}>Mark off</Btn><Btn onClick={() => setHr({ dayoff: { ...(S.dayoff || {}), [dk]: 0 } }, 'Working day ' + dk)}>Mark working</Btn></div>
    {keys.length ? keys.map(k => { const o = S.dayoff?.[k], s = S.dayshift?.[k]; return <div class="item"><div class="main"><div class="t">{fmtDay(k)}</div><div class="s">{[o === 1 ? 'Off day' : o === 0 ? 'Working day' : '', s ? 'Shift ' + s.s + ' – ' + s.e : ''].filter(Boolean).join(' · ')}</div></div><Btn onClick={() => { const a = { ...(S.dayoff || {}) }, b = { ...(S.dayshift || {}) }; delete a[k]; delete b[k]; setHr({ dayoff: a, dayshift: b }, 'Removed date override ' + k); }}>Remove</Btn></div>; }) : <Empty>No date-specific shifts or off days.</Empty>}
  </>;
}
function RotaWeek() {
  const td = todayKey(), w = weekKeys(td), rota = hrItems('rota'), shifts = hrItems('shifts');
  return <><div class="h2 first">This week</div><Tiles>{w.map(k => { const dn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(k + 'T00:00').getDay()]; const s = shifts.find(x => x.date === k) || rota.find(x => x.weekday === dn); const sh = setFor(k); return <Stat l={fmtDay(k).slice(0, 10)} v={isWork(k) ? (s ? s.shift || 'Shift' : 'Work') : 'Off'} c={isWork(k) ? (s ? s.start + ' – ' + s.end : sh.s + ' – ' + sh.e) : holiday(k) || ' '} tone={k === td ? 'acc' : ''} />; })}</Tiles></>;
}

// ---------- pay ----------
function Pay() {
  const [m, setM] = useState(todayKey().slice(0, 7)); const p = payCalc(m), S = hrSet();
  const html = () => '<!doctype html><meta charset="utf-8"><title>Payslip ' + m + '</title><style>body{font:14px/1.5 system-ui,Arial,sans-serif;color:#111;margin:32px}h1{font-size:22px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px}td{padding:7px 6px;border-bottom:1px solid #ddd}td:last-child{text-align:right}.t td{font-weight:700;border-top:2px solid #111}.m{color:#555;font-size:12px}</style><h1>Payslip estimate</h1><div class="m">' + mLabel(m) + (S.name ? ' · ' + S.name.replace(/</g, '&lt;') : '') + '</div><table>' + [['Days worked', String(p.days)], ['Regular hours', dur(p.reg, true)], ['Overtime hours', dur(p.ot, true)], ['Base pay', money(p.base)], ['Overtime pay', money(p.otPay)], ['Allowances', money(p.al)], ['Deductions', '−' + money(p.de)], ['Pension (your share)', '−' + money(p.pen)], ['Income tax', '−' + money(p.tax)], ['Gross', money(p.gross)]].map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') + '<tr class="t"><td>Net estimate</td><td>' + money(p.net) + '</td></tr></table><p class="m">Estimate only — not a legal payslip. Employer pension ' + money(p.er) + '.</p><script>print()</script>';
  return <>
    <div class="ctl" style={{ flexWrap: 'wrap' }}><IconBtn icon="left" title="Previous month" onClick={() => setM(shiftMonth(m, -1))} /><b>{mLabel(m)}</b><IconBtn icon="right" title="Next month" onClick={() => setM(shiftMonth(m, 1))} />
      <Btn icon="copy" onClick={() => { copyText(payslipText(m)); toast('Payslip copied'); }}>Copy payslip</Btn><Btn icon="down" onClick={() => download('payslip-' + m + '.txt', payslipText(m))}>Download</Btn>
      <Btn onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(html()); w.document.close(); } else download('payslip-' + m + '.html', html(), 'text/html'); }}>Payslip (print/PDF)</Btn>
      <Btn icon="down" onClick={() => download('bank-' + m + '.csv', csv([['Name', 'Month', 'Net'], [S.name || 'Me', m, (Math.round(p.net * 100) / 100).toFixed(2)]]))}>Bank CSV</Btn></div>
    <Tiles><Stat l="Regular hours" v={dur(p.reg, true)} c={p.days + ' days worked of ' + p.wd} /><Stat l="Overtime hours" v={dur(p.ot, true)} /><Stat l="Base pay" v={money(p.base)} /><Stat l="Overtime pay" v={money(p.otPay)} c={'× ' + S.otNormal + ' / ' + S.otRest} /><Stat l="Allowances" v={money(p.al)} /><Stat l="Deductions" v={money(p.de)} /><Stat l="Pension (you)" v={money(p.pen)} c={'Employer ' + money(p.er)} /><Stat l="Income tax" v={money(p.tax)} c={S.taxPct + '% flat'} /><Stat l="Net estimate" v={money(p.net)} c={'Gross ' + money(p.gross)} tone="acc" /></Tiles>
    {!+S.rate && <div class="card warn-card">Set your pay rate in HR → Settings to see money amounts.</div>}
    <p class="faint" style={{ fontSize: '.75rem' }}>Estimate only — not a legal payslip. Overtime multipliers and the rate are yours to set.</p>
    <div class="h2">Allowances &amp; deductions</div>
    <CollList def={C.payitems} c={HRC} col="payitems" />
  </>;
}

// ---------- salary slips (figures synced; the photo stays on this device) ----------
interface Slip { id: string; month: string; gross: number; ded: number; net: number; note: string }
function Slips() {
  const A = all<Slip>('slips').sort((a, b) => (a.month < b.month ? 1 : -1)), yr = String(new Date().getFullYear()), ytd = A.filter(x => x.month.slice(0, 4) === yr);
  const sum = (L: Slip[], k: keyof Slip) => L.reduce((t, x) => t + (+x[k] || 0), 0), last = A[0], prev = A[1], dif = last && prev ? (+last.net || 0) - (+prev.net || 0) : null;
  return <>
    <div class="ctl"><button type="button" class="b-add" onClick={() => slipForm()}>+ Add salary slip</button><Btn icon="down" onClick={() => download('salary-slips.csv', csv([['Month', 'Gross', 'Deductions', 'Net', 'Note'], ...A.slice().reverse().map(x => [x.month, x.gross, x.ded, x.net, x.note || ''])]))}>Export CSV</Btn></div>
    {!A.length ? <Empty>No salary slips yet. Add each month’s slip (gross, deductions, net pay) and attach a photo of it. Totals and the trend appear here.</Empty> : <>
      <Tiles><Stat l="Latest net" v={money(last.net)} c={mLabel(last.month)} tone="acc" /><Stat l="Change vs previous" v={dif == null ? '—' : (dif >= 0 ? '+' : '−') + money(Math.abs(dif))} tone={dif == null ? '' : dif >= 0 ? 'good' : 'bad'} /><Stat l="Net this year" v={money(sum(ytd, 'net'))} c={ytd.length + ' slip' + (ytd.length === 1 ? '' : 's')} /><Stat l="Average net" v={money(sum(A, 'net') / A.length)} /><Stat l="Deductions this year" v={money(sum(ytd, 'ded'))} /></Tiles>
      <div class="h2">Net pay by month</div><Columns data={A.slice(0, 12).reverse().map(x => ({ k: x.month, label: MONTHS[+x.month.slice(5) - 1].slice(0, 3), v: Math.round(+x.net || 0) }))} />
      <div class="h2">Slips</div>
      {A.map(x => <div class="item"><div class="main"><div class="t">{mLabel(x.month)} · net {money(x.net)}</div><div class="s">Gross {money(x.gross)} · Deductions {money(x.ded)}{x.note ? ' · ' + x.note : ''}</div></div>
        <div class="acts">{get<any>('_slipimg', x.id)?.d && <Btn onClick={() => openModal(() => <Sheet title={'Salary slip · ' + mLabel(x.month)} onClose={closeModal}>{/^data:image/.test(get<any>('_slipimg', x.id).d) ? <img alt="Salary slip" src={get<any>('_slipimg', x.id).d} style={{ width: '100%', borderRadius: '12px' }} /> : <a class="b" href={get<any>('_slipimg', x.id).d} download={'slip-' + x.month}>Download file</a>}</Sheet>)}>View slip</Btn>}<IconBtn icon="edit" sm title="Edit" onClick={() => slipForm(x)} /><IconBtn icon="trash" sm bad title="Delete" onClick={() => { del('slips', x.id); del('_slipimg', x.id); audit('Deleted salary slip ' + x.month); toast('Deleted'); }} /></div></div>)}
    </>}
  </>;
}
function compress(file: File): Promise<string | null> {
  return new Promise(res => { const r = new FileReader(); r.onerror = () => res(null); r.onload = () => { if (!/^image\//.test(file.type)) { res(String(r.result).length < 900000 ? String(r.result) : null); return; } const im = new Image(); im.onerror = () => res(null); im.onload = () => { const sc = Math.min(1, 1100 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc); c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.68)); }; im.src = String(r.result); }; r.readAsDataURL(file); });
}
function slipForm(cur?: Slip) { openModal(() => <SlipForm cur={cur} />); }
function SlipForm({ cur }: { cur?: Slip }) {
  const [v, setV] = useState({ month: cur?.month || todayKey().slice(0, 7), gross: cur ? String(cur.gross ?? '') : '', ded: cur ? String(cur.ded ?? '') : '', net: cur ? String(cur.net ?? '') : '', note: cur?.note || '' }), [img, setImg] = useState<string | null>(null);
  const set = (k: string, x: string) => setV(o => { const n = { ...o, [k]: x }; if ((k === 'gross' || k === 'ded') && n.gross !== '' && (!o.net || +o.net === (+o.gross || 0) - (+o.ded || 0))) n.net = String((+n.gross || 0) - (+n.ded || 0)); return n; });
  const save = () => { if (!/^\d{4}-\d{2}$/.test(v.month)) return toast('Pick the month'); const id = cur?.id || uid('slip'); put('slips', id, { month: v.month, gross: +v.gross || 0, ded: +v.ded || 0, net: v.net === '' ? (+v.gross || 0) - (+v.ded || 0) : +v.net, note: v.note.trim() }); if (img) put('_slipimg', id, { d: img }); audit((cur ? 'Edited' : 'Added') + ' salary slip ' + v.month); closeModal(); toast('Salary slip saved'); };
  return <Sheet title={(cur ? 'Edit' : 'Add') + ' salary slip'} onClose={closeModal} foot={<><Btn onClick={closeModal}>Cancel</Btn><button type="button" class="b-add" onClick={save}>Save</button></>}>
    <div class="form">
      <Field label="Month"><input class="in" type="month" value={v.month} onInput={e => set('month', (e.target as HTMLInputElement).value)} /></Field>
      <Field label="Gross pay (basic + allowances)"><input class="in" type="number" step="any" data-f="gross" value={v.gross} onInput={e => set('gross', (e.target as HTMLInputElement).value)} /></Field>
      <Field label="Deductions"><input class="in" type="number" step="any" data-f="ded" value={v.ded} onInput={e => set('ded', (e.target as HTMLInputElement).value)} /></Field>
      <Field label="Net pay"><input class="in" type="number" step="any" data-f="net" value={v.net} onInput={e => set('net', (e.target as HTMLInputElement).value)} /></Field>
      <Field label="Note" full><input class="in" value={v.note} onInput={e => set('note', (e.target as HTMLInputElement).value)} /></Field>
      <Field label="Photo / PDF of the slip (kept on this device only)" full><input class="in" type="file" accept="image/*,application/pdf" onChange={async e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) { const d = await compress(f); if (!d) toast('That file is too big'); setImg(d); } }} /></Field>
    </div>
  </Sheet>;
}

// ---------- analytics + audit ----------
function HrAnalytics() {
  const a = hrAnalytics();
  return <>
    <Tiles><Stat l="Days worked (30 days)" v={a.n} /><Stat l="Worked" v={dur(a.worked, true)} c={a.n ? 'avg ' + dur(a.worked / a.n, true) + ' / day' : ''} tone="acc" /><Stat l="On time" v={a.n ? a.onTime + '%' : '–'} c={a.late + ' late'} tone={a.late ? 'bad' : 'good'} /><Stat l="Overtime" v={dur(a.ot, true)} /><Stat l="Breaks" v={dur(a.brk, true)} /><Stat l="Average start" v={a.n ? minToTime(a.avgIn) : '–'} /></Tiles>
    <div class="h2">Hours worked per day</div><Columns data={a.bars} unit="h" />
    <div class="h2">Leave this year</div><LeaveBalances />
  </>;
}
function Audit() {
  const L = auditLog();
  return <><div class="ctl"><Btn icon="down" onClick={() => download('hr-audit.csv', csv([['When', 'What', 'Why'], ...L.map(a => [new Date(a.at).toISOString(), a.what, a.why])]))}>CSV</Btn></div>
    {L.length ? L.slice(0, 300).map(a => <div class="item"><div class="main"><div class="t">{a.what}</div><div class="s">{new Date(a.at).toLocaleString()}{a.why ? ' · ' + a.why : ''}</div></div></div>) : <Empty>No changes recorded yet.</Empty>}</>;
}

// ---------- extra settings (pay, leave types) — shown under the clock settings in HR → Settings ----------
export function HrMoreSettings() {
  const S = hrSet(), num = (k: string, label: string, step = 'any') => <Field label={label}><input class="in" type="number" step={step} value={(S as any)[k]} onChange={e => setHr({ [k]: +(e.target as HTMLInputElement).value || 0 }, label + ' changed')} /></Field>;
  const lt = S.leaveTypes, setLt = (L: typeof lt) => setHr({ leaveTypes: L }, 'Leave types changed');
  return <>
    {num('round', 'Round worked time to (minutes, 0 = off)')}
    {num('autoBreakMin', 'Auto meal break (minutes, 0 = off)')}
    {num('autoBreakAfterH', 'Auto meal break after (hours)')}
    {num('weekH', 'Hours per week')}
    <Field label="Your name (on the payslip)"><input class="in" value={S.name} onChange={e => setHr({ name: (e.target as HTMLInputElement).value.trim() })} /></Field>
    <Field label="Pay rate"><input class="in" type="number" step="any" value={S.rate} onChange={e => setHr({ rate: +(e.target as HTMLInputElement).value || 0 }, 'Pay rate changed')} /></Field>
    <Field label="Rate is per"><select class="in" value={S.rateType} onChange={e => setHr({ rateType: (e.target as HTMLSelectElement).value })}><option value="hour">Hour</option><option value="month">Month</option></select></Field>
    <Field label="Currency"><input class="in" value={S.cur} onChange={e => setHr({ cur: (e.target as HTMLInputElement).value.trim() || 'MVR' })} /></Field>
    {num('otNormal', 'Overtime × (normal day)')}
    {num('otRest', 'Overtime × (rest day / holiday)')}
    {num('pensionEmp', 'Pension – your share %')}
    {num('pensionEr', 'Pension – employer %')}
    {num('taxPct', 'Income tax % (flat)')}
    <Field label="Pay overtime only when approved"><Switch on={S.otApproval} onChange={v => setHr({ otApproval: v })} /></Field>
    <Field label="Leave builds up month by month (accrual)"><Switch on={S.accrue} onChange={v => setHr({ accrue: v })} /></Field>
    <Field label="Leave types: name · days per year · max carried over" full><div class="lt-list">
      {lt.map((t, i) => <div class="lt-row"><input class="in" aria-label="Leave type name" value={t.name} onChange={e => setLt(lt.map((x, j) => (j === i ? { ...x, name: (e.target as HTMLInputElement).value.trim() || x.name } : x)))} /><input class="in" type="number" step="any" aria-label="Days per year" value={t.days} onChange={e => setLt(lt.map((x, j) => (j === i ? { ...x, days: +(e.target as HTMLInputElement).value || 0 } : x)))} /><input class="in" type="number" step="any" aria-label="Max carried over" value={t.carry || 0} onChange={e => setLt(lt.map((x, j) => (j === i ? { ...x, carry: +(e.target as HTMLInputElement).value || 0 } : x)))} /><IconBtn icon="trash" sm bad title="Remove leave type" onClick={() => setLt(lt.filter((_, j) => j !== i))} /></div>)}
      <Btn icon="plus" onClick={() => setLt([...lt, { id: uid('lt'), name: 'New leave type', days: 0 }])}>Add leave type</Btn>
    </div></Field>
  </>;
}
export { HR_DEF };
void editItem;
