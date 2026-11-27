// Deals, Won Deals, Lost Deals, Tickets, Tasks and message tasks – all built from one data layer.
import { all, get, put, del, rev } from '../data/store';
import { linkKey, sameLink, isLink, cleanLink } from '../lib/privacy';
import { addMonths, keyOf, parseKey, parsePrice, slug, todayKey, uid, addDays } from '../lib/util';
import { DEAL_STAGES, Entry, LOST, WON, entriesOf, allEntryDays, normStage, entryText, mkOf, tkOf, cycleOf } from './dayend';

function memo<T>(f: () => T): () => T { let r = -1, v: T; return () => { if (r !== rev.value) { r = rev.value; v = f(); } return v; }; }
const allTasksEntries = memo(() => { const out: Entry[] = []; allEntryDays().forEach(k => entriesOf(k).forEach(e => { if (e.sk === 'tasks') out.push(e); })); return out; });
const tsOf = (e: Entry) => e.at || (Date.parse(e.day + 'T' + e.hk + ':00') || 0) + (e.ord % 1000);

// =============== Won Deals: the first Closed Won All is the deal, later entries go into its note history ===============
export interface WonDeal { id: string; day: string; hk: string; ts: number; number: string; deal: string; notes: string; plan: string; billing: string; price: string; mvr?: string; regs?: string; pricing?: string; status: string; history: { tid: string; day: string; hk: string; ts: number; stage: string; deal: string; notes: string; won: boolean; plan?: string; price?: string }[]; entry: Entry }
const isWon = (e: Entry) => { const l = String(e.stage || '').toLowerCase().replace(/[^a-z]/g, ''); return l === 'closedwonall' || l === 'closedwon' || l === 'won'; };
const nmKey = (s: unknown) => { const k = String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, ''); return k.length >= 2 ? k : ''; };
export const wonDeals = memo((): WonDeal[] => {
  type G = { head: Entry; ln: Set<string>; nm: Set<string>; items: { e: Entry; won: boolean }[] };
  const groups: G[] = [], byId = new Map<string, G>();
  const list = allTasksEntries().filter(e => e.text == null);
  list.forEach(e => {
    const won = isWon(e), lk = e.number && isLink(e.number) ? linkKey(e.number) : '', nm = nmKey(e.deal);
    let g: G | undefined;
    if (e.noMerge) { if (!won) return; }
    else {
      if (won && e.mergeInto) g = byId.get(e.mergeInto);
      if (!g) g = groups.find(x => (nm && x.nm.has(nm)) || (lk && x.ln.has(lk) && (!nm || !x.nm.size)));
    }
    if (g) { g.items.push({ e, won }); if (won) { if (lk) g.ln.add(lk); if (nm) g.nm.add(nm); } byId.set(e.id, g); }
    else if (won) { g = { head: e, ln: new Set(lk ? [lk] : []), nm: new Set(nm ? [nm] : []), items: [] }; groups.push(g); byId.set(e.id, g); }
  });
  return groups.map(g => {
    const t = g.head; let status = WON;
    const history = g.items.map(({ e, won }) => { const st = normStage(e.stage) || String(e.stage || ''); if (st) status = st; return { tid: e.id, day: e.day, hk: e.hk, ts: tsOf(e), stage: st, deal: e.deal || '', notes: e.notes || '', won, plan: e.plan, price: e.price }; });
    return { id: t.id, day: t.day, hk: t.hk, ts: tsOf(t), number: t.number || '', deal: t.deal || '', notes: t.notes || '', plan: t.plan || '', billing: t.billing || '', price: t.price || '', mvr: t.mvr, regs: t.regs, pricing: t.pricing, status, history, entry: t };
  });
});

// =============== Deals board ===============
export interface Pipeline { id: string; name: string; stages: string[]; fixed?: boolean }
export interface Deal { key: string; src: 'day' | 'manual'; name: string; links: string[]; entries: Entry[]; stage: string; plan: string; billing: string; price: string; mvr: string; regs: string; ts: number; first: number; pipeline: string; tags: string[]; follow: string; notes: { id: string; ts: number; text: string }[]; meta: Record<string, any>; rx: { wa?: string; mail?: string } }
export function pipelines(): Pipeline[] { const c = get<{ list?: Pipeline[] }>('cfg', 'pipelines'); return [{ id: 'sales', name: 'Sales', stages: DEAL_STAGES, fixed: true }, ...((c && c.list) || [])]; }
export function savePipelines(list: Pipeline[]) { put('cfg', 'pipelines', { list: list.filter(p => !p.fixed) }); }
export const dealKeyOf = (name: string, link: string) => { const n = slug(name); if (n.length >= 2) return 'n-' + n; const l = link ? linkKey(link) : ''; return l ? 'l-' + slug(l) : ''; };
export const deals = memo((): Deal[] => {
  const map = new Map<string, Deal>(), byLink = new Map<string, Deal>();
  allTasksEntries().forEach(e => {
    const name = String(e.deal || '').trim() || (e.text != null ? '' : ''); const lk = e.number && isLink(e.number) ? linkKey(e.number) : '';
    if (!name && !lk) return;
    let d = (lk && byLink.get(lk)) || map.get(dealKeyOf(name, e.number || ''));
    if (!d) {
      const key = dealKeyOf(name, e.number || ''); if (!key) return;
      d = { key, src: 'day', name: name || 'Deal', links: [], entries: [], stage: '', plan: '', billing: '', price: '', mvr: '', regs: '', ts: 0, first: 0, pipeline: 'sales', tags: [], follow: '', notes: [], meta: {}, rx: {} };
      map.set(key, d);
    }
    if (lk) { byLink.set(lk, d); if (!d.links.some(x => sameLink(x, e.number))) d.links.push(cleanLink(e.number)); }
    if (name) map.set(dealKeyOf(name, ''), d);
    d.entries.push(e); const ts = tsOf(e), st = normStage(e.stage);
    if (!d.first || ts < d.first) d.first = ts;
    if (ts >= d.ts) { d.ts = ts; if (st) d.stage = st; if (e.plan) { d.plan = e.plan; d.billing = e.billing || ''; d.price = e.price || ''; d.mvr = e.mvr || ''; d.regs = e.regs || ''; } }
  });
  const list = Array.from(new Set(map.values()));
  all<any>('deals').forEach(m => list.push({ key: m.id, src: 'manual', name: m.name || 'Deal', links: m.link ? [m.link] : [], entries: [], stage: m.stage || 'Lead', plan: m.plan || '', billing: m.billing || '', price: m.price || '', mvr: m.mvr || '', regs: m.regs || '', ts: m.ts || 0, first: m.ts || 0, pipeline: m.pipeline || 'sales', tags: [], follow: '', notes: [], meta: {}, rx: {} }));
  const notes = all<{ deal: string; ts: number; text: string }>('dealnotes');
  list.forEach(d => {
    const m = get<any>('dealmeta', d.key) || {}; d.meta = m; d.tags = m.tags || []; d.follow = m.follow || ''; d.rx = m.rx || {};
    if (m.stage && (m.placeTs || 0) >= d.ts) d.stage = m.stage;
    if (m.pipeline) d.pipeline = m.pipeline;
    if (m.name) d.name = m.name;
    d.notes = notes.filter(n => n.deal === d.key).sort((a, b) => a.ts - b.ts);
    if (!d.stage) d.stage = 'Lead';
  });
  return list.filter(d => !(d.meta && d.meta.hidden)).sort((a, b) => b.ts - a.ts);
});
export function moveDeal(d: Deal, stage: string, pipeline?: string) {
  if (d.src === 'manual') put('deals', d.key, { stage, ...(pipeline ? { pipeline } : {}) });
  else put('dealmeta', d.key, { stage, placeTs: Date.now(), ...(pipeline ? { pipeline } : {}) });
}
export function addDealNote(key: string, text: string) { put('dealnotes', uid('n'), { deal: key, ts: Date.now(), text }); }
export function dealOfEntry(e: Partial<Entry>) { const k = dealKeyOf(String(e.deal || ''), String(e.number || '')); return deals().find(d => d.key === k || (e.number && d.links.some(l => sameLink(l, e.number)))); }
/** "Use last details": the latest link + stage for a deal name (or link). */
export function lastDetails(q: string) {
  const n = slug(q); if (n.length < 2) return null;
  const d = deals().find(x => slug(x.name) === n) || deals().find(x => slug(x.name).indexOf(n) === 0);
  if (!d) return null; return { name: d.name, link: d.links[0] || '', stage: d.stage, plan: d.plan, billing: d.billing, price: d.price, seen: d.entries.length, last: d.ts };
}

// =============== Lost Deals (+ Churn) ===============
export interface Lost { id: string; src: 'day' | 'manual'; kind: 'lost' | 'churn'; day: string; ts: number; number: string; deal: string; notes: string; plan: string; billing: string; price: string; mvr: string; regs: string; reason: string; value: string; entry?: Entry }
export const DEF_REASONS = ['Price too high', 'Chose a competitor', 'No response', 'Not ready yet', 'Missing feature', 'Business closed', 'Other'];
export const lostReasons = () => (get<{ list?: string[] }>('cfg', 'lost')?.list || DEF_REASONS);
export const lostDeals = memo((): Lost[] => {
  const out: Lost[] = [];
  allTasksEntries().forEach(e => {
    const s = String(e.stage || '').toLowerCase().replace(/[^a-z]/g, ''); const kind = s === 'closedlostall' || s === 'closedlost' || s === 'lost' ? 'lost' : s === 'churn' ? 'churn' : '';
    if (!kind) return; const m = get<any>('lostmeta', e.id) || {};
    out.push({ id: e.id, src: 'day', kind, day: e.day, ts: tsOf(e), number: e.number || '', deal: e.deal || '', notes: e.notes || '', plan: m.plan ?? e.plan ?? '', billing: m.billing ?? e.billing ?? '', price: m.price ?? e.price ?? '', mvr: m.mvr ?? e.mvr ?? '', regs: m.regs ?? e.regs ?? '', reason: m.reason || '', value: m.value || '', entry: e });
  });
  all<any>('lost').forEach(m => out.push({ id: m.id, src: 'manual', kind: m.kind === 'churn' ? 'churn' : 'lost', day: m.day || todayKey(), ts: Date.parse((m.day || todayKey()) + 'T12:00:00') || 0, number: m.number || '', deal: m.deal || '', notes: m.notes || '', plan: m.plan || '', billing: m.billing || '', price: m.price || '', mvr: m.mvr || '', regs: m.regs || '', reason: m.reason || '', value: m.value || '' }));
  return out.sort((a, b) => b.ts - a.ts);
});
export function lostValue(l: Lost) { const v = parsePrice(l.value); return isNaN(v) ? (parsePrice(l.price) || 0) : v; }

// =============== Renewals (Won Deals revenue) ===============
export function renewalOf(w: WonDeal) {
  const b = get<any>('billing', w.id) || {}; const cyc = cycleOf(w); const months = cyc === 'Annual' ? 12 : cyc === 'Biannual' ? 6 : cyc === 'Monthly' ? 1 : 0;
  const act = b.activation || w.day; let due = b.due || (months ? addMonths(act, months) : '');
  if (b.renewed && months && !b.due) { due = addMonths(b.renewed, months); }
  const price = parsePrice(w.price); const mrr = !isNaN(price) && months ? price / months : 0;
  return { activation: act, due, months, mrr, renewed: b.renewed || '' };
}
export function markRenewed(w: WonDeal) { const r = renewalOf(w); put('billing', w.id, { renewed: r.due || todayKey(), due: r.months ? addMonths(r.due || todayKey(), r.months) : '' }); }

// =============== Tickets ===============
export interface TType { id: string; name: string; subs: string[]; rules: string[]; defSub: string }
export interface TPipe { id: string; name: string; stages: { id: string; name: string; closed?: boolean }[] }
export interface Ticket { id: string; no?: string | number; pipeline: string; stage: string; subject: string; desc: string; deal: string; priority: string; category: string; source: string; created: number; updated: number; due: string; closed: number | null; resolution: string; notes: { ts: number; text: string }[]; history: { ts: number; from: string; to: string }[]; tt: { t: string; s: string }[]; auto?: boolean; dayKey?: string }
const DEF_TYPES: [string, string][] = [['Demo', 'demo'], ['Support', 'support'], ['Product List', 'product list, product-list, items list, menu upload'], ['Setup', 'setup, set up, set-up, install'], ['Hardware Delivery', 'delivery, deliver, hardware'], ['Printer Setup', 'printer setup, printer set up, printer'], ['Training', 'training, train']];
export const DEF_SUBS = ['Online', 'Physical', 'AnyDesk'];
const tyId = (n: string) => 'ty-' + String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function ticketCfg() {
  const c = get<any>('cfg', 'tickets') || {};
  return {
    types: (c.types as TType[]) || DEF_TYPES.map(x => ({ id: tyId(x[0]), name: x[0], subs: DEF_SUBS.slice(), rules: x[1].split(/\s*,\s*/), defSub: 'Physical' })),
    pipelines: (c.pipelines as TPipe[]) || [{ id: 'p1', name: 'Support', stages: [{ id: 's1', name: 'Pending' }, { id: 's2', name: 'Waiting on us' }, { id: 's3', name: 'Waiting on contact' }, { id: 's4', name: 'Closed all', closed: true }] }],
    cats: (c.cats as string[]) || ['Billing', 'Setup', 'Training', 'Bug', 'Hardware', 'Feature request', 'Other'],
    pris: (c.pris as string[]) || ['Low', 'Medium', 'High', 'Urgent'],
  };
}
export function saveTicketCfg(p: Partial<ReturnType<typeof ticketCfg>>) { put('cfg', 'tickets', p); }
const SUBHINT: [string, RegExp][] = [['AnyDesk', /any\s*desk/i], ['Online', /\b(online|remote|zoom|teams|google meet|meet link|video call)\b/i], ['Physical', /\b(physical|on-?site|in person|in-person|visit|walk-?in)\b/i]];
function subFor(ty: TType, text: string) { for (const h of SUBHINT) if (h[1].test(text) && ty.subs.indexOf(h[0]) >= 0) return h[0]; return ty.subs.indexOf(ty.defSub) >= 0 ? ty.defSub : ty.subs[0] || ''; }
export function classify(text: string, cat = '', noFallback = false): { t: string; s: string }[] {
  const types = ticketCfg().types; text = String(text || '').toLowerCase();
  let hits: { ty: TType; ph: string }[] = [];
  types.forEach(ty => { let best = ''; (ty.rules || []).forEach(ph => { ph = String(ph).trim().toLowerCase(); if (ph && text.indexOf(ph) >= 0 && ph.length > best.length) best = ph; }); if (!best && text.indexOf(ty.name.toLowerCase()) >= 0) best = ty.name.toLowerCase(); if (best) hits.push({ ty, ph: best }); });
  hits = hits.filter(a => !hits.some(b => b !== a && b.ph.length > a.ph.length && b.ph.indexOf(a.ph) >= 0));
  let out = hits.map(h => ({ t: h.ty.id, s: subFor(h.ty, text) }));
  if (!out.length && !noFallback && types.length) { const map: Record<string, string> = { setup: 'Setup', training: 'Training', hardware: 'Hardware Delivery' }; const nm = map[cat.toLowerCase()] || 'Support'; const ty = types.find(x => x.name === nm) || types[0]; out = [{ t: ty.id, s: subFor(ty, text) }]; }
  return out;
}
export const tickets = memo((): Ticket[] => {
  const cfg = ticketCfg(), p = cfg.pipelines[0], closed = p.stages.find(s => s.closed) || p.stages[p.stages.length - 1];
  const stored = new Map<string, Ticket>(); all<Ticket>('tickets').forEach(t => stored.set(t.id, t));
  const hidden = new Set((get<any>('cfg', 'ticketsHidden')?.ids as string[]) || []);
  const out: Ticket[] = [];
  allEntryDays().forEach(k => { let n = 0; entriesOf(k).forEach(e => {
    if (e.sk !== 'tickets') return; const text = entryText(e).trim(); if (!text) return; n++;
    const id = 'de-' + e.id; if (stored.has(id) || hidden.has(id)) return;
    const m = text.match(/^\[\[([^\]]+)\]\s*([^\]]*)\]\s*([\s\S]*)$/); let subj: string, body = text, deal = '';
    if (m) { subj = '[' + m[1] + '] ' + m[2]; body = m[3]; deal = m[2]; } else subj = text.split(/[.\n]/)[0].slice(0, 70);
    const ts = e.at || Date.parse(k + 'T' + e.hk + ':00') || Date.now();
    out.push({ id, no: 'D' + k.replace(/-/g, '').slice(2) + '-' + n, pipeline: p.id, stage: closed.id, subject: subj.trim().slice(0, 90), desc: body, deal: deal.trim(), priority: cfg.pris[1] || cfg.pris[0], category: '', source: 'Day End', due: '', created: ts, updated: ts, closed: ts, resolution: 'Logged in Day End', notes: [], history: [], tt: classify([subj, body].join(' ')), auto: true, dayKey: k });
  }); });
  stored.forEach(t => out.push({ ...t, notes: t.notes || [], history: t.history || [], tt: Array.isArray(t.tt) && t.tt.length ? t.tt : classify([t.subject, t.desc, t.deal].join(' '), t.category || '') }));
  return out.sort((a, b) => b.updated - a.updated);
});
export function saveTicket(t: Partial<Ticket> & { id?: string }) {
  const id = t.id || uid('t'); const prev = tickets().find(x => x.id === id);
  const base = prev && prev.auto ? { ...prev, auto: undefined } : {};
  put('tickets', id, { ...base, ...t, id: undefined, updated: Date.now(), created: (prev && prev.created) || t.created || Date.now() });
  return id;
}
export function ticketStageName(t: Ticket) { const p = ticketCfg().pipelines.find(x => x.id === t.pipeline) || ticketCfg().pipelines[0]; return p.stages.find(s => s.id === t.stage)?.name || ''; }
export function isClosedT(t: Ticket) { const p = ticketCfg().pipelines.find(x => x.id === t.pipeline) || ticketCfg().pipelines[0]; return !!p.stages.find(s => s.id === t.stage)?.closed; }
export function removeTicket(t: Ticket) { if (t.auto) { const h = (get<any>('cfg', 'ticketsHidden')?.ids as string[]) || []; put('cfg', 'ticketsHidden', { ids: [...h, t.id] }); } else del('tickets', t.id); }

// =============== Tasks + folders + message tasks ===============
export interface Task { id: string; title: string; notes: string; due: string; time: string; priority: string; done: boolean; doneAt?: number; created: number; folder?: string; remind?: number | null; auto?: boolean; deal?: string; msg?: { ch: string; day: string; deal: string; entry: string } }
export interface Folder { id: string; name: string; color?: string; icon?: string }
export const MSG_FOLDERS: Folder[] = [{ id: 'cf_msg_wa', name: 'WhatsApp Today' }, { id: 'cf_msg_em', name: 'Email Today' }, { id: 'cf_msg_nwa', name: 'WhatsApp – unable' }, { id: 'cf_msg_nem', name: 'Email – unable' }];
export function folders(): Folder[] { const c = get<{ list?: Folder[] }>('cfg', 'folders'); return [{ id: '', name: 'Follow-ups' }, ...MSG_FOLDERS, ...((c && c.list) || [])]; }
export function msgCfg() { return { on: true, start: '2026-11-23', ...(get<any>('cfg', 'msgauto') || {}) } as { on: boolean; start: string }; }
const UN_WA = /\b(?:unable|can.?t|cannot|could ?n.?t|couldn.?t|failed|fail(?:ed)? to|not able)\b[^.\n]{0,40}\bwhats ?app|\bwhats ?app\b[^.\n]{0,40}\b(?:unable|failed|not (?:available|working|installed|registered)|no account|blocked)\b|\b(?:not|isn.?t|no)\s+(?:on|in|using|have|has)\s+whats ?app\b|\bno whats ?app\b/i;
const UN_EM = /\b(?:unable|can.?t|cannot|could ?n.?t|couldn.?t|failed|fail(?:ed)? to|not able|no way)\b[^.\n]{0,40}\be-?mail|\be-?mail\b[^.\n]{0,40}\b(?:bounc\w*|invalid|wrong|not working|unable|failed|undeliverable|doesn.?t exist|does not exist|rejected)\b|\bno e-?mail\b/i;
const TO_WA = /\b(?:to|will|need to|needs to|must|should|going to|gonna|have to|has to|remember to|plan to)\s+(?:send\s+)?(?:(?:a|an|the)\s+)?(?:\w+\s+)?whats ?app\b|\bwhats ?app\s+(?:later|today|tomorrow|him|her|them|back|again)\b|\bsend\s+(?:it\s+)?(?:on\s+|via\s+|through\s+)?whats ?app\b/i;
const TO_EM = /\b(?:to|will|need to|needs to|must|should|going to|gonna|have to|has to|remember to|plan to)\s+(?:send\s+)?(?:(?:a|an|the)\s+)?(?:\w+\s+)?e-?mail\b|\be-?mail\s+(?:later|today|tomorrow|him|her|them|back|again)\b|\bsend\s+(?:it\s+|an?\s+)?(?:by\s+|via\s+)?e-?mail\b/i;
/** Message tasks: one per deal, per channel, per day, from Day End entries (WhatsApp/Email marks or wording). */
export const msgTasks = memo((): Task[] => {
  const c = msgCfg(); if (!c.on) return [];
  const map = new Map<string, Task>();
  allEntryDays().forEach(k => { if (k < c.start) return; entriesOf(k).forEach(e => {
    if (e.sk !== 'tasks' || e.text != null) return; const name = String(e.deal || '').trim(); if (!name) return;
    const tx = entryText(e);
    (['wa', 'em'] as const).forEach(ch => {
      const mk = mkOf(e, ch), tk = tkOf(e, ch);
      const unable = mk === 'r' || tk === 'n' || (ch === 'wa' ? UN_WA : UN_EM).test(tx);
      const want = unable || mk === 'g' || tk === 'y' || (ch === 'wa' ? TO_WA : TO_EM).test(tx);
      if (!want) return;
      const folder = unable ? (ch === 'wa' ? 'cf_msg_nwa' : 'cf_msg_nem') : (ch === 'wa' ? 'cf_msg_wa' : 'cf_msg_em');
      const id = 'm-' + ch + '-' + k + '-' + slug(name);
      const prev = map.get(id); const done = tk === 'y' || (!!prev && prev.done);
      map.set(id, { id, title: (ch === 'wa' ? 'WhatsApp ' : 'Email ') + name, notes: tx, due: k, time: '', priority: 'normal', done, created: e.at || Date.parse(k + 'T' + e.hk + ':00') || 0, folder, auto: true, deal: name, msg: { ch: unable ? 'n' + ch : ch, day: k, deal: name, entry: e.id } });
    });
  }); });
  const over = new Map(all<Task>('tasks').map(t => [t.id, t]));
  return Array.from(map.values()).map(t => { const o = over.get(t.id); return o ? { ...t, done: o.done ?? t.done, doneAt: o.doneAt, folder: o.folder || t.folder } : t; });
});
export const allTasks = memo((): Task[] => {
  const msg = msgTasks(), ids = new Set(msg.map(t => t.id));
  return [...all<Task>('tasks').filter(t => !ids.has(t.id) && !(t.id.indexOf('m-') === 0)).map(t => ({ ...t, notes: t.notes || '', due: t.due || '', time: t.time || '', priority: t.priority || 'normal', done: !!t.done, created: t.created || 0, title: t.title || '(no title)' })), ...msg];
});
export function setTaskDone(t: Task, done: boolean) {
  put('tasks', t.id, t.msg ? { done, doneAt: done ? Date.now() : undefined } : { done, doneAt: done ? Date.now() : undefined });
  if (t.msg && done) { const e = get<Entry>('entries', t.msg.entry); if (e) { const ch = t.msg.ch.replace(/^n/, '') as 'wa' | 'em'; if (t.msg.ch === ch && tkOf(e as Entry, ch) !== 'y') put('entries', e.id, { tk: { ...(e.tk || {}), [ch]: 'y' } }); } }
}
export function saveTask(t: Partial<Task>) { const id = t.id || uid('k'); put('tasks', id, { created: Date.now(), done: false, priority: 'normal', ...t, id: undefined }); return id; }
export function removeTask(id: string) { del('tasks', id); }
export function bestHours(name?: string): number[] {   // hours (0-23) when entries were logged, most first
  const cnt: Record<number, number> = {};
  allTasksEntries().forEach(e => { if (name && slug(e.deal || '') !== slug(name)) return; if (/no answer|did not pick|didn.?t pick|no response|unreachable/i.test(e.notes || '')) return; const h = e.at ? new Date(e.at).getHours() : parseInt(e.hk, 10); cnt[h] = (cnt[h] || 0) + 1; });
  return Object.keys(cnt).map(Number).sort((a, b) => cnt[b] - cnt[a]);
}
export const dayOfTs = (ms: number) => keyOf(new Date(ms));
export { parseKey, addDays, WON, LOST };
