# Inkwell: an AI content studio that runs itself
A manager agent takes content orders, hires specialist agents through sealed-bid auctions, pays them from a capped budget, and splits the profit. Humans only edit `config.json`.

## Try it (no keys, no network)
1. `npm run sim` -> prints "Done" and writes `web/ledger.json`.
2. `npm run serve`, open http://localhost:8080 -> see sale, bids, a counter-offer, payouts, then **blocked** lines for a blocklisted payee and an over-cap payment, and order rejections from the minimum price and the kill switch.
Optional: set `NEAR_AI_API_KEY` and `NEAR_AI_MODEL` to draft with NEAR AI Cloud.

## Tracks and how to verify
| Track | Feature | Check |
|---|---|---|
| Autonomous Business | `config.json` rules, kill switch, public ledger | step 2 |
| AI Swarms | sealed bids, scripted bidders, no LLM needed | `bids_revealed` rows |
| Agent Economy | counter-offer once, then accept or walk, per-task payout records | `counter`, `payout` rows |
| AI Security & Defense | payee check (allow/warn/block), caps, attack demo | `blocked` rows |

## Run it on NEAR testnet (chain mode)
1. `npm i && npm run build:contract` (compiles `contract/escrow.js` to `build/escrow.wasm`).
2. `NEAR_OWNER_KEY=ed25519:... npm run setup`: creates `escrow/manager/customer/treasury/contributors` and the six bidder sub-accounts under `inkwell.testnet`, deploys + inits the escrow, gives the manager a function-call key limited to `release` on the escrow, then deletes the manager's full-access key. Needs about 10 NEAR in the owner account. Writes `.keys.json` (gitignored).
3. `npm run sim:chain`, then `npm run serve`: ledger rows now carry real tx hashes with a "view tx" link. Two extra attacks run against the live contract: an over-cap `release` and a method the manager's key is not allowed to call. Both should show as `chain_rejected`.
1 studio unit = 0.01 NEAR in chain mode (`config.json` -> `chain`).

## Honest status
- Real and runnable offline: all logic in `src/`, the simulation, the ledger page.
- Escrow contract compiles with near-sdk-js. Chain mode, the setup script and the on-chain attack demos are written but **not yet run against testnet**; this section changes only once tx hashes exist.
- Intents payments are still simulated (no testnet exists), so the sale shows a token label only. NEAR AI attestation is not wired in, so we do not claim the Privacy track.
- The deposit is made by a `customer` demo account, not by a real Intents swap.
Baseline vs hackathon work: everything here was written during the hackathon window. License: MIT.
