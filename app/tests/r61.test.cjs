// Round 61: HR tabs + lists, old HR / tools data conversion (no phone / e-mail), Tools page and every tool, flows,
// Closed Won check, Dashboard customize + widgets, Jump to, app lock, focus mode, bulk select, phone layout.
const H = require('./_h.cjs');
const pad = n => String(n).padStart(2, '0'), D = new Date(), TD = D.getFullYear() + '-' + pad(D.getMonth() + 1) + '-' + pad(D.getDate());
const PH = ['+9', '60', ' 7', '77 ', '1234'].join(''), EM = ['someone', '@', 'example', '.com'].join('');
const OLD = {
  hub_hr_v1: JSON.stringify({ set: { sec: true, grace: 10, dayH: 8, week: [0, 1, 2, 3, 4], rate: 100, rateType: 'hour', cur: 'MVR', leaveTypes: [{ id: 'annual', name: 'Annual leave', days: 30 }, { id: 'sick', name: 'Sick leave', days: 10 }] }, punches: {},
    col: { leave: [{ id: 'lv1', type: 'Annual leave', from: TD.slice(0, 4) + '-01-05', to: TD.slice(0, 4) + '-01-06', half: 'Full day', status: 'Approved', reason: 'Trip' }],
      directory: [{ id: 'pp1', name: 'Hana', role: 'Support', phone: PH, email: EM, note: 'Team lead' }], hiring: [{ id: 'hi1', name: 'Candidate A', role: 'Sales', stage: 'Interview', phone: PH, email: EM }],
      expenses: [{ id: 'ex1', date: TD, desc: 'Taxi', category: 'Travel', amount: 120, status: 'Submitted' }], docs: [{ id: 'dc1', title: 'Work permit', kind: 'Work permit', expires: '2020-01-01' }],
      tracker: [{ id: 'tr1', project: '', task: 'Old tracked', start: Date.now() - 7200000, end: Date.now() - 3600000 }] },
    slips: [{ id: 'sl1', month: TD.slice(0, 7), gross: 9000, ded: 500, net: 8500, note: 'Nov' }], audit: [{ at: Date.now() - 1000, what: 'Old audit line', why: '' }] }),
  hub_templates: JSON.stringify([{ id: 'tpx', name: 'My follow-up', ch: 'wa', subject: '', body: 'Hi, about {deal} – any news?' }]),
  hub_recur_v1: JSON.stringify([{ id: 'rx1', title: 'Daily check of the call-back queue', every: 'daily', on: true }]),
  hub_lists: JSON.stringify([{ id: 'lx1', name: 'Campaign A', items: [] }]),
  hub_shortcuts_v1: JSON.stringify([{ label: 'Price list', url: 'docs.example.test/price' }, { label: 'Call', url: 'tel:' + PH }]),
  hub_flows_v1: JSON.stringify({ v: 1, flows: [{ id: 'flx1', name: 'Old price flow', on: true, created: 1, trigger: { type: 'rec', source: 'dayend' }, cond: { any: ['price'] }, actions: [{ type: 'task', title: 'Send price – {name}', due: 'today' }] }, { id: 'flx2', name: 'Old webhook', on: true, created: 1, trigger: { type: 'besthour' }, cond: {}, actions: [{ type: 'webhook', url: 'https://hooks.example.test' }] }] }),
  dash_v1: JSON.stringify({ v: 1, widgets: [{ id: 'wx1', title: 'Entries by section', src: 'dayend', measure: 'count', group: 'section', shape: 'bars' }], hidden: [], period: 'all' }),
  hub_goals_v1: JSON.stringify({ day: 12, week: 60 }),
};
(async () => {
  const b = await H.chromium.launch();
  const ctx = await H.context(b, { init: { fn: o => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1'); Object.keys(o).forEach(k => localStorage.setItem(k, o[k])); localStorage.setItem('v2_backup_later', String(Date.now())); localStorage.setItem('v2_last_backup', String(Date.now())); }, arg: OLD } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://app.local/next/#/hr'); await p.waitForTimeout(1500);
  const recs = c => p.evaluate(c => window.__abi.store.all(c), c);
  // ---- conversion ----
  const hrc = await recs('hrc');
  H.check('old HR lists are converted (leave, people, hiring, expenses, docs, tracker)', ['leave', 'directory', 'hiring', 'expenses', 'docs', 'tracker'].every(c => hrc.some(x => x.col === c)), JSON.stringify(hrc.map(x => x.col)));
  const raw = await p.evaluate(() => JSON.stringify(window.__abi.store.rawAll().filter(r => r.c !== 'legacy' && r.c !== '_migsrc').map(r => r.d)));
  H.check('people / hiring: no phone or e-mail is stored', raw.indexOf('1234') < 0 && raw.indexOf(EM) < 0);
  H.check('salary slips and the audit log are converted', (await recs('slips')).some(x => x.net === 8500) && (await recs('hraudit')).some(x => x.what === 'Old audit line'));
  H.check('old tracker entries get a date and times', hrc.some(x => x.col === 'tracker' && x.date && x.st && x.en));
  H.check('pay settings and leave types are converted', await p.evaluate(() => { const c = window.__abi.store.get('cfg', 'hr'); return c.rate === 100 && c.leaveTypes.length === 2; }));
  H.check('templates, recurring, lists, flows, widgets, goals are converted', (await recs('templates')).some(x => x.id === 'tpx' && x.ch === 'WhatsApp') && (await recs('recur')).length === 1 && (await recs('lists')).length === 1 && (await recs('flows')).length === 2 && (await recs('widgets')).length === 1 && await p.evaluate(() => window.__abi.store.get('cfg', 'goals').day === 12));
  const sc = await recs('shortcuts');
  H.check('shortcuts: tel: links are not kept', sc.length === 1 && sc[0].label === 'Price list', JSON.stringify(sc));
  // ---- HR tabs ----
  const tabs = await p.locator('.hr-tabs .chip').count();
  H.check('HR has all 30 tabs', tabs === 30, tabs);
  let bad = [];
  for (let i = 0; i < tabs; i++) { await p.locator('.hr-tabs .chip').nth(i).click(); await p.waitForTimeout(60); const n = errs.length; if (n) bad.push(i + ':' + errs[n - 1]); }
  H.check('every HR tab opens without an error', !bad.length && !errs.length, bad.join(' | ') + errs.join(' | '));
  await p.goto('http://app.local/next/#/hr/leave'); await p.waitForTimeout(300);
  H.check('leave balance counts the approved leave (2 working days)', /28/.test(await p.locator('.tiles').first().textContent()), await p.locator('.tiles').first().textContent());
  await p.goto('http://app.local/next/#/hr/dir'); await p.waitForTimeout(300);
  await p.click('.coll .b-add'); await p.waitForTimeout(100);
  H.check('the People form has no phone / e-mail fields', await p.locator('.sheet [data-f="phone"], .sheet [data-f="email"]').count() === 0 && await p.locator('.sheet input[type="tel"], .sheet input[type="email"]').count() === 0);
  await p.fill('.sheet [data-f="name"]', 'Ali'); await p.fill('.sheet [data-f="note"]', 'Reach me on ' + PH); await p.click('.sheet .b-add'); await p.waitForTimeout(150);
  const ali = (await recs('hrc')).find(x => x.name === 'Ali');
  H.check('a person is added; a phone number typed in a note is left out', ali && ali.note.indexOf('1234') < 0, ali && ali.note);
  await p.goto('http://app.local/next/#/hr/docs'); await p.waitForTimeout(300);
  H.check('an expired document shows the expired badge', await p.locator('.coll .pill.bad:has-text("expired")').count() === 1);
  await p.goto('http://app.local/next/#/hr/pay'); await p.waitForTimeout(300);
  H.check('Pay & payslip shows the net estimate', /Net estimate/.test(await p.locator('.tiles').textContent()));
  await p.goto('http://app.local/next/#/hr/trk'); await p.waitForTimeout(300);
  await p.fill('input[placeholder="What are you working on?"]', 'Writing docs'); await p.click('text=Start timer'); await p.waitForTimeout(1200); await p.click('text=Stop'); await p.waitForTimeout(200);
  H.check('the time tracker saves a tracked entry', (await recs('hrc')).some(x => x.col === 'tracker' && x.task === 'Writing docs'));
  await p.goto('http://app.local/next/#/hr/sched'); await p.waitForTimeout(300);
  await p.locator('.sched-row').nth(5).locator('.b').first().click(); await p.waitForTimeout(100);
  H.check('weekly schedule: Saturday can be switched to working', await p.evaluate(() => window.__abi.store.get('cfg', 'hr').sched[6].off === false));
  // ---- Tools ----
  await p.goto('http://app.local/next/#/tools'); await p.waitForTimeout(300);
  const ids = await p.$$eval('.tool-tile[data-tool]', a => a.map(x => x.getAttribute('data-tool')));
  H.check('the Tools page lists 22 tools and my shortcut', ids.length === 22 && await p.locator('.tool-tile:has-text("Price list")').count() === 1, ids.length);
  bad = [];
  for (const id of ids) { const n = errs.length; await p.goto('http://app.local/next/#/tools/' + id); await p.waitForTimeout(150); if (errs.length > n || await p.locator('[data-tool="' + id + '"] .page-head, .page[data-tool="' + id + '"]').count() === 0) bad.push(id + ':' + (errs[errs.length - 1] || 'no page')); }
  H.check('every tool opens without an error', !bad.length, bad.join(' | '));
  H.check('recurring task was added once for today (deterministic id)', (await recs('tasks')).filter(t => t.id === 'rc-rx1-' + TD).length === 1);
  await p.goto('http://app.local/next/#/tools/import'); await p.waitForTimeout(200);
  await p.fill('textarea[aria-label="Deals to import"]', 'Cafe Blue\nGreen Mart, https://app.hubspot.com/contacts/1/record/0-3/55, Interested\nCafe Blue'); await p.waitForTimeout(100);
  await p.click('.page .b-add'); await p.waitForTimeout(200);
  const dl = await recs('deals');
  H.check('paste a list adds the deals and skips the duplicate', dl.filter(x => x.name === 'Cafe Blue').length === 1 && dl.some(x => x.name === 'Green Mart' && x.stage === 'Interested' && /hubspot/.test(x.link)), JSON.stringify(dl));
  await p.goto('http://app.local/next/#/tools/templates'); await p.waitForTimeout(200);
  H.check('message templates: your saved list is kept as it was (as in the old app)', await p.locator('.coll-it:has-text("My follow-up")').count() === 1);
  { const src = require('fs').readFileSync(require('path').join(__dirname, '../src/features/comfort.tsx'), 'utf8'), m = src.match(/function sha256\(str: string\) \{[\s\S]*?\n\}/); const js = require('esbuild').transformSync(m[0], { loader: 'ts' }).code; const f = new Function(js + '; return sha256;')();
    H.check('the built-in SHA-256 (used without https) matches the standard one', ['ab2468', '', 'x'.repeat(130), 'ü→✓'].every(t => f(t) === require('crypto').createHash('sha256').update(t).digest('hex'))); }
  await p.goto('http://app.local/next/#/tools/restore'); await p.waitForTimeout(300); await p.click('text=Take a restore point now'); await p.waitForTimeout(700);
  H.check('a restore point is taken and listed', await p.locator('.page .item:has-text("records")').count() >= 1);
  await p.goto('http://app.local/next/#/tools/calendar'); await p.waitForTimeout(200);
  H.check('the calendar shows 42 days', await p.locator('.cal-d').count() === 42);
  // ---- flows ----
  await p.goto('http://app.local/next/#/auto'); await p.waitForTimeout(300);
  H.check('the unsupported old flow is shown as not supported', await p.locator('.item:has-text("Old webhook") .pill:has-text("not supported")').count() === 1);
  await p.evaluate(() => { const s = window.__abi.store; s.put('flows', 'flx1', { created: Date.now() - 1000 }); });
  await p.evaluate(TD => { const s = window.__abi.store; s.put('entries', 'efl1', { day: TD, hk: '10:00', sk: 'tasks', ord: 5, deal: 'Zeta Shop', notes: 'Asked about the price', stage: 'Interested', at: Date.now() }); }, TD);
  await p.waitForTimeout(1800);
  const ft = (await recs('tasks')).filter(t => t.title === 'Send price – Zeta Shop');
  H.check('a flow fires on a matching entry, once', ft.length === 1, JSON.stringify(ft));
  // ---- Closed Won check ----
  await p.goto('http://app.local/next/#/day'); await p.waitForTimeout(600);
  await p.keyboard.press('q'); await p.waitForTimeout(300);
  await p.fill('.sheet .ef [data-f="deal"]', 'Omega Store'); await p.selectOption('.sheet .ef [data-f="stage"]', 'Closed Won All'); await p.click('.sheet .ef .b-add'); await p.waitForTimeout(200);
  H.check('Closed Won without a plan asks first', await p.locator('text=Closed Won without details').count() >= 1);
  await p.click('button:has-text("Save anyway")'); await p.waitForTimeout(200);
  H.check('“Save anyway” saves it', (await recs('entries')).some(e => e.deal === 'Omega Store'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  // ---- Dashboard ----
  await p.goto('http://app.local/next/#/dashboard'); await p.waitForTimeout(300);
  H.check('the converted widget shows on the Dashboard', await p.locator('.dash-w:has-text("Entries by section")').count() === 1);
  await p.click('button:has-text("Customize")'); await p.waitForTimeout(150);
  await p.locator('.sheet .item:has-text("Daily and weekly report") .sw').click(); await p.waitForTimeout(100); await p.click('.sheet button:has-text("Done")'); await p.waitForTimeout(100);
  H.check('Customize hides a block', await p.locator('.h2:has-text("Daily report")').count() === 0);
  // ---- Jump to, focus, lock ----
  await p.keyboard.press('Alt+KeyJ'); await p.waitForTimeout(250);
  await p.keyboard.type('renewals board'); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
  H.check('Alt+J → type → Enter opens the tool', /#\/tools\/renewals/.test(p.url()), p.url());
  await p.evaluate(() => { localStorage.setItem('v2_comfort', JSON.stringify({ focus: true })); }); await p.reload(); await p.waitForTimeout(800);
  H.check('focus mode hides the moon', await p.evaluate(() => document.documentElement.classList.contains('focus-mode') && (!document.querySelector('.fmoon') || getComputedStyle(document.querySelector('.fmoon')).display === 'none')));
  await p.click('.focus-exit'); await p.waitForTimeout(100);
  await p.goto('http://app.local/next/#/tools/comfort'); await p.waitForTimeout(200);
  await p.fill('input[aria-label="New PIN"]', '2468'); await p.click('button:has-text("Turn on")'); await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(800);
  H.check('app lock asks for the PIN on open', await p.locator('.lock-ov').count() === 1);
  await p.fill('.lock-ov input', '1111'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  H.check('a wrong PIN keeps it locked', await p.locator('.lock-ov .login-msg').count() === 1);
  await p.fill('.lock-ov input', '2468'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  H.check('the right PIN unlocks', await p.locator('.lock-ov').count() === 0);
  H.check('only a hash of the PIN is kept', await p.evaluate(() => (localStorage.getItem('v2_lock') || '').indexOf('2468') < 0));
  // ---- bulk select ----
  await p.evaluate(TD => { const s = window.__abi.store; s.put('tickets', 'tk1', { subject: 'Printer down', desc: 'x', pipeline: 'support', stage: '', created: Date.now() }); s.put('tickets', 'tk2', { subject: 'Login issue', desc: 'y', pipeline: 'support', stage: '', created: Date.now() }); }, TD);
  await p.goto('http://app.local/next/#/tickets'); await p.waitForTimeout(300); await p.click('.page button:has-text("Select")'); await p.waitForTimeout(150);
  await p.click('.bulk-bar button:has-text("All shown")'); await p.waitForTimeout(100);
  H.check('Tickets: Select → All shown selects them', /[2-9] selected/.test(await p.locator('.bulk-bar').textContent()), await p.locator('.bulk-bar').textContent());
  // ---- phone ----
  const ph = await H.context(b, { viewport: { width: 390, height: 844 } }); const q = await ph.newPage(); const qe = []; q.on('pageerror', e => qe.push(e.message));
  bad = [];
  for (const u of ['#/hr', '#/hr/ts', '#/hr/pay', '#/hr/sched', '#/tools', '#/tools/calendar', '#/tools/calls', '#/tools/invoices', '#/tools/renewals', '#/tools/insights', '#/auto', '#/dashboard']) { await q.goto('http://app.local/next/' + u); await q.waitForTimeout(250); const w = await q.evaluate(() => document.documentElement.scrollWidth); if (w > 392) bad.push(u + ':' + w); }
  H.check('phone (390 px): no sideways scroll on the new pages', !bad.length, bad.join(' '));
  H.check('no page errors', !errs.length && !qe.length, errs.concat(qe).join(' | '));
  await b.close(); H.done();
})();
