// Privacy (hard rule): no phone numbers or e-mails are ever stored. Same detection as the old app (Round 47), plus
// the HubSpot link helper (Round 55): `?taskId…` removed, deals recognised by their HubSpot record id.
const URL_RX = /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi;
const EMAIL_RX = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)+/g;
const RUN_RX = /\+?\(?\d[\d  ().\-\/]{4,}\d/g;
const DATE_RX = /^\(?\d{4}[-./]\d{1,2}[-./]\d{1,2}$|^\d{1,2}[-./]\d{1,2}[-./]\d{2,4}$/;

function isPhoneRun(run: string, before: string) {
  const t = run.replace(/[\s ]+$/g, ''), d = t.replace(/\D/g, '').length;
  if (d < 7 || d > 15) return false;
  if (DATE_RX.test(t)) return false;
  const pc = before.slice(-1);
  if (/[A-Za-z_#]/.test(pc)) return false;
  if (/[A-Za-z][\-_#:]$/.test(before.slice(-2))) return false;
  if (/\d[.,]$/.test(before.slice(-2))) return false;
  const groups = t.replace(/[()+]/g, '').split(/[\s .\-\/]+/).filter(Boolean);
  if (groups.length > 5) return false;
  if (groups.length > 1) { for (let i = 1; i < groups.length; i++) if (groups[i].length < 3 && !(i === 1 && groups[0].length >= 3)) return false; }
  if (/^\d+[.\/]\d{1,2}$/.test(t)) return false;
  return true;
}
function tidy(s: string) {
  return s.replace(/\(\s*\)/g, '').replace(/\s*[\/|&]\s*(?=[\/|&:;,]|\s*$)/g, ' ').replace(/([:;,])\s*(?=[:;,])/g, '').replace(/[  ]{2,}/g, ' ')
    .replace(/^[\s:;,\/|&\-]+/, '').replace(/[\s:;,\/|&\-]+$/, '').replace(/\s+([,;:.])/g, '$1');
}
export function stripText(text: unknown): { s: string; n: number } {
  const src = String(text == null ? '' : text);
  if (src.length < 5) return { s: src, n: 0 };
  const bag: string[] = []; let n = 0;
  let t = src.replace(URL_RX, m => { bag.push(m); return '\u0001' + (bag.length - 1) + '\u0002'; });
  if (t.indexOf('@') >= 0) t = t.replace(EMAIL_RX, () => { n++; return ''; });
  t = t.replace(RUN_RX, (m: string, off: number, all: string) => { if (isPhoneRun(m, all.slice(Math.max(0, off - 2), off))) { n++; return ''; } return m; });
  if (!n) return { s: src, n: 0 };
  return { s: tidy(t.replace(/\u0001(\d+)\u0002/g, (_, i) => bag[+i] || '')), n };
}
export const cleanText = (s: unknown) => stripText(s).s;
export const hasPII = (s: unknown) => stripText(s).n > 0;

// ---- HubSpot link ----
const TASK = /[?&]task[_-]?id\b[^\s"'<>\\]*/gi;
export function linkClean(s: unknown) { const v = String(s == null ? '' : s); return /task[_-]?id/i.test(v) ? v.replace(TASK, '') : v; }
export function firstUrl(s: unknown) { const m = String(s == null ? '' : s).match(URL_RX); return m ? linkClean(m[0].replace(/[.,;]+$/, '')) : ''; }
export const cleanLink = firstUrl;
export function openUrl(s: unknown) { const u = firstUrl(s); return u ? (/^https?:\/\//i.test(u) ? u : 'https://' + u) : ''; }
export function isLink(s: unknown) { return /^(?:https?:\/\/|www\.)\S+$/i.test(String(s || '').trim()); }
export function linkKey(s: unknown) {
  const v = linkClean(String(s || '').trim()); if (!v) return '';
  const p = v.replace(/^[a-z]+:\/\//i, '').replace(/^www\./i, '').replace(/#.*$/, '').toLowerCase(), path = p.replace(/\?.*$/, '').replace(/\/+$/, '');
  let m: RegExpExecArray | RegExpMatchArray | null = null, x: RegExpExecArray | null;
  const rx = /\/(?:deals?|tickets?|contacts?|companies|company|record\/0-\d+|objects\/0-\d+)\/(\d{4,})(?=\/|$)/g;
  while ((x = rx.exec(path))) m = x; if (!m) m = path.match(/\/(\d{5,})$/);
  if (m) return 'hs:' + m[1];
  return 'u:' + path;
}
export const sameLink = (a: unknown, b: unknown) => { const x = linkKey(a), y = linkKey(b); return !!x && x === y; };

// ---- structured clean (every write goes through this) ----
const DROP: Record<string, 1> = { phones: 1, phone: 1, mobile: 1, tel: 1, telephone: 1, email: 1, emails: 1, whatsappNumber: 1, waNumber: 1 };
const SKIP = /^(id|key|sig|uid|day|date|hk|sk|at|ts|ord|created|updated|due|time|stage|pipeline|kind|type|types|sub|status|src|color|icon|v|rule|folder|price|mvr|regs|plan|billing|pricing|wa|em|tk|c|x|t)$/i;
export function cleanValue(v: unknown, key = '', count = { n: 0 }): unknown {
  if (typeof v === 'string') {
    if (key === 'number' || key === 'link') { const u = v.trim() ? firstUrl(v) : ''; if (u !== v.trim() && v.trim()) count.n++; return u; }
    if (SKIP.test(key)) return v;
    const r = stripText(v); count.n += r.n; return r.s;
  }
  if (Array.isArray(v)) return v.map(x => cleanValue(x, key, count));
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v as object)) { if (DROP[k]) { count.n++; continue; } o[k] = cleanValue((v as Record<string, unknown>)[k], k, count); }
    return o;
  }
  return v;
}
