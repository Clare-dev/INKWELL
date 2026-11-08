// Chain mode (INKWELL_MODE=chain). 1 studio unit = cfg.chain.unitNear NEAR.
// The manager signs ONLY with a function-call key limited to `release` on the escrow (see scripts/setup.js).
import fs from 'fs';
import nearAPI from 'near-api-js';
const { connect, keyStores, KeyPair } = nearAPI;
let C, acct = {};
export const yocto = (units) => BigInt(Math.round(units * C.unitNear * 1e6)) * 10n ** 18n;
export async function init(cfg) {
  C = cfg.chain;
  const keys = JSON.parse(fs.readFileSync(process.env.INKWELL_KEYS || '.keys.json')); // written by `npm run setup`
  const ks = new keyStores.InMemoryKeyStore();
  for (const who of ['manager', 'customer']) await ks.setKey(C.networkId, C[who], KeyPair.fromString(keys[who]));
  const near = await connect({ networkId: C.networkId, nodeUrl: C.rpc, keyStore: ks });
  for (const who of ['manager', 'customer']) acct[who] = await near.account(C[who]);
}
const call = (who, methodName, args, deposit = 0n) =>
  acct[who].functionCall({ contractId: C.escrow, methodName, args, attachedDeposit: deposit });
// Customer funds one escrow per order.
export async function createOrder(id, units) {
  return (await call('customer', 'create_order', { id }, yocto(units))).transaction.hash;
}
// Manager pays from escrow. The contract enforces the manager-only rule and the per-payout cap.
export async function release(id, payee, units) {
  return (await call('manager', 'release', { id, payee, amount: yocto(units).toString() })).transaction.hash;
}
// For the attack demo: the manager's restricted key tries a method it is not allowed to call.
export const attempt = (methodName, args) => call('manager', methodName, args);
export const explorer = (tx) => C.explorer + tx;
