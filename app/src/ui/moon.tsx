// The blood moon: floats on every page (Day End has its own inside the shift box). Hold 0.4 s → Day End Quick Add.
// Drag to move, double-click to hide, Alt+M or the "☾ Moon" tab to bring it back. Stars only after a 5 s rest.
import { signal } from '@preact/signals';
import { useEffect, useRef, useState } from 'preact/hooks';
import { lsJSON, lsSet, clock, timeToMin, todayKey } from '../lib/util';
import { quickAdd, route, theme } from './state';
import { getDay } from '../domain/dayend';
import { moonDraw, shiftFrac, moonPhaseName } from './moondraw';

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
    const fit = () => setPos(p => { if (!p) return p; const s = 118; const x = Math.max(4, Math.min(innerWidth - s - 4, p.x)), y = Math.max(4, Math.min(innerHeight - s - 60, p.y)); return x !== p.x || y !== p.y ? { x, y } : p; });
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
  const cv = useRef<HTMLCanvasElement>(null);
  const k = todayKey(), d = getDay(k), n = new Date(), s = timeToMin(d.shiftStart) * 60, e0 = timeToMin(d.shiftEnd) * 60, e = e0 <= s ? s + 3600 : e0, nowS = n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds();
  const fr = shiftFrac(k, d.shiftStart, d.shiftEnd);
  useEffect(() => { if (cv.current) moonDraw(cv.current, fr.f, fr.o, true); });
  if (route.value.t === 'day') return null;
  if (moonHidden.value) return <button type="button" class="moon-tab" onClick={() => setHidden(false)} title="Show the moon (Alt+M)"><span class="mt-i">☾</span><span class="mt-l">Moon</span></button>;
  const txt = nowS < s ? clock((s - nowS) * 1000) : nowS < e ? clock((e - nowS) * 1000) : '+' + clock((nowS - e) * 1000), lab = nowS < s ? 'to start' : nowS < e ? 'left' : 'overtime';
  return <>{resting.value && <NightSky f={fr.f} />}<div ref={ref} class={'fmoon' + (fr.o ? ' over' : '')} style={pos ? { left: pos.x + 'px', top: pos.y + 'px', right: 'auto', bottom: 'auto' } : undefined} title={moonPhaseName(fr.f) + ' · hold for Quick Add · drag to move · double-click to hide'} role="button" aria-label="Moon – hold for Quick Add">
    <canvas ref={cv} aria-hidden="true" /><div class="mn-c"><b class="mn-t">{txt}</b><i class="mn-l">{lab}</i></div>
  </div></>;
}

// night sky on the other pages: after 5 s without moving, stars appear around (more as the moon fills)
const NS = (() => { let seed = 777; const r = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; const a: { s: string; t: number }[] = []; for (let q = 0; q < 300; q++) { const z = r() < 0.85 ? 1.3 + r() * 1.2 : 2.4 + r() * 1.6; a.push({ s: 'left:' + (r() * 100).toFixed(2) + '%;top:' + (r() * 100).toFixed(2) + '%;width:' + z.toFixed(1) + 'px;height:' + z.toFixed(1) + 'px;animation-delay:' + (r() * 4).toFixed(2) + 's;animation-duration:' + (q % 4 === 0 ? 1.4 + r() * 1.4 : 2.6 + r() * 3).toFixed(1) + 's', t: q < 45 ? 0 : r() }); } return a; })();
function NightSky({ f }: { f: number }) {
  return <div class="night" aria-hidden="true">{NS.map(n => <i class={n.t <= 0.05 + 0.95 * f ? 'on' : ''} style={n.s} />)}</div>;
}
