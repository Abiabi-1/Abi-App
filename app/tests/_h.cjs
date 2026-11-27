// Test harness: serves the built app (../next) and the old app (built from source, optional) through request routing –
// no server, no outside network. A fake Supabase (kv / auth / rpc / devices) lives in memory for sync tests.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const NEXT = path.join(__dirname, '..', '..', 'next');
const LEGACY = process.env.LEGACY_DIST || '';
function mime(f) { return /\.js$/.test(f) ? 'text/javascript' : /\.css$/.test(f) ? 'text/css' : /\.html$/.test(f) ? 'text/html' : /\.json|webmanifest$/.test(f) ? 'application/json' : /\.png$/.test(f) ? 'image/png' : /\.jpg$/.test(f) ? 'image/jpeg' : 'application/octet-stream'; }
function fakeSupabase() {
  const S = { rows: new Map(), ver: 0, users: { 'u1': { id: 'u1', email: 'tester@example.test' } }, devices: new Map(), clock: 0, calls: 0, failNext: 0 };
  const now = () => new Date(Date.UTC(2026, 10, 27, 0, 0, 0) + (++S.clock) * 1000).toISOString();
  function filt(url) { const u = new URL(url); const p = {}; u.searchParams.forEach((v, k) => { p[k] = v; }); return p; }
  function match(row, p) {
    for (const k of Object.keys(p)) {
      const v = p[k]; if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k)) continue;
      const [op, ...rest] = v.split('.'); const val = rest.join('.'); const cur = row[k];
      if (op === 'eq' && String(cur) !== val) return false;
      if (op === 'gte' && !(cur >= val)) return false;
      if (op === 'like' && !String(cur).startsWith(val.replace(/\*$/, ''))) return false;
      if (op === 'not' && val.startsWith('like.') && String(cur).startsWith(val.slice(5).replace(/\*$/, ''))) return false;
      if (op === 'in') { const list = val.replace(/^\(|\)$/g, '').match(/"((?:[^"\\]|\\.)*)"|[^,]+/g).map(x => x.replace(/^"|"$/g, '').replace(/\\"/g, '"')); if (!list.includes(String(cur))) return false; }
    }
    return true;
  }
  async function handle(route) {
    const req = route.request(), url = req.url(), u = new URL(url), m = req.method(); S.calls++;
    const json = (o, st = 200) => route.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(o) });
    if (S.offline) return route.abort();
    if (u.pathname.startsWith('/auth/v1/token')) return json({ access_token: 'tok' + S.clock, refresh_token: 'ref', expires_in: 3600, user: S.users.u1 });
    if (u.pathname === '/auth/v1/logout') return json({});
    if (u.pathname === '/rest/v1/rpc/ensure_workspace') return json('ws1');
    if (u.pathname === '/rest/v1/devices') return json([]);
    if (u.pathname === '/rest/v1/kv') {
      const p = filt(url);
      if (m === 'GET') { let a = [...S.rows.values()].filter(r => match(r, p)); if (p.order && p.order.startsWith('updated_at')) a.sort((x, y) => (x.updated_at < y.updated_at ? -1 : x.updated_at > y.updated_at ? 1 : x.key < y.key ? -1 : 1)); else a.sort((x, y) => (x.key < y.key ? -1 : 1)); const off = +(p.offset || 0), lim = +(p.limit || 1e9); return json(a.slice(off, off + lim)); }
      if (m === 'POST') { const body = JSON.parse(req.postData() || '[]'); const arr = Array.isArray(body) ? body : [body]; const out = []; const ts = now();
        for (const b of arr) { const k = b.key; if (S.rows.has(k)) continue; const row = { workspace_id: b.workspace_id, key: k, value: b.value, version: 1, updated_at: ts }; S.rows.set(k, row); out.push(row); }
        return json(out, 201); }
      if (m === 'PATCH') { const body = JSON.parse(req.postData() || '{}'); const out = []; for (const r of S.rows.values()) { if (match(r, p)) { r.value = body.value; r.version++; r.updated_at = now(); out.push(r); } } return json(out); }
    }
    if (u.pathname.startsWith('/realtime')) return route.abort();
    return json({}, 404);
  }
  return { S, handle };
}
async function context(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1200, height: 860 }, serviceWorkers: 'block', ...(opts.device || {}) });
  const sb = opts.supabase;
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.hostname === 'app.local' || u.hostname === 'legacy.local') {
      const root = u.hostname === 'app.local' ? NEXT : LEGACY; let f = path.join(root, decodeURIComponent(u.pathname.replace(/^\/next/, '')));
      if (f.endsWith('/')) f += 'index.html';
      if (fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ status: 200, contentType: mime(f), body: fs.readFileSync(f) });
      return route.fulfill({ status: 404, body: '' });
    }
    if (sb && u.hostname.endsWith('supabase.co')) return sb.handle(route);
    return route.abort();
  });
  if (opts.init) await ctx.addInitScript(opts.init.fn, opts.init.arg);
  // never the real project: tests use a fake host (realtime off) or no cloud at all
  if (!sb) await ctx.addInitScript(() => { window.CLOUD_CONFIG = { disabled: true }; });
  else await ctx.addInitScript(() => { window.CLOUD_CONFIG = { url: 'https://test-project.supabase.co', anonKey: 'sb_publishable_test', realtime: false }; });
  return ctx;
}
let fails = 0; const results = [];
function check(name, ok, info) { results.push([ok ? 'ok  ' : 'FAIL', name, info || '']); if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (info && !ok ? ' :: ' + String(info).slice(0, 300) : '')); }
function done() { console.log('FAILS ' + fails); process.exit(fails ? 1 : 0); }
module.exports = { chromium, context, fakeSupabase, check, done, NEXT };
