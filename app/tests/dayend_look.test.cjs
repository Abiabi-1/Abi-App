// The Day End uses the old page's structure and stylesheet, and the moon is drawn as before (phase follows the shift,
// no outline). Optional: LEGACY_DIST=<old app folder> also compares the computed look of key parts with the old page.
const H = require('./_h.cjs'); const fs = require('fs'), path = require('path');
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture_legacy.json'), 'utf8'));
const seed = { fn: f => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1'); Object.keys(f).forEach(k => localStorage.setItem(k, f[k])); localStorage.setItem('hub_rem_dismiss', '1'); try { sessionStorage.setItem('cloud_skip', '1'); } catch (e) {} }, arg: FIX };
const pad = n => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
async function moonLight(p, sel) {   // mean brightness of the moon's centre on its canvas
  return p.evaluate(sel => { const c = document.querySelector(sel) || [...document.querySelectorAll('.de-host')].map(h => h.shadowRoot && h.shadowRoot.querySelector(sel)).find(Boolean); const x = c.getContext('2d'), w = c.width, d = x.getImageData(w * 0.4, w * 0.4, w * 0.2, w * 0.2).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4) / 3; }, sel);
}
(async () => {
  const b = await H.chromium.launch();
  // ---- structure ----
  const ctx = await H.context(b, { init: seed }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://app.local/next/#/day'); await p.waitForTimeout(1200);
  await p.fill('#dayPick', '2026-11-20'); await p.dispatchEvent('#dayPick', 'change'); await p.waitForTimeout(300);
  for (const sel of ['header .brand h1', '.day-card .day-chips .day-chip.active', '.shift-card #countdownWrap canvas#moonCv', '.shift-card .ns-sky i.on', '.shift-fields #shiftStart', '#clkStrip .clk-t b', '#rcBar .cx-ft', '.hour-block .hour-head .hour-time', '.section .section-icon.green', '.input-row .btn-add', '.stage-row select[data-f="stage"]', '.entry .entry-num', '.entry .entry-at', '.entry .entry-mkw .entry-mk', '.entry .entry-tk', '.entry .entry-cp .cp-chip', '#statsCard .stat-grid .stat-tile', '#planGrid .stat-sub .mini', '#actGrid .act-tile', '.report-card #reportPreview', '#periodCard #pMonth'])
    H.check('old structure: ' + sel, await p.locator(sel).count() > 0);
  const clk = await p.evaluate(() => { const r = document.querySelector('.de-host').shadowRoot; return [...r.querySelectorAll('#clkStrip .clk-t b')].map(x => x.textContent); });
  H.check('clock strip shows the punches of the day', clk.join('|') === '9:02:00 AM|1:00:00 PM|1:30:00 PM|6:05:00 PM', clk.join('|'));
  const ring = await p.evaluate(() => { const r = document.querySelector('.de-host').shadowRoot, s = r.querySelector('#countdownWrap svg'); if (!s) return 'none'; const cs = getComputedStyle(s); return cs.display === 'none' || +cs.opacity === 0 || cs.visibility === 'hidden' ? 'hidden' : 'shown'; });
  H.check('no ring / outline around the Day End moon', ring !== 'shown', ring);
  const css = await p.evaluate(() => { const r = document.querySelector('.de-host').shadowRoot; const g = (s, prop) => getComputedStyle(r.querySelector(s))[prop]; return { card: g('.shift-card', 'borderRadius'), add: g('.btn-add', 'backgroundImage'), font: g('.hour-time', 'fontFamily') }; });
  H.check('old styles apply (shift card radius, red + Add, mono hour time)', parseFloat(css.card) >= 12 && /gradient/.test(css.add) && /JetBrains/i.test(css.font), JSON.stringify(css));
  H.check('Day End styles do not leak out (the app bar keeps its own look)', await p.evaluate(() => getComputedStyle(document.querySelector('.bar .tab')).borderTopWidth) === '1px' && await p.evaluate(() => getComputedStyle(document.querySelector('.bar .tab')).backgroundColor) === 'rgba(0, 0, 0, 0)');
  // filter + tick + copy chip still work
  await p.click('#rcBar .cx-ft[data-ft="wa"]'); await p.waitForTimeout(150);
  const shown = await p.locator('.hour-block.open .entry').count();
  H.check('WhatsApp filter (green) shows only the WhatsApp-green entry', shown === 1, String(shown));
  await p.click('#rcBar .cx-ft[data-ft="wa"]'); await p.click('#rcBar .cx-ft[data-ft="wa"]'); await p.waitForTimeout(100);
  H.check('no page errors', !errs.length, errs.join(' | '));
  await ctx.close();
  // ---- the moon's phase follows the shift ----
  for (const [label, hh, want] of [['before the shift', 7, 'dark'], ['near the end of the shift', 16, 'lit']]) {
    const c = await H.context(b, { init: { fn: a => { localStorage.setItem('__seeded', '1'); localStorage.setItem('dayEndReport_v6', JSON.stringify({ v: 6, days: { [a.k]: { shiftStart: '09:00', shiftEnd: '17:00', hours: {} } } })); }, arg: { k: today() } } });
    const pg = await c.newPage(); const d = new Date(); d.setHours(hh, 55, 0, 0); await pg.clock.install({ time: d }); await pg.clock.resume();
    await pg.goto('http://app.local/next/#/day'); await pg.waitForTimeout(1500);
    const v = await moonLight(pg, '#moonCv');
    H.check('Day End moon is ' + want + ' ' + label, want === 'dark' ? v < 25 : v > 30, v.toFixed(1));
    await pg.evaluate(() => { location.hash = '#/tasks'; }); await pg.waitForTimeout(800);
    const fm = await pg.evaluate(() => { const m = document.querySelector('.fmoon'); const cs = getComputedStyle(m); return { has: !!m.querySelector('canvas'), b: cs.borderTopWidth, w: m.offsetWidth }; });
    H.check('floating moon on other pages: drawn, no border, 118 px (' + label + ')', fm.has && fm.b === '0px' && fm.w === 118, JSON.stringify(fm));
    const fv = await moonLight(pg, '.fmoon canvas');
    H.check('floating moon is ' + want + ' ' + label, want === 'dark' ? fv < 25 : fv > 30, fv.toFixed(1));
    await c.close();
  }
  await b.close(); H.done();
})().catch(e => { console.log('FAIL exception', e.message); process.exit(1); });
