// Runs ONE real testnet order started from the website. Inputs are data only: never run as code or shell.
import fs from 'fs';
import { execSync } from 'child_process';
import { runOrder, save, log, cfg } from '../src/studio.js';
const { BRIEF = '', PRICE = '', ORDER_ID = '' } = process.env;
if (!/^[a-z0-9]{8,24}$/.test(ORDER_ID)) process.exit(1);
fs.mkdirSync('orders', { recursive: true });
const out = `orders/web-${ORDER_ID}.json`, id = ORDER_ID;
const finish = () => { save('result-full.json'); const L = JSON.parse(fs.readFileSync('result-full.json')); fs.writeFileSync(out, JSON.stringify(L.map(({ text, preview, ...e }) => e), null, 2)); };
const stop = reason => { log('order_rejected', { id, reason }); finish(); process.exit(0); };
const brief = BRIEF.replace(/\s+/g, ' ').slice(0, 200).trim(), price = Math.round(Number(PRICE));
if (!brief || !(price >= cfg.minOrderPrice && price <= 60)) stop('needs a topic and a price from 30 to 60 units');
let recent = 0;
try { recent = execSync('git log --since="1 hour ago" --name-only --pretty=format: -- orders').toString().split('\n').filter(l => l.startsWith('orders/web-')).length; } catch {}
if (recent >= 15) stop('the studio is busy, please try again in a little while');
const j = x => Math.floor(Math.random() * x), A = (a, p, f) => ({ agent: a + '.' + cfg.parentAccount, price: p, floor: f });
const bid = (a, plan) => { const p = plan + j(5) - 1; return A(a, p, p - 1 - j(4)); };
const bidders = { research: [bid('r1', 8), bid('r2', 8)], write: [bid('w1', 10), bid('w2', 10)], factcheck: [bid('f1', 5), bid('f2', 5)] };
log('order_from_web', { id });
try { await runOrder('web-' + id, brief, price, 'testnet NEAR', bidders); } catch (e) { log('order_rejected', { id, reason: 'the studio hit an error: ' + String(e.message).slice(0, 120) }); }
finish();
