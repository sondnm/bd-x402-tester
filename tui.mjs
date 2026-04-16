import "dotenv/config";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { ExactSvmScheme, toClientSvmSigner } from "@x402/svm";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import search from "@inquirer/search";
import input from "@inquirer/input";
import confirm from "@inquirer/confirm";
import Fuse from "fuse.js";
import { base58 } from "@scure/base";

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_URL = "http://public-api.birdeye.so";
const SEPARATOR = "━".repeat(50);

// ─── Endpoint definitions ────────────────────────────────────────────────────

const ENDPOINTS = [
  { method: "GET", path: "/x402/defi/price", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "check_liquidity", in: "query", required: false },
    { name: "include_liquidity", in: "query", required: false },
    { name: "address", in: "query", required: true },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/history_price", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "address_type", in: "query", required: true },
    { name: "type", in: "query", required: true },
    { name: "time_from", in: "query", required: true },
    { name: "time_to", in: "query", required: true },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/historical_price_unix", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "unixtime", in: "query", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/txs/token", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
    { name: "tx_type", in: "query", required: false },
    { name: "sort_type", in: "query", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/txs/pair", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
    { name: "tx_type", in: "query", required: false },
    { name: "sort_type", in: "query", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/txs/token/seek_by_time", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
    { name: "tx_type", in: "query", required: false },
    { name: "before_time", in: "query", required: false },
    { name: "after_time", in: "query", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/txs/pair/seek_by_time", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
    { name: "tx_type", in: "query", required: false },
    { name: "before_time", in: "query", required: false },
    { name: "after_time", in: "query", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/ohlcv", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "type", in: "query", required: true },
    { name: "currency", in: "query", required: false },
    { name: "time_from", in: "query", required: true },
    { name: "time_to", in: "query", required: true },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/ohlcv/pair", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "type", in: "query", required: true },
    { name: "time_from", in: "query", required: true },
    { name: "time_to", in: "query", required: true },
  ]},
  { method: "GET", path: "/x402/defi/ohlcv/base_quote", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "base_address", in: "query", required: true },
    { name: "quote_address", in: "query", required: true },
    { name: "type", in: "query", required: true },
    { name: "time_from", in: "query", required: true },
    { name: "time_to", in: "query", required: true },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/tokenlist", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "sort_by", in: "query", required: false },
    { name: "sort_type", in: "query", required: false },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
    { name: "min_liquidity", in: "query", required: false },
    { name: "max_liquidity", in: "query", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/token_trending", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "sort_by", in: "query", required: false },
    { name: "interval", in: "query", required: false },
    { name: "sort_type", in: "query", required: false },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/token_creation_info", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
  ]},
  { method: "GET", path: "/x402/defi/token_security", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
  ]},
  { method: "GET", path: "/x402/defi/token_overview", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "frames", in: "query", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/price_volume/single", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "type", in: "query", required: true },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v2/tokens/new_listing", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "time_to", in: "query", required: false },
    { name: "limit", in: "query", required: false },
    { name: "meme_platform_enabled", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v2/tokens/top_traders", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "time_frame", in: "query", required: true },
    { name: "sort_type", in: "query", required: false },
    { name: "sort_by", in: "query", required: false },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v2/markets", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "time_frame", in: "query", required: true },
    { name: "sort_type", in: "query", required: false },
    { name: "sort_by", in: "query", required: false },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v3/token/meta-data/single", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
  ]},
  { method: "GET", path: "/x402/defi/v3/pair/overview/single", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v3/token/market-data", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v3/token/trade-data/single", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "frames", in: "query", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v3/token/holder", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v3/search", params: [
    { name: "chain", in: "query", required: false },
    { name: "keyword", in: "query", required: false },
    { name: "target", in: "query", required: false },
    { name: "search_mode", in: "query", required: false },
    { name: "search_by", in: "query", required: false },
    { name: "sort_by", in: "query", required: false },
    { name: "sort_type", in: "query", required: false },
    { name: "verify_token", in: "query", required: false },
    { name: "markets", in: "query", required: false },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v3/token/mint-burn-txs", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "sort_by", in: "query", required: false },
    { name: "sort_type", in: "query", required: false },
    { name: "type", in: "query", required: true },
    { name: "after_time", in: "query", required: false },
    { name: "before_time", in: "query", required: false },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v3/token/list", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "sort_by", in: "query", required: false },
    { name: "sort_type", in: "query", required: false },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v3/all-time/trades/single", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "time_frame", in: "query", required: true },
    { name: "address", in: "query", required: true },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v3/txs/recent", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
    { name: "tx_type", in: "query", required: false },
    { name: "owner", in: "query", required: false },
    { name: "before_time", in: "query", required: false },
    { name: "after_time", in: "query", required: false },
    { name: "before_block_number", in: "query", required: false },
    { name: "after_block_number", in: "query", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v3/txs", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
    { name: "sort_by", in: "query", required: false },
    { name: "sort_type", in: "query", required: false },
    { name: "tx_type", in: "query", required: false },
    { name: "source", in: "query", required: false },
    { name: "owner", in: "query", required: false },
    { name: "pool_id", in: "query", required: false },
    { name: "before_time", in: "query", required: false },
    { name: "after_time", in: "query", required: false },
    { name: "before_block_number", in: "query", required: false },
    { name: "after_block_number", in: "query", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v3/token/txs", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
    { name: "sort_by", in: "query", required: false },
    { name: "sort_type", in: "query", required: false },
    { name: "tx_type", in: "query", required: false },
    { name: "source", in: "query", required: false },
    { name: "owner", in: "query", required: false },
    { name: "pool_id", in: "query", required: false },
    { name: "before_time", in: "query", required: false },
    { name: "after_time", in: "query", required: false },
    { name: "before_block_number", in: "query", required: false },
    { name: "after_block_number", in: "query", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v3/txs/latest-block", params: [
    { name: "x-chain", in: "header", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v3/token/exit-liquidity", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
  ]},
  { method: "GET", path: "/x402/defi/v3/token/meme/list", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "sort_by", in: "query", required: false },
    { name: "sort_type", in: "query", required: false },
    { name: "source", in: "query", required: false },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v3/token/meme/detail/single", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
  ]},
  { method: "GET", path: "/x402/defi/v3/token/txs-by-volume", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "token_address", in: "query", required: true },
    { name: "volume_type", in: "query", required: true },
    { name: "sort_type", in: "query", required: false },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v3/ohlcv", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "type", in: "query", required: true },
    { name: "currency", in: "query", required: false },
    { name: "time_from", in: "query", required: true },
    { name: "time_to", in: "query", required: true },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/defi/v3/ohlcv/pair", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "type", in: "query", required: true },
    { name: "time_from", in: "query", required: true },
    { name: "time_to", in: "query", required: true },
  ]},
  { method: "GET", path: "/x402/defi/v3/price/stats/single", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "list_timeframe", in: "query", required: false },
    { name: "address", in: "query", required: true },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/trader/gainers-losers", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "type", in: "query", required: true },
    { name: "sort_by", in: "query", required: false },
    { name: "sort_type", in: "query", required: false },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/trader/txs/seek_by_time", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "address", in: "query", required: true },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
    { name: "tx_type", in: "query", required: false },
    { name: "before_time", in: "query", required: false },
    { name: "after_time", in: "query", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
  ]},
  { method: "GET", path: "/x402/smart-money/v1/token/list", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "interval", in: "query", required: false },
    { name: "trader_style", in: "query", required: false },
    { name: "sort_by", in: "query", required: false },
    { name: "sort_type", in: "query", required: false },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
  ]},
  { method: "POST", path: "/x402/token/v1/holder/batch", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "ui_amount_mode", in: "query", required: false },
    { name: "body", in: "body", required: true },
  ]},
  { method: "POST", path: "/x402/token/v1/transfer", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "body", in: "body", required: true },
  ]},
  { method: "POST", path: "/x402/token/v1/transfer/total", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "body", in: "body", required: true },
  ]},
  { method: "GET", path: "/x402/holder/v1/distribution", params: [
    { name: "x-chain", in: "header", required: false },
    { name: "token_address", in: "query", required: true },
    { name: "address_type", in: "query", required: false },
    { name: "mode", in: "query", required: false },
    { name: "offset", in: "query", required: false },
    { name: "limit", in: "query", required: false },
  ]},
];

// ─── Parameter defaults ──────────────────────────────────────────────────────

function getParamDefaults() {
  const now = Math.floor(Date.now() / 1000);
  return {
    "x-chain": "solana",
    address: "So11111111111111111111111111111111111111112",
    base_address: "So11111111111111111111111111111111111111112",
    quote_address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    token_address: "So11111111111111111111111111111111111111112",
    offset: "0",
    limit: "20",
    type: "1d",
    currency: "usd",
    time_from: String(now - 86400),
    time_to: String(now),
    tx_type: "swap",
    time_frame: "24h",
    ui_amount_mode: "both",
    interval: "1d",
    keyword: "sol",
    address_type: "token",
    volume_type: "buy",
    chain: "solana",
    body: '{}',
  };
}

// ─── Fuzzy search setup ──────────────────────────────────────────────────────

const endpointEntries = ENDPOINTS.map((ep) => ({
  ...ep,
  label: `${ep.method.padEnd(5)} ${ep.path}`,
}));

const fuse = new Fuse(endpointEntries, {
  keys: ["label", "path"],
  threshold: 0.4,
  includeScore: true,
});

// ─── Wallet + x402 fetch setup ───────────────────────────────────────────────

function generatePaymentId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "pay_";
  for (let i = 0; i < 20; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// Shared state: captures the last outgoing PAYMENT-SIGNATURE for curl logging
const lastPayment = { signature: null, url: null, headers: null };

// Intercepts outgoing requests to inject payment-identifier and capture the signature
function withPaymentIdentifier(baseFetch) {
  return async (input, init) => {
    const req = new Request(input, init);
    const sig = req.headers.get("PAYMENT-SIGNATURE");
    if (sig) {
      try {
        const decoded = JSON.parse(Buffer.from(sig, "base64").toString("utf-8"));
        const paymentId = generatePaymentId();
        decoded.extensions = {
          ...(decoded.extensions || {}),
          "payment-identifier": { info: { id: paymentId } },
        };
        const patched = Buffer.from(JSON.stringify(decoded)).toString("base64");
        req.headers.set("PAYMENT-SIGNATURE", patched);
        // Capture for curl logging
        lastPayment.signature = patched;
        lastPayment.url = req.url;
        const hdrs = {};
        for (const [k, v] of req.headers.entries()) hdrs[k] = v;
        lastPayment.headers = hdrs;
        console.log(`  [x402] Payment ID: ${paymentId}`);
      } catch {
        // leave header as-is
      }
    }
    return baseFetch(req);
  };
}

async function createPaidFetch() {
  const privateKeyStr = process.env.PRIVATE_KEY;
  if (!privateKeyStr) {
    throw new Error("PRIVATE_KEY not set in .env file");
  }
  const keyBytes = base58.decode(privateKeyStr);
  const keypair = await createKeyPairSignerFromBytes(keyBytes);
  const signer = toClientSvmSigner(keypair);

  const client = new x402Client().register("solana:*", new ExactSvmScheme(signer));
  const innerFetch = withPaymentIdentifier(fetch);
  const paidFetch = wrapFetchWithPayment(innerFetch, client);

  return { paidFetch, address: keypair.address };
}

// ─── HTTP request helpers ─────────────────────────────────────────────────────

function buildUrlAndInit(endpoint, paramValues) {
  const headers = {};
  const queryParams = new URLSearchParams();
  let bodyContent = null;

  for (const param of endpoint.params) {
    const value = paramValues[param.name];
    if (value === undefined || value === "") continue;
    if (param.in === "header") {
      headers[param.name] = value;
    } else if (param.in === "query") {
      queryParams.set(param.name, value);
    } else if (param.in === "body") {
      bodyContent = value;
    }
  }

  const queryString = queryParams.toString();
  const url = `${BASE_URL}${endpoint.path}${queryString ? "?" + queryString : ""}`;
  const init = { method: endpoint.method, headers };
  if (bodyContent && endpoint.method === "POST") {
    init.body = bodyContent;
    headers["Content-Type"] = "application/json";
  }
  return { url, init, body: bodyContent };
}

function buildCurlCommand(method, url, headers, body, paymentSig) {
  let curl = `curl -X ${method} '${url}'`;
  for (const [key, value] of Object.entries(headers)) {
    const lk = key.toLowerCase();
    if (lk === "payment-signature") continue;
    curl += ` \\\n  -H '${key}: ${value}'`;
  }
  if (paymentSig) {
    curl += ` \\\n  -H 'PAYMENT-SIGNATURE: ${paymentSig}'`;
  }
  if (body && method === "POST") {
    curl += ` \\\n  -d '${body}'`;
  }
  return curl;
}

// ─── Param editing ───────────────────────────────────────────────────────────

async function editParams(endpoint) {
  const defaults = getParamDefaults();
  const paramValues = {};

  console.log(`\nParameters for ${endpoint.method} ${endpoint.path}:`);
  console.log("─".repeat(50));

  for (const param of endpoint.params) {
    const defaultVal = defaults[param.name] || "";
    const reqTag = param.required ? " (required)" : "";
    const locTag = param.in === "header" ? " [header]" : param.in === "body" ? " [body]" : "";

    const value = await input({
      message: `${param.name}${reqTag}${locTag}`,
      default: String(defaultVal),
    });

    if (value !== "") {
      paramValues[param.name] = value;
    }
  }

  return paramValues;
}

// ─── Main loop ───────────────────────────────────────────────────────────────

async function main() {
  console.log("\n  x402 API Explorer  ");
  console.log("  Birdeye x402-protected endpoints\n");

  let paidFetch;
  try {
    const wallet = await createPaidFetch();
    paidFetch = wallet.paidFetch;
    console.log(`  Wallet: ${wallet.address}`);
  } catch (err) {
    console.log(`  Warning: ${err.message}`);
    console.log("  Requests will be made without payment signing.\n");
    paidFetch = fetch;
  }

  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Endpoints: ${ENDPOINTS.length}\n`);

  let running = true;

  while (running) {
    // Step 1: Fuzzy search
    const selected = await search({
      message: "Search endpoint (type to filter):",
      source: (term) => {
        if (!term) {
          return endpointEntries.map((ep) => ({ name: ep.label, value: ep }));
        }
        return fuse.search(term).map((r) => ({ name: r.item.label, value: r.item }));
      },
    });

    // Step 2: Edit parameters
    const paramValues = await editParams(selected);

    // Step 3: Confirm
    const shouldSend = await confirm({
      message: `Send ${selected.method} ${selected.path}?`,
      default: true,
    });
    if (!shouldSend) continue;

    // Step 4: Make request (paidFetch auto-handles 402 → sign → retry)
    console.log(`\n${SEPARATOR}`);
    console.log(`REQUEST: ${selected.method} ${selected.path}`);

    try {
      const { url, init, body } = buildUrlAndInit(selected, paramValues);
      console.log(`URL: ${url}`);
      console.log(SEPARATOR);

      // Reset captured payment state before each request
      lastPayment.signature = null;
      lastPayment.url = null;
      lastPayment.headers = null;

      const response = await paidFetch(url, init);

      console.log(`RESPONSE (${response.status}):`);
      const responseText = await response.text();
      try {
        console.log(JSON.stringify(JSON.parse(responseText), null, 2));
      } catch {
        console.log(responseText);
      }

      if (response.status === 402) {
        console.log("\n[Still 402 after payment attempt - check wallet balance / RPC]");
        console.log("Response headers:");
        for (const [k, v] of response.headers.entries()) {
          console.log(`  ${k}: ${k.toLowerCase().includes("payment") ? v : v.substring(0, 100)}`);
        }
      }

      console.log(SEPARATOR);
      console.log("CURL (copy to retry):");
      // Use captured outgoing headers/sig if payment was made, else use original init
      const curlHeaders = lastPayment.headers || init.headers;
      const curlUrl = lastPayment.url || url;
      const curlSig = lastPayment.signature;
      console.log(buildCurlCommand(selected.method, curlUrl, curlHeaders, body, curlSig));
      console.log(SEPARATOR);

    } catch (err) {
      console.log(`Error: ${err.message}`);
      if (err.stack) console.log(err.stack);
      console.log(SEPARATOR);
    }

    // Step 5: Continue?
    running = await confirm({ message: "Run another request?", default: true });
  }

  console.log("\nGoodbye!\n");
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
