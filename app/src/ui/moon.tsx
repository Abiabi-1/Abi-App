// The blood moon: floats on every page (Day End has its own inside the shift box). Hold 0.4 s → Day End Quick Add.
// Drag to move, double-click to hide, Alt+M or the "☾ Moon" tab to bring it back. Stars only after a 5 s rest.
import { signal } from '@preact/signals';
import { useEffect, useRef, useState } from 'preact/hooks';
import { lsJSON, lsSet, clock, timeToMin, todayKey } from '../lib/util';
import { quickAdd, route, theme } from './state';
import { getDay } from '../domain/dayend';

export const resting = signal(false);
let restT: any = 0;
function wake() { if (resting.value) resting.value = false; clearTimeout(restT); restT = setTimeout(() => { resting.value = !theme.value.calm; }, 5000); }
['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => window.addEventListener(ev, wake, { passive: true, capture: true }));
wake();

export const moonHidden = signal(lsJSON<boolean>('hub_moon_hide', false));
const setHidden = (v: boolean) => { moonHidden.value = v; lsSet('hub_moon_hide', JSON.stringify(v)); };
window.addEventListener('keydown', e => { if (e.altKey && (e.key === 'm' || e.key === 'M' || e.code === 'KeyM')) { e.preventDefault(); setHidden(!moonHidden.value); } });

export function holdToQuickAdd(el: HTMLElement | null) {
  if (!el) return; let t: any = 0, sx = 0, sy = 0;
  el.onpointerdown = e => { sx = e.clientX; sy = e.clientY; clearTimeout(t); t = setTimeout(() => { quickAdd.value = {}; try { navigator.vibrate?.(15); } catch { /* */ } }, 400); };
  el.onpointermove = e => { if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 8) clearTimeout(t); };
  el.onpointerup = el.onpointerleave = el.onpointercancel = () => clearTimeout(t);
}
export function FloatMoon() {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(lsJSON<{ x: number; y: number } | null>('hub_moon_pos', null));
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(i); }, []);
  useEffect(() => {   // keep it inside the window
    const fit = () => setPos(p => { if (!p) return p; const s = 92; const x = Math.max(4, Math.min(innerWidth - s - 4, p.x)), y = Math.max(4, Math.min(innerHeight - s - 60, p.y)); return x !== p.x || y !== p.y ? { x, y } : p; });
    fit(); addEventListener('resize', fit); addEventListener('focus', fit); return () => { removeEventListener('resize', fit); removeEventListener('focus', fit); };
  }, []);
  useEffect(() => {
    const el = ref.current; if (!el) return; holdToQuickAdd(el);
    let drag: { dx: number; dy: number; moved: boolean } | null = null; const down0 = el.onpointerdown!;
    el.onpointerdown = e => { down0.call(el, e); const r = el.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false }; el.setPointerCapture(e.pointerId); };
    const mv0 = el.onpointermove!;
    el.onpointermove = e => { mv0.call(el, e); if (!drag) return; const x = e.clientX - drag.dx, y = e.clientY - drag.dy; if (!drag.moved && Math.abs(e.movementX) + Math.abs(e.movementY) < 1) return; drag.moved = true; setPos({ x, y }); };
    const up0 = el.onpointerup!;
    el.onpointerup = e => { up0.call(el, e); if (drag && drag.moved) { const r = el.getBoundingClientRect(); lsSet('hub_moon_pos', JSON.stringify({ x: r.left, y: r.top })); } drag = null; };
    el.ondblclick = () => setHidden(true);
  }, [moonHidden.value, route.value.t]);
  if (route.value.t === 'day') return null;
  if (moonHidden.value) return <button type="button" class="moon-tab" onClick={() => setHidden(false)} title="Show the moon (Alt+M)">☾ Moon</button>;
  const k = todayKey(), d = getDay(k), n = new Date(), s = timeToMin(d.shiftStart) * 60, e = timeToMin(d.shiftEnd) * 60, nowS = n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds();
  const txt = nowS < s ? clock((s - nowS) * 1000) : nowS < e ? clock((e - nowS) * 1000) : '+' + clock((nowS - e) * 1000), lab = nowS < s ? 'TO START' : nowS < e ? 'LEFT' : 'OVERTIME';
  return <div ref={ref} class="fmoon" style={pos ? { left: pos.x + 'px', top: pos.y + 'px', right: 'auto', bottom: 'auto' } : undefined} title="Hold for Quick Add · drag to move · double-click to hide" role="button" aria-label="Moon – hold for Quick Add">
    <div class="fmoon-img" /><div class="fmoon-t"><b class="mono">{txt}</b><span>{lab}</span></div>
  </div>;
}
