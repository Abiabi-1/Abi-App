// Import into Day End, same rules as the old page: Excel exports, Download Report .html, report .txt, pasted report text.
// Duplicates (same day, hour, section and report line) are skipped; the shift widens to include imported hours;
// phone numbers / e-mails are cleaned out by the store on save.
import { MONTHS, minToTime, pad, timeToMin, parseKey } from '../lib/util';
import { cleanLink, cleanText } from '../lib/privacy';
import { Entry, SK, SECTION_KEYS, WON, addEntry, allEntryDays, entriesOf, getDay, inferPricing, joinFields, normCycle, normPlan, normStage, cycleOf, reportEntry, setShift, hasRegs } from './dayend';
import { get } from '../data/store';

type Item = { day: string; hk: string; sk: SK; entry: Partial<Entry> };
const cellStr = (v: unknown) => (v === null || v === undefined ? '' : typeof v === 'number' ? String(v) : String(v).trim());
function normDay(v: unknown) {
  if (typeof v === 'number' && v > 20000) { const dt = new Date(Math.round((v - 25569) * 86400000)); return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate()); }
  const m = cellStr(v).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); return m ? m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]) : '';
}
export function normHour(v: unknown) {
  if (typeof v === 'number') return v >= 0 && v < 1 ? minToTime(Math.round(v * 1440)) : '';
  const s = String(v || '').trim().toLowerCase();
  let m: RegExpMatchArray | null | string[] = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/);
  if (!m) { const m2 = s.match(/^(\d{1,2})\s*(am|pm)$/); if (m2) m = [m2[0], m2[1], '00', m2[2]]; }
  if (!m) return ''; let h = +m[1]; const mi = +m[2];
  if (m[3] === 'pm' && h < 12) h += 12; if (m[3] === 'am' && h === 12) h = 0;
  return h > 23 || mi > 59 ? '' : pad(h) + ':' + pad(mi);
}
function normCat(v: unknown): SK | '' { const s = String(v || '').toLowerCase().replace(/[^a-z]/g, ''); if (/^task/.test(s)) return 'tasks'; if (/^(supportcall|call)/.test(s)) return 'calls'; if (/^(whatsapp|wa)/.test(s)) return 'whatsapp'; if (/^ticket/.test(s)) return 'tickets'; if (s === 'other') return 'other'; return ''; }
function headKey(h: unknown) {
  const s = String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
  const map: Record<string, string> = { day: 'day', date: 'day', hour: 'hour', time: 'hour', category: 'category', section: 'category', number: 'number', hubspotlink: 'number', link: 'number', dealurl: 'number', hubspot: 'number', dealname: 'deal', deal: 'deal', notes: 'notes', note: 'notes', dealstage: 'stage', stage: 'stage', plan: 'plan', billing: 'billing', billingcycle: 'billing', cycle: 'billing', term: 'billing', price: 'price', amount: 'price', priceusd: 'price', usd: 'price', pricemvr: 'mvr', mvr: 'mvr', extraregisters: 'regs', registers: 'regs', regs: 'regs', details: 'details', entry: 'details', shiftstart: 'shiftstart', shiftend: 'shiftend' };
  return map[s] || '';
}
function splitDealNotes(rest: unknown) { const s = String(rest == null ? '' : rest).trim(), c = s.indexOf(','); if (c < 1 || c > 80) return null; const a = s.slice(0, c).trim(), b = s.slice(c + 1).trim(); return a && b ? [a, b] : null; }
function splitStagedDeal(deal: unknown) { const sp = splitDealNotes(deal); if (!sp) return null; if (/^(inc|ltd|llc|llp|pvt|pte|plc|co|corp|limited|private|company)\b/i.test(sp[1])) return null; if (!(/\s/.test(sp[1]) || /[.!?]$/.test(sp[1]))) return null; return sp; }
function splitPriceText(s: string) { const m = String(s).match(/^\s*\$?\s*(-?[\d,]*\.?\d+)\s*(?:\(\s*(-?[\d,]*\.?\d+)\s*MVR\s*\))?\s*$/i); if (!m) return { price: String(s).trim(), mvr: '' }; return { price: m[1].replace(/,/g, ''), mvr: (m[2] || '').replace(/,/g, '') }; }
function parseTaskLine(s: string): Partial<Entry> {
  const i = s.indexOf(' | ');
  if (i < 0 || !/^(Stage|Plan|Price|Registers|Link): /.test(s.slice(i + 3))) { const sp = splitDealNotes(s); return sp ? { deal: sp[0], notes: sp[1], number: '', stage: '' } : { text: s }; }
  const base = s.slice(0, i), tags: Record<string, string> = {};
  s.slice(i + 3).split(' | ').forEach(p => { const m = p.match(/^(Stage|Plan|Price|Registers|Link): (.*)$/); if (m) tags[m[1]] = m[2]; });
  const e: Partial<Entry> = { number: tags.Link ? cleanLink(tags.Link) : '', deal: base, notes: '', stage: normStage(tags.Stage), plan: '', billing: '', price: '' };
  if (tags.Plan) { const m = tags.Plan.match(/^(.*?)(?: \((Monthly|Biannual|Annual)\))?$/)!; e.plan = normPlan(m[1]); e.billing = m[2] || ''; }
  if (tags.Price) { const sp = splitPriceText(tags.Price); e.price = sp.price; if (sp.mvr) e.mvr = sp.mvr; }
  if (tags.Registers) { const n = (tags.Registers.match(/\d+/) || [''])[0]; if (n) e.regs = n; }
  const sp = e.stage ? splitStagedDeal(e.deal) : splitDealNotes(e.deal); if (sp) { e.deal = sp[0]; e.notes = sp[1]; }
  const pz = inferPricing(e); if (pz) e.pricing = pz;
  return e;
}
function dayFromText(s: string) { const m = s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/); if (!m) return ''; const mi = MONTHS.findIndex(x => x.toLowerCase() === m[2].toLowerCase()); return mi < 0 ? '' : m[3] + '-' + pad(mi + 1) + '-' + pad(+m[1]); }

function apply(items: Item[], shifts: Record<string, { a: string; b: string }>, selDay: string, noDay: number, skippedIn = 0): string {
  const sig = (day: string, hk: string, sk: SK, e: Partial<Entry>) => [day, hk, sk, reportEntry({ ...(e as Entry), sk })].join('\u0001');
  const existing = new Set<string>(); allEntryDays().forEach(k => entriesOf(k).forEach(e => existing.add(sig(k, e.hk, e.sk, e))));
  const fresh: Record<string, boolean> = {}; items.forEach(it => { if (!(it.day in fresh)) fresh[it.day] = !entriesOf(it.day).length; });
  let added = 0, dup = 0; const shiftSet: Record<string, 1> = {};
  items.forEach((it, n) => {
    let d = getDay(it.day);
    if (fresh[it.day] && shifts[it.day] && !shiftSet[it.day]) { setShift(it.day, shifts[it.day].a, shifts[it.day].b); shiftSet[it.day] = 1; d = getDay(it.day); }
    const hk = it.hk || d.shiftStart, s = sig(it.day, hk, it.sk, it.entry);
    if (existing.has(s)) { dup++; return; } existing.add(s);
    const hs = timeToMin(d.shiftStart); let he = timeToMin(d.shiftEnd); if (he <= hs) he = hs + 60; const hm = timeToMin(hk);
    if (hm < hs || hm + 60 > he) setShift(it.day, hm < hs ? hk : d.shiftStart, hm + 60 > he ? minToTime(Math.min(hm + 60, 1439)) : d.shiftEnd);
    addEntry(it.day, hk, it.sk, { ...it.entry, at: undefined, ord: Date.now() + n } as Partial<Entry>); added++;
  });
  let msg = 'Imported ' + added + ' entr' + (added === 1 ? 'y' : 'ies');
  if (dup) msg += ', skipped ' + dup + ' already here'; if (skippedIn) msg += ', skipped ' + skippedIn + ' unreadable';
  if (noDay) msg += '. ' + noDay + ' had no day, so added to ' + parseKey(selDay).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  return msg;
}
export function importReportText(text: string, selDay: string): string {
  const SEC: Record<string, SK> = { 'Tasks Completed': 'tasks', 'Support Calls': 'calls', 'Whatsapp Inquiries': 'whatsapp', 'Tickets Attended': 'tickets', Other: 'other' };
  const items: Item[] = [], shifts: Record<string, { a: string; b: string }> = {};
  let day = '', hk = '', sk: SK | '' = '', noDay = 0, saw = false, counted = false;
  const lines = String(text).replace(/\r/g, '').split('\n');
  for (const line of lines) {
    if (/^─{5,}/.test(line)) break; let m: RegExpMatchArray | null;
    if ((m = line.match(/^Day End Report\s+—\s+(.*)$/))) { saw = true; day = dayFromText(m[1]); hk = ''; sk = ''; continue; }
    if ((m = line.match(/^▸\s+(.*)$/))) { saw = true; day = dayFromText(m[1]); hk = ''; sk = ''; continue; }
    if ((m = line.match(/^Shift:\s+(\S+)\s+[–-]\s+(\S+)/))) { const a = normHour(m[1]), b = normHour(m[2]); if (a && b) shifts[day || selDay] = { a, b }; continue; }
    if ((m = line.match(/^(\d{1,2}(?::\d{2})?(?:am|pm))\s+-\s+(\d{1,2}(?::\d{2})?(?:am|pm))$/))) { hk = normHour(m[1]); sk = ''; continue; }
    if ((m = line.match(/^(Tasks Completed|Support Calls|Whatsapp Inquiries|Tickets Attended|Other): \d+$/))) { sk = SEC[m[1]]; continue; }
    if (/^Day total:/.test(line)) { hk = ''; sk = ''; continue; }
    if ((m = line.match(/^\s*•\s?(.*)$/)) && hk && sk) {
      let t = m[1].trim(); if (!t || t === '—') continue;
      t = t.replace(/\s+\[\d{1,2}:\d{2}(?::\d{2})?\s*[AP]M\]$/i, '');   // the exact-time suffix is not part of the entry
      let d = day; if (!d) { d = selDay; if (!counted) { noDay++; counted = true; } }
      items.push({ day: d, hk, sk, entry: sk === 'tasks' ? parseTaskLine(t) : { text: t } });
    }
  }
  if (!saw) return 'That doesn’t look like a report from this page';
  if (!items.length) return 'No entries found in that report';
  return apply(items, shifts, selDay, noDay);
}
export function importHtml(text: string, selDay: string) {
  const pre = new DOMParser().parseFromString(text, 'text/html').querySelector('pre');
  if (!pre) return 'No report found in that HTML. Use a file from Download Report.';
  return importReportText(pre.textContent || '', selDay);
}
// ---- .xlsx reader (no libraries) ----
async function inflateRaw(raw: Uint8Array) { const s = new Blob([raw]).stream().pipeThrough(new (window as any).DecompressionStream('deflate-raw')); return new Uint8Array(await new Response(s).arrayBuffer()); }
async function unzip(buf: ArrayBuffer) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf), out: Record<string, Uint8Array> = {}; let i = u8.length - 22;
  while (i >= 0 && dv.getUint32(i, true) !== 0x06054b50) i--; if (i < 0) throw new Error('not a zip');
  const n = dv.getUint16(i + 10, true); let p = dv.getUint32(i + 16, true); const dec = new TextDecoder();
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('bad zip');
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen)), start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true), raw = u8.subarray(start, start + csize);
    if (method === 0) out[name] = raw; else if (method === 8) out[name] = await inflateRaw(raw); else throw new Error('unsupported zip');
    p += 46 + nlen + elen + clen;
  }
  return out;
}
const xmlDec = (s: string) => s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const xmlAttr = (tag: string, name: string) => { const m = tag.match(new RegExp('\\s' + name + '="([^"]*)"')); return m ? xmlDec(m[1]) : ''; };
function xmlText(inner: string) { inner = inner.replace(/<rPh\b[\s\S]*?<\/rPh>/g, ''); let out = ''; const re = /<t\b[^>]*>([\s\S]*?)<\/t>/g; let m; while ((m = re.exec(inner))) out += xmlDec(m[1]); return out; }
export async function readXlsx(buf: ArrayBuffer): Promise<unknown[][]> {
  const files = await unzip(buf), dec = new TextDecoder(), g = (n: string) => (files[n] ? dec.decode(files[n]) : '');
  const sheets = (g('xl/workbook.xml').match(/<sheet\b[^>]*>/g) || []).map(t => ({ name: xmlAttr(t, 'name'), rid: xmlAttr(t, 'r:id') }));
  if (!sheets.length) throw new Error('no sheets'); const pick = sheets.find(x => x.name === 'Deals') || sheets[0];
  let target = ''; (g('xl/_rels/workbook.xml.rels').match(/<Relationship\b[^>]*>/g) || []).forEach(t => { if (xmlAttr(t, 'Id') === pick.rid) target = xmlAttr(t, 'Target'); });
  const sx = g(target.charAt(0) === '/' ? target.slice(1) : 'xl/' + target); if (!sx) throw new Error('sheet missing');
  const sst: string[] = []; const ss = g('xl/sharedStrings.xml'); if (ss) (ss.match(/<si\b[^>]*>[\s\S]*?<\/si>|<si\b[^>]*\/>/g) || []).forEach(si => sst.push(xmlText(si)));
  const rows: unknown[][] = [], re = /<c\b([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g; let m;
  while ((m = re.exec(sx))) {
    const attrs = ' ' + m[1], inner = m[3] || '', ref = xmlAttr(attrs, 'r'), t = xmlAttr(attrs, 't'), rm = ref.match(/^([A-Z]+)(\d+)$/); if (!rm) continue;
    let ci = 0; for (let q = 0; q < rm[1].length; q++) ci = ci * 26 + (rm[1].charCodeAt(q) - 64); ci--; const ri = +rm[2] - 1;
    const vm = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/), v = vm ? xmlDec(vm[1]) : ''; let val: unknown;
    if (t === 'inlineStr') val = xmlText(inner); else if (t === 's') val = sst[+v] ?? ''; else if (t === 'str' || t === 'e') val = v; else if (t === 'b') val = v === '1' ? 'TRUE' : 'FALSE'; else val = v === '' ? '' : isNaN(Number(v)) ? v : Number(v);
    (rows[ri] = rows[ri] || [])[ci] = val;
  }
  for (let r = 0; r < rows.length; r++) { rows[r] = rows[r] || []; for (let c = 0; c < rows[r].length; c++) if (rows[r][c] === undefined) rows[r][c] = ''; }
  return rows;
}
export async function importExcel(buf: ArrayBuffer, selDay: string, forceWon = false): Promise<string> {
  let rows: unknown[][]; try { rows = await readXlsx(buf); } catch { return 'Couldn’t read that file. Use an Excel file exported from this page.'; }
  let hi = -1, map: Record<string, number> = {};
  for (let r = 0; r < rows.length && hi < 0; r++) { const m: Record<string, number> = {}; (rows[r] || []).forEach((h, c) => { const k = headKey(h); if (k && !(k in m)) m[k] = c; }); if ('category' in m || 'deal' in m) { hi = r; map = m; } }
  if (hi < 0) return 'Couldn’t find a “Category” or “Deal Name” column in that file';
  const items: Item[] = [], shifts: Record<string, { a: string; b: string }> = {}; let skipped = 0, noDay = 0;
  for (let r = hi + 1; r < rows.length; r++) {
    const row = rows[r] || []; if (!row.some(v => cellStr(v) !== '')) continue;
    const g = (k: string) => (k in map ? row[map[k]] : '');
    const sk = 'category' in map ? normCat(g('category')) : 'tasks'; if (!sk) { skipped++; continue; }
    let day = 'day' in map ? normDay(g('day')) : ''; if (!day) { day = selDay; noDay++; }
    const f = { number: cleanLink(cellStr(g('number'))), deal: cleanText(cellStr(g('deal'))), notes: cleanText(cellStr(g('notes'))), stage: forceWon ? WON : normStage(cellStr(g('stage'))), plan: normPlan(cellStr(g('plan'))), billing: '', price: cellStr(g('price')), mvr: cellStr(g('mvr')), regs: cellStr(g('regs')), details: cleanText(cellStr(g('details'))) };
    if (f.stage === WON && (f.plan === 'Starter' || f.plan === 'Professional')) f.billing = normCycle(cellStr(g('billing'))) || cycleOf({ plan: cellStr(g('plan')) });
    if (f.stage !== WON) { f.plan = ''; f.billing = ''; f.price = ''; f.mvr = ''; f.regs = ''; }
    let entry: Partial<Entry>;
    if (sk === 'tasks' && (f.number || f.deal || f.notes || f.stage)) {
      entry = { number: f.number, deal: f.deal, notes: f.notes, stage: f.stage, plan: f.plan, billing: f.billing, price: f.price };
      if (f.mvr) entry.mvr = f.mvr; if (parseInt(f.regs, 10) > 0 && hasRegs(f.plan)) entry.regs = String(parseInt(f.regs, 10));
      const pz = inferPricing(entry); if (pz) entry.pricing = pz;
    } else {
      const t = f.details || joinFields(sk, { number: f.deal, reason: f.notes, sender: f.deal, inquiry: f.notes, type: '', desc: f.notes, note: f.notes }) || (sk === 'tasks' ? [f.deal, f.notes].filter(Boolean).join(', ') : '');
      if (!t) { skipped++; continue; } entry = { text: t };
    }
    const hk = normHour(g('hour'));
    if (!shifts[day]) { const a = normHour(g('shiftstart')), b = normHour(g('shiftend')); if (a && b) shifts[day] = { a, b }; }
    items.push({ day, hk, sk, entry });
  }
  return apply(items, shifts, selDay, noDay, skipped);
}
export async function importFile(f: File, selDay: string): Promise<string> {
  const n = (f.name || '').toLowerCase();
  if (/\.xlsx$/.test(n) || /spreadsheetml/.test(f.type || '')) return importExcel(await f.arrayBuffer(), selDay);
  let text: string; try { text = await f.text(); } catch { return 'Couldn’t read that file'; }
  if (/\.html?$/.test(n) || /^\s*<(!doctype|html)/i.test(text)) return importHtml(text, selDay);
  return importReportText(text, selDay);
}
export const _k = [SECTION_KEYS, get];

/** Won Deals: the Deals Report text (day or Monthly / Yearly / All days) → Day End "Closed Won All" entries. */
export function importDealsReportText(text: string, selDay: string): string {
  const items: Item[] = []; let day = '', cur: Partial<Entry> | null = null, saw = false, noDay = 0;
  const push = () => { if (cur && (cur.deal || cur.notes)) { const d = (cur as any)._day || day || selDay; if (!(cur as any)._day && !day) noDay++; delete (cur as any)._day; const pz = inferPricing(cur); if (pz) cur.pricing = pz; items.push({ day: d, hk: '', sk: 'tasks', entry: cur }); } cur = null; };
  for (const line of String(text).replace(/\r/g, '').split('\n')) {
    let m: RegExpMatchArray | null;
    if (/^─{5,}/.test(line)) { push(); break; }
    if ((m = line.match(/^Deals Report\s+—\s+(.*)$/))) { saw = true; day = dayFromText(m[1]); continue; }
    if ((m = line.match(/^—\s+(.*?)\s+\(\d+\)$/))) { push(); day = dayFromText(m[1]); continue; }
    if ((m = line.match(/^\d+\.\s+(.*)$/))) { push(); cur = { deal: m[1].trim(), notes: '', number: '', stage: WON, plan: '', billing: '', price: '' }; continue; }
    if (!cur || !(m = line.match(/^\s*•\s+(Day|Link|Plan|Notes|Price|Registers):\s*(.*)$/))) continue;
    const v = m[2].trim();
    if (m[1] === 'Day') (cur as any)._day = dayFromText(v);
    else if (m[1] === 'Link') cur.number = cleanLink(v);
    else if (m[1] === 'Notes') cur.notes = v;
    else if (m[1] === 'Plan') { const pm = v.match(/^(.*?)(?: \((Monthly|Biannual|Annual)\))?$/)!; cur.plan = normPlan(pm[1]); cur.billing = pm[2] || ''; }
    else if (m[1] === 'Price') { const sp = splitPriceText(v); cur.price = sp.price; if (sp.mvr) cur.mvr = sp.mvr; }
    else if (m[1] === 'Registers') { const n = (v.match(/\d+/) || [''])[0]; if (n) cur.regs = n; }
  }
  push();
  if (!saw) return 'That doesn’t look like a Deals Report';
  if (!items.length) return 'No deals found in that report';
  return apply(items, {}, selDay, noDay);
}
export async function importDealsFile(f: File, selDay: string): Promise<string> {
  const n = (f.name || '').toLowerCase();
  if (/\.xlsx$/.test(n) || /spreadsheetml/.test(f.type || '')) return importExcel(await f.arrayBuffer(), selDay, true);
  let text: string; try { text = await f.text(); } catch { return 'Couldn’t read that file'; }
  if (/\.html?$/.test(n) || /^\s*<(!doctype|html)/i.test(text)) { const pre = new DOMParser().parseFromString(text, 'text/html').querySelector('pre'); if (!pre) return 'No report found in that HTML. Use a file from Download Report.'; text = pre.textContent || ''; }
  return importDealsReportText(text, selDay);
}
