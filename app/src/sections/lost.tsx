// Lost Deals with the Churn subsection: fed by Closed Lost All / Churn entries plus hand-added ones.
import { signal } from '@preact/signals';
import { useState } from 'preact/hooks';
import { rev, put, del } from '../data/store';
import { Lost, lostDeals, lostReasons, lostValue, wonDeals } from '../domain/crm';
import { PLANS, CYCLES, planLabel, priceText } from '../domain/dayend';
import { MONTHS, copyText, csv, download, fmtDay, fmtNum, todayKey, uid } from '../lib/util';
import { Add, Btn, DangerBtn, Empty, Field, PageHead, SearchBox, Seg, Sheet, Stat, Tiles, closeModal, openModal, toast, Chips } from '../ui/kit';
import { go } from '../ui/state';

const V = signal({ sub: 'lost' as 'lost' | 'churn', per: 'month' as 'day' | 'month' | 'year' | 'all', q: '' });
export function LostDeals() {
  void rev.value; const v = V.value, td = todayKey();
  const inP = (k: string) => v.per === 'all' || (v.per === 'day' ? k === td : v.per === 'month' ? k.slice(0, 7) === td.slice(0, 7) : k.slice(0, 4) === td.slice(0, 4));
  const all = lostDeals().filter(e => inP(e.day)), lost = all.filter(e => e.kind === 'lost'), churn = all.filter(e => e.kind === 'churn');
  const cur = (v.sub === 'churn' ? churn : lost).filter(e => !v.q || (e.deal + ' ' + e.notes + ' ' + e.reason).toLowerCase().indexOf(v.q.toLowerCase()) >= 0);
  const wonN = wonDeals().filter(w => inP(w.day)).length, val = cur.reduce((n, e) => n + lostValue(e), 0);
  const reasons: Record<string, number> = {}; cur.forEach(e => { const r = e.reason || 'No reason'; reasons[r] = (reasons[r] || 0) + 1; });
  const per = v.per === 'all' ? 'All time' : v.per === 'day' ? 'Today' : v.per === 'month' ? MONTHS[+td.slice(5, 7) - 1] + ' ' + td.slice(0, 4) : td.slice(0, 4);
  const set = (p: Partial<typeof v>) => { V.value = { ...v, ...p }; };
  const report = () => ['Lost Deals Report — ' + per + (v.sub === 'churn' ? ' (Churn)' : ''), '', ...cur.flatMap((e, i) => [(i + 1) + '. ' + e.deal, '  • Day: ' + fmtDay(e.day), ...(e.reason ? ['  • Reason: ' + e.reason] : []), ...(e.plan ? ['  • Plan: ' + planLabel(e)] : []), ...(lostValue(e) ? ['  • Value lost: $' + fmtNum(lostValue(e))] : []), ...(e.notes ? ['  • Notes: ' + e.notes] : []), '']), '─────────────────────', 'Totals', (v.sub === 'churn' ? 'Churned: ' : 'Lost: ') + cur.length, 'Value lost: $' + fmtNum(val), ...Object.keys(reasons).map(r => '  ' + r + ': ' + reasons[r])].join('\n');
  return <div class="page">
    <PageHead icon="lost" title="Lost Deals" sub={'Closed Lost All and Churn · ' + per} right={<Add onClick={() => openModal(() => <LostForm kind={v.sub} />)}>{v.sub === 'churn' ? 'Churned' : 'Lost deal'}</Add>} />
    <div class="ctl"><Chips value={v.sub} onChange={x => set({ sub: x })} opts={[['lost', 'Lost deals', lost.length], ['churn', 'Churn', churn.length]]} /><Seg value={v.per} onChange={x => set({ per: x })} opts={[['day', 'Day'], ['month', 'Month'], ['year', 'Year'], ['all', 'All']]} /></div>
    <Tiles><Stat l={v.sub === 'churn' ? 'Churned' : 'Lost'} v={cur.length} tone={cur.length ? 'bad' : ''} /><Stat l="Value lost (USD)" v={'$' + fmtNum(val)} />{v.sub === 'lost' && <Stat l="Won in period" v={wonN} tone={wonN ? 'good' : ''} onClick={() => go('deals')} />}{v.sub === 'lost' && <Stat l="Win rate" v={wonN + lost.length ? Math.round((wonN / (wonN + lost.length)) * 100) + '%' : '–'} />}
      <Stat l="Reasons" v={Object.keys(reasons).length} rows={Object.keys(reasons).sort((a, b) => reasons[b] - reasons[a]).slice(0, 4).map(r => [r, reasons[r], cur.length] as [string, number, number])} /></Tiles>
    <div class="ctl" style={{ marginTop: '10px' }}><SearchBox value={v.q} onInput={x => set({ q: x })} ph="Search lost deals" />
      <Btn icon="copy" onClick={async () => toast((await copyText(report())) ? 'Report copied' : 'Copy failed')}>Copy</Btn>
      <Btn icon="down" onClick={() => download('lost-deals.csv', csv([['Day', 'Kind', 'Deal', 'Reason', 'Plan', 'Billing', 'Price', 'Value lost', 'Notes'], ...cur.map(e => [e.day, e.kind, e.deal, e.reason, e.plan, e.billing, e.price, lostValue(e) || '', e.notes])]))}>CSV</Btn>
      <Btn onClick={() => openModal(() => <Reasons />)}>Reasons</Btn></div>
    {cur.length ? cur.map(e => <LostRow e={e} />) : <Empty>Nothing here for {per}. Mark a Day End task as {v.sub === 'churn' ? 'Churn' : 'Closed Lost All'}, or add one.</Empty>}
  </div>;
}
function LostRow({ e }: { e: Lost }) {
  return <div class="item"><div class="main"><div class="t">{e.deal || '(no name)'}</div>
    <div class="pills"><span class="pill">{fmtDay(e.day)}</span>{e.reason && <span class="pill bad">{e.reason}</span>}{e.plan && <span class="pill acc">{planLabel(e)}</span>}{lostValue(e) > 0 && <span class="pill warn">${fmtNum(lostValue(e))}</span>}{e.src === 'day' && <span class="pill">Day End</span>}</div>
    {e.notes && <div class="n">{e.notes}</div>}</div>
    <div class="acts"><Btn onClick={() => openModal(() => <LostForm kind={e.kind} e={e} />)}>Edit</Btn>{e.src === 'manual' && <DangerBtn onConfirm={() => del('lost', e.id)}>Delete</DangerBtn>}</div></div>;
}
function LostForm({ kind, e }: { kind: 'lost' | 'churn'; e?: Lost }) {
  const [f, setF] = useState({ deal: e?.deal || '', day: e?.day || todayKey(), reason: e?.reason || '', plan: e?.plan || '', billing: e?.billing || '', price: e?.price || '', value: e?.value || '', notes: e?.notes || '', kind: e?.kind || kind });
  const s = (k: string) => (ev: Event) => setF({ ...f, [k]: (ev.target as HTMLInputElement).value });
  const save = () => {
    if (e && e.src === 'day') put('lostmeta', e.id, { reason: f.reason, plan: f.plan, billing: f.billing, price: f.price, value: f.value });
    else { if (!f.deal.trim()) return toast('Give it a deal name'); put('lost', e?.id || uid('ld'), f); }
    closeModal(); toast('Saved');
  };
  const day = e && e.src === 'day';
  return <Sheet title={e ? 'Edit ' + (f.kind === 'churn' ? 'churned customer' : 'lost deal') : f.kind === 'churn' ? 'Add churned customer' : 'Add lost deal'} onClose={closeModal} foot={<><Btn onClick={closeModal}>Cancel</Btn><button class="b-add" onClick={save}>Save</button></>}>
    <div class="form">
      <Field label="Deal name" full><input class="in" value={f.deal} disabled={day} onInput={s('deal')} /></Field>
      {!day && <Field label="Day"><input class="in" type="date" value={f.day} onInput={s('day')} /></Field>}
      {!day && <Field label="Kind"><select class="in" value={f.kind} onChange={s('kind')}><option value="lost">Lost deal</option><option value="churn">Churn</option></select></Field>}
      <Field label="Reason"><select class="in" value={f.reason} onChange={s('reason')}><option value="">—</option>{[...lostReasons(), ...(f.reason && lostReasons().indexOf(f.reason) < 0 ? [f.reason] : [])].map(r => <option value={r}>{r}</option>)}</select></Field>
      <Field label="Plan"><select class="in" value={f.plan} onChange={s('plan')}><option value="">—</option>{PLANS.map(r => <option value={r}>{r}</option>)}</select></Field>
      <Field label="Billing"><select class="in" value={f.billing} onChange={s('billing')}><option value="">—</option>{CYCLES.map(r => <option value={r}>{r}</option>)}</select></Field>
      <Field label="Price (USD)"><input class="in" inputMode="decimal" value={f.price} onInput={s('price')} /></Field>
      <Field label="Value lost (USD)"><input class="in" inputMode="decimal" value={f.value} onInput={s('value')} /></Field>
      {!day && <Field label="Notes" full><textarea class="in" value={f.notes} onInput={s('notes')} /></Field>}
    </div>
    {day && <p class="faint" style={{ fontSize: '.75rem' }}>This deal comes from a Day End entry; the name and notes are edited there.</p>}
  </Sheet>;
}
function Reasons() {
  const [t, setT] = useState(lostReasons().join('\n'));
  return <Sheet title="Cancel reasons" onClose={closeModal} foot={<button class="b-add" onClick={() => { put('cfg', 'lost', { list: t.split('\n').map(x => x.trim()).filter(Boolean) }); closeModal(); }}>Save</button>}>
    <Field label="One reason per line"><textarea class="in" rows={8} value={t} onInput={e => setT((e.target as HTMLTextAreaElement).value)} /></Field></Sheet>;
}
export { priceText };
