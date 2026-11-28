import { render } from 'preact';
import { useEffect } from 'preact/hooks';
import './ui/base.css';
import './ui/app.css';
import { initStore, storeReady, onLocalChange, rev } from './data/store';
import { initSync, onConnected, fetchLegacyRows, cloudFlag, writeCloudFlag, sync } from './data/sync';
import { runMigration, localLegacy, hasLocalLegacy } from './data/migrate';
import { lsGet, lsSet } from './lib/util';
import { route, quickAdd, searchOpen, go } from './ui/state';
import { Bar, SideMenu, QuickAdd, Search, Login } from './ui/shell';
import { Toast, Modal, Menu } from './ui/kit';
import { FloatMoon } from './ui/moon';
import { TodayNotice, BackupReminder, ScrollButtons } from './ui/notices';
import { DayEnd } from './sections/dayend';
import { WonDeals } from './sections/won';
import { DealBoard } from './sections/deals';
import { LostDeals } from './sections/lost';
import { Tickets } from './sections/tickets';
import { Tasks } from './sections/tasks';
import { Dashboard, Analytics } from './sections/insights';
import { HR, Automations, Settings, runRules } from './sections/more';
import { allTasks } from './domain/crm';

function Page() {
  const t = route.value.t;
  switch (t) {
    case 'day': return <DayEnd />; case 'deals': return <WonDeals />; case 'dealboard': return <DealBoard />; case 'lost': return <LostDeals />;
    case 'tickets': return <Tickets />; case 'tasks': return <Tasks />; case 'dashboard': return <Dashboard />; case 'analytics': return <Analytics />;
    case 'hr': return <HR />; case 'auto': return <Automations />; case 'settings': return <Settings />; default: return <DayEnd />;
  }
}
function App() {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchOpen.value = true; }
      else if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); go('settings'); }
      else if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'q' || e.key === 'Q')) { e.preventDefault(); quickAdd.value = {}; }
    };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, []);
  if (!storeReady.value) return <div class="boot"><div class="fmoon-img" /></div>;
  return <>
    <div class="app-bg" />
    <Bar />
    <BackupReminder />
    <main><Page /></main>
    <TodayNotice /><ScrollButtons />
    {route.value.t === 'day' && <button type="button" class="qa-tab" onClick={() => { quickAdd.value = {}; }} title="Quick Add (Q)">⚡ Quick Add</button>}
    <FloatMoon /><SideMenu /><QuickAdd /><Search /><Modal /><Menu /><Login /><Toast />
  </>;
}

// ---- reminders: browser notification for tasks with a reminder at their due time (while the app is open) ----
function reminders() {
  setInterval(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const now = new Date(), done: Record<string, 1> = JSON.parse(lsGet('v2_reminded') || '{}');
    allTasks().forEach(t => { if (t.done || !t.remind || !t.due || done[t.id]) return; const at = new Date(t.due + 'T' + (t.time || '09:00') + ':00'); if (at <= now && +now - +at < 36e5 * 12) { try { new Notification(t.title, { body: t.notes || 'Task due', icon: './icon-192.png' }); } catch { /* */ } done[t.id] = 1; } });
    lsSet('v2_reminded', JSON.stringify(done));
  }, 30000);
}

async function boot() {
  render(<App />, document.getElementById('app')!);
  await initStore();
  // migration: the cloud copy of the old data (if signed in) is the merged one; otherwise this device's copy
  onConnected(async () => {
    if (lsGet('v2_migrated_cloud')) return;
    try {
      const flag = await cloudFlag('migrated');
      if (!flag) { const rows = await fetchLegacyRows(); if (Object.keys(rows).length) runMigration(rows, 'cloud copy of the old app'); else if (hasLocalLegacy()) runMigration(localLegacy(), 'this device'); await writeCloudFlag('migrated'); }
      lsSet('v2_migrated_cloud', '1'); lsSet('v2_migrated_local', '1');
    } catch { /* retried on the next start */ }
  });
  if (!lsGet('v2_migrated_local') && hasLocalLegacy() && !lsGet('cloud_session_v1')) { runMigration(localLegacy(), 'this device'); lsSet('v2_migrated_local', '1'); }
  await initSync();
  if (!lsGet('v2_migrated_local') && hasLocalLegacy() && sync.status.value !== 'synced' && sync.status.value !== 'syncing') { runMigration(localLegacy(), 'this device'); lsSet('v2_migrated_local', '1'); }
  // automations run on new / changed Day End entries
  let pend: string[] = [], t: any = 0;
  onLocalChange(r => { if (r.c !== 'entries') return; pend.push(r.id); clearTimeout(t); t = setTimeout(() => { runRules(pend); pend = []; }, 600); });
  reminders();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => { /* */ });
  void rev;
}
// small handle for automated tests and support (no data leaves the device through it)
import * as store from './data/store';
import { cycle } from './data/sync';
(window as any).__abi = { store, cycle, sync };
boot();
