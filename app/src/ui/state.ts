// App-level state: navigation, theme/palette (per device), phone detection.
import { signal, effect } from '@preact/signals';
import { get, put } from '../data/store';
import { lsJSON, lsSet } from '../lib/util';

export type Tab = 'day' | 'dashboard' | 'analytics' | 'deals' | 'dealboard' | 'lost' | 'tickets' | 'tasks' | 'hr' | 'auto' | 'tools' | 'settings';
export const SECTIONS: { id: Tab; label: string; icon: string }[] = [
  { id: 'day', label: 'Day End Report', icon: 'day' }, { id: 'dashboard', label: 'Dashboard', icon: 'dash' }, { id: 'analytics', label: 'Analytics', icon: 'chart' },
  { id: 'dealboard', label: 'Deals', icon: 'deal' }, { id: 'deals', label: 'Won Deals', icon: 'won' }, { id: 'lost', label: 'Lost Deals', icon: 'lost' },
  { id: 'tickets', label: 'Tickets', icon: 'ticket' }, { id: 'tasks', label: 'Tasks', icon: 'tasks' }, { id: 'hr', label: 'HR & Time', icon: 'hr' },
  { id: 'auto', label: 'Automations', icon: 'auto' }, { id: 'tools', label: 'Tools', icon: 'board' }, { id: 'settings', label: 'Settings', icon: 'gear' },
];
const DEFAULT_HIDDEN: Tab[] = ['hr', 'auto', 'tools', 'settings'];
const NEW_TABS: Tab[] = ['tools'];   // Round 61: sections added later start hidden in the bar for people who already arranged it
export function navCfg(): { order: Tab[]; hidden: Tab[] } {
  const c: { order?: Tab[]; hidden?: Tab[]; known?: Tab[] } = get<{ order?: Tab[]; hidden?: Tab[]; known?: Tab[] }>('cfg', 'nav') || {};
  const order = (c.order || []).filter(t => SECTIONS.some(s => s.id === t)); SECTIONS.forEach(s => { if (order.indexOf(s.id) < 0) order.push(s.id); });
  const hidden = c.hidden ? [...c.hidden, ...NEW_TABS.filter(t => !(c.known || []).includes(t) && !c.hidden!.includes(t))] : DEFAULT_HIDDEN;
  return { order, hidden };
}
export function saveNav(order: Tab[], hidden: Tab[]) { put('cfg', 'nav', { order, hidden, known: SECTIONS.map(s => s.id) }); }

function parseHash(): { t: Tab; id?: string } {
  const m = location.hash.match(/^#\/([a-z]+)(?:\/(.+))?$/); const t = m && SECTIONS.some(s => s.id === m[1]) ? (m[1] as Tab) : (lsJSON<Tab>('v2_tab', 'day'));
  return { t, id: m && m[2] ? decodeURIComponent(m[2]) : undefined };
}
export const route = signal(parseHash());
window.addEventListener('hashchange', () => { route.value = parseHash(); });
export function go(t: Tab, id?: string) { const h = '#/' + t + (id ? '/' + encodeURIComponent(id) : ''); if (location.hash !== h) location.hash = h; else route.value = { t, id }; lsSet('v2_tab', JSON.stringify(t)); window.scrollTo(0, 0); }

// ---------- theme + palettes (per device, never automatic by time of day) ----------
export const PALETTES: { id: string; name: string; h: number; s: number; l: number; on?: string }[] = [
  { id: 'crimson', name: 'Crimson', h: 355, s: 1, l: 0 }, { id: 'grey', name: 'Deep grey', h: 220, s: 0.07, l: 0.06 }, { id: 'blue', name: 'Deep blue', h: 219, s: 0.95, l: -0.07 },
  { id: 'purple', name: 'Deep purple', h: 268, s: 0.9, l: -0.05 }, { id: 'green', name: 'Deep green', h: 146, s: 0.85, l: -0.1 }, { id: 'yellow', name: 'Fluorescent yellow', h: 63, s: 1.4, l: 0.1, on: '#101000' },
  { id: 'pink', name: 'Hot pink', h: 328, s: 1, l: 0.02 },
];
export const theme = signal(lsJSON<{ mode: 'dark' | 'light'; pal: string; calm: boolean }>('v2_theme', { mode: (lsJSON<string>('dayEndReport_theme', 'dark') === 'light' ? 'light' : 'dark') as any, pal: 'crimson', calm: false }));
const BASE: [number, number, number][] = [[352, 0.9, 0.19], [355, 0.75, 0.52], [354, 0.99, 0.67], [353, 0.86, 0.28], [355, 1, 0.76]];   // t0..t4 of the crimson palette (HSL)
function hsl(h: number, s: number, l: number) { s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l)); const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0), f(8), f(4)].map(x => Math.round(x * 255)); }
effect(() => {
  const th = theme.value; lsSet('v2_theme', JSON.stringify(th));
  const r = document.documentElement; r.dataset.theme = th.mode;
  const p = PALETTES.find(x => x.id === th.pal) || PALETTES[0];
  const cols = BASE.map(([, s, l]) => hsl(p.id === 'crimson' ? 355 : p.h, s * p.s, l + p.l));
  cols.forEach((c, i) => { r.style.setProperty('--t' + i, 'rgb(' + c.join(',') + ')'); });
  r.style.setProperty('--accent-rgb', cols[1].join(',')); r.style.setProperty('--accent2-rgb', cols[2].join(','));
  r.style.setProperty('--on-accent', p.on || '#fff');
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', th.mode === 'light' ? '#f4f2f3' : '#000000');
});

const mq = window.matchMedia('(max-width: 820px)');
export const isPhone = signal(mq.matches);
mq.addEventListener ? mq.addEventListener('change', e => { isPhone.value = e.matches; }) : mq.addListener(e => { isPhone.value = e.matches; });
export const quickAdd = signal<null | { sk?: string; deal?: string; notes?: string }>(null);
export const searchOpen = signal(false);
export const sideOpen = signal(false);
