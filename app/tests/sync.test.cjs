// Two devices against a fake Supabase: convergence, field-level merge, deletes never come back, offline outbox,
// migration on two devices makes no duplicates, privacy cleaner on incoming data.
const H = require('./_h.cjs'); const fs = require('fs'), path = require('path');
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture_legacy.json'), 'utf8'));
const session = { access: 'tok', refresh: 'ref', exp: Date.now() + 36e5, user: { id: 'u1', email: 'tester@example.test' } };
(async () => {
  const b = await H.chromium.launch(), sb = H.fakeSupabase();
  const dev = async (name, legacy) => {
    const ctx = await H.context(b, { supabase: sb, init: { fn: a => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1'); localStorage.setItem('cloud_session_v1', JSON.stringify(a.s)); localStorage.setItem('hub_device_id', a.name + '-device'); if (a.legacy) Object.keys(a.legacy).forEach(k => localStorage.setItem(k, a.legacy[k])); }, arg: { s: session, name, legacy } } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.errs = errs;
    await p.goto('http://app.local/next/#/day'); await p.waitForFunction(() => window.__abi && window.__abi.sync.status.value === 'synced', null, { timeout: 15000 }); return p;
  };
  const sync = p => p.evaluate(() => window.__abi.cycle(true));
  const all = (p, c) => p.evaluate(c => window.__abi.store.all(c), c);
  const get = (p, c, id) => p.evaluate(([c, id]) => window.__abi.store.get(c, id), [c, id]);
  const put = (p, c, id, d) => p.evaluate(([c, id, d]) => window.__abi.store.put(c, id, d), [c, id, d]);

  // migration: both devices have the same old data and start at the same time → no duplicates
  const A = await dev('A', FIX), B = await dev('B', FIX);
  await sync(A); await sync(B); await sync(A);
  const nA = (await all(A, 'entries')).length, nB = (await all(B, 'entries')).length;
  H.check('migration: both devices have the same entries', nA === nB && nA > 0, nA + ' vs ' + nB);
  H.check('migration: no duplicates (17 old entries)', nA === 17, String(nA));
  H.check('migration: punches migrated', (await all(A, 'punches')).length === 4);

  // add on A → appears on B
  await put(A, 'entries', 'syncA1', { day: '2026-11-27', hk: '10:00', sk: 'other', ord: 1, text: 'from A' });
  await sync(A); await sync(B);
  H.check('an entry added on A shows on B', !!(await get(B, 'entries', 'syncA1')));

  // different fields of the same item on both devices → both kept
  sb.S.offline = true;
  await put(A, 'entries', 't1', { notes: 'notes changed on A' });
  await put(B, 'entries', 't1', { stage: 'Going Live' });
  sb.S.offline = false;
  await sync(A); await sync(B); await sync(A);
  const tA = await get(A, 'entries', 't1'), tB = await get(B, 'entries', 't1');
  H.check('different fields edited on two devices: both survive', tA.notes === 'notes changed on A' && tA.stage === 'Going Live' && JSON.stringify(tA) === JSON.stringify(tB), JSON.stringify([tA, tB]));

  // same field on both → one value everywhere (the later edit)
  sb.S.offline = true;
  await put(A, 'entries', 't2', { notes: 'A says' }); await A.waitForTimeout(20);
  await put(B, 'entries', 't2', { notes: 'B says later' });
  sb.S.offline = false;
  await sync(A); await sync(B); await sync(A);
  const s1 = await get(A, 'entries', 't2'), s2 = await get(B, 'entries', 't2');
  H.check('same field on both devices: later edit wins on both', s1.notes === 'B says later' && s2.notes === 'B says later', s1.notes + ' / ' + s2.notes);

  // delete on A while B (offline) edits another field of the same item → stays deleted? No: an edit after the delete revives it; an edit before does not.
  sb.S.offline = true;
  await put(B, 'entries', 'syncA1', { text: 'B edited before the delete' }); await B.waitForTimeout(20);
  await A.evaluate(() => window.__abi.store.del('entries', 'syncA1'));
  sb.S.offline = false;
  await sync(B); await sync(A); await sync(B);
  H.check('a deleted item does not come back from a stale device', !(await get(A, 'entries', 'syncA1')) && !(await get(B, 'entries', 'syncA1')));

  // offline outbox survives a restart
  sb.S.offline = true;
  await put(B, 'tasks', 'outbox1', { title: 'made offline', done: false });
  await B.waitForTimeout(300);
  await B.reload(); await B.waitForFunction(() => window.__abi && window.__abi.store.storeReady.value);
  H.check('offline change is still waiting after a restart', (await B.evaluate(() => window.__abi.sync.pending.value)) >= 1 || !!(await get(B, 'tasks', 'outbox1')));
  sb.S.offline = false; await sync(B); await sync(A);
  H.check('offline change reaches the other device once online', !!(await get(A, 'tasks', 'outbox1')));

  // privacy: data arriving from the cloud is cleaned too
  const ph = ['+9', '60', ' 7', '77 ', '1234'].join(''), em = ['someone', '@', 'example', '.com'].join('');
  const v = JSON.stringify({ c: 'entries', id: 'bad1', d: { day: '2026-11-27', hk: '10:00', sk: 'other', ord: 2, text: 'call ' + ph + ' or mail ' + em + ' about it' }, t: { day: 'zzzzzzzzz-0000-x', hk: 'zzzzzzzzz-0000-x', sk: 'zzzzzzzzz-0000-x', ord: 'zzzzzzzzz-0000-x', text: 'zzzzzzzzz-0000-x' }, x: null, u: 'zzzzzzzzz-0000-x' });
  sb.S.rows.set('v2:entries:bad1', { workspace_id: 'ws1', key: 'v2:entries:bad1', value: v, version: 1, updated_at: new Date(Date.UTC(2026, 10, 27) + (++sb.S.clock) * 1000).toISOString() });
  await sync(A);
  const bad = await get(A, 'entries', 'bad1');
  H.check('phone numbers / e-mails from the cloud are cleaned out', bad && bad.text.indexOf('1234') < 0 && bad.text.indexOf('@') < 0, bad && bad.text);
  const stored = await A.evaluate(() => JSON.stringify(window.__abi.store.rawAll().map(r => r.d)));
  if (process.env.DBG) console.log(await A.evaluate(() => JSON.stringify(window.__abi.store.rawAll().filter(r => JSON.stringify(r.d).indexOf("11122233") >= 0).map(r => [r.c, r.id, r.d]))));
  const m = stored.replace(/https?:\/\/[^"]+/g, '').replace(/"(at|ord|created|ts|exp|placeTs|updated|closed|doneAt)":\d+/g, '').match(/\+?\d[\d ().-]{6,}\d/g);
  H.check('nothing phone- or e-mail-like is stored on the device', !(m || []).some(x => x.replace(/\D/g, '').length >= 7 && !/^\d{4}-\d{2}-\d{2}/.test(x)) && stored.indexOf(em) < 0, JSON.stringify((m || []).filter(x => x.replace(/\D/g, "").length >= 7 && !/^\d{4}-\d{2}-\d{2}/.test(x))));

  // an item too large to send is reported and does not block the others
  await A.evaluate(() => window.__abi.store.put('legacy', 'huge_test', { raw: 'x'.repeat(4600000) }));
  await put(A, 'tasks', 'afterHuge', { title: 'sent despite a huge item', done: false });
  await sync(A); await sync(B);
  H.check('a too-large item does not block other changes', !!(await get(B, 'tasks', 'afterHuge')));
  H.check('a too-large item is reported in the sync status', /too large/.test(await A.evaluate(() => window.__abi.sync.detail.value)), await A.evaluate(() => window.__abi.sync.detail.value));
  await A.evaluate(() => window.__abi.store.del('legacy', 'huge_test'));

  // first ever start while offline (no workspace known yet) → syncs once back online, without reopening
  sb.S.offline = true;
  const ctxC = await H.context(b, { supabase: sb, init: { fn: a => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1'); localStorage.setItem('cloud_session_v1', JSON.stringify(a)); }, arg: session } });
  const C = await ctxC.newPage(); await C.goto('http://app.local/next/#/day'); await C.waitForTimeout(2500);
  await C.evaluate(() => window.__abi.store.put('tasks', 'fromC', { title: 'made on a new device while offline', done: false }));
  sb.S.offline = false; await C.evaluate(() => window.__abi.cycle(true)); await C.waitForTimeout(300); await C.evaluate(() => window.__abi.cycle(true));
  await sync(A);
  H.check('a device that started offline syncs once online (no reopen needed)', !!(await get(A, 'tasks', 'fromC')));

  // old app rows are only read, never written
  const legacyWrites = [...sb.S.rows.keys()].filter(k => !k.startsWith('v2:'));
  H.check('the old app\'s cloud rows are never written', legacyWrites.length === 0, legacyWrites.join(','));
  H.check('no page errors', !A.errs.length && !B.errs.length, A.errs.concat(B.errs).join(' | '));
  await b.close(); H.done();
})().catch(e => { console.log('FAIL exception', e.message); process.exit(1); });
