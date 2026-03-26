import type { AutoRentConfig, RentalLog, PoolConfig, WalletConfig } from "@shared/schema";

const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export function getCached(key: string): any | null {
  const entry = apiCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  return null;
}

export function setCache(key: string, data: any): void {
  apiCache.set(key, { data, timestamp: Date.now() });
}

export function clearAllCache(): void {
  apiCache.clear();
}

let autoRentConfig: AutoRentConfig = {
  enabled: false,
  marginThreshold: 10,
  rentalHours: 24,
  poolProfileId: "",
  maxDailySpendBtc: 0.01,
  maxRigsPerRun: 3,
};

const rentalLogs: RentalLog[] = [];
const rentedRigIds = new Set<number>();
let dailySpendReset = new Date().toDateString();
let spentTodayBtc = 0;

export function getAutoRentConfig(): AutoRentConfig {
  return { ...autoRentConfig };
}

export function setAutoRentConfig(config: Partial<AutoRentConfig>): AutoRentConfig {
  autoRentConfig = { ...autoRentConfig, ...config };
  return { ...autoRentConfig };
}

export function getRentalLogs(): RentalLog[] {
  return [...rentalLogs].reverse();
}

export function addRentalLog(log: RentalLog): void {
  rentalLogs.push(log);
  if (rentalLogs.length > 500) rentalLogs.splice(0, rentalLogs.length - 500);
}

export function clearRentalLogs(): void {
  rentalLogs.length = 0;
}

export function getRentedRigIds(): number[] {
  return Array.from(rentedRigIds);
}

export function markRigRented(rigId: number): void {
  rentedRigIds.add(rigId);
}

export function getSpentTodayBtc(): number {
  const today = new Date().toDateString();
  if (today !== dailySpendReset) {
    dailySpendReset = today;
    spentTodayBtc = 0;
    rentedRigIds.clear();
  }
  return spentTodayBtc;
}

export function addSpentBtc(amount: number): void {
  const today = new Date().toDateString();
  if (today !== dailySpendReset) {
    dailySpendReset = today;
    spentTodayBtc = 0;
    rentedRigIds.clear();
  }
  spentTodayBtc += amount;
}

const poolConfigs = new Map<string, PoolConfig>();
const walletConfigs = new Map<string, WalletConfig>();

function poolKey(coinTag: string, algo: string): string {
  return `${coinTag.toLowerCase()}:${algo.toLowerCase()}`;
}

export function getPoolConfigs(): PoolConfig[] {
  return Array.from(poolConfigs.values());
}

export function getPoolConfig(coinTag: string, algo: string): PoolConfig | null {
  return poolConfigs.get(poolKey(coinTag, algo)) ?? null;
}

export function setPoolConfig(config: PoolConfig): void {
  poolConfigs.set(poolKey(config.coinTag, config.algo), { ...config });
}

export function deletePoolConfig(coinTag: string, algo: string): void {
  poolConfigs.delete(poolKey(coinTag, algo));
}

export function getWalletConfigs(): WalletConfig[] {
  return Array.from(walletConfigs.values());
}

export function setWalletConfig(config: WalletConfig): void {
  walletConfigs.set(config.coinTag, { ...config });
}

export function deleteWalletConfig(coinTag: string): void {
  walletConfigs.delete(coinTag);
}
