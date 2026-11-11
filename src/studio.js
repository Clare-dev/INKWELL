import fs from 'fs';
export const cfg = JSON.parse(fs.readFileSync(new URL('../config.json', import.meta.url)));
export const chain = process.env.INKWELL_MODE === 'chain' ? await import('./chain.js') : null;
if (chain) await chain.init(cfg);
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
export async function pay(order, task, agent, price) {
  const no = reason => { log('blocked', { order, task, agent, price, reason }); return false; };
  if (killed) return no('kill switch on');
  const c = checkPayee(agent); if (c.verdict !== 'allow') return no(`${c.verdict}: ${c.reason}`);
  if (price > cfg.maxPerTask) return no('over per-task cap');
  if (spent + price > cfg.dailyCap) return no('over daily cap');
  let tx; if (chain) { try { tx = await chain.release(order, agent, price); } catch (e) { return no('chain: ' + String(e.message).slice(0, 120)); } }
  spent += price; log('payout', { order, task, agent, price, ...(tx && { tx }) }); return true;
}
// Profit split: same kill switch + payee check, but not counted against the daily spend cap.
export async function distribute(order, kind, payee, amount) {
  if (killed || checkPayee(payee).verdict !== 'allow') return log('blocked', { order, task: kind, agent: payee, price: amount, reason: 'distribution refused' });
  let tx; if (chain) { try { tx = await chain.release(order, payee, amount); } catch (e) { return log('blocked', { order, task: kind, reason: 'chain: ' + String(e.message).slice(0, 120) }); } }
  log('distribution', { order, kind, payee, amount, ...(tx && { tx }) });
}
import { draft, research } from './ai.js';
export async function runOrder(id, brief, price, token, bidders) {
  if (killed) return log('order_rejected', { id, reason: 'kill switch on' });
  if (price < cfg.minOrderPrice) return log('order_rejected', { id, reason: 'below minimum price' });
    const sources = process.env.NEAR_AI_API_KEY ? await research(brief.replace(/^\[(X thread|Article|Launch post)\] /, ''), log) : null;
  if (sources && !sources.length) return log('order_rejected', { id, reason: 'No public page could be read for this topic, so nothing was charged. Add the project website (for example near.org) and check it for typos.' });
  let tx; if (chain) { try { tx = await chain.createOrder(id, price); } catch (e) { return log('order_rejected', { id, reason: 'escrow deposit failed: ' + String(e.message).slice(0, 120) }); } }
  log('sale', { id, price, token, escrow: chain ? 'held on-chain' : 'held (simulated)', ...(tx && { tx }) });
    const text = await draft(brief, log, sources);
  if (text === null) {
    let rtx; if (chain) { try { rtx = await chain.refund(id); } catch (e) { return log('order_failed', { id, reason: 'No draft was written and the refund failed: ' + String(e.message).slice(0, 120) }); } }
    return log('order_refunded', { id, reason: 'The private model did not answer, so no draft was written. The escrow was returned and nobody was paid.', ...(rtx && { tx: rtx }) });
  }
  let cost = 0;
  for (const [task, planned] of [['research', 8], ['write', 10], ['factcheck', 5]]) {
    const w = auction(task, planned, bidders[task]); if (!w) continue;
    if (await pay(id, task, w.agent, w.price)) cost += w.price;
  }

  const profit = price - cost;
  log('delivered', { id, preview: text.slice(0, 80), text: text.slice(0, 6000), passed_check: true });
  const treasury = +(profit * cfg.split.treasury).toFixed(2), contributors = +(profit * cfg.split.contributors).toFixed(2);
  if (chain) { await distribute(id, 'treasury', cfg.chain.treasury, treasury); await distribute(id, 'contributors', cfg.chain.contributors, contributors); }
  log('escrow_released', { id, profit, treasury, contributors });
}
