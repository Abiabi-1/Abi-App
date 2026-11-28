// Smart text + Snippets: learning, suggestions, keys, privacy, manager, old data conversion, sync; expansion, commands,
// ask pop-up, Backspace undo, instant shortcuts, no expansion in the link box, starter pack restore.
const H = require('./_h.cjs');
const pad = n => String(n).padStart(2, '0'); const d = new Date(), today = pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
(async () => {
  const b = await H.chromium.launch();
  const oldSmart = JSON.stringify({ v: 1, learn: true, suggest: true, items: [{ id: 'hold1', text: 'Waiting for the owner to confirm the plan.', forms: { 'Waiting for the owner to confirm the plan.': 5 }, count: 5, sel: 2, ign: 0, first: Date.now() - 864e5, last: Date.now() - 3600e3, ctx: { notes: 5 }, sub: {}, pin: true, man: false, kind: 'sentence' }] });
  const oldSnip = JSON.stringify({ v: 1, on: true, items: [{ id: 'u1', trigger: '.zz', text: 'Zebra crossing done.', folder: 'Mine', on: true, imm: false }, { id: 's14', trigger: '.np', text: 'Did not pick up. Will try again later.', folder: 'Call outcomes', on: true, imm: false, std: 1 }, { id: 's1', trigger: '.d', text: '{date:DD/MM/YYYY}', folder: 'Dates & time', on: true, imm: false, std: 1 }, { id: 's55', trigger: '.hi', text: 'Hello {ask:Name},', folder: 'Replies & sign-offs', on: true, imm: false, std: 1 }] });
  const ctx = await H.context(b, { init: { fn: a => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1'); localStorage.setItem('smartText_v1', a.s); localStorage.setItem('hub_snippets_v1', a.n); localStorage.setItem('dayEndReport_v6', JSON.stringify({ v: 6, days: {} })); localStorage.setItem('hub_rem_dismiss', '1'); }, arg: { s: oldSmart, n: oldSnip } } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://app.local/next/#/day'); await p.waitForTimeout(1500);
  const recs = c => p.evaluate(c => window.__abi.store.all(c), c);
  // ---- conversion of old data ----
  const sm = await recs('smart');
  H.check('old Smart text phrases are converted (count + pin kept)', sm.some(x => x.text === 'Waiting for the owner to confirm the plan.' && x.count === 5 && x.pin));
  const sn = await recs('snippets');
  H.check('old shortcuts are converted (own .zz kept)', sn.some(x => x.trigger === '.zz' && x.text === 'Zebra crossing done.'));
  // ---- Smart text in the Day End (inside the isolated page) ----
  const sec = s => p.locator('.hour-block.open .section[data-section="' + s + '"]').first();
  const reason = sec('calls').locator('[data-f="reason"]');
  await reason.click(); await p.keyboard.type('Customer asked about the new loyalty programme today.'); await p.keyboard.press('Tab'); await p.waitForTimeout(200);
  H.check('a sentence typed in a Day End box is learned on leaving it', (await recs('smart')).some(x => x.text === 'Customer asked about the new loyalty programme today.'));
  const note = sec('other').locator('[data-f="note"]');
  await note.click(); await p.keyboard.type('Customer asked'); await p.waitForTimeout(200);
  H.check('a suggestion appears while typing', await p.locator('.st-pop.show .st-it:has-text("loyalty programme")').count() === 1);
  H.check('the typed part is shown dimmed', await p.locator('.st-pop.show .st-dim').first().textContent() === 'Customer asked');
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  H.check('↓ + Enter inserts the phrase', (await note.inputValue()) === 'Customer asked about the new loyalty programme today.', await note.inputValue());
  await note.fill(''); await p.keyboard.type('Waiting for'); await p.waitForTimeout(150);
  H.check('a converted pinned phrase is suggested with ★', await p.locator('.st-pop.show .st-it:has-text("owner to confirm") .st-pin').count() === 1);
  await p.keyboard.press('Escape'); await p.waitForTimeout(80);
  H.check('Esc closes the list', await p.locator('.st-pop.show').count() === 0);
  await note.fill(''); await p.keyboard.type('Call him on 0777 1234 tomorrow, mail him at x@y.com later.'); await p.keyboard.press('Tab'); await p.waitForTimeout(150);
  const all = JSON.stringify(await recs('smart'));
  H.check('phone numbers / e-mails are never learned', all.indexOf('1234') < 0 && all.indexOf('@') < 0);
  // ---- Snippets ----
  await note.click(); await note.fill(''); await p.keyboard.type('.np '); await p.waitForTimeout(100);
  H.check('.np + space expands', (await note.inputValue()) === 'Did not pick up. Will try again later. ', JSON.stringify(await note.inputValue()));
  await p.keyboard.press('Backspace'); await p.waitForTimeout(80);
  H.check('Backspace right after undoes the expansion', (await note.inputValue()) === '.np', JSON.stringify(await note.inputValue()));
  await note.fill(''); await p.keyboard.type('.d '); await p.waitForTimeout(80);
  H.check('.d gives today\'s date', (await note.inputValue()) === today + ' ', await note.inputValue());
  await note.fill(''); await p.keyboard.type('.ZZ '); await p.waitForTimeout(80);
  H.check('upper / lower case does not matter (.ZZ)', (await note.inputValue()) === 'Zebra crossing done. ', await note.inputValue());
  await note.fill(''); await p.keyboard.type('.hi '); await p.waitForTimeout(200);
  H.check('{ask:Name} asks in a pop-up', await p.locator('.sheet:has-text("Fill in") input').count() === 1);
  await p.fill('.sheet:has-text("Fill in") input', 'Sam'); await p.click('.sheet:has-text("Fill in") .b-add'); await p.waitForTimeout(150);
  H.check('the answer is inserted', (await note.inputValue()) === 'Hello Sam, ', JSON.stringify(await note.inputValue()));
  const link = sec('tasks').locator('[data-f="number"]');
  await link.click(); await p.keyboard.type('.np '); await p.waitForTimeout(80);
  H.check('nothing expands in the HubSpot link box', (await link.inputValue()) !== 'Did not pick up. Will try again later. ');
  await link.fill('');
  // leaving the Day End while a box still has focus (typed, not left) must not break the app
  await note.fill(''); await note.click(); await p.keyboard.type('Left the page while typing here');
  await p.evaluate(() => { location.hash = '#/tasks'; }); await p.waitForTimeout(300);
  await p.click('.bar button[title^="Smart text"]'); await p.waitForTimeout(200);
  H.check('leaving the Day End with a focused box: no error, pop-ups still open', !errs.length && await p.locator('.sheet:has-text("Smart text")').count() === 1, errs.join(' | '));
  H.check('…and what was typed is still learned', (await recs('smart')).some(x => x.text === 'Left the page while typing here'));
  await p.keyboard.press('Escape'); await p.evaluate(() => { location.hash = '#/day'; }); await p.waitForTimeout(400);
  // manager: new instant shortcut, delete + restore starter
  await p.keyboard.press('Escape'); await p.mouse.click(5, 300);
  await p.evaluate(() => { location.hash = '#/settings'; }); await p.waitForTimeout(200); await p.click('.seg button:text-is("Privacy")'); await p.click('button:text-is("Snippets (text shortcuts)")'); await p.waitForTimeout(150);
  H.check('your own old list is kept as it was (4 shortcuts, no deleted starter ones re-added)', await p.locator('.sheet .sn-row').count() === 4, String(await p.locator('.sheet .sn-row').count()));
  await p.click('.sheet button:text-is("Restore starter pack")'); await p.waitForTimeout(150);
  H.check('Restore starter pack adds the missing starter shortcuts (75 + own)', await p.locator('.sheet .sn-row').count() === 76, String(await p.locator('.sheet .sn-row').count()));
  await p.click('.sheet button:text-is("+ New shortcut")'); await p.fill('.sheet input[placeholder=".np"]', ';;ok'); await p.fill('.sheet textarea', 'All good, thank you!'); await p.click('.sheet label:has-text("Expand instantly") .sw'); await p.click('.sheet .b-add:text-is("Add shortcut")'); await p.waitForTimeout(150);
  H.check('a new shortcut is saved', (await recs('snippets')).some(x => x.trigger === ';;ok' && x.imm));
  await p.fill('.sheet input[placeholder="Search shortcuts"]', '.wa'); await p.waitForTimeout(80);
  await p.click('.sheet .sn-row:has(code:text-is(".wa")) button:text-is("Delete")'); await p.click('.sheet .sn-row:has(code:text-is(".wa")) button:text-is("Sure?")'); await p.waitForTimeout(100);
  H.check('a shortcut can be deleted', !(await recs('snippets')).some(x => x.trigger === '.wa'));
  await p.click('.sheet button:text-is("Restore starter pack")'); await p.waitForTimeout(100);
  H.check('Restore starter pack brings it back', (await recs('snippets')).some(x => x.trigger === '.wa'));
  await p.keyboard.press('Escape');
  await p.evaluate(() => { location.hash = '#/tasks'; }); await p.waitForTimeout(200); await p.click('button.b-add:has-text("New task")'); await p.waitForTimeout(100);
  await p.click('.sheet textarea'); await p.keyboard.type(';;ok'); await p.waitForTimeout(100);
  H.check('an instant shortcut expands without a space (also outside Day End)', (await p.inputValue('.sheet textarea')) === 'All good, thank you!', await p.inputValue('.sheet textarea'));
  await p.keyboard.press('Escape');
  // Smart text manager
  await p.click('.bar button[title^="Smart text"]'); await p.waitForTimeout(150);
  H.check('Smart text manager lists the phrases', await p.locator('.sheet .st-row').count() >= 2);
  await p.fill('.sheet input[placeholder="Add a phrase manually"]', 'Sent the price list on WhatsApp.'); await p.click('.sheet .b-add:text-is("Add")'); await p.waitForTimeout(100);
  H.check('a phrase can be added by hand', (await recs('smart')).some(x => x.text === 'Sent the price list on WhatsApp.' && x.man));
  const row = p.locator('.sheet .st-row:has-text("Sent the price list")');
  await row.locator('button:text-is("Edit")').click(); await p.fill('.sheet .st-row textarea', 'Customer asked about the new loyalty programme today.'); await p.click('.sheet .st-row .b-add:text-is("Save")'); await p.waitForTimeout(120);
  const sm2 = await recs('smart');
  H.check('editing into an existing phrase merges them (no duplicate)', sm2.filter(x => x.text === 'Customer asked about the new loyalty programme today.').length === 1 && !sm2.some(x => x.text === 'Sent the price list on WhatsApp.'));
  H.check('no page errors', !errs.length, errs.join(' | '));
  await ctx.close();
  // ---- sync: a phrase learned on A shows on B ----
  const sb = H.fakeSupabase(), session = { access: 'tok', refresh: 'ref', exp: Date.now() + 36e5, user: { id: 'u1', email: 'tester@example.test' } };
  const dev = async n => { const c = await H.context(b, { supabase: sb, init: { fn: a => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1'); localStorage.setItem('cloud_session_v1', JSON.stringify(a.s)); localStorage.setItem('hub_device_id', a.n); }, arg: { s: session, n } } }); const pg = await c.newPage(); await pg.goto('http://app.local/next/#/tasks'); await pg.waitForFunction(() => window.__abi && window.__abi.sync.status.value === 'synced', null, { timeout: 15000 }); return pg; };
  const A = await dev('A-dev'), B = await dev('B-dev');
  await A.click('button.b-add:has-text("New task")'); await A.click('.sheet textarea'); await A.keyboard.type('Checked the printer settings with the cashier.'); await A.keyboard.press('Tab'); await A.waitForTimeout(150);
  await A.evaluate(() => window.__abi.cycle(true)); await B.evaluate(() => window.__abi.cycle(true));
  H.check('a phrase learned on one device is on the other', (await B.evaluate(() => window.__abi.store.all('smart'))).some(x => x.text === 'Checked the printer settings with the cashier.'));
  await b.close(); H.done();
})().catch(e => { console.log('FAIL exception', e.message); process.exit(1); });
