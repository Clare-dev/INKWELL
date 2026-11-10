# Inkwell

An AI content studio that runs itself on NEAR. A customer orders a short X thread. A manager agent holds the payment in an escrow contract, hires specialist agents through sealed bids, pays them within human-set limits, has a private model write the draft, and splits the profit. Humans only edit the rules in `config.json`.

**The problem:** letting software spend money is risky. Inkwell shows one way to make it safe: the manager's key can call only one contract function, with a cap, so the limits are enforced by the blockchain and not by trusting the code.

**Status:** runs on NEAR **testnet** (test coins only). Live page: https://clare-dev.github.io/INKWELL/

## NEAR tools used

| Tool | What it does here | Where |
|---|---|---|
| Function-call access key | The manager can only call `release` on the escrow. Its full-access key is deleted after setup. | `scripts/setup.js` |
| Smart contract (near-sdk-js) | Escrow: holds each order's payment, releases it in capped payouts, refuses the rest. | `contract/escrow.js` |
| Sub-accounts | Each agent, the customer, treasury and contributors are sub-accounts of `inkwell.testnet`. | `config.json`, `scripts/setup.js` |
| NEAR AI Cloud (private inference, attestation) | The draft is written by the TEE model `z-ai/glm-5.3-flash`. A fresh attestation is fetched with a random nonce before each draft. | `src/ai.js` |

NEAR Intents is **not** used. The customer's "pay with" token is a label only (see "What is real" below).

## Try it: do X, see Y

**1. Place a real testnet order from the website (no setup, no account)**
- Do: open https://clare-dev.github.io/INKWELL/order.html, type a topic that includes a project website (for example, an X thread about near.org), set the price to 45, and press "Place order on testnet".
- See: after about a minute the page shows a live activity list with "view tx" links (escrow deposit, three payouts, treasury and contributor split), a line about the attestation, and your draft. If the studio cannot read any public page about the topic, it says so instead of inventing a draft.
- Limits: 3 orders per hour per visitor, price 30 to 60 units (1 unit = 0.001 testnet NEAR). If the shared demo customer account is out of test coins, the order is rejected.

**1b. Or order through a GitHub issue (needs a GitHub account)**
- Do: open https://github.com/Clare-dev/INKWELL/issues/new?template=order.yml, type a topic, keep the price at 45, submit.
- See: within about a minute a bot replies on the issue with the same "view tx" links, the attestation line and the draft. Example: issue #4 in this repo.
- Limits: one order per person per hour.

**2. Check the attestation line**
- Do: read the attestation row in the activity list from step 1 (or the bot's reply in step 1b).
- See: `nonce echoed = true, Intel quote present = true`. This means the attestation came back, repeated our one-time nonce, and contained a quote. We do not verify the quote's signature ourselves; the full check is at https://cloud.near.ai/verify.

**3. See the chain refuse an attack**
- Do: open `testnet-proof.json` and find the two `chain_rejected` rows.
- See: `over per-payout cap` (the contract refused a payout of 99 units) and `method name refund isn't allowed by the access key` (the manager's key tried a function it does not have). The row before each is the attempt.
- Note: this run was recorded on 8 Nov 2026, when 1 unit was 0.01 testnet NEAR. Then 99 units was 0.99 NEAR, above the contract's 0.25 NEAR cap. One unit is now 0.001 NEAR, so a 99-unit payout today (0.099 NEAR) is under that cap. The contract would still refuse it, because it is more than the order's escrow holds.

**4. Run the offline simulation (no keys, no network)**
- Do: `npm install`, then `npm run sim`, then `npm run serve` and open http://localhost:8080
- See: a ledger with `sale`, `bids_revealed`, `counter`, `payout`, `escrow_released`, then red `blocked` rows (a blocklisted payee, an over-cap payment), `order_rejected` (below the minimum price) and `order_rejected` after the kill switch.

**5. Run chain mode yourself (needs your own testnet account)**
- Change the account names in `config.json` to your own, then: `NEAR_OWNER_KEY=ed25519:... npm run build:contract && npm run setup && npm run sim:chain`.
- Keys are written to `.keys.json`, which is gitignored. Never commit it.

## How a web order runs, and outside services
- **Order flow:** the order page sends the order to a small relay on Cloudflare Workers. The relay starts a GitHub Action, which runs the studio against NEAR testnet. The finished draft goes back to the relay's private store for 30 days. The public repository keeps only a redacted ledger.
- **Research step (`src/ai.js`):** before writing, the studio reads public web pages about the topic. It reads any website named in the topic, plus its documentation and "about" pages. If a page is a JavaScript app with little text, it uses the free reader service r.jina.ai. If the topic names no website, it searches DuckDuckGo. Only public https pages with real domain names are read (no IP addresses or local names). The model is told to use only facts from these pages, and to say so when it finds none.
- **Outside services:** Cloudflare (Workers and KV, for the relay), GitHub (Pages and Actions), NEAR AI Cloud (model and attestation), r.jina.ai (page reader), DuckDuckGo (search), Google Fonts (page fonts).
- **What leaves the studio:** the words of a topic may be sent to DuckDuckGo as a search, and website addresses in a topic are sent to r.jina.ai. Do not put anything private in a topic.

## Payments
- **Only NEAR testnet works today.** The order page shows a QR code and the address of the studio's demo wallet. In this test version the studio funds orders from that wallet, so sending coins is optional; it just keeps the wallet topped up. Payment is not yet checked per order.
- **Other chains are not live.** SOL, ETH, Base and other deposits are shown as "coming soon". The plan is to use NEAR Intents on mainnet so customers can deposit from other chains. NEAR Intents has no testnet, so this cannot be shown here.

## Rules the studio enforces (`config.json`)
Daily spend cap 40 units, max 15 per task, minimum order 30, profit split 70% treasury / 30% contributors, a payee blocklist, and a kill switch. Each payout must pass the kill switch, the payee check (allow / warn / block), and both caps. The contract adds two limits of its own. It refuses any single payout above 0.25 NEAR, a cap fixed when it was deployed (250 units at today's unit size). It also never releases more than an order's escrow holds. With orders of 30 to 60 units, the escrow limit is the one that applies first.

## Tracks and how to verify them
| Track | Feature | Check |
|---|---|---|
| AI Security & Defense | Restricted function-call key, chain-enforced refusals, payee check, attack demo | Step 3 |
| Autonomous Business | Rules in config, kill switch, public ledger, treasury split | Steps 1 and 4 |
| AI Swarms | Sealed bids from agent sub-accounts, scripted bidders needing no LLM | `bids_revealed` rows |
| Agent Economy | Manager counters once, then accepts or walks away; every payout is a transaction | `counter`, `payout` rows |
| Privacy & Private AI | Draft written on a TEE model; attestation fetched with a fresh nonce | Step 2 |

## What is real, and what is not
- **Real, on testnet:** escrow deployment, deposits, payouts, profit split, key restriction, on-chain refusals, the private-model draft and its attestation fetch.
- **Simulated:** the customer's payment token (NEAR Intents has no testnet), the bidders' prices (scripted with random variation), and the browser console on the live page (runs locally, not on-chain).
- **Not done:** full cryptographic verification of the attestation quote; mainnet deployment; a security audit.

## Baseline vs hackathon work, and disclosures
- All code in this repository was written during the NEAR HACKATHON window. There is no pre-hackathon baseline.
- Libraries: `near-api-js` (runtime), `near-sdk-js` (build only). The live page loads fonts from Google Fonts.
- Built with the help of an AI coding assistant (Claude by Anthropic).

## Security notes
Keys are never committed. The GitHub order flow keeps the manager's keys and the NEAR AI key in GitHub secrets, and treats the issue text as data only: it is parsed, never run as code. The escrow contract has not been audited.

## Privacy of orders (test version)
The draft is written on a TEE-hosted model. That is the only part described as private. Finished drafts are stored in a private store for 30 days. The public repository keeps only a redacted ledger of each web order under `orders/` (transaction links and steps, but not the draft text). The topic you type is not kept in that redacted ledger either. There are no accounts yet: anyone who has an order's link can read that order, so do not enter anything private. Earlier test orders (before this change) still contain draft text in the repository and its history.

## License
MIT. See `LICENSE`.
