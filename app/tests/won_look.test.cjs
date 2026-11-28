// Won Deals: the old page's structure + stylesheet, Revenue & Renewals, report text equal to the old app (LEGACY_DIST),
// paste import with duplicate skip, reset with undo, order by.
const H = require('./_h.cjs'); const fs = require('fs'), path = require('path');
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture_legacy.json'), 'utf8'));
const seed = { fn: f => { try { sessionStorage.setItem('cloud_skip', '1'); } catch (e) {} if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1'); Object.keys(f).forEach(k => localStorage.setItem(k, f[k])); localStorage.setItem('hub_rem_dismiss', '1'); }, arg: FIX };
(async () => {
  const b = await H.chromium.launch();
  let legacyRep = null, legacyAll = null;
  if (process.env.LEGACY_DIST) {
    const lc = await H.context(b, { init: seed }); const lp = await lc.newPage(); await lp.goto('http://legacy.local/index.html'); await lp.waitForTimeout(3500);
    await lp.evaluate(() => window.hubShow('deals')); await lp.waitForTimeout(1200); const fr = lp.frame({ name: 'fDeals' });
    await fr.evaluate(() => { selDay = '2026-11-20'; render(); }); await lp.waitForTimeout(300);
    legacyRep = await fr.evaluate(() => document.getElementById('reportPreview').textContent);
    legacyAll = await fr.evaluate(() => { periodMode = 'all'; renderPeriod(); return document.getElementById('periodPreview').textContent; });
    await lc.close();
  }
  const ctx = await H.context(b, { init: seed }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://app.local/next/#/deals'); await p.waitForTimeout(1200);
  await p.fill('#dayPick', '2026-11-20'); await p.dispatchEvent('#dayPick', 'change'); await p.waitForTimeout(300);
  for (const sel of ['header h1', '.day-card .day-chip.active', '.deals-card .card-head .section-count', '#form #fNumber', '#form #fPlan', '#form .btn-add', '#q39Fb .q39-ft', '#r36Ord select', '#entries .entry .entry-title', '.entry .entry-line', '.entry .bl-act input[type=date]', '.entry .entry-actions .icon-btn', '.entry .entry-cp .cp-chip', '#blPanel .bl-t', '#blPanel .bl-bar', '#statsCard .stat-tile', '.report-card #reportPreview', '#periodCard #pMonth'])
    H.check('old structure: ' + sel, await p.locator(sel).count() > 0);
  const rev = await p.locator('.entry:has-text("Alpha Mart") .entry-line:has-text("Revenue")').textContent();
  H.check('Revenue line as before', /\$39 \(600 MVR\) \/ month · due 2026-12-20/.test(rev), rev);
  const tiles = await p.locator('#blPanel .bl-t b').allTextContents();
  H.check('MRR box as before ($127.67 (1,950 MVR))', tiles[1] === '$127.67 (1,950 MVR)', tiles.join(' | '));
  const css = await p.evaluate(() => { const r = document.querySelector('.de-host').shadowRoot; return getComputedStyle(r.querySelector('.deals-card')).borderRadius + '|' + getComputedStyle(r.querySelector('.btn-add')).backgroundImage.slice(0, 15); });
  H.check('old styles apply', /px/.test(css) && /gradient/.test(css), css);
  const rep = await p.locator('#reportPreview').textContent();
  if (legacyRep != null) H.check('Deals Report equals the old app', rep === legacyRep, diff(legacyRep, rep));
  await p.click('#periodMode button[data-m="all"]'); await p.waitForTimeout(150);
  const all = await p.locator('#periodPreview').textContent();
  if (legacyAll != null) H.check('All days Deals Report equals the old app', all === legacyAll, diff(legacyAll, all));
  // order by name
  await p.selectOption('#r36Ord select >> nth=0', 'name'); await p.waitForTimeout(100);
  const names = await p.locator('#entries .entry-title').allTextContents();
  H.check('Order by Name A–Z', names.join(',') === names.slice().sort().join(','), names.join(','));
  // add a deal with the form (standard price)
  await p.fill('#fDeal', 'Omicron Bakery'); await p.selectOption('#fPlan', 'Starter'); await p.selectOption('#fBilling', 'Annual'); await p.waitForTimeout(80);
  H.check('standard price filled (Starter Annual = 350 / 5400)', (await p.inputValue('#fPrice')) === '350' && (await p.inputValue('#fMvr')) === '5400');
  await p.click('#addBtn'); await p.waitForTimeout(200);
  H.check('the new won deal is listed', await p.locator('.entry-title:text-is("Omicron Bakery")').count() === 1);
  // reset day with undo
  p.on('dialog', d => d.accept());
  const before = await p.locator('#entries .entry').count();
  await p.click('.report-card button:text-is("Reset day")'); await p.waitForTimeout(200);
  H.check('Reset day empties the day', await p.locator('#entries .entry').count() === 0);
  await p.click('.toast button'); await p.waitForTimeout(200);
  H.check('Undo brings the deals back', await p.locator('#entries .entry').count() === before);
  // paste the day's report into a fresh device → same deals; twice → no duplicates
  const c2 = await H.context(b, { init: { fn: () => { localStorage.setItem('__seeded', '1'); }, arg: null } }); const q = await c2.newPage();
  await q.goto('http://app.local/next/#/deals'); await q.waitForTimeout(1000);
  for (let i = 0; i < 2; i++) { await q.click('.report-card button:text-is("Paste report")'); await q.fill('.sheet textarea', rep); await q.click('.sheet .b-add'); await q.waitForTimeout(300); }
  await q.fill('#dayPick', '2026-11-20'); await q.dispatchEvent('#dayPick', 'change'); await q.waitForTimeout(300);
  const rep2 = await q.locator('#reportPreview').textContent();
  H.check('pasted Deals Report gives the same day back, no duplicates', rep2.replace(/All days: \d+/, '') === rep.replace(/All days: \d+/, ''), rep2);
  // old renewal data (billing_v1: act / ren) is read after migration
  const c3 = await H.context(b, { init: { fn: f => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1'); Object.keys(f).forEach(k => localStorage.setItem(k, f[k])); localStorage.setItem('billing_v1', JSON.stringify({ t1: { act: '2026-11-25' }, t2: { ren: '2027-12-01' } })); }, arg: FIX } });
  const r3 = await c3.newPage(); await r3.goto('http://app.local/next/#/deals'); await r3.waitForTimeout(1200);
  await r3.fill('#dayPick', '2026-11-20'); await r3.dispatchEvent('#dayPick', 'change'); await r3.waitForTimeout(300);
  const lines = await r3.locator('.entry-line:has-text("Revenue")').allTextContents();
  H.check('old activation / renewal dates are used after migration', /due 2026-12-25/.test(lines.join()) && /due 2027-12-01/.test(lines.join()), lines.join(' | '));
  H.check('no page errors', !errs.length, errs.join(' | '));
  await b.close(); H.done();
})().catch(e => { console.log('FAIL exception', e.message); process.exit(1); });

function diff(a, b) { const A = String(a).split('\n'), B = String(b).split('\n'); for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) return 'line ' + (i + 1) + ': old=' + JSON.stringify(A[i]) + ' new=' + JSON.stringify(B[i]); return ''; }
