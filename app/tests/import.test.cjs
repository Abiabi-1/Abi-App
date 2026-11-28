// Paste report / report .html / Excel import bring the same entries back; importing twice skips duplicates.
const H = require('./_h.cjs'); const fs = require('fs'), path = require('path');
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture_legacy.json'), 'utf8'));
(async () => {
  const b = await H.chromium.launch();
  // 1. take the report text + Excel from a device that has the data
  const a = await H.context(b, { init: { fn: f => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1'); Object.keys(f).forEach(k => localStorage.setItem(k, f[k])); }, arg: FIX } });
  const pa = await a.newPage(); await pa.goto('http://app.local/next/#/day'); await pa.waitForTimeout(1200);
  await pa.fill('#dayPick', '2026-11-20'); await pa.dispatchEvent('#dayPick', 'change'); await pa.waitForTimeout(300);
  const report = await pa.evaluate(() => document.querySelector('.de-host').shadowRoot.getElementById('reportPreview').textContent);
  const [dl] = await Promise.all([pa.waitForEvent('download'), pa.click('.report-card button:text-is("Export day")')]);
  const xlsxPath = await dl.path();
  // 2. a fresh device imports it
  const c = await H.context(b, { init: { fn: () => { localStorage.setItem('__seeded', '1'); }, arg: null } });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://app.local/next/#/day'); await p.waitForTimeout(1200);
  await p.click('.report-card button:text-is("Paste report")'); await p.fill('.sheet textarea', report); await p.click('.sheet .b-add'); await p.waitForTimeout(400);
  await p.fill('#dayPick', '2026-11-20'); await p.dispatchEvent('#dayPick', 'change'); await p.waitForTimeout(300);
  const strip = t => t.replace(/\s+\[\d{1,2}:\d{2}(:\d{2})? [AP]M\]/g, '').replace(/^Time Clock[\s\S]*?\n\n/m, '');
  const back = await p.evaluate(() => document.querySelector('.de-host').shadowRoot.getElementById('reportPreview').textContent);
  H.check('pasted report gives the same report back (without exact times / clock lines)', strip(back) === strip(report), back.split('\n').slice(0, 12).join(' / '));
  const n1 = await p.evaluate(() => window.__abi.store.all('entries').length);
  await p.click('.report-card button:text-is("Paste report")'); await p.fill('.sheet textarea', report); await p.click('.sheet .b-add'); await p.waitForTimeout(400);
  const n2 = await p.evaluate(() => window.__abi.store.all('entries').length);
  H.check('importing the same report again skips duplicates', n1 === n2 && n1 > 0, n1 + ' → ' + n2);
  // 3. Excel import on another fresh device
  const e = await H.context(b, { init: { fn: () => { localStorage.setItem('__seeded', '1'); }, arg: null } });
  const pe = await e.newPage(); await pe.goto('http://app.local/next/#/day'); await pe.waitForTimeout(1200);
  const [fc] = await Promise.all([pe.waitForEvent('filechooser'), pe.click('.report-card button:text-is("Import file")')]);
  await fc.setFiles({ name: 'day.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: fs.readFileSync(xlsxPath) }); await pe.waitForTimeout(800);
  const nx = await pe.evaluate(() => window.__abi.store.all('entries').filter(x => x.day === '2026-11-20').length);
  H.check('Excel export → import brings the day back (all 11 entries)', nx === 11, String(nx));
  H.check('no page errors', !errs.length, errs.join(' | '));
  await b.close(); H.done();
})().catch(e => { console.log('FAIL exception', e.message); process.exit(1); });
