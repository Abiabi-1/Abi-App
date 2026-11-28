// Day End Report – the old page's look, exactly: same markup and class names, the old page's own stylesheet
// (dayend-old.css, captured from the old app) inside an isolated shadow root, the old moon drawing and night sky.
import { Shadow as ShadowBase } from '../ui/shadow';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import OLD_CSS from './dayend-old.css?inline';
import ICONS from './dayend-icons.json';
import { rev, restore } from '../data/store';
import { CYCLES, Entry, PLANS, SECTIONS, SK, STAGES, WON, actStats, cycleMark, cycleTick, dayReport, daysWithEntries, entriesOf, entryRows, entryText, generateHours, getDay, hasRegs, isPaid, mkOf, periodDays, periodReport, periodTitle, planLabel, priceText, regsOf, removeEntry, setShift, slotOf, stageStats, stageTone, tkOf, ticketTypes, totText, updateEntry, addEntry, editFields, joinFields, makeTask, XLSX_WIDTHS, PeriodMode } from '../domain/dayend';
import { calc, status, act, punchesOf, movePunch, removePunch, t as hrT } from '../domain/hr';
import { importFile, importReportText } from '../domain/dayimport';
import { lastDetails } from '../domain/crm';
import { MONTHS, clock, copyText, download, fmt12, fmtDay, isKey, minToTime, parseKey, parsePrice, shiftDayKey, timeToMin, todayKey, lsJSON, lsSet } from '../lib/util';
import { openUrl, cleanLink, stripText } from '../lib/privacy';
import { buildXlsx, XLSX_MIME } from '../lib/xlsx';
import { toast, openModal, closeModal, Sheet, Btn, Field } from '../ui/kit';
import { openTaskForm } from './tasks';
import { resting, holdToQuickAdd } from '../ui/moon';
import { moonDraw, moonPhaseName, shiftFrac } from '../ui/moondraw';
import { go, theme, PALETTES, quickAdd, isPhone } from '../ui/state';
import { priced, regsStep } from './entryform';

export const selDay = signal(todayKey());
const I = ICONS as Record<string, string>;
const svg = (k: string) => <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: I[k] || '' }} />;
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let shadowRoot: ShadowRoot | null = null;
/** find an element inside the Day End (it lives in a shadow root) */
export function dayEndQuery(sel: string): HTMLElement | null { return (shadowRoot?.querySelector(sel) as HTMLElement) || null; }
export function scrollToEntry(id: string) { const el = dayEndQuery('[data-eid="' + id + '"]'); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('hl'); setTimeout(() => el.classList.remove('hl'), 2200); } }

function Shadow({ children }: { children: ComponentChildren }) { return <ShadowBase css={OLD_CSS + EXTRA_CSS} onRoot={r => { shadowRoot = r; }}>{children}</ShadowBase>; }
// small additions the old page did with script (kept here so the stylesheet itself stays the captured original)
const EXTRA_CSS = `
.entry.hl{outline:2px solid var(--accent);outline-offset:2px;border-radius:12px}
.entry-at-in{font:500 .72rem var(--dv-mono,'JetBrains Mono',monospace);padding:1px 6px;border-radius:8px;border:1px solid var(--border-strong);background:transparent;color:inherit;width:118px}
:host([data-calm]) .ns-sky{display:none}
.de-ed{display:flex;gap:6px;align-items:center}
.e41-hint .lb{opacity:.8}
`;

type F = { wa: string; em: string; twa: string; tem: string };
const filt = signal<F>(lsJSON<F>('hub_fl_day2', { wa: '', em: '', twa: '', tem: '' }));
const setF = (f: F) => { filt.value = f; lsSet('hub_fl_day2', JSON.stringify(f)); };
const cyc3 = (s: string) => (s === '' ? 'g' : s === 'g' ? 'r' : '');
function passFilter(e: Entry, f: F) {
  if (!(f.wa || f.em || f.twa || f.tem)) return true; if (e.sk !== 'tasks') return false;
  const m = (k: 'wa' | 'em', w: string) => !w || mkOf(e, k) === w;
  const t = (k: 'wa' | 'em', w: string) => !w || tkOf(e, k) === (w === 'g' ? 'y' : 'n');
  return m('wa', f.wa) && m('em', f.em) && t('wa', f.twa) && t('em', f.tem);
}

export function DayEnd() {
  void rev.value; const day = selDay.value, d = getDay(day);
  const [, tick] = useState(0); useEffect(() => { const i = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(i); }, []);
  const f = filt.value, th = theme.value;
  return <Shadow>
    <div class="wrap">
      <header>
        <div class="brand"><div class="brand-logo">{svg('brand')}</div><div><h1>Day End Report</h1><div class="subtitle">Tasks · Calls · WhatsApp · Tickets</div></div></div>
        <div class="header-right"><ClockChip />
          <div class="date-pill" id="dateLabel">{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <button type="button" class="theme-toggle" title="Colour palette" aria-label="Colour palette" style={{ marginRight: '8px' }} onClick={() => { const i = PALETTES.findIndex(x => x.id === th.pal); theme.value = { ...th, pal: PALETTES[(i + 1) % PALETTES.length].id }; toast('Palette: ' + PALETTES[(i + 1) % PALETTES.length].name); }}>{svg('pal')}</button>
          <button class="theme-toggle" id="themeToggle" title="Toggle theme" aria-label="Toggle theme" onClick={() => { theme.value = { ...th, mode: th.mode === 'dark' ? 'light' : 'dark' }; }}>{svg(th.mode === 'dark' ? 'theme' : 'sun')}</button>
        </div>
      </header>
      <DayCard day={day} />
      <ShiftCard day={day} />
      <div id="rcBar" class="cx-bar"><span class="cx-t">Filter · {fmtDay(day)}</span><span class="cx-grid">
        {(['wa', 'em'] as const).map(k => <button type="button" class="cx-ft" data-ft={k} data-s={f[k]} aria-pressed={!!f[k]} title={(k === 'wa' ? 'WhatsApp' : 'Email') + ': ' + (f[k] === 'g' ? 'green' : f[k] === 'r' ? 'red' : 'off') + ' (tap to change)'} aria-label={(k === 'wa' ? 'WhatsApp' : 'Email') + ' filter'} onClick={() => setF({ ...f, [k]: cyc3(f[k]) })}>{svg(k === 'wa' ? 'ftwa' : 'ftem')}</button>)}
        {(['twa', 'tem'] as const).map(k => <button type="button" class="cx-ft cx-tkf" data-ft={k} data-s={f[k]} aria-pressed={!!f[k]} title={'Tick under ' + (k === 'twa' ? 'WhatsApp' : 'Email') + ': ' + (f[k] === 'g' ? 'ticked' : f[k] === 'r' ? 'crossed' : 'off')} aria-label={'Tick under ' + (k === 'twa' ? 'WhatsApp' : 'Email') + ' filter'} onClick={() => setF({ ...f, [k]: cyc3(f[k]) })} />)}
      </span></div>
      <div id="blocks">{(() => { const hs = generateHours(d), nm = new Date().getHours() * 60 + new Date().getMinutes(), anyNow = day === todayKey() && hs.some(h => nm >= timeToMin(h) && nm < timeToMin(h) + 60); return hs.map((hk, i) => <HourBlock key={day + hk} day={day} hk={hk} idx={i} f={f} first={!anyNow && i === 0} />); })()}</div>
      <StatsCard day={day} />
      <ReportCard day={day} />
      <PeriodCard day={day} />
    </div>
  </Shadow>;
}

function ClockChip() {
  void rev.value; const st = status();
  const txt = st.state === 'out' ? 'Clock in' : st.state === 'break' ? '☕ ' + clock(Date.now() - (st.c.ses[st.c.ses.length - 1]?.br.slice(-1)[0]?.s || Date.now())) : '● ' + clock(st.c.worked);
  return <button type="button" class="clk-chip" title="Time clock — clock in / out, breaks" aria-label="Time clock" data-clk={st.state} onClick={() => import('../ui/shell').then(m => openModal(() => <m.ClockSheet />))}>{svg('clk')}<span>{txt}</span></button>;
}
function DayCard({ day }: { day: string }) {
  const keys = daysWithEntries(); if (keys.indexOf(day) < 0) keys.push(day); keys.sort().reverse();
  return <div class="day-card">
    <div class="day-row">
      <button class="btn" aria-label="Previous day" onClick={() => { selDay.value = shiftDayKey(day, -1); }}>←</button>
      <input type="date" id="dayPick" aria-label="Pick or add a day" value={day} onChange={e => { const v = (e.target as HTMLInputElement).value; if (isKey(v)) selDay.value = v; }} />
      <button class="btn" aria-label="Next day" onClick={() => { selDay.value = shiftDayKey(day, 1); }}>→</button>
      <button class="btn" onClick={() => { selDay.value = todayKey(); }}>Today</button>
      <div class="day-label" id="dayLabel">{fmtDay(day, true)}{day === todayKey() ? ' · Today' : ''}</div>
    </div>
    <div class="day-chips" id="dayChips">{keys.map(k => <button class={'day-chip' + (k === day ? ' active' : '')} onClick={() => { selDay.value = k; }}>{fmtDay(k)} · {entriesOf(k).length}</button>)}</div>
  </div>;
}

// ---------- shift card: moon countdown, night sky, shift fields, clock strip ----------
const STARS = (() => { let seed = 20261120; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; const a: { s: string; t: number }[] = []; for (let i = 0; i < 205; i++) { const sz = rnd() < 0.82 ? 1.2 + rnd() * 1.2 : 2.4 + rnd() * 1.6; a.push({ s: 'left:' + (rnd() * 100).toFixed(2) + '%;top:' + (rnd() * 100).toFixed(2) + '%;width:' + sz.toFixed(1) + 'px;height:' + sz.toFixed(1) + 'px;animation-delay:' + (rnd() * 4).toFixed(2) + 's;animation-duration:' + (i % 4 === 0 ? 1.3 + rnd() * 1.4 : 2.4 + rnd() * 3).toFixed(1) + 's', t: i < 55 ? 0 : rnd() }); } return a; })();
function ShiftCard({ day }: { day: string }) {
  const d = getDay(day), cv = useRef<HTMLCanvasElement>(null), card = useRef<HTMLDivElement>(null), wrap = useRef<HTMLDivElement>(null);
  const fr = shiftFrac(day, d.shiftStart, d.shiftEnd);
  const s = timeToMin(d.shiftStart); let e = timeToMin(d.shiftEnd); if (e <= s) e = s + 60;
  const n = new Date(), nowS = n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds();
  let time = '--:--:--', label = 'standby', phase = 'Standby', cls = 'upcoming', over = false;
  if (day === todayKey()) {
    if (nowS < s * 60) { time = clock((s * 60 - nowS) * 1000); label = 'to start'; phase = 'Upcoming'; }
    else if (nowS < e * 60) { time = clock((e * 60 - nowS) * 1000); label = 'left'; phase = 'On Shift'; cls = 'live'; }
    else { time = '+' + clock((nowS - e * 60) * 1000); label = 'overtime'; phase = 'Finished'; cls = 'done'; over = true; }
  }
  useEffect(() => {
    if (cv.current) moonDraw(cv.current, fr.f, fr.o, true);
    if (card.current && wrap.current) { const a = card.current.getBoundingClientRect(), b = wrap.current.getBoundingClientRect(); card.current.style.setProperty('--moon-x', (b.left + b.width / 2 - a.left).toFixed(0) + 'px'); card.current.style.setProperty('--moon-y', (b.top + b.height / 2 - a.top).toFixed(0) + 'px'); }
    (shadowRoot?.host as HTMLElement | undefined)?.style.setProperty('--moon-lit', (0.1 + 0.9 * Math.pow(fr.f, 1.3)).toFixed(3));
  });
  useEffect(() => { if (wrap.current) holdToQuickAdd(wrap.current); }, []);
  const st = status(), c = calc(st.key), isToday = day === todayKey();
  const ps = punchesOf(day), last = (k: string) => ps.filter(p => p.k === k).slice(-1)[0];
  const clkSmall = st.state !== 'out' && isToday ? (st.state === 'break' ? 'break' + (last('bs') ? ' · ' + hm(last('bs')!.at) : '') : 'in' + (last('in') ? ' · ' + hm(last('in')!.at) : ' · clocked')) : '';
  const hrs = (e - s) / 60;
  const chip = (lb: string, k: string) => { const p = last(k); return <span class={'clk-t' + (p ? '' : ' none')} title={p ? 'Tap to adjust' : ''} onClick={() => p && openModal(() => <AdjustPunch id={p.id} at={p.at} label={lb} />)}><small>{lb}</small><b>{p ? hrT(p.at) : '—'}</b>{p && <button type="button" class="clk-del" title="Double-click to delete" aria-label={'Delete ' + lb + ' entry (double-click)'} onClick={ev => ev.stopPropagation()} onDblClick={ev => { ev.stopPropagation(); removePunch(p.id); toast(lb + ' removed'); }}>×</button>}</span>; };
  const wb = (a: 'in' | 'bs' | 'be' | 'out', cls2: string, tx: string) => <span class="clk-bw"><button type="button" class={cls2} title="Tap to clock now" onClick={() => toast(act(a, a === 'bs' ? { bt: 'meal' } : {}))}>{tx}</button></span>;
  return <div class="shift-card" ref={card}>
    <div class="ns-sky" aria-hidden="true">{STARS.map(x => <i class={x.t <= fr.f + 0.0001 ? 'on' : ''} style={x.s} />)}</div>
    <div class={'countdown-wrap' + (over ? ' moon-over' : '')} id="countdownWrap" ref={wrap} title={moonPhaseName(fr.f) + ' · ' + Math.round(fr.f * 100) + '% of shift'} style={{ cursor: 'pointer' }} data-clk={st.state !== 'out' && isToday ? st.state : undefined}
      onClick={() => import('../ui/shell').then(m => openModal(() => <m.ClockSheet />))}>
      <canvas id="moonCv" ref={cv} aria-hidden="true" />
      <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: I.ring }} />
      <div class="countdown-center"><div class="countdown-time" id="countdownTime">{time}</div><div class="countdown-label" id="countdownLabel">{label}</div>{clkSmall && <div id="clkSmall" class="clk-small" data-clk={st.state}>{clkSmall}</div>}</div>
    </div>
    <div class="shift-fields">
      <div class="shift-field"><label>Shift Start</label><input type="time" id="shiftStart" value={d.shiftStart} onChange={ev => setShift(day, (ev.target as HTMLInputElement).value || '09:00', d.shiftEnd)} /></div>
      <div class="shift-arrow">→</div>
      <div class="shift-field"><label>Shift End</label><input type="time" id="shiftEnd" value={d.shiftEnd} onChange={ev => setShift(day, d.shiftStart, (ev.target as HTMLInputElement).value || '17:00')} /></div>
    </div>
    <div class="shift-side"><div class="shift-status" id="shiftStatus">{hrs} hour{hrs === 1 ? '' : 's'}</div><div class={'shift-phase ' + cls} id="shiftPhase"><span class="dot-pulse" /><span>{phase}</span></div></div>
    <div id="clkStrip" class="clk-strip">
      <div class="clk-b">{isToday && (st.state === 'out' ? wb('in', 'p', 'Clock in') : st.state === 'work' ? <>{wb('bs', '', 'Break')}{wb('out', 'p', 'Clock out')}</> : <>{wb('be', 'p', 'End break')}{wb('out', '', 'Clock out')}</>)}{c.n > 0 && !isToday ? null : null}</div>
      <div class="clk-ts">{chip('In', 'in')}{chip('Break', 'bs')}{chip('Back', 'be')}{chip('Out', 'out')}</div>
    </div>
  </div>;
}
const hm = (ms: number) => { const d = new Date(ms); let h = d.getHours(); const m = d.getMinutes(), ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return h + ':' + (m < 10 ? '0' : '') + m + ap; };
function AdjustPunch({ id, at, label }: { id: string; at: number; label: string }) {
  const d0 = new Date(at); const [v, setV] = useState([d0.getHours(), d0.getMinutes(), d0.getSeconds()].map(n => String(n).padStart(2, '0')).join(':'));
  return <Sheet title={'Adjust ' + label + ' time'} onClose={closeModal} foot={<><Btn onClick={closeModal}>Cancel</Btn><button class="b-add" onClick={() => { const [h, m, s] = v.split(':').map(Number); const d = new Date(at); d.setHours(h, m, s || 0, 0); movePunch(id, +d); closeModal(); toast(label + ' time changed'); }}>Save</button></>}>
    <Field label="Time"><input class="in" type="time" step={1} value={v} onInput={e => setV((e.target as HTMLInputElement).value)} /></Field></Sheet>;
}

// ---------- hour blocks ----------
const openHours = signal<Record<string, boolean>>({});
function HourBlock({ day, hk, idx, f, first }: { day: string; hk: string; idx: number; f: F; first?: boolean }) {
  const slot = slotOf(day, hk), n = new Date(), nm = n.getHours() * 60 + n.getMinutes(), sm = timeToMin(hk);
  const c0 = slot.tasks.length + slot.calls.length + slot.whatsapp.length + slot.tickets.length + slot.other.length;
  const isNow = day === todayKey() && nm >= sm && nm < sm + 60, fut = day === todayKey() && nm < sm;
  const key = day + '|' + hk, open = openHours.value[key] ?? (isNow || !isPhone.value || (c0 > 0));
  const c = { t: slot.tasks.length, c: slot.calls.length, w: slot.whatsapp.length, k: slot.tickets.length, o: slot.other.length }, tot = c.t + c.c + c.w + c.k + c.o;
  return <div class={'hour-block anim-in' + (isNow ? ' is-now' : '') + (fut ? ' is-future' : '') + (open ? ' open' : '')} data-hk={hk} style={{ animationDelay: Math.min(idx * 55, 500) + 'ms' }}>
    <div class="hour-head" onClick={() => { openHours.value = { ...openHours.value, [key]: !open }; }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}><div class="hour-time">{fmt12(hk)} – {fmt12(minToTime(sm + 60))}</div>{isNow && <span class="badge-now">Now</span>}</div>
      <div class="hour-meta">{c.t > 0 && <span class="chip green">Tasks {c.t}</span>}{c.c > 0 && <span class="chip blue">Calls {c.c}</span>}{c.w > 0 && <span class="chip amber">WA {c.w}</span>}{c.k > 0 && <span class="chip purple">Tickets {c.k}</span>}{c.o > 0 && <span class="chip pink">Other {c.o}</span>}{!tot && <span class="chip">empty</span>}<span class="caret">▾</span></div>
    </div>
    <div class="hour-body"><div class="hour-body-inner">{open && SECTIONS.map(def => <Section day={day} hk={hk} sk={def.key} list={slot[def.key]} f={f} />)}</div></div>
  </div>;
}
const SEC_COLOR: Record<SK, string> = { tasks: 'green', calls: 'blue', whatsapp: 'amber', tickets: 'purple', other: 'pink' };
function Section({ day, hk, sk, list, f }: { day: string; hk: string; sk: SK; list: Entry[]; f: F }) {
  const def = SECTIONS.find(s => s.key === sk)!; const [edit, setEdit] = useState<Entry | null>(null); const [pulse, setPulse] = useState(false), prev = useRef(list.length);
  useEffect(() => { if (prev.current !== list.length) { setPulse(true); const t = setTimeout(() => setPulse(false), 700); prev.current = list.length; return () => clearTimeout(t); } }, [list.length]);
  return <div class="section" data-section={sk} data-hk={hk}>
    <div class="section-head"><div class={'section-icon ' + SEC_COLOR[sk]}>{svg('sec_' + SEC_COLOR[sk])}</div><div><div class="section-title">{def.label}</div><div class="section-sub">{def.sub}</div></div><div class={'section-count' + (pulse ? ' pulse' : '')}>{list.length}</div></div>
    <OldForm day={day} hk={hk} sk={sk} edit={edit} onDone={() => setEdit(null)} />
    <div class="entries">{list.map((e, i) => passFilter(e, f) ? <OldEntry e={e} i={i} editing={edit?.id === e.id} onEdit={() => setEdit(e)} /> : null)}</div>
  </div>;
}

/** The input rows, in the old markup. Same validation and pricing rules as before. */
export function OldForm({ day, hk, sk, edit, onDone, quick }: { day: string; hk: string; sk: SK; edit?: Entry | null; onDone?: () => void; quick?: boolean }) {
  const def = SECTIONS.find(s => s.key === sk)!;
  const [v, setV] = useState<Record<string, string>>(() => (edit ? editFields(edit) : {}));
  useEffect(() => { setV(edit ? editFields(edit) : {}); if (edit) setTimeout(() => first.current?.focus(), 20); }, [edit?.id]);
  const first = useRef<HTMLInputElement>(null);
  const set = (k: string, val: string) => setV(o => (sk === 'tasks' && /^(stage|plan|billing|pricing|price|mvr)$/.test(k) ? priced({ ...o, [k]: val }, k === 'stage' ? 'plan' : k) : { ...o, [k]: val }));
  const ld = useMemo(() => (sk === 'tasks' && !edit ? lastDetails(v.deal || '') : null), [v.deal]);
  const submit = () => {
    const vals: Record<string, string> = {}; Object.keys(v).forEach(k => { if (k.charAt(0) !== '_') vals[k] = String(v[k] ?? '').trim(); });
    let cut = 0;
    Object.keys(vals).forEach(k => { if (k === 'number' && sk === 'tasks') { const u = vals[k] ? cleanLink(vals[k]) : ''; if (u !== vals[k]) cut++; vals[k] = u; } else if (!/^(price|mvr|regs|stage|plan|billing|pricing)$/.test(k)) { const r = stripText(vals[k]); if (r.n) { cut += r.n; vals[k] = r.s; } } });
    if (cut) toast('Phone numbers & emails aren’t stored – they were left out');
    if (!Object.values(vals).some(x => x)) return;
    if (sk === 'tasks' && !vals.deal && !vals.number && !vals.notes) return toast('Add a deal name or the HubSpot link');
    if (sk === 'calls' && !vals.number && !vals.reason) return toast('Add a deal / ticket name or a reason');
    if (sk === 'whatsapp' && !vals.sender && !vals.inquiry) return toast('Add a deal / ticket name or the inquiry');
    if (sk === 'tickets' && !vals.desc) return toast('Missing: desc');
    if (sk === 'other' && !vals.note) return toast('Missing: note');
    if (sk === 'tasks' && vals.price && isNaN(parsePrice(vals.price))) return toast('Price should be a number');
    if (sk === 'tasks' && vals.mvr && isNaN(parsePrice(vals.mvr))) return toast('MVR price should be a number');
    const data: Partial<Entry> = sk === 'tasks' ? { ...makeTask(vals), text: undefined } : { text: joinFields(sk, vals) };
    if (sk !== 'tasks' && !data.text) return;
    if (edit) { updateEntry(edit.id, data); toast('Entry updated'); }
    else { addEntry(day, hk, sk, data); if (quick) toast('Added to ' + def.label); }
    setV({}); onDone?.(); setTimeout(() => first.current?.focus(), 20);
  };
  const key = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } };
  const won = v.stage === WON, std = isPaid(v.plan || '') && v.pricing !== 'custom';
  const inp = (fd: { name: string; ph: string }, i: number) => <input ref={i === 0 ? first : undefined} type="text" data-f={fd.name} placeholder={fd.ph} value={v[fd.name] || ''} onInput={e => set(fd.name, (e.target as HTMLInputElement).value)} onKeyDown={key}
    inputMode={fd.name === 'number' && sk === 'tasks' ? 'url' : undefined} autoComplete="off"
    onBlur={fd.name === 'number' && sk === 'tasks' ? (e => { const t = (e.target as HTMLInputElement).value; if (t && cleanLink(t) !== t) { set('number', cleanLink(t)); toast(cleanLink(t) ? 'Link cleaned' : 'Only a HubSpot link is kept here – phone numbers aren’t stored'); } }) : undefined} />;
  return <>
    <div class="input-row">
      {def.fields.map((fd, i) => <>{inp(fd, i)}{fd.name === 'number' && sk === 'tasks' && <button type="button" class="plus-btn open-link" title="Open the HubSpot deal link" aria-label="Open the HubSpot deal link" onClick={() => { const u = openUrl(v.number); if (u) window.open(u, '_blank', 'noopener'); else toast('Paste the HubSpot deal link first'); }}>↗</button>}</>)}
      {ld && <div class="e41-hint"><span class="lb">Seen {ld.seen}× · last {fmtDay(new Date(ld.last).toISOString().slice(0, 10))}</span><button type="button" class="qn-chip" onClick={() => setV(o => priced({ ...o, deal: ld.name, number: o.number || ld.link, stage: ld.stage || o.stage || '' }, 'plan'))}>Use last details</button></div>}
      <button class="btn-add" onClick={submit}>{edit ? 'Save changes' : '+ Add'}</button>{edit && <button class="btn" onClick={() => { setV({}); onDone?.(); }}>Cancel</button>}
    </div>
    {sk === 'tasks' && <div class="input-row stage-row">
      <select data-f="stage" value={v.stage || ''} onChange={e => set('stage', (e.target as HTMLSelectElement).value)}><option value="">Deal stage</option>{STAGES.map(s => <option value={s}>{s}</option>)}{v.stage && STAGES.indexOf(v.stage) < 0 && <option value={v.stage}>{v.stage}</option>}</select>
      <select data-f="plan" class={won ? '' : 'hide'} value={v.plan || ''} onChange={e => set('plan', (e.target as HTMLSelectElement).value)}><option value="">Select plan</option>{PLANS.map(s => <option value={s}>{s}</option>)}{v.plan && PLANS.indexOf(v.plan) < 0 && <option value={v.plan}>{v.plan}</option>}</select>
      <select data-f="billing" class={won && isPaid(v.plan || '') ? '' : 'hide'} value={v.billing || ''} onChange={e => set('billing', (e.target as HTMLSelectElement).value)}><option value="">Select billing</option>{CYCLES.map(s => <option value={s}>{s}</option>)}</select>
      <select data-f="pricing" class={won && v.plan ? '' : 'hide'} value={v.pricing || ''} onChange={e => set('pricing', (e.target as HTMLSelectElement).value)}><option value="">Standard price</option><option value="custom">Custom price</option></select>
      <input type="text" inputMode="decimal" data-f="price" class={(won ? '' : 'hide') + (won && std ? ' ro' : '')} readOnly={won && std} placeholder="Price (USD)" value={v.price || ''} onInput={e => set('price', (e.target as HTMLInputElement).value)} onKeyDown={key} />
      <input type="text" inputMode="decimal" data-f="mvr" class={(won ? '' : 'hide') + (won && std ? ' ro' : '')} readOnly={won && std} placeholder="Price (MVR)" value={v.mvr || ''} onInput={e => set('mvr', (e.target as HTMLInputElement).value)} onKeyDown={key} />
      <div class={'regs' + (won && hasRegs(v.plan || '') ? '' : ' hide')}><button type="button" aria-label="Fewer registers" onClick={() => setV(o => regsStep(o, -1))}>▼</button><b>{v.regs || '0'}</b><button type="button" aria-label="More registers" onClick={() => setV(o => regsStep(o, 1))}>▲</button><small>Professional only · extra registers $20 / 300 MVR per month each (×6 biannual, ×12 annual)</small></div>
    </div>}
  </>;
}

function OldEntry({ e, i, onEdit, editing }: { e: Entry; i: number; onEdit: () => void; editing: boolean }) {
  const lk = e.sk === 'tasks' ? openUrl(e.number) : '';
  const tags: [string, string][] = [];
  if (e.sk === 'tasks' && e.text == null) { const tone = stageTone(e.stage); if (e.stage) tags.push([e.stage, tone === 'good' ? 'green' : tone === 'bad' ? 'rose' : tone === 'acc' ? 'blue' : '']); if (e.plan) tags.push([planLabel(e), 'purple']); if (e.price) tags.push(['Price ' + priceText(e), 'amber']); if (regsOf(e)) tags.push(['+' + regsOf(e) + ' extra register' + (regsOf(e) > 1 ? 's' : ''), 'amber']); }
  const [t, setT] = useState(false);
  const cp = async (what: 'num' | 'name' | 'notes' | 'all') => {
    const txt = what === 'num' ? e.number || '' : what === 'name' ? (e.text != null ? entryText(e).split(': ')[0] : e.deal || '') : what === 'notes' ? (e.text != null ? entryText(e) : e.notes || '') : entryText(e) + (e.number ? '\n' + e.number : '');
    if (!txt) return toast('Nothing to copy'); toast((await copyText(txt)) ? 'Copied' : 'Copy failed');
  };
  const MK: Record<string, string> = { g: 'green', r: 'red', '': 'not marked' };
  return <div class={'entry' + (editing ? ' editing' : '')} data-eid={e.id}>
    <span class="entry-num">{String(i + 1).padStart(2, '0')}</span>
    <div class="entry-text">{entryText(e)}{lk && <> <a class="entry-link" href={lk} target="_blank" rel="noopener" title="Open the HubSpot deal" aria-label="Open the HubSpot deal">↗ HubSpot</a></>}{' '}
      {t ? <input class="entry-at-in" type="time" step={1} autoFocus value={e.at ? keyTime(e.at) : ''} onBlur={() => setT(false)} onChange={ev => { const val = (ev.target as HTMLInputElement).value; if (val) { const [h, m, s] = val.split(':').map(Number); const dt = parseKey(e.day); dt.setHours(h, m, s || 0); updateEntry(e.id, { at: +dt }); } setT(false); }} />
        : <span class={'entry-at' + (e.at ? '' : ' none')} title={e.at ? 'Exact time logged — tap to adjust' : 'Add the exact time'} onClick={() => setT(true)}>{e.at ? hrT(e.at) : '+ time'}</span>}
      {tags.length > 0 && <div class="entry-tags">{tags.map(([x, c]) => <span class={'chip ' + c}>{x}</span>)}</div>}
    </div>
    {e.sk === 'tasks' && (['wa', 'em'] as const).map(k => { const m = mkOf(e, k), tk = tkOf(e, k); return <span class="entry-mkw">
      <button class={'entry-mk' + (m ? ' ' + m : '')} data-mk={k} title={(k === 'wa' ? 'WhatsApp' : 'Email') + ': ' + MK[m] + ' (click to change)'} aria-label={(k === 'wa' ? 'WhatsApp' : 'Email') + ' status'} onClick={() => cycleMark(e, k)}>{svg(k === 'wa' ? 'mkwa' : 'mkem')}</button>
      <button type="button" class="entry-tk" data-tk={k} data-s={tk} title={(k === 'wa' ? 'WhatsApp' : 'Email') + ': ' + (tk === 'y' ? 'confirmed (tap for ✗)' : tk === 'n' ? 'not possible (tap to clear)' : 'not marked (tap to confirm)')} aria-label={(k === 'wa' ? 'WhatsApp' : 'Email') + ' confirmation'} onClick={() => cycleTick(e, k)} />
    </span>; })}
    <button class="entry-fu" title="Add a follow-up task" onClick={() => openTaskForm({ title: 'Follow up — ' + (e.deal || entryText(e).slice(0, 40)), deal: e.deal || '', notes: entryText(e) })}>Follow-up</button>
    <button type="button" class="entry-cpt" title="Copy…" aria-label="Copy options" onClick={() => cp('all')}>{svg('cpt')}</button>
    <button class="entry-edit" title="Edit" onClick={onEdit}>Edit</button>
    <button class="entry-del" title="Delete" onClick={() => { removeEntry(e.id); toast('Entry deleted', { label: 'Undo', fn: () => restore('entries', e.id) }); }}>✕</button>
    <span class="entry-cp" role="group" aria-label="Copy from this entry">
      {e.sk === 'tasks' && <button type="button" class="cp-chip" title="Copy hubspot link" aria-label="Copy hubspot link" onClick={() => cp('num')}>{svg('cp_num')}</button>}
      <button type="button" class="cp-chip" title="Copy deal name" aria-label="Copy deal name" onClick={() => cp('name')}>{svg('cp_name')}</button>
      <button type="button" class="cp-chip" title="Copy notes" aria-label="Copy notes" onClick={() => cp('notes')}>{svg('cp_notes')}</button>
      <button type="button" class="cp-chip" title="Copy entry" aria-label="Copy entry" onClick={() => cp('all')}>{svg('cp_all')}</button>
    </span>
  </div>;
}
const keyTime = (ms: number) => { const d = new Date(ms); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':'); };

// ---------- Deal Stage Breakdown ----------
const scopeS = signal<'all' | 'day' | 'month' | 'year'>('all');
function StatsCard({ day }: { day: string }) {
  const sc = scopeS.value; let keys = daysWithEntries();
  if (sc === 'day') keys = [day]; else if (sc === 'month') keys = keys.filter(k => k.slice(0, 7) === day.slice(0, 7)); else if (sc === 'year') keys = keys.filter(k => k.slice(0, 4) === day.slice(0, 4));
  const list: Entry[] = []; keys.forEach(k => entriesOf(k).forEach(e => { if (e.sk === 'tasks') list.push(e); }));
  const S = stageStats(list), A = actStats(keys);
  const label = sc === 'day' ? fmtDay(day) : sc === 'month' ? MONTHS[+day.slice(5, 7) - 1] + ' ' + day.slice(0, 4) : sc === 'year' ? day.slice(0, 4) : 'All days';
  const tm: [string, number][] = ticketTypes(A).map(t => [t, A.tickets.types[t]]); if (A.tickets.none) tm.push(['No type', A.tickets.none]);
  const act = (name: string, n: number, rows: [string, number][]) => <div class="act-tile"><div class="act-top"><div class="act-name">{name}</div><div class="act-big">{n}</div></div>{rows.length > 0 ? <div class="act-list">{rows.map(r => <div class="act-row"><span>{r[0]}</span><b>{r[1]}</b><i style={{ width: (n ? Math.round((r[1] / n) * 100) : 0) + '%' }} /></div>)}</div> : !n ? <div class="act-none">None logged</div> : null}</div>;
  const foot = ['Total tasks: ' + S.total]; if (S.cw.other.n) foot.push('Other plans: ' + S.cw.other.n); if (S.cw.none.n) foot.push('Closed Won, no plan: ' + S.cw.none.n); if (S.priced) foot.push('Total price: ' + totText(S.price, S.mvr, S.priced, S.mvrN));
  return <div class="report-card" id="statsCard">
    <div class="report-head"><div><div class="report-title">Deal Stage Breakdown</div><div class="section-sub" id="statsSub">{label} · {list.length} task{list.length === 1 ? '' : 's'}</div></div>
      <div class="seg" id="statScope">{([['all', 'All time'], ['day', 'Day'], ['month', 'Month'], ['year', 'Year']] as const).map(([k, l]) => <button data-s={k} class={sc === k ? 'active' : ''} onClick={() => { scopeS.value = k; }}>{l}</button>)}</div></div>
    <div class="card-body">
      <div class="stat-grid" id="statGrid">{STAGES.map(s => <div class={'stat-tile' + (s === WON ? ' won' : s === 'Closed Lost All' ? ' lost' : '')} title={s === WON ? 'Open Won Deals' : undefined} style={s === WON ? { cursor: 'pointer' } : undefined} onClick={s === WON ? () => go('deals') : undefined}><div class="stat-name">{s}</div><div class="stat-big">{S.stages[s]}</div>{s === WON && <div class="stat-note">View deals →</div>}</div>)}{S.none > 0 && <div class="stat-tile"><div class="stat-name">No stage</div><div class="stat-big">{S.none}</div></div>}</div>
      {S.stages[WON] > 0 && <div id="planWrap"><div class="plan-head">Closed Won All · Plans</div><div class="plan-grid" id="planGrid">{PLANS.map(p => { const g = S.cw.groups[p]; return <div class="stat-tile"><div class="stat-name">{p}</div><div class="stat-big">{g.n}</div>{p !== 'Free' && <div class="stat-sub">{CYCLES.map(cy => <div class="mini"><b>{g.cyc[cy].n}</b><span>{cy}</span></div>)}</div>}{p !== 'Free' && g.nocyc > 0 && <div class="stat-note">{g.nocyc} with no billing set</div>}{g.price > 0 && <div class="stat-price">Total price · {totText(g.price, g.mvr, g.pn, g.mn)}</div>}</div>; })}</div></div>}
      {A.any && <div id="actWrap"><div class="plan-head">Support Calls · Whatsapp · Tickets · Other</div><div class="act-grid" id="actGrid">
        {act('Support Calls', A.calls.n, A.calls.n ? [['Unique callers', A.calls.uniq], ['Repeat callers', A.calls.repeat]] : [])}
        {act('Whatsapp Inquiries', A.whatsapp.n, A.whatsapp.n ? [['Unique senders', A.whatsapp.uniq], ['Repeat senders', A.whatsapp.repeat]] : [])}
        {act('Tickets Attended', A.tickets.n, tm)}{act('Other', A.other.n, [])}
      </div></div>}
      <div class="stat-foot" id="statFoot">{foot.join('   ·   ')}</div>
    </div>
  </div>;
}

// ---------- Final Report + Monthly & Yearly ----------
function reportHtml(title: string, sub: string, text: string) {
  const dark = theme.value.mode !== 'light';
  const bg = dark ? '#000000' : '#eef1f8', fg = dark ? '#f6eceb' : '#1a2135', card = dark ? '#0a0304' : '#ffffff', muted = dark ? '#b9a2a4' : '#4a5470', accent = dark ? '#ef3340' : '#3b6fe0';
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Day End Report — ' + esc(title) + '</title><style>body{margin:0;font-family:system-ui,sans-serif;background:' + bg + ';color:' + fg + ';padding:32px 18px} .sheet{max-width:760px;margin:0 auto;background:' + card + ';border-radius:16px;padding:28px} h1{color:' + accent + ';margin:0 0 6px} .sub{color:' + muted + ';font-size:.82rem;margin-bottom:22px} pre{font-family:ui-monospace,Menlo,monospace;white-space:pre-wrap;font-size:.82rem;line-height:1.7}</style></head><body><div class="sheet"><h1>Day End Report</h1><div class="sub">' + esc(sub) + '</div><pre>' + esc(text) + '</pre></div></body></html>';
}
function pickImport(day: string) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.html,.htm,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/html,text/plain';
  inp.onchange = async () => { const f = inp.files && inp.files[0]; if (f) toast(await importFile(f, day)); }; inp.click();
}
function pasteImport(day: string) {
  let txt = '';
  openModal(() => <Sheet title="Paste report" onClose={closeModal} foot={<><Btn onClick={closeModal}>Cancel</Btn><button class="b-add" onClick={() => { closeModal(); toast(importReportText(txt, day)); }}>Import</button></>}>
    <p class="muted" style={{ marginTop: 0, fontSize: '.82rem' }}>Paste the text of a Final Report, or a Monthly, Yearly or All days report.</p>
    <textarea class="in" rows={12} placeholder="Day End Report — …" onInput={e => { txt = (e.target as HTMLTextAreaElement).value; }} /></Sheet>);
}
const xl = (keys: string[], name: string) => { if (!keys.length) return toast('Nothing to export yet'); download(name, buildXlsx(entryRows(keys), XLSX_WIDTHS), XLSX_MIME); toast('Excel file downloaded'); };
function ReportCard({ day }: { day: string }) {
  const txt = useMemo(() => dayReport(day), [day, rev.value]); const d = getDay(day);
  const dateStr = parseKey(day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return <div class="report-card"><div class="report-head"><div class="report-title">Final Report</div><div class="actions">
    <button class="btn btn-reset" onClick={() => { if (!entriesOf(day).length) return toast('Nothing to reset'); if (!confirm('Reset all entries for this day?')) return; const ids = entriesOf(day).map(e => e.id); ids.forEach(removeEntry); setShift(day, '09:00', '17:00'); toast('Reset done', { label: 'Undo', fn: () => ids.forEach(id => restore('entries', id)) }); }}>Reset</button>
    <button class="btn btn-excel" title="Import an Excel export, a Download Report .html, or a Monthly/Yearly .txt" onClick={() => pickImport(day)}>Import file</button>
    <button class="btn btn-excel" title="Paste the text of a Final Report to import it" onClick={() => pasteImport(day)}>Paste report</button>
    <button class="btn btn-excel" onClick={() => xl(entriesOf(day).length ? [day] : [], 'day-end-' + day + '.xlsx')}>Export day</button>
    <button class="btn btn-excel" onClick={() => xl(daysWithEntries(), 'day-end-all-days.xlsx')}>Export all days</button>
    <button class="btn" onClick={() => { download('day-end-report-' + day + '.html', reportHtml(dateStr, dateStr + ' · ' + fmt12(d.shiftStart) + ' – ' + fmt12(d.shiftEnd), txt), 'text/html;charset=utf-8'); toast('Report HTML downloaded'); }}>Download Report</button>
    <button class="btn btn-copy" onClick={async () => toast((await copyText(txt)) ? 'Copied to clipboard' : 'Copy failed')}>Copy</button>
  </div></div><div class="report-preview" id="reportPreview">{txt}</div></div>;
}
const pm = signal<{ m: PeriodMode; y: number; mo: number }>({ m: 'month', y: new Date().getFullYear(), mo: new Date().getMonth() + 1 });
function PeriodCard({ day }: { day: string }) {
  const P = pm.value, txt = useMemo(() => periodReport(P.m, P.y, P.mo), [P.m, P.y, P.mo, rev.value]), title = periodTitle(P.m, P.y, P.mo);
  const years = Array.from(new Set([P.y, new Date().getFullYear(), ...daysWithEntries().map(k => +k.slice(0, 4))])).sort((a, b) => b - a);
  const slug = (P.m === 'all' ? 'all-days' : P.m === 'month' ? P.y + '-' + String(P.mo).padStart(2, '0') : String(P.y));
  return <div class="report-card" id="periodCard"><div class="report-head"><div class="report-title">Monthly &amp; Yearly Report</div>
    <div class="seg" id="periodMode">{([['month', 'Monthly'], ['year', 'Yearly'], ['all', 'All days']] as const).map(([k, l]) => <button data-m={k} class={P.m === k ? 'active' : ''} onClick={() => { pm.value = { ...P, m: k }; }}>{l}</button>)}</div></div>
    <div class="period-row">
      <select id="pMonth" aria-label="Month" style={{ display: P.m === 'month' ? '' : 'none' }} value={P.mo} onChange={e => { pm.value = { ...P, mo: +(e.target as HTMLSelectElement).value }; }}>{MONTHS.map((m, i) => <option value={i + 1}>{m}</option>)}</select>
      <select id="pYear" aria-label="Year" style={{ display: P.m === 'all' ? 'none' : '' }} value={P.y} onChange={e => { pm.value = { ...P, y: +(e.target as HTMLSelectElement).value }; }}>{years.map(y => <option value={y}>{y}</option>)}</select>
      <div class="actions" style={{ marginLeft: 'auto' }}>
        <button class="btn btn-excel" title="Import an Excel export, a Download Report .html, or a report .txt" onClick={() => pickImport(day)}>Import file</button>
        <button class="btn btn-excel" title="Paste the text of a Monthly, Yearly or All days report to import it" onClick={() => pasteImport(day)}>Paste report</button>
        <button class="btn btn-excel" onClick={() => xl(periodDays(P.m, P.y, P.mo), 'day-end-' + slug + '.xlsx')}>Export Excel</button>
        <button class="btn" onClick={() => { download('day-end-' + slug + '.txt', txt); toast('Report downloaded'); }}>Download report</button>
        <button class="btn" onClick={() => { download('day-end-' + slug + '.html', reportHtml(title, title, txt), 'text/html;charset=utf-8'); toast('Report HTML downloaded'); }}>Download HTML</button>
        <button class="btn btn-copy" onClick={async () => toast((await copyText(txt)) ? 'Copied to clipboard' : 'Copy failed')}>Copy</button>
      </div>
    </div>
    <div class="report-preview" id="periodPreview">{txt}</div></div>;
}
export const _keep = [entryRows, quickAdd, actStats];
