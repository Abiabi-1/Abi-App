// One-time (and on request) import of the old app's saved data. Ids are deterministic, so the same old data on two
// devices becomes the same records (no duplicates). Values get the oldest timestamp, so real edits always win.
// Records already migrated but changed in the old app since then are updated (re-import), detected by a content hash.
import { putLegacy, get, put, all } from './store';
import { hash, isKey, lsGet, lsSet, slug, keyOf } from '../lib/util';
import { linkKey, isLink } from '../lib/privacy';
import type { SK } from '../domain/dayend';
import { importSmartLegacy } from '../features/smart';
import { importSnippetsLegacy } from '../features/snippets';

export const LEGACY_KEYS = ['dayEndReport_v6', 'dealsTracker_v1', 'crm_v1', 'followTasks_v1', 'lostDeals_v1', 'tickets_v1', 'smartText_v1', 'deals_v1', 'tools_v1', 'hub_order_v1', 'hub_order_side_v1', 'hub_tools_hidden_v1', 'hub_snippets_v1', 'billing_v1', 'rules_v1', 'dash_v1', 'links_v1', 'hub_hr_v1', 'hub_owners', 'hub_views', 'hub_templates', 'hub_lists', 'hub_goals', 'hub_hr_files', 'hub_calls_v1', 'hub_sortmode_v1', 'hub_goals_v1', 'hub_recur_v1', 'hub_etpl_v1', 'hub_chips_v1', 'hub_runlog_v1', 'hub_bday_v1', 'hub_greet_v1', 'hub_obj_v1', 'hub_invoices_v1', 'hub_dtile_v1', 'hub_shortcuts_v1', 'hub_nodup_v1', 'hub_auto2_v1', 'hub_msgauto_v1', 'hub_flows_v1', 'hub_feat_v1', 'hub_qa_cfg_v1', 'hub_tools_cfg_v1', 'hub_priv_v1'];
const HANDLED = new Set(['smartText_v1', 'hub_snippets_v1', 'dayEndReport_v6', 'dealsTracker_v1', 'deals_v1', 'lostDeals_v1', 'tickets_v1', 'followTasks_v1', 'hub_hr_v1', 'billing_v1', 'hub_msgauto_v1', 'crm_v1']);
const SECS: SK[] = ['tasks', 'calls', 'whatsapp', 'tickets', 'other'];

export interface Report { at: number; source: string; counts: Record<string, number>; added: number; updated: number; legacy: number }
type Src = Record<string, string | null>;
const J = (s: string | null | undefined, d: any = null) => { try { const v = JSON.parse(s || 'null'); return v == null ? d : v; } catch { return d; } };

/** write one migrated record: new → legacy stamp; already there but the old copy changed since the last import → update now. */
let added = 0, updated = 0;
function mig(c: string, id: string, d: Record<string, any>) {
  const h = hash(JSON.stringify(d)), cur = get<any>(c, id);
  if (!cur) { if (putLegacy(c, id, { ...d, _src: h })) added++; return; }
  if (cur._src && cur._src !== h) {   // changed in the old app after the last import
    const prev = get<any>('_migsrc', c + ':' + id); const prevD = prev ? J(prev.d, {}) : {};
    const patch: Record<string, any> = { _src: h };
    Object.keys(d).forEach(f => { if (JSON.stringify(d[f]) !== JSON.stringify(prevD[f])) patch[f] = d[f]; });
    put(c, id, patch); updated++;
  }
  put('_migsrc', c + ':' + id, { d: JSON.stringify(d) }, { quiet: true });
}
function legacyDealKey(link: string, name: string) { return String(link || '').replace(/\D/g, '').slice(-9) + '|' + String(name || '').trim().toLowerCase(); }

export function runMigration(src: Src, source: string): Report {
  added = 0; updated = 0; const counts: Record<string, number> = {};
  const inc = (k: string, n = 1) => { counts[k] = (counts[k] || 0) + n; };

  // ---- Day End ----
  let days = (J(src.dayEndReport_v6, {}) || {}).days || {};
  if (!src.dayEndReport_v6 && src.dayEndReport_v5) { const p = J(src.dayEndReport_v5); if (p && isKey(p.date)) days = { [p.date]: p }; }
  const taskIds = new Set<string>(), entryLinks: { link: string; name: string; id: string }[] = [];
  Object.keys(days).forEach(k => {
    if (!isKey(k)) return; const d = days[k] || {};
    const ok = (t: unknown, f: string) => (typeof t === 'string' && /^\d\d:\d\d$/.test(t) ? t : f);
    mig('days', k, { shiftStart: ok(d.shiftStart, '09:00'), shiftEnd: ok(d.shiftEnd, '17:00') }); inc('days');
    const hs = d.hours || {};
    Object.keys(hs).forEach(hk => {
      const slot = hs[hk] || {};
      SECS.forEach(sk => {
        (Array.isArray(slot[sk]) ? slot[sk] : []).forEach((e: any, i: number) => {
          if (!(typeof e === 'string' || (e && typeof e === 'object'))) return;
          const at = (e && typeof e === 'object' && e.at) || (slot.at && slot.at[sk] && slot.at[sk][i]) || 0;
          const base = { day: k, hk, sk, ord: i };
          let rec: Record<string, any>, id: string;
          if (typeof e === 'string') { rec = { ...base, text: e }; id = 'x' + hash(k + '|' + hk + '|' + sk + '|' + i + '|' + e); }
          else {
            const { phones, email, id: eid, ts, ...rest } = e; void phones; void email; void ts;
            rec = { ...base, ...rest }; id = eid ? String(eid) : 'x' + hash(k + '|' + hk + '|' + sk + '|' + i + '|' + JSON.stringify(rest));
            if (sk === 'tasks') { taskIds.add(id); if (rest.number || rest.deal) entryLinks.push({ link: rest.number || '', name: rest.deal || '', id }); }
          }
          if (at) rec.at = at;
          mig('entries', id, rec); inc('entries');
        });
      });
    });
  });

  // ---- Won Deals list: deals with no Day End entry become Day End Closed Won entries (as the old app did) ----
  const wd = J(src.dealsTracker_v1, []);
  if (Array.isArray(wd)) wd.forEach((d: any) => {
    if (!d || !d.id || taskIds.has(String(d.id))) return;
    const day = isKey(d.day) ? d.day : keyOf(new Date(d.ts || Date.now()));
    const hk = isKey(d.day) && d.hk ? d.hk : (get<any>('days', day)?.shiftStart || '09:00');
    const rec: Record<string, any> = { day, hk, sk: 'tasks', ord: 900, number: d.number || '', deal: d.deal || '', notes: d.notes || '', stage: 'Closed Won All', plan: d.plan || '', billing: d.billing || '', price: d.price || '' };
    ['mvr', 'regs', 'pricing'].forEach(f => { if (d[f]) rec[f] = d[f]; }); if (d.ts) rec.at = d.ts;
    mig('entries', String(d.id), rec); inc('wonOnly');
  });

  // ---- Deals pipeline ----
  const D = J(src.deals_v1, {}) || {};
  (D.manual || []).forEach((m: any) => { if (!m || !m.id) return; const { number, email, phones, ...r } = m; void email; void phones; mig('deals', String(m.id), { ...r, link: isLink(number) ? number : '' }); inc('deals'); });
  if (Array.isArray(D.pipelines) && D.pipelines.length) mig('cfg', 'pipelines', { list: D.pipelines.map((p: any) => ({ id: p.id, name: p.name, stages: (p.stages || []).map((s: any) => (typeof s === 'string' ? s : s.name)) })) });
  // legacy deal keys → new deal keys (placement, notes, tags)
  const keyMap = new Map<string, string>();
  entryLinks.forEach(x => { const nk = newDealKey(x.name, x.link); if (nk) keyMap.set(legacyDealKey(x.link, x.name), nk); });
  (D.manual || []).forEach((m: any) => m && m.id && keyMap.set(String(m.id), String(m.id)));
  const metaOut = new Map<string, Record<string, any>>();
  const mo = (nk: string) => { let o = metaOut.get(nk); if (!o) { o = {}; metaOut.set(nk, o); } return o; };
  const isManual = (lk: string) => (D.manual || []).some((m: any) => m && m.id === lk);
  Object.keys(D.place || {}).forEach(lk => { const nk = keyMap.get(lk); const p = D.place[lk]; if (!nk || !p || isManual(lk)) return; Object.assign(mo(nk), { stage: p.stage || '', pipeline: p.pipeline || 'sales', placeTs: p.ts || 0 }); inc('dealPlacements'); });
  Object.keys(D.meta || {}).forEach(lk => { const nk = keyMap.get(lk); const m = D.meta[lk]; if (!nk || !m || typeof m !== 'object') return; const o = mo(nk); if (m.tags) o.tags = m.tags; if (m.follow) o.follow = m.follow; if (m.rx) o.rx = m.rx; });
  metaOut.forEach((o, nk) => { if (Object.keys(o).length) mig('dealmeta', nk, o); });
  Object.keys(D.notes || {}).forEach(lk => { const nk = keyMap.get(lk); if (!nk) return; (D.notes[lk] || []).forEach((n: any, i: number) => { mig('dealnotes', 'dn' + hash(lk + '|' + i + '|' + (n.text || '')), { deal: nk, ts: n.ts || 0, text: n.text || '' }); inc('dealNotes'); }); });

  // ---- Lost Deals ----
  const LD = J(src.lostDeals_v1, {}) || {};
  (LD.manual || []).forEach((m: any) => { if (!m || !m.id) return; const { phones, email, ...r } = m; void phones; void email; mig('lost', String(m.id), r); inc('lost'); });
  Object.keys(LD.meta || {}).forEach(id => { const m = LD.meta[id]; if (m && typeof m === 'object') mig('lostmeta', id, m); });
  if (Array.isArray(LD.reasons) && LD.reasons.length) mig('cfg', 'lost', { list: LD.reasons });

  // ---- Tickets ----
  const TD = J(src.tickets_v1, {}) || {};
  (TD.tickets || []).forEach((t: any) => {
    if (!t || !t.id) return; if (t.auto && !t.touched) return;   // rebuilt live from Day End
    const { number, email, contact, ...r } = t; void number; void email; void contact;
    mig('tickets', String(t.id), r); inc('tickets');
  });
  const tc: Record<string, any> = {}; ['types', 'pipelines', 'cats', 'pris'].forEach(f => { if (Array.isArray(TD[f]) && TD[f].length) tc[f] = TD[f]; });
  if (Object.keys(tc).length) mig('cfg', 'tickets', tc);
  if (TD.hidden && typeof TD.hidden === 'object') { const ids = Object.keys(TD.hidden); if (ids.length) mig('cfg', 'ticketsHiddenLegacy', { ids }); }

  // ---- Tasks ----
  const TK = J(src.followTasks_v1, {}) || {};
  (TK.tasks || []).forEach((t: any) => { if (!t || !t.id) return; mig('tasks', String(t.id), t); inc('tasks'); });
  const flds = J(src.rules_v1, {}) || {};
  if (Array.isArray(flds.folders) && flds.folders.length) mig('cfg', 'folders', { list: flds.folders.filter((f: any) => f && f.id && String(f.id).indexOf('cf_msg_') !== 0).map((f: any) => ({ id: f.id, name: f.name, color: f.color, icon: f.icon })) });

  // ---- HR clock ----
  const HRD = J(src.hub_hr_v1, {}) || {};
  Object.keys(HRD.punches || {}).forEach(k => (HRD.punches[k] || []).forEach((p: any) => { if (!p || !p.at) return; mig('punches', String(p.id || 'p' + hash(k + p.k + p.at)), { day: k, k: p.k, at: p.at, ...(p.bt ? { bt: p.bt } : {}) }); inc('punches'); }));
  if (HRD.set) { const s = HRD.set; mig('cfg', 'hr', { shiftStart: s.shiftStart, shiftEnd: s.shiftEnd, grace: s.grace, sec: s.sec, autoOutH: s.autoOutH, autoBreakMin: s.autoBreakMin, autoBreakAfterH: s.autoBreakAfterH, dayH: s.dayH, week: s.week, punchRound: s.punchRound }); }

  // ---- Renewals ----
  const B = J(src.billing_v1, {}) || {};
  const bd = B.deals || B;
  if (bd && typeof bd === 'object') Object.keys(bd).forEach(id => { const b = bd[id]; if (b && typeof b === 'object' && !Array.isArray(b)) { mig('billing', id, b); inc('billing'); } });

  // ---- Message tasks ----
  const MA = J(src.hub_msgauto_v1, null);
  if (MA) mig('cfg', 'msgauto', { on: MA.on !== false, start: MA.start || '2026-11-23' });

  // ---- Smart text + Snippets (Round 60) ----
  if (src.smartText_v1) inc('smartText', importSmartLegacy(src.smartText_v1, mig));
  if (src.hub_snippets_v1) inc('snippets', importSnippetsLegacy(src.hub_snippets_v1, mig));

  // ---- everything else: kept unchanged, synced and backed up ----
  let legacy = 0;
  Object.keys(src).forEach(k => { if (HANDLED.has(k) || src[k] == null || LEGACY_KEYS.indexOf(k) < 0) return; mig('legacy', k, { raw: src[k] }); legacy++; });

  const rep: Report = { at: Date.now(), source, counts, added, updated, legacy };
  lsSet('v2_migration', JSON.stringify(rep));
  return rep;
}
function newDealKey(name: string, link: string) { const n = slug(name); if (n.length >= 2) return 'n-' + n; const l = link && isLink(link) ? linkKey(link) : ''; return l ? 'l-' + slug(l) : ''; }
export function localLegacy(): Src { const o: Src = {}; [...LEGACY_KEYS, 'dayEndReport_v5'].forEach(k => { const v = lsGet(k); if (v != null) o[k] = v; }); return o; }
export function hasLocalLegacy() { return !!(lsGet('dayEndReport_v6') || lsGet('followTasks_v1') || lsGet('deals_v1')); }
export function lastReport(): Report | null { return J(lsGet('v2_migration'), null); }
export function migratedCounts() { return { entries: all('entries').length, days: all('days').length, tasks: all('tasks').length, tickets: all('tickets').length, deals: all('deals').length, lost: all('lost').length, punches: all('punches').length }; }
