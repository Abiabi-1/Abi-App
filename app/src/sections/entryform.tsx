// One entry form for Day End (hour blocks + Quick Add) and Won Deals: same fields, same pricing rules everywhere.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { CYCLES, Entry, PLANS, SK, STAGES, WON, calcPrice, hasRegs, isPaid, joinFields, makeTask, MVR_RATE, numStr, REG_PRICE, regMult, SECTIONS, addEntry, updateEntry, editFields } from '../domain/dayend';
import { lastDetails } from '../domain/crm';
import { openUrl, cleanLink, stripText } from '../lib/privacy';
import { parsePrice, ago } from '../lib/util';
import { Btn, IconBtn, toast } from '../ui/kit';
import { Icon } from '../ui/icons';

export const CALL_OUTCOMES = ['No answer', 'Busy', 'Call back later', 'Interested', 'Not interested', 'Demo booked', 'Wrong person'];
export const QUICK_NOTES = ['Sent WhatsApp', 'Emailed', 'Will follow up tomorrow', 'Demo done', 'Waiting on owner', 'Unable to WhatsApp', 'Paid'];
type V = Record<string, string>;

/** Pricing logic: same table, MVR rate and extra-register rules as before. */
function priced(v: V, trigger: string): V {
  const o = { ...v };
  if (trigger === 'plan' || trigger === 'billing' || trigger === 'stage') o.pricing = '';
  if (o.stage !== WON) { o.plan = ''; o.billing = ''; o.price = ''; o.mvr = ''; o.regs = ''; o.pricing = ''; return o; }
  if (!isPaid(o.plan)) o.billing = ''; if (!hasRegs(o.plan)) o.regs = '';
  const custom = o.pricing === 'custom', std = isPaid(o.plan) && !custom;
  if (std) { const c = calcPrice(o.plan, o.billing, o.regs); o.price = c ? numStr(c[0]) : ''; o.mvr = c ? numStr(c[1]) : ''; }
  else if (trigger === 'plan' && !custom) { o.price = ''; o.mvr = ''; }
  else if (trigger === 'price' || trigger === 'mvr') {
    const other = trigger === 'price' ? 'mvr' : 'price', n = parsePrice(o[trigger]);
    if (o[other] === '' || o[other] == null || o['_' + other] === '1') { o[other] = isNaN(n) ? '' : numStr(trigger === 'price' ? n * MVR_RATE : n / MVR_RATE); o['_' + other] = '1'; }
    o['_' + trigger] = '';
  }
  return o;
}
function regsStep(v: V, d: number): V {
  if (!hasRegs(v.plan)) return v; const cur = Math.max(0, parseInt(v.regs, 10) || 0), next = Math.max(0, cur + d); if (next === cur) return v;
  const o: V = { ...v, regs: next ? String(next) : '' };
  if (o.pricing === 'custom' || !isPaid(o.plan)) { const k = (next - cur) * regMult(o.billing), p = parsePrice(o.price), m = parsePrice(o.mvr); if (!isNaN(p)) o.price = numStr(Math.max(0, p + k * REG_PRICE[0])); if (!isNaN(m)) o.mvr = numStr(Math.max(0, m + k * REG_PRICE[1])); }
  return priced(o, 'regs');
}

export function EntryForm(p: { sk: SK; day: string; hk: string; edit?: Entry | null; onDone?: (id?: string) => void; quick?: boolean; compact?: boolean; autoFocus?: boolean; initial?: V }) {
  const def = SECTIONS.find(s => s.key === p.sk)!;
  const blank = (): V => ({ ...(p.edit ? editFields(p.edit) : {}), ...(p.initial || {}) });
  const [v, setV] = useState<V>(blank);
  useEffect(() => { setV(blank()); }, [p.edit?.id, p.sk]);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => { if (p.autoFocus || p.edit) setTimeout(() => first.current?.focus(), 30); }, [p.edit?.id, p.sk]);
  const set = (k: string, val: string) => setV(o => (p.sk === 'tasks' && /^(stage|plan|billing|pricing|price|mvr)$/.test(k) ? priced({ ...o, [k]: val }, k) : { ...o, [k]: val }));
  const ld = useMemo(() => (p.sk === 'tasks' && !p.edit ? lastDetails(v.deal || '') : null), [v.deal, p.sk]);
  const submit = () => {
    const vals: V = {}; Object.keys(v).forEach(k => { if (k.charAt(0) !== '_') vals[k] = String(v[k] ?? '').trim(); });
    let cut = 0;
    Object.keys(vals).forEach(k => { if (k === 'number' && p.sk === 'tasks') { const u = vals[k] ? cleanLink(vals[k]) : ''; if (u !== vals[k]) cut++; vals[k] = u; } else if (!/^(price|mvr|regs|stage|plan|billing|pricing)$/.test(k)) { const r = stripText(vals[k]); if (r.n) { cut += r.n; vals[k] = r.s; } } });
    if (cut) toast('Phone numbers & e-mails aren’t stored – they were left out');
    if (p.sk === 'tasks' && !vals.deal && !vals.number && !vals.notes) return toast('Add a deal name or the HubSpot link');
    if (p.sk === 'calls' && !vals.number && !vals.reason) return toast('Add a deal / ticket name or a reason');
    if (p.sk === 'whatsapp' && !vals.sender && !vals.inquiry) return toast('Add a deal / ticket name or the inquiry');
    if (p.sk === 'tickets' && !vals.desc) return toast('Missing: desc');
    if (p.sk === 'other' && !vals.note) return toast('Missing: note');
    if (p.sk === 'tasks' && vals.price && isNaN(parsePrice(vals.price))) return toast('Price should be a number');
    if (p.sk === 'tasks' && vals.mvr && isNaN(parsePrice(vals.mvr))) return toast('MVR price should be a number');
    let data: Partial<Entry>;
    if (p.sk === 'tasks') data = { ...makeTask(vals), text: undefined }; else { const t = joinFields(p.sk, vals); if (!t) return; data = { text: t }; }
    let id: string | undefined;
    if (p.edit) { updateEntry(p.edit.id, data); id = p.edit.id; toast('Entry updated'); }
    else { id = addEntry(p.day, p.hk, p.sk, data); toast(p.quick ? 'Added to ' + def.label : 'Added'); }
    setV(!p.edit && p.initial ? { ...p.initial } : {}); p.onDone?.(id); setTimeout(() => first.current?.focus(), 20);
  };
  const key = (e: KeyboardEvent) => { if (e.key === 'Enter' && !(e.target as HTMLElement).matches('textarea')) { e.preventDefault(); submit(); } };
  const inp = (f: { name: string; ph: string }, i: number) => <input ref={i === 0 ? first : undefined} class="in" data-f={f.name} placeholder={f.ph} value={v[f.name] || ''} onInput={e => set(f.name, (e.target as HTMLInputElement).value)} onKeyDown={key} onBlur={f.name === 'number' && p.sk === 'tasks' ? (e => { const t = (e.target as HTMLInputElement).value; if (t && cleanLink(t) !== t) { set('number', cleanLink(t)); toast(cleanLink(t) ? 'Link cleaned' : 'Only a HubSpot link is kept here – phone numbers aren’t stored'); } }) : undefined} />;
  const won = v.stage === WON;
  return <div class="ef">
    <div class="ef-row">
      {def.fields.map((f, i) => f.name === 'number' && p.sk === 'tasks'
        ? <div class="ef-link">{inp(f, i)}<IconBtn icon="link" sm title="Open the HubSpot deal link" onClick={() => { const u = openUrl(v.number); if (u) window.open(u, '_blank', 'noopener'); else toast('Paste the HubSpot deal link first'); }} /></div>
        : inp(f, i))}
    </div>
    {ld && ld.name.toLowerCase() !== '' && <div class="ef-hint"><span class="faint">Seen {ld.seen}× · last {ago(ld.last)}</span><Btn onClick={() => setV(o => priced({ ...o, deal: ld.name, number: o.number || ld.link, stage: ld.stage || o.stage || '' }, 'stage'))}>Use last details</Btn></div>}
    {p.sk === 'tasks' && <div class="ef-row ef-stage">
      <select class="in" data-f="stage" value={v.stage || ''} onChange={e => set('stage', (e.target as HTMLSelectElement).value)}><option value="">Deal stage</option>{STAGES.map(s => <option value={s}>{s}</option>)}{v.stage && STAGES.indexOf(v.stage) < 0 && <option value={v.stage}>{v.stage}</option>}</select>
      {won && <select class="in" data-f="plan" value={v.plan || ''} onChange={e => set('plan', (e.target as HTMLSelectElement).value)}><option value="">Select plan</option>{PLANS.map(s => <option value={s}>{s}</option>)}{v.plan && PLANS.indexOf(v.plan) < 0 && <option value={v.plan}>{v.plan}</option>}</select>}
      {won && isPaid(v.plan) && <select class="in" data-f="billing" value={v.billing || ''} onChange={e => set('billing', (e.target as HTMLSelectElement).value)}><option value="">Select billing</option>{CYCLES.map(s => <option value={s}>{s}</option>)}</select>}
      {won && v.plan && <select class="in" data-f="pricing" value={v.pricing || ''} onChange={e => set('pricing', (e.target as HTMLSelectElement).value)}><option value="">Standard price</option><option value="custom">Custom price</option></select>}
      {won && <input class={'in' + (isPaid(v.plan) && v.pricing !== 'custom' ? ' ro' : '')} readOnly={isPaid(v.plan) && v.pricing !== 'custom'} inputMode="decimal" data-f="price" placeholder="Price (USD)" value={v.price || ''} onInput={e => set('price', (e.target as HTMLInputElement).value)} onKeyDown={key} />}
      {won && <input class={'in' + (isPaid(v.plan) && v.pricing !== 'custom' ? ' ro' : '')} readOnly={isPaid(v.plan) && v.pricing !== 'custom'} inputMode="decimal" data-f="mvr" placeholder="Price (MVR)" value={v.mvr || ''} onInput={e => set('mvr', (e.target as HTMLInputElement).value)} onKeyDown={key} />}
      {won && hasRegs(v.plan) && <div class="ef-regs" title="Professional only · extra registers $20 / 300 MVR per month each (×6 biannual, ×12 annual)"><span class="lbl">Extra registers</span><button type="button" class="bi sm" onClick={() => setV(o => regsStep(o, -1))} aria-label="Fewer registers">−</button><b class="mono">{v.regs || '0'}</b><button type="button" class="bi sm" onClick={() => setV(o => regsStep(o, 1))} aria-label="More registers">+</button></div>}
    </div>}
    {p.quick && p.sk === 'tasks' && <div class="row-scroll ef-sc">{CALL_OUTCOMES.map(o => <button type="button" class="chip" onClick={() => setV(x => ({ ...x, notes: x.notes ? x.notes + '. ' + o : o }))}>{o}</button>)}</div>}
    {p.quick && <div class="row-scroll ef-sc">{QUICK_NOTES.map(o => <button type="button" class="chip" onClick={() => { const f = p.sk === 'tasks' ? 'notes' : def.fields[def.fields.length - 1].name; setV(x => ({ ...x, [f]: x[f] ? x[f] + '. ' + o : o })); }}>{o}</button>)}</div>}
    <div class="ef-go">
      {p.edit && <Btn onClick={() => { setV(p.initial ? { ...p.initial } : {}); p.onDone?.(); }}>Cancel</Btn>}
      <button type="button" class="b-add" onClick={submit}>{p.edit ? 'Save changes' : <><Icon n="plus" />Add</>}</button>
    </div>
  </div>;
}
