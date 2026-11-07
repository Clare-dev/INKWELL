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

## Honest status
- Real and runnable: all logic in `src/`, the simulation, the ledger page.
- **Not done yet:** `contract/escrow.js` is uncompiled and undeployed; Intents payments are simulated (no testnet exists); sub-accounts are named in code but not created on chain; NEAR AI attestation is not wired in, so we do not claim the Privacy track.
- Planned NEAR use: manager signs with a function-call key limited to `release` on the escrow contract.
Baseline vs hackathon work: everything here was written during the hackathon window. License: MIT.
