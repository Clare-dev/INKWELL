// Cloudflare Worker: starts orders, stores results in a private KV database, and serves them back by order id.
// Secrets (GITHUB_TOKEN, RESULT_SECRET) live only in this Worker's settings. They are never in the site or the repo.
const ALLOW = 'https://clare-dev.github.io', TTL = 60 * 60 * 24 * 30, hits = new Map();
const ok = id => /^[a-z0-9]{8,24}$/.test(id || '');
const json = (o, s, h) => new Response(JSON.stringify(o), { status: s, headers: { ...h, 'content-type': 'application/json' } });
const get = async (env, id) => JSON.parse((await env.ORDERS.get('order:' + id)) || 'null');
export default {
  async fetch(req, env) {
    const cors = { 'access-control-allow-origin': ALLOW, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
    const url = new URL(req.url), path = url.pathname;
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    // 1. The GitHub job posts the finished order here (needs the shared secret).
    if (path === '/result' && req.method === 'POST') {
      if (!env.RESULT_SECRET || req.headers.get('x-inkwell-secret') !== env.RESULT_SECRET) return json({ error: 'Not allowed' }, 403, cors);
      const b = await req.json().catch(() => null);
      if (!b || !ok(b.id) || !Array.isArray(b.ledger) || JSON.stringify(b.ledger).length > 200000) return json({ error: 'Bad request' }, 400, cors);
      const prev = (await get(env, b.id)) || {};
      await env.ORDERS.put('order:' + b.id, JSON.stringify({ ...prev, status: 'done', ledger: b.ledger, updated: Date.now() }), { expirationTtl: TTL });
      return json({ ok: true }, 200, cors);
    }
    // Everything else must come from the website.
    if (req.headers.get('origin') !== ALLOW) return json({ error: 'Not allowed' }, 403, cors);
    // 2. Read one order by its id.
    if (path === '/order' && req.method === 'GET') {
      const id = url.searchParams.get('id'); if (!ok(id)) return json({ error: 'Bad id' }, 400, cors);
      const rec = await get(env, id); return rec ? json(rec, 200, cors) : json({ error: 'Order not found. Orders are kept for 30 days.' }, 404, cors);
    }
    // 3. Summaries for a list of order ids (the visitor's own history).
    if (path === '/history' && req.method === 'POST') {
      const b = await req.json().catch(() => null), ids = (b && Array.isArray(b.ids) ? b.ids : []).filter(ok).slice(0, 30), orders = [];
      for (const id of ids) { const r = await get(env, id); if (r) orders.push({ id, status: r.status, kind: r.kind, brief: r.brief, price: r.price, created: r.created }); }
      return json({ orders }, 200, cors);
    }
    // 4. Place an order.
    if (path === '/' && req.method === 'POST') {
      const b = await req.json().catch(() => null); if (!b) return json({ error: 'Bad request' }, 400, cors);
      const raw = String(b.brief || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200), price = Math.round(Number(b.price));
      if (!raw || !(price >= 30 && price <= 60)) return json({ error: 'Add a topic and a price from 30 to 60 units.' }, 400, cors);
      const ip = req.headers.get('cf-connecting-ip') || 'x', now = Date.now(), recent = (hits.get(ip) || []).filter(t => now - t < 3600e3);
      if (recent.length >= 3) return json({ error: 'Limit reached: 3 orders per hour per visitor.' }, 429, cors);
      hits.set(ip, [...recent, now]);
      const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12), m = /^\[(X thread|Article|Launch post)\] ([\s\S]*)$/.exec(raw);
      const r = await fetch(`https://api.github.com/repos/${env.REPO}/actions/workflows/order-web.yml/dispatches`, { method: 'POST',
        headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'user-agent': 'inkwell-relay', 'content-type': 'application/json' },
        body: JSON.stringify({ ref: 'main', inputs: { brief: raw, price: String(price), order_id: id } }) });
      if (r.status !== 204) return json({ error: 'Could not start the order. Please try again.' }, 502, cors);
      await env.ORDERS.put('order:' + id, JSON.stringify({ status: 'pending', kind: m ? m[1] : 'X thread', brief: (m ? m[2] : raw).slice(0, 120), price, created: now }), { expirationTtl: TTL });
      return json({ id }, 200, cors);
    }
    return json({ error: 'Not found' }, 404, cors);
  } };
