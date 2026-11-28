// Round 61: focus mode, one-hand mode, app lock (PIN), comfort & speed, the "Jump to…" command list, voice note,
// and the daily follow-up notification. All per device (localStorage): nothing here syncs, the PIN is kept only as a hash.
import { signal, effect } from '@preact/signals';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { rev, all } from '../data/store';
import { lsGet, lsJSON, lsSet, todayKey, cx } from '../lib/util';
import { Btn, Field, Sheet, Switch, toast } from '../ui/kit';
import { SECTIONS, go, quickAdd, searchOpen, sideOpen, isPhone } from '../ui/state';
import { allTasks, deals, wonDeals, renewalOf } from '../domain/crm';

export interface Comfort { focus: boolean; onehand: boolean; big: boolean; less: boolean; compact: boolean; lockMin: number; notifyAt: string }
export const comfort = signal<Comfort>({ focus: false, onehand: false, big: false, less: false, compact: false, lockMin: 5, notifyAt: '', ...lsJSON<Partial<Comfort>>('v2_comfort', {}) });
export const setComfort = (p: Partial<Comfort>) => { comfort.value = { ...comfort.value, ...p }; };
effect(() => {
  const c = comfort.value, r = document.documentElement; lsSet('v2_comfort', JSON.stringify(c));
  r.classList.toggle('focus-mode', c.focus); r.classList.toggle('one-hand', c.onehand); r.classList.toggle('big-text', c.big); r.classList.toggle('less-motion', c.less); r.classList.toggle('compact', c.compact);
});

// ---------- app lock ----------
const LK = 'v2_lock';
async function sha(s: string) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); }
export const lockOn = () => !!lsJSON<{ h?: string }>(LK, {}).h;
export const locked = signal(false);
export async function setPin(pin: string | null) { if (!pin) { lsSet(LK, '{}'); return; } const salt = Math.random().toString(36).slice(2, 10); lsSet(LK, JSON.stringify({ s: salt, h: await sha(salt + pin) })); }
async function checkPin(pin: string) { const o = lsJSON<{ s?: string; h?: string }>(LK, {}); return !!o.h && (await sha((o.s || '') + pin)) === o.h; }
export function installLock() {
  if (lockOn()) locked.value = true;
  let hid = 0; document.addEventListener('visibilitychange', () => { if (document.hidden) hid = Date.now(); else if (lockOn() && hid && Date.now() - hid > Math.max(0, comfort.value.lockMin) * 6e4) locked.value = true; });
}
export function LockScreen() {
  const [p, setP] = useState(''), [bad, setBad] = useState(false), ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (locked.value) setTimeout(() => ref.current?.focus(), 50); }, [locked.value]);
  if (!locked.value) return null;
  const go2 = async () => { if (await checkPin(p)) { locked.value = false; setP(''); setBad(false); } else { setBad(true); setP(''); } };
  return <div class="lock-ov" role="dialog" aria-label="App locked"><div class="lock-box"><img src="./icon-192.png" alt="" width={56} height={56} /><b>Abi App is locked</b>
    <input ref={ref} class="in mono" type="password" inputMode="numeric" autoComplete="off" aria-label="PIN" placeholder="PIN" value={p} onInput={e => setP((e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 8))} onKeyDown={e => { if (e.key === 'Enter') go2(); }} />
    {bad && <div class="login-msg" role="alert">Wrong PIN</div>}<button type="button" class="b-add" onClick={go2}>Unlock</button>
    <small class="faint">Forgot the PIN? Clear this site's data in the browser. Your synced data comes back after you sign in again.</small></div></div>;
}

// ---------- Jump to… (Alt+J or Ctrl/Cmd+Shift+K) ----------
export const jumpOpen = signal(false);
interface Cmd { t: string; s: string; fn: () => void }
function commands(): Cmd[] {
  const L: Cmd[] = SECTIONS.map(s => ({ t: s.label, s: 'Section', fn: () => go(s.id) }));
  L.push({ t: 'Tools', s: 'Section', fn: () => go('tools') });
  L.push({ t: 'Quick Add', s: 'Action · Q', fn: () => { quickAdd.value = {}; } }, { t: 'Search', s: 'Action · Ctrl+K', fn: () => { searchOpen.value = true; } }, { t: 'Menu', s: 'Action', fn: () => { sideOpen.value = true; } });
  L.push({ t: 'New task', s: 'Action', fn: () => import('../sections/tasks').then(m => m.openTaskForm({ due: todayKey() })) });
  L.push({ t: 'Log a call outcome', s: 'Action', fn: () => import('../sections/tools').then(m => m.logOutcomeSheet()) });
  L.push({ t: 'Smart text', s: 'Action', fn: () => import('./smart').then(m => m.openSmart()) }, { t: 'Snippets', s: 'Action', fn: () => import('./snippets').then(m => m.openSnippets()) });
  L.push({ t: comfort.value.focus ? 'Leave focus mode' : 'Focus mode', s: 'Action', fn: () => setComfort({ focus: !comfort.value.focus }) });
  L.push({ t: 'Download backup', s: 'Action', fn: () => import('../data/backup').then(m => toast('Backup downloaded (' + m.backup() + ' records)')) });
  return L;
}
export function JumpTo() {
  const [q, setQ] = useState(''), [i, setI] = useState(0), open = jumpOpen.value;
  const [extra, setExtra] = useState<Cmd[]>([]);
  useEffect(() => { if (!open) return; setQ(''); setI(0); Promise.all([import('../sections/tools'), import('../domain/hrlists')]).then(([T, H]) => setExtra([...T.TOOLS.map(x => ({ t: x.label, s: 'Tool', fn: () => go('tools', x.id) })), ...H.TABS.map(([k, l]) => ({ t: 'HR · ' + l, s: 'HR & Time', fn: () => go('hr', k) })), ...all<any>('shortcuts').map(s => ({ t: s.label, s: 'My shortcut', fn: () => T.openShortcut(s.url) }))])); }, [open]);
  const res = useMemo(() => { const t = q.trim().toLowerCase(), A = [...commands(), ...extra]; return (t ? A.filter(c => (c.t + ' ' + c.s).toLowerCase().indexOf(t) >= 0) : A).slice(0, 60); }, [q, extra, rev.value]);
  if (!open) return null;
  const run = (c?: Cmd) => { if (!c) return; jumpOpen.value = false; c.fn(); };
  return <Sheet title="Jump to…" onClose={() => { jumpOpen.value = false; }}>
    <input class="in" autoFocus aria-label="Jump to" placeholder="Section, tool, HR tab, action…" value={q} onInput={e => { setQ((e.target as HTMLInputElement).value); setI(0); }} onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setI(x => Math.min(res.length - 1, x + 1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); setI(x => Math.max(0, x - 1)); } else if (e.key === 'Enter') { e.preventDefault(); run(res[i]); } }} />
    <div style={{ marginTop: '10px' }} role="listbox">{res.map((c, j) => <div role="option" aria-selected={j === i} class={cx('item jump-it', j === i && 'sel')} style={{ cursor: 'pointer' }} onMouseEnter={() => setI(j)} onClick={() => run(c)}><span class="pill">{c.s}</span><div class="main"><div class="t">{c.t}</div></div></div>)}</div>
  </Sheet>;
}

// ---------- voice note ----------
export const voiceOk = () => !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
export function voiceInto(onText: (t: string) => void, onEnd?: () => void) {
  const R = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; if (!R) { toast('Voice input is not supported in this browser'); return null; }
  const r = new R(); r.lang = navigator.language || 'en-US'; r.interimResults = false; r.maxAlternatives = 1;
  r.onresult = (e: any) => { const t = Array.from(e.results).map((x: any) => x[0].transcript).join(' ').trim(); if (t) onText(t); };
  r.onerror = (e: any) => toast(e.error === 'not-allowed' ? 'Microphone not allowed' : 'Voice input stopped'); r.onend = () => onEnd?.();
  try { r.start(); toast('Listening… speak now'); } catch { /* */ } return r;
}

// ---------- daily follow-up notification ----------
export function dailyNotify() {
  const at = comfort.value.notifyAt; if (!at || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date(), hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'), td = todayKey();
  if (hm < at || lsGet('v2_daynotified') === td) return; lsSet('v2_daynotified', td);
  const due = allTasks().filter(t => !t.done && t.due && t.due <= td).length, fol = deals().filter(d => d.follow && d.follow <= td).length, ren = wonDeals().filter(w => { const r = renewalOf(w); return r.due && r.due <= td; }).length;
  if (!due && !fol && !ren) return;
  try { new Notification('Follow-ups for today', { body: [due && due + ' tasks due', fol && fol + ' deal follow-ups', ren && ren + ' renewals due'].filter(Boolean).join(' · '), icon: './icon-192.png' }); } catch { /* */ }
}

// ---------- the settings page (Tools → Focus, one-hand, app lock & comfort) ----------
export function ComfortTool() {
  const c = comfort.value, [pin, setPinV] = useState(''), [, re] = useState(0);
  return <div class="card"><div class="form">
    <Field label="Focus mode (hides notices, the moon and extra buttons; Esc leaves)"><Switch on={c.focus} onChange={v => setComfort({ focus: v })} label="Focus mode" /></Field>
    <Field label={'One-hand mode (phone: controls at the bottom, bigger buttons)' + (isPhone.value ? '' : ' – shows on phone')}><Switch on={c.onehand} onChange={v => setComfort({ onehand: v })} label="One-hand mode" /></Field>
    <Field label="Larger text"><Switch on={c.big} onChange={v => setComfort({ big: v })} label="Larger text" /></Field>
    <Field label="Less motion (faster, no animations)"><Switch on={c.less} onChange={v => setComfort({ less: v })} label="Less motion" /></Field>
    <Field label="Compact lists"><Switch on={c.compact} onChange={v => setComfort({ compact: v })} label="Compact lists" /></Field>
    <Field label="Daily follow-up notification at (empty = off)"><input class="in" type="time" value={c.notifyAt} onChange={e => { const v = (e.target as HTMLInputElement).value; setComfort({ notifyAt: v }); if (v && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission(); }} /></Field>
    <Field label={'App lock (PIN, 4–8 digits) · ' + (lockOn() ? 'on' : 'off')} full><div class="ctl" style={{ margin: 0 }}>
      <input class="in mono" type="password" inputMode="numeric" autoComplete="new-password" aria-label="New PIN" placeholder={lockOn() ? 'New PIN' : 'PIN'} value={pin} style={{ width: '140px' }} onInput={e => setPinV((e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 8))} />
      <Btn onClick={async () => { if (pin.length < 4) return toast('Use 4 to 8 digits'); await setPin(pin); setPinV(''); re(x => x + 1); toast('App lock is on'); }}>{lockOn() ? 'Change PIN' : 'Turn on'}</Btn>
      {lockOn() && <Btn onClick={async () => { await setPin(null); re(x => x + 1); toast('App lock is off'); }}>Turn off</Btn>}
      {lockOn() && <Btn onClick={() => { locked.value = true; }}>Lock now</Btn>}</div></Field>
    <Field label="Lock again after the app was in the background for (minutes)"><input class="in" type="number" value={c.lockMin} onChange={e => setComfort({ lockMin: Math.max(0, +(e.target as HTMLInputElement).value || 0) })} /></Field>
  </div><p class="faint" style={{ fontSize: '.75rem' }}>These are set per device. The PIN is kept on this device only, as a hash.</p></div>;
}
