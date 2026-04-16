# x402 API Tester

An interactive terminal UI for exploring Birdeye's x402-protected DeFi API endpoints. Uses the [x402 payment protocol](https://x402.org) to automatically handle micropayments on Solana when endpoints return HTTP 402.

## What it does

- Fuzzy-search through 40+ Birdeye DeFi endpoints
- Edit request parameters interactively with sensible defaults
- Auto-handles x402 payment flow (402 → sign → retry) using your Solana wallet
- Prints the full response and a ready-to-use `curl` command with the payment signature

## Setup

```bash
npm install
cp .env.example .env
# Edit .env and set your Solana private key (base58)
```

## Usage

```bash
npm start
```

### Flow

1. **Search** — type to fuzzy-filter endpoints (e.g. `price`, `ohlcv`, `trending`)
2. **Parameters** — fill in required params; defaults are pre-filled
3. **Confirm** — send the request
4. **Results** — see the JSON response and a `curl` command to replay it

## Configuration

| Variable | Description |
|---|---|
| `PRIVATE_KEY` | Base58-encoded Solana private key used to sign x402 payments |

## Dependencies

- [`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch) — wraps `fetch` to handle 402 responses automatically
- [`@x402/svm`](https://www.npmjs.com/package/@x402/svm) — Solana payment scheme for x402
- [`@solana/kit`](https://www.npmjs.com/package/@solana/kit) — Solana keypair utilities
- [`@inquirer/*`](https://www.npmjs.com/package/@inquirer/search) — interactive CLI prompts
- [`fuse.js`](https://www.fusejs.io/) — fuzzy search

## Endpoints covered

Covers Birdeye's x402-gated DeFi APIs including: price, OHLCV, transactions, token lists, trending tokens, smart money, trader data, meme tokens, and more.
