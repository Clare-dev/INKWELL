// Runs ONE real testnet order from a GitHub issue. Issue text is data only: it is never run as code or shell.
import fs from 'fs';
import { runOrder, save, log, cfg } from '../src/studio.js';
const { ISSUE_NUMBER: n, ISSUE_BODY: body = '', ISSUE_USER: user, GH_TOKEN, GITHUB_REPOSITORY: repo } = process.env;
const field = f => (body.match(new RegExp(`### ${f}\\s+([\\s\\S]*?)(?=\\n### |$)`)) || [])[1]?.trim() || '';
const done = text => { fs.writeFileSync('result.md', text); console.log(text); process.exit(0); };
try {
  const brief = field('What should we write\\?').replace(/\s+/g, ' ').slice(0, 200), price = Math.round(Number(field('Price in units')));
  if (!brief || !(price >= cfg.minOrderPrice && price <= 60)) done(`Order rejected: it needs a topic and a price between ${cfg.minOrderPrice} and 60 units.`);
  const since = new Date(Date.now() - 3600e3).toISOString().slice(0, 19) + 'Z';
  const q = encodeURIComponent(`repo:${repo} author:${user} label:order created:>=${since}`);
  const r = await (await fetch(`https://api.github.com/search/issues?q=${q}`, { headers: { authorization: `Bearer ${GH_TOKEN}` } })).json();
  if (user !== process.env.GITHUB_REPOSITORY_OWNER && r.total_count > 1) done('Order rejected: one order per person per hour, to protect the shared testnet funds. Please try again later.');
  const B = (a, p, f) => ({ agent: a + '.' + cfg.parentAccount, price: p, floor: f }), j = x => Math.floor(Math.random() * x);
  const bid = (a, plan) => { const p = plan + j(5) - 1; return B(a, p, p - 1 - j(4)); };
  const bidders = { research: [bid('r1', 8), bid('r2', 8)], write: [bid('w1', 10), bid('w2', 10)], factcheck: [bid('f1', 5), bid('f2', 5)] };
  log('order_from_github', { issue: n, user });
  await runOrder('issue-' + n, brief, price, 'testnet NEAR', bidders);
  fs.mkdirSync('orders', { recursive: true }); save(`orders/issue-${n}.json`);
  const L = JSON.parse(fs.readFileSync(`orders/issue-${n}.json`)), tx = L.filter(e => e.tx), d = L.find(e => e.type === 'delivered'), a = L.find(e => e.type === 'attestation');
  done([`**Order processed on NEAR testnet.**`, '', ...tx.map(e => `- ${e.type}${e.task ? ' (' + e.task + ')' : ''}${e.kind ? ' (' + e.kind + ')' : ''}: [view tx](${cfg.chain.explorer}${e.tx})`), '',
    a ? `AI draft written on NEAR AI Cloud (model \`${a.model}\`). Attestation fetched with a fresh nonce: nonce echoed = ${a.nonce_echoed}, Intel quote present = ${a.has_intel_quote}. Full check: ${a.full_check}` : 'AI attestation was not available for this order, so the draft is a placeholder.',
    '', '**Your draft**', '', d?.text || '(no draft)', '', 'Full ledger: `orders/issue-' + n + '.json`'].join('\n'));
} catch (e) { done('Something went wrong running this order: ' + String(e.message).slice(0, 200)); }
