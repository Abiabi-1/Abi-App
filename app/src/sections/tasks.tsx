// Tasks: folders (drop-down), day navigation like Day End, message tasks with the 2 x 2 WhatsApp/Email + tick filter.
import { signal } from '@preact/signals';
import { useState } from 'preact/hooks';
import { rev, put, get } from '../data/store';
import { Task, allTasks, folders, saveTask, setTaskDone, removeTask, bestHours, MSG_FOLDERS } from '../domain/crm';
import { fmtDay, lsJSON, lsSet, shiftDayKey, todayKey, cx, isKey, uid, csv, download } from '../lib/util';
import { Add, Btn, Chips, DangerBtn, Field, IconBtn, MarkGrid, PageHead, SearchBox, Seg, Sheet, Stat, Tiles, closeModal, openMenu, openModal, toast, Empty } from '../ui/kit';

type MF = { wa: string; em: string; twa: string; tem: string };
const mf = signal<MF>(lsJSON<MF>('hub_tk_mf', { wa: '', em: '', twa: '', tem: '' }));
const V = signal({ folder: '__all', show: 'open' as 'open' | 'done' | 'all', day: '', q: '', sel: [] as string[] });

export function openTaskForm(pre: Partial<Task> = {}) {
  openModal(() => <TaskForm pre={pre} />);
}
function TaskForm({ pre }: { pre: Partial<Task> }) {
  const [t, setT] = useState<Partial<Task>>({ title: '', notes: '', due: shiftDayKey(todayKey(), 1), time: '', priority: 'normal', folder: '', ...pre });
  const save = () => { if (!String(t.title || '').trim()) return toast('Give the task a title'); saveTask(t); closeModal(); toast(pre.id ? 'Task saved' : 'Task added'); };
  const f = (k: keyof Task) => (e: Event) => setT({ ...t, [k]: (e.target as HTMLInputElement).value });
  return <Sheet title={pre.id ? 'Edit task' : 'New task'} onClose={closeModal} foot={<><Btn onClick={closeModal}>Cancel</Btn><button class="b-add" onClick={save}>Save</button></>}>
    <div class="form">
      <Field label="Title" full><input class="in" autoFocus value={t.title} onInput={f('title')} onKeyDown={e => e.key === 'Enter' && save()} /></Field>
      <Field label="Due date"><input class="in" type="date" value={t.due} onInput={f('due')} /></Field>
      <Field label="Time"><input class="in" type="time" value={t.time} onInput={f('time')} /></Field>
      <Field label="Priority"><select class="in" value={t.priority} onChange={f('priority')}>{['low', 'normal', 'high'].map(p => <option value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}</select></Field>
      <Field label="Folder"><select class="in" value={t.folder || ''} onChange={f('folder')}>{folders().map(x => <option value={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Deal"><input class="in" value={t.deal || ''} onInput={f('deal')} /></Field>
      <Field label="Reminder"><select class="in" value={String(t.remind ? 1 : 0)} onChange={e => setT({ ...t, remind: (e.target as HTMLSelectElement).value === '1' ? 1 : null })}><option value="0">Off</option><option value="1">At the due time</option></select></Field>
      <Field label="Notes" full><textarea class="in" rows={3} value={t.notes} onInput={f('notes')} /></Field>
    </div>
  </Sheet>;
}
function FolderSheet() {
  const [list, setList] = useState(((get<any>('cfg', 'folders') || {}).list || []) as { id: string; name: string }[]);
  const [n, setN] = useState('');
  const save = (l: typeof list) => { setList(l); put('cfg', 'folders', { list: l }); };
  return <Sheet title="Folders" onClose={closeModal}>
    {list.map((f, i) => <div class="item"><input class="in" value={f.name} onChange={e => save(list.map((x, j) => (j === i ? { ...x, name: (e.target as HTMLInputElement).value } : x)))} /><DangerBtn onConfirm={() => save(list.filter((_, j) => j !== i))}>Delete</DangerBtn></div>)}
    <div class="ctl" style={{ marginTop: '10px' }}><input class="in grow" placeholder="New folder name" value={n} onInput={e => setN((e.target as HTMLInputElement).value)} /><Add onClick={() => { if (n.trim()) { save([...list, { id: uid('cf_'), name: n.trim() }]); setN(''); } }}>Add</Add></div>
    <p class="faint" style={{ fontSize: '.75rem' }}>WhatsApp Today, Email Today and the two “unable” folders are filled automatically from Day End.</p>
  </Sheet>;
}

export function Tasks() {
  void rev.value; const v = V.value, m = mf.value, td = todayKey();
  const all = allTasks(), fl = folders();
  const msgOn = !!(m.wa || m.em || m.twa || m.tem);
  const inFolder = (t: Task) => v.folder === '__all' || (t.folder || '') === v.folder;
  const passMsg = (t: Task) => {
    if (!msgOn) return true; if (!t.msg) return false;
    const ch = t.msg.ch.replace(/^n/, ''), bad = t.msg.ch.charAt(0) === 'n';
    const want = (k: 'wa' | 'em') => m[k] ? ch === k && (m[k] === 'g' ? !bad : bad) : false;
    const tick = (k: 'wa' | 'em') => { const s = m[('t' + k) as 'twa' | 'tem']; return s ? ch === k && (s === 'g' ? t.done : !t.done) : false; };
    return want('wa') || want('em') || tick('wa') || tick('em');
  };
  const q = v.q.trim().toLowerCase();
  let list = all.filter(t => inFolder(t) && passMsg(t) && (v.show === 'all' || (v.show === 'done' ? t.done : !t.done)) && (!v.day || t.due === v.day) && (!q || (t.title + ' ' + (t.notes || '') + ' ' + (t.deal || '')).toLowerCase().indexOf(q) >= 0));
  const hrs = bestHours();
  list = list.sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || (a.due || '9999').localeCompare(b.due || '9999') || (a.time || '').localeCompare(b.time || '') || (hrs.indexOf(new Date(a.created).getHours()) - hrs.indexOf(new Date(b.created).getHours())));
  const open = all.filter(t => !t.done), overdue = open.filter(t => t.due && t.due < td), today = open.filter(t => t.due === td);
  const days = Array.from(new Set(all.map(t => t.due).filter(isKey))).sort().reverse().slice(0, 40);
  const set = (p: Partial<typeof v>) => { V.value = { ...v, ...p }; };
  const setM = (x: MF) => { mf.value = x; lsSet('hub_tk_mf', JSON.stringify(x)); };
  const sel = new Set(v.sel);
  return <div class="page">
    <PageHead icon="tasks" title="Tasks" sub="Follow-ups, message tasks and reminders" right={<Add onClick={() => openTaskForm({ folder: v.folder.indexOf('__') === 0 ? '' : v.folder })}>New task</Add>} />
    <Tiles><Stat l="Open" v={open.length} onClick={() => set({ show: 'open', day: '' })} /><Stat l="Due today" v={today.length} tone={today.length ? 'acc' : ''} onClick={() => set({ day: td, show: 'open' })} /><Stat l="Overdue" v={overdue.length} tone={overdue.length ? 'bad' : ''} c={overdue.length ? 'oldest ' + fmtDay(overdue.map(t => t.due).sort()[0]) : 'none'} /><Stat l="Done today" v={all.filter(t => t.done && t.doneAt && new Date(t.doneAt).toDateString() === new Date().toDateString()).length} tone="good" /></Tiles>
    <div class="ctl" style={{ marginTop: '10px' }}>
      <select class="in" style={{ width: 'auto', maxWidth: '200px' }} value={v.folder} onChange={e => set({ folder: (e.target as HTMLSelectElement).value })} aria-label="Folder">
        <option value="__all">All folders ({open.length})</option>{fl.map(f => <option value={f.id}>{f.name} ({open.filter(t => (t.folder || '') === f.id).length})</option>)}
      </select>
      <MarkGrid wa={m.wa} em={m.em} twa={m.twa === 'g' ? 'y' : m.twa === 'r' ? 'n' : ''} tem={m.tem === 'g' ? 'y' : m.tem === 'r' ? 'n' : ''} onMark={k => setM({ ...m, [k]: m[k] === '' ? 'g' : m[k] === 'g' ? 'r' : '' })} onTick={k => { const kk = ('t' + k) as 'twa' | 'tem'; setM({ ...m, [kk]: m[kk] === '' ? 'g' : m[kk] === 'g' ? 'r' : '' }); }} />
      <SearchBox value={v.q} onInput={x => set({ q: x })} ph="Search tasks" />
      <button class="b" onClick={e => openMenu(e, [{ label: 'Manage folders', fn: () => openModal(() => <FolderSheet />) }, { label: 'Export CSV', fn: () => download('tasks.csv', csv([['Title', 'Due', 'Time', 'Folder', 'Priority', 'Done', 'Deal', 'Notes'], ...list.map(t => [t.title, t.due, t.time, fl.find(f => f.id === (t.folder || ''))?.name || '', t.priority, t.done ? 'yes' : '', t.deal || '', t.notes])])) }, { label: 'Clear message filter', fn: () => setM({ wa: '', em: '', twa: '', tem: '' }) }])}>Filters &amp; more</button>
    </div>
    <div class="ctl">
      <Seg value={v.show} onChange={x => set({ show: x })} opts={[['open', 'Open'], ['done', 'Done'], ['all', 'All']]} />
      <IconBtn icon="left" title="Previous day" onClick={() => set({ day: shiftDayKey(v.day || td, -1) })} />
      <div class="row-scroll grow"><button class={cx('chip', !v.day && 'on')} onClick={() => set({ day: '' })}>All days</button>{days.map(k => <button class={cx('chip mono', v.day === k && 'on')} onClick={() => set({ day: k })}>{k === td ? 'Today' : fmtDay(k)}</button>)}</div>
      <IconBtn icon="right" title="Next day" onClick={() => set({ day: shiftDayKey(v.day || td, 1) })} />
    </div>
    {sel.size > 0 && <div class="ctl"><span class="faint">{sel.size} selected</span><Btn icon="check" onClick={() => { all.filter(t => sel.has(t.id)).forEach(t => setTaskDone(t, true)); set({ sel: [] }); }}>Mark done</Btn><Btn onClick={() => set({ sel: [] })}>Clear</Btn></div>}
    {list.length ? list.map(t => <TaskRow t={t} sel={sel.has(t.id)} onSel={() => set({ sel: sel.has(t.id) ? v.sel.filter(x => x !== t.id) : [...v.sel, t.id] })} />) : <Empty>No tasks here.</Empty>}
  </div>;
}
function TaskRow({ t, sel, onSel }: { t: Task; sel: boolean; onSel: () => void }) {
  const td = todayKey(), over = !t.done && t.due && t.due < td, fname = folders().find(f => f.id === (t.folder || ''))?.name;
  const ch = t.msg ? t.msg.ch.replace(/^n/, '') : '', bad = t.msg ? t.msg.ch.charAt(0) === 'n' : false;
  return <div class={cx('item', t.done && 'done')}>
    <input type="checkbox" class="ck" checked={sel} onChange={onSel} aria-label="Select" />
    <div class="main"><div class="t">{t.title}</div>
      <div class="pills">{t.due && <span class={cx('pill', over ? 'bad' : t.due === td ? 'acc' : '')}>{t.due === td ? 'Today' : fmtDay(t.due)}{t.time ? ' ' + t.time : ''}</span>}{fname && <span class="pill">{fname}</span>}{t.priority === 'high' && <span class="pill warn">High</span>}{ch && <span class={cx('pill', bad ? 'bad' : 'good')}>{ch === 'wa' ? 'WhatsApp' : 'Email'}{bad ? ' – unable' : ''}</span>}</div>
      {t.notes && <div class="n">{t.notes}</div>}
    </div>
    <div class="acts">
      <IconBtn icon="check" title={t.done ? 'Mark open' : 'Mark done'} on={t.done} onClick={() => setTaskDone(t, !t.done)} />
      <IconBtn icon="dots" title="More" onClick={e => openMenu(e, [
        !t.msg && { label: 'Edit', icon: 'edit', fn: () => openTaskForm(t) },
        { label: 'Snooze to tomorrow', fn: () => put('tasks', t.id, { due: shiftDayKey(td, 1) }) },
        { label: 'Snooze 1 week', fn: () => put('tasks', t.id, { due: shiftDayKey(td, 7) }) },
        ...folders().filter(f => f.id !== (t.folder || '') && !MSG_FOLDERS.some(m => m.id === f.id)).map(f => ({ label: 'Move to ' + f.name, fn: () => put('tasks', t.id, { folder: f.id }) })),
        { sep: true, label: '' },
        !t.msg && { label: 'Delete', danger: true, icon: 'trash', fn: () => { removeTask(t.id); toast('Task deleted', { label: 'Undo', fn: () => import('../data/store').then(m => m.restore('tasks', t.id)) }); } },
      ])} />
    </div>
  </div>;
}
