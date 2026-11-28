// The Day End report texts of the new app must equal the old app's for the same saved data.
// Needs the old app built from source: LEGACY_DIST=/path/to/dist (python3 tools/build.py in the old source).
const H = require('./_h.cjs'); const fs = require('fs'), path = require('path');
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture_legacy.json'), 'utf8'));
const seed = { fn: f => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1'); Object.keys(f).forEach(k => localStorage.setItem(k, f[k])); localStorage.setItem('hub_rem_dismiss', '1'); }, arg: FIX };
(async () => {
  if (!process.env.LEGACY_DIST) { console.log('skip: set LEGACY_DIST'); return H.done(); }
  const b = await H.chromium.launch();
  const lc = await H.context(b, { init: seed }); const lp = await lc.newPage();
  await lp.goto('http://legacy.local/index.html'); await lp.waitForTimeout(3500);
  const fr = lp.frame({ name: 'fDay' });
  const legacy = {};
  for (const d of ['2026-11-20', '2026-11-21']) { await fr.evaluate(k => setDay(k), d); await lp.waitForTimeout(300); legacy[d] = await fr.evaluate(() => document.getElementById('reportPreview').textContent); }
  legacy.all = await fr.evaluate(() => { periodMode = 'all'; renderPeriod(); return document.getElementById('periodPreview').textContent; });
  legacy.month = await fr.evaluate(() => { periodMode = 'month'; periodY = 2026; periodM = 11; renderPeriod(); return document.getElementById('periodPreview').textContent; });
  const nc = await H.context(b, { init: seed }); const np = await nc.newPage(); const errs = []; np.on('pageerror', e => errs.push(e.message));
  await np.goto('http://app.local/next/#/day'); await np.waitForTimeout(1500);
  for (const d of ['2026-11-20', '2026-11-21']) {
    await np.fill('#dayPick', d); await np.dispatchEvent('#dayPick', 'change'); await np.waitForTimeout(300);
    const t = await np.locator('#reportPreview').textContent();
    H.check('day report ' + d + ' equals the old app', t === legacy[d], diff(legacy[d], t));
  }
  await np.click('#periodMode button[data-m="all"]'); await np.waitForTimeout(200);
  let t = await np.locator('#periodPreview').textContent();
  H.check('all-days report equals the old app', t === legacy.all, diff(legacy.all, t));
  await np.click('#periodMode button[data-m="month"]'); await np.waitForTimeout(100);
  await np.selectOption('#pMonth', '11'); await np.selectOption('#pYear', '2026'); await np.waitForTimeout(200);
  t = await np.locator('#periodPreview').textContent();
  H.check('November report equals the old app', t === legacy.month, diff(legacy.month, t));
  H.check('no page errors', !errs.length, errs.join(' | '));
  await b.close(); H.done();
})();
function diff(a, b) { if (a === b) return ''; const A = String(a).split('\n'), B = String(b).split('\n'); for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) return 'line ' + (i + 1) + ': old=' + JSON.stringify(A[i]) + ' new=' + JSON.stringify(B[i]); return ''; }
