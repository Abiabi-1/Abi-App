// Shared components: every section uses these (the "bases"), so there are no per-section button looks.
import { signal } from '@preact/signals';
import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from './icons';
import { cx } from '../lib/util';

// ---------- toast ----------
export const toastMsg = signal<{ t: string; at: number; act?: { label: string; fn: () => void } } | null>(null);
let toastT: any = 0;
export function toast(t: string, act?: { label: string; fn: () => void }) { toastMsg.value = { t, at: Date.now(), act }; clearTimeout(toastT); toastT = setTimeout(() => { toastMsg.value = null; }, act ? 6000 : 2600); }
export function Toast() { const m = toastMsg.value; if (!m) return null; return <div class="toast" role="status">{m.t}{m.act && <button class="b" onClick={() => { m.act!.fn(); toastMsg.value = null; }}>{m.act.label}</button>}</div>; }

// ---------- data box (1.3) ----------
export function Stat(p: { l: string; v: ComponentChildren; c?: ComponentChildren; tone?: 'acc' | 'good' | 'bad' | ''; onClick?: () => void; rows?: [string, number, number?][]; title?: string }) {
  const body = <>
    <div class="l">{p.l}</div><div class={cx('v', p.tone)}>{p.v}</div>{p.c != null && <div class="c">{p.c}</div>}
    {p.rows && p.rows.length > 0 && <div class="rows">{p.rows.map(r => <div class="rw"><i style={{ width: (r[2] ? Math.round((r[1] / r[2]) * 100) : 0) + '%' }} /><span>{r[0]}</span><b>{r[1]}</b></div>)}</div>}
  </>;
  return p.onClick ? <button type="button" class="stat" title={p.title} onClick={p.onClick}>{body}</button> : <div class="stat" title={p.title}>{body}</div>;
}
export function Tiles({ children, fill }: { children: ComponentChildren; fill?: boolean }) { return <div class={cx('tiles', fill && 'fill')}>{children}</div>; }

// ---------- page header (one controls row) ----------
export function PageHead(p: { icon: string; title: string; sub?: ComponentChildren; right?: ComponentChildren }) {
  return <div class="ph"><div class="ph-ic"><Icon n={p.icon} /></div><div style={{ minWidth: 0 }}><h1>{p.title}</h1>{p.sub && <p>{p.sub}</p>}</div>{p.right && <div class="ph-r">{p.right}</div>}</div>;
}
export function SearchBox({ value, onInput, ph }: { value: string; onInput: (v: string) => void; ph?: string }) {
  return <div class="search grow"><Icon n="search" /><input class="in" type="search" placeholder={ph || 'Search'} value={value} onInput={e => onInput((e.target as HTMLInputElement).value)} /></div>;
}
export function Seg<T extends string>({ value, opts, onChange }: { value: T; opts: [T, ComponentChildren][]; onChange: (v: T) => void }) {
  return <div class="seg" role="tablist">{opts.map(([k, l]) => <button type="button" role="tab" aria-selected={value === k} class={value === k ? 'on' : ''} onClick={() => onChange(k)}>{l}</button>)}</div>;
}
export function Chips<T extends string>({ value, opts, onChange }: { value: T; opts: [T, ComponentChildren, number?][]; onChange: (v: T) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = ref.current?.querySelector('.on') as HTMLElement | null; if (el && ref.current) { const r = ref.current; r.scrollLeft = el.offsetLeft - r.clientWidth / 2 + el.clientWidth / 2; } }, [value]);
  return <div class="row-scroll" ref={ref}>{opts.map(([k, l, n]) => <button type="button" class={cx('chip', value === k && 'on')} onClick={() => onChange(k)}>{l}{n != null && <span class="badge">{n}</span>}</button>)}</div>;
}
export function Btn(p: { icon?: string; children?: ComponentChildren; onClick?: (e: MouseEvent) => void; title?: string; cls?: string; on?: boolean; disabled?: boolean }) {
  return <button type="button" class={cx('b', p.on && 'is-on', p.cls)} title={p.title} onClick={p.onClick} disabled={p.disabled}>{p.icon && <Icon n={p.icon} />}{p.children}</button>;
}
export function IconBtn(p: { icon: string; title: string; onClick?: (e: MouseEvent) => void; on?: boolean; bad?: boolean; sm?: boolean }) {
  return <button type="button" class={cx('bi', p.sm && 'sm', p.on && 'is-on', p.bad && 'is-bad')} title={p.title} aria-label={p.title} onClick={e => { e.stopPropagation(); p.onClick?.(e); }}><Icon n={p.icon} /></button>;
}
export function Add(p: { children: ComponentChildren; onClick: () => void; title?: string; disabled?: boolean }) { return <button type="button" class="b-add" onClick={p.onClick} title={p.title} disabled={p.disabled}><Icon n="plus" />{p.children}</button>; }
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) { return <button type="button" role="switch" aria-checked={on} aria-label={label} class={cx('sw', on && 'on')} onClick={() => onChange(!on)} />; }

/** WhatsApp / Email icons with a Tick under each (2 x 2). state: '' | 'g' | 'r' for the icon, '' | 'y' | 'n' for the tick. */
export function MarkGrid(p: { wa: string; em: string; twa: string; tem: string; onMark: (k: 'wa' | 'em') => void; onTick: (k: 'wa' | 'em') => void; labels?: boolean }) {
  const ic = (k: 'wa' | 'em', s: string) => <button type="button" class={cx('ic', s === 'g' && 'is-on', s === 'r' && 'is-bad')} title={(k === 'wa' ? 'WhatsApp' : 'Email') + (s === 'g' ? ': yes' : s === 'r' ? ': unable' : ': not marked') + ' (tap to change)'} aria-label={k === 'wa' ? 'WhatsApp' : 'Email'} onClick={e => { e.stopPropagation(); p.onMark(k); }}><Icon n={k} /></button>;
  const tk = (k: 'wa' | 'em', s: string) => <button type="button" class={cx('ic tick', s === 'y' && 'is-on', s === 'n' && 'is-bad')} title={(k === 'wa' ? 'WhatsApp' : 'Email') + (s === 'y' ? ' sent ✓ (tap for ✗)' : s === 'n' ? ' not possible ✗ (tap to clear)' : ' – tap to confirm sent')} aria-label={(k === 'wa' ? 'WhatsApp' : 'Email') + ' confirmation'} onClick={e => { e.stopPropagation(); p.onTick(k); }}>{s === 'n' ? '✗' : '✓'}</button>;
  return <div class="mk">{ic('wa', p.wa)}{ic('em', p.em)}{tk('wa', p.twa)}{tk('em', p.tem)}</div>;
}

// ---------- sheet (pop-up on PC, bottom sheet on phone) ----------
export function Sheet(p: { title: ComponentChildren; onClose: () => void; children: ComponentChildren; foot?: ComponentChildren; wide?: boolean; head?: ComponentChildren }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') p.onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  return <div class="ov" onMouseDown={e => { if (e.target === e.currentTarget) p.onClose(); }}>
    <div class={cx('sheet', p.wide && 'wide')} role="dialog" aria-modal="true">
      <div class="sheet-h"><h3>{p.title}</h3>{p.head}<IconBtn icon="x" title="Close" onClick={p.onClose} /></div>
      <div class="sheet-b">{p.children}</div>
      {p.foot && <div class="sheet-f">{p.foot}</div>}
    </div></div>;
}
// global modal stack (opened from anywhere)
export const modal = signal<null | (() => JSX.Element)>(null);
export function openModal(f: () => JSX.Element) { modal.value = f; }
export function closeModal() { modal.value = null; }
export function Modal() { const f = modal.value; return f ? f() : null; }

// ---------- menu (one "⋯" menu for record actions) ----------
export const menuState = signal<null | { x: number; y: number; items: MenuItem[] }>(null);
export type MenuItem = { label: string; fn?: () => void; danger?: boolean; sep?: boolean; icon?: string } | null | false;
export function openMenu(e: MouseEvent, items: MenuItem[]) {
  e.stopPropagation(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  menuState.value = { x: Math.min(r.right, innerWidth - 8), y: r.bottom + 4, items };
}
export function Menu() {
  const m = menuState.value; const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ l: number; t: number } | null>(null);
  useEffect(() => {
    if (!m) { setPos(null); return; }
    const el = ref.current; if (!el) return; const w = el.offsetWidth, h = el.offsetHeight;
    setPos({ l: Math.max(8, Math.min(m.x - w, innerWidth - w - 8)), t: m.y + h > innerHeight - 8 ? Math.max(8, m.y - h - 40) : m.y });
    const off = (e: Event) => { if (!el.contains(e.target as Node)) menuState.value = null; };
    setTimeout(() => document.addEventListener('mousedown', off), 0); const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') menuState.value = null; };
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [m]);
  if (!m) return null;
  return <div class="menu" ref={ref} style={{ left: (pos?.l ?? -999) + 'px', top: (pos?.t ?? -999) + 'px' }}>
    {m.items.filter(Boolean).map(it => { const i = it as Exclude<MenuItem, null | false>; return i.sep ? <hr /> : <button type="button" class={i.danger ? 'danger' : ''} onClick={() => { menuState.value = null; i.fn?.(); }}>{i.icon && <Icon n={i.icon} />}{i.label}</button>; })}
  </div>;
}
/** Two-tap confirm for destructive actions (borderless rose text). */
export function DangerBtn({ children, onConfirm, title }: { children: ComponentChildren; onConfirm: () => void; title?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3500); return () => clearTimeout(t); }, [armed]);
  return <button type="button" class="b danger" title={title} onClick={e => { e.stopPropagation(); if (armed) { setArmed(false); onConfirm(); } else setArmed(true); }}>{armed ? 'Sure?' : children}</button>;
}
export function confirmBox(title: string, text: string, ok: string, fn: () => void) {
  openModal(() => <Sheet title={title} onClose={closeModal} foot={<><Btn onClick={closeModal}>Cancel</Btn><button class="b danger" onClick={() => { closeModal(); fn(); }}>{ok}</button></>}><p class="muted">{text}</p></Sheet>);
}
export function Field(p: { label: string; children: ComponentChildren; full?: boolean }) { return <label class={cx('f', p.full && 'full')}>{p.label}{p.children}</label>; }
export function Empty({ children }: { children: ComponentChildren }) { return <div class="empty">{children}</div>; }
