// HR & time (clock core), Automations (phrase rules), Settings (appearance, menus, privacy, sync, data).
import { useEffect, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { rev, put, get, all, del, trash, restore, privacyHits } from '../data/store';
import { act, calc, status, hrSet, HR_DEF, punchesOf, addPunch, movePunch, removePunch, weekKeys, t as hrT } from '../domain/hr';
import { allEntryDays, entriesOf, entryText, Entry } from '../domain/dayend';
import { folders, saveTask, saveTicket, classify, ticketCfg, msgCfg, allTasks } from '../domain/crm';
import { clock, dur, fmtDay, keyOf, lsGet, lsJSON, lsSet, shiftDayKey, todayKey, uid, cx, ago, download } from '../lib/util';
import { Add, Btn, DangerBtn, Empty, Field, IconBtn, PageHead, Seg, Sheet, Stat, Switch, Tiles, closeModal, openModal, toast } from '../ui/kit';
import { PALETTES, SECTIONS, Tab, navCfg, saveNav, theme } from '../ui/state';
import { sync, signOut, listDevices, removeDevice, deviceInfo, cycle } from '../data/sync';
import { backup, restoreFile } from '../data/backup';
import { lastReport, localLegacy, runMigration, migratedCounts } from '../data/migrate';
import { moonHidden } from '../ui/moon';

// ================= HR & time =================
export function HR() {
  void rev.value; const [now, setNow] = useState(Date.now()); useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const st = status(), c = calc(st.key, now), [day, setDay] = useState(todayKey()), S = hrSet();
  const wk = weekKeys(day).map(k => ({ k, c: calc(k, now) })), wkWorked = wk.reduce((n, x) => n + x.c.worked, 0);
  const days = Array.from(new Set(all<any>('punches').map(p => p.day))).sort().reverse();
  return <div class="page">
    <PageHead icon="hr" title="HR & Time" sub="Clock in/out and breaks with exact times" />
    <div class="card tex hr-clock">
      <div><div class="lbl">{st.state === 'out' ? 'Clocked out' : st.state === 'break' ? 'On break' : 'Clocked in'}</div><div class="mono hr-big">{clock(c.worked)}</div><div class="faint">Worked today · breaks {dur(c.brk, true)}</div></div>
      <div class="ctl" style={{ marginLeft: 'auto', marginBottom: 0 }}>
        {st.state === 'out' && <button class="b-add" onClick={() => toast(act('in'))}>Clock in</button>}
        {st.state === 'work' && <><Btn icon="pause" onClick={() => toast(act('bs', { bt: 'meal' }))}>Meal break</Btn><Btn icon="pause" onClick={() => toast(act('bs', { bt: 'other' }))}>Short break</Btn><Btn icon="stop" onClick={() => toast(act('out'))}>Clock out</Btn></>}
        {st.state === 'break' && <><Btn icon="play" onClick={() => toast(act('be'))}>Back</Btn><Btn icon="stop" onClick={() => toast(act('out'))}>Clock out</Btn></>}
      </div>
    </div>
    <div class="h2">Week of {fmtDay(wk[0].k)}<span class="r"><IconBtn icon="left" title="Previous week" onClick={() => setDay(shiftDayKey(day, -7))} /><IconBtn icon="right" title="Next week" onClick={() => setDay(shiftDayKey(day, 7))} /></span></div>
    <Tiles><Stat l="Worked this week" v={dur(wkWorked, true)} c={'target ' + S.dayH * S.week.length + 'h'} tone="acc" />{wk.map(x => <Stat l={fmtDay(x.k).slice(0, 10)} v={x.c.n ? dur(x.c.worked, true) : '—'} c={x.c.first ? hrT(x.c.first) + ' – ' + (x.c.last ? hrT(x.c.last) : '…') : ' '} onClick={() => setDay(x.k)} />)}</Tiles>
    <div class="h2">Punches · {fmtDay(day, true)}<span class="r"><input class="in" type="date" style={{ width: 'auto' }} value={day} onChange={e => setDay((e.target as HTMLInputElement).value || day)} /><Btn icon="plus" onClick={() => openModal(() => <AddPunch day={day} />)}>Add</Btn></span></div>
    {punchesOf(day).length ? punchesOf(day).map(p => <div class="item"><div class="main"><div class="t">{({ in: 'Clock in', bs: 'Break start', be: 'Break end', out: 'Clock out' } as any)[p.k]}{p.bt ? ' (' + p.bt + ')' : ''}</div></div>
      <input class="in mono" type="time" step={1} style={{ width: '130px' }} value={tm(p.at)} onChange={e => { const v = (e.target as HTMLInputElement).value; if (v) { const [h, m, s] = v.split(':').map(Number); const d = new Date(p.at); d.setHours(h, m, s || 0); movePunch(p.id, +d); } }} />
      <DangerBtn onConfirm={() => removePunch(p.id)}>✕</DangerBtn></div>) : <Empty>No punches on this day.</Empty>}
    <div class="h2">Attendance</div>
    <div class="tw"><table class="table"><thead><tr><th>Day</th><th>In</th><th>Out</th><th>Breaks</th><th>Worked</th></tr></thead><tbody>{days.slice(0, 60).map(k => { const x = calc(k); return <tr onClick={() => setDay(k)} style={{ cursor: 'pointer' }}><td>{fmtDay(k)}</td><td class="mono">{hrT(x.first)}</td><td class="mono">{x.last ? hrT(x.last) : x.missed ? '⚠ missing' : ''}</td><td class="mono">{dur(x.brk, true)}</td><td class="mono">{dur(x.worked, true)}</td></tr>; })}</tbody></table>{!days.length && <Empty>No attendance yet.</Empty>}</div>
    <div class="h2">Settings</div>
    <div class="card"><div class="form">
      <Field label="Shift start"><input class="in" type="time" value={S.shiftStart} onChange={e => put('cfg', 'hr', { shiftStart: (e.target as HTMLInputElement).value })} /></Field>
      <Field label="Shift end"><input class="in" type="time" value={S.shiftEnd} onChange={e => put('cfg', 'hr', { shiftEnd: (e.target as HTMLInputElement).value })} /></Field>
      <Field label="Grace (minutes)"><input class="in" type="number" value={S.grace} onChange={e => put('cfg', 'hr', { grace: +(e.target as HTMLInputElement).value || 0 })} /></Field>
      <Field label="Hours per day"><input class="in" type="number" value={S.dayH} onChange={e => put('cfg', 'hr', { dayH: +(e.target as HTMLInputElement).value || HR_DEF.dayH })} /></Field>
      <Field label="Auto clock-out after (hours, 0 = off)"><input class="in" type="number" value={S.autoOutH} onChange={e => put('cfg', 'hr', { autoOutH: +(e.target as HTMLInputElement).value || 0 })} /></Field>
      <Field label="Show seconds"><Switch on={S.sec} onChange={v => put('cfg', 'hr', { sec: v })} /></Field>
    </div></div>
  </div>;
}
const tm = (ms: number) => { const d = new Date(ms); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':'); };
function AddPunch({ day }: { day: string }) {
  const [k, setK] = useState<'in' | 'bs' | 'be' | 'out'>('in'), [t, setT] = useState('09:00');
  return <Sheet title={'Add a punch · ' + fmtDay(day)} onClose={closeModal} foot={<button class="b-add" onClick={() => { const [h, m] = t.split(':').map(Number); const d = new Date(day + 'T00:00:00'); d.setHours(h, m, 0); addPunch(day, k, +d); closeModal(); }}>Add</button>}>
    <div class="form"><Field label="Kind"><select class="in" value={k} onChange={e => setK((e.target as HTMLSelectElement).value as any)}><option value="in">Clock in</option><option value="bs">Break start</option><option value="be">Break end</option><option value="out">Clock out</option></select></Field><Field label="Time"><input class="in" type="time" value={t} onInput={e => setT((e.target as HTMLInputElement).value)} /></Field></div></Sheet>;
}

// ================= Automations =================
export interface Rule { id: string; name: string; on: boolean; mode: 'contains' | 'all' | 'exact' | 'starts' | 'regex'; phrase: string; not: string; sections: string[]; action: 'task' | 'ticket'; folder: string; title: string; due: number; priority: string; ticketType: string }
export const rules = () => all<Rule>('rules');
export function ruleMatches(r: Rule, text: string) {
  const t = text.toLowerCase(), ph = r.phrase.toLowerCase().trim(); if (!ph) return false;
  let ok = false;
  if (r.mode === 'contains') ok = ph.split(/\s*,\s*/).some(p => p && t.indexOf(p) >= 0);
  else if (r.mode === 'all') ok = ph.split(/\s+/).every(w => t.indexOf(w) >= 0);
  else if (r.mode === 'exact') ok = t.trim() === ph;
  else if (r.mode === 'starts') ok = t.trim().indexOf(ph) === 0;
  else if (r.mode === 'regex') { try { ok = new RegExp(r.phrase, 'i').test(text); } catch { ok = false; } }
  if (ok && r.not.trim()) ok = !r.not.toLowerCase().split(/\s*,\s*/).some(p => p && t.indexOf(p) >= 0);
  return ok;
}
/** Runs rules on Day End entries; each rule fires once per entry (deterministic task / ticket id). */
export function runRules(only?: string[]) {
  const R = rules().filter(r => r.on); if (!R.length) return 0; let n = 0;
  const start = lsJSON<string>('v2_rules_from', todayKey());
  allEntryDays().forEach(k => { if (k < start) return; entriesOf(k).forEach(e => {
    if (only && only.indexOf(e.id) < 0) return; const text = entryText(e);
    R.forEach(r => {
      if (r.sections.length && r.sections.indexOf(e.sk) < 0) return; if (!ruleMatches(r, text)) return;
      const id = 'r-' + r.id + '-' + e.id;
      if (r.action === 'task') { if (get('tasks', id) || all<any>('tasks').some(t => t.id === id)) return; const due = shiftDayKey(k, r.due || 0); put('tasks', id, { title: (r.title || 'Follow up — {deal}').replace('{deal}', e.deal || text.slice(0, 40)), notes: text, due, priority: r.priority || 'normal', folder: r.folder || '', done: false, created: Date.now(), auto: true, deal: e.deal || '' }); n++; }
      else { if (get('tickets', id)) return; saveTicket({ id, subject: (e.deal || text.slice(0, 60)), desc: text, deal: e.deal || '', tt: r.ticketType ? [{ t: r.ticketType, s: ticketCfg().types.find(x => x.id === r.ticketType)?.defSub || '' }] : classify(text), stage: ticketCfg().pipelines[0].stages[0].id, pipeline: ticketCfg().pipelines[0].id, source: 'Day End', priority: ticketCfg().pris[1], notes: [], history: [], resolution: '', due: '', category: '' }); n++; }
    });
  }); });
  return n;
}
export function Automations() {
  void rev.value; const R = rules(), mc = msgCfg();
  return <div class="page">
    <PageHead icon="auto" title="Automations" sub="When a Day End entry says something, make a task or file a ticket" right={<Add onClick={() => openModal(() => <RuleForm r={null} />)}>Rule</Add>} />
    <div class="card"><div class="ctl" style={{ marginBottom: 0 }}><div class="grow"><b>Message tasks</b><div class="faint" style={{ fontSize: '.78rem' }}>WhatsApp Today / Email Today (and the “unable” folders) from Day End entries, from {fmtDay(mc.start)}.</div></div>
      <input class="in" type="date" style={{ width: 'auto' }} value={mc.start} onChange={e => put('cfg', 'msgauto', { start: (e.target as HTMLInputElement).value })} /><Switch on={mc.on} onChange={v => put('cfg', 'msgauto', { on: v })} label="Message tasks" /></div></div>
    <div class="h2">Rules<span class="r"><Btn icon="play" onClick={() => toast(runRules() + ' new item(s) made')}>Run now</Btn></span></div>
    {R.length ? R.map(r => <div class="item"><div class="main"><div class="t">{r.name || r.phrase}</div><div class="s">{r.mode} “{r.phrase}”{r.not ? ' · NOT ' + r.not : ''} → {r.action === 'task' ? 'task in ' + (folders().find(f => f.id === r.folder)?.name || 'Follow-ups') + (r.due ? ', due +' + r.due + 'd' : '') : 'ticket'}</div></div>
      <Switch on={r.on} onChange={v => put('rules', r.id, { on: v })} label="On" /><Btn onClick={() => openModal(() => <RuleForm r={r} />)}>Edit</Btn><DangerBtn onConfirm={() => del('rules', r.id)}>Delete</DangerBtn></div>) : <Empty>No rules yet. Example: “no answer” → task “Call back {'{deal}'}” due tomorrow.</Empty>}
    <p class="faint" style={{ fontSize: '.74rem' }}>Rules run on new Day End entries automatically. Deal stages follow the latest entry by themselves.</p>
  </div>;
}
function RuleForm({ r }: { r: Rule | null }) {
  const [f, setF] = useState<Rule>(r || { id: uid('ru'), name: '', on: true, mode: 'contains', phrase: '', not: '', sections: ['tasks'], action: 'task', folder: '', title: 'Follow up — {deal}', due: 1, priority: 'normal', ticketType: '' });
  const s = (k: keyof Rule) => (e: Event) => setF({ ...f, [k]: (e.target as HTMLInputElement).value });
  const today = entriesOf(todayKey()).filter(e => ruleMatches(f, entryText(e)) && (!f.sections.length || f.sections.indexOf(e.sk) >= 0));
  return <Sheet title={r ? 'Edit rule' : 'New rule'} onClose={closeModal} foot={<><Btn onClick={closeModal}>Cancel</Btn><button class="b-add" onClick={() => { if (!f.phrase.trim()) return toast('Add a phrase'); put('rules', f.id, { ...f, id: undefined }); closeModal(); toast('Rule saved'); }}>Save</button></>}>
    <div class="form">
      <Field label="Name" full><input class="in" value={f.name} onInput={s('name')} /></Field>
      <Field label="Match"><select class="in" value={f.mode} onChange={s('mode')}><option value="contains">Contains (comma = or)</option><option value="all">All words</option><option value="exact">Exact</option><option value="starts">Starts with</option><option value="regex">Regex</option></select></Field>
      <Field label="Phrase"><input class="in" value={f.phrase} onInput={s('phrase')} /></Field>
      <Field label="NOT (skip when it also says)" full><input class="in" value={f.not} onInput={s('not')} /></Field>
      <Field label="Sections" full><div class="row-scroll">{['tasks', 'calls', 'whatsapp', 'tickets', 'other'].map(x => <button type="button" class={cx('chip', f.sections.indexOf(x) >= 0 && 'on')} onClick={() => setF({ ...f, sections: f.sections.indexOf(x) >= 0 ? f.sections.filter(y => y !== x) : [...f.sections, x] })}>{x}</button>)}</div></Field>
      <Field label="Then"><select class="in" value={f.action} onChange={s('action')}><option value="task">Make a task</option><option value="ticket">File a ticket</option></select></Field>
      {f.action === 'task' ? <>
        <Field label="Folder"><select class="in" value={f.folder} onChange={s('folder')}>{folders().map(x => <option value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Task title ({deal} = deal name)" full><input class="in" value={f.title} onInput={s('title')} /></Field>
        <Field label="Due in (days)"><input class="in" type="number" value={f.due} onInput={e => setF({ ...f, due: +(e.target as HTMLInputElement).value || 0 })} /></Field>
        <Field label="Priority"><select class="in" value={f.priority} onChange={s('priority')}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></Field>
      </> : <Field label="Ticket type"><select class="in" value={f.ticketType} onChange={s('ticketType')}><option value="">Detect from text</option>{ticketCfg().types.map(t => <option value={t.id}>{t.name}</option>)}</select></Field>}
    </div>
    <div class="sep" /><div class="lbl">Test on today’s entries: {today.length} match{today.length === 1 ? '' : 'es'}</div>
    {today.slice(0, 5).map(e => <div class="s faint" style={{ fontSize: '.78rem' }}>• {entryText(e)}</div>)}
  </Sheet>;
}

// ================= Settings =================
const tabS = signal<'look' | 'menus' | 'privacy' | 'sync' | 'data'>('look');
export function Settings() {
  void rev.value; const v = tabS.value;
  return <div class="page">
    <PageHead icon="gear" title="Settings" sub="Appearance and phone settings apply to this device only" />
    <div class="ctl"><Seg value={v} onChange={x => { tabS.value = x; }} opts={[['look', 'Appearance'], ['menus', 'Menus'], ['privacy', 'Privacy'], ['sync', 'Sync & devices'], ['data', 'Data & safety']]} /></div>
    {v === 'look' && <Look />}{v === 'menus' && <Menus />}{v === 'privacy' && <Privacy />}{v === 'sync' && <SyncSet />}{v === 'data' && <DataSet />}
  </div>;
}
export function Look() {
  const th = theme.value;
  return <div class="card"><div class="form">
    <Field label="Theme"><Seg value={th.mode} onChange={m => { theme.value = { ...th, mode: m }; }} opts={[['dark', 'Dark'], ['light', 'Light']]} /></Field>
    <Field label="Calm mode (no stars)"><Switch on={th.calm} onChange={c => { theme.value = { ...th, calm: c }; }} /></Field>
    <Field label="Moon"><Switch on={!moonHidden.value} onChange={x => { moonHidden.value = !x; lsSet('hub_moon_hide', JSON.stringify(!x)); }} /></Field>
    <Field label="Palette" full><div class="pal">{PALETTES.map(p => <button type="button" class={cx('chip', th.pal === p.id && 'on')} onClick={() => { theme.value = { ...th, pal: p.id }; }}><i class="pal-dot" style={{ background: 'hsl(' + (p.id === 'crimson' ? 355 : p.h) + ',' + Math.min(100, 75 * p.s) + '%,' + (52 + p.l * 100) + '%)' }} />{p.name}</button>)}</div></Field>
  </div></div>;
}
function Menus() {
  const c = navCfg(); const [order, setOrder] = useState<Tab[]>(c.order), [hidden, setHidden] = useState<Tab[]>(c.hidden);
  const save = (o: Tab[], h: Tab[]) => { setOrder(o); setHidden(h); saveNav(o, h); };
  return <div class="card"><p class="faint" style={{ fontSize: '.78rem', marginTop: 0 }}>Order and show/hide the sections in the top bar (PC) and the bottom bar (phone). Hidden sections stay in the Menu.</p>
    {order.map((t, i) => { const s = SECTIONS.find(x => x.id === t)!; return <div class="item"><div class="main"><div class="t">{s.label}</div></div><IconBtn icon="up" title="Move up" onClick={() => { if (i) { const o = order.slice(); [o[i - 1], o[i]] = [o[i], o[i - 1]]; save(o, hidden); } }} /><IconBtn icon="down" title="Move down" onClick={() => { if (i < order.length - 1) { const o = order.slice(); [o[i + 1], o[i]] = [o[i], o[i + 1]]; save(o, hidden); } }} /><Switch on={hidden.indexOf(t) < 0} onChange={on => save(order, on ? hidden.filter(x => x !== t) : [...hidden, t])} label={'Show ' + s.label} /></div>; })}
  </div>;
}
function Privacy() {
  const [p, setP] = useState(lsJSON<{ linkInReport?: boolean }>('hub_priv_v1', {}));
  return <div class="card">
    <p class="muted" style={{ marginTop: 0 }}>No phone numbers, e-mails or contact data are ever stored. Every save, import and update from your other device goes through the same cleaner. Only deal names, ticket names and the HubSpot deal link are kept.</p>
    <div class="ctl"><span class="grow">Include the HubSpot link in reports</span><Switch on={!!p.linkInReport} onChange={x => { const n = { ...p, linkInReport: x }; setP(n); lsSet('hub_priv_v1', JSON.stringify(n)); }} /></div>
    <div class="faint" style={{ fontSize: '.78rem' }}>Cleaned out since this app started: {privacyHits.value}</div>
  </div>;
}
function SyncSet() {
  const [devs, setDevs] = useState<any[]>([]); useEffect(() => { listDevices().then(setDevs); }, []);
  const [name, setName] = useState(deviceInfo().name);
  const conf = lsJSON<any[]>('v2_conflicts', []);
  return <div class="card">
    <Tiles><Stat l="Status" v={sync.status.value} c={sync.detail.value || (sync.lastSync.value ? 'last ' + ago(sync.lastSync.value) : ' ')} /><Stat l="Waiting to send" v={sync.pending.value} /><Stat l="Live updates" v={sync.live.value ? 'On' : 'Off'} c={sync.live.value ? 'instant' : 'every 15 s'} /></Tiles>
    <div class="ctl" style={{ marginTop: '10px', flexWrap: 'wrap' }}>{sync.email.value ? <span class="faint">Signed in as <b>{sync.email.value}</b></span> : <span class="faint">Not signed in</span>}<span class="grow" />
      {sync.email.value ? <><Btn icon="restore" onClick={() => cycle(true).then(() => toast('Synced'))}>Sync now</Btn><button class="b danger" onClick={() => signOut()}>Sign out</button></> : <button class="b-add" onClick={() => { sync.loginOpen.value = true; }}>Sign in</button>}</div>
    <div class="form" style={{ marginTop: '8px' }}><Field label="This device's name"><input class="in" value={name} onInput={e => setName((e.target as HTMLInputElement).value)} onChange={() => lsSet('hub_device_name', name.trim().slice(0, 40))} /></Field></div>
    <div class="h2">Devices</div>
    {devs.length ? devs.map(d => <div class="item"><div class="main"><div class="t">{d.name}{d.device_id === lsGet('hub_device_id') ? ' (this device)' : ''}</div><div class="s">{d.platform} · {d.browser} · last seen {ago(Date.parse(d.last_seen))}{d.removed ? ' · removed' : ''}</div></div>{!d.removed && d.device_id !== lsGet('hub_device_id') && <DangerBtn onConfirm={() => removeDevice(d.device_id).then(() => listDevices().then(setDevs))}>Remove</DangerBtn>}</div>) : <Empty>No device list (signed out or the devices table is missing).</Empty>}
    <div class="h2">Conflicts</div>
    <p class="faint" style={{ fontSize: '.78rem' }}>When the same field was changed on two devices at once, the later change wins and the other value is kept here.</p>
    {conf.length ? <Btn icon="down" onClick={() => download('sync-conflicts.json', JSON.stringify(conf, null, 1), 'application/json')}>Download conflict log ({conf.length})</Btn> : <span class="faint">None.</span>}
  </div>;
}
function DataSet() {
  const rep = lastReport(), counts = migratedCounts(), tr = trash();
  return <div class="card">
    <div class="ctl" style={{ flexWrap: 'wrap' }}>
      <Btn icon="down" onClick={() => toast('Backup downloaded (' + backup() + ' records)')}>Backup</Btn>
      <label class="b" style={{ cursor: 'pointer' }}><input type="file" accept=".json,application/json" class="sr" onChange={async e => { const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return; try { backup('before-restore'); const r = await restoreFile(f); toast(r.kind === 'old' ? 'Old-app backup imported (' + r.n + ' records)' : 'Restored ' + r.n + ' records'); } catch (x: any) { toast(x.message || 'Could not read that file'); } }} />Restore</label>
      <Btn icon="restore" onClick={() => { const r = runMigration(localLegacy(), 'this device (re-import)'); toast('Re-import: ' + r.added + ' new, ' + r.updated + ' updated'); }}>Re-import from the old app</Btn>
    </div>
    <div class="h2">Your data</div>
    <Tiles><Stat l="Day End entries" v={counts.entries} /><Stat l="Days" v={counts.days} /><Stat l="Tasks" v={counts.tasks} /><Stat l="Tickets (own)" v={counts.tickets} /><Stat l="Clock punches" v={counts.punches} /></Tiles>
    <div class="h2">Migration report</div>
    {rep ? <p class="faint" style={{ fontSize: '.8rem' }}>{new Date(rep.at).toLocaleString('en-GB')} from {rep.source}: {rep.added} new, {rep.updated} updated, {rep.legacy} other old areas kept unchanged. {Object.keys(rep.counts).map(k => k + ' ' + rep.counts[k]).join(' · ')}</p> : <span class="faint">Nothing migrated yet.</span>}
    <div class="h2">Trash (30 days)</div>
    {tr.length ? tr.slice(0, 50).map(x => <div class="item"><div class="main"><div class="t">{x.c} · {x.id}</div><div class="s">deleted {ago(x.at)}</div></div><Btn onClick={() => restore(x.c, x.id)}>Restore</Btn></div>) : <Empty>Trash is empty.</Empty>}
  </div>;
}
export const _keep = [keyOf, allTasks, saveTask, hrT];
