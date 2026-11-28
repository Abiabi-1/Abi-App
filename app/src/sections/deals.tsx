// Deals – redone: one controls row (pipeline · Board/List · search · Filters & more · + New), compact cards, record page.
import { signal } from '@preact/signals';
import { useState } from 'preact/hooks';
import { rev, put, del, get } from '../data/store';
import { bestHours, Deal, deals, pipelines, savePipelines, moveDeal, addDealNote, tickets, isClosedT, Pipeline } from '../domain/crm';
import { CYCLES, PLANS, WON, LOST, entryText, stageTone, planLabel, priceText, mkOf } from '../domain/dayend';
import { ago, copyText, csv, download, fmtDay, keyOf, lsJSON, lsSet, parsePrice, fmtNum, uid, cx } from '../lib/util';
import { openUrl } from '../lib/privacy';
import { Add, Btn, Chips, DangerBtn, Empty, Field, IconBtn, MarkGrid, PageHead, SearchBox, Seg, Sheet, Stat, Tiles, closeModal, openMenu, openModal, toast } from '../ui/kit';
import { go, isPhone } from '../ui/state';
import { openTaskForm } from './tasks';

const V = signal({ ord: 'default', ...lsJSON('hub_fl_deals3', { pid: 'sales', view: 'board' as 'board' | 'list', q: '', stage: '', tag: '', plan: '', hasLink: '', phStage: '' }) } as { pid: string; view: 'board' | 'list'; q: string; stage: string; tag: string; plan: string; hasLink: string; phStage: string; ord: string });
const setV = (p: Partial<typeof V.value>) => { V.value = { ...V.value, ...p }; lsSet('hub_fl_deals3', JSON.stringify(V.value)); };
const selS = signal<string[]>([]);
const rxNext = (s?: string) => (s === '' || !s ? 'y' : s === 'y' ? 'n' : '');
const dmk = (d: Deal, k: 'wa' | 'em') => { let s = ''; d.entries.forEach(e => { const m = mkOf(e, k); if (m) s = m; }); return s; };

export function DealBoard() {
  void rev.value; const v = V.value, route = (window.location.hash.match(/^#\/dealboard\/(.+)$/) || [])[1];
  if (route) { const d = deals().find(x => x.key === decodeURIComponent(route)); if (d) return <DealRecord d={d} />; }
  const P = pipelines(), p = P.find(x => x.id === v.pid) || P[0];
  const q = v.q.trim().toLowerCase();
  const list = deals().filter(d => (d.pipeline || 'sales') === p.id || (p.id === 'sales' && p.stages.indexOf(d.stage) >= 0 && !P.some(x => x.id === d.pipeline && x.id !== 'sales')))
    .filter(d => (!q || (d.name + ' ' + d.entries.map(e => e.notes || '').join(' ') + ' ' + d.notes.map(n => n.text).join(' ')).toLowerCase().indexOf(q) >= 0)
      && (!v.tag || d.tags.indexOf(v.tag) >= 0) && (!v.plan || d.plan === v.plan) && (!v.hasLink || (v.hasLink === 'y' ? d.links.length > 0 : !d.links.length)));
  const hNow = new Date().getHours();
  if (v.ord === 'best') list.sort((a, b) => { const ra = bestHours(a.name).indexOf(hNow), rb = bestHours(b.name).indexOf(hNow); return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb); });
  else if (v.ord === 'name') list.sort((a, b) => a.name.localeCompare(b.name)); else if (v.ord === 'old') list.sort((a, b) => a.ts - b.ts);
  const by = (s: string) => list.filter(d => d.stage === s || (p.stages.indexOf(d.stage) < 0 && s === p.stages[0]));
  const won = list.filter(d => d.stage === WON).length, lost = list.filter(d => d.stage === LOST).length;
  const val = list.filter(d => d.stage !== LOST && d.stage !== 'Churn').reduce((n, d) => n + (parsePrice(d.price) || 0), 0);
  const tags = Array.from(new Set(deals().flatMap(d => d.tags))).sort();
  const nFilters = [v.tag, v.plan, v.hasLink].filter(Boolean).length;
  const sel = new Set(selS.value);
  return <div class="page">
    <PageHead icon="deal" title="Deals" sub={list.length + ' deals · ' + won + ' won · ' + lost + ' lost'} right={<span class="hide-phone"><Btn onClick={() => go('deals')}>Won Deals</Btn><Btn onClick={() => go('lost')}>Lost Deals</Btn><Btn onClick={() => go('tickets')}>Tickets</Btn></span>} />
    <Tiles><Stat l="Open deals" v={list.filter(d => d.stage !== WON && d.stage !== LOST && d.stage !== 'Churn').length} /><Stat l="Won" v={won} tone={won ? 'good' : ''} onClick={() => go('deals')} /><Stat l="Lost" v={lost} tone={lost ? 'bad' : ''} onClick={() => go('lost')} /><Stat l="Win rate" v={won + lost ? Math.round((won / (won + lost)) * 100) + '%' : '–'} /><Stat l="Value (USD)" v={'$' + fmtNum(val)} c="open + won, by price" /></Tiles>
    <div class="ctl" style={{ marginTop: '10px' }}>
      {P.length > 1 && <select class="in" style={{ width: 'auto' }} value={p.id} onChange={e => setV({ pid: (e.target as HTMLSelectElement).value })}>{P.map(x => <option value={x.id}>{x.name}</option>)}</select>}
      <Seg value={v.view} onChange={x => setV({ view: x })} opts={[['board', 'Board'], ['list', 'List']]} />
      <select class="in hide-phone" style={{ width: 'auto' }} aria-label="Order" value={v.ord} onChange={e => setV({ ord: (e.target as HTMLSelectElement).value })}><option value="default">Newest activity</option><option value="best">Best time now</option><option value="name">Name A–Z</option><option value="old">Oldest first</option></select>
      <SearchBox value={v.q} onInput={x => setV({ q: x })} ph="Search deals and notes" />
      <Btn icon="filter" on={nFilters > 0} onClick={() => openModal(() => <DealFilters tags={tags} />)}>{isPhone.value ? '' : 'Filters & more'}{nFilters ? ' · ' + nFilters : ''}</Btn>
      <Add onClick={() => openModal(() => <NewDeal pid={p.id} stage={p.stages[0]} />)}>New</Add>
    </div>
    {sel.size > 0 && <div class="ctl"><span class="faint">{sel.size} selected</span>
      <select class="in" style={{ width: 'auto' }} onChange={e => { const s = (e.target as HTMLSelectElement).value; if (!s) return; list.filter(d => sel.has(d.key)).forEach(d => moveDeal(d, s, p.id)); selS.value = []; toast('Moved to ' + s); }}><option value="">Move to…</option>{p.stages.map(s => <option value={s}>{s}</option>)}</select>
      <Btn onClick={() => { const t = prompt('Tag to add'); if (t) list.filter(d => sel.has(d.key)).forEach(d => put('dealmeta', d.key, { tags: Array.from(new Set([...d.tags, t.trim()])) })); selS.value = []; }}>Add tag</Btn>
      <Btn onClick={() => { selS.value = []; }}>Clear</Btn></div>}
    {v.view === 'board'
      ? (isPhone.value
        ? <><Chips value={v.phStage || p.stages[0]} onChange={s => setV({ phStage: s })} opts={p.stages.map(s => [s, s, by(s).length] as [string, string, number])} /><div style={{ marginTop: '8px' }}>{by(v.phStage || p.stages[0]).map(d => <DealCard d={d} p={p} sel={sel.has(d.key)} />)}{!by(v.phStage || p.stages[0]).length && <Empty>Nothing in this stage.</Empty>}</div></>
        : <div class="board">{p.stages.map(s => <Col s={s} p={p} items={by(s)} sel={sel} />)}</div>)
      : <DealTable list={list} p={p} sel={sel} />}
  </div>;
}
function Col({ s, p, items, sel }: { s: string; p: Pipeline; items: Deal[]; sel: Set<string> }) {
  const [over, setOver] = useState(false); const val = items.reduce((n, d) => n + (parsePrice(d.price) || 0), 0);
  return <div class={cx('col', over && 'drop')} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
    onDrop={e => { e.preventDefault(); setOver(false); const k = e.dataTransfer?.getData('text/deal'); const d = deals().find(x => x.key === k); if (d && d.stage !== s) { moveDeal(d, s, p.id); toast('Moved to ' + s); } }}>
    <div class="col-h"><span class={'pill ' + stageTone(s)}>{s}</span><span class="c">{items.length}{val ? ' · $' + fmtNum(val) : ''}</span></div>
    {items.map(d => <DealCard d={d} p={p} sel={sel.has(d.key)} />)}
  </div>;
}
function DealCard({ d, p, sel }: { d: Deal; p: Pipeline; sel: boolean }) {
  const tk = tickets().filter(t => !isClosedT(t) && t.deal && t.deal.toLowerCase() === d.name.toLowerCase()).length;
  const last = d.entries[d.entries.length - 1], lk = openUrl(d.links[0]);
  return <div class="item deal-card" draggable onDragStart={e => e.dataTransfer?.setData('text/deal', d.key)} onClick={() => go('dealboard', d.key)}>
    <input type="checkbox" class="ck" checked={sel} onClick={e => e.stopPropagation()} onChange={() => { selS.value = sel ? selS.value.filter(x => x !== d.key) : [...selS.value, d.key]; }} aria-label="Select" />
    <div class="main">
      <div class="t">{d.name}<IconBtn icon="copy" sm title="Copy the deal name" onClick={async () => toast((await copyText(d.name)) ? 'Name copied' : 'Copy failed')} />{lk && <a class="ent-l" href={lk} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}>↗ HubSpot</a>}</div>
      <div class="pills"><span class={'pill ' + stageTone(d.stage)}>{d.stage}</span>{d.plan && <span class="pill acc">{planLabel(d)}{d.price ? ' · ' + priceText(d) : ''}</span>}{tk > 0 && <span class="pill warn">{tk} open ticket{tk > 1 ? 's' : ''}</span>}{d.follow && <span class="pill">Follow-up {fmtDay(d.follow)}</span>}</div>
      {last && <div class="n">{last.notes || entryText(last)}</div>}
      <div class="dl-foot"><select class="in dl-mv" value="" onClick={e => e.stopPropagation()} onChange={e => { const s = (e.target as HTMLSelectElement).value; if (s) { moveDeal(d, s, p.id); toast('Moved to ' + s); } }} aria-label="Move to…"><option value="">Move to…</option>{p.stages.filter(s => s !== d.stage).map(s => <option value={s}>{s}</option>)}</select></div>
    </div>
    <div class="acts"><MarkGrid wa={dmk(d, 'wa')} em={dmk(d, 'em')} twa={d.rx.wa || ''} tem={d.rx.mail || ''} onMark={k => toast(k === 'wa' ? 'Tap the tick under the icon to confirm a WhatsApp' : 'Tap the tick under the icon to confirm an e-mail')} onTick={k => { const key = k === 'wa' ? 'wa' : 'mail'; put('dealmeta', d.key, { rx: { ...d.rx, [key]: rxNext(d.rx[key]) } }); }} /></div>
  </div>;
}
function DealTable({ list, p, sel }: { list: Deal[]; p: Pipeline; sel: Set<string> }) {
  if (!list.length) return <Empty>No deals match.</Empty>;
  return <div class="tw"><table class="table"><thead><tr><th></th><th>Deal</th><th>Stage</th><th>Plan</th><th>Price</th><th>Last activity</th><th>Entries</th></tr></thead><tbody>
    {list.map(d => <tr onClick={() => go('dealboard', d.key)} style={{ cursor: 'pointer' }}><td><input type="checkbox" class="ck" checked={sel.has(d.key)} onClick={e => e.stopPropagation()} onChange={() => { selS.value = sel.has(d.key) ? selS.value.filter(x => x !== d.key) : [...selS.value, d.key]; }} /></td><td><b>{d.name}</b></td><td><span class={'pill ' + stageTone(d.stage)}>{d.stage}</span></td><td>{planLabel(d)}</td><td class="mono">{priceText(d)}</td><td class="faint">{d.ts ? ago(d.ts) : ''}</td><td class="mono">{d.entries.length}</td></tr>)}
  </tbody></table></div>;
}
function DealFilters({ tags }: { tags: string[] }) {
  const v = V.value;
  return <Sheet title="Filters & more" onClose={closeModal} foot={<><Btn onClick={() => { setV({ tag: '', plan: '', hasLink: '' }); }}>Clear filters</Btn><button class="b-add" onClick={closeModal}>Done</button></>}>
    <div class="form">
      <Field label="Tag"><select class="in" value={v.tag} onChange={e => setV({ tag: (e.target as HTMLSelectElement).value })}><option value="">Any</option>{tags.map(t => <option value={t}>{t}</option>)}</select></Field>
      <Field label="Plan"><select class="in" value={v.plan} onChange={e => setV({ plan: (e.target as HTMLSelectElement).value })}><option value="">Any</option>{PLANS.map(t => <option value={t}>{t}</option>)}</select></Field>
      <Field label="HubSpot link"><select class="in" value={v.hasLink} onChange={e => setV({ hasLink: (e.target as HTMLSelectElement).value })}><option value="">Any</option><option value="y">Has a link</option><option value="n">No link</option></select></Field>
    </div>
    <div class="sep" />
    <div class="lbl">More</div>
    <div class="ctl" style={{ flexWrap: 'wrap', marginTop: '6px' }}>
      <Btn icon="down" onClick={() => { const L = deals(); download('deals.csv', csv([['Deal', 'Stage', 'Pipeline', 'Plan', 'Billing', 'Price', 'MVR', 'HubSpot link', 'Entries', 'Last activity', 'Tags'], ...L.map(d => [d.name, d.stage, d.pipeline, d.plan, d.billing, d.price, d.mvr, d.links[0] || '', d.entries.length, d.ts ? keyOf(new Date(d.ts)) : '', d.tags.join('; ')])])); }}>Export CSV</Btn>
      <Btn onClick={() => { closeModal(); openModal(() => <PipelineEditor />); }}>Pipelines &amp; stages</Btn>
    </div>
  </Sheet>;
}
function PipelineEditor() {
  const [list, setList] = useState(pipelines().filter(p => !p.fixed));
  const save = (l: Pipeline[]) => { setList(l); savePipelines(l); };
  return <Sheet title="Pipelines & stages" onClose={closeModal} foot={<Add onClick={() => save([...list, { id: uid('pl'), name: 'New pipeline', stages: ['New', 'In progress', 'Done'] }])}>Pipeline</Add>}>
    <p class="faint" style={{ fontSize: '.78rem' }}>The Sales pipeline keeps the fixed stage order: Lead, Interested, Demo Completed, Going Live, Closed Won All, No response, Waiting on Contact, Overdue, Churn, Closed Lost All.</p>
    {list.map((p, i) => <div class="card" style={{ marginTop: '8px' }}>
      <div class="ctl"><input class="in grow" value={p.name} onChange={e => save(list.map((x, j) => (j === i ? { ...x, name: (e.target as HTMLInputElement).value } : x)))} /><DangerBtn onConfirm={() => save(list.filter((_, j) => j !== i))}>Delete</DangerBtn></div>
      <Field label="Stages (one per line)"><textarea class="in" rows={4} value={p.stages.join('\n')} onChange={e => save(list.map((x, j) => (j === i ? { ...x, stages: (e.target as HTMLTextAreaElement).value.split('\n').map(s => s.trim()).filter(Boolean) } : x)))} /></Field>
    </div>)}
  </Sheet>;
}
function NewDeal({ pid, stage }: { pid: string; stage: string }) {
  const [f, setF] = useState({ name: '', link: '', stage, plan: '', billing: '', price: '', notes: '' });
  const save = () => { if (!f.name.trim()) return toast('Give the deal a name'); put('deals', uid('md'), { ...f, pipeline: pid, ts: Date.now() }); closeModal(); toast('Deal added'); };
  const P = pipelines().find(p => p.id === pid) || pipelines()[0];
  const s = (k: string) => (e: Event) => setF({ ...f, [k]: (e.target as HTMLInputElement).value });
  return <Sheet title="New deal" onClose={closeModal} foot={<><Btn onClick={closeModal}>Cancel</Btn><button class="b-add" onClick={save}>Save</button></>}>
    <div class="form">
      <Field label="Deal name" full><input class="in" autoFocus value={f.name} onInput={s('name')} /></Field>
      <Field label="HubSpot deal link" full><input class="in" value={f.link} onInput={s('link')} placeholder="https://app.hubspot.com/…" /></Field>
      <Field label="Stage"><select class="in" value={f.stage} onChange={s('stage')}>{P.stages.map(x => <option value={x}>{x}</option>)}</select></Field>
      <Field label="Plan"><select class="in" value={f.plan} onChange={s('plan')}><option value="">—</option>{PLANS.map(x => <option value={x}>{x}</option>)}</select></Field>
      <Field label="Billing"><select class="in" value={f.billing} onChange={s('billing')}><option value="">—</option>{CYCLES.map(x => <option value={x}>{x}</option>)}</select></Field>
      <Field label="Price (USD)"><input class="in" inputMode="decimal" value={f.price} onInput={s('price')} /></Field>
      <Field label="Notes" full><textarea class="in" value={f.notes} onInput={s('notes')} /></Field>
    </div>
  </Sheet>;
}
function DealRecord({ d }: { d: Deal }) {
  const [note, setNote] = useState('');
  const P = pipelines(), p = P.find(x => x.id === d.pipeline) || P[0];
  const tl = [...d.entries.map(e => ({ ts: e.at || Date.parse(e.day + 'T' + e.hk + ':00'), kind: 'Day End', stage: e.stage || '', text: (e.notes || entryText(e)) as string, day: e.day })),
    ...d.notes.map(n => ({ ts: n.ts, kind: 'Note', stage: '', text: n.text, day: keyOf(new Date(n.ts)) }))].sort((a, b) => b.ts - a.ts);
  const tks = tickets().filter(t => t.deal && t.deal.toLowerCase() === d.name.toLowerCase());
  return <div class="page">
    <div class="ctl"><Btn icon="left" onClick={() => go('dealboard')}>Deals</Btn></div>
    <PageHead icon="deal" title={d.name} sub={<><span class={'pill ' + stageTone(d.stage)}>{d.stage}</span> {d.plan ? planLabel(d) : ''} {d.price ? '· ' + priceText(d) : ''}</>}
      right={<><IconBtn icon="copy" title="Copy the deal name" onClick={async () => toast((await copyText(d.name)) ? 'Name copied' : 'Copy failed')} />{d.links[0] && <a class="b" href={openUrl(d.links[0])} target="_blank" rel="noopener">↗ HubSpot</a>}
        <IconBtn icon="dots" title="Actions" onClick={e => openMenu(e, [
          { label: 'Add follow-up task', fn: () => openTaskForm({ title: 'Follow up — ' + d.name, deal: d.name }) },
          { label: 'New ticket for this deal', fn: () => go('tickets', 'new:' + d.name) },
          { label: 'Rename', fn: () => { const n = prompt('Deal name', d.name); if (n && n.trim()) d.src === 'manual' ? put('deals', d.key, { name: n.trim() }) : put('dealmeta', d.key, { name: n.trim() }); } },
          { label: 'Set follow-up date', fn: () => { const n = prompt('Follow-up date (YYYY-MM-DD)', d.follow || ''); if (n != null) put('dealmeta', d.key, { follow: n.trim() || undefined }); } },
          { sep: true, label: '' },
          d.src === 'manual' ? { label: 'Delete deal', danger: true, fn: () => { del('deals', d.key); go('dealboard'); } } : { label: 'Hide from Deals', danger: true, fn: () => { put('dealmeta', d.key, { hidden: true }); go('dealboard'); } },
        ])} /></>} />
    <div class="grid2">
      <div class="card">
        <div class="lbl">Properties</div>
        <div class="form" style={{ marginTop: '8px' }}>
          <Field label="Stage"><select class="in" value={d.stage} onChange={e => moveDeal(d, (e.target as HTMLSelectElement).value, p.id)}>{p.stages.map(s => <option value={s}>{s}</option>)}</select></Field>
          <Field label="Pipeline"><select class="in" value={p.id} onChange={e => moveDeal(d, (P.find(x => x.id === (e.target as HTMLSelectElement).value) || p).stages[0], (e.target as HTMLSelectElement).value)}>{P.map(x => <option value={x.id}>{x.name}</option>)}</select></Field>
          <Field label="Tags" full><input class="in" value={d.tags.join(', ')} onChange={e => put('dealmeta', d.key, { tags: (e.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="comma separated" /></Field>
        </div>
        <div class="ctl" style={{ marginTop: '10px' }}><span class="lbl">Reached</span><MarkGrid wa={dmk(d, 'wa')} em={dmk(d, 'em')} twa={d.rx.wa || ''} tem={d.rx.mail || ''} onMark={() => { /* */ }} onTick={k => { const key = k === 'wa' ? 'wa' : 'mail'; put('dealmeta', d.key, { rx: { ...d.rx, [key]: rxNext(d.rx[key]) } }); }} /></div>
        <div class="lbl" style={{ marginTop: '12px' }}>Tickets ({tks.length})</div>
        {tks.length ? tks.map(t => <div class="item" onClick={() => go('tickets', t.id)} style={{ cursor: 'pointer' }}><div class="main"><div class="t">{t.subject}</div><div class="s">{isClosedT(t) ? 'Closed' : 'Open'} · {fmtDay(keyOf(new Date(t.created)))}</div></div></div>) : <Empty>No linked tickets.</Empty>}
      </div>
      <div class="card">
        <div class="lbl">Timeline</div>
        <div class="ctl" style={{ marginTop: '8px' }}><input class="in grow" placeholder="Add a note" value={note} onInput={e => setNote((e.target as HTMLInputElement).value)} onKeyDown={e => { if (e.key === 'Enter' && note.trim()) { addDealNote(d.key, note.trim()); setNote(''); } }} /><Add onClick={() => { if (note.trim()) { addDealNote(d.key, note.trim()); setNote(''); } }}>Note</Add></div>
        {tl.map(x => <div class="item"><div class="main"><div class="s">{fmtDay(x.day)} · {x.kind}{x.stage ? ' · ' + x.stage : ''}</div><div style={{ fontSize: '.84rem', marginTop: '2px', overflowWrap: 'anywhere' }}>{x.text}</div></div></div>)}
        {!tl.length && <Empty>No activity yet.</Empty>}
      </div>
    </div>
  </div>;
}
export { get };
