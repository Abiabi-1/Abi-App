// Every section on PC 1200 and phone 390: opens, no horizontal overflow, no page errors. Bottom bar = top bar.
// Entry form, Quick Add, Won Deals, tickets from Day End, message tasks + filter, privacy guard, themes.
const H = require('./_h.cjs'); const fs = require('fs'), path = require('path');
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture_legacy.json'), 'utf8'));
const SHOTS = process.env.SHOTS || '';
const seed = { fn: f => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1'); Object.keys(f).forEach(k => localStorage.setItem(k, f[k])); }, arg: FIX };
const TABS = ['day', 'dashboard', 'analytics', 'dealboard', 'deals', 'lost', 'tickets', 'tasks', 'hr', 'auto', 'settings'];
(async () => {
  const b = await H.chromium.launch();
  for (const [name, vp] of [['pc', { width: 1200, height: 860 }], ['phone', { width: 390, height: 844 }]]) {
    const ctx = await H.context(b, { viewport: vp, init: seed }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://app.local/next/#/day'); await p.waitForTimeout(1200);
    for (const t of TABS) {
      await p.evaluate(t => { location.hash = '#/' + t; }, t); await p.waitForTimeout(350);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      H.check(name + ' ' + t + ': no horizontal overflow', ov <= 0, ov + 'px');
      if (SHOTS) await p.screenshot({ path: path.join(SHOTS, name + '_' + t + '.png') });
    }
    // the bar: same tabs on PC (top) and phone (bottom)
    const bar = await p.evaluate(() => { const n = document.querySelector('.bar'), r = n.getBoundingClientRect(); return { top: r.top, bottom: innerHeight - r.bottom, tabs: [...n.querySelectorAll('.tab')].map(x => x.textContent.replace(/\d+$/, '')) }; });
    if (name === 'pc') { H.check('PC: the bar is at the top', bar.top === 0); fs.writeFileSync('/tmp/claude-0/tabs_pc.json', JSON.stringify(bar.tabs)); }
    else { H.check('phone: the bar is at the bottom', Math.abs(bar.bottom) < 2, JSON.stringify(bar)); const pc = JSON.parse(fs.readFileSync('/tmp/claude-0/tabs_pc.json', 'utf8')); H.check('phone bar has the same tabs in the same order as the PC bar', JSON.stringify(pc) === JSON.stringify(bar.tabs), JSON.stringify([pc, bar.tabs])); }
    // tab look: text only, borderless, glow when active
    const tab = await p.evaluate(() => { const a = document.querySelector('.tab.on'), s = getComputedStyle(a); return { b: s.borderTopColor, bg: s.backgroundColor, ts: s.textShadow, svg: a.querySelectorAll('svg').length }; });
    H.check(name + ': active tab is borderless, unfilled, text-only with a glow', /rgba\(0, 0, 0, 0\)|transparent/.test(tab.b) && /rgba\(0, 0, 0, 0\)|transparent/.test(tab.bg) && tab.ts !== 'none' && tab.svg === 0, JSON.stringify(tab));
    H.check(name + ': no page errors', !errs.length, errs.join(' | '));
    await ctx.close();
  }
  // ---- behaviour (PC) ----
  const ctx = await H.context(b, { init: seed }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://app.local/next/#/day'); await p.waitForTimeout(1200);
  // only add buttons are filled: every visible button with a background image/colour must be .b-add
  const filled = await p.evaluate(() => [...document.querySelectorAll('button, .b, .chip, .tab, .ba')].filter(e => e.offsetParent && !e.closest('.b-add') && !e.classList.contains('b-add') && !e.classList.contains('sw') && !e.classList.contains('ck') && !e.classList.contains('stat')).filter(e => { const s = getComputedStyle(e); return (s.backgroundImage !== 'none') || (/rgb\(/.test(s.backgroundColor) && !/rgba\(.*, 0\)$/.test(s.backgroundColor)) || parseFloat(s.borderTopWidth) > 0 && !/rgba\(0, 0, 0, 0\)/.test(s.borderTopColor); }).map(e => e.className + ':' + e.textContent.slice(0, 20)));
  H.check('only add buttons are filled; all other buttons are borderless', filled.length === 0, filled.join(' | '));
  // add an entry in the open hour of today through the form
  const sec = p.locator('.hour-block.open .section[data-section="tasks"]').first();
  await sec.locator('[data-f="deal"]').fill('Omega Bistro'); await sec.locator('[data-f="notes"]').fill('Interested, emailed them the price list');
  await sec.locator('select[data-f="stage"]').selectOption('Closed Won All'); await sec.locator('select[data-f="plan"]').selectOption('Professional'); await sec.locator('select[data-f="billing"]').selectOption('Biannual');
  H.check('standard price is filled from the price table (Professional Biannual = 292 / 4500)', (await sec.locator('[data-f="price"]').inputValue()) === '292' && (await sec.locator('[data-f="mvr"]').inputValue()) === '4500');
  await sec.locator('.regs button >> nth=1').click();
  H.check('one extra register adds 6 × $20 on biannual', (await sec.locator('[data-f="price"]').inputValue()) === '412');
  await sec.locator('.btn-add').click(); await p.waitForTimeout(250);
  const rep = await p.locator('#reportPreview').textContent();
  H.check('the new entry is in the Final Report', /Omega Bistro, Interested, emailed them the price list \| Stage: Closed Won All \| Plan: Professional \(Biannual\) \| Price: \$412 \(6,300 MVR\) \| Registers: \+1/.test(rep), rep.split('\n').filter(l => /Omega/.test(l)).join());
  H.check('email mark is detected green from the text', await p.locator('.entry:has-text("Omega Bistro") .entry-mk.g').count() >= 1);
  // privacy guard while typing
  const ph = ['0', '77', '7 ', '12', '34'].join('');
  await sec.locator('[data-f="deal"]').fill('Pi Store'); await sec.locator('[data-f="notes"]').fill('call ' + ph + ' later');
  await sec.locator('.btn-add').click(); await p.waitForTimeout(250);
  const piTxt = await p.locator('.entry:has-text("Pi Store") .entry-text').first().textContent();
  H.check('a phone number typed in a note is not saved', piTxt.indexOf('1234') < 0 && piTxt.indexOf('77712') < 0, piTxt);
  // Won Deals shows it, the Deals board has it, a message task appears
  await p.evaluate(() => { location.hash = '#/deals'; }); await p.waitForTimeout(300);
  H.check('Won Deals lists the new won deal', await p.locator('.item:has-text("Omega Bistro")').count() === 1);
  await p.evaluate(() => { location.hash = '#/dealboard'; }); await p.waitForTimeout(300);
  H.check('Deals board has the deal', await p.locator('.deal-card:has-text("Omega Bistro")').count() >= 1);
  await p.evaluate(() => { location.hash = '#/tasks'; }); await p.waitForTimeout(300);
  H.check('an Email message task was made from the entry', await p.locator('.item:has-text("Email Omega Bistro")').count() === 1);
  await p.click('.ctl .mk .ic >> nth=1'); await p.waitForTimeout(150);   // Email filter (green)
  const shown = await p.locator('.item .t').allTextContents();
  H.check('Email filter shows only email tasks', shown.length >= 1 && shown.every(t => /^Email /.test(t)), shown.join());
  // tickets from Day End entries
  await p.evaluate(() => { location.hash = '#/tickets'; }); await p.waitForTimeout(300);
  await p.click('.seg button:text-is("List")'); await p.waitForTimeout(150);
  H.check('Day End "Tickets Attended" entries are tickets', await p.locator('td:has-text("[TRAINING] Alpha Mart")').count() === 1);
  // Quick Add with Q from another page
  await p.keyboard.press('q'); await p.waitForTimeout(200);
  H.check('Q opens Day End Quick Add from any page', await p.locator('.sheet:has-text("Quick Add")').count() === 1);
  await p.keyboard.press('Escape');
  // light theme + palette
  await p.evaluate(() => { location.hash = '#/settings'; }); await p.waitForTimeout(200);
  await p.click('.seg button:text-is("Light")'); await p.click('.pal .chip:has-text("Deep blue")'); await p.waitForTimeout(200);
  const th = await p.evaluate(() => [document.documentElement.dataset.theme, getComputedStyle(document.body).backgroundColor, getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb')]);
  H.check('light theme and a palette apply', th[0] === 'light' && th[1] !== 'rgb(0, 0, 0)' && th[2].trim() !== '225,42,57', JSON.stringify(th));
  if (SHOTS) { for (const t of ['day', 'dealboard', 'tasks']) { await p.evaluate(t => { location.hash = '#/' + t; }, t); await p.waitForTimeout(300); await p.screenshot({ path: path.join(SHOTS, 'light_' + t + '.png') }); } }
  H.check('no page errors (behaviour)', !errs.length, errs.join(' | '));
  await b.close(); H.done();
})().catch(e => { console.log('FAIL exception', e.message); process.exit(1); });
