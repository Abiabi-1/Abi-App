// The blood moon, drawn exactly as in the old app (tools/moon.core.js): your moon artwork lit by phase
// (0 = new moon … 1 = full moon, waxing: right side lights first). No outline: only the moon itself, a soft
// terminator, limb darkening and a corona that grows with the phase. Glow colours follow the palette.
import moonUrl from '../assets/moon.jpg';
import { timeToMin, todayKey } from '../lib/util';

let IMG: HTMLImageElement | null = null, READY = false; const Q: ((i: HTMLImageElement) => void)[] = [];
function moonImg(cb: (i: HTMLImageElement) => void) {
  if (READY && IMG) return cb(IMG);
  Q.push(cb);
  if (!IMG) { IMG = new Image(); IMG.onload = () => { READY = true; Q.splice(0).forEach(f => f(IMG!)); }; IMG.src = moonUrl; }
}
function palRGB(): number[][] | null {
  try {
    const cs = getComputedStyle(document.documentElement); const out: number[][] = [];
    for (let i = 0; i < 5; i++) { const v = cs.getPropertyValue('--t' + i).trim(); const m = v.match(/\d+/g); if (!m || m.length < 3) return null; out.push(m.slice(0, 3).map(Number)); }
    return out;
  } catch { return null; }
}
function pcol(P: number[][] | null, i: number, j: number, m: number, fb: string) { if (!P) return fb; const a = P[i], b = P[j]; return [0, 1, 2].map(k => Math.round(a[k] + (b[k] - a[k]) * m)).join(','); }
export function moonDraw(cv: HTMLCanvasElement, f: number, over: boolean, soft: boolean) {
  const dpr = Math.min(2.5, window.devicePixelRatio || 1), css = cv.clientWidth || cv.width || 120, S = Math.round(css * dpr);
  if (cv.width !== S) { cv.width = S; cv.height = S; }
  const P = palRGB();
  moonImg(img => {
    const x = cv.getContext('2d'); if (!x) return; const c = S / 2, r = (S / 2) * 0.62; f = Math.max(0, Math.min(1, f)); const sh = Math.pow(f, 1.4);
    x.clearRect(0, 0, S, S); x.globalCompositeOperation = 'source-over';
    if (soft) {
      x.globalCompositeOperation = 'lighter';
      const cH = pcol(P, 3, 1, 0.45, '176,16,36'), cB = pcol(P, 1, 2, 0.38, '236,52,64');
      const gh = x.createRadialGradient(c, c, r * 0.8, c, c, S / 2), gb = x.createRadialGradient(c, c, r * 0.8, c, c, S / 2), ex = over ? 0.06 : 0;
      for (let k = 0; k <= 16; k++) {
        const t = k / 16, d = (r * 0.8 + t * (S / 2 - r * 0.8) - r) / r, u = Math.max(0, d), edge = Math.pow(1 - t, 2);
        gh.addColorStop(t, 'rgba(' + cH + ',' + ((0.05 + 0.24 * sh + ex) * Math.exp(-0.4 * u * u) * edge).toFixed(4) + ')');
        gb.addColorStop(t, 'rgba(' + cB + ',' + ((0.09 + 0.34 * sh + ex) * Math.exp(-4 * u * u) * edge).toFixed(4) + ')');
      }
      x.fillStyle = gh; x.fillRect(0, 0, S, S); x.fillStyle = gb; x.fillRect(0, 0, S, S);
      x.globalCompositeOperation = 'source-over';
    } else {
      const g1 = x.createRadialGradient(c, c, r * 0.9, c, c, S / 2), k1 = pcol(P, 1, 1, 0, '205,22,40'), k3 = pcol(P, 3, 3, 0, '150,10,28'), k0 = pcol(P, 0, 0, 0, '120,0,16'), k2 = pcol(P, 2, 2, 0, '255,70,84');
      g1.addColorStop(0, 'rgba(' + k1 + ',' + (0.05 + 0.55 * sh + (over ? 0.1 : 0)) + ')'); g1.addColorStop(0.35, 'rgba(' + k3 + ',' + (0.02 + 0.22 * sh) + ')'); g1.addColorStop(1, 'rgba(' + k0 + ',0)');
      x.fillStyle = g1; x.fillRect(0, 0, S, S);
      const g2 = x.createRadialGradient(c, c, r * 0.97, c, c, r * 1.22);
      g2.addColorStop(0, 'rgba(' + k2 + ',' + (0.10 + 0.5 * sh) + ')'); g2.addColorStop(1, 'rgba(' + k2 + ',0)'); x.fillStyle = g2; x.fillRect(0, 0, S, S);
    }
    x.save(); x.beginPath(); x.arc(c, c, r, 0, Math.PI * 2); x.clip();
    x.drawImage(img, c - r, c - r, 2 * r, 2 * r);
    const lb = x.createRadialGradient(c - r * 0.12, c - r * 0.1, r * 0.35, c, c, r * 1.02); lb.addColorStop(0, 'rgba(0,0,0,0)'); lb.addColorStop(0.72, 'rgba(10,0,2,0.18)'); lb.addColorStop(1, 'rgba(8,0,2,0.78)'); x.fillStyle = lb; x.fillRect(0, 0, S, S);
    if (f < 0.995) {
      const a0 = r * Math.abs(1 - 2 * f), N = 7, fe = r * 0.07;
      for (let i = 0; i < N; i++) {
        const a = Math.max(0.01, a0 + ((i - (N - 1) / 2) * fe) / (N / 2));
        x.beginPath(); x.moveTo(c, c - r); x.arc(c, c, r, -Math.PI / 2, Math.PI / 2, true);
        x.ellipse(c, c, a, r, 0, Math.PI / 2, -Math.PI / 2, f >= 0.5 ? false : true);
        x.closePath(); x.fillStyle = 'rgba(2,0,1,' + (0.93 / N) * 1.9 + ')'; x.fill();
      }
    }
    x.restore();
  });
}
export function moonPhaseName(f: number) { return f < 0.04 ? 'New moon' : f < 0.46 ? 'Crescent' : f < 0.54 ? 'Half moon' : f < 0.96 ? 'Gibbous' : 'Full moon'; }
/** shift progress for a day: f = 0 before the shift (and on other days), 1 at the end; o = overtime */
export function shiftFrac(day: string, shiftStart: string, shiftEnd: string, now = new Date()): { f: number; o: boolean } {
  const s = timeToMin(shiftStart); let e = timeToMin(shiftEnd); if (e <= s) e = s + 60;
  if (day !== todayKey()) return { f: 0, o: false };
  const m = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  if (m < s) return { f: 0, o: false }; if (m >= e) return { f: 1, o: true }; return { f: (m - s) / (e - s), o: false };
}
