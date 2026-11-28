// Round 62: the new app's shared parts use the exact values measured from the old app (dark theme, crimson palette).
const H = require('./_h.cjs'); const fx = require('./fixture_legacy.json');
(async () => {
  const b = await H.chromium.launch();
  const ctx = await H.context(b, { init: { fn: o => { Object.keys(o).forEach(k => localStorage.setItem(k, o[k])); localStorage.setItem('v2_last_backup', String(Date.now())); }, arg: fx } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const st = (sel, ps) => p.evaluate(([s, ps]) => { const e = document.querySelector(s); if (!e) return null; const c = getComputedStyle(e, ps || null); return { bc: c.borderTopColor, br: c.borderTopLeftRadius, bgi: c.backgroundImage, sh: c.boxShadow, fs: c.fontSize, fw: c.fontWeight, ff: c.fontFamily, col: c.color, tt: c.textTransform, clip: c.webkitBackgroundClip, h: c.height }; }, [sel, ps]);
  for (const t of ['dashboard', 'analytics', 'dealboard', 'lost', 'tickets', 'tasks', 'hr', 'tools', 'auto', 'settings']) {
    await p.goto('http://app.local/next/#/' + t); await p.waitForTimeout(450);
    const h1 = await st('.ph h1');
    H.check(t + ': page title 24px / 800 with the crimson glyph lettering', h1 && h1.fs === '24px' && h1.fw === '800' && /rgba\(254, 89, 104, 0\.7\)/.test(h1.bgi) && /gly\.jpg/.test(h1.bgi) && /text/.test(h1.clip), JSON.stringify(h1));
    const card = await st('main .card, main .stat, main .item, main .tool-tile');
    H.check(t + ': surfaces have the filigree under the dark veil, light rim', card && /rgba\(0, 0, 0, 0\.4\)/.test(card.bgi) && /fil\.jpg/.test(card.bgi) && card.bc === 'rgba(255, 255, 255, 0.09)' && /rgba\(255, 255, 255, 0\.15\) 1px 1px 0px 0px inset/.test(card.sh), JSON.stringify(card));
    const bg = await p.evaluate(() => getComputedStyle(document.querySelector('.app-bg')).backgroundImage);
    H.check(t + ': section glow behind the page', /radial-gradient/.test(bg), bg);
  }
  await p.goto('http://app.local/next/#/dealboard'); await p.waitForTimeout(400);
  const add = await st('main .b-add');
  H.check('main button: crimson gradient #e12a39 → #860a1a, 13px corners, soft crimson shadow', add && /linear-gradient\(rgb\(225, 42, 57\), rgb\(134, 10, 26\) 62%/.test(add.bgi) && add.br === '13px' && /rgba\(229, 48, 63, 0\.28\) 0px 8px 22px/.test(add.sh), JSON.stringify(add));
  const btn = await st('main .b');
  H.check('buttons: bordered rgba(255,255,255,.12), 13px corners, 13.12px / 600', btn && btn.bc === 'rgba(255, 255, 255, 0.12)' && btn.br === '13px' && btn.fs === '13.12px' && btn.fw === '600', JSON.stringify(btn));
  const inp = await st('main .search .in');
  H.check('search box: black with filigree, border rgba(255,255,255,.12), 13px corners', inp && /rgba\(0, 0, 0, 0\.84\)/.test(inp.bgi) && inp.bc === 'rgba(255, 255, 255, 0.12)' && inp.br === '13px', JSON.stringify(inp));
  const col = await st('.col'), colT = await st('.col-t'), dot = await p.evaluate(() => getComputedStyle(document.querySelector('.col-dot')).backgroundColor);
  H.check('board columns: 22px corners, crimson glyph titles, old stage dot colour (Lead grey)', col && col.br === '22px' && colT && /gly\.jpg/.test(colT.bgi) && dot === 'rgba(150, 150, 160, 0.9)', JSON.stringify([col && col.br, dot]));
  const lbl = await st('main .stat .l');
  H.check('data box labels: mono, uppercase, 10.88px, #756a6d', lbl && /JetBrains Mono/.test(lbl.ff) && lbl.tt === 'uppercase' && lbl.fs === '10.88px' && lbl.col === 'rgb(117, 106, 109)', JSON.stringify(lbl));
  await p.goto('http://app.local/next/#/analytics'); await p.waitForTimeout(400);
  const bar = await st('.hbar-t i'), on = await st('main .seg > button.on');
  H.check('bars: 9px, #860a1a → #e12a39', bar && /linear-gradient\(90deg, rgb\(134, 10, 26\), rgb\(225, 42, 57\)\)/.test(bar.bgi) && bar.h === '9px', JSON.stringify(bar));
  H.check('selected period: crimson text', on && on.col === 'rgb(225, 42, 57)', JSON.stringify(on));
  // light theme: no textures, still readable
  await p.evaluate(() => { document.documentElement.dataset.theme = 'light'; }); await p.waitForTimeout(100);
  const lc = await st('main .card');
  H.check('light theme: no dark veil / texture on cards', lc && !/fil\.jpg/.test(lc.bgi), JSON.stringify(lc && lc.bgi));
  H.check('no page errors', !errs.length, errs.join(' | '));
  await b.close(); H.done();
})();
