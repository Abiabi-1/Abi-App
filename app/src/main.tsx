import { render } from 'preact';
import { useEffect } from 'preact/hooks';
import './ui/base.css';
import './ui/app.css';
import './ui/oldlook.css';
import { initStore, storeReady, onLocalChange, rev } from './data/store';
import { initSync, onConnected, fetchLegacyRows, cloudFlag, writeCloudFlag, sync } from './data/sync';
import { runMigration, localLegacy, hasLocalLegacy, legacySrcFromRecords } from './data/migrate';
import { lsGet, lsSet } from './lib/util';
import { route, quickAdd, searchOpen, go } from './ui/state';
import { Bar, SideMenu, QuickAdd, Search, Login } from './ui/shell';
import { Toast, Modal, Menu, toast } from './ui/kit';
import { FloatMoon } from './ui/moon';
import { TodayNotice, BackupReminder, ScrollButtons } from './ui/notices';
import { DayEnd } from './sections/dayend';
import { WonDeals } from './sections/won';
import { DealBoard } from './sections/deals';
import { LostDeals } from './sections/lost';
import { Tickets } from './sections/tickets';
import { Tasks } from './sections/tasks';
import { Dashboard, Analytics } from './sections/insights';
import { Automations, Settings, runRules } from './sections/more';
import { HRPage } from './sections/hr';
import { ToolsPage } from './sections/tools';
import { runRecurring, logActivity } from './sections/tools2';
import { JumpTo, LockScreen, installLock, jumpOpen, comfort, setComfort, dailyNotify } from './features/comfort';
import { autoPoints } from './features/restorepoints';
import { installFlows } from './features/flows';
import { allTasks } from './domain/crm';
import { installSmart, importSmartLegacy } from './features/smart';
import { installSnippets, importSnippetsLegacy } from './features/snippets';
import { all as allRecs, get as getRec, putLegacy } from './data/store';

function Page() {
  const t = route.value.t;
  switch (t) {
    case 'day': return <DayEnd />; case 'deals': return <WonDeals />; case 'dealboard': return <DealBoard />; case 'lost': return <LostDeals />;
    case 'tickets': return <Tickets />; case 'tasks': return <Tasks />; case 'dashboard': return <Dashboard />; case 'analytics': return <Analytics />;
    case 'hr': return <HRPage />; case 'auto': return <Automations />; case 'tools': return <ToolsPage />; case 'settings': return <Settings />; default: return <DayEnd />;
  }
}
function App() {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName);
      if ((e.altKey && !e.ctrlKey && e.code === 'KeyJ') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k')) { e.preventDefault(); jumpOpen.value = true; }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchOpen.value = true; }
      else if (e.key === 'Escape' && comfort.value.focus && !document.querySelector('.ov, .sheet')) { setComfort({ focus: false }); toast('Focus mode off'); }
      else if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); go('settings'); }
      else if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'q' || e.key === 'Q')) { e.preventDefault(); quickAdd.value = {}; }
    };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, []);
  if (!storeReady.value) return <div class="boot"><div class="fmoon-img" /></div>;
  return <>
    <div class="app-bg" data-s={route.value.t} />
    <Bar />
    <BackupReminder />
    <main><Page /></main>
    <TodayNotice /><ScrollButtons />
    {route.value.t === 'day' && <button type="button" class="qa-tab" onClick={() => { quickAdd.value = {}; }} title="Quick Add (Q)">⚡ Quick Add</button>}
    <FloatMoon /><SideMenu /><QuickAdd /><Search /><JumpTo /><Modal /><Menu /><Login /><Toast /><LockScreen />
    {comfort.value.focus && <button type="button" class="focus-exit" onClick={() => setComfort({ focus: false })}>Leave focus mode</button>}
  </>;
}

// ---- reminders: browser notification for tasks with a reminder at their due time (while the app is open) ----
function reminders() {
  setInterval(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const now = new Date(), done: Record<string, 1> = JSON.parse(lsGet('v2_reminded') || '{}');
    allTasks().forEach(t => { if (t.done || !t.remind || !t.due || done[t.id]) return; const at = new Date(t.due + 'T' + (t.time || '09:00') + ':00'); if (at <= now && +now - +at < 36e5 * 12) { try { new Notification(t.title, { body: t.notes || 'Task due', icon: './icon-192.png' }); } catch { /* */ } done[t.id] = 1; } });
    lsSet('v2_reminded', JSON.stringify(done));
    dailyNotify();
  }, 30000);
}

async function boot() {
  installLock();
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
  // Round 61: activity log, recurring tasks, automatic restore points, Automation Studio flows
  onLocalChange(r => logActivity(r.c, r.id, !!r.x));
  setTimeout(() => { try { runRecurring(); } catch { /* */ } }, 4000); setInterval(() => { try { runRecurring(); } catch { /* */ } }, 30 * 6e4);
  autoPoints(); installFlows();
  // Round 60: Smart text + Snippets. Users who migrated before this version: convert the old data carried over as 'legacy'
  // (or this device's old app); with no old shortcuts, the starter pack once. Runs after the first sync so cloud data is in.
  if (!lsGet('v2_smartsnip_done')) {
    const raw = (k: string) => (getRec<any>('legacy', k)?.raw as string | undefined) || lsGet(k);
    if (!allRecs('smart').length) importSmartLegacy(raw('smartText_v1'), putLegacy);
    if (!allRecs('snippets').length) importSnippetsLegacy(raw('hub_snippets_v1') || null, putLegacy);
    lsSet('v2_smartsnip_done', '1');
  }
  // Round 61: the HR lists / slips / audit and the old Tools data were not converted before. Read the old data once more
  // (cloud copy when signed in, else this device). Ids are deterministic and deleted items stay deleted.
  if (!lsGet('v2_r61_done') && (lsGet('v2_migrated_cloud') || lsGet('v2_migrated_local'))) {
    try {
      let src: Record<string, string | null> = legacySrcFromRecords();
      if (sync.status.value === 'synced') { const rows = await fetchLegacyRows(); src = { ...src, ...rows }; }
      if (!src.hub_hr_v1 && hasLocalLegacy()) src = { ...localLegacy(), ...src };
      if (Object.keys(src).length) runMigration(src, 'Round 61 update');
      lsSet('v2_r61_done', '1');
    } catch { /* retried on the next start */ }
  }
  installSmart(); installSnippets();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => { /* */ });
  void rev;
}
// small handle for automated tests and support (no data leaves the device through it)
import * as store from './data/store';
import { cycle } from './data/sync';
(window as any).__abi = { store, cycle, sync };
boot();
