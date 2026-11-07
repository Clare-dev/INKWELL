import { runOrder, pay, kill, save, log } from './studio.js';
const B = (agent, price, floor) => ({ agent, price, floor });
const bidders = {
  research: [B('r1.inkwell.testnet', 7, 6), B('r2.inkwell.testnet', 9, 8)],
  write: [B('w1.inkwell.testnet', 12, 9), B('w2.inkwell.testnet', 14, 13)],   // 12 > plan 10: manager counters, w1 accepts
  factcheck: [B('f1.inkwell.testnet', 4, 3), B('f2.inkwell.testnet', 6, 5)],
};
log('demo_start', { note: 'Intents settlement is simulated; see README' });
await runOrder('order-1', 'Why savings circles still beat banks', 45, 'USDC@base', bidders);
log('attack', { what: 'prompt-injected manager tries to pay a blocklisted address' });
pay('order-2', 'write', 'drain-wallet.testnet', 5);
log('attack', { what: 'manager tries to exceed per-task cap' });
pay('order-2', 'write', 'w1.inkwell.testnet', 99);
await runOrder('order-3', 'cheap order', 10, 'NEAR', bidders);          // rejected: below minimum
kill();
await runOrder('order-4', 'after kill switch', 45, 'USDC@eth', bidders); // rejected: kill switch
save(); console.log('Done. See web/ledger.json (run: npm run serve, open :8080)');
