// Restore points (Round 61): an automatic daily snapshot of all data, kept on this device only (own IndexedDB), last 7.
import { snapshotJSON, restoreObj } from '../data/backup';
import { lsGet, lsSet, todayKey } from '../lib/util';

export interface Point { id: string; at: number; n: number; size: number; why: string }
const KEEP = 7;
function db(): Promise<IDBDatabase> { return new Promise((res, rej) => { const r = indexedDB.open('abi2-restore', 1); r.onupgradeneeded = () => r.result.createObjectStore('p', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function tx<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> { const d = await db(); return new Promise((res, rej) => { const q = f(d.transaction('p', mode).objectStore('p')); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
export async function listPoints(): Promise<Point[]> { const a = await tx<any[]>('readonly', s => s.getAll()); return a.map(({ id, at, n, size, why }) => ({ id, at, n, size, why })).sort((x, y) => y.at - x.at); }
export async function takePoint(why = 'manual') {
  const json = snapshotJSON(), n = (JSON.parse(json).records || []).length, id = 'rp' + Date.now();
  await tx('readwrite', s => s.put({ id, at: Date.now(), n, size: json.length, why, json }));
  const L = await listPoints(); for (const p of L.slice(KEEP)) await tx('readwrite', s => s.delete(p.id));
  return n;
}
export async function restorePoint(id: string) { const p = await tx<any>('readonly', s => s.get(id)); if (!p) throw new Error('Restore point not found'); await takePoint('before restore'); return restoreObj(JSON.parse(p.json)); }
export async function pointJSON(id: string) { const p = await tx<any>('readonly', s => s.get(id)); return p ? String(p.json) : ''; }
export async function deletePoint(id: string) { await tx('readwrite', s => s.delete(id)); }
/** once a day, a little after start. */
export function autoPoints() { setTimeout(() => { if (lsGet('v2_rp_day') === todayKey() || lsGet('v2_rp_off') === '1') return; takePoint('daily').then(() => lsSet('v2_rp_day', todayKey())).catch(() => { /* */ }); }, 20000); }
