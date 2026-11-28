// Tools part 2 (Round 61): data care, planning and daily helpers.
import { useEffect, useState } from 'preact/hooks';
import { rev, all, get, put, del, trash, restore, raw } from '../data/store';
import { deals, Deal, wonDeals, renewalOf, markRenewed, allTasks, saveTask, tickets, isClosedT, dealKeyOf, moveDeal } from '../domain/crm';
import { entriesOf, entryText, updateEntry, WON, LOST, DEAL_STAGES, planLabel, SECTIONS as DE_SECTIONS, Entry, allEntryDays } from '../domain/dayend';
import { hrItems } from '../domain/hrlists';
import { listPoints, takePoint, restorePoint, deletePoint, pointJSON, Point } from '../features/restorepoints';
import { CollList, CDef } from '../features/coll';
import { cleanLink, isLink, linkKey, stripText } from '../lib/privacy';
import { addDays, copyText, csv, download, fmtDay, fmtNum, keyOf, lsGet, lsJSON, lsSet, parseKey, slug, todayKey, uid, cx, MONTHS, ago } from '../lib/util';
import { Btn, Empty, Field, IconBtn, Seg, Sheet, Stat, Switch, Tiles, closeModal, confirmBox, openModal, toast } from '../ui/kit';
import { go } from '../ui/state';
import { openTaskForm } from './tasks';
import type { Tool } from './tools';
import { ComfortTool } from '../features/comfort';

// ================= Duplicate finder =================
function lev(a: string, b: string) { if (Math.abs(a.length - b.length) > 2) return 9; const d = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return d[b.length]; }
export function dupGroups(): Deal[][] {
  const D = deals(), no = new Set<string>((get<any>('cfg', 'nodup')?.pairs as string[]) || []), out: Deal[][] = [], used = new Set<string>();
  D.forEach((a, i) => { if (used.has(a.key)) return; const g = [a]; const sa = slug(a.name);
    D.slice(i + 1).forEach(b => { if (used.has(b.key) || no.has([a.key, b.key].sort().join('|'))) return; const sb = slug(b.name);
      const sameLink = a.links.some(x => b.links.some(y => linkKey(x) && linkKey(x) === linkKey(y))), close = sa.length >= 5 && sb.length >= 5 && (lev(sa, sb) <= (sa.length >= 9 ? 2 : 1) || (sa.length >= 7 && (sa.indexOf(sb) === 0 || sb.indexOf(sa) === 0)));
      if (sameLink || close) { g.push(b); used.add(b.key); } });
    if (g.length > 1) { used.add(a.key); out.push(g); } });
  return out;
}
/** merge b into a: b's Day End entries take a's name (and link when they have none); a manual b is removed. */
export function mergeDeals(a: Deal, b: Deal) {
  b.entries.forEach(e => updateEntry(e.id, { deal: a.name, ...(e.number ? {} : a.links[0] ? { number: a.links[0] } : {}) }));
  if (b.src === 'manual') del('deals', b.key); else put('dealmeta', b.key, { hidden: true, mergedInto: a.key });
  b.notes.forEach(n => put('dealnotes', n.id, { deal: a.key }));
}
function Dupes() {
  void rev.value; const G = dupGroups();
  return <>{G.length ? G.map(g => <div class="card dup-g">{g.map((d, i) => <div class="item"><div class="main"><div class="t">{d.name}</div><div class="s">{d.stage} · {d.entries.length} entries{d.links[0] ? ' · ' + d.links[0] : ''}</div></div>
    {i > 0 && <Btn onClick={() => confirmBox('Merge deals', 'Merge “' + d.name + '” into “' + g[0].name + '”? Its entries are renamed to the first deal.', 'Merge', () => { mergeDeals(g[0], d); toast('Merged'); })}>Merge into first</Btn>}</div>)}
    <div class="ctl" style={{ marginTop: '6px' }}><Btn onClick={() => { const p = ((get<any>('cfg', 'nodup')?.pairs as string[]) || []).slice(); for (let i = 1; i < g.length; i++) p.push([g[0].key, g[i].key].sort().join('|')); put('cfg', 'nodup', { pairs: p }); toast('Marked as not duplicates'); }}>Not duplicates</Btn></div></div>) : <Empty>No duplicates found. Deals with the same HubSpot link or almost the same name show here.</Empty>}</>;
}

// ================= Trash & activity =================
const NAMES: Record<string, string> = { entries: 'Day End entry', tasks: 'Task', tickets: 'Ticket', deals: 'Deal', lost: 'Lost deal', hrc: 'HR item', slips: 'Salary slip', templates: 'Template', invoices: 'Invoice', lists: 'List', recur: 'Recurring task', flows: 'Automation', widgets: 'Dashboard widget', calls: 'Call outcome', smart: 'Smart text phrase', snippets: 'Snippet', punches: 'Clock punch', shortcuts: 'Shortcut', dealnotes: 'Deal note' };
const recLabel = (c: string, d: any) => String(d?.deal || d?.title || d?.subject || d?.name || d?.text || d?.notes || d?.label || d?.desc || d?.item || d?.n || d?.month || '').slice(0, 90);
export function logActivity(c: string, id: string, deleted: boolean) {
  if (c.charAt(0) === '_' || c === 'cfg' || c === 'legacy') return;
  const a = lsJSON<{ at: number; c: string; id: string; x?: 1 }[]>('v2_activity', []); const last = a[a.length - 1];
  if (last && last.c === c && last.id === id && Date.now() - last.at < 30000 && !!last.x === deleted) { last.at = Date.now(); } else a.push({ at: Date.now(), c, id, ...(deleted ? { x: 1 as const } : {}) });
  lsSet('v2_activity', JSON.stringify(a.slice(-400)));
}
function TrashActivity() {
  void rev.value; const [tab, setTab] = useState<'trash' | 'act'>('trash'), T = trash(), A = lsJSON<{ at: number; c: string; id: string; x?: 1 }[]>('v2_activity', []).slice().reverse();
  const hide = (c: string, id: string) => { try { const L = JSON.parse(lsGet('v2_trash') || '[]').filter((x: any) => !(x.c === c && x.id === id)); lsSet('v2_trash', JSON.stringify(L)); rev.value++; } catch { /* */ } };
  return <>
    <div class="ctl"><Seg value={tab} onChange={setTab} opts={[['trash', 'Trash (' + T.length + ')'], ['act', 'Activity']]} /></div>
    {tab === 'trash' ? (T.length ? <>{T.slice(0, 300).map(x => { const r = raw(x.c, x.id); return <div class="item"><span class="pill">{NAMES[x.c] || x.c}</span><div class="main"><div class="t">{recLabel(x.c, r?.d) || '(item)'}</div><div class="s">deleted {ago(x.at)}</div></div><div class="acts"><Btn icon="restore" onClick={() => { restore(x.c, x.id); toast('Restored'); }}>Restore</Btn><IconBtn icon="x" sm title="Delete forever (remove from Trash)" onClick={() => hide(x.c, x.id)} /></div></div>; })}
      <div class="ctl" style={{ marginTop: '10px' }}><Btn onClick={() => confirmBox('Empty Trash', 'Remove everything from the Trash? They stay deleted and can no longer be restored here.', 'Empty Trash', () => { lsSet('v2_trash', '[]'); rev.value++; })}>Empty Trash</Btn></div></> : <Empty>Trash is empty.</Empty>)
      : (A.length ? A.slice(0, 300).map(a => { const r = raw(a.c, a.id); return <div class="item"><span class={cx('pill', a.x && 'bad')}>{a.x ? 'deleted' : 'saved'}</span><div class="main"><div class="t">{NAMES[a.c] || a.c}: {recLabel(a.c, r?.d) || a.id}</div><div class="s">{new Date(a.at).toLocaleString()}</div></div></div>; }) : <Empty>No changes on this device yet.</Empty>)}
  </>;
}

// ================= Restore points =================
function RestorePoints() {
  const [L, setL] = useState<Point[] | null>(null), [busy, setBusy] = useState(false);
  const load = () => listPoints().then(setL).catch(() => setL([]));
  useEffect(() => { load(); }, []);
  return <>
    <p class="faint" style={{ marginTop: 0, fontSize: '.78rem' }}>A snapshot of all your data is taken once a day on this device (the last 7 are kept). Restoring puts back every record as it was in the snapshot; records added since are kept. A snapshot is taken first, so a restore can be undone.</p>
    <div class="ctl"><button type="button" class="b-add" disabled={busy} onClick={() => { setBusy(true); takePoint('manual').then(n => { toast('Restore point saved (' + n + ' records)'); load(); }).catch(e => toast('Could not save: ' + e.message)).finally(() => setBusy(false)); }}>Take a restore point now</button>
      <span class="faint">Daily</span><Switch on={lsGet('v2_rp_off') !== '1'} onChange={v => { lsSet('v2_rp_off', v ? '0' : '1'); rev.value++; }} label="Daily restore points" /></div>
    {L == null ? <Empty>Loading…</Empty> : L.length ? L.map(p => <div class="item"><div class="main"><div class="t">{new Date(p.at).toLocaleString()}</div><div class="s">{p.n} records · {fmtNum(p.size / 1024)} KB · {p.why}</div></div>
      <div class="acts"><Btn icon="restore" onClick={() => confirmBox('Restore', 'Put back all data as it was on ' + new Date(p.at).toLocaleString() + '?', 'Restore', () => { restorePoint(p.id).then(r => { toast('Restored ' + r.n + ' records'); load(); }).catch(e => toast(e.message)); })}>Restore</Btn><IconBtn icon="down" sm title="Download" onClick={() => pointJSON(p.id).then(j => download('abi-restore-point-' + keyOf(new Date(p.at)) + '.json', j, 'application/json'))} /><IconBtn icon="trash" sm bad title="Delete" onClick={() => deletePoint(p.id).then(load)} /></div></div>) : <Empty>No restore points yet.</Empty>}
  </>;
}

// ================= Import CSV / paste a list of deals =================
export function parseDealList(text: string) {
  const out: { name: string; link: string; stage: string }[] = [];
  String(text || '').split(/\r?\n/).forEach((line, i) => {
    const cells = line.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    if (!cells[0] || (i === 0 && /^(deal|name|deal name)$/i.test(cells[0]))) return;
    const link = cells.find(c => isLink(c)) || '', stage = cells.find(c => DEAL_STAGES.some(s => s.toLowerCase() === c.toLowerCase())) || '';
    const name = stripText(cells.find(c => c && c !== link && c !== stage) || '').s.trim(); if (!name && !link) return;
    out.push({ name: name || 'Deal', link: link ? cleanLink(link) : '', stage: DEAL_STAGES.find(s => s.toLowerCase() === stage.toLowerCase()) || 'Lead' });
  });
  return out;
}
export function importDeals(list: ReturnType<typeof parseDealList>) {
  const have = deals(), keys = new Set(have.map(d => d.key)), links = new Set(have.flatMap(d => d.links.map(l => linkKey(l))).filter(Boolean)); let n = 0, skip = 0;
  list.forEach(x => { const k = dealKeyOf(x.name, x.link), lk = x.link ? linkKey(x.link) : ''; if (keys.has(k) || (lk && links.has(lk))) { skip++; return; } keys.add(k); if (lk) links.add(lk); put('deals', uid('m'), { name: x.name, link: x.link, stage: x.stage, pipeline: 'sales', ts: Date.now() }); n++; });
  return { n, skip };
}
function ImportDeals() {
  const [t, setT] = useState(''), P = parseDealList(t);
  return <>
    <p class="faint" style={{ marginTop: 0, fontSize: '.78rem' }}>Paste deal names, one per line, or <code>name, HubSpot link, stage</code>. A CSV or Excel copy works too. Phone numbers and e-mails are left out. Deals that already exist are skipped.</p>
    <textarea class="in" rows={8} aria-label="Deals to import" placeholder={'Cafe Blue\nGreen Mart, https://app.hubspot.com/…, Interested'} value={t} onInput={e => setT((e.target as HTMLTextAreaElement).value)} />
    <div class="ctl" style={{ marginTop: '8px' }}><input class="in" type="file" accept=".csv,.txt,text/csv,text/plain" aria-label="CSV file" onChange={async e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) setT(await f.text()); }} /><button type="button" class="b-add" disabled={!P.length} onClick={() => { const r = importDeals(P); toast(r.n + ' deals added' + (r.skip ? ' · ' + r.skip + ' already there' : '')); setT(''); }}>Add {P.length || ''} deals</button></div>
    {P.slice(0, 50).map(x => <div class="item"><div class="main"><div class="t">{x.name}</div><div class="s">{x.stage}{x.link ? ' · ' + x.link : ''}</div></div></div>)}
  </>;
}

// ================= Missing information =================
function Missing() {
  void rev.value; const td = todayKey(), won: Entry[] = []; allEntryDays().forEach(k => entriesOf(k).forEach(e => { if (e.sk === 'tasks' && e.stage === WON && (!e.plan || (!e.price && e.plan !== 'Free') || (e.plan !== 'Free' && !e.billing) || !e.number)) won.push(e); }));
  const noLink = deals().filter(d => !d.links.length && d.stage !== LOST);
  const openE = (e: Entry) => import('./dayend').then(m => { m.selDay.value = e.day; go('day'); setTimeout(() => m.scrollToEntry(e.id), 250); });
  const task = (title: string, deal: string) => openTaskForm({ title, deal, due: td, notes: 'From Missing information' });
  return <>
    <div class="h2 first">Closed Won without all details ({won.length})</div>
    {won.length ? won.slice().reverse().map(e => { const miss = [!e.plan && 'plan', e.plan !== 'Free' && !e.billing && 'billing', !e.price && e.plan !== 'Free' && 'price', !e.number && 'HubSpot link'].filter(Boolean).join(', '); return <div class="item"><div class="main" style={{ cursor: 'pointer' }} onClick={() => openE(e)}><div class="t">{e.deal || '(no name)'}</div><div class="s">{fmtDay(e.day)} · missing {miss}</div></div><Btn onClick={() => task('Add ' + miss + ' – ' + (e.deal || 'deal'), e.deal || '')}>Make a task</Btn></div>; }) : <Empty>All Closed Won entries have their details.</Empty>}
    <div class="h2">Deals without a HubSpot link ({noLink.length})</div>
    {noLink.length ? <><div class="ctl"><Btn onClick={() => { let n = 0; noLink.slice(0, 50).forEach(d => { const id = 'nl-' + slug(d.key); if (!get('tasks', id)) { put('tasks', id, { title: 'Add the HubSpot link – ' + d.name, deal: d.name, due: td, notes: 'Deal has no HubSpot link', priority: 'normal', done: false, created: Date.now() }); n++; } }); toast(n + ' tasks made'); }}>Make tasks for all (max 50)</Btn></div>
      {noLink.slice(0, 200).map(d => <div class="item"><div class="main" style={{ cursor: 'pointer' }} onClick={() => go('dealboard', d.key)}><div class="t">{d.name}</div><div class="s">{d.stage} · {d.entries.length} entries</div></div><Btn onClick={() => task('Add the HubSpot link – ' + d.name, d.name)}>Make a task</Btn></div>)}</> : <Empty>Every deal has a link.</Empty>}
  </>;
}

// ================= Calendar =================
export function calendarItems(k: string) {
  const out: { t: string; s: string; kind: string; go: () => void }[] = [];
  allTasks().filter(t => !t.done && t.due === k).forEach(t => out.push({ t: t.title, s: 'Task' + (t.time ? ' · ' + t.time : ''), kind: 'task', go: () => go('tasks') }));
  deals().filter(d => d.follow === k).forEach(d => out.push({ t: d.name, s: 'Deal follow-up', kind: 'deal', go: () => go('dealboard', d.key) }));
  wonDeals().forEach(w => { const r = renewalOf(w); if (r.due === k) out.push({ t: w.deal, s: 'Renewal · ' + planLabel(w), kind: 'ren', go: () => go('tools', 'renewals') }); });
  hrItems('holidays').filter(h => h.date === k).forEach(h => out.push({ t: h.name, s: 'Holiday', kind: 'hr', go: () => go('hr', 'hol') }));
  hrItems('leave').filter(l => l.from && k >= l.from && k <= (l.to || l.from) && l.status !== 'Rejected' && l.status !== 'Cancelled').forEach(l => out.push({ t: l.type, s: 'Leave · ' + l.status, kind: 'hr', go: () => go('hr', 'leave') }));
  return out;
}
function Calendar() {
  void rev.value; const [m, setM] = useState(todayKey().slice(0, 7)), [sel, setSel] = useState(todayKey()), first = parseKey(m + '-01'), start = addDays(m + '-01', -((first.getDay() + 6) % 7)), td = todayKey();
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i)), shift = (n: number) => { const d = new Date(first); d.setMonth(d.getMonth() + n); setM(keyOf(d).slice(0, 7)); };
  const its = calendarItems(sel);
  return <>
    <div class="ctl"><IconBtn icon="left" title="Previous month" onClick={() => shift(-1)} /><b>{MONTHS[first.getMonth()]} {first.getFullYear()}</b><IconBtn icon="right" title="Next month" onClick={() => shift(1)} /><Btn onClick={() => { setM(td.slice(0, 7)); setSel(td); }}>Today</Btn></div>
    <div class="cal-grid">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div class="cal-h">{d}</div>)}
      {cells.map(k => { const L = calendarItems(k), n = entriesOf(k).length; return <button type="button" class={cx('cal-d', k.slice(0, 7) !== m && 'out', k === td && 'today', k === sel && 'sel')} onClick={() => setSel(k)} aria-label={fmtDay(k) + ': ' + L.length + ' items'}><span class="cal-n">{+k.slice(8)}</span>{L.length > 0 && <span class="cal-dots">{L.slice(0, 4).map(x => <i class={'k-' + x.kind} />)}</span>}{n > 0 && <small class="faint">{n}</small>}</button>; })}
    </div>
    <div class="h2">{fmtDay(sel, true)}</div>
    {its.length ? its.map(x => <div class="item" style={{ cursor: 'pointer' }} onClick={x.go}><span class={'pill k-' + x.kind}>{x.s}</span><div class="main"><div class="t">{x.t}</div></div></div>) : <Empty>Nothing planned.</Empty>}
    <div class="ctl" style={{ marginTop: '8px' }}><Btn icon="plus" onClick={() => openTaskForm({ due: sel })}>Task on this day</Btn>{entriesOf(sel).length > 0 && <Btn onClick={() => import('./dayend').then(mm => { mm.selDay.value = sel; go('day'); })}>Open Day End ({entriesOf(sel).length})</Btn>}</div>
  </>;
}

// ================= Recurring tasks =================
const REC: CDef = { label: 'Recurring tasks', ttl: 'title', sub: ['every', 'time', 'pri', 'last'], f: [{ k: 'title', label: 'Task title', req: true }, { k: 'every', label: 'Repeats', type: 'select', opts: ['daily', 'weekdays', 'weekly', 'monthly'] }, { k: 'dow', label: 'Weekday (weekly: 0 = Sunday … 6 = Saturday)', type: 'number', value: '1' }, { k: 'dom', label: 'Day of month (monthly)', type: 'number', value: '1' }, { k: 'time', label: 'Time', type: 'time' }, { k: 'pri', label: 'Priority', type: 'select', opts: ['normal', 'high', 'low'] }, { k: 'on', label: 'On', type: 'check', value: 'true' }] };
/** add today's recurring tasks (deterministic ids: two devices never add the same one twice). */
export function runRecurring(now = new Date()) {
  const k = keyOf(now); let n = 0;
  all<any>('recur').forEach(r => {
    if (r.on === false || r.on === '' || r.last === k) return; const dow = now.getDay(), last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const hit = r.every === 'daily' || (r.every === 'weekdays' && dow >= 1 && dow <= 5) || (r.every === 'weekly' && +r.dow === dow) || (r.every === 'monthly' && Math.min(+r.dom || 1, last) === now.getDate());
    if (!hit) return; const id = 'rc-' + r.id + '-' + k;
    if (!get('tasks', id) && !raw('tasks', id)) { saveTask({ id, title: r.title, notes: 'Repeats ' + r.every, due: k, time: r.time || '', priority: r.pri || 'normal', folder: '' }); n++; }
    put('recur', r.id, { last: k }, { quiet: true });
  });
  return n;
}
function Recurring() { return <><p class="faint" style={{ marginTop: 0, fontSize: '.78rem' }}>Each one adds a task on its days (when the app is opened that day).</p><CollList def={REC} c="recur" addLabel="New recurring task" onSaved={() => { const n = runRecurring(); if (n) toast(n + ' task' + (n === 1 ? '' : 's') + ' added for today'); }} /></>; }

// ================= Renewals board =================
function Renewals() {
  void rev.value; const td = todayKey(), m0 = td.slice(0, 7), m1 = addDays(m0 + '-28', 7).slice(0, 7);
  const L = wonDeals().map(w => ({ w, r: renewalOf(w) })).filter(x => x.r.paid && x.r.due);
  const col = (t: string, f: (d: string) => boolean, tone = '') => { const A = L.filter(x => f(x.r.due)).sort((a, b) => a.r.due.localeCompare(b.r.due)); return <div class="ren-col"><div class="h2 first">{t} <span class={cx('pill', tone)}>{A.length}</span></div>{A.length ? A.map(x => <div class="item"><div class="main"><div class="t">{x.w.deal}</div><div class="s">{planLabel(x.w)} · due {fmtDay(x.r.due)} · ${fmtNum(x.r.mrr)}/mo</div></div><Btn onClick={() => { markRenewed(x.w); toast('Marked renewed'); }}>Renewed</Btn></div>) : <Empty>None.</Empty>}</div>; };
  return <><Tiles><Stat l="Renewals tracked" v={L.length} /><Stat l="Overdue" v={L.filter(x => x.r.due < td).length} tone={L.some(x => x.r.due < td) ? 'bad' : ''} /><Stat l="MRR" v={'$' + fmtNum(L.reduce((n, x) => n + x.r.mrr, 0))} /></Tiles>
    <div class="ren-board">{col('Overdue', d => d < td, 'bad')}{col('This month', d => d >= td && d.slice(0, 7) === m0, 'warn')}{col('Next month', d => d.slice(0, 7) === m1)}{col('Later', d => d.slice(0, 7) > m1)}</div></>;
}

// ================= Stuck deals =================
function Stuck() {
  void rev.value; const [n, setN] = useState(lsJSON<number>('v2_stuck_days', 7)), cut = Date.now() - n * 864e5;
  const L = deals().filter(d => d.stage !== WON && d.stage !== LOST && d.stage !== 'Churn' && Math.max(d.ts, d.meta?.placeTs || 0) < cut);
  const by = DEAL_STAGES.filter(s => L.some(d => d.stage === s));
  return <>
    <div class="ctl"><span>No change for</span><input class="in" type="number" aria-label="Days" style={{ width: '80px' }} value={n} onChange={e => { const v = Math.max(1, +(e.target as HTMLInputElement).value || 7); setN(v); lsSet('v2_stuck_days', String(v)); }} /><span>days</span><span class="pill bad">{L.length}</span></div>
    {by.length ? by.map(s => <><div class="h2">{s}</div>{L.filter(d => d.stage === s).sort((a, b) => a.ts - b.ts).map(d => <div class="item"><div class="main" style={{ cursor: 'pointer' }} onClick={() => go('dealboard', d.key)}><div class="t">{d.name}</div><div class="s">last change {ago(Math.max(d.ts, d.meta?.placeTs || 0))}</div></div><Btn onClick={() => openTaskForm({ title: 'Move ' + d.name + ' forward', deal: d.name, due: todayKey() })}>Task</Btn><select class="in" aria-label="Move to stage" style={{ width: 'auto' }} value="" onChange={e => { const v = (e.target as HTMLSelectElement).value; if (v) { moveDeal(d, v); toast('Moved to ' + v); } }}><option value="">Move…</option>{DEAL_STAGES.map(x => <option>{x}</option>)}</select></div>)}</>) : <Empty>No stuck deals.</Empty>}
  </>;
}

// ================= Greetings & renewal messages =================
const greet = () => ({ renew: 'Hi, your {plan} plan for {deal} ({price}) renews on {date}. Would you like to renew it? I can help with it today.', ...(get<any>('cfg', 'greet') || {}) });
function Greetings() {
  void rev.value; const td = todayKey(), g = greet(), L = wonDeals().map(w => ({ w, r: renewalOf(w) })).filter(x => x.r.paid && x.r.due && x.r.due >= addDays(td, -3) && x.r.due <= addDays(td, 14)).sort((a, b) => a.r.due.localeCompare(b.r.due));
  const fill = (x: typeof L[0]) => g.renew.replace(/\{(\w+)\}/g, (mm: string, k: string) => (({ name: x.w.deal, deal: x.w.deal, plan: planLabel(x.w), price: x.w.price ? '$' + x.w.price : '', date: fmtDay(x.r.due) } as Record<string, string>)[k] ?? mm));
  return <>
    <Field label="Renewal message ({deal} {plan} {price} {date})" full><textarea class="in" rows={3} value={g.renew} onChange={e => put('cfg', 'greet', { renew: (e.target as HTMLTextAreaElement).value })} /></Field>
    <div class="h2">Renewals in the next 14 days ({L.length})</div>
    {L.length ? L.map(x => <div class="item"><div class="main"><div class="t">{x.w.deal}</div><div class="s">due {fmtDay(x.r.due)} · {planLabel(x.w)}</div><div class="n">{fill(x)}</div></div><div class="acts"><IconBtn icon="copy" sm title="Copy message" onClick={() => { copyText(fill(x)); toast('Copied'); }} /><IconBtn icon="wa" sm title="Open WhatsApp with the message" onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent(fill(x)), '_blank', 'noopener')} /></div></div>) : <Empty>No renewals coming up.</Empty>}
    <p class="faint" style={{ fontSize: '.75rem' }}>Contact birthdays are not kept in this app (privacy), so birthday greetings are not shown.</p>
  </>;
}

// ================= Draft my Day End =================
export function draftDayEnd(k = todayKey()) {
  const E = entriesOf(k); if (!E.length) return 'No entries on ' + fmtDay(k, true) + ' yet.';
  const by = (sk: string) => E.filter(e => e.sk === sk), won = by('tasks').filter(e => e.stage === WON), lost = by('tasks').filter(e => e.stage === LOST);
  const L = ['Day End – ' + fmtDay(k, true), '', 'Today I logged ' + E.length + ' entries: ' + DE_SECTIONS.map(s => by(s.key).length + ' ' + s.label.toLowerCase()).filter(x => !/^0 /.test(x)).join(', ') + '.'];
  if (won.length) L.push('Won: ' + won.map(e => e.deal + (e.plan ? ' (' + planLabel(e) + ')' : '')).join(', ') + '.');
  if (lost.length) L.push('Lost: ' + lost.map(e => e.deal).join(', ') + '.');
  const moved = by('tasks').filter(e => e.stage && e.stage !== WON && e.stage !== LOST); if (moved.length) L.push('Deals worked on: ' + Array.from(new Set(moved.map(e => (e.deal || '') + ' → ' + e.stage))).slice(0, 12).join('; ') + '.');
  if (by('tickets').length) L.push('Tickets: ' + by('tickets').map(e => entryText(e).slice(0, 50)).slice(0, 8).join('; ') + '.');
  const due = allTasks().filter(t => !t.done && t.due === addDays(k, 1)); if (due.length) L.push('Tomorrow: ' + due.map(t => t.title).slice(0, 8).join('; ') + '.');
  return L.join('\n');
}
function Draft() { const [k, setK] = useState(todayKey()), t = draftDayEnd(k); return <><div class="ctl"><input class="in" type="date" aria-label="Day" style={{ width: 'auto' }} value={k} onChange={e => setK((e.target as HTMLInputElement).value || k)} /><Btn icon="copy" onClick={() => { copyText(t); toast('Draft copied'); }}>Copy</Btn></div><pre class="tpl-prev">{t}</pre></>; }

// ================= Follow-ups & goals =================
export const goals = () => ({ day: 30, week: 150, ...(get<any>('cfg', 'goals') || {}) });
function Goals() {
  void rev.value; const g = goals(), td = todayKey(), wk = Array.from({ length: 7 }, (_, i) => addDays(td, -((parseKey(td).getDay() + 6) % 7) + i)).filter(k => k <= td);
  const dayN = entriesOf(td).length, weekN = wk.reduce((n, k) => n + entriesOf(k).length, 0), due = allTasks().filter(t => !t.done && t.due && t.due <= td), fol = deals().filter(d => d.follow && d.follow <= td);
  const bar = (v: number, m: number) => <div class="coll-prog"><i style={{ width: Math.min(100, Math.round(v / Math.max(1, m) * 100)) + '%' }} /></div>;
  return <>
    <Tiles><Stat l="Entries today" v={dayN + ' / ' + g.day} c={Math.round(dayN / Math.max(1, g.day) * 100) + '%'} tone={dayN >= g.day ? 'good' : 'acc'} /><Stat l="Entries this week" v={weekN + ' / ' + g.week} c={Math.round(weekN / Math.max(1, g.week) * 100) + '%'} tone={weekN >= g.week ? 'good' : ''} /><Stat l="Follow-ups due" v={due.length + fol.length} tone={due.length + fol.length ? 'bad' : 'good'} onClick={() => go('tasks')} /></Tiles>
    {bar(dayN, g.day)}
    <div class="form" style={{ marginTop: '12px' }}><Field label="Daily goal (entries)"><input class="in" type="number" value={g.day} onChange={e => put('cfg', 'goals', { day: Math.max(1, +(e.target as HTMLInputElement).value || 30) })} /></Field><Field label="Weekly goal (entries)"><input class="in" type="number" value={g.week} onChange={e => put('cfg', 'goals', { week: Math.max(1, +(e.target as HTMLInputElement).value || 150) })} /></Field></div>
    <div class="h2">Follow-ups due</div>
    {[...due.map(t => ({ t: t.title, s: 'Task · ' + fmtDay(t.due), f: () => go('tasks') })), ...fol.map(d => ({ t: d.name, s: 'Deal follow-up · ' + fmtDay(d.follow), f: () => go('dealboard', d.key) }))].map(x => <div class="item" style={{ cursor: 'pointer' }} onClick={x.f}><div class="main"><div class="t">{x.t}</div><div class="s">{x.s}</div></div></div>)}
    {!due.length && !fol.length && <Empty>Nothing due. Nice.</Empty>}
  </>;
}

// ================= My shortcuts =================
const SC: CDef = { label: 'My shortcuts', ttl: 'label', sub: ['url'], hint: 'A link to a website, a Google Sheet or a WhatsApp chat (wa.me/…). It shows in Tools and in Jump to.', f: [{ k: 'label', label: 'Name', req: true }, { k: 'url', label: 'Link', req: true }] };
function Shortcuts() { return <CollList def={SC} c="shortcuts" addLabel="Add shortcut" extra={x => <div class="ctl" style={{ margin: '6px 0 0' }} onClick={e => e.stopPropagation()}><Btn icon="link" onClick={() => window.open(/^https?:/i.test(x.url) ? x.url : 'https://' + x.url, '_blank', 'noopener')}>Open</Btn></div>} />; }

export const TOOLS2: Tool[] = [
  { id: 'missing', label: 'Missing information', icon: 'filter', desc: 'Closed Won without details, deals without a link', C: Missing, group: 'Data care' },
  { id: 'dupes', label: 'Duplicate finder', icon: 'copy', desc: 'Same link or almost the same name', C: Dupes, group: 'Data care' },
  { id: 'import', label: 'Import CSV / paste a list', icon: 'up', desc: 'Add many deals at once', C: ImportDeals, group: 'Data care' },
  { id: 'trash', label: 'Trash & activity', icon: 'trash', desc: 'Restore deleted items, recent changes', C: TrashActivity, group: 'Data care' },
  { id: 'restore', label: 'Restore points', icon: 'restore', desc: 'Automatic daily snapshots on this device', C: RestorePoints, group: 'Data care' },
  { id: 'calendar', label: 'Calendar', icon: 'cal', desc: 'Tasks, follow-ups, renewals, leave', C: Calendar, group: 'Planning' },
  { id: 'recurring', label: 'Recurring tasks', icon: 'restore', desc: 'Daily / weekly / monthly tasks', C: Recurring, group: 'Planning' },
  { id: 'goals', label: 'Follow-ups & goals', icon: 'star', desc: 'Daily and weekly targets', C: Goals, group: 'Planning' },
  { id: 'renewals', label: 'Renewals board', icon: 'won', desc: 'Overdue / this month / next month', C: Renewals, group: 'Deals' },
  { id: 'stuck', label: 'Stuck deals', icon: 'deal', desc: 'Deals with no change for N days', C: Stuck, group: 'Deals' },
  { id: 'greetings', label: 'Greetings & renewal messages', icon: 'wa', desc: 'Renewal messages ready to send', C: Greetings, group: 'Messages' },
  { id: 'draft', label: 'Draft my Day End', icon: 'day', desc: 'A written summary of the day', C: Draft, group: 'Daily' },
  { id: 'shortcuts', label: 'My shortcuts', icon: 'link', desc: 'Your own links', C: Shortcuts, group: 'Daily' },
  { id: 'comfort', label: 'Focus, one-hand, app lock & comfort', icon: 'gear', desc: 'Focus mode, one-hand mode, PIN lock, text size, motion', C: ComfortTool, group: 'Daily' },
];
void tickets; void isClosedT; void csv; void Sheet; void closeModal; void openModal;
