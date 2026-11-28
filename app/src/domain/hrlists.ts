// HR lists (Round 61): the old HR module's list definitions, plus leave balances, holidays, pay estimate, tracker and the
// audit log. All lists live in one synced collection 'hrc' (field `col` = the list). No phone / e-mail fields (privacy).
import { all, get, put, rev } from '../data/store';
import { addDays, keyOf, parseKey, todayKey, uid, dur } from '../lib/util';
import type { CDef } from '../features/coll';
import { calc, hrSet, isWork, otMs, setFor, lateMin } from './hr';

export const HRC = 'hrc';
const today = () => todayKey();
export const hrItems = (col: string) => { void rev.value; return all<any>(HRC).filter(x => x.col === col); };
const names = (col: string, k: string) => hrItems(col).map(x => String(x[k] || '')).filter(Boolean);

export const C: Record<string, CDef> = {
  leave: { label: 'Leave requests', ttl: 'type', sub: ['from', 'to', 'half', 'status'], date: 'from', f: [{ k: 'type', label: 'Leave type', type: 'select', opts: () => hrSet().leaveTypes.map(t => t.name) }, { k: 'from', label: 'From', type: 'date', req: true }, { k: 'to', label: 'To (blank = one day)', type: 'date' }, { k: 'half', label: 'Length', type: 'select', opts: ['Full day', 'Half day (morning)', 'Half day (afternoon)'] }, { k: 'reason', label: 'Reason', type: 'textarea' }, { k: 'status', label: 'Status', type: 'select', opts: ['Pending', 'Approved', 'Rejected', 'Cancelled'] }] },
  holidays: { label: 'Holidays', ttl: 'name', sub: ['date', 'kind'], date: 'date', f: [{ k: 'date', label: 'Date', type: 'date', req: true }, { k: 'name', label: 'Holiday name', req: true }, { k: 'kind', label: 'Kind', type: 'select', opts: ['Public holiday', 'Islamic holiday', 'Company / personal'] }] },
  expenses: { label: 'Expenses', ttl: 'desc', sub: ['date', 'category', 'amount', 'status'], date: 'date', sum: 'amount', f: [{ k: 'date', label: 'Date', type: 'date', value: today }, { k: 'desc', label: 'Description', req: true }, { k: 'category', label: 'Category', type: 'select', opts: ['Travel', 'Meals', 'Equipment', 'Phone / data', 'Training', 'Other'] }, { k: 'amount', label: 'Amount', type: 'number' }, { k: 'status', label: 'Status', type: 'select', opts: ['Draft', 'Submitted', 'Approved', 'Reimbursed', 'Rejected'] }, { k: 'note', label: 'Receipt / note', type: 'textarea' }] },
  goals: { label: 'Goals & OKRs', ttl: 'title', sub: ['parent', 'kind', 'progress', 'due', 'status'], date: 'due', prog: 'progress', f: [{ k: 'title', label: 'Goal / objective', req: true }, { k: 'parent', label: 'Parent goal (cascade)', type: 'select', opts: () => ['(none)', ...names('goals', 'title')] }, { k: 'kind', label: 'Kind', type: 'select', opts: ['Goal', 'Objective (OKR)', 'Key result', 'Habit'] }, { k: 'progress', label: 'Progress %', type: 'number' }, { k: 'due', label: 'Due', type: 'date' }, { k: 'status', label: 'Status', type: 'select', opts: ['On track', 'At risk', 'Behind', 'Done', 'Paused'] }, { k: 'note', label: 'Notes', type: 'textarea' }] },
  reviews: { label: 'Reviews, 1:1s & feedback', ttl: 'topic', sub: ['date', 'kind', 'with', 'rating'], date: 'date', f: [{ k: 'date', label: 'Date', type: 'date', value: today }, { k: 'kind', label: 'Kind', type: 'select', opts: ['1:1', 'Performance review', 'Feedback received', 'Feedback given', 'Self-review'] }, { k: 'topic', label: 'Topic', req: true }, { k: 'with', label: 'With' }, { k: 'rating', label: 'Rating (1–5)', type: 'number' }, { k: 'note', label: 'Notes / action items', type: 'textarea' }] },
  learning: { label: 'Learning & certifications', ttl: 'title', sub: ['kind', 'provider', 'status', 'hours'], date: 'due', f: [{ k: 'title', label: 'Course / skill', req: true }, { k: 'kind', label: 'Kind', type: 'select', opts: ['Course', 'Certification', 'Book', 'Skill', 'Workshop'] }, { k: 'provider', label: 'Provider' }, { k: 'status', label: 'Status', type: 'select', opts: ['Planned', 'In progress', 'Completed'] }, { k: 'hours', label: 'Hours', type: 'number' }, { k: 'due', label: 'Target date', type: 'date' }, { k: 'note', label: 'Notes', type: 'textarea' }] },
  docs: { label: 'Documents & expiry', ttl: 'title', sub: ['kind', 'number', 'expires'], date: 'expires', exp: 'expires', f: [{ k: 'title', label: 'Document', req: true }, { k: 'kind', label: 'Kind', type: 'select', opts: ['Contract', 'ID / passport', 'Work permit', 'Certificate', 'Insurance', 'Licence', 'Other'] }, { k: 'number', label: 'Number / reference' }, { k: 'issued', label: 'Issued', type: 'date' }, { k: 'expires', label: 'Expires', type: 'date' }, { k: 'note', label: 'Notes (where it is kept)', type: 'textarea' }] },
  directory: { label: 'People directory', ttl: 'name', sub: ['role', 'dept', 'manager', 'birthday'], hint: 'Phone numbers and e-mails are not stored in this app.', f: [{ k: 'name', label: 'Name', req: true }, { k: 'role', label: 'Role' }, { k: 'dept', label: 'Department' }, { k: 'manager', label: 'Reports to' }, { k: 'birthday', label: 'Birthday', type: 'date' }, { k: 'joined', label: 'Joined', type: 'date' }, { k: 'note', label: 'Notes', type: 'textarea' }] },
  onboarding: { label: 'Onboarding / offboarding', ttl: 'item', sub: ['list', 'owner', 'due'], date: 'due', check: 'done', f: [{ k: 'item', label: 'Checklist item', req: true }, { k: 'list', label: 'List', type: 'select', opts: ['Onboarding', 'Offboarding'] }, { k: 'owner', label: 'Owner' }, { k: 'due', label: 'Due', type: 'date' }, { k: 'done', label: 'Done', type: 'check' }] },
  announce: { label: 'Announcements & recognition', ttl: 'title', sub: ['date', 'kind', 'to'], date: 'date', f: [{ k: 'date', label: 'Date', type: 'date', value: today }, { k: 'kind', label: 'Kind', type: 'select', opts: ['Announcement', 'Recognition / kudos', 'Milestone', 'Win'] }, { k: 'title', label: 'Title', req: true }, { k: 'to', label: 'To / about' }, { k: 'body', label: 'Message', type: 'textarea' }] },
  requests: { label: 'HR requests & helpdesk', ttl: 'subject', sub: ['date', 'type', 'status'], date: 'date', f: [{ k: 'date', label: 'Date', type: 'date', value: today }, { k: 'type', label: 'Type', type: 'select', opts: ['Letter / certificate', 'Equipment', 'Schedule change', 'Payroll query', 'Benefits', 'Complaint / grievance', 'Other'] }, { k: 'subject', label: 'Subject', req: true }, { k: 'status', label: 'Status', type: 'select', opts: ['Open', 'In progress', 'Resolved', 'Closed'] }, { k: 'note', label: 'Details', type: 'textarea' }] },
  pulse: { label: 'Mood, pulse & eNPS', ttl: 'mood', sub: ['date', 'energy', 'enps'], date: 'date', f: [{ k: 'date', label: 'Date', type: 'date', value: today }, { k: 'mood', label: 'Mood', type: 'select', opts: ['😄 Great', '🙂 Good', '😐 Okay', '🙁 Low', '😞 Bad'] }, { k: 'energy', label: 'Energy (1–5)', type: 'number' }, { k: 'enps', label: 'Would you recommend this workplace? (0–10)', type: 'number' }, { k: 'note', label: 'Note', type: 'textarea' }] },
  policies: { label: 'Policies & acknowledgments', ttl: 'title', sub: ['version', 'ackOn'], check: 'acked', f: [{ k: 'title', label: 'Policy', req: true }, { k: 'version', label: 'Version' }, { k: 'summary', label: 'Summary', type: 'textarea' }, { k: 'acked', label: 'Acknowledged', type: 'check' }, { k: 'ackOn', label: 'Acknowledged on', type: 'date' }] },
  hiring: { label: 'Hiring pipeline', ttl: 'name', sub: ['role', 'stage', 'interview', 'rating'], date: 'interview', hint: 'Phone numbers and e-mails are not stored in this app.', f: [{ k: 'name', label: 'Candidate', req: true }, { k: 'role', label: 'Role' }, { k: 'stage', label: 'Stage', type: 'select', opts: ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'] }, { k: 'source', label: 'Source' }, { k: 'interview', label: 'Interview date', type: 'date' }, { k: 'rating', label: 'Rating (1–5)', type: 'number' }, { k: 'note', label: 'Notes', type: 'textarea' }] },
  shifts: { label: 'Shift schedule', ttl: 'shift', sub: ['date', 'start', 'end', 'note'], date: 'date', f: [{ k: 'date', label: 'Date', type: 'date', req: true }, { k: 'shift', label: 'Shift name', value: 'Day' }, { k: 'start', label: 'Start', type: 'time', value: '09:00' }, { k: 'end', label: 'End', type: 'time', value: '17:00' }, { k: 'note', label: 'Note' }] },
  projects: { label: 'Projects', ttl: 'name', sub: ['client', 'rate', 'billable'], f: [{ k: 'name', label: 'Project', req: true }, { k: 'client', label: 'Client' }, { k: 'rate', label: 'Hourly rate (billable)', type: 'number' }, { k: 'billable', label: 'Billable', type: 'select', opts: ['Billable', 'Non-billable'] }] },
  rota: { label: 'Weekly rota', ttl: 'shift', sub: ['weekday', 'start', 'end'], f: [{ k: 'weekday', label: 'Weekday', type: 'select', opts: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] }, { k: 'shift', label: 'Shift name', value: 'Day' }, { k: 'start', label: 'Start', type: 'time', value: '09:00' }, { k: 'end', label: 'End', type: 'time', value: '17:00' }] },
  swaps: { label: 'Shift swaps', ttl: 'myShift', sub: ['date', 'with', 'theirShift', 'status'], date: 'date', f: [{ k: 'date', label: 'Date', type: 'date', req: true }, { k: 'myShift', label: 'My shift', req: true }, { k: 'with', label: 'Swap with' }, { k: 'theirShift', label: 'Their shift' }, { k: 'status', label: 'Status', type: 'select', opts: ['Requested', 'Agreed', 'Approved', 'Declined', 'Done'] }, { k: 'note', label: 'Note', type: 'textarea' }] },
  openshifts: { label: 'Open shifts', ttl: 'role', sub: ['date', 'start', 'end'], date: 'date', check: 'claimed', f: [{ k: 'date', label: 'Date', type: 'date', req: true }, { k: 'role', label: 'Role / shift', req: true }, { k: 'start', label: 'Start', type: 'time' }, { k: 'end', label: 'End', type: 'time' }, { k: 'claimed', label: 'Claimed', type: 'check' }] },
  otreq: { label: 'Overtime requests', ttl: 'reason', sub: ['date', 'hours', 'status'], date: 'date', f: [{ k: 'date', label: 'Date', type: 'date', value: today }, { k: 'hours', label: 'Hours', type: 'number' }, { k: 'reason', label: 'Reason', req: true }, { k: 'status', label: 'Status', type: 'select', opts: ['Pending', 'Approved', 'Rejected'] }] },
  compoff: { label: 'Comp-off (time off in lieu)', ttl: 'reason', sub: ['earned', 'days', 'status'], date: 'earned', f: [{ k: 'earned', label: 'Earned on', type: 'date', value: today }, { k: 'days', label: 'Days', type: 'number' }, { k: 'reason', label: 'For working on…', req: true }, { k: 'status', label: 'Status', type: 'select', opts: ['Earned', 'Used', 'Expired'] }] },
  reviewtpl: { label: 'Review templates', ttl: 'name', sub: [], f: [{ k: 'name', label: 'Template name', req: true }, { k: 'questions', label: 'Questions (one per line)', type: 'textarea' }] },
  cycles: { label: 'Review cycles', ttl: 'name', sub: ['from', 'to', 'status', 'template'], date: 'to', f: [{ k: 'name', label: 'Cycle (e.g. 2026 H2)', req: true }, { k: 'from', label: 'From', type: 'date' }, { k: 'to', label: 'To', type: 'date' }, { k: 'template', label: 'Template', type: 'select', opts: () => ['(none)', ...names('reviewtpl', 'name')] }, { k: 'status', label: 'Status', type: 'select', opts: ['Planned', 'Self-review', 'Manager review', 'Completed'] }, { k: 'self', label: 'Self rating (1–5)', type: 'number' }, { k: 'manager', label: 'Manager rating (1–5)', type: 'number' }, { k: 'note', label: 'Answers / notes', type: 'textarea' }] },
  feedback360: { label: '360 feedback', ttl: 'from', sub: ['date', 'relation', 'rating'], date: 'date', f: [{ k: 'date', label: 'Date', type: 'date', value: today }, { k: 'from', label: 'From (name or “anonymous”)', req: true }, { k: 'relation', label: 'Relationship', type: 'select', opts: ['Manager', 'Peer', 'Direct report', 'Customer', 'Self'] }, { k: 'rating', label: 'Rating (1–5)', type: 'number' }, { k: 'strengths', label: 'Strengths', type: 'textarea' }, { k: 'note', label: 'To improve', type: 'textarea' }] },
  competencies: { label: 'Competencies', ttl: 'name', sub: ['level', 'target'], f: [{ k: 'name', label: 'Competency', req: true }, { k: 'level', label: 'Current level (1–5)', type: 'number' }, { k: 'target', label: 'Target level (1–5)', type: 'number' }, { k: 'note', label: 'Evidence', type: 'textarea' }] },
  surveys: { label: 'Surveys', ttl: 'title', sub: ['anon'], f: [{ k: 'title', label: 'Survey title', req: true }, { k: 'questions', label: 'Questions (one per line, answered 1–5)', type: 'textarea' }, { k: 'anon', label: 'Anonymous', type: 'select', opts: ['Named', 'Anonymous'] }] },
  benefits: { label: 'Benefits & insurance', ttl: 'name', sub: ['provider', 'cover', 'renews'], date: 'renews', exp: 'renews', f: [{ k: 'name', label: 'Benefit', req: true }, { k: 'provider', label: 'Provider' }, { k: 'policy', label: 'Policy number' }, { k: 'cover', label: 'Cover / value' }, { k: 'renews', label: 'Renews on', type: 'date' }, { k: 'note', label: 'Notes', type: 'textarea' }] },
  assets: { label: 'Equipment & assets', ttl: 'item', sub: ['serial', 'issued', 'status'], date: 'issued', f: [{ k: 'item', label: 'Item', req: true }, { k: 'serial', label: 'Serial / tag' }, { k: 'issued', label: 'Issued on', type: 'date' }, { k: 'returned', label: 'Returned on', type: 'date' }, { k: 'status', label: 'Status', type: 'select', opts: ['In use', 'Returned', 'Lost', 'Repair'] }, { k: 'note', label: 'Notes', type: 'textarea' }] },
  payitems: { label: 'Allowances & deductions', ttl: 'name', sub: ['kind', 'amount', 'every', 'month'], sum: 'amount', f: [{ k: 'name', label: 'Name', req: true }, { k: 'kind', label: 'Kind', type: 'select', opts: ['Allowance', 'Deduction'] }, { k: 'amount', label: 'Amount (per month)', type: 'number' }, { k: 'every', label: 'Applies', type: 'select', opts: ['Every month', 'One-off'] }, { k: 'month', label: 'Month if one-off (YYYY-MM)' }] },
  tracker: { label: 'Tracked time', ttl: 'task', sub: ['project', 'date', 'st', 'en'], date: 'date', f: [{ k: 'project', label: 'Project', type: 'select', opts: () => ['(no project)', ...names('projects', 'name')] }, { k: 'task', label: 'Description' }, { k: 'date', label: 'Date', type: 'date', value: today }, { k: 'st', label: 'Start', type: 'time', value: '09:00' }, { k: 'en', label: 'End', type: 'time', value: '10:00' }] },
};
/** the old tab → list(s) mapping. */
export const TAB_LISTS: Record<string, string[]> = { leave: ['leave'], hol: ['holidays'], shifts: ['shifts'], exp: ['expenses'], goals: ['goals'], rev: ['reviews'], learn: ['learning'], docs: ['docs'], dir: ['directory'], onb: ['onboarding'], ann: ['announce'], req: ['requests'], pulse: ['pulse'], pol: ['policies'], hire: ['hiring'], rota: ['rota', 'swaps', 'openshifts'], ot: ['otreq', 'compoff'], cyc: ['reviewtpl', 'cycles', 'feedback360', 'competencies'], ben: ['benefits', 'assets'], sur: ['surveys'] };
export const TABS: [string, string][] = [['dash', 'Dashboard'], ['att', 'Attendance'], ['ts', 'Timesheets'], ['trk', 'Time tracker'], ['leave', 'Leave'], ['hol', 'Holidays'], ['shifts', 'Shifts'], ['sched', 'Weekly schedule'], ['rota', 'Rota & swaps'], ['pay', 'Pay & payslip'], ['slips', 'Salary slips'], ['ot', 'Overtime & comp-off'], ['exp', 'Expenses'], ['goals', 'Goals'], ['rev', 'Reviews & 1:1'], ['cyc', 'Review cycles'], ['learn', 'Learning'], ['docs', 'Documents'], ['ben', 'Benefits & assets'], ['dir', 'People'], ['onb', 'On/offboarding'], ['ann', 'Announcements'], ['req', 'Requests'], ['pulse', 'Mood & pulse'], ['sur', 'Surveys'], ['pol', 'Policies'], ['hire', 'Hiring'], ['an', 'Analytics'], ['audit', 'Audit log'], ['set', 'Settings']];

// ---------- holidays + leave ----------
export function holiday(k: string) { const h = hrItems('holidays').find(x => x.date === k); return h ? String(h.name || 'Holiday') : ''; }
export function leaveDays(r: any) {
  if (!r.from) return 0; const to = r.to || r.from; let n = 0, k = r.from, g = 0;
  while (k <= to && g++ < 400) { if (isWork(k) && !holiday(k)) n++; k = addDays(k, 1); }
  if (r.half && r.half !== 'Full day') n = n ? 0.5 * (r.from === to ? 1 : n) : 0; return n;
}
export function leaveOn(k: string) { return hrItems('leave').find(r => r.status !== 'Rejected' && r.status !== 'Cancelled' && r.from && k >= r.from && k <= (r.to || r.from)) || null; }
export function balances(year = new Date().getFullYear(), depth = 0): { t: { id: string; name: string; days: number; carry?: number }; used: number; pend: number; ent: number; carry: number; left: number }[] {
  const S = hrSet(), cy = new Date().getFullYear(), mo = new Date().getMonth() + 1, L = hrItems('leave');
  return S.leaveTypes.map(t => {
    let used = 0, pend = 0; L.forEach(r => { if (r.type === t.name && r.from && +String(r.from).slice(0, 4) === year) { if (r.status === 'Approved') used += leaveDays(r); else if (r.status === 'Pending') pend += leaveDays(r); } });
    let ent = +t.days || 0; if (S.accrue) ent = Math.round(ent * (year < cy ? 12 : year === cy ? mo : 12) / 12 * 100) / 100;
    let carry = 0; if (+(t.carry || 0) > 0 && depth < 4) { const pb = balances(year - 1, depth + 1).find(x => x.t.id === t.id); if (pb) carry = Math.max(0, Math.min(+(t.carry || 0), pb.left)); }
    return { t, used, pend, ent, carry, left: Math.round((ent + carry - used) * 100) / 100 };
  });
}

// ---------- pay estimate (same maths as the old app) ----------
const HR = 36e5;
export function hourly(month: string) { const S = hrSet(), r = +S.rate || 0; if (S.rateType === 'hour') return r; let wd = 0; for (let x = month + '-01'; x.slice(0, 7) === month; x = addDays(x, 1)) if (isWork(x)) wd++; return r / Math.max(1, wd * S.dayH); }
export function payCalc(month: string) {
  const S = hrSet(), hr = hourly(month); let reg = 0, ot = 0, otPay = 0, wd = 0, days = 0;
  for (let x = month + '-01'; x.slice(0, 7) === month; x = addDays(x, 1)) {
    const c = calc(x); if (isWork(x)) wd++; if (!c.n) continue; days++;
    const o = otMs(x, c), rest = !isWork(x) || !!holiday(x), rw = S.round > 0 ? Math.round(c.worked / (S.round * 6e4)) * S.round * 6e4 : c.worked;
    reg += Math.max(0, rw - o); ot += o; otPay += o / HR * hr * (rest ? S.otRest : S.otNormal);
  }
  const base = S.rateType === 'month' ? +S.rate || 0 : reg / HR * hr; let al = 0, de = 0;
  hrItems('payitems').forEach(p => { if (p.every === 'One-off' && p.month !== month) return; if (p.kind === 'Deduction') de += +p.amount || 0; else al += +p.amount || 0; });
  if (S.otApproval && ot > 0) { let ap = 0; hrItems('otreq').forEach(r => { if (r.status === 'Approved' && String(r.date).slice(0, 7) === month) ap += +r.hours || 0; }); otPay *= Math.min(1, ap * HR / ot); }
  const gross = base + otPay + al, pen = gross * (S.pensionEmp || 0) / 100, tax = gross * (S.taxPct || 0) / 100, er = gross * (S.pensionEr || 0) / 100;
  return { reg, ot, base, otPay, al, de, pen, tax, er, gross, net: gross - de - pen - tax, hr, days, wd };
}
export const money = (n: number) => (hrSet().cur || 'MVR') + ' ' + (Math.round((n || 0) * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function payslipText(month: string) {
  const S = hrSet(), p = payCalc(month);
  return ['Payslip estimate — ' + month, S.name ? 'Name: ' + S.name : '', 'Days worked: ' + p.days, 'Regular hours: ' + dur(p.reg, true), 'Overtime hours: ' + dur(p.ot, true), 'Base pay: ' + money(p.base), 'Overtime pay: ' + money(p.otPay), 'Allowances: ' + money(p.al), 'Deductions: ' + money(p.de), 'Pension (your share): ' + money(p.pen), 'Income tax: ' + money(p.tax), 'Employer pension: ' + money(p.er), 'Gross: ' + money(p.gross), 'Net estimate: ' + money(p.net)].filter(Boolean).join('\n');
}

// ---------- audit log ----------
export function audit(what: string, why = '') { put('hraudit', uid('a'), { at: Date.now(), what, why }); }
export const auditLog = () => { void rev.value; return all<{ id: string; at: number; what: string; why: string }>('hraudit').sort((a, b) => b.at - a.at); };

// ---------- timesheet week state ----------
export const tsState = (weekStart: string) => get<{ st: 'draft' | 'submitted' | 'approved'; at?: number }>('timesheets', weekStart) || { st: 'draft' as const, at: 0 };
export function setTs(weekStart: string, st: 'draft' | 'submitted' | 'approved') { put('timesheets', weekStart, { st, at: Date.now() }); audit('Timesheet ' + weekStart + ' → ' + st); }

// ---------- time tracker ----------
export interface Timer { start: number; project: string; task: string }
export const timer = () => (get<Timer & { on?: boolean }>('cfg', 'hrtimer')?.on ? get<Timer>('cfg', 'hrtimer') : null);
export function startTimer(project: string, task: string) { put('cfg', 'hrtimer', { on: true, start: Date.now(), project, task }); }
export function stopTimer() {
  const T = timer(); if (!T) return; const s = new Date(T.start), e = new Date(), hm = (d: Date) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  put(HRC, uid('trk'), { col: 'tracker', project: T.project, task: T.task, date: keyOf(s), st: hm(s), en: hm(e), start: T.start, end: +e, created: Date.now() });
  put('cfg', 'hrtimer', { on: false });
}
export function trackMs(x: any) {
  if (x.start && x.end) return x.end - x.start;
  if (!x.date || !x.st || !x.en) return 0; const d = parseKey(x.date), [a, b] = String(x.st).split(':').map(Number), [c, e] = String(x.en).split(':').map(Number);
  const s = new Date(d), z = new Date(d); s.setHours(a, b, 0, 0); z.setHours(c, e, 0, 0); let ms = +z - +s; if (ms <= 0) ms += 864e5; return ms;
}

// ---------- analytics (last 30 days) ----------
export function hrAnalytics() {
  const t = todayKey(); let worked = 0, n = 0, late = 0, ot = 0, brk = 0, inMin = 0;
  const bars: { k: string; label: string; v: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const k = addDays(t, -i), c = calc(k); bars.push({ k, label: k.slice(8), v: Math.round(c.worked / 36e3) / 100 });
    if (!c.n) continue; n++; worked += c.worked; brk += c.brk; ot += otMs(k, c); if (lateMin(k, c)) late++;
    const d = new Date(c.first); inMin += d.getHours() * 60 + d.getMinutes();
  }
  return { worked, n, late, ot, brk, avgIn: n ? Math.round(inMin / n) : 0, bars, onTime: n ? Math.round((n - late) / n * 100) : 0 };
}
export { setFor };
