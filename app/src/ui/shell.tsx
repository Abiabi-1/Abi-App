// Shell: the navigation bar (top on PC, the exact same bar at the bottom on phone), side menu, search,
// Day End Quick Add (from anywhere), sign-in, sync pill, colours and clock pop-ups.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { rev } from '../data/store';
import { sync, signIn, signUp, forgot, skipLogin, signOut, cycle } from '../data/sync';
import { backup, restoreFile } from '../data/backup';
import { SECTIONS, Tab, go, navCfg, route, isPhone, quickAdd, searchOpen, sideOpen } from './state';
import { Icon } from './icons';
import { Btn, IconBtn, Sheet, toast, Chips, closeModal, openModal, Empty } from './kit';
import { status, act, calc } from '../domain/hr';
import { wonDeals, allTasks, tickets, isClosedT, lostDeals, deals } from '../domain/crm';
import { SECTIONS as DE_SECTIONS, SK, entriesOf, allEntryDays, entryText, currentHour } from '../domain/dayend';
import { cx, fmtDay, todayKey, clock } from '../lib/util';
import { EntryForm } from '../sections/entryform';
import { Look } from '../sections/more';
import { holdToQuickAdd } from './moon';

function badges(): Partial<Record<Tab, number>> {
  void rev.value; const td = todayKey();
  return { deals: wonDeals().filter(w => w.day === td).length || undefined, tasks: allTasks().filter(t => !t.done && t.due && t.due <= td).length || undefined, tickets: tickets().filter(t => !isClosedT(t)).length || undefined, lost: lostDeals().filter(l => l.day === td).length || undefined, dealboard: deals().length || undefined } as any;
}
export function Bar() {
  const r = route.value.t, c = navCfg(), B = badges(), phone = isPhone.value;
  const tabs = c.order.filter(t => c.hidden.indexOf(t) < 0 || t === r);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = ref.current?.querySelector('.tab.on') as HTMLElement | null; const sc = ref.current; if (el && sc) sc.scrollTo({ left: el.offsetLeft - sc.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' }); }, [r, phone]);
  const st = status();
  const acts = <>
    <button type="button" class="ba" onClick={() => { searchOpen.value = true; }} title="Search (Ctrl+K)"><Icon n="search" /><span class="ba-l">Search</span></button>
    <button type="button" class="ba" onClick={() => import('../features/smart').then(m => m.openSmart())} title="Smart text: learned phrases and settings"><span style={{ fontSize: '14px', lineHeight: 1 }}>✦</span><span class="ba-l">Smart text</span></button>
    <SyncPill />
    <button type="button" class="ba" onClick={() => toast('Backup downloaded (' + backup() + ' records)')} title="Download a backup"><Icon n="down" /><span class="ba-l">Backup</span></button>
    <label class="ba" title="Restore a backup file" style={{ cursor: 'pointer' }}><Icon n="up" /><span class="ba-l">Restore</span><input type="file" class="sr" accept=".json,application/json" onChange={async e => { const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return; try { backup('before-restore'); const x = await restoreFile(f); toast(x.kind === 'old' ? 'Old-app backup imported (' + x.n + ')' : 'Restored ' + x.n + ' records'); } catch (er: any) { toast(er.message || 'Could not read that file'); } (e.target as HTMLInputElement).value = ''; }} /></label>
    <button type="button" class={cx('ba', st.state !== 'out' && 'is-on')} onClick={() => openModal(() => <ClockSheet />)} title="Time clock"><Icon n="clock" /><span class="ba-l">{st.state === 'out' ? 'Clock in' : st.state === 'break' ? 'Break' : 'Clocked in'}</span></button>
    <button type="button" class="ba" onClick={() => import('./notices').then(m => m.openToday())} title="Today: what is due"><Icon n="cal" /><span class="ba-l">Today</span></button>
    <button type="button" class="ba" onClick={() => openModal(() => <Sheet title="Colours" onClose={closeModal}><Look /></Sheet>)} title="Colours and theme"><Icon n="palette" /><span class="ba-l">Colours</span></button>
    <button type="button" class={cx('ba', r === 'settings' && 'is-on')} onClick={() => go('settings')} title="Settings (Ctrl+,)"><Icon n="gear" /><span class="ba-l">Settings</span></button>
  </>;
  return <nav class="bar" aria-label="Sections">
    {!phone && <button type="button" class="ba" onClick={() => { sideOpen.value = true; }} title="Menu" aria-label="Menu"><Icon n="menu" /></button>}
    <div class="bar-tabs noscroll" ref={ref}>
      {tabs.map(t => { const s = SECTIONS.find(x => x.id === t)!; return <button type="button" class={cx('tab', r === t && 'on')} onClick={() => go(t)} aria-current={r === t ? 'page' : undefined}>{s.label}{B[t] ? <span class={cx('badge', t === 'tasks' && 'hot')}>{B[t]}</span> : null}</button>; })}
      {phone && acts}
    </div>
    {!phone && <div class="bar-act">{acts}</div>}
    {phone && <><button type="button" class="ba" onClick={() => { sideOpen.value = true; }} aria-label="Menu" title="Menu"><Icon n="menu" /></button><button type="button" class="ba" onClick={() => { searchOpen.value = true; }} aria-label="Search" title="Search"><Icon n="search" /></button></>}
    <button type="button" class="b-add qa-btn" ref={el => holdToQuickAdd(el)} onClick={() => { quickAdd.value = {}; }} title="Quick Add (Q)" aria-label="Quick Add"><Icon n="plus" />{phone ? '' : 'Quick Add'}</button>
  </nav>;
}
function SyncPill() {
  const s = sync.status.value, n = sync.pending.value;
  const label = { off: 'Local', signedout: 'Sign in', syncing: 'Syncing', synced: 'Synced', offline: 'Offline', error: 'Sync problem' }[s] + (n && s !== 'synced' ? ' · ' + n : '');
  return <button type="button" class={cx('ba cl-pill', 's-' + s)} title={sync.detail.value || label} onClick={() => { if (s === 'signedout') sync.loginOpen.value = true; else go('settings'); }}><span class="cl-dot" /><span class="ba-l">{label}</span></button>;
}
export function SideMenu() {
  if (!sideOpen.value) return null; const r = route.value.t;
  const close = () => { sideOpen.value = false; };
  return <div class="ov side-ov" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
    <aside class="side" role="dialog" aria-label="Menu">
      <div class="side-h"><img src="./icon-192.png" alt="" /><b>Abi App</b><IconBtn icon="x" title="Close" onClick={close} /></div>
      {SECTIONS.map(s => <button type="button" class={cx('side-i', r === s.id && 'is-on')} onClick={() => { go(s.id); close(); }}><Icon n={s.icon} />{s.label}</button>)}
      <div class="sep" />
      <button type="button" class="side-i" onClick={() => { close(); quickAdd.value = {}; }}><Icon n="bolt" />Quick Add</button>
      <button type="button" class="side-i" onClick={() => { close(); searchOpen.value = true; }}><Icon n="search" />Search</button>
      <button type="button" class="side-i" onClick={() => { close(); import('../features/comfort').then(m => { m.jumpOpen.value = true; }); }}><Icon n="right" />Jump to… (Alt+J)</button>
      <button type="button" class="side-i" onClick={() => { close(); import('../features/smart').then(m => m.openSmart()); }}><span style={{ width: '17px', textAlign: 'center' }}>✦</span>Smart text</button>
      <button type="button" class="side-i" onClick={() => { close(); import('../features/snippets').then(m => m.openSnippets()); }}><Icon n="note" />Snippets (text shortcuts)</button>
      <button type="button" class="side-i" onClick={() => { close(); toast('Backup downloaded (' + backup() + ' records)'); }}><Icon n="down" />Backup</button>
      {sync.email.value ? <button type="button" class="side-i" onClick={() => { close(); signOut(); }}><Icon n="cloud" />Sign out</button> : <button type="button" class="side-i" onClick={() => { close(); sync.loginOpen.value = true; }}><Icon n="cloud" />Sign in to sync</button>}
      <div class="faint side-v">New app · version 2 · {sync.email.value || 'this device only'}</div>
    </aside></div>;
}
export function ClockSheet() {
  void rev.value; const st = status(), c = calc(st.key); const [, t] = useState(0); useEffect(() => { const i = setInterval(() => t(x => x + 1), 1000); return () => clearInterval(i); }, []);
  return <Sheet title="Time clock" onClose={closeModal} foot={<Btn onClick={() => { closeModal(); go('hr'); }}>Open HR & Time</Btn>}>
    <div class="hr-big mono" style={{ textAlign: 'center' }}>{st.state === 'break' ? clock(Date.now() - (c.ses[c.ses.length - 1]?.br.slice(-1)[0]?.s || Date.now())) : clock(c.worked)}</div>
    <p class="faint" style={{ textAlign: 'center', margin: '0 0 12px' }}>{st.state === 'out' ? 'Clocked out' : st.state === 'break' ? 'On break' : 'Worked today'}</p>
    <div class="ctl" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
      {st.state === 'out' && <button class="b-add" onClick={() => toast(act('in'))}>Clock in</button>}
      {st.state === 'work' && <><Btn icon="pause" onClick={() => toast(act('bs', { bt: 'meal' }))}>Meal break</Btn><Btn icon="pause" onClick={() => toast(act('bs', { bt: 'other' }))}>Short break</Btn><Btn icon="stop" onClick={() => toast(act('out'))}>Clock out</Btn></>}
      {st.state === 'break' && <><Btn icon="play" onClick={() => toast(act('be'))}>Back from break</Btn><Btn icon="stop" onClick={() => toast(act('out'))}>Clock out</Btn></>}
    </div></Sheet>;
}

// ---------- Day End Quick Add (from anywhere: moon hold, bar button, Q) ----------
export function QuickAdd() {
  const qa = quickAdd.value; const [sk, setSk] = useState<SK>((qa?.sk as SK) || 'tasks');
  if (!qa) return null; const day = todayKey();
  return <Sheet title={<span>Quick Add <span class="faint" style={{ fontSize: '.78rem', fontWeight: 400 }}>· Day End · {fmtDay(day)} · {currentHour(day)}</span></span>} onClose={() => { quickAdd.value = null; }} wide>
    <Chips value={sk} onChange={x => setSk(x)} opts={DE_SECTIONS.map(s => [s.key, s.label] as [SK, string])} />
    <div style={{ marginTop: '10px' }}><EntryForm sk={sk} day={day} hk={currentHour(day)} quick autoFocus initial={qa.deal ? { deal: qa.deal } : undefined} /></div>
    <div class="lbl" style={{ marginTop: '12px' }}>Recent</div>
    {entriesOf(day).slice(-4).reverse().map(e => <div class="s faint" style={{ fontSize: '.78rem', padding: '2px 0' }}>{e.hk} · {DE_SECTIONS.find(s => s.key === e.sk)?.label}: {entryText(e)}</div>)}
  </Sheet>;
}

// ---------- global search (Ctrl/Cmd+K) ----------
export function Search() {
  const [q, setQ] = useState(''); const open = searchOpen.value;
  const res = useMemo(() => {
    const t = q.trim().toLowerCase(); if (t.length < 2) return [];
    const out: { k: string; t: string; s: string; fn: () => void }[] = [];
    deals().filter(d => d.name.toLowerCase().indexOf(t) >= 0).slice(0, 8).forEach(d => out.push({ k: 'Deal', t: d.name, s: d.stage, fn: () => go('dealboard', d.key) }));
    tickets().filter(x => (x.subject + ' ' + x.deal).toLowerCase().indexOf(t) >= 0).slice(0, 6).forEach(x => out.push({ k: 'Ticket', t: x.subject, s: x.deal, fn: () => go('tickets', x.id) }));
    allTasks().filter(x => (x.title + ' ' + (x.notes || '')).toLowerCase().indexOf(t) >= 0).slice(0, 6).forEach(x => out.push({ k: 'Task', t: x.title, s: x.due ? fmtDay(x.due) : '', fn: () => go('tasks') }));
    const days = allEntryDays().slice().reverse(); let n = 0;
    for (const k of days) { for (const e of entriesOf(k)) { if (n >= 20) break; if (entryText(e).toLowerCase().indexOf(t) >= 0) { n++; out.push({ k: 'Day End', t: entryText(e).slice(0, 90), s: fmtDay(k) + ' · ' + e.hk, fn: () => { import('../sections/dayend').then(m => { m.selDay.value = k; go('day'); setTimeout(() => m.scrollToEntry(e.id), 250); }); } }); } } if (n >= 20) break; }
    return out;
  }, [q, rev.value]);
  if (!open) return null;
  return <Sheet title="Search" onClose={() => { searchOpen.value = false; }}>
    <input class="in" autoFocus placeholder="Deals, tickets, tasks, Day End notes…" value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} />
    <div style={{ marginTop: '10px' }}>{res.map(r => <div class="item" style={{ cursor: 'pointer' }} onClick={() => { searchOpen.value = false; r.fn(); }}><span class="pill">{r.k}</span><div class="main"><div class="t">{r.t}</div>{r.s && <div class="s">{r.s}</div>}</div></div>)}{q.trim().length >= 2 && !res.length && <Empty>No matches.</Empty>}</div>
  </Sheet>;
}

// ---------- sign in ----------
export function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in'), [em, setEm] = useState(''), [pw, setPw] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  if (!sync.loginOpen.value) return null;
  const go2 = async (e: Event) => {
    e.preventDefault(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.trim())) return setMsg('Type a valid email address.'); if (!pw) return setMsg('Type your password.');
    setBusy(true); setMsg('');
    try { if (mode === 'up') { const ok = await signUp(em.trim(), pw); if (!ok) { setMode('in'); setMsg('Account created. Check your email to confirm it, then sign in.'); return; } } else await signIn(em.trim(), pw); sync.loginOpen.value = false; toast('Signed in – syncing'); }
    catch (er: any) { setMsg(er.offline ? 'You are offline. Connect to the internet to sign in.' : /invalid login/i.test(er.message) ? 'Wrong email or password.' : er.message); }
    finally { setBusy(false); }
  };
  return <div class="ov login-ov"><form class="sheet login" onSubmit={go2} autoComplete="on">
    <div class="sheet-b" style={{ paddingTop: '18px' }}>
      <img src="./icon-192.png" alt="" class="login-logo" />
      <h2>{mode === 'up' ? 'Create account' : 'Sign in'}</h2>
      <p class="muted" style={{ marginTop: 0 }}>Your Day End Report, deals, tickets and tasks, on every device.</p>
      <label class="f">Email<input class="in" type="email" autoComplete="username" value={em} onInput={e => setEm((e.target as HTMLInputElement).value)} /></label>
      <label class="f" style={{ marginTop: '10px' }}>Password<input class="in" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={pw} onInput={e => setPw((e.target as HTMLInputElement).value)} /></label>
      {msg && <p class="login-msg" role="alert">{msg}</p>}
      <button type="submit" class="b-add" style={{ width: '100%', justifyContent: 'center', marginTop: '14px' }} disabled={busy}>{busy ? 'Please wait…' : mode === 'up' ? 'Create account' : 'Sign in'}</button>
      <div class="ctl" style={{ justifyContent: 'space-between', marginTop: '8px' }}>
        <Btn onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'Create account' : 'I already have an account'}</Btn>
        {mode === 'in' && <Btn onClick={async () => { if (!em.trim()) return setMsg('Type your email first.'); try { await forgot(em.trim()); setMsg('If that email has an account, a reset link is on its way.'); } catch (er: any) { setMsg(er.message); } }}>Forgot password?</Btn>}
      </div>
      <div style={{ textAlign: 'center' }}><Btn onClick={() => skipLogin()}>Use this device only for now</Btn></div>
    </div></form></div>;
}
export { cycle };
