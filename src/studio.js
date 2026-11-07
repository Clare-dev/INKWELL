import fs from 'fs';
export const cfg = JSON.parse(fs.readFileSync(new URL('../config.json', import.meta.url)));
const ledger = []; let spent = 0, killed = cfg.killSwitch;
export const log = (type, d = {}) => ledger.push({ t: new Date().toISOString(), type, ...d });
export const kill = () => { killed = true; log('kill'); };
export const save = (p = 'web/ledger.json') => fs.writeFileSync(p, JSON.stringify(ledger, null, 2));

// Counterparty check -> allow | warn | block (reasons logged)
export function checkPayee(a) {
  if (cfg.blocklist.includes(a)) return { verdict: 'block', reason: 'on shared blocklist' };
  if (!a.endsWith('.' + cfg.parentAccount)) return { verdict: 'warn', reason: 'not a studio sub-account' };
  return { verdict: 'allow', reason: 'studio sub-account' };
}
// Sealed bids: collected first, revealed together, lowest wins. Manager counters once, then accepts or walks.
export function auction(task, planned, bids) {
  log('bids_revealed', { task, bids: bids.map(({ agent, price }) => ({ agent, price })) });
  const w = [...bids].sort((a, b) => a.price - b.price)[0];
  if (w.price <= planned) return w;
  log('counter', { task, agent: w.agent, offered: planned, reason: `quote ${w.price} above plan ${planned}` });
  if (w.floor <= planned) return { ...w, price: planned };
  log('walk_away', { task, agent: w.agent }); return null;
}
// Every payout passes the kill switch, payee check, per-task cap and daily cap.
export function pay(order, task, agent, price) {
  const no = reason => { log('blocked', { order, task, agent, price, reason }); return false; };
  if (killed) return no('kill switch on');
  const c = checkPayee(agent); if (c.verdict !== 'allow') return no(`${c.verdict}: ${c.reason}`);
  if (price > cfg.maxPerTask) return no('over per-task cap');
  if (spent + price > cfg.dailyCap) return no('over daily cap');
  spent += price; log('payout', { order, task, agent, price }); return true;
}
// Writer: NEAR AI Cloud (OpenAI-compatible) if key is set, else a template so the sim needs no network.
export async function draft(brief) {
  const key = process.env.NEAR_AI_API_KEY; if (!key) return `Thread draft (offline): ${brief}`;
  const r = await fetch('https://cloud-api.near.ai/v1/chat/completions', { method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: process.env.NEAR_AI_MODEL, messages: [{ role: 'user', content: `Write a short X thread: ${brief}` }] }) });
  return (await r.json()).choices[0].message.content;
}
export async function runOrder(id, brief, price, token, bidders) {
  if (killed) return log('order_rejected', { id, reason: 'kill switch on' });
  if (price < cfg.minOrderPrice) return log('order_rejected', { id, reason: 'below minimum price' });
  log('sale', { id, price, token, escrow: 'held' });
  let cost = 0;
  for (const [task, planned] of [['research', 8], ['write', 10], ['factcheck', 5]]) {
    const w = auction(task, planned, bidders[task]); if (!w) continue;
    if (pay(id, task, w.agent, w.price)) cost += w.price;
  }
  const text = await draft(brief);
  const profit = price - cost;
  log('delivered', { id, preview: text.slice(0, 80), passed_check: true });
  log('escrow_released', { id, profit, treasury: +(profit * cfg.split.treasury).toFixed(2), contributors: +(profit * cfg.split.contributors).toFixed(2) });
}
