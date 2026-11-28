// Automation Studio (Round 61): when → (only if) → do, with a run log. Same flow shape as the old app's hub_flows_v1, so old
// flows convert as they are; trigger / action types this app doesn't have are kept, shown as "not supported yet", and skipped.
// Each flow fires once per item. Created items get deterministic ids, so two devices running the same flow never duplicate.
import { useState } from 'preact/hooks';
import { all, get, put, raw, rev, del, onLocalChange } from '../data/store';
import { deals, Deal, allTasks, wonDeals, renewalOf, moveDeal, addDealNote, saveTask, folders, saveTicket, Task } from '../domain/crm';
import { entriesOf, entryText, Entry, DEAL_STAGES, WON, LOST, normStage } from '../domain/dayend';
import { punchesOf, hrSet } from '../domain/hr';
import { addDays, hash, keyOf, lsJSON, lsSet, todayKey, uid, cx, timeToMin } from '../lib/util';
import { Btn, Empty, Field, IconBtn, Sheet, Switch, closeModal, openModal, toast, confirmBox } from '../ui/kit';

type P = [string, string, 'num' | 'txt' | 'time' | 'date' | 'sel' | 'stage' | 'folder' | 'days', unknown];
export const TRIG: Record<string, { l: string; d: string; p: P[]; deal?: 1 }> = {
  rec: { l: 'A Day End entry matches', d: 'A new entry whose words / stage match the conditions.', p: [] },
  stagein: { l: 'A deal reaches a stage', d: 'Fires once for each deal that moves into the stage.', deal: 1, p: [['stage', 'Stage', 'stage', 'Demo Completed']] },
  stagedays: { l: 'A deal stays in a stage too long', d: 'Deals that have not moved for this many days.', deal: 1, p: [['stage', 'Stage', 'stage', 'Interested'], ['n', 'Days', 'num', 5]] },
  quiet: { l: 'No contact for a while', d: 'Open deals with no entry for this many days.', deal: 1, p: [['n', 'Days', 'num', 7]] },
  overdue: { l: 'A task is overdue', d: 'Open tasks this many days past their date.', p: [['n', 'Days overdue', 'num', 1], ['folder', 'In folder', 'folder', '']] },
  pile: { l: 'Too many open tasks', d: 'Open tasks reach this number (once a day).', p: [['n', 'Open tasks', 'num', 15]] },
  taskdone: { l: 'A task is completed', d: 'After you complete a task (only tasks completed after the automation was saved).', p: [['folder', 'In folder', 'folder', '']] },
  renewal: { l: 'A renewal is coming up', d: 'Subscriptions renewing within this many days.', p: [['n', 'Days before', 'num', 14]] },
  gap: { l: 'No Day End entry for a while', d: 'During your shift, nothing entered for this long (checked every few minutes).', p: [['n', 'Minutes', 'num', 90]] },
  low: { l: 'Fewer than N entries by a time', d: 'At that time, today has fewer entries than you want.', p: [['at', 'By', 'time', '15:00'], ['n', 'Entries', 'num', 10]] },
  time: { l: 'At a time of day', d: 'Once a day at this time (also on the next open if the app was closed).', p: [['at', 'Time', 'time', '09:00'], ['days', 'Days', 'days', ['0', '1', '2', '3', '4', '6']]] },
  interval: { l: 'Every N minutes', d: 'Repeats on a timer, optionally only between two times.', p: [['n', 'Minutes', 'num', 60], ['from', 'From (optional)', 'time', ''], ['to', 'To (optional)', 'time', '']] },
  monthly: { l: 'Once a month', d: 'On a day of the month, at a time.', p: [['dom', 'Day of month', 'num', 1], ['at', 'At', 'time', '09:00']] },
  date: { l: 'On one date', d: 'One time only.', p: [['date', 'Date', 'date', ''], ['at', 'At', 'time', '09:00']] },
  clock: { l: 'I clock in or out', d: 'When you press a clock button.', p: [['which', 'When I', 'sel', ['in', 'out', 'break', 'back']]] },
};
const DUES = ['today', 'tomorrow', 'in 2 days', 'in 3 days', 'in a week', 'in 2 weeks'];
export const ACT: Record<string, { l: string; p: P[]; deal?: 1 }> = {
  task: { l: 'Add a task', p: [['title', 'Task title', 'txt', 'Follow up {name}'], ['notes', 'Notes', 'txt', ''], ['due', 'Due', 'sel', DUES], ['priority', 'Priority', 'sel', ['normal', 'high', 'low']], ['folder', 'Folder', 'folder', '']] },
  followup: { l: 'Set the follow-up date', deal: 1, p: [['when', 'Date', 'sel', DUES]] },
  stage: { l: 'Move the deal to a stage', deal: 1, p: [['stage', 'Stage', 'stage', 'Interested']] },
  tag: { l: 'Add a tag', deal: 1, p: [['tag', 'Tag', 'txt', 'follow-up']] },
  owner: { l: 'Assign an owner', deal: 1, p: [['name', 'Owner', 'txt', 'Me']] },
  note: { l: 'Add a note to the deal', deal: 1, p: [['text', 'Note', 'txt', 'Automation: {days} days since last contact']] },
  ticket: { l: 'Create a ticket', p: [['subject', 'Ticket subject', 'txt', '{name}: follow up'], ['desc', 'Details', 'txt', '{note}']] },
  notify: { l: 'Show a reminder', p: [['text', 'Message', 'txt', 'Reminder: {name}']] },
  snapshot: { l: 'Take a safety snapshot of all data', p: [] },
  clear_done: { l: 'Delete done tasks older than N days', p: [['n', 'Older than (days)', 'num', 30]] },
};
export interface Flow { id: string; name: string; on: boolean; created: number; trigger: Record<string, any>; cond: Record<string, any>; actions: Record<string, any>[]; rep?: string }
export const flows = () => { void rev.value; return all<Flow>('flows').sort((a, b) => (a.created || 0) - (b.created || 0)); };
export const supported = (f: Flow) => !!TRIG[f.trigger?.type] && (f.actions || []).every(a => !!ACT[a.type]);
interface Hit { key: string; name: string; d?: Deal | null; vars: Record<string, string>; taskId?: string }
const hm = (d = new Date()) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
const dealOf = (e: Partial<Entry>) => { const n = String(e.deal || '').toLowerCase(); return n ? deals().find(d => d.name.toLowerCase() === n) || null : null; };
const dueOf = (w: string) => { const td = todayKey(); return w === 'tomorrow' ? addDays(td, 1) : w === 'in 2 days' ? addDays(td, 2) : w === 'in 3 days' ? addDays(td, 3) : w === 'in a week' ? addDays(td, 7) : w === 'in 2 weeks' ? addDays(td, 14) : td; };
const fill = (s: string, v: Record<string, string>) => String(s || '').replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));
const daysSince = (ts: number) => Math.floor((Date.now() - ts) / 864e5);

function words(c: Record<string, any>, text: string) {
  const t = text.toLowerCase(), any: string[] = (c.any || []).map((x: string) => String(x).toLowerCase().trim()).filter(Boolean), not: string[] = (c.not || []).map((x: string) => String(x).toLowerCase().trim()).filter(Boolean);
  if (not.some(w => t.indexOf(w) >= 0)) return null;
  if (!any.length) return '';
  const hit = any.filter(w => t.indexOf(w) >= 0); if (c.combine === 'all' ? hit.length !== any.length : !hit.length) return null; return hit[0];
}
/** items that match a flow right now. */
export function targets(f: Flow, now = new Date()): Hit[] {
  const T = f.trigger || {}, c = f.cond || {}, td = keyOf(now), out: Hit[] = [], created = f.created || 0, stages: string[] = c.stages || [];
  const okStage = (s: string) => !stages.length || stages.indexOf(s) >= 0;
  const dv = (d: Deal, extra: Record<string, string> = {}) => ({ name: d.name, stage: d.stage, days: String(daysSince(Math.max(d.ts, d.meta?.placeTs || 0))), note: d.entries.length ? entryText(d.entries[d.entries.length - 1]).slice(0, 200) : '', ...extra });
  const timeHit = (at: string) => hm(now) >= (at || '00:00');
  switch (T.type) {
    case 'rec': entriesOf(td).forEach(e => { const ts = e.at || 0; if (ts && ts < created) return; const st = normStage(e.stage); if (!okStage(st)) return; if (c.noStage && st) return; const ph = words(c, entryText(e)); if (ph === null) return; const d = dealOf(e); out.push({ key: 'e:' + e.id, name: e.deal || '', d, vars: { name: e.deal || '', stage: st, note: entryText(e).slice(0, 200), phrase: ph, day: e.day, days: '0' } }); }); break;
    case 'stagein': deals().forEach(d => { if (d.stage !== T.stage || Math.max(d.ts, d.meta?.placeTs || 0) < created) return; out.push({ key: 'd:' + d.key + ':' + T.stage, name: d.name, d, vars: dv(d) }); }); break;
    case 'stagedays': deals().forEach(d => { const last = Math.max(d.ts, d.meta?.placeTs || 0); if (d.stage !== T.stage || daysSince(last) < (+T.n || 1)) return; out.push({ key: 'd:' + d.key + ':' + last, name: d.name, d, vars: dv(d) }); }); break;
    case 'quiet': deals().forEach(d => { if (d.stage === WON || d.stage === LOST || d.stage === 'Churn') return; if (!okStage(d.stage)) return; const last = Math.max(d.ts, d.meta?.placeTs || 0); if (daysSince(last) < (+T.n || 7)) return; out.push({ key: 'd:' + d.key + ':' + last, name: d.name, d, vars: dv(d) }); }); break;
    case 'overdue': allTasks().forEach(t => { if (t.done || !t.due || (T.folder && (t.folder || '') !== T.folder)) return; const n = Math.round((+new Date(td + 'T00:00') - +new Date(t.due + 'T00:00')) / 864e5); if (n < (+T.n || 1)) return; out.push({ key: 't:' + t.id, name: t.title, d: t.deal ? dealOf({ deal: t.deal }) : null, taskId: t.id, vars: { name: t.deal || t.title, note: t.notes || '', days: String(n), stage: '' } }); }); break;
    case 'pile': { const n = allTasks().filter(t => !t.done).length; if (n >= (+T.n || 15)) out.push({ key: 'day:' + td, name: '', vars: { count: String(n), name: '', stage: '', note: '', days: '0' } }); break; }
    case 'taskdone': allTasks().forEach(t => { if (!t.done || !t.doneAt || t.doneAt < created || (T.folder && (t.folder || '') !== T.folder)) return; out.push({ key: 't:' + t.id, name: t.title, d: t.deal ? dealOf({ deal: t.deal }) : null, taskId: t.id, vars: { name: t.deal || t.title, note: t.notes || '', stage: '', days: '0' } }); }); break;
    case 'renewal': wonDeals().forEach(w => { const r = renewalOf(w); if (!r.paid || !r.due) return; const n = Math.round((+new Date(r.due + 'T00:00') - +new Date(td + 'T00:00')) / 864e5); if (n < 0 || n > (+T.n || 14)) return; out.push({ key: 'r:' + w.id + ':' + r.due, name: w.deal, d: dealOf({ deal: w.deal }), vars: { name: w.deal, stage: WON, days: String(n), date: r.due, note: '' } }); }); break;
    case 'gap': { const S = hrSet(), m = now.getHours() * 60 + now.getMinutes(); if (m < timeToMin(S.shiftStart) || m > timeToMin(S.shiftEnd)) break; const E = entriesOf(td), last = Math.max(0, ...E.map(e => e.at || 0)), since = last ? (Date.now() - last) / 6e4 : m - timeToMin(S.shiftStart); if (since >= (+T.n || 90)) out.push({ key: 'g:' + td + ':' + (last || 'start'), name: '', vars: { count: String(E.length), name: '', note: '', stage: '', days: '0' } }); break; }
    case 'low': { if (!timeHit(T.at)) break; const n = entriesOf(td).length; if (n < (+T.n || 10)) out.push({ key: 'l:' + td, name: '', vars: { count: String(n), name: '', note: '', stage: '', days: '0' } }); break; }
    case 'time': { const ds: string[] = T.days || ['0', '1', '2', '3', '4', '5', '6']; if (ds.indexOf(String(now.getDay())) >= 0 && timeHit(T.at)) out.push({ key: 'tm:' + td, name: '', vars: { name: '', note: '', stage: '', days: '0', count: '' } }); break; }
    case 'interval': { const n = Math.max(5, +T.n || 60), cur = hm(now); if ((T.from && cur < T.from) || (T.to && cur > T.to)) break; out.push({ key: 'iv:' + Math.floor(Date.now() / (n * 6e4)), name: '', vars: { name: '', note: '', stage: '', days: '0' } }); break; }
    case 'monthly': { const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); if (now.getDate() === Math.min(+T.dom || 1, last) && timeHit(T.at)) out.push({ key: 'mo:' + td.slice(0, 7), name: '', vars: { name: '', note: '', stage: '', days: '0' } }); break; }
    case 'date': if (T.date && (td > T.date || (td === T.date && timeHit(T.at)))) out.push({ key: 'dt:' + T.date, name: '', vars: { name: '', note: '', stage: '', days: '0' } }); break;
    case 'clock': { const k = ({ in: 'in', out: 'out', break: 'bs', back: 'be' } as Record<string, string>)[T.which || 'in']; [addDays(td, -1), td].forEach(day => punchesOf(day).forEach(p => { if (p.k === k && p.at >= created) out.push({ key: 'p:' + p.id, name: '', vars: { name: '', note: '', stage: '', days: '0' } }); })); break; }
  }
  if (TRIG[T.type]?.deal && c.openOnly) return out.filter(h => !h.d || (h.d.stage !== WON && h.d.stage !== LOST));
  return out;
}
const seenK = 'v2_flowseen';
export interface LogRow { at: number; flow: string; name: string; did: string[] }
export const runLog = () => lsJSON<LogRow[]>('v2_flowlog', []).slice().reverse();
function logRun(r: LogRow) { const a = lsJSON<LogRow[]>('v2_flowlog', []); a.push(r); lsSet('v2_flowlog', JSON.stringify(a.slice(-300))); }
/** do the actions for one hit; returns what was done. dry = only describe. */
export function doActions(f: Flow, h: Hit, dry = false): string[] {
  const did: string[] = [], v = { date: todayKey(), ...h.vars }, base = hash(f.id + '|' + h.key);
  (f.actions || []).forEach((a, i) => {
    const def = ACT[a.type]; if (!def) return; if (def.deal && !h.d) return;
    const id = 'fl' + base + i;
    switch (a.type) {
      case 'task': { const title = fill(a.title || 'Follow up {name}', v); did.push('task: ' + title); if (dry || get('tasks', id) || raw('tasks', id)) return; saveTask({ id, title, notes: fill(a.notes || '', v), due: dueOf(a.due), priority: a.priority || 'normal', folder: a.folder || '', deal: h.d?.name || h.name || '' }); return; }
      case 'followup': did.push('follow-up ' + dueOf(a.when) + ': ' + h.d!.name); if (!dry) put('dealmeta', h.d!.key, { follow: dueOf(a.when) }); return;
      case 'stage': did.push('stage → ' + a.stage + ': ' + h.d!.name); if (!dry && h.d!.stage !== a.stage) moveDeal(h.d!, a.stage); return;
      case 'tag': { const tg = fill(a.tag || '', v).trim(); if (!tg) return; did.push('tag ' + tg + ': ' + h.d!.name); if (!dry && h.d!.tags.indexOf(tg) < 0) put('dealmeta', h.d!.key, { tags: [...h.d!.tags, tg] }); return; }
      case 'owner': did.push('owner ' + a.name + ': ' + h.d!.name); if (!dry) put('dealmeta', h.d!.key, { owner: a.name || 'Me' }); return;
      case 'note': { const t = fill(a.text || '', v); did.push('note: ' + t); if (dry || get('dealnotes', id) || raw('dealnotes', id)) return; put('dealnotes', id, { deal: h.d!.key, ts: Date.now(), text: t }); return; }
      case 'ticket': { const s = fill(a.subject || '{name}: follow up', v); did.push('ticket: ' + s); if (dry || get('tickets', id) || raw('tickets', id)) return; saveTicket({ id, subject: s, desc: fill(a.desc || '', v), deal: h.d?.name || h.name || '' }); return; }
      case 'notify': { const t = fill(a.text || 'Reminder', v); did.push('reminder: ' + t); if (dry) return; toast('⚙ ' + t); try { if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification(f.name, { body: t, icon: './icon-192.png' }); } catch { /* */ } return; }
      case 'snapshot': did.push('safety snapshot'); if (!dry) import('./restorepoints').then(m => m.takePoint('automation: ' + f.name)).catch(() => { /* */ }); return;
      case 'clear_done': { const cut = Date.now() - (+a.n || 30) * 864e5, L = all<Task>('tasks').filter(t => t.done && (t.doneAt || 0) < cut); did.push('delete ' + L.length + ' done tasks'); if (!dry) L.forEach(t => del('tasks', t.id)); return; }
    }
  });
  return did;
}
const CAP_RUN = 100;
export function runFlows(now = new Date()) {
  const seen: Record<string, 1> = lsJSON(seenK, {}); let fired = 0;
  flows().forEach(f => {
    if (!f.on || !supported(f)) return; let n = 0;
    targets(f, now).forEach(h => { const k = f.id + '|' + h.key; if (seen[k] || n >= CAP_RUN) return; seen[k] = 1; n++; const did = doActions(f, h); if (did.length) { fired++; logRun({ at: Date.now(), flow: f.id, name: f.name, did }); } });
  });
  const ks = Object.keys(seen); if (ks.length > 6000) ks.slice(0, ks.length - 5000).forEach(k => delete seen[k]);
  lsSet(seenK, JSON.stringify(seen)); return fired;
}
/** a flow saved now: everything that matches already is marked seen, so it only reacts to new things (as before). Time triggers are not pre-marked. */
function primeSeen(f: Flow) { if (['time', 'monthly', 'date', 'interval', 'low', 'pile', 'gap'].indexOf(f.trigger.type) >= 0) return; const seen: Record<string, 1> = lsJSON(seenK, {}); targets(f).forEach(h => { seen[f.id + '|' + h.key] = 1; }); lsSet(seenK, JSON.stringify(seen)); }
let installed = false;
export function installFlows() {
  if (installed) return; installed = true; let t: any = 0;
  onLocalChange(r => { if (r.c === 'flows' || r.c.charAt(0) === '_' || r.c === 'cfg') return; clearTimeout(t); t = setTimeout(() => { try { runFlows(); } catch { /* */ } }, 900); });
  setTimeout(() => { try { runFlows(); } catch { /* */ } }, 6000); setInterval(() => { try { runFlows(); } catch { /* */ } }, 60000);
}

// ---------- ready-made templates (from the old app) ----------
const F = (name: string, trigger: Record<string, any>, actions: Record<string, any>[], cond: Record<string, any> = {}) => ({ name, trigger, actions, cond });
const task = (title: string, due = 'today', priority = 'normal', notes = '') => ({ type: 'task', title, due, priority, notes, folder: '' });
export const FLOW_TPL = [
  F('Price mention → task', { type: 'rec' }, [task('Send price – {name}')], { any: ['price', 'how much', 'quote'], combine: 'any' }),
  F('Complaint → high priority + reminder', { type: 'rec' }, [task('Handle complaint – {name}', 'today', 'high', '{note}'), { type: 'notify', text: 'Complaint: {name}' }], { any: ['complaint', 'unhappy', 'angry'], combine: 'any' }),
  F('Callback request → task today', { type: 'rec' }, [task('Call back – {name}', 'today', 'high')], { any: ['call back', 'call me later'], combine: 'any' }),
  F('Paid but no stage → task', { type: 'rec' }, [task('Update deal stage – {name}', 'today', 'normal', 'Mentions “{phrase}” with no stage.')], { any: ['paid', 'payment done'], noStage: true }),
  F('Demo completed → follow up in 2 days', { type: 'stagein', stage: 'Demo Completed' }, [task('Follow up after demo – {name}', 'in 2 days'), { type: 'followup', when: 'in 2 days' }]),
  F('Stuck in Interested for 5 days', { type: 'stagedays', stage: 'Interested', n: 5 }, [task('Push {name} to a demo – {days} days in {stage}', 'today', 'high')]),
  F('Quiet deal for 7 days', { type: 'quiet', n: 7 }, [task('Check in with {name}')], { openOnly: true }),
  F('Renewal in 14 days → task', { type: 'renewal', n: 14 }, [task('Renewal for {name} on {date}', 'today')]),
  F('Overdue task → reminder', { type: 'overdue', n: 1 }, [{ type: 'notify', text: 'Overdue {days} days: {name}' }]),
  F('No entry for 90 minutes', { type: 'gap', n: 90 }, [{ type: 'notify', text: 'No Day End entry for a while – add what you did' }]),
  F('Morning plan at 9:00', { type: 'time', at: '09:00', days: ['0', '1', '2', '3', '4', '6'] }, [{ type: 'notify', text: 'Good morning – check Today and the call-back queue' }]),
  F('Weekly snapshot', { type: 'time', at: '18:00', days: ['4'] }, [{ type: 'snapshot' }]),
];

// ---------- UI ----------
export function Studio() {
  void rev.value; const L = flows(), [log, setLog] = useState(false);
  return <>
    <div class="ctl" style={{ flexWrap: 'wrap' }}><button type="button" class="b-add" onClick={() => openModal(() => <FlowTpl />)}>+ New automation</button><Btn onClick={() => { const n = runFlows(); toast(n ? n + ' ran' : 'Nothing to do right now'); }}>Run now</Btn><Btn on={log} onClick={() => setLog(!log)}>Run log</Btn></div>
    {log ? (runLog().length ? runLog().slice(0, 150).map(r => <div class="item"><div class="main"><div class="t">{r.name}</div><div class="s">{new Date(r.at).toLocaleString()} · {r.did.join(' · ')}</div></div></div>) : <Empty>Nothing has run yet.</Empty>)
      : L.length ? L.map(f => { const ok = supported(f); return <div class={cx('item', !f.on && 'done')}><Switch on={f.on && ok} onChange={v => { if (!ok) return toast('This automation uses a part the new app doesn’t have yet'); put('flows', f.id, { on: v }); if (v) primeSeen(f); }} label={'Turn ' + f.name + (f.on ? ' off' : ' on')} />
        <div class="main" style={{ cursor: 'pointer' }} onClick={() => openModal(() => <FlowEdit f={f} />)}><div class="t">{f.name}{!ok && <span class="pill warn" style={{ marginLeft: '6px' }}>not supported yet</span>}</div><div class="s">When: {TRIG[f.trigger?.type]?.l || f.trigger?.type} · Do: {(f.actions || []).map(a => ACT[a.type]?.l || a.type).join(', ')}</div></div>
        <div class="acts"><IconBtn icon="edit" sm title="Edit" onClick={() => openModal(() => <FlowEdit f={f} />)} /><IconBtn icon="trash" sm bad title="Delete" onClick={() => confirmBox('Delete automation', 'Delete “' + f.name + '”?', 'Delete', () => del('flows', f.id))} /></div></div>; })
        : <Empty>No automations yet. Start from a ready-made one.</Empty>}
  </>;
}
function FlowTpl() {
  const make = (t: typeof FLOW_TPL[0] | null) => { const f: Flow = { id: uid('fl'), name: t ? t.name : 'New automation', on: false, created: Date.now(), trigger: t ? { ...t.trigger } : { type: 'rec' }, cond: t ? { ...t.cond } : {}, actions: t ? t.actions.map(a => ({ ...a })) : [task('Follow up {name}')] }; closeModal(); setTimeout(() => openModal(() => <FlowEdit f={f} isNew />), 10); };
  return <Sheet title="New automation" onClose={closeModal}><Btn onClick={() => make(null)}>Start blank</Btn><div class="lbl" style={{ margin: '10px 0 4px' }}>Ready-made</div>{FLOW_TPL.map(t => <div class="item" style={{ cursor: 'pointer' }} onClick={() => make(t)}><div class="main"><div class="t">{t.name}</div><div class="s">{TRIG[t.trigger.type].l}</div></div></div>)}</Sheet>;
}
function ParamInput({ p, v, on }: { p: P; v: any; on: (x: any) => void }) {
  const [k, label, kind, def] = p, val = v ?? (kind === 'sel' ? (def as string[])[0] : def);
  if (kind === 'sel') return <Field label={label}><select class="in" data-p={k} value={String(val)} onChange={e => on((e.target as HTMLSelectElement).value)}>{(def as string[]).map(o => <option>{o}</option>)}</select></Field>;
  if (kind === 'stage') return <Field label={label}><select class="in" data-p={k} value={String(val)} onChange={e => on((e.target as HTMLSelectElement).value)}>{DEAL_STAGES.map(o => <option>{o}</option>)}</select></Field>;
  if (kind === 'folder') return <Field label={label}><select class="in" data-p={k} value={String(val || '')} onChange={e => on((e.target as HTMLSelectElement).value)}><option value="">Any / Follow-ups</option>{folders().filter(x => x.id).map(x => <option value={x.id}>{x.name}</option>)}</select></Field>;
  if (kind === 'days') { const D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], cur: string[] = Array.isArray(val) ? val : []; return <Field label={label} full><div class="row-scroll" style={{ flexWrap: 'wrap' }}>{D.map((d, i) => <button type="button" class={cx('chip', cur.indexOf(String(i)) >= 0 && 'on')} onClick={() => on(cur.indexOf(String(i)) >= 0 ? cur.filter(x => x !== String(i)) : [...cur, String(i)])}>{d}</button>)}</div></Field>; }
  return <Field label={label}><input class="in" data-p={k} type={kind === 'num' ? 'number' : kind === 'time' ? 'time' : kind === 'date' ? 'date' : 'text'} value={String(val ?? '')} onInput={e => { const x = (e.target as HTMLInputElement).value; on(kind === 'num' ? +x : x); }} /></Field>;
}
function FlowEdit({ f: f0, isNew }: { f: Flow; isNew?: boolean }) {
  const [f, setF] = useState<Flow>(() => JSON.parse(JSON.stringify(f0))), T = TRIG[f.trigger.type], [test, setTest] = useState<string[] | null>(null);
  const setT = (p: Record<string, any>) => setF(o => ({ ...o, trigger: { ...o.trigger, ...p } })), setC = (p: Record<string, any>) => setF(o => ({ ...o, cond: { ...o.cond, ...p } }));
  const setA = (i: number, p: Record<string, any>) => setF(o => ({ ...o, actions: o.actions.map((a, j) => (j === i ? { ...a, ...p } : a)) }));
  const list = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);
  const save = (on?: boolean) => { const { id, ...r } = f; const rec = { ...r, on: on ?? f.on }; put('flows', id, rec); if (rec.on && supported(f)) primeSeen({ ...f, on: true }); closeModal(); toast('Automation saved'); };
  return <Sheet wide title={isNew ? 'New automation' : 'Edit automation'} onClose={closeModal} foot={<><Btn onClick={() => { const H = targets(f).slice(0, 20); setTest(H.length ? H.map(h => (h.name || h.key) + ' → ' + doActions(f, h, true).join(', ')) : []); }}>Test (dry run)</Btn>{isNew ? <><Btn onClick={() => save(false)}>Save (off)</Btn><button type="button" class="b-add" onClick={() => save(true)}>Save and turn on</button></> : <button type="button" class="b-add" onClick={() => save()}>Save</button>}</>}>
    <div class="form"><Field label="Name" full><input class="in" value={f.name} onInput={e => setF({ ...f, name: (e.target as HTMLInputElement).value })} /></Field></div>
    <div class="h2">When</div>
    <div class="form"><Field label="Trigger" full><select class="in" data-p="type" value={f.trigger.type} onChange={e => setF({ ...f, trigger: { type: (e.target as HTMLSelectElement).value } })}>{Object.keys(TRIG).map(k => <option value={k}>{TRIG[k].l}</option>)}{!T && <option value={f.trigger.type}>{f.trigger.type} (not supported yet)</option>}</select></Field>
      {T && T.p.map(p => <ParamInput p={p} v={f.trigger[p[0]]} on={x => setT({ [p[0]]: x })} />)}</div>
    {T && <p class="faint" style={{ fontSize: '.75rem', margin: '4px 0' }}>{T.d}</p>}
    <div class="h2">Only if</div>
    <div class="form">
      {f.trigger.type === 'rec' && <><Field label="Words (comma-separated)"><input class="in" data-c="any" value={(f.cond.any || []).join(', ')} onChange={e => setC({ any: list((e.target as HTMLInputElement).value) })} /></Field>
        <Field label="Match"><select class="in" value={f.cond.combine || 'any'} onChange={e => setC({ combine: (e.target as HTMLSelectElement).value })}><option value="any">Any of the words</option><option value="all">All of the words</option></select></Field>
        <Field label="But not these words"><input class="in" value={(f.cond.not || []).join(', ')} onChange={e => setC({ not: list((e.target as HTMLInputElement).value) })} /></Field>
        <Field label="Only entries with no deal stage"><Switch on={!!f.cond.noStage} onChange={v => setC({ noStage: v })} /></Field></>}
      {(f.trigger.type === 'rec' || f.trigger.type === 'quiet') && <Field label="Only these stages (none = any)" full><div class="row-scroll" style={{ flexWrap: 'wrap' }}>{DEAL_STAGES.map(s => { const cur: string[] = f.cond.stages || []; return <button type="button" class={cx('chip', cur.indexOf(s) >= 0 && 'on')} onClick={() => setC({ stages: cur.indexOf(s) >= 0 ? cur.filter(x => x !== s) : [...cur, s] })}>{s}</button>; })}</div></Field>}
      {T?.deal && <Field label="Only open deals"><Switch on={!!f.cond.openOnly} onChange={v => setC({ openOnly: v })} /></Field>}
    </div>
    <div class="h2">Do</div>
    {f.actions.map((a, i) => <div class="card flow-act"><div class="form"><Field label={'Action ' + (i + 1)} full><select class="in" data-a={i} value={a.type} onChange={e => setF(o => ({ ...o, actions: o.actions.map((x, j) => (j === i ? { type: (e.target as HTMLSelectElement).value } : x)) }))}>{Object.keys(ACT).map(k => <option value={k}>{ACT[k].l}</option>)}{!ACT[a.type] && <option value={a.type}>{a.type} (not supported yet)</option>}</select></Field>
      {ACT[a.type]?.p.map(p => <ParamInput p={p} v={a[p[0]]} on={x => setA(i, { [p[0]]: x })} />)}</div>
      <div class="ctl" style={{ margin: '6px 0 0' }}><Btn icon="trash" onClick={() => setF(o => ({ ...o, actions: o.actions.filter((_, j) => j !== i) }))}>Remove action</Btn></div></div>)}
    <Btn icon="plus" onClick={() => setF(o => ({ ...o, actions: [...o.actions, task('Follow up {name}')] }))}>Add action</Btn>
    <p class="faint" style={{ fontSize: '.75rem' }}>Words you can use: {'{name}'} (deal) {'{stage}'} {'{days}'} {'{note}'} {'{phrase}'} {'{count}'} {'{date}'}. Each automation fires once per item.</p>
    {test && <><div class="h2">Would run for {test.length}{test.length >= 20 ? '+' : ''}</div>{test.length ? test.map(t => <div class="s faint" style={{ fontSize: '.78rem' }}>• {t}</div>) : <Empty>Nothing matches right now.</Empty>}</>}
  </Sheet>;
}
void addDealNote;
