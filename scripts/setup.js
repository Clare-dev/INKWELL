// One-time testnet setup. Needs: npm run build:contract, and the owner's key for inkwell.testnet.
//   NEAR_OWNER_KEY=ed25519:... npm run setup        (set KEEP_FULL_KEY=1 to keep the manager's full-access key)
// Owner needs roughly 10 NEAR: escrow storage (~5.4 NEAR for the 540 KB wasm) + funding below.
import fs from 'fs';
import nearAPI from 'near-api-js';
const { connect, keyStores, KeyPair } = nearAPI;
const cfg = JSON.parse(fs.readFileSync(new URL('../config.json', import.meta.url))), C = cfg.chain, P = cfg.parentAccount;
const N = (x) => BigInt(Math.round(x * 1e6)) * 10n ** 18n;
const ownerKey = process.env.NEAR_OWNER_KEY; if (!ownerKey) throw new Error('set NEAR_OWNER_KEY (key of ' + P + ')');
const ks = new keyStores.InMemoryKeyStore(); await ks.setKey(C.networkId, P, KeyPair.fromString(ownerKey));
const near = await connect({ networkId: C.networkId, nodeUrl: C.rpc, keyStore: ks });
const owner = await near.account(P);
const keys = {}; const pairs = {};
const fund = { [C.escrow]: 7, [C.customer]: 1.5, [C.manager]: 0.3, [C.treasury]: 0.05, [C.contributors]: 0.05,
  ...Object.fromEntries(['r1', 'r2', 'w1', 'w2', 'f1', 'f2'].map((n) => [`${n}.${P}`, 0.05])) };
for (const [id, amt] of Object.entries(fund)) {
  const kp = KeyFor(id); await owner.createAccount(id, kp.getPublicKey().toString(), N(amt)); console.log('created', id);
  await ks.setKey(C.networkId, id, kp);
}
function KeyFor(id) { return (pairs[id] = KeyPair.fromRandom('ed25519')); }
// Deploy + init the escrow
const escrow = await near.account(C.escrow);
await escrow.deployContract(fs.readFileSync('build/escrow.wasm'));
await escrow.functionCall({ contractId: C.escrow, methodName: 'init', args: { manager: C.manager, cap_yocto: (N(C.capUnits * C.unitNear)).toString() } });
console.log('escrow deployed + initialised');
// Manager: add a function-call key limited to `release` on the escrow, then (by default) delete the full-access key.
const manager = await near.account(C.manager);
const fc = KeyPair.fromRandom('ed25519');
await manager.addKey(fc.getPublicKey().toString(), C.escrow, ['release'], N(0.25));
if (!process.env.KEEP_FULL_KEY) {
  await manager.deleteKey(pairs[C.manager].getPublicKey().toString());
  console.log('manager full-access key deleted: it can only call release on', C.escrow);
}
keys.manager = fc.toString(); keys.customer = pairs[C.customer].toString();
fs.writeFileSync('.keys.json', JSON.stringify(keys, null, 1)); console.log('wrote .keys.json (gitignored). Now: npm run sim:chain');
