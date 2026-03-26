import type { Express } from "express";
import { createServer, type Server } from "http";
import { createHmac } from "crypto";
import {
  getCached, setCache, clearAllCache,
  getAutoRentConfig, setAutoRentConfig,
  getRentalLogs, addRentalLog, clearRentalLogs,
  getRentedRigIds, markRigRented, getSpentTodayBtc, addSpentBtc,
  getPoolConfigs, getPoolConfig, setPoolConfig, deletePoolConfig,
  getWalletConfigs, setWalletConfig, deleteWalletConfig,
} from "./storage";
import type { CoinData, ProfitOpportunity, DashboardData, RentalLog, PoolConfig } from "@shared/schema";

const ALGO_CONFIG: Record<string, { mrrType: string; wtmDefaultHashrate: number; hashUnit: string }> = {
  "SHA-256": { mrrType: "sha256", wtmDefaultHashrate: 580, hashUnit: "th" },
  "Scrypt": { mrrType: "scrypt", wtmDefaultHashrate: 20, hashUnit: "gh" },
  "X11": { mrrType: "x11", wtmDefaultHashrate: 1770, hashUnit: "gh" },
  "Qubit": { mrrType: "qubit", wtmDefaultHashrate: 28, hashUnit: "gh" },
  "Eaglesong": { mrrType: "eaglesong", wtmDefaultHashrate: 63500, hashUnit: "gh" },
  "Equihash": { mrrType: "equihash", wtmDefaultHashrate: 840, hashUnit: "kh" },
  "kHeavyHash": { mrrType: "kheavyhash", wtmDefaultHashrate: 21, hashUnit: "th" },
  "Kadena": { mrrType: "kadena", wtmDefaultHashrate: 166, hashUnit: "th" },
  "Ethash": { mrrType: "ethash", wtmDefaultHashrate: 2.05, hashUnit: "gh" },
  "Etchash": { mrrType: "etchash", wtmDefaultHashrate: 23.4, hashUnit: "gh" },
  "RandomX": { mrrType: "randomx", wtmDefaultHashrate: 212, hashUnit: "kh" },
  "Blake3": { mrrType: "blake3", wtmDefaultHashrate: 16600, hashUnit: "gh" },
  "Handshake": { mrrType: "handshake", wtmDefaultHashrate: 30, hashUnit: "th" },
  "Sia": { mrrType: "sia", wtmDefaultHashrate: 19, hashUnit: "th" },
  "Skein": { mrrType: "skein", wtmDefaultHashrate: 14, hashUnit: "gh" },
  "Lyra2REv2": { mrrType: "lyra2rev2", wtmDefaultHashrate: 13, hashUnit: "gh" },
  "Cuckatoo31": { mrrType: "cuckatoo31", wtmDefaultHashrate: 126, hashUnit: "h" },
  "Cuckatoo32": { mrrType: "cuckatoo32", wtmDefaultHashrate: 36, hashUnit: "h" },
  "SHA512256d": { mrrType: "sha512256d", wtmDefaultHashrate: 3.2, hashUnit: "th" },
  "zkSNARK": { mrrType: "zksnark", wtmDefaultHashrate: 600, hashUnit: "mh" },
};

const POOL_FEES: Record<string, { fee: number; pool: string }> = {
  "BTC": { fee: 0, pool: "antpool.com" },
  "LTC": { fee: 0.5, pool: "ntminerpool.com" },
  "DOGE": { fee: 0.5, pool: "ntminerpool.com" },
  "DASH": { fee: 0.07, pool: "hash3030.xyz" },
  "ZEC": { fee: 0, pool: "antpool.com" },
  "ETC": { fee: 0, pool: "poolin.com" },
  "XMR": { fee: 0, pool: "hashvault.pro" },
  "KAS": { fee: 0, pool: "ntminerpool.com" },
  "BCH": { fee: 0, pool: "antpool.com" },
  "CKB": { fee: 0.5, pool: "dogpool.work" },
  "KDA": { fee: 0.5, pool: "ntminerpool.com" },
  "ALPH": { fee: 0, pool: "k1pool.com" },
  "HNS": { fee: 0.1, pool: "cedric-crispin.com" },
  "RXD": { fee: 0.5, pool: "ethcore.ru" },
  "ETHW": { fee: 0, pool: "ntminerpool.com" },
  "ALEO": { fee: 0, pool: "ntminerpool.com" },
  "ARRR": { fee: 1, pool: "zpool.ca" },
  "GRIN": { fee: 0.5, pool: "ntminerpool.com" },
  "XEC": { fee: 0.5, pool: "btccore.tech" },
  "PPC": { fee: 0.5, pool: "cyberpool.pro" },
  "DGB": { fee: 0, pool: "poolminerrpm.com" },
  "KMD": { fee: 1, pool: "mining-dutch.nl" },
  "MONA": { fee: 0, pool: "vippool.net" },
  "OCTA": { fee: 0.5, pool: "gogpool.eu" },
  "XDAG": { fee: 0.75, pool: "xdagreef.org" },
  "FB": { fee: 0.5, pool: "bitofsin.com" },
  "QKC": { fee: 1, pool: "qkcpool.com" },
  "ZEPH": { fee: 0, pool: "ntminerpool.com" },
  "CAT": { fee: 0.5, pool: "aikapool.com" },
  "PEP": { fee: 0, pool: "ntminerpool.com" },
  "DINGO": { fee: 0, pool: "ntminerpool.com" },
  "MEWC": { fee: 0.1, pool: "cedric-crispin.com" },
  "ETI": { fee: 1, pool: "gtpool.io" },
  "SCP": { fee: 0.5, pool: "luxor.tech" },
  "MWC": { fee: 0.5, pool: "grinmint.com" },
  "QUAI": { fee: 1, pool: "quai-mine.com" },
  "XTM": { fee: 0, pool: "tari.com" },
};

const HASH_MULTIPLIERS: Record<string, number> = {
  h: 1, kh: 1e3, mh: 1e6, gh: 1e9, th: 1e12, ph: 1e15,
  ksol: 1e3, msol: 1e6, gsol: 1e9,
};

function convertHashrate(value: number, fromUnit: string, toUnit: string): number {
  const from = HASH_MULTIPLIERS[fromUnit.toLowerCase()] || 1;
  const to = HASH_MULTIPLIERS[toUnit.toLowerCase()] || 1;
  return (value * from) / to;
}

function mrrHeaders(apiKey: string, apiSecret: string, endpoint: string) {
  const nonce = Date.now().toString();
  const sign = createHmac("sha1", apiSecret)
    .update(apiKey + nonce + endpoint)
    .digest("hex");
  return {
    "x-api-key": apiKey,
    "x-api-sign": sign,
    "x-api-nonce": nonce,
    "Content-Type": "application/json",
  };
}

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWtmData() {
  const cached = getCached("wtm");
  if (cached) return cached;
  const resp = await fetchWithTimeout(
    "https://whattomine.com/asic.json",
    { headers: { "User-Agent": "Mozilla/5.0 (compatible; RigProfit/1.0)" } }
  );
  if (!resp.ok) throw new Error(`WhatToMine returned ${resp.status}`);
  const data = await resp.json();
  setCache("wtm", data);
  return data;
}

async function fetchBtcPrice() {
  const cached = getCached("btcprice");
  if (cached) return cached;
  const resp = await fetchWithTimeout(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
  );
  if (!resp.ok) throw new Error(`CoinGecko returned ${resp.status}`);
  const data = await resp.json();
  const price = data.bitcoin.usd;
  setCache("btcprice", price);
  return price;
}

function getPoolFee(coinTag: string): { fee: number; name: string } | null {
  const data = POOL_FEES[coinTag];
  if (!data) return null;
  return { fee: data.fee, name: data.pool };
}

async function fetchMrrRigs(algoType: string, apiKey: string, apiSecret: string): Promise<any[]> {
  const cacheKey = `mrr_${algoType}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const endpoint = `/rig?type=${algoType}&showoff=no&limit=100`;
  const url = `https://www.miningrigrentals.com/api/v2${endpoint}`;
  const headers = mrrHeaders(apiKey, apiSecret, endpoint);

  const resp = await fetchWithTimeout(url, { headers });
  if (!resp.ok) throw new Error(`MRR returned ${resp.status}`);
  const data = await resp.json();
  if (!data.success) throw new Error(data.data?.message || "MRR API error");

  const rigs = data.data?.records || [];
  setCache(cacheKey, rigs);
  return rigs;
}

async function mrrRequest(
  method: string,
  endpoint: string,
  body: any,
  apiKey: string,
  apiSecret: string
): Promise<any> {
  const url = `https://www.miningrigrentals.com/api/v2${endpoint}`;
  const baseHeaders = mrrHeaders(apiKey, apiSecret, endpoint);
  const headers: Record<string, string> = { ...baseHeaders };
  if (body) headers["Content-Type"] = "application/json";
  const resp = await fetchWithTimeout(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await resp.json();
  return data;
}

async function createMrrPool(
  algo: string,
  host: string,
  port: string,
  worker: string,
  password: string,
  name: string,
  apiKey: string,
  apiSecret: string
): Promise<{ success: boolean; poolId?: number; error?: string }> {
  const endpoint = `/account/pool`;
  const body = { type: algo, host, port, user: worker, pass: password || "x", name };
  const data = await mrrRequest("PUT", endpoint, body, apiKey, apiSecret);
  if (data.success) {
    return { success: true, poolId: parseInt(data.data?.id) };
  }
  return { success: false, error: data.data?.message || "Pool creation failed" };
}

async function createMrrProfile(
  algo: string,
  name: string,
  apiKey: string,
  apiSecret: string
): Promise<{ success: boolean; profileId?: number; error?: string }> {
  const endpoint = `/account/profile`;
  const body = { name, algo };
  const data = await mrrRequest("PUT", endpoint, body, apiKey, apiSecret);
  if (data.success) {
    return { success: true, profileId: parseInt(data.data?.id) };
  }
  return { success: false, error: data.data?.message || "Profile creation failed" };
}

async function addPoolToMrrProfile(
  profileId: number,
  poolId: number,
  apiKey: string,
  apiSecret: string
): Promise<{ success: boolean; error?: string }> {
  const endpoint = `/account/profile/${profileId}/0`;
  const body = { poolid: poolId };
  const data = await mrrRequest("PUT", endpoint, body, apiKey, apiSecret);
  return { success: !!data.success, error: data.data?.message };
}

async function fetchMrrPoolsAndProfiles(
  apiKey: string,
  apiSecret: string
): Promise<{ pools: any[]; profiles: any[] }> {
  const [poolsData, profilesData] = await Promise.allSettled([
    mrrRequest("GET", `/account/pool`, null, apiKey, apiSecret),
    mrrRequest("GET", `/account/profile`, null, apiKey, apiSecret),
  ]);
  return {
    pools: poolsData.status === "fulfilled" && poolsData.value?.success ? (poolsData.value.data || []) : [],
    profiles: profilesData.status === "fulfilled" && profilesData.value?.success ? (profilesData.value.data || []) : [],
  };
}

async function createMrrRental(
  rigId: number,
  length: number,
  poolProfileId: string,
  apiKey: string,
  apiSecret: string
): Promise<{ success: boolean; rentalId?: number; error?: string }> {
  const endpoint = `/rental`;
  const url = `https://www.miningrigrentals.com/api/v2${endpoint}`;
  const headers = mrrHeaders(apiKey, apiSecret, endpoint);

  const body = JSON.stringify({ rig: rigId, length, profileid: poolProfileId });

  try {
    const resp = await fetchWithTimeout(url, { method: "PUT", headers, body });
    const data = await resp.json();
    if (data.success) {
      const rentalId = data.data?.id || data.data?.[0]?.id;
      return { success: true, rentalId };
    }
    return { success: false, error: data.data?.message || "Rental failed" };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

function extractCoin(name: string, raw: any, poolData: { fee: number; name: string } | null): CoinData {
  return {
    id: raw.id,
    name,
    tag: raw.tag,
    algorithm: raw.algorithm,
    blockTime: raw.block_time,
    blockReward: raw.block_reward,
    difficulty: raw.difficulty,
    nethash: raw.nethash,
    exchangeRate: parseFloat(raw.exchange_rate) || 0,
    exchangeRate24: parseFloat(raw.exchange_rate24) || 0,
    marketCap: raw.market_cap || "$0",
    estimatedRewards: raw.estimated_rewards,
    btcRevenue: raw.btc_revenue,
    btcRevenue24: raw.btc_revenue24,
    profitability: raw.profitability,
    profitability24: raw.profitability24,
    lagging: raw.lagging,
    timestamp: raw.timestamp,
    poolFeePercent: poolData?.fee ?? null,
    poolName: poolData?.name ?? null,
  };
}

function processRigsForCoin(
  coin: CoinData,
  rigs: any[],
  config: { wtmDefaultHashrate: number; hashUnit: string },
  btcPrice: number
): ProfitOpportunity[] {
  const results: ProfitOpportunity[] = [];
  const revenuePerUnit = parseFloat(coin.btcRevenue) / config.wtmDefaultHashrate;
  const feeMultiplier = coin.poolFeePercent !== null ? (1 - coin.poolFeePercent / 100) : 1;

  for (const rig of rigs) {
    if (rig.status?.status !== "available" || !rig.status?.online) continue;

    const rigHash = parseFloat(rig.hashrate?.advertised?.hash || "0");
    const rigHashType = (rig.hashrate?.advertised?.type || config.hashUnit).toLowerCase();
    const rigPricePerUnit = parseFloat(rig.price?.BTC?.price || "0");
    const rigPriceType = (rig.price?.type || rigHashType).toLowerCase();

    if (rigHash <= 0 || rigPricePerUnit <= 0) continue;

    const rigInWtmUnits = convertHashrate(rigHash, rigHashType, config.hashUnit);
    const grossRevBtc = revenuePerUnit * rigInWtmUnits;
    const totalRevBtc = grossRevBtc * feeMultiplier;

    const rigInPriceUnits = convertHashrate(rigHash, rigHashType, rigPriceType);
    const totalCostBtc = rigPricePerUnit * rigInPriceUnits;

    const profitBtc = totalRevBtc - totalCostBtc;
    const margin = totalRevBtc > 0 ? (profitBtc / totalRevBtc) * 100 : -100;

    results.push({
      coinName: coin.name,
      coinTag: coin.tag,
      algorithm: coin.algorithm,
      rigId: rig.id,
      rigName: rig.name || `Rig #${rig.id}`,
      rigHashrate: rigHash,
      rigHashrateType: rigHashType.toUpperCase(),
      rentalCostBtcPerDay: totalCostBtc,
      rentalCostUsdPerDay: totalCostBtc * btcPrice,
      miningRevenueBtcPerDay: totalRevBtc,
      miningRevenueUsdPerDay: totalRevBtc * btcPrice,
      profitBtcPerDay: profitBtc,
      profitUsdPerDay: profitBtc * btcPrice,
      profitMarginPercent: margin,
      poolFeePercent: coin.poolFeePercent,
      poolName: coin.poolName,
      minHours: rig.minhours || 3,
      mrrUrl: `https://www.miningrigrentals.com/rigs/${rig.id}`,
    });
  }

  return results;
}

async function getDashboardOpportunities(apiKey: string, apiSecret: string) {
  const [wtmData, btcPrice] = await Promise.all([fetchWtmData(), fetchBtcPrice()]);

  const coins: CoinData[] = [];
  if (wtmData?.coins) {
    for (const [name, raw] of Object.entries(wtmData.coins)) {
      const tag = (raw as any).tag;
      if (tag === "NICEHASH") continue;
      const poolData = getPoolFee(tag);
      coins.push(extractCoin(name, raw, poolData));
    }
  }

  const opportunities: ProfitOpportunity[] = [];
  const uniqueAlgos = Array.from(new Set(coins.map((c) => c.algorithm)));
  const rigsByAlgo = new Map<string, any[]>();

  await Promise.allSettled(
    uniqueAlgos
      .filter((algo) => ALGO_CONFIG[algo])
      .map(async (algo) => {
        const config = ALGO_CONFIG[algo];
        try {
          const rigs = await fetchMrrRigs(config.mrrType, apiKey, apiSecret);
          rigsByAlgo.set(algo, rigs);
        } catch {}
      })
  );

  for (const coin of coins) {
    const config = ALGO_CONFIG[coin.algorithm];
    if (!config) continue;
    const rigs = rigsByAlgo.get(coin.algorithm);
    if (!rigs) continue;
    opportunities.push(...processRigsForCoin(coin, rigs, config, btcPrice));
  }

  opportunities.sort((a, b) => b.profitMarginPercent - a.profitMarginPercent);
  return opportunities;
}

let autoRentTimer: ReturnType<typeof setTimeout> | null = null;
let nextRunAt: Date | null = null;
const AUTO_RENT_INTERVAL_MS = 5 * 60 * 1000;

async function runAutoRent(source: "auto" | "manual" = "auto") {
  const config = getAutoRentConfig();
  if (!config.enabled && source === "auto") return;
  if (!config.poolProfileId) return;

  const apiKey = process.env.MRR_API_KEY;
  const apiSecret = process.env.MRR_API_SECRET;
  if (!apiKey || !apiSecret) return;

  let opportunities: ProfitOpportunity[];
  try {
    opportunities = await getDashboardOpportunities(apiKey, apiSecret);
  } catch {
    return;
  }

  const rentedRigIds = new Set(getRentedRigIds());
  const spentToday = getSpentTodayBtc();
  const remainingBudget = config.maxDailySpendBtc - spentToday;
  if (remainingBudget <= 0) return;

  const candidates = opportunities.filter(
    (o) =>
      o.profitMarginPercent >= config.marginThreshold &&
      !rentedRigIds.has(o.rigId) &&
      o.minHours <= config.rentalHours
  );

  let rented = 0;
  let budgetRemaining = remainingBudget;

  for (const opp of candidates) {
    if (rented >= config.maxRigsPerRun) break;

    const rentalCostBtc = (opp.rentalCostBtcPerDay / 24) * config.rentalHours;
    if (rentalCostBtc > budgetRemaining) continue;

    const result = await createMrrRental(
      opp.rigId,
      config.rentalHours,
      config.poolProfileId,
      apiKey,
      apiSecret
    );

    const log: RentalLog = {
      id: `${Date.now()}-${opp.rigId}`,
      timestamp: new Date().toISOString(),
      rigId: opp.rigId,
      rigName: opp.rigName,
      coinTag: opp.coinTag,
      algorithm: opp.algorithm,
      marginPercent: opp.profitMarginPercent,
      rentalHours: config.rentalHours,
      costBtc: rentalCostBtc,
      success: result.success,
      mrrRentalId: result.rentalId,
      error: result.error,
      source,
    };
    addRentalLog(log);

    if (result.success) {
      markRigRented(opp.rigId);
      addSpentBtc(rentalCostBtc);
      budgetRemaining -= rentalCostBtc;
      rented++;
    }
  }
}

function scheduleNextAutoRent() {
  if (autoRentTimer) clearTimeout(autoRentTimer);
  nextRunAt = new Date(Date.now() + AUTO_RENT_INTERVAL_MS);
  autoRentTimer = setTimeout(async () => {
    const config = getAutoRentConfig();
    if (config.enabled) {
      await runAutoRent("auto");
    }
    scheduleNextAutoRent();
  }, AUTO_RENT_INTERVAL_MS);
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  scheduleNextAutoRent();

  app.get("/api/dashboard", async (_req, res) => {
    try {
      const cachedResult = getCached("dashboard_result");
      if (cachedResult) return res.json(cachedResult);

      const errors: string[] = [];
      const mrrApiKey = process.env.MRR_API_KEY;
      const mrrApiSecret = process.env.MRR_API_SECRET;
      const mrrConfigured = !!(mrrApiKey && mrrApiSecret);

      let wtmData: any = null;
      try {
        wtmData = await fetchWtmData();
      } catch (e: any) {
        errors.push(`WhatToMine: ${e.message}`);
      }

      let btcPrice = 0;
      try {
        btcPrice = await fetchBtcPrice();
      } catch (e: any) {
        errors.push(`BTC Price: ${e.message}`);
        if (wtmData?.coins?.Bitcoin) {
          btcPrice = parseFloat(wtmData.coins.Bitcoin.exchange_rate) || 0;
        }
      }

      const coins: CoinData[] = [];
      if (wtmData?.coins) {
        for (const [name, raw] of Object.entries(wtmData.coins)) {
          const tag = (raw as any).tag;
          if (tag === "NICEHASH") continue;
          const poolData = getPoolFee(tag);
          coins.push(extractCoin(name, raw, poolData));
        }
      }

      const opportunities: ProfitOpportunity[] = [];

      if (mrrConfigured) {
        const uniqueAlgos = Array.from(new Set(coins.map((c) => c.algorithm)));
        const rigsByAlgo = new Map<string, any[]>();

        await Promise.allSettled(
          uniqueAlgos
            .filter((algo) => ALGO_CONFIG[algo])
            .map(async (algo) => {
              const config = ALGO_CONFIG[algo];
              try {
                const rigs = await fetchMrrRigs(config.mrrType, mrrApiKey!, mrrApiSecret!);
                rigsByAlgo.set(algo, rigs);
              } catch (e: any) {
                errors.push(`MRR ${config.mrrType}: ${e.message}`);
              }
            })
        );

        for (const coin of coins) {
          const config = ALGO_CONFIG[coin.algorithm];
          if (!config) continue;
          const rigs = rigsByAlgo.get(coin.algorithm);
          if (!rigs) continue;
          opportunities.push(...processRigsForCoin(coin, rigs, config, btcPrice));
        }
      }

      opportunities.sort((a, b) => b.profitMarginPercent - a.profitMarginPercent);

      const result: DashboardData = {
        opportunities,
        coins,
        algorithms: Array.from(new Set(coins.map((c) => c.algorithm))).sort(),
        profitableCount: opportunities.filter((o) => o.profitUsdPerDay > 0).length,
        totalCount: opportunities.length,
        bestMargin: opportunities.length
          ? Math.max(...opportunities.map((o) => o.profitMarginPercent))
          : 0,
        btcPriceUsd: btcPrice,
        lastUpdated: new Date().toISOString(),
        mrrConfigured,
        errors,
      };

      setCache("dashboard_result", result);
      res.json(result);
    } catch (error: any) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/refresh", async (_req, res) => {
    clearAllCache();
    res.json({ success: true });
  });

  app.get("/api/autorent/status", (_req, res) => {
    const config = getAutoRentConfig();
    const logs = getRentalLogs();
    const spentTodayBtc = getSpentTodayBtc();
    const rentedRigIds = getRentedRigIds();
    res.json({
      config,
      logs,
      nextRunAt: nextRunAt?.toISOString() || null,
      spentTodayBtc,
      rentedRigIds,
    });
  });

  app.put("/api/autorent/config", (req, res) => {
    const {
      enabled, marginThreshold, rentalHours,
      poolProfileId, maxDailySpendBtc, maxRigsPerRun,
    } = req.body;

    const update: Record<string, any> = {};
    if (typeof enabled === "boolean") update.enabled = enabled;
    if (typeof marginThreshold === "number" && marginThreshold >= 0) update.marginThreshold = marginThreshold;
    if (typeof rentalHours === "number" && rentalHours >= 1) update.rentalHours = rentalHours;
    if (typeof poolProfileId === "string") update.poolProfileId = poolProfileId;
    if (typeof maxDailySpendBtc === "number" && maxDailySpendBtc > 0) update.maxDailySpendBtc = maxDailySpendBtc;
    if (typeof maxRigsPerRun === "number" && maxRigsPerRun >= 1) update.maxRigsPerRun = maxRigsPerRun;

    const newConfig = setAutoRentConfig(update);
    res.json({ success: true, config: newConfig });
  });

  app.post("/api/autorent/run", async (_req, res) => {
    const apiKey = process.env.MRR_API_KEY;
    const apiSecret = process.env.MRR_API_SECRET;
    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: "MRR API credentials not configured" });
    }
    const config = getAutoRentConfig();
    if (!config.poolProfileId) {
      return res.status(400).json({ error: "Pool profile ID not set" });
    }
    try {
      await runAutoRent("manual");
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/autorent/clear-logs", (_req, res) => {
    clearRentalLogs();
    res.json({ success: true });
  });

  app.get("/api/pools", async (_req, res) => {
    const apiKey = process.env.MRR_API_KEY;
    const apiSecret = process.env.MRR_API_SECRET;
    let mrrProfiles: any[] = [];
    let mrrPools: any[] = [];
    if (apiKey && apiSecret) {
      try {
        const result = await fetchMrrPoolsAndProfiles(apiKey, apiSecret);
        mrrProfiles = result.profiles;
        mrrPools = result.pools;
      } catch {}
    }
    res.json({
      pools: getPoolConfigs(),
      wallets: getWalletConfigs(),
      mrrProfiles,
      mrrPools,
    });
  });

  app.put("/api/pools/config/:coinTag/:algo", (req, res) => {
    const { coinTag, algo } = req.params;
    const { coinName, host, port, worker, password } = req.body;
    const existing = getPoolConfig(coinTag, algo) || { coinTag, coinName: coinName || coinTag, algo, host: "", port: "", worker: "", password: "" };
    setPoolConfig({
      ...existing,
      coinTag,
      coinName: coinName || existing.coinName,
      algo,
      host: host ?? existing.host,
      port: port ?? existing.port,
      worker: worker ?? existing.worker,
      password: password ?? existing.password,
    });
    res.json({ success: true, pool: getPoolConfig(coinTag, algo) });
  });

  app.delete("/api/pools/config/:coinTag/:algo", (req, res) => {
    const { coinTag, algo } = req.params;
    deletePoolConfig(coinTag, algo);
    res.json({ success: true });
  });

  app.put("/api/pools/wallet/:coinTag", (req, res) => {
    const { coinTag } = req.params;
    const { walletAddress, notes } = req.body;
    setWalletConfig({ coinTag, walletAddress: walletAddress || "", notes: notes || "" });
    res.json({ success: true });
  });

  app.delete("/api/pools/wallet/:coinTag", (req, res) => {
    deleteWalletConfig(req.params.coinTag);
    res.json({ success: true });
  });

  app.post("/api/pools/sync/:coinTag/:algo", async (req, res) => {
    const { coinTag, algo } = req.params;
    const apiKey = process.env.MRR_API_KEY;
    const apiSecret = process.env.MRR_API_SECRET;
    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: "MRR API credentials not configured" });
    }
    const pool = getPoolConfig(coinTag, algo);
    if (!pool || !pool.host || !pool.port || !pool.worker) {
      return res.status(400).json({ error: "Pool config incomplete (host, port, worker required)" });
    }
    const mrrAlgoType = algo.toLowerCase().replace(/[^a-z0-9]/g, "");
    const profileName = `RigProfit-${pool.coinTag}-${algo}`;
    try {
      const poolResult = await createMrrPool(
        mrrAlgoType, pool.host, pool.port, pool.worker, pool.password,
        profileName, apiKey, apiSecret
      );
      if (!poolResult.success) {
        return res.status(400).json({ error: poolResult.error });
      }
      const profileResult = await createMrrProfile(
        mrrAlgoType, profileName, apiKey, apiSecret
      );
      if (!profileResult.success) {
        return res.status(400).json({ error: profileResult.error });
      }
      await addPoolToMrrProfile(profileResult.profileId!, poolResult.poolId!, apiKey, apiSecret);
      const updated: PoolConfig = {
        ...pool,
        mrrPoolId: poolResult.poolId,
        mrrProfileId: profileResult.profileId,
        lastSynced: new Date().toISOString(),
      };
      setPoolConfig(updated);
      res.json({ success: true, pool: updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return httpServer;
}
