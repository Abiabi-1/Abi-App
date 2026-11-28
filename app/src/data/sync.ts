// Cloud sync with Supabase (same project and `kv` table as before; no SQL to run).
// One kv row per record: key `v2:<collection>:<id>`, value = JSON {c,id,d,t,x,u}. Saves are version-checked;
// on a clash the cloud copy is fetched, merged field by field and saved again. Realtime pushes, an incremental pull
// every 15 s and a full version check every 10 min make sure nothing is missed. Never reloads the page.
import { signal } from '@preact/signals';
import { Rec, dirtyRecs, markSynced, mergeRemote, onLocalChange, raw, rawAll, deviceId, flush } from './store';
import { lsGet, lsSet, lsDel } from '../lib/util';

const BUILTIN = { url: 'https://xlogoqrnnqhxeuufpeqc.supabase.co', anonKey: 'sb_publishable_IEZqyzKEzsOtLq23KvMt3w_3r-gZ0Ke' };
function config(): { url: string; anonKey: string; disabled?: boolean; realtime?: boolean } {
  const w = (window as any).CLOUD_CONFIG;
  if (w && w.disabled) return { ...BUILTIN, disabled: true };
  if (w && w.url && w.anonKey) return w;
  try { const o = JSON.parse(lsGet('hub_cloud_cfg_v1') || 'null'); if (o && o.url && o.anonKey) return o; } catch { /* */ }
  return BUILTIN;
}
const CFG = config();
const BASE = String(CFG.url).replace(/\/+$/, ''), ANON = String(CFG.anonKey);
const LS_SESSION = 'cloud_session_v1', LS_WS = 'cloud_ws_v1', LS_CURSOR = 'v2_cursor';
export const PREFIX = 'v2:';

export type Status = 'off' | 'signedout' | 'syncing' | 'synced' | 'offline' | 'error';
export const sync = {
  status: signal<Status>('off'), detail: signal(''), pending: signal(0), live: signal(false), email: signal(''),
  lastSync: signal(0), loginOpen: signal(false), disabled: !!CFG.disabled,
};
interface Session { access: string; refresh: string; exp: number; user: { id: string; email: string } | null }
let S: Session | null = null;
let WS: string | null = null;

// ---------- session (shared with the old app on the same device, so rotation is seen by both) ----------
function readSession(): Session | null { try { const s = JSON.parse(lsGet(LS_SESSION) || 'null'); return s && s.access && s.user ? s : null; } catch { return null; } }
function saveSession() { if (S) lsSet(LS_SESSION, JSON.stringify(S)); else lsDel(LS_SESSION); }
function sessFrom(j: any, prev?: Session | null): Session {
  const u = j.user || prev?.user || null;
  return { access: j.access_token, refresh: j.refresh_token || prev?.refresh || '', exp: j.expires_at ? j.expires_at * 1000 : Date.now() + (j.expires_in || 3600) * 1000, user: u ? { id: u.id, email: u.email } : null };
}
class HttpErr extends Error { status = 0; offline = false; }
function err(msg: string, status = 0, offline = false) { const e = new HttpErr(msg); e.status = status; e.offline = offline; return e; }

let refreshing: Promise<void> | null = null;
async function refresh() {
  if (!S) return; if (refreshing) return refreshing;
  refreshing = (async () => {
    const other = readSession();   // the old app (or another tab) may already have refreshed
    if (other && other.access !== S!.access && other.exp - Date.now() > 120000) { S = other; return; }
    try {
      const j = await http('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: S!.refresh } });
      S = sessFrom(j, S); saveSession(); rtToken();
    } catch (e: any) {
      if (!e.offline && [400, 401, 403].includes(e.status)) {
        const again = readSession(); if (again && again.access !== S!.access) { S = again; return; }
        S = null; saveSession(); stopLoops(); setStatus('signedout', 'Your session ended – sign in again. Your changes are kept on this device and sent after you sign in.'); sync.loginOpen.value = true;
      }
      throw e;
    } finally { refreshing = null; }
  })();
  return refreshing;
}
async function http(path: string, o: { method?: string; body?: unknown; auth?: boolean; headers?: Record<string, string>; token?: string; keepalive?: boolean; _retry?: boolean } = {}): Promise<any> {
  const h: Record<string, string> = { apikey: ANON, 'Content-Type': 'application/json' };
  if (o.auth === false) { if (o.token || ANON.slice(0, 3) === 'eyJ') h.Authorization = 'Bearer ' + (o.token || ANON); }
  else { if (S && S.exp - Date.now() < 60000) await refresh(); if (!S) throw err('Signed out', 401); h.Authorization = 'Bearer ' + S.access; }
  Object.assign(h, o.headers || {});
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 25000);
  let res: Response, txt = '';
  try { res = await fetch(BASE + path, { method: o.method || 'GET', headers: h, body: o.body == null ? undefined : JSON.stringify(o.body), signal: ac.signal, keepalive: !!o.keepalive }); txt = await res.text(); }
  catch { clearTimeout(tm); throw err('offline', 0, true); }
  clearTimeout(tm);
  let data: any = null; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  if (res.status === 401 && o.auth !== false && !o._retry) { try { await refresh(); } catch (e: any) { if (e.offline) throw e; } if (S) return http(path, { ...o, _retry: true }); }
  if (!res.ok) throw err((data && (data.error_description || data.msg || data.message || data.error)) || 'HTTP ' + res.status, res.status);
  return data;
}

// ---------- auth API for the login screen ----------
export async function signIn(email: string, pw: string) { const j = await http('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email, password: pw } }); S = sessFrom(j); saveSession(); await start(); }
export async function signUp(email: string, pw: string) {
  const j = await http('/auth/v1/signup', { method: 'POST', auth: false, body: { email, password: pw } });
  if (j && j.access_token) { S = sessFrom(j); saveSession(); await start(); return true; } return false;
}
export async function forgot(email: string) { await http('/auth/v1/recover', { method: 'POST', auth: false, body: { email } }); }
export async function setPassword(pw: string) { await http('/auth/v1/user', { method: 'PUT', body: { password: pw } }); }
export async function signOut() {
  try { if (S) await http('/auth/v1/logout', { method: 'POST' }); } catch { /* */ }
  S = null; saveSession(); stopLoops(); WS = null; setStatus('signedout', 'Signed out. Your data stays on this device.');
}
export const signedIn = () => !!S;

// ---------- status ----------
function setStatus(s: Status, d = '') { sync.status.value = s; sync.detail.value = d; }
function updatePending() { sync.pending.value = dirtyRecs().length; }
onLocalChange(() => { updatePending(); kick(800); });

// ---------- rows ----------
const enc = encodeURIComponent;
const rowKey = (r: { c: string; id: string }) => PREFIX + r.c + ':' + r.id;
function parseRow(row: { key: string; value: string; version: number }): Rec | null {
  try { const v = JSON.parse(row.value); if (!v || !v.c || v.id == null) return null; return { c: v.c, id: String(v.id), d: v.d || {}, t: v.t || {}, x: v.x || undefined, u: v.u || '' }; } catch { return null; }
}
const valueOf = (r: Rec) => { const v = JSON.stringify({ c: r.c, id: r.id, d: r.d, t: r.t, x: r.x || null, u: r.u }); return r.x && v.length > 900_000 ? JSON.stringify({ c: r.c, id: r.id, d: {}, t: {}, x: r.x, u: r.u }) : v; };   // a deleted huge item is sent without its content

async function ensureWs(): Promise<string> {
  try { const c = JSON.parse(lsGet(LS_WS) || 'null'); if (c && S?.user && c.user === S.user.id && c.ws) return c.ws; } catch { /* */ }
  let ws = await http('/rest/v1/rpc/ensure_workspace', { method: 'POST', body: {} });
  if (ws && typeof ws === 'object') ws = ws.ensure_workspace || ws.id || ws[0];
  lsSet(LS_WS, JSON.stringify({ user: S!.user!.id, ws })); return ws;
}

// push: version-checked update for known rows, insert (ignore duplicates) for new ones, merge-and-retry on clash
async function pushOne(r: Rec, depth = 0): Promise<void> {
  const sentU = r.u, k = rowKey(r);
  if (r.rv != null) {
    const a = await http('/rest/v1/kv?workspace_id=eq.' + WS + '&key=eq.' + enc(k) + '&version=eq.' + r.rv, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { value: valueOf(r) } });
    if (a && a[0]) { markSynced(r.c, r.id, a[0].version, sentU); return; }
  }
  await resolveClash(r, depth);
}
async function resolveClash(r: Rec, depth: number) {
  if (depth > 3) return;
  const a = await http('/rest/v1/kv?workspace_id=eq.' + WS + '&key=eq.' + enc(rowKey(r)) + '&select=key,value,version');
  const row = a && a[0];
  if (!row) {   // not in the cloud yet
    const ins = await http('/rest/v1/kv?on_conflict=workspace_id,key', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: [{ workspace_id: WS, key: rowKey(r), value: valueOf(r) }] });
    if (ins && ins[0]) { markSynced(r.c, r.id, ins[0].version, r.u); return; }
    return resolveClash(r, depth + 1);
  }
  const rm = parseRow(row); if (!rm) { markSynced(r.c, r.id, row.version, ''); return; }
  const ahead = mergeRemote(rm, row.version);
  const cur = raw(r.c, r.id);
  if (ahead && cur) await pushOne(cur, depth + 1); else if (cur) markSynced(r.c, r.id, row.version, cur.u);
}
async function pushAll(keepalive = false) {
  tooBig.clear(); const list = dirtyRecs(); if (!list.length) return;
  const fresh = list.filter(r => r.rv == null), known = list.filter(r => r.rv != null);
  const batches: Rec[][] = []; let cur: Rec[] = [], bytes = 0;
  for (const r of fresh) {   // new rows in batches of at most ~1 MB / 300 rows (the cloud refuses very large requests)
    const n = valueOf(r).length;
    if (n > MAX_ROW) { tooBig.add(rowKey(r)); continue; }
    if (cur.length && (bytes + n > MAX_BATCH || cur.length >= 300)) { batches.push(cur); cur = []; bytes = 0; }
    cur.push(r); bytes += n;
  }
  if (cur.length) batches.push(cur);
  for (const chunk of batches) {
    const ins: any[] = await http('/rest/v1/kv?on_conflict=workspace_id,key&select=key,version', { method: 'POST', keepalive: keepalive && JSON.stringify(chunk.map(valueOf)).length < 60000, headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: chunk.map(r => ({ workspace_id: WS, key: rowKey(r), value: valueOf(r) })) }) || [];
    const got = new Map(ins.map(x => [x.key, x.version]));
    for (const r of chunk) { const v = got.get(rowKey(r)); if (v != null) markSynced(r.c, r.id, v, r.u); else await resolveClash(r, 0); }
    updatePending();
  }
  for (const r of known) { if (valueOf(r).length > MAX_ROW) { tooBig.add(rowKey(r)); continue; } await pushOne(r); }
  updatePending();
  if (tooBig.size) sync.detail.value = tooBig.size + ' item(s) are too large to send (kept on this device): ' + Array.from(tooBig).slice(0, 3).join(', ');
}
const MAX_BATCH = 900_000, MAX_ROW = 4_500_000;
const tooBig = new Set<string>();

// pull: rows changed since the cursor (with a 60 s overlap; merging the same row twice is harmless)
async function pullSince(sinceIso: string | null) {
  let off = 0, maxTs = sinceIso || '';
  for (;;) {
    const q = '/rest/v1/kv?workspace_id=eq.' + WS + '&key=like.' + enc(PREFIX + '*') + (sinceIso ? '&updated_at=gte.' + enc(sinceIso) : '') +
      '&select=key,value,version,updated_at&order=updated_at.asc,key.asc&limit=1000&offset=' + off;
    const rows: any[] = await http(q) || [];
    for (const row of rows) {
      if (row.updated_at > maxTs) maxTs = row.updated_at;
      const rm = parseRow(row); if (!rm) continue;
      const lo = raw(rm.c, rm.id); if (lo && lo.rv === row.version && !lo.dirty) continue;
      mergeRemote(rm, row.version);
    }
    if (rows.length < 1000) break; off += rows.length;
  }
  if (maxTs) { const d = new Date(Date.parse(maxTs) - 60000).toISOString(); lsSet(LS_CURSOR + ':' + WS, d); }
}
async function fullCheck() {   // compare versions of every row; fetch what differs
  const rows: any[] = [];
  for (let off = 0; ; off += 5000) { const a: any[] = await http('/rest/v1/kv?workspace_id=eq.' + WS + '&key=like.' + enc(PREFIX + '*') + '&select=key,version&order=key.asc&limit=5000&offset=' + off) || []; rows.push(...a); if (a.length < 5000) break; }
  const local = new Map<string, Rec>(); rawAll().forEach(r => local.set(rowKey(r), r));
  const need = rows.filter(x => { const l = local.get(x.key); return !l || l.rv !== x.version; }).map(x => x.key);
  for (let i = 0; i < need.length; i += 80) {
    const keys = need.slice(i, i + 80).map(k => '"' + String(k).replace(/"/g, '\\"') + '"').join(',');
    const a: any[] = await http('/rest/v1/kv?workspace_id=eq.' + WS + '&key=in.(' + enc(keys) + ')&select=key,value,version') || [];
    a.forEach(row => { const rm = parseRow(row); if (rm) mergeRemote(rm, row.version); });
  }
  lastFull = Date.now();
}

// ---------- cycle ----------
let running: Promise<void> | null = null;
let busy = false, again = false, timer: any = 0, kickT: any = 0, lastPull = 0, lastFull = 0, loops = false;
export function kick(ms = 0) { clearTimeout(kickT); kickT = setTimeout(() => cycle(), ms); }
export async function cycle(force = false): Promise<void> {
  if (!S) return;
  if (!WS) { try { WS = await ensureWs(); } catch (e: any) { if (e.offline) setStatus('offline', 'Changes are saved on this device and sent when you are back online.'); return; } }
  if (busy) { again = true; return running ? running.then(() => (force ? cycle(true) : undefined)) : undefined; }
  busy = true;
  let done!: () => void; running = new Promise<void>(r => { done = r; });
  try {
    if (dirtyRecs().length) setStatus('syncing');
    await pushAll();
    if (force || Date.now() - lastPull > 14000 || again) { lastPull = Date.now(); await pullSince(lsGet(LS_CURSOR + ':' + WS)); }
    if (Date.now() - lastFull > 600000) await fullCheck();
    await pushAll();   // anything the pull showed we were ahead on
    updatePending(); sync.lastSync.value = Date.now();
    setStatus(sync.pending.value && !tooBig.size ? 'syncing' : 'synced', tooBig.size ? sync.detail.value : '');
  } catch (e: any) {
    updatePending();
    if (e.offline) setStatus('offline', 'Changes are saved on this device and sent when you are back online.');
    else if (e.status === 401 || !S) { /* login shown by refresh() */ }
    else setStatus('error', e.message || String(e));
  } finally {
    busy = false; done();
    if (again) { again = false; kick(300); }
  }
}

// ---------- realtime (Supabase Phoenix channel) ----------
const RT: { ws: WebSocket | null; ref: number; hb: any; retry: number; timer: any } = { ws: null, ref: 0, hb: 0, retry: 0, timer: 0 };
const TOPIC = 'realtime:v2-kv';
function rtSend(o: unknown) { try { RT.ws?.send(JSON.stringify(o)); } catch { /* */ } }
function rtToken() { if (RT.ws && S) rtSend({ topic: TOPIC, event: 'access_token', ref: String(++RT.ref), payload: { access_token: S.access } }); }
function rtStart() {
  if (CFG.realtime === false || typeof WebSocket !== 'function' || !S || !WS || RT.ws) return;
  try {
    const w = new WebSocket(BASE.replace(/^http/, 'ws') + '/realtime/v1/websocket?apikey=' + enc(ANON) + '&vsn=1.0.0'); RT.ws = w;
    w.onopen = () => {
      rtSend({ topic: TOPIC, event: 'phx_join', ref: String(++RT.ref), payload: { config: { broadcast: { self: false }, presence: { key: '' }, postgres_changes: [{ event: '*', schema: 'public', table: 'kv', filter: 'workspace_id=eq.' + WS }] }, access_token: S && S.access } });
      RT.hb = setInterval(() => { rtSend({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++RT.ref) }); if (S && S.exp - Date.now() < 120000) refresh().catch(() => { /* */ }); }, 25000);
    };
    w.onmessage = m => {
      let d: any; try { d = JSON.parse(m.data); } catch { return; }
      if (d.event === 'phx_reply' && d.topic === TOPIC && d.payload && d.payload.status === 'ok') { sync.live.value = true; RT.retry = 0; }
      else if (d.event === 'postgres_changes') {
        const rec = d.payload?.data?.record;
        if (rec && typeof rec.key === 'string' && rec.key.indexOf(PREFIX) !== 0) return;   // the old app's rows
        if (rec && rec.value && rec.version != null) { const rm = parseRow(rec); if (rm) { const lo = raw(rm.c, rm.id); if (!lo || lo.rv !== rec.version) { if (mergeRemote(rm, rec.version)) kick(300); } return; } }
        again = true; kick(250);
      } else if (d.event === 'phx_error' || d.event === 'phx_close' || (d.event === 'system' && d.payload?.status === 'error')) { try { w.close(); } catch { /* */ } }
    };
    const down = () => { if (RT.ws !== w) return; RT.ws = null; sync.live.value = false; clearInterval(RT.hb); if (!loops) return; clearTimeout(RT.timer); RT.timer = setTimeout(rtStart, Math.min(60000, 2000 * Math.pow(2, RT.retry++))); };
    w.onclose = down; w.onerror = () => { try { w.close(); } catch { /* */ } };
  } catch { RT.ws = null; }
}
function rtStop() { clearTimeout(RT.timer); const w = RT.ws; RT.ws = null; sync.live.value = false; clearInterval(RT.hb); try { w?.close(); } catch { /* */ } }

// ---------- devices (Round 46 table) ----------
export function deviceInfo() {
  const u = navigator.userAgent || '';
  const pf = /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android' : /Windows/.test(u) ? 'Windows PC' : /Mac/.test(u) ? 'Mac' : /Linux/.test(u) ? 'Linux PC' : 'Device';
  const br = /Edg\//.test(u) ? 'Edge' : /FxiOS|Firefox/.test(u) ? 'Firefox' : /CriOS|Chrome/.test(u) ? 'Chrome' : /Safari/.test(u) ? 'Safari' : 'Browser';
  let app = false; try { app = matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true; } catch { /* */ }
  return { platform: pf, browser: br + (app ? ' (installed app)' : ''), name: lsGet('hub_device_name') || pf + ' – ' + br + (app ? ' app' : '') };
}
async function beat() {
  if (!S || !WS) return; const i = deviceInfo();
  try { await http('/rest/v1/devices?on_conflict=workspace_id,device_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { workspace_id: WS, device_id: deviceId(), name: i.name, platform: i.platform, browser: i.browser, last_seen: new Date().toISOString(), removed: false } }); } catch { /* table may be missing */ }
}
export async function listDevices(): Promise<any[]> { if (!S || !WS) return []; try { return await http('/rest/v1/devices?workspace_id=eq.' + WS + '&select=device_id,name,platform,browser,last_seen,removed&order=last_seen.desc') || []; } catch { return []; } }
export async function removeDevice(id: string) { await http('/rest/v1/devices?workspace_id=eq.' + WS + '&device_id=eq.' + enc(id), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { removed: true, removed_at: new Date().toISOString() } }); }

// ---------- legacy rows (read only, for migration) ----------
export async function fetchLegacyRows(): Promise<Record<string, string>> {
  if (!S || !WS) return {};
  const rows: any[] = await http('/rest/v1/kv?workspace_id=eq.' + WS + '&key=not.like.' + enc(PREFIX + '*') + '&select=key,value') || [];
  const o: Record<string, string> = {}; rows.forEach(r => { o[r.key] = r.value; }); return o;
}
export async function cloudFlag(name: string): Promise<boolean> {
  if (!S || !WS) return false;
  const a = await http('/rest/v1/kv?workspace_id=eq.' + WS + '&key=eq.' + enc(PREFIX + 'meta:' + name) + '&select=key'); return !!(a && a[0]);
}

// ---------- start / loops ----------
function startLoops() {
  if (loops) return; loops = true;
  timer = setInterval(() => cycle(), 5000);
  const vis = () => { if (document.hidden) { flush(); pushAll(true).catch(() => { /* */ }); } else { lastPull = 0; cycle(true); if (!RT.ws || RT.ws.readyState > 1) { RT.ws = null; clearTimeout(RT.timer); RT.retry = 0; rtStart(); } } };
  document.addEventListener('visibilitychange', vis);
  window.addEventListener('online', () => { cycle(true); if (!RT.ws) { RT.retry = 0; rtStart(); } });
  window.addEventListener('offline', () => setStatus('offline'));
  window.addEventListener('pagehide', () => { flush(); pushAll(true).catch(() => { /* */ }); });
  rtStart(); beat(); setInterval(beat, 60000);
}
function stopLoops() { loops = false; clearInterval(timer); rtStop(); }
export const ready = signal(false);
let beforeFirstPull: (() => Promise<void>) | null = null;
export function onConnected(f: () => Promise<void>) { beforeFirstPull = f; }
export async function start() {
  if (!S) return;
  sync.email.value = S.user?.email || '';
  setStatus('syncing');
  try {
    WS = await ensureWs();
    if (beforeFirstPull) await beforeFirstPull();
    startLoops(); await cycle(true);
  } catch (e: any) {
    if (e.offline) { setStatus('offline'); startLoops(); }
    else if (e.status !== 401) { setStatus('error', e.message); startLoops(); }
  }
}
export async function initSync() {
  if (CFG.disabled) { setStatus('off', 'Cloud sync is off in this copy'); ready.value = true; return; }
  S = readSession();
  if (S) { ready.value = true; await start(); return; }
  setStatus('signedout'); ready.value = true;
  let skip = false; try { skip = sessionStorage.getItem('cloud_skip') === '1'; } catch { /* */ }
  if (!skip) sync.loginOpen.value = true;
}
export function skipLogin() { try { sessionStorage.setItem('cloud_skip', '1'); } catch { /* */ } sync.loginOpen.value = false; }
export async function writeCloudFlag(name: string) { if (!S || !WS) return; try { await http('/rest/v1/kv?on_conflict=workspace_id,key', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: [{ workspace_id: WS, key: PREFIX + 'meta:' + name, value: JSON.stringify({ at: new Date().toISOString(), by: deviceId() }) }] }); } catch { /* */ } }
