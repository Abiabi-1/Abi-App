// Tickets – redone: one tab per type → Online / Physical / AnyDesk strip → stage tabs (phone) or board (PC).
import { signal } from '@preact/signals';
import { useState } from 'preact/hooks';
import { rev } from '../data/store';
import { Ticket, TType, tickets, ticketCfg, saveTicketCfg, saveTicket, removeTicket, isClosedT, ticketStageName, classify, DEF_SUBS, deals } from '../domain/crm';
import { csv, download, fmtDay, keyOf, todayKey, uid, cx, copyText, h12 } from '../lib/util';
import { Add, Btn, Chips, DangerBtn, Empty, Field, IconBtn, PageHead, SearchBox, Seg, Sheet, Stat, Tiles, closeModal, openMenu, openModal, toast } from '../ui/kit';
import { go, isPhone, route } from '../ui/state';

const V = signal({ type: '', sub: '', view: 'board' as 'board' | 'list', q: '', stage: '', pri: '', show: 'all' as 'all' | 'open' | 'closed' });
const typeLabel = (x: { t: string; s: string }, types: TType[]) => { const ty = types.find(y => y.id === x.t); return ty ? (x.s ? x.s + ' ' + ty.name : ty.name) : ''; };
const isToday = (t: Ticket) => !isClosedT(t) && (t.due === todayKey() || keyOf(new Date(t.updated)) === todayKey());
const closedThisMonth = (t: Ticket) => isClosedT(t) && !!t.closed && keyOf(new Date(t.closed)).slice(0, 7) === todayKey().slice(0, 7);

export function Tickets() {
  void rev.value; const v = V.value, cfg = ticketCfg(), p = cfg.pipelines[0], types = cfg.types;
  const r = route.value; if (r.t === 'tickets' && r.id) { if (r.id.indexOf('new:') === 0) { const deal = r.id.slice(4); setTimeout(() => { go('tickets'); openModal(() => <TicketForm pre={{ deal }} />); }, 0); } else { const t = tickets().find(x => x.id === r.id); if (t) return <TicketRecord t={t} />; } }
  const set = (x: Partial<typeof v>) => { V.value = { ...v, ...x }; };
  const q = v.q.trim().toLowerCase();
  const base = tickets().filter(t => (!q || [t.subject, t.desc, t.deal, ...t.notes.map(n => n.text)].join(' ').toLowerCase().indexOf(q) >= 0) && (!v.pri || t.priority === v.pri) && (v.show === 'all' || (v.show === 'open' ? !isClosedT(t) : isClosedT(t))));
  const ofType = (t: Ticket, ty: string) => !ty || (t.tt || []).some(x => x.t === ty);
  const byType = base.filter(t => ofType(t, v.type)), shown = byType.filter(t => !v.sub || (t.tt || []).some(x => x.t === v.type && x.s === v.sub));
  const ty = types.find(x => x.id === v.type);
  const cols = [{ id: '__today', name: 'Today', smart: true, items: shown.filter(isToday) }, ...p.stages.map(s => ({ id: s.id, name: s.name, smart: false, items: shown.filter(t => t.stage === s.id) })), { id: '__cm', name: 'Closed this month', smart: true, items: shown.filter(closedThisMonth) }];
  const open = tickets().filter(t => !isClosedT(t));
  const stageCur = v.stage || '__today', colCur = cols.find(c => c.id === stageCur) || cols[0];
  return <div class="page">
    <PageHead icon="ticket" title="Tickets" sub={open.length + ' open · ' + tickets().length + ' in total'} right={<span class="hide-phone"><Btn onClick={() => go('dealboard')}>Deals</Btn></span>} />
    <Tiles><Stat l="Open" v={open.length} tone={open.length ? 'acc' : ''} onClick={() => set({ show: 'open' })} /><Stat l="Today" v={tickets().filter(isToday).length} /><Stat l="Overdue" v={open.filter(t => t.due && t.due < todayKey()).length} tone={open.some(t => t.due && t.due < todayKey()) ? 'bad' : ''} /><Stat l="Closed this month" v={tickets().filter(closedThisMonth).length} tone="good" /></Tiles>
    <div class="ctl" style={{ marginTop: '10px' }}>
      <Seg value={v.view} onChange={x => set({ view: x })} opts={[['board', 'Board'], ['list', 'List']]} />
      <SearchBox value={v.q} onInput={x => set({ q: x })} ph="Search subject, deal, note" />
      <Btn icon="filter" on={!!(v.pri || v.show !== 'all')} onClick={() => openModal(() => <TicketFilters />)}>{isPhone.value ? '' : 'Filters & more'}</Btn>
      <Add onClick={() => openModal(() => <TicketForm pre={v.type ? { tt: [{ t: v.type, s: v.sub || (ty ? ty.defSub : '') }] } : {}} />)}>New</Add>
    </div>
    <Chips value={v.type} onChange={x => set({ type: x, sub: '' })} opts={[['', 'All types', byTypeCount(base, '')], ...types.map(t => [t.id, t.name, byTypeCount(base, t.id)] as [string, string, number])]} />
    {ty && <div style={{ marginTop: '2px' }}><Chips value={v.sub} onChange={x => set({ sub: x })} opts={[['', 'All', byType.length], ...ty.subs.map(s => [s, s, byType.filter(t => (t.tt || []).some(x => x.t === ty.id && x.s === s)).length] as [string, string, number])]} /></div>}
    <div style={{ marginTop: '8px' }}>
      {v.view === 'list' ? <TicketTable list={shown} />
        : isPhone.value ? <><Chips value={stageCur} onChange={x => set({ stage: x })} opts={cols.map(c => [c.id, c.name, c.items.length] as [string, string, number])} /><div style={{ marginTop: '8px' }}>{colCur.items.map(t => <TicketCard t={t} />)}{!colCur.items.length && <Empty>Nothing here.</Empty>}</div></>
          : <div class="board">{cols.map(c => <TCol c={c} />)}</div>}
    </div>
  </div>;
}
const byTypeCount = (l: Ticket[], ty: string) => l.filter(t => !ty || (t.tt || []).some(x => x.t === ty)).length;
function TCol({ c }: { c: { id: string; name: string; smart: boolean; items: Ticket[] } }) {
  const [over, setOver] = useState(false);
  return <div class={cx('col', over && 'drop')} style={c.smart ? { borderStyle: 'dashed' } : undefined}
    onDragOver={e => { if (c.smart) return; e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
    onDrop={e => { e.preventDefault(); setOver(false); const id = e.dataTransfer?.getData('text/ticket'); const t = tickets().find(x => x.id === id); if (t && !c.smart) moveTicket(t, c.id); }}>
    <div class="col-h"><span>{c.name}</span><span class="c">{c.items.length}{c.smart ? ' · auto' : ''}</span></div>
    {c.items.map(t => <TicketCard t={t} />)}
  </div>;
}
function moveTicket(t: Ticket, stage: string) {
  const p = ticketCfg().pipelines.find(x => x.id === t.pipeline) || ticketCfg().pipelines[0], st = p.stages.find(s => s.id === stage);
  if (!st) return;
  if (st.closed && !t.resolution) { openModal(() => <Resolve t={t} stage={stage} />); return; }
  saveTicket({ id: t.id, stage, closed: st.closed ? Date.now() : null, history: [...(t.history || []), { ts: Date.now(), from: t.stage, to: stage }] }); toast('Moved to ' + st.name);
}
function Resolve({ t, stage }: { t: Ticket; stage: string }) {
  const [r, setR] = useState('');
  return <Sheet title="Close ticket" onClose={closeModal} foot={<><Btn onClick={closeModal}>Cancel</Btn><button class="b-add" onClick={() => { if (!r.trim()) return toast('A resolution is needed to close'); saveTicket({ id: t.id, stage, resolution: r.trim(), closed: Date.now(), history: [...(t.history || []), { ts: Date.now(), from: t.stage, to: stage }] }); closeModal(); toast('Ticket closed'); }}>Close ticket</button></>}>
    <Field label="Resolution"><textarea class="in" autoFocus rows={3} value={r} onInput={e => setR((e.target as HTMLTextAreaElement).value)} /></Field></Sheet>;
}
function TicketCard({ t }: { t: Ticket }) {
  const types = ticketCfg().types, over = !isClosedT(t) && t.due && t.due < todayKey();
  return <div class="item" draggable onDragStart={e => e.dataTransfer?.setData('text/ticket', t.id)} onClick={() => go('tickets', t.id)} style={{ cursor: 'pointer' }}>
    <div class="main"><div class="t">{t.subject || '(no subject)'}</div>
      <div class="s">{t.deal ? t.deal + ' · ' : ''}{ticketStageName(t)} · {fmtDay(keyOf(new Date(t.created)))}</div>
      <div class="pills">{(t.tt || []).slice(0, 2).map(x => <span class="pill acc">{typeLabel(x, types)}</span>)}{t.priority && /High|Urgent/.test(t.priority) && <span class="pill warn">{t.priority}</span>}{over && <span class="pill bad">Overdue</span>}{t.auto && <span class="pill">Day End</span>}</div>
    </div>
    <IconBtn icon="dots" title="More" onClick={e => openMenu(e, [...(ticketCfg().pipelines.find(x => x.id === t.pipeline) || ticketCfg().pipelines[0]).stages.filter(s => s.id !== t.stage).map(s => ({ label: 'Move to ' + s.name, fn: () => moveTicket(t, s.id) })), { sep: true, label: '' }, { label: 'Delete', danger: true, fn: () => { removeTicket(t); toast('Ticket deleted'); } }])} />
  </div>;
}
function TicketTable({ list }: { list: Ticket[] }) {
  const types = ticketCfg().types; if (!list.length) return <Empty>No tickets match.</Empty>;
  return <div class="tw"><table class="table"><thead><tr><th>Subject</th><th>Type</th><th>Deal</th><th>Stage</th><th>Priority</th><th>Created</th></tr></thead><tbody>{list.map(t => <tr style={{ cursor: 'pointer' }} onClick={() => go('tickets', t.id)}><td><b>{t.subject}</b></td><td>{(t.tt || []).map(x => typeLabel(x, types)).join(', ')}</td><td>{t.deal}</td><td>{ticketStageName(t)}</td><td>{t.priority}</td><td class="mono">{keyOf(new Date(t.created))}</td></tr>)}</tbody></table></div>;
}
function TicketFilters() {
  const v = V.value, cfg = ticketCfg();
  return <Sheet title="Filters & more" onClose={closeModal} foot={<><Btn onClick={() => { V.value = { ...V.value, pri: '', show: 'all' }; }}>Clear</Btn><button class="b-add" onClick={closeModal}>Done</button></>}>
    <div class="form">
      <Field label="Show"><select class="in" value={v.show} onChange={e => { V.value = { ...V.value, show: (e.target as HTMLSelectElement).value as any }; }}><option value="all">All tickets</option><option value="open">Open</option><option value="closed">Closed</option></select></Field>
      <Field label="Priority"><select class="in" value={v.pri} onChange={e => { V.value = { ...V.value, pri: (e.target as HTMLSelectElement).value }; }}><option value="">Any</option>{cfg.pris.map(p => <option value={p}>{p}</option>)}</select></Field>
    </div>
    <div class="sep" /><div class="ctl" style={{ flexWrap: 'wrap' }}>
      <Btn onClick={() => { closeModal(); openModal(() => <TypesEditor />); }}>Edit types</Btn>
      <Btn onClick={() => { closeModal(); openModal(() => <StagesEditor />); }}>Edit stages</Btn>
      <Btn icon="down" onClick={() => download('tickets.csv', csv([['No', 'Subject', 'Types', 'Deal', 'Stage', 'Priority', 'Category', 'Source', 'Created', 'Due', 'Closed', 'Resolution'], ...tickets().map(t => [t.no || '', t.subject, (t.tt || []).map(x => typeLabel(x, cfg.types)).join('; '), t.deal, ticketStageName(t), t.priority, t.category, t.source, keyOf(new Date(t.created)), t.due, t.closed ? keyOf(new Date(t.closed)) : '', t.resolution])]))}>Export CSV</Btn>
      <Btn icon="copy" onClick={async () => { const L = tickets().filter(t => !isClosedT(t)); toast((await copyText(['Tickets Report — ' + fmtDay(todayKey(), true), '', 'Open: ' + L.length, ...L.map((t, i) => (i + 1) + '. ' + t.subject + (t.deal ? ' — ' + t.deal : '') + ' (' + ticketStageName(t) + ')')].join('\n'))) ? 'Report copied' : 'Copy failed'); }}>Copy report</Btn>
    </div></Sheet>;
}
function TypesEditor() {
  const [types, setTypes] = useState<TType[]>(ticketCfg().types);
  const save = (l: TType[]) => { setTypes(l); saveTicketCfg({ types: l }); };
  return <Sheet title="Ticket types" onClose={closeModal} foot={<Add onClick={() => save([...types, { id: uid('ty-'), name: 'New type', subs: DEF_SUBS.slice(), rules: [], defSub: 'Physical' }])}>Type</Add>}>
    <p class="faint" style={{ fontSize: '.76rem' }}>Words that file a ticket under a type (comma separated). Plain “Demo” counts as Physical Demo.</p>
    {types.map((t, i) => <div class="card" style={{ marginTop: '8px' }}><div class="form">
      <Field label="Name"><input class="in" value={t.name} onChange={e => save(types.map((x, j) => (j === i ? { ...x, name: (e.target as HTMLInputElement).value } : x)))} /></Field>
      <Field label="Sub-types"><input class="in" value={t.subs.join(', ')} onChange={e => save(types.map((x, j) => (j === i ? { ...x, subs: (e.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean) } : x)))} /></Field>
      <Field label="Words" full><input class="in" value={(t.rules || []).join(', ')} onChange={e => save(types.map((x, j) => (j === i ? { ...x, rules: (e.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean) } : x)))} /></Field>
    </div><DangerBtn onConfirm={() => save(types.filter((_, j) => j !== i))}>Remove type</DangerBtn></div>)}
  </Sheet>;
}
function StagesEditor() {
  const cfg = ticketCfg(); const [p, setP] = useState(cfg.pipelines[0]);
  const save = (np: typeof p) => { setP(np); saveTicketCfg({ pipelines: [np, ...cfg.pipelines.slice(1)] }); };
  return <Sheet title="Ticket stages" onClose={closeModal} foot={<Add onClick={() => save({ ...p, stages: [...p.stages.slice(0, -1), { id: uid('s'), name: 'New stage' }, ...p.stages.slice(-1)] })}>Stage</Add>}>
    {p.stages.map((s, i) => <div class="ctl"><input class="in grow" value={s.name} onChange={e => save({ ...p, stages: p.stages.map((x, j) => (j === i ? { ...x, name: (e.target as HTMLInputElement).value } : x)) })} /><span class="faint" style={{ fontSize: '.72rem' }}>{s.closed ? 'closed' : ''}</span>{!s.closed && <DangerBtn onConfirm={() => { if (tickets().some(t => t.stage === s.id)) return toast('Move the tickets out of this stage first'); save({ ...p, stages: p.stages.filter((_, j) => j !== i) }); }}>Remove</DangerBtn>}</div>)}
    <p class="faint" style={{ fontSize: '.76rem' }}>Today and Closed this month fill themselves.</p>
  </Sheet>;
}
export function TicketForm({ pre }: { pre: Partial<Ticket> }) {
  const cfg = ticketCfg(), p = cfg.pipelines[0];
  const [f, setF] = useState<Partial<Ticket>>({ subject: '', desc: '', deal: '', priority: cfg.pris[1] || cfg.pris[0], category: '', source: 'Call', due: '', stage: p.stages[0].id, tt: [], ...pre });
  const s = (k: keyof Ticket) => (e: Event) => setF({ ...f, [k]: (e.target as HTMLInputElement).value });
  const save = () => { if (!String(f.subject || '').trim()) return toast('Add a subject'); const tt = f.tt && f.tt.length ? f.tt : classify([f.subject, f.desc, f.deal].join(' '), f.category || ''); saveTicket({ ...f, tt, pipeline: f.pipeline || p.id, notes: f.notes || [], history: f.history || [] }); closeModal(); toast(pre.id ? 'Ticket saved' : 'Ticket added'); };
  const names = Array.from(new Set(deals().map(d => d.name))).slice(0, 400);
  return <Sheet title={pre.id ? 'Edit ticket' : 'New ticket'} onClose={closeModal} foot={<><Btn onClick={closeModal}>Cancel</Btn><button class="b-add" onClick={save}>Save</button></>}>
    <div class="form">
      <Field label="Subject" full><input class="in" autoFocus value={f.subject} onInput={s('subject')} /></Field>
      <Field label="Deal"><input class="in" list="dealnames" value={f.deal} onInput={s('deal')} /><datalist id="dealnames">{names.map(n => <option value={n} />)}</datalist></Field>
      <Field label="Type"><select class="in" value={(f.tt && f.tt[0] && f.tt[0].t) || ''} onChange={e => { const id = (e.target as HTMLSelectElement).value, ty = cfg.types.find(x => x.id === id); setF({ ...f, tt: ty ? [{ t: id, s: ty.defSub }] : [] }); }}><option value="">Detect from text</option>{cfg.types.map(t => <option value={t.id}>{t.name}</option>)}</select></Field>
      {f.tt && f.tt[0] && <Field label="Sub-type"><select class="in" value={f.tt[0].s} onChange={e => setF({ ...f, tt: [{ t: f.tt![0].t, s: (e.target as HTMLSelectElement).value }, ...f.tt!.slice(1)] })}>{(cfg.types.find(x => x.id === f.tt![0].t)?.subs || []).map(x => <option value={x}>{x}</option>)}</select></Field>}
      <Field label="Stage"><select class="in" value={f.stage} onChange={s('stage')}>{p.stages.map(x => <option value={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Priority"><select class="in" value={f.priority} onChange={s('priority')}>{cfg.pris.map(x => <option value={x}>{x}</option>)}</select></Field>
      <Field label="Category"><select class="in" value={f.category} onChange={s('category')}><option value="">—</option>{cfg.cats.map(x => <option value={x}>{x}</option>)}</select></Field>
      <Field label="Due"><input class="in" type="date" value={f.due} onInput={s('due')} /></Field>
      <Field label="Description" full><textarea class="in" rows={3} value={f.desc} onInput={s('desc')} /></Field>
    </div></Sheet>;
}
function TicketRecord({ t }: { t: Ticket }) {
  const [note, setNote] = useState(''); const cfg = ticketCfg(), p = cfg.pipelines.find(x => x.id === t.pipeline) || cfg.pipelines[0];
  const tl = [...(t.notes || []).map(n => ({ ts: n.ts, txt: n.text, k: 'Note' })), ...(t.history || []).map(h => ({ ts: h.ts, txt: (p.stages.find(s => s.id === h.from)?.name || '—') + ' → ' + (p.stages.find(s => s.id === h.to)?.name || '—'), k: 'Stage' }))].sort((a, b) => b.ts - a.ts);
  return <div class="page">
    <div class="ctl"><Btn icon="left" onClick={() => go('tickets')}>Tickets</Btn></div>
    <PageHead icon="ticket" title={t.subject || '(no subject)'} sub={<>{ticketStageName(t)} · {(t.tt || []).map(x => typeLabel(x, cfg.types)).join(', ')}{t.deal ? ' · ' + t.deal : ''}</>} right={<><Btn icon="edit" onClick={() => openModal(() => <TicketForm pre={t} />)}>Edit</Btn><DangerBtn onConfirm={() => { removeTicket(t); go('tickets'); }}>Delete</DangerBtn></>} />
    <div class="grid2">
      <div class="card"><div class="lbl">Details</div>
        <div class="form" style={{ marginTop: '8px' }}>
          <Field label="Stage"><select class="in" value={t.stage} onChange={e => moveTicket(t, (e.target as HTMLSelectElement).value)}>{p.stages.map(s => <option value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Priority"><select class="in" value={t.priority} onChange={e => saveTicket({ id: t.id, priority: (e.target as HTMLSelectElement).value })}>{cfg.pris.map(x => <option value={x}>{x}</option>)}</select></Field>
          <Field label="Due"><input class="in" type="date" value={t.due} onChange={e => saveTicket({ id: t.id, due: (e.target as HTMLInputElement).value })} /></Field>
          <Field label="Deal">{t.deal ? <button class="b" onClick={() => { const d = deals().find(x => x.name.toLowerCase() === t.deal.toLowerCase()); if (d) go('dealboard', d.key); else toast('No deal with that name yet'); }}>{t.deal}</button> : <span class="faint">—</span>}</Field>
        </div>
        {t.desc && <p style={{ whiteSpace: 'pre-wrap', fontSize: '.84rem', overflowWrap: 'anywhere' }}>{t.desc}</p>}
        {t.resolution && <><div class="lbl">Resolution</div><p style={{ fontSize: '.84rem' }}>{t.resolution}</p></>}
        <div class="faint mono" style={{ fontSize: '.7rem' }}>Created {fmtDay(keyOf(new Date(t.created)))} {h12(t.created)}{t.closed ? ' · closed ' + fmtDay(keyOf(new Date(t.closed))) : ''}</div>
      </div>
      <div class="card"><div class="lbl">Timeline</div>
        <div class="ctl" style={{ marginTop: '8px' }}><input class="in grow" placeholder="Add a note" value={note} onInput={e => setNote((e.target as HTMLInputElement).value)} onKeyDown={e => { if (e.key === 'Enter' && note.trim()) { saveTicket({ id: t.id, notes: [...(t.notes || []), { ts: Date.now(), text: note.trim() }] }); setNote(''); } }} /><Add onClick={() => { if (note.trim()) { saveTicket({ id: t.id, notes: [...(t.notes || []), { ts: Date.now(), text: note.trim() }] }); setNote(''); } }}>Note</Add></div>
        {tl.map(x => <div class="item"><div class="main"><div class="s">{fmtDay(keyOf(new Date(x.ts)))} {h12(x.ts)} · {x.k}</div><div style={{ fontSize: '.84rem' }}>{x.txt}</div></div></div>)}{!tl.length && <Empty>No notes yet.</Empty>}
      </div>
    </div>
  </div>;
}
