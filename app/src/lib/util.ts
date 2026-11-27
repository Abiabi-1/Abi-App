// Small shared helpers (dates, numbers, ids, files). No dependencies.
export const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function keyOf(d: Date) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
export const todayKey = () => keyOf(new Date());
export const isKey = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
export function parseKey(k: string) { const p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
export function shiftDayKey(k: string, n: number) { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); }
export function fmtDay(k: string, long?: boolean) {
  return parseKey(k).toLocaleDateString('en-GB', long
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
export function timeToMin(t: string) { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); }
export function minToTime(min: number) { min = ((min % 1440) + 1440) % 1440; return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
export function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'pm' : 'am'; let hr = h % 12; if (hr === 0) hr = 12;
  return hr + (m ? ':' + pad(m) : '') + ap;
}
export function h12(ms: number, sec = true) {
  if (!ms) return ''; const d = new Date(ms); if (isNaN(+d)) return '';
  let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return h + ':' + pad(d.getMinutes()) + (sec ? ':' + pad(d.getSeconds()) : '') + ' ' + ap;
}
export function dur(ms: number, noSec?: boolean) {
  ms = Math.max(0, Math.round(ms / 1000)); const h = Math.floor(ms / 3600), m = Math.floor((ms % 3600) / 60), s = ms % 60;
  return h ? h + 'h ' + pad(m) + 'm' + (noSec ? '' : ' ' + pad(s) + 's') : m + 'm' + (noSec ? '' : ' ' + pad(s) + 's');
}
export function clock(ms: number) { ms = Math.max(0, Math.floor(ms / 1000)); return pad(Math.floor(ms / 3600)) + ':' + pad(Math.floor((ms % 3600) / 60)) + ':' + pad(ms % 60); }
export function ago(ms: number) {
  const s = Math.round((Date.now() - ms) / 1000); if (s < 60) return 'just now'; const m = Math.round(s / 60); if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60); if (h < 48) return h + ' h ago'; return Math.round(h / 24) + ' days ago';
}
export function addDays(k: string, n: number) { return shiftDayKey(k, n); }
export function addMonths(k: string, n: number) { const d = parseKey(k); d.setMonth(d.getMonth() + n); return keyOf(d); }

export function parsePrice(v: unknown): number {
  if (v === undefined || v === null || v === '') return NaN;
  if (typeof v === 'number') return v;
  let s = String(v).trim();
  s = /^\D*\d+,\d{1,2}\D*$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  const m = s.match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN;
}
export function fmtNum(n: number) { return (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
export const hasVal = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== '';
export const r2 = (n: number) => Math.round(n * 100) / 100;

export function uid(p = '') { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
export function hash(s: string) {   // FNV-1a 32-bit, as base36 (deterministic ids for migrated data)
  let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}
export function slug(s: string) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }

export function download(name: string, data: BlobPart, mime = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([data], { type: mime })); const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t); return true; } catch { /* fall back */ }
  try { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch { return false; }
}
export function csv(rows: unknown[][]) {
  return rows.map(r => r.map(v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
}
export function lsGet(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
export function lsSet(k: string, v: string) { try { localStorage.setItem(k, v); return true; } catch { return false; } }
export function lsDel(k: string) { try { localStorage.removeItem(k); } catch { /* */ } }
export function lsJSON<T>(k: string, def: T): T { try { const v = JSON.parse(lsGet(k) || 'null'); return v == null ? def : v; } catch { return def; } }
export const cx = (...a: unknown[]) => a.filter(Boolean).join(' ');
