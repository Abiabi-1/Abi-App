// App-wide helpers that the old app had: the "due today" notice + Today pop-up, the weekly backup reminder,
// and the scroll to top / bottom buttons.
import { signal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import { rev, put } from '../data/store';
import { allTasks, deals, wonDeals, renewalOf, markRenewed, setTaskDone } from '../domain/crm';
import { status } from '../domain/hr';
import { backup } from '../data/backup';
import { addDays, dur, fmtDay, lsGet, lsSet, todayKey } from '../lib/util';
import { Btn, Empty, Sheet, closeModal, openModal, toast } from './kit';
import { go } from './state';
import { Icon } from './icons';

function todayData() {
  const td = todayKey(), open = allTasks().filter(t => !t.done);
  const due = open.filter(t => t.due && t.due <= td && !t.msg), over = due.filter(t => t.due < td);
  const fol = deals().filter(d => d.follow && d.follow <= td);
  const ren = wonDeals().map(w => ({ w, r: renewalOf(w) })).filter(x => x.r.paid && x.r.due && x.r.due <= addDays(td, 7));
  return { td, due, over, fol, ren };
}
export function openToday() { openModal(() => <TodaySheet />); }
function TodaySheet() {
  void rev.value; const D = todayData(), st = status();
  return <Sheet title={'Today · ' + fmtDay(D.td)} onClose={closeModal} wide>
    <div class="lbl">Time clock</div>
    <p class="muted" style={{ margin: '4px 0 12px' }}>{st.state === 'out' ? 'Clocked out' : st.state === 'break' ? 'On break' : 'Clocked in'}{st.c.n ? ' · worked ' + dur(st.c.worked, true) : ''}</p>
    <div class="lbl">Tasks due or overdue ({D.due.length})</div>
    {D.due.length ? D.due.map(t => <div class="item"><input type="checkbox" class="ck" checked={t.done} onChange={() => setTaskDone(t, true)} aria-label="Done" /><div class="main"><div class="t">{t.title}</div><div class="s">{t.due < D.td ? 'Overdue · ' : ''}{fmtDay(t.due)}{t.time ? ' ' + t.time : ''}</div></div><Btn onClick={() => put('tasks', t.id, { due: addDays(D.td, 1) })}>Tomorrow</Btn></div>) : <Empty>Nothing due.</Empty>}
    <div class="lbl" style={{ marginTop: '12px' }}>Deal follow-ups ({D.fol.length})</div>
    {D.fol.length ? D.fol.map(d => <div class="item" style={{ cursor: 'pointer' }} onClick={() => { closeModal(); go('dealboard', d.key); }}><div class="main"><div class="t">{d.name}</div><div class="s">follow-up {fmtDay(d.follow)} · {d.stage}</div></div></div>) : <Empty>No follow-ups due.</Empty>}
    <div class="lbl" style={{ marginTop: '12px' }}>Renewals in the next 7 days or overdue ({D.ren.length})</div>
    {D.ren.length ? D.ren.map(x => <div class="item"><div class="main"><div class="t">{x.w.deal}</div><div class="s">due {fmtDay(x.r.due)}</div></div><Btn onClick={() => { markRenewed(x.w); toast('Marked renewed'); }}>Mark renewed</Btn></div>) : <Empty>No renewals due.</Empty>}
  </Sheet>;
}
const dismissed = signal(lsGet('v2_today_dismiss') || '');
export function TodayNotice() {
  void rev.value; const D = todayData();
  if (dismissed.value === D.td || (!D.due.length && !D.fol.length)) return null;
  return <div class="notice" role="status">
    <span>{D.due.length + D.fol.length} due today or overdue: {D.due.length} task{D.due.length === 1 ? '' : 's'}, {D.fol.length} follow-up{D.fol.length === 1 ? '' : 's'}{D.over.length ? ' (' + D.over.length + ' overdue)' : ''}</span>
    <button type="button" class="b" onClick={openToday}>Open Today</button>
    <button type="button" class="bi sm" aria-label="Dismiss for today" title="Dismiss for today" onClick={() => { dismissed.value = D.td; lsSet('v2_today_dismiss', D.td); }}><Icon n="x" /></button>
  </div>;
}
export function BackupReminder() {
  const [, set] = useState(0); const last = +(lsGet('v2_last_backup') || 0), snooze = +(lsGet('v2_backup_snooze') || 0);
  if (Date.now() < snooze || Date.now() - last < 7 * 864e5) return null;
  return <div class="bk-note"><span>Weekly backup is due (last: {last ? fmtDay(new Date(last).toISOString().slice(0, 10)) : 'never'}).</span>
    <button type="button" class="b-add" onClick={() => { toast('Backup downloaded (' + backup() + ' records)'); set(x => x + 1); }}>Download backup</button>
    <button type="button" class="b" onClick={() => { lsSet('v2_backup_snooze', String(Date.now() + 3 * 864e5)); set(x => x + 1); }}>Later</button></div>;
}
export function ScrollButtons() {
  const [s, setS] = useState({ show: false, top: true });
  useEffect(() => { const f = () => { const h = document.documentElement.scrollHeight, y = window.scrollY; setS({ show: h > innerHeight * 1.8, top: y > 300 }); }; f(); const i = setInterval(f, 1500); addEventListener('scroll', f, { passive: true }); const hc = () => setTimeout(f, 300); addEventListener('hashchange', hc); return () => { clearInterval(i); removeEventListener('scroll', f); removeEventListener('hashchange', hc); }; }, []);
  if (!s.show) return null;
  return <div class="scr-btns"><button type="button" class="bi" title="Scroll to top" aria-label="Scroll to top" onClick={() => scrollTo({ top: 0, behavior: 'smooth' })}><Icon n="up" /></button><button type="button" class="bi" title="Scroll to bottom" aria-label="Scroll to bottom" onClick={() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}><Icon n="down" /></button></div>;
}
