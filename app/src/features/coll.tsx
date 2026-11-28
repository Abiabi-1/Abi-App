// One list + editor for every schema-driven list (HR lists, tools). Same field definitions as the old app's HR module.
// Privacy: there are no phone / e-mail field kinds; text goes through the app's cleaner on save.
import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { all, put, del, restore, rev } from '../data/store';
import { stripText } from '../lib/privacy';
import { cx, csv, download, fmtDay, fmtNum, isKey, todayKey, addDays, uid } from '../lib/util';
import { Btn, Empty, Field, IconBtn, SearchBox, Sheet, Switch, closeModal, openModal, toast } from '../ui/kit';

export type FKind = 'text' | 'textarea' | 'select' | 'date' | 'time' | 'number' | 'check' | 'month';
export interface FDef { k: string; label: string; type?: FKind; opts?: string[] | (() => string[]); req?: boolean; value?: string | (() => string) }
export interface CDef { label: string; ttl: string; sub: string[]; date?: string; sum?: string; prog?: string; check?: string; exp?: string; f: FDef[]; hint?: string }
export interface Item { id: string; [k: string]: any }

const optsOf = (f: FDef) => (typeof f.opts === 'function' ? f.opts() : f.opts || []);
const defOf = (f: FDef) => (typeof f.value === 'function' ? f.value() : f.value);

/** records of one list; collection `c`, optionally filtered by the `col` field (HR lists share one collection). */
export function items(c: string, col?: string): Item[] { void rev.value; return all<Item>(c).filter(x => !col || x.col === col); }
export function saveItem(c: string, col: string | undefined, v: Record<string, any>, id?: string) {
  const out: Record<string, any> = {}; let cut = 0;
  Object.keys(v).forEach(k => { const x = v[k]; if (typeof x === 'string') { const r = stripText(x); cut += r.n; out[k] = r.s; } else out[k] = x; });
  if (cut) toast('Phone numbers & e-mails aren’t stored – they were left out');
  const rid = id || uid(col ? col.slice(0, 3) : 'i'); put(c, rid, { ...(col ? { col } : {}), ...out, ...(id ? {} : { created: Date.now() }) }); return rid;
}
export function removeItem(c: string, id: string, label = 'Deleted') { del(c, id); toast(label, { label: 'Undo', fn: () => restore(c, id) }); }

export function editItem(def: CDef, c: string, col: string | undefined, cur?: Item, onSaved?: (id: string, v: Record<string, any>) => void) {
  openModal(() => <ItemForm def={def} c={c} col={col} cur={cur} onSaved={onSaved} />);
}
function ItemForm({ def, c, col, cur, onSaved }: { def: CDef; c: string; col?: string; cur?: Item; onSaved?: (id: string, v: Record<string, any>) => void }) {
  const [v, setV] = useState<Record<string, any>>(() => { const o: Record<string, any> = {}; def.f.forEach(f => { o[f.k] = cur ? cur[f.k] ?? '' : defOf(f) ?? (f.type === 'date' && f.req ? todayKey() : f.type === 'check' ? false : f.type === 'select' ? optsOf(f)[0] || '' : ''); }); return o; });
  const set = (k: string, x: any) => setV(o => ({ ...o, [k]: x }));
  const save = () => {
    for (const f of def.f) if (f.req && (v[f.k] === '' || v[f.k] == null)) return toast('Please fill: ' + f.label);
    const out: Record<string, any> = {}; def.f.forEach(f => { const x = v[f.k]; out[f.k] = f.type === 'number' ? (x === '' || x == null ? '' : +x) : f.type === 'check' ? !!x : typeof x === 'string' ? x.trim() : x; });
    const id = saveItem(c, col, out, cur?.id); closeModal(); toast(cur ? 'Saved' : 'Added'); onSaved?.(id, out);
  };
  return <Sheet title={(cur ? 'Edit · ' : 'Add · ') + def.label} onClose={closeModal} foot={<><Btn onClick={closeModal}>Cancel</Btn><button type="button" class="b-add" onClick={save}>{cur ? 'Save' : 'Add'}</button></>}>
    <div class="form coll-form">{def.f.map(f => <Field label={f.label + (f.req ? ' *' : '')} full={f.type === 'textarea'}>{input(f, v[f.k], x => set(f.k, x), save)}</Field>)}</div>
    {def.hint && <p class="faint" style={{ fontSize: '.75rem' }}>{def.hint}</p>}
  </Sheet>;
}
function input(f: FDef, val: any, on: (v: any) => void, enter: () => void) {
  const t = f.type || 'text', s = val == null ? '' : String(val), key = (e: KeyboardEvent) => { if (e.key === 'Enter' && t !== 'textarea') { e.preventDefault(); enter(); } };
  if (t === 'textarea') return <textarea class="in" data-f={f.k} rows={3} value={s} onInput={e => on((e.target as HTMLTextAreaElement).value)} />;
  if (t === 'select') { const o = optsOf(f); return <select class="in" data-f={f.k} value={s} onChange={e => on((e.target as HTMLSelectElement).value)}>{o.map(x => <option value={x}>{x}</option>)}{s && o.indexOf(s) < 0 && <option value={s}>{s}</option>}</select>; }
  if (t === 'check') return <Switch on={!!val} onChange={on} label={f.label} />;
  return <input class="in" data-f={f.k} type={t === 'text' ? 'text' : t} inputMode={t === 'number' ? 'decimal' : undefined} step={t === 'number' ? 'any' : undefined} value={s} onInput={e => on((e.target as HTMLInputElement).value)} onKeyDown={key} />;
}

const show = (f: FDef | undefined, x: any) => { if (x === '' || x == null || x === false) return ''; if (f?.type === 'date' && isKey(x)) return fmtDay(x); if (f?.type === 'check') return '✓ ' + f.label; if (f?.type === 'number') return f.label.replace(/\s*\(.*\)$/, '') + ' ' + fmtNum(+x); return String(x); };

/** the list: search, add, edit, delete (undo), total, progress, tick, expiry badge, CSV. */
export function CollList(p: { def: CDef; c: string; col?: string; filter?: (x: Item) => boolean; extra?: (x: Item) => ComponentChildren; head?: ComponentChildren; onSaved?: (id: string, v: Record<string, any>) => void; addLabel?: string; compact?: boolean }) {
  const { def } = p; const [q, setQ] = useState('');
  let L = items(p.c, p.col); if (p.filter) L = L.filter(p.filter);
  const t = q.trim().toLowerCase(); if (t) L = L.filter(x => def.f.some(f => String(x[f.k] ?? '').toLowerCase().indexOf(t) >= 0));
  L = L.slice().sort((a, b) => (def.date ? String(b[def.date] || '').localeCompare(String(a[def.date] || '')) : 0) || ((b.created || 0) - (a.created || 0)));
  const fd = (k: string) => def.f.find(f => f.k === k), td = todayKey();
  const total = def.sum ? L.reduce((n, x) => n + (+x[def.sum!] || 0), 0) : 0;
  const exportCsv = () => download(def.label.toLowerCase().replace(/\W+/g, '-') + '.csv', csv([def.f.map(f => f.label), ...L.map(x => def.f.map(f => x[f.k] ?? ''))]));
  return <div class="coll" data-coll={p.col || p.c}>
    <div class="ctl"><SearchBox value={q} onInput={setQ} ph={'Search ' + def.label.toLowerCase()} />{p.head}<IconBtn icon="down" title="Export CSV" onClick={exportCsv} /><button type="button" class="b-add" onClick={() => editItem(def, p.c, p.col, undefined, p.onSaved)}>+ {p.addLabel || 'Add'}</button></div>
    {def.sum && L.length > 0 && <div class="faint coll-sum">Total {fmtNum(total)} · {L.length} item{L.length === 1 ? '' : 's'}</div>}
    {L.length ? L.map(x => {
      const exp = def.exp && isKey(x[def.exp]) ? x[def.exp] : '', expired = exp && exp < td, soon = exp && !expired && exp <= addDays(td, 30);
      return <div class={cx('item coll-it', def.check && x[def.check] && 'done')}>
        {def.check && <input type="checkbox" class="ck" aria-label={'Mark ' + (fd(def.check)?.label || 'done')} checked={!!x[def.check]} onChange={e => put(p.c, x.id, { [def.check!]: (e.target as HTMLInputElement).checked })} />}
        <div class="main" onClick={() => editItem(def, p.c, p.col, x, p.onSaved)} style={{ cursor: 'pointer' }}>
          <div class="t">{String(x[def.ttl] || '(untitled)')}{expired ? <span class="pill bad" style={{ marginLeft: '6px' }}>expired</span> : soon ? <span class="pill warn" style={{ marginLeft: '6px' }}>expires soon</span> : null}</div>
          <div class="s">{def.sub.map(k => show(fd(k), x[k])).filter(Boolean).join(' · ')}</div>
          {def.prog && <div class="coll-prog" aria-label={'Progress ' + (+x[def.prog] || 0) + '%'}><i style={{ width: Math.max(0, Math.min(100, +x[def.prog] || 0)) + '%' }} /></div>}
          {!p.compact && (x.note || x.body || x.summary) && <div class="n">{x.note || x.body || x.summary}</div>}
          {p.extra?.(x)}
        </div>
        <div class="acts"><IconBtn icon="edit" sm title="Edit" onClick={() => editItem(def, p.c, p.col, x, p.onSaved)} /><IconBtn icon="trash" sm bad title="Delete" onClick={() => removeItem(p.c, x.id)} /></div>
      </div>;
    }) : <Empty>{t ? 'No matches.' : 'Nothing here yet. Press “+ ' + (p.addLabel || 'Add') + '” to add the first one.'}</Empty>}
  </div>;
}
