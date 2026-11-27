// Day End Report – kept as Abi likes it, a little tighter. Same fields, same report text, same filters.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { rev } from '../data/store';
import { CYCLES, Entry, PLANS, SECTIONS, SK, STAGES, WON, LOST, actStats, cycleMark, cycleTick, dayReport, daysWithEntries, entriesOf, entryRows, entryText, generateHours, getDay, mkOf, periodDays, periodReport, periodTitle, planLabel, priceText, regsOf, removeEntry, setShift, slotOf, stageStats, stageTone, tkOf, ticketTypes, totText, updateEntry, XLSX_WIDTHS, PeriodMode } from '../domain/dayend';
import { calc, status, act, t as hrT } from '../domain/hr';
import { MONTHS, clock, copyText, download, fmt12, fmtDay, isKey, keyOf, lsJSON, lsSet, minToTime, shiftDayKey, timeToMin, todayKey, cx } from '../lib/util';
import { openUrl } from '../lib/privacy';
import { buildXlsx } from '../lib/xlsx';
import { Btn, Chips, DangerBtn, IconBtn, MarkGrid, PageHead, Seg, Stat, Tiles, toast } from '../ui/kit';
import { Icon } from '../ui/icons';
import { EntryForm } from './entryform';
import { openTaskForm } from './tasks';
import { resting, holdToQuickAdd } from '../ui/moon';
import { go } from '../ui/state';

export const selDay = signal(todayKey());
const SEC_ICON: Record<SK, string> = { tasks: 'check', calls: 'clock', whatsapp: 'wa', tickets: 'ticket', other: 'note' };
type F = { wa: string; em: string; twa: string; tem: string };
const filt = signal<F>(lsJSON<F>('hub_fl_day2', { wa: '', em: '', twa: '', tem: '' }));
function passFilter(e: Entry, f: F) {
  if (e.sk !== 'tasks') return !(f.wa || f.em || f.twa || f.tem);
  const m = (k: 'wa' | 'em', want: string) => !want || (want === 'g' ? mkOf(e, k) === 'g' : mkOf(e, k) === 'r');
  const t = (k: 'wa' | 'em', want: string) => !want || (want === 'g' ? tkOf(e, k) === 'y' : tkOf(e, k) === 'n');
  return m('wa', f.wa) && m('em', f.em) && t('wa', f.twa) && t('em', f.tem);
}

export function DayEnd() {
  void rev.value;
  const day = selDay.value, d = getDay(day), hours = generateHours(d);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const f = filt.value, fOn = !!(f.wa || f.em || f.twa || f.tem);
  return <div class="page de">
    <PageHead icon="day" title="Day End Report" sub="Tasks · Calls · WhatsApp · Tickets" right={<ClockBtn />} />
    <DayNav />
    <ShiftBox now={now} />
    <div class="de-filter">
      <span class="lbl">Filter · {day === todayKey() ? 'Today' : fmtDay(day)}</span>
      <MarkGrid wa={f.wa} em={f.em} twa={f.twa === 'g' ? 'y' : f.twa === 'r' ? 'n' : ''} tem={f.tem === 'g' ? 'y' : f.tem === 'r' ? 'n' : ''}
        onMark={k => setF({ ...f, [k]: f[k] === '' ? 'g' : f[k] === 'g' ? 'r' : '' })}
        onTick={k => { const kk = ('t' + k) as 'twa' | 'tem'; setF({ ...f, [kk]: f[kk] === '' ? 'g' : f[kk] === 'g' ? 'r' : '' }); }} />
      {fOn && <Btn onClick={() => setF({ wa: '', em: '', twa: '', tem: '' })}>Clear filter</Btn>}
    </div>
    <div class="de-blocks">{hours.map(hk => <HourBlock key={hk} day={day} hk={hk} now={now} f={f} />)}</div>
    <Stats day={day} />
    <Reports day={day} />
  </div>;
}
function setF(f: F) { filt.value = f; lsSet('hub_fl_day2', JSON.stringify(f)); }

function ClockBtn() {
  void rev.value; const st = status();
  return <Btn icon="clock" on={st.state !== 'out'} onClick={() => { const r = act(st.state === 'out' ? 'in' : 'out'); toast(r); }}>{st.state === 'out' ? 'Clock in' : st.state === 'break' ? 'On break' : 'Clocked in'}</Btn>;
}
function DayNav() {
  void rev.value; const day = selDay.value; const keys = daysWithEntries(); if (keys.indexOf(day) < 0) keys.push(day); keys.sort().reverse();
  return <div class="card tex de-nav">
    <div class="de-nav-r">
      <IconBtn icon="left" title="Previous day" onClick={() => { selDay.value = shiftDayKey(day, -1); }} />
      <input class="in de-date" type="date" value={day} onChange={e => { const v = (e.target as HTMLInputElement).value; if (isKey(v)) selDay.value = v; }} />
      <IconBtn icon="right" title="Next day" onClick={() => { selDay.value = shiftDayKey(day, 1); }} />
      <Btn on={day === todayKey()} onClick={() => { selDay.value = todayKey(); }}>Today</Btn>
      <span class="de-dl">{fmtDay(day, true)}{day === todayKey() ? ' · Today' : ''}</span>
    </div>
    <div class="row-scroll de-chips">{keys.slice(0, 60).map(k => <button type="button" class={cx('chip mono', k === day && 'on')} onClick={() => { selDay.value = k; }}>{fmtDay(k)} · {entriesOf(k).length}</button>)}</div>
  </div>;
}

const RING = 2 * Math.PI * 54;
function ShiftBox({ now }: { now: number }) {
  void rev.value; const day = selDay.value, d = getDay(day);
  const s = timeToMin(d.shiftStart); let e = timeToMin(d.shiftEnd); if (e <= s) e = s + 60;
  const n = new Date(now), nowS = n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds();
  let label = 'standby', time = '--:--:--', frac = 0, phase = 'Standby', cls = 'upcoming';
  if (day === todayKey()) {
    if (nowS < s * 60) { time = clock((s * 60 - nowS) * 1000); label = 'to start'; phase = 'Upcoming'; }
    else if (nowS < e * 60) { const left = e * 60 - nowS; time = clock(left * 1000); label = 'left'; frac = 1 - left / ((e - s) * 60); phase = 'On Shift'; cls = 'live'; }
    else { time = '+' + clock((nowS - e * 60) * 1000); label = 'overtime'; frac = 1; phase = 'Finished'; cls = 'done'; }
  }
  const hrs = (e - s) / 60, c = calc(day), st = status();
  const cells = (() => { const ses = c.ses[0]; const br = ses && ses.br[0]; return [['In', ses ? hrT(ses.s) : '—'], ['Break', br ? hrT(br.s) : '—'], ['Back', br && br.e ? hrT(br.e) : '—'], ['Out', ses && ses.e ? hrT(ses.e) : '—']]; })();
  const today = day === todayKey() || day === st.key;
  return <div class="card de-shift">
    {resting.value && <div class="stars" aria-hidden="true" />}
    <div class="de-moon" title="Hold for Quick Add" ref={el => holdToQuickAdd(el)}>
      <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" class="rg-bg" /><circle cx="60" cy="60" r="54" class="rg-fg" style={{ strokeDasharray: RING, strokeDashoffset: RING * (1 - frac) }} /></svg>
      <div class="de-moon-img" /><div class="de-cd"><b class="mono">{time}</b><span>{label}</span></div>
    </div>
    <div class="de-sh">
      <label class="f">Shift start<input class="in" type="time" value={d.shiftStart} onChange={ev => setShift(day, (ev.target as HTMLInputElement).value || d.shiftStart, d.shiftEnd)} /></label>
      <span class="faint">→</span>
      <label class="f">Shift end<input class="in" type="time" value={d.shiftEnd} onChange={ev => setShift(day, d.shiftStart, (ev.target as HTMLInputElement).value || d.shiftEnd)} /></label>
      <div class="de-ph"><span class="mono faint">{hrs} hour{hrs === 1 ? '' : 's'}</span><span class={'phase ' + cls}>{phase}</span></div>
    </div>
    <div class="de-clock">
      <div class="de-cells">{cells.map(([l, v]) => <div><span class="lbl">{l}</span><b class="mono">{v}</b></div>)}</div>
      {today && <div class="de-cbtn">
        {st.state === 'out' && <button class="b-add" onClick={() => toast(act('in'))}>Clock in</button>}
        {st.state === 'work' && <><Btn icon="pause" onClick={() => toast(act('bs', { bt: 'meal' }))}>Break</Btn><Btn icon="stop" onClick={() => toast(act('out'))}>Clock out</Btn></>}
        {st.state === 'break' && <><Btn icon="play" onClick={() => toast(act('be'))}>Back</Btn><Btn icon="stop" onClick={() => toast(act('out'))}>Clock out</Btn></>}
        {c.n > 0 && <span class="mono faint">Worked {clock(c.worked)}</span>}
      </div>}
    </div>
  </div>;
}

const openHours = signal<Record<string, boolean>>({});
function HourBlock({ day, hk, now, f }: { day: string; hk: string; now: number; f: F }) {
  const slot = slotOf(day, hk), n = new Date(now), nm = n.getHours() * 60 + n.getMinutes(), sm = timeToMin(hk);
  const isNow = day === todayKey() && nm >= sm && nm < sm + 60, isFuture = day === todayKey() && nm < sm;
  const key = day + '|' + hk, open = openHours.value[key] ?? isNow;
  const cnt = { tasks: slot.tasks.length, calls: slot.calls.length, wa: slot.whatsapp.length, tickets: slot.tickets.length, other: slot.other.length };
  const total = cnt.tasks + cnt.calls + cnt.wa + cnt.tickets + cnt.other;
  return <div class={cx('hb', isNow && 'now', isFuture && 'future', open && 'open')} data-hk={hk}>
    <button type="button" class="hb-h" onClick={() => { openHours.value = { ...openHours.value, [key]: !open }; }}>
      <span class="hb-t mono">{fmt12(hk)} – {fmt12(minToTime(sm + 60))}</span>{isNow && <span class="pill acc">Now</span>}
      <span class="hb-m">
        {cnt.tasks > 0 && <span class="pill good">Tasks {cnt.tasks}</span>}{cnt.calls > 0 && <span class="pill">Calls {cnt.calls}</span>}{cnt.wa > 0 && <span class="pill warn">WA {cnt.wa}</span>}
        {cnt.tickets > 0 && <span class="pill acc">Tickets {cnt.tickets}</span>}{cnt.other > 0 && <span class="pill">Other {cnt.other}</span>}{!total && <span class="pill">empty</span>}
        <span class="hb-c">{open ? '▴' : '▾'}</span>
      </span>
    </button>
    {open && <div class="hb-b">{SECTIONS.map(def => <Section day={day} hk={hk} sk={def.key} list={slot[def.key]} f={f} />)}</div>}
  </div>;
}
function Section({ day, hk, sk, list, f }: { day: string; hk: string; sk: SK; list: Entry[]; f: F }) {
  const def = SECTIONS.find(s => s.key === sk)!; const [editing, setEditing] = useState<Entry | null>(null);
  const shown = list.map((e, i) => ({ e, i })).filter(x => passFilter(x.e, f));
  return <div class={'sec sec-' + def.color} data-section={sk}>
    <div class="sec-h"><span class="sec-ic"><Icon n={SEC_ICON[sk]} /></span><div><div class="sec-t">{def.label}</div><div class="sec-s">{def.sub}</div></div><span class="sec-n mono">{list.length}</span></div>
    <EntryForm sk={sk} day={day} hk={hk} edit={editing} onDone={() => setEditing(null)} />
    {shown.length > 0 && <div class="ents">{shown.map(({ e, i }) => <EntryRow e={e} i={i} onEdit={() => setEditing(e)} editing={editing?.id === e.id} />)}</div>}
  </div>;
}
export function EntryRow({ e, i, onEdit, editing }: { e: Entry; i: number; onEdit?: () => void; editing?: boolean }) {
  const lk = e.sk === 'tasks' ? openUrl(e.number) : '';
  const tags: [string, string][] = [];
  if (e.sk === 'tasks' && e.text == null) { if (e.stage) tags.push([e.stage, stageTone(e.stage)]); if (e.plan) tags.push([planLabel(e), 'acc']); if (e.price) tags.push(['Price ' + priceText(e), 'warn']); if (regsOf(e)) tags.push(['+' + regsOf(e) + ' extra register' + (regsOf(e) > 1 ? 's' : ''), 'warn']); }
  const [t, setT] = useState(false);
  return <div class={cx('ent', editing && 'editing')} id={'e-' + e.id}>
    <span class="ent-n mono">{String(i + 1).padStart(2, '0')}</span>
    <div class="ent-m">
      <div class="ent-t">{entryText(e)}{lk && <a class="ent-l" href={lk} target="_blank" rel="noopener" title="Open the HubSpot deal">↗ HubSpot</a>}
        {t ? <input class="in ent-time" type="time" step={1} autoFocus value={e.at ? keyTime(e.at) : ''} onBlur={() => setT(false)} onChange={ev => { const v = (ev.target as HTMLInputElement).value; if (v) { const [h, m, s] = v.split(':').map(Number); const dt = new Date(e.day + 'T00:00:00'); dt.setHours(h, m, s || 0); updateEntry(e.id, { at: +dt }); } setT(false); }} />
          : <button type="button" class={cx('ent-at mono', !e.at && 'none')} title="Exact time logged — tap to adjust" onClick={() => setT(true)}>{e.at ? hrT(e.at) : '+ time'}</button>}
      </div>
      {tags.length > 0 && <div class="ent-tags">{tags.map(([x, c]) => <span class={'pill ' + c}>{x}</span>)}</div>}
    </div>
    {e.sk === 'tasks' && <MarkGrid wa={mkOf(e, 'wa')} em={mkOf(e, 'em')} twa={tkOf(e, 'wa')} tem={tkOf(e, 'em')} onMark={k => cycleMark(e, k)} onTick={k => cycleTick(e, k)} />}
    <div class="ent-a">
      <Btn title="Add a follow-up task" onClick={() => openTaskForm({ title: 'Follow up — ' + (e.deal || entryText(e).slice(0, 40)), deal: e.deal || '', notes: entryText(e) })}>Follow-up</Btn>
      {onEdit && <Btn onClick={onEdit}>Edit</Btn>}
      <DangerBtn onConfirm={() => { removeEntry(e.id); toast('Entry deleted', { label: 'Undo', fn: () => import('../data/store').then(m => m.restore('entries', e.id)) }); }}>✕</DangerBtn>
    </div>
  </div>;
}
const keyTime = (ms: number) => { const d = new Date(ms); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':'); };

// ---------- data tiles ----------
type Scope = 'day' | 'month' | 'year' | 'all';
const scopeS = signal<Scope>('all');
function Stats({ day }: { day: string }) {
  const sc = scopeS.value; void rev.value;
  let keys = daysWithEntries(); if (sc === 'day') keys = [day]; else if (sc === 'month') keys = keys.filter(k => k.slice(0, 7) === day.slice(0, 7)); else if (sc === 'year') keys = keys.filter(k => k.slice(0, 4) === day.slice(0, 4));
  const list: Entry[] = []; keys.forEach(k => entriesOf(k).forEach(e => { if (e.sk === 'tasks') list.push(e); }));
  const S = stageStats(list), A = actStats(keys);
  const label = sc === 'day' ? fmtDay(day) : sc === 'month' ? MONTHS[+day.slice(5, 7) - 1] + ' ' + day.slice(0, 4) : sc === 'year' ? day.slice(0, 4) : 'All days';
  const tm = ticketTypes(A).map(t => [t, A.tickets.types[t], A.tickets.n] as [string, number, number]); if (A.tickets.none) tm.push(['No type', A.tickets.none, A.tickets.n]);
  return <div class="de-stats">
    <div class="h2">Deal stages<span class="faint mono" style={{ fontSize: '.72rem', fontWeight: 400 }}>{label} · {list.length} task{list.length === 1 ? '' : 's'}</span><span class="r"><Seg value={sc} onChange={v => { scopeS.value = v; }} opts={[['day', 'Day'], ['month', 'Month'], ['year', 'Year'], ['all', 'All']]} /></span></div>
    <Tiles>{STAGES.map(s => <Stat l={s} v={S.stages[s]} tone={s === WON && S.stages[s] ? 'good' : s === LOST && S.stages[s] ? 'bad' : ''} c={s === WON ? 'View deals →' : undefined} onClick={s === WON ? () => go('deals') : s === LOST ? () => go('lost') : undefined} />)}{S.none > 0 && <Stat l="No stage" v={S.none} />}</Tiles>
    {S.stages[WON] > 0 && <><div class="lbl" style={{ margin: '10px 0 6px' }}>Plans (Closed Won)</div><Tiles>{PLANS.map(p => { const g = S.cw.groups[p]; return <Stat l={p} v={g.n} c={g.price ? 'Total · ' + totText(g.price, g.mvr, g.pn, g.mn) : g.nocyc ? g.nocyc + ' with no billing set' : ' '} rows={p !== 'Free' ? CYCLES.map(c => [c, g.cyc[c].n, g.n] as [string, number, number]) : undefined} />; })}</Tiles></>}
    <div class="faint mono de-foot">{['Total tasks: ' + S.total, S.cw.other.n ? 'Other plans: ' + S.cw.other.n : '', S.cw.none.n ? 'Closed Won, no plan: ' + S.cw.none.n : '', S.priced ? 'Total price: ' + totText(S.price, S.mvr, S.priced, S.mvrN) : ''].filter(Boolean).join('   ·   ')}</div>
    {A.any && <><div class="lbl" style={{ margin: '12px 0 6px' }}>Activity</div><Tiles>
      <Stat l="Support Calls" v={A.calls.n} rows={A.calls.n ? [['Unique callers', A.calls.uniq, A.calls.n], ['Repeat callers', A.calls.repeat, A.calls.n]] : undefined} c={A.calls.n ? undefined : 'None logged'} />
      <Stat l="Whatsapp Inquiries" v={A.whatsapp.n} rows={A.whatsapp.n ? [['Unique senders', A.whatsapp.uniq, A.whatsapp.n], ['Repeat senders', A.whatsapp.repeat, A.whatsapp.n]] : undefined} c={A.whatsapp.n ? undefined : 'None logged'} />
      <Stat l="Tickets Attended" v={A.tickets.n} rows={tm} c={A.tickets.n ? undefined : 'None logged'} />
      <Stat l="Other" v={A.other.n} c={A.other.n ? ' ' : 'None logged'} />
    </Tiles></>}
  </div>;
}

// ---------- reports ----------
const pm = signal<{ m: PeriodMode; y: number; mo: number }>({ m: 'month', y: new Date().getFullYear(), mo: new Date().getMonth() + 1 });
function Reports({ day }: { day: string }) {
  void rev.value; const txt = useMemo(() => dayReport(day), [day, rev.value]);
  const P = pm.value, ptxt = useMemo(() => periodReport(P.m, P.y, P.mo), [P.m, P.y, P.mo, rev.value]);
  const years = Array.from(new Set([P.y, new Date().getFullYear(), ...daysWithEntries().map(k => +k.slice(0, 4))])).sort((a, b) => b - a);
  const xl = (keys: string[], name: string) => { if (!keys.length) return toast('Nothing to export yet'); download(name, buildXlsx(entryRows(keys), XLSX_WIDTHS), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); toast('Excel file downloaded'); };
  return <div class="de-rep grid2">
    <div><div class="h2">Final Report<span class="r"><Btn icon="copy" onClick={async () => toast((await copyText(txt)) ? 'Report copied' : 'Copy failed')}>Copy</Btn><Btn icon="down" onClick={() => download('day-end-report-' + day + '.txt', txt)}>Download</Btn><Btn onClick={() => xl(entriesOf(day).length ? [day] : [], 'day-end-' + day + '.xlsx')}>Excel</Btn></span></div><pre class="rep" id="reportPreview">{txt}</pre></div>
    <div><div class="h2">Monthly / Yearly<span class="r"><Btn icon="copy" onClick={async () => toast((await copyText(ptxt)) ? 'Report copied' : 'Copy failed')}>Copy</Btn><Btn icon="down" onClick={() => download('day-end-report-' + periodTitle(P.m, P.y, P.mo).replace(/\s+/g, '-').toLowerCase() + '.txt', ptxt)}>Download</Btn><Btn onClick={() => xl(periodDays(P.m, P.y, P.mo), 'day-end-' + periodTitle(P.m, P.y, P.mo).replace(/\s+/g, '-').toLowerCase() + '.xlsx')}>Excel</Btn></span></div>
      <div class="ctl"><Seg value={P.m} onChange={m => { pm.value = { ...P, m }; }} opts={[['month', 'Month'], ['year', 'Year'], ['all', 'All days']]} />
        {P.m === 'month' && <select class="in" style={{ width: 'auto' }} value={P.mo} onChange={e => { pm.value = { ...P, mo: +(e.target as HTMLSelectElement).value }; }}>{MONTHS.map((m, i) => <option value={i + 1}>{m}</option>)}</select>}
        {P.m !== 'all' && <select class="in" style={{ width: 'auto' }} value={P.y} onChange={e => { pm.value = { ...P, y: +(e.target as HTMLSelectElement).value }; }}>{years.map(y => <option value={y}>{y}</option>)}</select>}
      </div>
      <pre class="rep" id="periodPreview">{ptxt}</pre></div>
  </div>;
}
export { keyOf };
