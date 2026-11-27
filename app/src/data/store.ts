// Local-first record store. Every item (Day End entry, deal, ticket, task, punch, setting …) is one record.
// Each field carries its own hybrid-logical-clock stamp, deletes are tombstones, so merging two devices is
// deterministic and a deleted item can never come back. Kept in memory, persisted to IndexedDB (localStorage fallback).
import { signal } from '@preact/signals';
import { cleanValue } from '../lib/privacy';
import { lsGet, lsSet } from '../lib/util';

export type Data = Record<string, any>;
export interface Rec { c: string; id: string; d: Data; t: Record<string, string>; x?: string; u: string; rv?: number; dirty?: 1 }
export type Row<T = Data> = T & { id: string };

// ---------- hybrid logical clock ----------
export function deviceId(): string {
  let i = lsGet('hub_device_id');
  if (!i) { i = (crypto as any).randomUUID ? (crypto as any).randomUUID() : 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); lsSet('hub_device_id', i!); }
  return i!;
}
const NODE = deviceId().replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'node';
let lastMs = 0, ctr = 0;
export function hlc(): string {
  const now = Date.now();
  if (now > lastMs) { lastMs = now; ctr = 0; } else ctr++;
  return lastMs.toString(36).padStart(9, '0') + '-' + ctr.toString(36).padStart(4, '0') + '-' + NODE;
}
export function seeHlc(h: string) {   // keep our clock ahead of anything we have seen
  const ms = parseInt(h.slice(0, 9), 36); if (ms > lastMs && ms < Date.now() + 864e5) { lastMs = ms; ctr = parseInt(h.slice(10, 14), 36) || 0; }
}
export const LEGACY_T = '000000000-0000-legacy';
export const hlcMs = (h: string) => parseInt(String(h).slice(0, 9), 36) || 0;
const nodeOf = (h: string) => String(h).slice(15);

// ---------- in-memory state ----------
const mem = new Map<string, Rec>();             // key = c + '\u0000' + id
const byC = new Map<string, Map<string, Rec>>();
const cache = new Map<string, Row[]>();
export const rev = signal(0);                    // bumps on any change (UI re-renders)
const colRev = new Map<string, number>();
let pendingBump = false;
function touch(c: string) {
  cache.delete(c); colRev.set(c, (colRev.get(c) || 0) + 1);
  if (!pendingBump) { pendingBump = true; queueMicrotask(() => { pendingBump = false; rev.value++; }); }
}
const K = (c: string, id: string) => c + '\u0000' + id;

// ---------- persistence ----------
let idb: IDBDatabase | null = null;
const dirtyKeys = new Set<string>();
let flushT: any = 0;
function openIdb(): Promise<IDBDatabase | null> {
  return new Promise(res => {
    try {
      const q = indexedDB.open('abi2', 1);
      q.onupgradeneeded = () => { q.result.createObjectStore('recs'); };
      q.onsuccess = () => res(q.result); q.onerror = () => res(null); q.onblocked = () => res(null);
      setTimeout(() => res(null), 5000);
    } catch { res(null); }
  });
}
function schedule() { clearTimeout(flushT); flushT = setTimeout(flush, 60); }
export function flush(): Promise<void> {
  clearTimeout(flushT);
  const keys = Array.from(dirtyKeys); dirtyKeys.clear(); if (!keys.length) return Promise.resolve();
  if (!idb) { // fallback: whole store in localStorage (small data only)
    const all: Rec[] = []; mem.forEach(r => all.push(r)); lsSet('v2_store', JSON.stringify(all)); return Promise.resolve();
  }
  return new Promise(res => {
    try {
      const tx = idb!.transaction('recs', 'readwrite'), st = tx.objectStore('recs');
      keys.forEach(k => { const r = mem.get(k); if (r) st.put(r, k); else st.delete(k); });
      tx.oncomplete = () => res(); tx.onerror = () => res(); tx.onabort = () => res();
    } catch { res(); }
  });
}
export const storeReady = signal(false);
export async function initStore() {
  idb = await openIdb();
  let recs: Rec[] = [];
  if (idb) {
    recs = await new Promise<Rec[]>(res => {
      try { const q = idb!.transaction('recs').objectStore('recs').getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => res([]); } catch { res([]); }
    });
  } else { try { recs = JSON.parse(lsGet('v2_store') || '[]'); } catch { recs = []; } }
  recs.forEach(r => { put0(r); seeHlc(r.u || ''); });
  try { (navigator.storage as any)?.persist?.(); } catch { /* */ }
  storeReady.value = true; rev.value++;
}
function put0(r: Rec) {
  const k = K(r.c, r.id); mem.set(k, r);
  let m = byC.get(r.c); if (!m) { m = new Map(); byC.set(r.c, m); } m.set(r.id, r);
}
function save(r: Rec) { put0(r); dirtyKeys.add(K(r.c, r.id)); touch(r.c); schedule(); }

// ---------- listeners (sync engine subscribes) ----------
type L = (r: Rec) => void;
const localListeners: L[] = [];
export function onLocalChange(f: L) { localListeners.push(f); }

// ---------- reading ----------
export function all<T = Data>(c: string): Row<T>[] {
  let a = cache.get(c);
  if (!a) {
    a = []; const m = byC.get(c);
    if (m) m.forEach(r => { if (!r.x) a!.push({ ...r.d, id: r.id } as Row); });
    cache.set(c, a);
  }
  return a as Row<T>[];
}
export function get<T = Data>(c: string, id: string): Row<T> | undefined {
  const r = byC.get(c)?.get(id); return r && !r.x ? ({ ...r.d, id: r.id } as Row<T>) : undefined;
}
export function raw(c: string, id: string) { return byC.get(c)?.get(id); }
export function rawAll(c?: string): Rec[] { const out: Rec[] = []; if (c) byC.get(c)?.forEach(r => out.push(r)); else mem.forEach(r => out.push(r)); return out; }
export function collections() { return Array.from(byC.keys()); }
export function count(c: string) { return all(c).length; }

// ---------- writing ----------
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** Set fields (undefined = remove field). Values are privacy-cleaned. Returns the record id. */
export function put(c: string, id: string, patch: Data, opts: { t?: string; quiet?: boolean } = {}): string {
  const cnt = { n: 0 }; const clean = cleanValue(patch, '', cnt) as Data;
  if (cnt.n) privacyHits.value += cnt.n;
  let r = byC.get(c)?.get(id);
  const t = opts.t || hlc();
  if (!r) r = { c, id, d: {}, t: {}, u: t };
  else r = { ...r, d: { ...r.d }, t: { ...r.t } };
  let changed = false;
  for (const f of Object.keys(clean)) {
    const v = clean[f];
    if (v === undefined) { if (f in r.d) { delete r.d[f]; r.t[f] = t; changed = true; } continue; }
    if (!eq(r.d[f], v)) { r.d[f] = v; r.t[f] = t; changed = true; }
  }
  if (r.x) { r.x = undefined; changed = true; }
  if (!changed && byC.get(c)?.get(id)) return id;
  r.u = t > (r.u || '') ? t : r.u; r.dirty = 1;
  save(r); if (!opts.quiet && !isLocalOnly(c)) localListeners.forEach(f => f(r!));
  return id;
}
export function del(c: string, id: string) {
  const r0 = byC.get(c)?.get(id); if (!r0 || r0.x) return;
  const t = hlc(); const r: Rec = { ...r0, x: t, u: t, dirty: 1 };
  trashLog(r0); save(r); localListeners.forEach(f => f(r));
}
export function restore(c: string, id: string) {
  const r0 = byC.get(c)?.get(id); if (!r0 || !r0.x) return;
  const t = hlc(); const r: Rec = { ...r0, x: undefined, u: t, dirty: 1, t: { ...r0.t } };
  for (const f of Object.keys(r.d)) r.t[f] = t;   // a restore beats the delete everywhere
  save(r); localListeners.forEach(f => f(r));
}
export const privacyHits = signal(0);
function trashLog(r: Rec) {
  try { const a = JSON.parse(lsGet('v2_trash') || '[]'); a.push({ c: r.c, id: r.id, at: Date.now() }); lsSet('v2_trash', JSON.stringify(a.filter((x: any) => Date.now() - x.at < 30 * 864e5).slice(-500))); } catch { /* */ }
}
export function trash() {
  try { return (JSON.parse(lsGet('v2_trash') || '[]') as { c: string; id: string; at: number }[]).filter(x => { const r = raw(x.c, x.id); return r && r.x; }).reverse(); } catch { return []; }
}

// ---------- merging a remote copy (sync) ----------
export interface Conflict { at: number; c: string; id: string; f: string; mine: unknown; theirs: unknown }
const pick = (ta: string, va: unknown, tb: string, vb: unknown) => (ta > tb ? 1 : ta < tb ? -1 : JSON.stringify(va) >= JSON.stringify(vb) ? 1 : -1);
/** Merge remote record into local. Returns true when the local copy has something the remote lacks (needs a push). */
export function mergeRemote(rm: Rec, rv: number): boolean {
  const cnt = { n: 0 }; rm = { ...rm, d: cleanValue(rm.d || {}, '', cnt) as Data, t: rm.t || {} };
  const lo = byC.get(rm.c)?.get(rm.id);
  Object.values(rm.t).forEach(seeHlc); if (rm.x) seeHlc(rm.x);
  if (!lo) { save({ c: rm.c, id: rm.id, d: rm.d, t: rm.t, x: rm.x || undefined, u: rm.u || '', rv }); return cnt.n > 0; }
  const out: Rec = { c: lo.c, id: lo.id, d: { ...lo.d }, t: { ...lo.t }, x: lo.x, u: lo.u, rv, dirty: lo.dirty };
  let localAhead = false, changed = false;
  const fields = new Set([...Object.keys(lo.t), ...Object.keys(rm.t)]);
  fields.forEach(f => {
    const tl = lo.t[f] || '', tr = rm.t[f] || '';
    const vl = lo.d[f], vr = rm.d[f];
    if (tl === tr && eq(vl, vr)) return;
    if (pick(tr, vr, tl, vl) > 0) {
      if (tl && !eq(vl, vr) && nodeOf(tl) !== nodeOf(tr) && Math.abs(hlcMs(tl) - hlcMs(tr)) < 15 * 60000 && lo.dirty) logConflict({ at: Date.now(), c: lo.c, id: lo.id, f, mine: vl, theirs: vr });
      if (f in rm.d) out.d[f] = vr; else delete out.d[f]; out.t[f] = tr; changed = true;
    } else localAhead = true;
  });
  const xl = lo.x || '', xr = rm.x || '';
  if (xr !== xl) { if (xr > xl) { out.x = xr; changed = true; } else localAhead = true; }
  // an item restored (or edited) after its delete stays alive
  if (out.x) { const newest = Object.values(out.t).sort().pop() || ''; if (newest > out.x) { out.x = undefined; changed = true; } }
  out.u = [out.u, rm.u || ''].sort().pop() || '';
  if (!localAhead) delete out.dirty; else out.dirty = 1;
  if (changed || out.rv !== lo.rv || !!out.dirty !== !!lo.dirty) save(out);
  return localAhead || cnt.n > 0;
}
export function markSynced(c: string, id: string, rv: number, sentU: string) {
  const r = byC.get(c)?.get(id); if (!r) return;
  const n: Rec = { ...r, rv }; if ((r.u || '') <= sentU) delete n.dirty;
  put0(n); dirtyKeys.add(K(c, id)); schedule();
}
export const isLocalOnly = (c: string) => c.charAt(0) === '_';
export function dirtyRecs(): Rec[] { const out: Rec[] = []; mem.forEach(r => { if (r.dirty && !isLocalOnly(r.c)) out.push(r); }); return out; }
export function logConflict(cf: Conflict) {
  try { const a = JSON.parse(lsGet('v2_conflicts') || '[]'); a.push(cf); lsSet('v2_conflicts', JSON.stringify(a.slice(-200))); } catch { /* */ }
}
/** Writes from migration: oldest stamp, never marked as a local edit. Existing fields are left alone. */
export function putLegacy(c: string, id: string, d: Data) {
  const cnt = { n: 0 }; const clean = cleanValue(d, '', cnt) as Data; if (cnt.n) privacyHits.value += cnt.n;
  const lo = byC.get(c)?.get(id); if (lo) return false;
  const t: Record<string, string> = {}; Object.keys(clean).forEach(f => { if (clean[f] !== undefined) t[f] = LEGACY_T; else delete clean[f]; });
  save({ c, id, d: clean, t, u: LEGACY_T, dirty: 1 }); return true;
}
export function wipeLocal() { mem.clear(); byC.clear(); cache.clear(); rev.value++; if (idb) { try { idb.transaction('recs', 'readwrite').objectStore('recs').clear(); } catch { /* */ } } }
