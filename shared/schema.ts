export interface CoinData {
  id: number;
  name: string;
  tag: string;
  algorithm: string;
  blockTime: string;
  blockReward: number;
  difficulty: number;
  nethash: number;
  exchangeRate: number;
  exchangeRate24: number;
  marketCap: string;
  estimatedRewards: string;
  btcRevenue: string;
  btcRevenue24: string;
  profitability: number;
  profitability24: number;
  lagging: boolean;
  timestamp: number;
  poolFeePercent: number | null;
  poolName: string | null;
}

export interface ProfitOpportunity {
  coinName: string;
  coinTag: string;
  algorithm: string;
  rigId: number;
  rigName: string;
  rigHashrate: number;
  rigHashrateType: string;
  rentalCostBtcPerDay: number;
  rentalCostUsdPerDay: number;
  miningRevenueBtcPerDay: number;
  miningRevenueUsdPerDay: number;
  profitBtcPerDay: number;
  profitUsdPerDay: number;
  profitMarginPercent: number;
  poolFeePercent: number | null;
  poolName: string | null;
  minHours: number;
  mrrUrl: string;
}

export interface DashboardData {
  opportunities: ProfitOpportunity[];
  coins: CoinData[];
  algorithms: string[];
  profitableCount: number;
  totalCount: number;
  bestMargin: number;
  btcPriceUsd: number;
  lastUpdated: string;
  mrrConfigured: boolean;
  errors: string[];
}

export interface AutoRentConfig {
  enabled: boolean;
  marginThreshold: number;
  rentalHours: number;
  poolProfileId: string;
  maxDailySpendBtc: number;
  maxRigsPerRun: number;
}

export interface RentalLog {
  id: string;
  timestamp: string;
  rigId: number;
  rigName: string;
  coinTag: string;
  algorithm: string;
  marginPercent: number;
  rentalHours: number;
  costBtc: number;
  success: boolean;
  mrrRentalId?: number;
  error?: string;
  source: "auto" | "manual";
}

export interface AutoRentStatus {
  config: AutoRentConfig;
  logs: RentalLog[];
  nextRunAt: string | null;
  spentTodayBtc: number;
  rentedRigIds: number[];
}

export interface PoolConfig {
  coinTag: string;
  coinName: string;
  algo: string;
  host: string;
  port: string;
  worker: string;
  password: string;
  mrrPoolId?: number;
  mrrProfileId?: number;
  lastSynced?: string;
}

export interface WalletConfig {
  coinTag: string;
  walletAddress: string;
  notes: string;
}

export interface PoolsData {
  pools: PoolConfig[];
  wallets: WalletConfig[];
  mrrProfiles: MrrProfile[];
  mrrPools: MrrPool[];
}

export interface MrrProfile {
  id: string;
  name: string;
  algo: string | { name: string; display: string; [key: string]: any };
  pools: Array<{ priority: number; poolid?: string; id?: string; name: string }>;
}

export interface MrrPool {
  id: string;
  name: string;
  type: string;
  host: string;
  port: string;
  user: string;
  pass: string;
}
