import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  RefreshCw, TrendingUp, TrendingDown, Bitcoin, Cpu, Coins,
  ExternalLink, AlertTriangle, Key, Clock, Zap, Search, Bot,
  Play, Trash2, CheckCircle2, XCircle, Settings2, ShieldAlert,
  Wallet, Server, Plus, Pencil, Link, UploadCloud,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import type { DashboardData, CoinData, ProfitOpportunity, AutoRentStatus, PoolsData, PoolConfig } from "@shared/schema";

function formatUsd(value: number): string {
  if (Math.abs(value) >= 1) {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(value);
  }
  if (Math.abs(value) >= 0.01) {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4,
    }).format(value);
  }
  if (Math.abs(value) < 0.0001 && value !== 0) return value > 0 ? "<$0.0001" : "-<$0.0001";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 4, maximumFractionDigits: 6,
  }).format(value);
}

function formatBtcPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}

function formatBtc(value: number): string {
  return `${value.toFixed(8)} BTC`;
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatTimeAgo(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function formatNumber(value: number): string {
  if (value >= 1e15) return `${(value / 1e15).toFixed(2)} PH`;
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)} TH`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GH`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MH`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)} KH`;
  return value.toFixed(2);
}

function Header({ data, isFetching, onRefresh }: {
  data?: DashboardData; isFetching: boolean; onRefresh: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight" data-testid="text-app-title">RigProfit</h1>
              <p className="text-[11px] text-muted-foreground leading-tight hidden sm:block">Mining Rig Rental Profitability Analyzer</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {data?.btcPriceUsd ? (
              <div className="hidden md:flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5" data-testid="text-btc-price">
                <Bitcoin className="w-4 h-4 text-amber-500" />
                <span className="font-mono font-semibold text-sm text-amber-500">{formatBtcPrice(data.btcPriceUsd)}</span>
              </div>
            ) : null}
            {data?.lastUpdated && (
              <span className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1" data-testid="text-last-updated">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(data.lastUpdated)}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isFetching}
              className="h-8 text-xs"
              data-testid="button-refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function StatsCards({ data }: { data: DashboardData }) {
  const topCoin = data.coins.length > 0
    ? [...data.coins].sort((a, b) => b.profitability - a.profitability)[0]
    : null;

  const stats = [
    {
      label: "BTC Price",
      value: formatBtcPrice(data.btcPriceUsd),
      icon: Bitcoin,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
    {
      label: "Coins Tracked",
      value: data.coins.length.toString(),
      icon: Coins,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    ...(data.mrrConfigured
      ? [
          {
            label: "Profitable Opportunities",
            value: data.profitableCount.toString(),
            icon: TrendingUp,
            color: data.profitableCount > 0 ? "text-emerald-500" : "text-muted-foreground",
            bgColor: data.profitableCount > 0 ? "bg-emerald-500/10" : "bg-muted/30",
            borderColor: data.profitableCount > 0 ? "border-emerald-500/20" : "border-border",
          },
          {
            label: "Best Margin",
            value: formatPercent(data.bestMargin),
            icon: data.bestMargin > 0 ? TrendingUp : TrendingDown,
            color: data.bestMargin > 0 ? "text-emerald-500" : "text-rose-500",
            bgColor: data.bestMargin > 0 ? "bg-emerald-500/10" : "bg-rose-500/10",
            borderColor: data.bestMargin > 0 ? "border-emerald-500/20" : "border-rose-500/20",
          },
        ]
      : [
          {
            label: "Algorithms",
            value: data.algorithms.length.toString(),
            icon: Cpu,
            color: "text-violet-400",
            bgColor: "bg-violet-500/10",
            borderColor: "border-violet-500/20",
          },
          {
            label: "Top Coin",
            value: topCoin ? topCoin.tag : "N/A",
            icon: Zap,
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
            borderColor: "border-emerald-500/20",
          },
        ]),
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.4 }}
        >
          <Card className={`p-4 border ${stat.borderColor} hover:bg-muted/20 transition-colors`} data-testid={`stat-card-${i}`}>
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider truncate">{stat.label}</p>
                <p className="text-xl sm:text-2xl font-bold font-mono mt-1 truncate">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${stat.bgColor} shrink-0`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function ErrorBanner({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-start gap-3"
      data-testid="error-banner"
    >
      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
      <div className="text-sm">
        <p className="font-medium text-amber-500">Some data sources had issues:</p>
        <ul className="mt-1 space-y-0.5">
          {errors.map((e, i) => (
            <li key={i} className="text-xs text-muted-foreground">{e}</li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

function SetupBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-6"
      data-testid="setup-banner"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
          <Key className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-base">Enable Rental Profitability Analysis</h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Connect your MiningRigRentals account to compare real-time rental prices with mining revenue
            and discover profitable opportunities.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <p className="font-medium">Setup instructions:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
              <li>
                Go to{" "}
                <a href="https://www.miningrigrentals.com/account/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  MiningRigRentals API Keys
                </a>
              </li>
              <li>Generate a new API key with read permissions</li>
              <li>
                Add <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">MRR_API_KEY</code> and{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">MRR_API_SECRET</code> as environment secrets
              </li>
              <li>Restart the application</li>
            </ol>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CoinsTable({ coins, algoFilter, searchQuery }: {
  coins: CoinData[]; algoFilter: string; searchQuery: string;
}) {
  const [sortField, setSortField] = useState<string>("profitability");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const sortedCoins = useMemo(() => {
    let filtered = algoFilter === "all" ? [...coins] : coins.filter(c => c.algorithm === algoFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(q) || c.tag.toLowerCase().includes(q)
      );
    }

    const dir = sortDir === "desc" ? -1 : 1;
    switch (sortField) {
      case "name": filtered.sort((a, b) => dir * a.name.localeCompare(b.name) * -1); break;
      case "revenue": filtered.sort((a, b) => dir * (parseFloat(a.btcRevenue) - parseFloat(b.btcRevenue))); break;
      case "exchangeRate": filtered.sort((a, b) => dir * (a.exchangeRate - b.exchangeRate)); break;
      case "blockReward": filtered.sort((a, b) => dir * (a.blockReward - b.blockReward)); break;
      default: filtered.sort((a, b) => dir * (a.profitability - b.profitability));
    }
    return filtered;
  }, [coins, algoFilter, searchQuery, sortField, sortDir]);

  const SortHeader = ({ field, children, className = "" }: { field: string; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={`font-semibold cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
      onClick={() => toggleSort(field)}
      data-testid={`sort-${field}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-primary text-[10px]">{sortDir === "desc" ? "▼" : "▲"}</span>
        )}
      </span>
    </TableHead>
  );

  if (!sortedCoins.length) {
    return (
      <Card className="p-12 text-center border-dashed" data-testid="empty-coins">
        <Coins className="w-10 h-10 mx-auto text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">No coins found for the selected filter.</p>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <SortHeader field="name">Coin</SortHeader>
                <TableHead className="font-semibold">Algorithm</TableHead>
                <TableHead className="font-semibold text-right">Block Time</TableHead>
                <SortHeader field="blockReward" className="text-right">Reward</SortHeader>
                <SortHeader field="exchangeRate" className="text-right">Rate (BTC)</SortHeader>
                <SortHeader field="revenue" className="text-right">Rev/Day</SortHeader>
                <TableHead className="font-semibold text-right">Pool Fee</TableHead>
                <TableHead className="font-semibold text-right">Network Hash</TableHead>
                <SortHeader field="profitability" className="text-right">Profitability</SortHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCoins.map((coin) => (
                <TableRow
                  key={`${coin.id}-${coin.tag}-${coin.name}`}
                  className="hover:bg-muted/20 transition-colors"
                  data-testid={`coin-row-${coin.tag}`}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{coin.name}</span>
                      <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">{coin.tag}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">{coin.algorithm}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {parseFloat(coin.blockTime).toFixed(0)}s
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {coin.blockReward.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {coin.exchangeRate.toFixed(8)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {parseFloat(coin.btcRevenue).toFixed(8)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs" data-testid={`pool-fee-${coin.tag}`}>
                    {coin.poolFeePercent !== null ? (
                      <span className="inline-flex items-center gap-1" title={coin.poolName || ""}>
                        <span className="text-amber-400">{coin.poolFeePercent}%</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {formatNumber(coin.nethash)}/s
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-mono text-xs font-semibold ${
                      coin.profitability > 50 ? "text-emerald-500" :
                      coin.profitability > 0 ? "text-emerald-400/70" :
                      coin.profitability < 0 ? "text-rose-500" : "text-muted-foreground"
                    }`}>
                      {coin.profitability}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-2 border-t border-border bg-muted/20">
          <p className="text-[11px] text-muted-foreground">
            Showing {sortedCoins.length} of {coins.length} coins. Revenue based on WhatToMine default hashrates.
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

function OpportunitiesTable({ opportunities, algoFilter, profitableOnly, searchQuery }: {
  opportunities: ProfitOpportunity[]; algoFilter: string; profitableOnly: boolean; searchQuery: string;
}) {
  const [sortField, setSortField] = useState<string>("margin");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let result = algoFilter === "all" ? [...opportunities] : opportunities.filter(o => o.algorithm === algoFilter);
    if (profitableOnly) result = result.filter(o => o.profitUsdPerDay > 0);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.coinName.toLowerCase().includes(q) || o.coinTag.toLowerCase().includes(q) ||
        o.rigName.toLowerCase().includes(q)
      );
    }

    const dir = sortDir === "desc" ? -1 : 1;
    switch (sortField) {
      case "profit": result.sort((a, b) => dir * (a.profitUsdPerDay - b.profitUsdPerDay)); break;
      case "cost": result.sort((a, b) => dir * (a.rentalCostUsdPerDay - b.rentalCostUsdPerDay)); break;
      case "revenue": result.sort((a, b) => dir * (a.miningRevenueUsdPerDay - b.miningRevenueUsdPerDay)); break;
      case "hashrate": result.sort((a, b) => dir * (a.rigHashrate - b.rigHashrate)); break;
      default: result.sort((a, b) => dir * (a.profitMarginPercent - b.profitMarginPercent));
    }
    return result;
  }, [opportunities, algoFilter, profitableOnly, searchQuery, sortField, sortDir]);

  const SortHeader = ({ field, children, className = "" }: { field: string; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={`font-semibold cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
      onClick={() => toggleSort(field)}
      data-testid={`sort-opp-${field}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-primary text-[10px]">{sortDir === "desc" ? "▼" : "▲"}</span>
        )}
      </span>
    </TableHead>
  );

  if (!filtered.length) {
    return (
      <Card className="p-12 text-center border-dashed" data-testid="empty-opportunities">
        <TrendingDown className="w-10 h-10 mx-auto text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          {profitableOnly ? "No profitable opportunities found at this time." : "No rental opportunities found for the selected filter."}
        </p>
        {profitableOnly && (
          <p className="mt-1 text-xs text-muted-foreground/70">Try disabling the &quot;Profitable only&quot; filter.</p>
        )}
      </Card>
    );
  }

  const displayed = filtered.slice(0, 200);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Coin</TableHead>
                <TableHead className="font-semibold">Algorithm</TableHead>
                <TableHead className="font-semibold">Rig</TableHead>
                <SortHeader field="hashrate" className="text-right">Hashrate</SortHeader>
                <SortHeader field="cost" className="text-right">Cost/Day</SortHeader>
                <SortHeader field="revenue" className="text-right">Revenue/Day</SortHeader>
                <TableHead className="font-semibold text-right">Pool Fee</TableHead>
                <SortHeader field="profit" className="text-right">Profit/Day</SortHeader>
                <SortHeader field="margin" className="text-right">Margin</SortHeader>
                <TableHead className="font-semibold text-right">Min Hours</TableHead>
                <TableHead className="font-semibold text-center w-[60px]">Rent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map((opp) => {
                const isProfitable = opp.profitUsdPerDay > 0;
                return (
                  <TableRow
                    key={`${opp.rigId}-${opp.coinTag}`}
                    className={`hover:bg-muted/20 transition-colors ${isProfitable ? "bg-emerald-500/[0.03]" : ""}`}
                    data-testid={`opp-row-${opp.rigId}-${opp.coinTag}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{opp.coinName}</span>
                        <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">{opp.coinTag}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">{opp.algorithm}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <span className="text-xs truncate block" title={opp.rigName}>{opp.rigName}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {opp.rigHashrate.toFixed(2)} {opp.rigHashrateType}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-rose-400">
                      {formatUsd(opp.rentalCostUsdPerDay)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-emerald-400">
                      {formatUsd(opp.miningRevenueUsdPerDay)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs" data-testid={`opp-pool-fee-${opp.rigId}-${opp.coinTag}`}>
                      {opp.poolFeePercent !== null ? (
                        <span className="text-amber-400" title={opp.poolName || ""}>{opp.poolFeePercent}%</span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-xs font-bold ${isProfitable ? "text-emerald-500" : "text-rose-500"}`}>
                        {formatUsd(opp.profitUsdPerDay)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-xs font-semibold px-1.5 py-0.5 rounded ${
                        isProfitable
                          ? "text-emerald-500 bg-emerald-500/10"
                          : "text-rose-500 bg-rose-500/10"
                      }`}>
                        {formatPercent(opp.profitMarginPercent)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {opp.minHours}h
                    </TableCell>
                    <TableCell className="text-center">
                      <a
                        href={opp.mrrUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`link-rent-${opp.rigId}`}
                      >
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-primary">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-2 border-t border-border bg-muted/20">
          <p className="text-[11px] text-muted-foreground">
            Showing {displayed.length} of {filtered.length} opportunities.
            {filtered.length !== opportunities.length && ` (${opportunities.length} total)`}
            {" "}Revenue estimates based on WhatToMine default hashrates. Pool fees from miningpoolstats.stream deducted from revenue.
          </p>
        </div>
      </Card>
    </motion.div>
  );
}


function CoinAlgoPoolRow({
  coin,
  existingConfig,
  onSave,
  onDelete,
  onSync,
  isSyncing,
  syncResult,
}: {
  coin: CoinData;
  existingConfig?: PoolConfig;
  onSave: (coinTag: string, algo: string, config: Partial<PoolConfig>) => void;
  onDelete: (coinTag: string, algo: string) => void;
  onSync: (coinTag: string, algo: string) => void;
  isSyncing: boolean;
  syncResult?: { success: boolean; error?: string };
}) {
  const rowKey = `${coin.tag}:${coin.algorithm}`;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    host: existingConfig?.host ?? "",
    port: existingConfig?.port ?? "",
    worker: existingConfig?.worker ?? "",
    password: existingConfig?.password ?? "x",
  });

  const isFilled = form.host && form.port && form.worker;

  const handleSave = () => {
    onSave(coin.tag, coin.algorithm, { ...form, coinName: coin.name });
    setEditing(false);
  };

  const handleEdit = () => {
    if (existingConfig) setForm({ host: existingConfig.host, port: existingConfig.port, worker: existingConfig.worker, password: existingConfig.password || "x" });
    setEditing(true);
  };

  const handleCancel = () => {
    if (existingConfig) setForm({ host: existingConfig.host, port: existingConfig.port, worker: existingConfig.worker, password: existingConfig.password || "x" });
    setEditing(false);
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${existingConfig?.mrrProfileId ? "border-emerald-500/20" : "border-border/60"}`} data-testid={`pool-row-${rowKey}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/20">
        <Badge variant="secondary" className="text-[10px] font-mono shrink-0 px-1.5 py-0">{coin.algorithm}</Badge>
        {existingConfig && !editing ? (
          <span className="font-mono text-xs text-muted-foreground truncate flex-1">{existingConfig.host}:{existingConfig.port}</span>
        ) : existingConfig && editing ? (
          <span className="text-xs text-muted-foreground flex-1">Editing…</span>
        ) : (
          <span className="text-xs text-muted-foreground/50 italic flex-1">No pool configured</span>
        )}
        {existingConfig?.mrrProfileId && !editing && (
          <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 shrink-0">
            <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
            Profile #{existingConfig.mrrProfileId}
          </Badge>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {existingConfig && !editing && (
            <>
              <Button size="sm" variant="outline" onClick={() => onSync(coin.tag, coin.algorithm)}
                disabled={isSyncing} className="h-6 text-[10px] gap-1 px-2"
                data-testid={`button-sync-${rowKey}`} title="Create MRR pool + profile">
                <UploadCloud className="w-2.5 h-2.5" />
                {isSyncing ? "..." : "Sync"}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleEdit} className="h-6 w-6 p-0" data-testid={`button-edit-${rowKey}`}>
                <Pencil className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(coin.tag, coin.algorithm)} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" data-testid={`button-delete-${rowKey}`}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
          {!existingConfig && !editing && (
            <Button size="sm" variant="ghost" onClick={handleEdit} className="h-6 text-[10px] gap-1 px-2 border border-dashed border-border" data-testid={`button-add-${rowKey}`}>
              <Plus className="w-2.5 h-2.5" />
              Add pool
            </Button>
          )}
        </div>
      </div>

      {syncResult && (
        <div className={`px-3 py-1.5 text-[11px] ${syncResult.success ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
          {syncResult.success ? "MRR pool + profile created" : syncResult.error}
        </div>
      )}

      {editing && (
        <div className="p-3 space-y-2 border-t border-border/60">
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-[10px]">Stratum Host</Label>
              <Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })}
                placeholder="stratum.pool.com" className="h-7 text-xs font-mono" data-testid={`input-host-${rowKey}`} autoFocus />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Port</Label>
              <Input value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })}
                placeholder="3333" className="h-7 text-xs font-mono" data-testid={`input-port-${rowKey}`} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Password</Label>
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="x" className="h-7 text-xs font-mono" data-testid={`input-password-${rowKey}`} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Worker / Wallet Address</Label>
            <Input value={form.worker} onChange={(e) => setForm({ ...form, worker: e.target.value })}
              placeholder="your_wallet.worker_name" className="h-7 text-xs font-mono" data-testid={`input-worker-${rowKey}`} />
            <p className="text-[10px] text-muted-foreground">wallet.worker  or  just the wallet address</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={!isFilled} className="h-7 text-xs" data-testid={`button-save-pool-${rowKey}`}>Save</Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {existingConfig && !editing && (
        <div className="px-3 py-2 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-border/40 bg-muted/10">
          <div>
            <p className="text-[10px] text-muted-foreground">Host</p>
            <p className="font-mono text-xs truncate" title={existingConfig.host}>{existingConfig.host}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Port</p>
            <p className="font-mono text-xs">{existingConfig.port}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[10px] text-muted-foreground">Worker / Wallet</p>
            <p className="font-mono text-xs truncate" title={existingConfig.worker}>{existingConfig.worker}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PoolsPanel({ coins }: { coins: CoinData[] }) {
  const { data: poolsData } = useQuery<PoolsData>({
    queryKey: ["/api/pools"],
    refetchInterval: 30000,
  });

  const [syncingKey, setSyncingKey] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, { success: boolean; error?: string }>>({});
  const [walletEdits, setWalletEdits] = useState<Record<string, string>>({});
  const [walletEditMode, setWalletEditMode] = useState<Record<string, boolean>>({});

  const savePoolMutation = useMutation({
    mutationFn: ({ coinTag, algo, config }: { coinTag: string; algo: string; config: Partial<PoolConfig> }) =>
      apiRequest("PUT", `/api/pools/config/${coinTag}/${encodeURIComponent(algo)}`, config),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pools"] }),
  });

  const deletePoolMutation = useMutation({
    mutationFn: ({ coinTag, algo }: { coinTag: string; algo: string }) =>
      apiRequest("DELETE", `/api/pools/config/${coinTag}/${encodeURIComponent(algo)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pools"] }),
  });

  const saveWalletMutation = useMutation({
    mutationFn: ({ coinTag, walletAddress }: { coinTag: string; walletAddress: string }) =>
      apiRequest("PUT", `/api/pools/wallet/${coinTag}`, { walletAddress }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pools"] }),
  });

  const deleteWalletMutation = useMutation({
    mutationFn: (coinTag: string) => apiRequest("DELETE", `/api/pools/wallet/${coinTag}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pools"] }),
  });

  const handleSync = async (coinTag: string, algo: string) => {
    const key = `${coinTag}:${algo}`;
    setSyncingKey(key);
    try {
      await apiRequest("POST", `/api/pools/sync/${coinTag}/${encodeURIComponent(algo)}`, {});
      setSyncResults((r) => ({ ...r, [key]: { success: true } }));
      queryClient.invalidateQueries({ queryKey: ["/api/pools"] });
    } catch (e: any) {
      setSyncResults((r) => ({ ...r, [key]: { success: false, error: e.message } }));
    } finally {
      setSyncingKey(null);
    }
  };

  const configsByKey = useMemo(() =>
    Object.fromEntries((poolsData?.pools ?? []).map(p => [`${p.coinTag}:${p.algo}`, p])),
    [poolsData?.pools]
  );
  const walletsByTag = useMemo(() =>
    Object.fromEntries((poolsData?.wallets ?? []).map(w => [w.coinTag, w])),
    [poolsData?.wallets]
  );

  const coinGroups = useMemo(() => {
    const groups = new Map<string, { name: string; tag: string; algos: CoinData[] }>();
    for (const c of coins) {
      if (!groups.has(c.tag)) groups.set(c.tag, { name: c.name, tag: c.tag, algos: [] });
      const g = groups.get(c.tag)!;
      if (!g.algos.find(a => a.algorithm === c.algorithm)) g.algos.push(c);
    }
    return Array.from(groups.values()).sort((a, b) => a.tag.localeCompare(b.tag));
  }, [coins]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 flex items-start gap-3">
        <Server className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-200/80 leading-relaxed">
          Configure pool connections per coin and algorithm. Coins with multiple algorithms (e.g. DGB) each have their own stratum entry. Click <strong>Sync</strong> to push a pool + profile to your MRR account.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Pool Configuration</h3>
          <span className="text-[11px] text-muted-foreground">per coin / algorithm</span>
        </div>
        <div className="space-y-3">
          {coinGroups.map((group) => {
            const wallet = walletsByTag[group.tag];
            const isWalletEditing = walletEditMode[group.tag];
            const walletVal = walletEdits[group.tag] ?? wallet?.walletAddress ?? "";
            return (
              <Card key={group.tag} className="overflow-hidden" data-testid={`coin-group-${group.tag}`}>
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-muted/30 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{group.name}</span>
                    <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">{group.tag}</Badge>
                    {group.algos.length > 1 && (
                      <span className="text-[10px] text-muted-foreground">{group.algos.length} algorithms</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Wallet className="w-3 h-3 text-muted-foreground shrink-0" />
                    {isWalletEditing ? (
                      <div className="flex items-center gap-1">
                        <Input value={walletVal} onChange={(e) => setWalletEdits({ ...walletEdits, [group.tag]: e.target.value })}
                          placeholder="Wallet address" className="h-6 text-[11px] font-mono w-48"
                          data-testid={`input-wallet-${group.tag}`} autoFocus />
                        <Button size="sm" className="h-6 text-[10px] px-2"
                          onClick={() => { saveWalletMutation.mutate({ coinTag: group.tag, walletAddress: walletVal }); setWalletEditMode({ ...walletEditMode, [group.tag]: false }); }}
                          data-testid={`button-save-wallet-${group.tag}`}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1"
                          onClick={() => setWalletEditMode({ ...walletEditMode, [group.tag]: false })}>✕</Button>
                      </div>
                    ) : (
                      <span className={`font-mono text-[11px] cursor-pointer hover:text-primary truncate max-w-[200px] ${wallet?.walletAddress ? "text-muted-foreground" : "italic text-muted-foreground/40"}`}
                        onClick={() => setWalletEditMode({ ...walletEditMode, [group.tag]: true })}
                        data-testid={`text-wallet-${group.tag}`} title={wallet?.walletAddress || "Click to add wallet"}>
                        {wallet?.walletAddress || "add wallet address…"}
                      </span>
                    )}
                    {!isWalletEditing && (
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 shrink-0"
                        onClick={() => setWalletEditMode({ ...walletEditMode, [group.tag]: true })}
                        data-testid={`button-edit-wallet-${group.tag}`}>
                        <Pencil className="w-2.5 h-2.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="divide-y divide-border/40">
                  {group.algos.map((coin) => {
                    const key = `${coin.tag}:${coin.algorithm}`;
                    return (
                      <CoinAlgoPoolRow
                        key={key}
                        coin={coin}
                        existingConfig={configsByKey[key]}
                        onSave={(ct, al, cfg) => savePoolMutation.mutate({ coinTag: ct, algo: al, config: cfg })}
                        onDelete={(ct, al) => deletePoolMutation.mutate({ coinTag: ct, algo: al })}
                        onSync={handleSync}
                        isSyncing={syncingKey === key}
                        syncResult={syncResults[key]}
                      />
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {(poolsData?.mrrPools?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Link className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Your MRR Pools</h3>
            <Badge variant="secondary" className="text-[10px]">{poolsData!.mrrPools.length}</Badge>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold">Name</TableHead>
                  <TableHead className="text-xs font-semibold">Algo</TableHead>
                  <TableHead className="text-xs font-semibold">Host:Port</TableHead>
                  <TableHead className="text-xs font-semibold">Worker</TableHead>
                  <TableHead className="text-xs font-semibold text-right">ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poolsData!.mrrPools.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-medium">{p.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] font-mono px-1 py-0">{p.type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{p.host}:{p.port}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[160px]" title={p.user}>{p.user}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">#{p.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {(poolsData?.mrrProfiles?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Your MRR Pool Profiles</h3>
            <Badge variant="secondary" className="text-[10px]">{poolsData!.mrrProfiles.length}</Badge>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold">Name</TableHead>
                  <TableHead className="text-xs font-semibold">Algorithm</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Profile ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poolsData!.mrrProfiles.map((p) => {
                  const algoName = typeof p.algo === "object" ? (p.algo as any)?.name : p.algo;
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs font-medium">{p.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] font-mono px-1 py-0">{algoName}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[11px]">#{p.id}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="px-4 py-2 border-t border-border bg-muted/20">
              <p className="text-[11px] text-muted-foreground">Use these Profile IDs in the Auto-Rent settings.</p>
            </div>
          </Card>
        </div>
      )}
    </motion.div>
  );
}

function AutoRentPanel() {
  const { data: status, refetch: refetchStatus } = useQuery<AutoRentStatus>({
    queryKey: ["/api/autorent/status"],
    refetchInterval: 15000,
  });

  const [localConfig, setLocalConfig] = useState<{
    marginThreshold: string;
    rentalHours: string;
    poolProfileId: string;
    maxDailySpendBtc: string;
    maxRigsPerRun: string;
  } | null>(null);

  const cfg = status?.config;
  const fields = localConfig ?? {
    marginThreshold: String(cfg?.marginThreshold ?? 10),
    rentalHours: String(cfg?.rentalHours ?? 24),
    poolProfileId: cfg?.poolProfileId ?? "",
    maxDailySpendBtc: String(cfg?.maxDailySpendBtc ?? 0.01),
    maxRigsPerRun: String(cfg?.maxRigsPerRun ?? 3),
  };

  const updateConfigMutation = useMutation({
    mutationFn: (update: Record<string, any>) =>
      apiRequest("PUT", "/api/autorent/config", update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autorent/status"] });
      setLocalConfig(null);
    },
  });

  const runNowMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/autorent/run"),
    onSuccess: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/autorent/status"] }), 2000);
    },
  });

  const clearLogsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/autorent/clear-logs"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/autorent/status"] }),
  });

  const handleToggle = (enabled: boolean) => {
    updateConfigMutation.mutate({ enabled });
  };

  const handleSave = () => {
    updateConfigMutation.mutate({
      marginThreshold: parseFloat(fields.marginThreshold),
      rentalHours: parseInt(fields.rentalHours),
      poolProfileId: fields.poolProfileId,
      maxDailySpendBtc: parseFloat(fields.maxDailySpendBtc),
      maxRigsPerRun: parseInt(fields.maxRigsPerRun),
    });
  };

  const logs = status?.logs ?? [];
  const spentToday = status?.spentTodayBtc ?? 0;
  const maxSpend = cfg?.maxDailySpendBtc ?? 0;
  const budgetUsedPct = maxSpend > 0 ? Math.min(100, (spentToday / maxSpend) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-200/80 leading-relaxed">
          Auto-rental will spend real BTC from your MRR account. Make sure your pool profile ID is correct and your daily spend cap is set conservatively before enabling.
          Your API key must have <strong>Rent</strong> permission enabled on MRR.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Settings2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Auto-Rental Settings</h3>
                  <p className="text-[11px] text-muted-foreground">Configure when and how rigs are rented automatically</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{cfg?.enabled ? "Enabled" : "Disabled"}</span>
                <Switch
                  checked={cfg?.enabled ?? false}
                  onCheckedChange={handleToggle}
                  disabled={updateConfigMutation.isPending}
                  data-testid="switch-autorent-enabled"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Profit Margin Threshold (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={fields.marginThreshold}
                  onChange={(e) => setLocalConfig({ ...fields, marginThreshold: e.target.value })}
                  className="h-8 text-xs font-mono"
                  data-testid="input-margin-threshold"
                />
                <p className="text-[10px] text-muted-foreground">Only rent rigs with margin above this value</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Rental Duration (hours)</Label>
                <Input
                  type="number"
                  min="1"
                  max="168"
                  step="1"
                  value={fields.rentalHours}
                  onChange={(e) => setLocalConfig({ ...fields, rentalHours: e.target.value })}
                  className="h-8 text-xs font-mono"
                  data-testid="input-rental-hours"
                />
                <p className="text-[10px] text-muted-foreground">How many hours to rent each rig</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">MRR Pool Profile ID</Label>
                <Input
                  type="text"
                  placeholder="e.g. 12345"
                  value={fields.poolProfileId}
                  onChange={(e) => setLocalConfig({ ...fields, poolProfileId: e.target.value })}
                  className="h-8 text-xs font-mono"
                  data-testid="input-pool-profile-id"
                />
                <p className="text-[10px] text-muted-foreground">
                  Your pool profile ID from{" "}
                  <a href="https://www.miningrigrentals.com/account/pools" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    MRR Pool Profiles
                  </a>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Max Daily Spend (BTC)</Label>
                <Input
                  type="number"
                  min="0.0001"
                  step="0.001"
                  value={fields.maxDailySpendBtc}
                  onChange={(e) => setLocalConfig({ ...fields, maxDailySpendBtc: e.target.value })}
                  className="h-8 text-xs font-mono"
                  data-testid="input-max-daily-spend"
                />
                <p className="text-[10px] text-muted-foreground">Safety cap — resets at midnight UTC</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Max Rigs Per Run</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  value={fields.maxRigsPerRun}
                  onChange={(e) => setLocalConfig({ ...fields, maxRigsPerRun: e.target.value })}
                  className="h-8 text-xs font-mono"
                  data-testid="input-max-rigs-per-run"
                />
                <p className="text-[10px] text-muted-foreground">Max rigs rented per 5-minute check</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateConfigMutation.isPending || !localConfig}
                className="h-8 text-xs"
                data-testid="button-save-config"
              >
                {updateConfigMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                Save Settings
              </Button>
              {localConfig && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLocalConfig(null)}
                  className="h-8 text-xs"
                  data-testid="button-cancel-config"
                >
                  Cancel
                </Button>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Rental History</h3>
                  <p className="text-[11px] text-muted-foreground">{logs.length} logged rental attempts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runNowMutation.mutate()}
                  disabled={runNowMutation.isPending || !cfg?.poolProfileId}
                  className="h-7 text-xs gap-1"
                  data-testid="button-run-now"
                >
                  <Play className="w-3 h-3" />
                  {runNowMutation.isPending ? "Running..." : "Run Now"}
                </Button>
                {logs.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => clearLogsMutation.mutate()}
                    disabled={clearLogsMutation.isPending}
                    className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive"
                    data-testid="button-clear-logs"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-10">
                <Bot className="w-10 h-10 mx-auto text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">No rental attempts yet.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {cfg?.enabled
                    ? "Checks run every 5 minutes. Click Run Now to trigger immediately."
                    : "Enable auto-rental or click Run Now to test your settings."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-semibold text-xs">Time</TableHead>
                      <TableHead className="font-semibold text-xs">Rig</TableHead>
                      <TableHead className="font-semibold text-xs">Coin</TableHead>
                      <TableHead className="font-semibold text-right text-xs">Margin</TableHead>
                      <TableHead className="font-semibold text-right text-xs">Duration</TableHead>
                      <TableHead className="font-semibold text-right text-xs">Cost</TableHead>
                      <TableHead className="font-semibold text-xs">Source</TableHead>
                      <TableHead className="font-semibold text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.slice(0, 100).map((log) => (
                      <TableRow key={log.id} data-testid={`log-row-${log.id}`} className="hover:bg-muted/20">
                        <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatTimeAgo(log.timestamp)}
                        </TableCell>
                        <TableCell className="text-xs max-w-[140px]">
                          <span className="truncate block" title={log.rigName}>{log.rigName}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">#{log.rigId}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">{log.coinTag}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          <span className={log.marginPercent >= 0 ? "text-emerald-500" : "text-rose-500"}>
                            {formatPercent(log.marginPercent)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {log.rentalHours}h
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatBtc(log.costBtc)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${log.source === "auto" ? "text-blue-400 border-blue-400/30" : "text-violet-400 border-violet-400/30"}`}
                          >
                            {log.source}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.success ? (
                            <div className="flex items-center gap-1 text-emerald-500">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Rented</span>
                              {log.mrrRentalId && (
                                <span className="text-[10px] text-muted-foreground font-mono">#{log.mrrRentalId}</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-rose-500" title={log.error}>
                              <XCircle className="w-3.5 h-3.5" />
                              <span className="text-[11px] truncate max-w-[100px]">{log.error || "Failed"}</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Auto-Rental</span>
                <Badge
                  variant="outline"
                  className={cfg?.enabled
                    ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                    : "text-muted-foreground border-border"
                  }
                  data-testid="badge-autorent-status"
                >
                  {cfg?.enabled ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Next check</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {status?.nextRunAt ? formatTimeAgo(status.nextRunAt).replace(" ago", "") : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Margin threshold</span>
                <span className="text-xs font-mono text-primary">&gt;{cfg?.marginThreshold ?? 10}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Rental duration</span>
                <span className="text-xs font-mono">{cfg?.rentalHours ?? 24}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Rented today</span>
                <span className="text-xs font-mono">{status?.rentedRigIds?.length ?? 0} rigs</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Daily budget</span>
                <span className="font-mono">{formatBtc(spentToday)} / {formatBtc(maxSpend)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden" data-testid="budget-bar">
                <div
                  className={`h-full rounded-full transition-all ${budgetUsedPct > 80 ? "bg-rose-500" : budgetUsedPct > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${budgetUsedPct}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-right">{budgetUsedPct.toFixed(1)}% used</p>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">How It Works</h3>
            <ol className="space-y-2 text-xs text-muted-foreground list-none">
              {[
                "Every 5 minutes, RigProfit fetches available rigs and calculates profit margins",
                "Rigs with margins above your threshold are candidates for auto-rental",
                "Rigs are rented using your MRR Pool Profile, directing hashrate to your pool",
                "Each rig is only rented once per day to avoid duplicate charges",
                "Daily budget resets at midnight UTC",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center shrink-0 font-semibold">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-44 mt-1" />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-3 w-20 mb-3" />
              <Skeleton className="h-7 w-28" />
            </Card>
          ))}
        </div>
        <Card className="p-1">
          <div className="space-y-1">
            <Skeleton className="h-10 w-full rounded" />
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center" data-testid="error-view">
        <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-lg font-bold mt-4">Failed to Load Data</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{error.message}</p>
        <Button onClick={onRetry} className="mt-6" data-testid="button-retry">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </Card>
    </div>
  );
}

export default function Home() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const [algoFilter, setAlgoFilter] = useState("all");
  const [profitableOnly, setProfitableOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleRefresh = async () => {
    try {
      await apiRequest("POST", "/api/refresh");
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    } catch {
      refetch();
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorView error={error as Error} onRetry={() => refetch()} />;
  if (!data) return null;

  const defaultTab = data.mrrConfigured ? "opportunities" : "coins";

  return (
    <div className="min-h-screen bg-background" data-testid="home-page">
      <Header data={data} isFetching={isFetching} onRefresh={handleRefresh} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        <StatsCards data={data} />

        {data.errors.length > 0 && <ErrorBanner errors={data.errors} />}

        <Tabs defaultValue={defaultTab}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <TabsList className="bg-muted/50 h-9">
              <TabsTrigger value="coins" className="text-xs h-7 px-3" data-testid="tab-coins">
                <Coins className="w-3.5 h-3.5 mr-1.5" />
                Coins
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 h-4">{data.coins.length}</Badge>
              </TabsTrigger>
              {data.mrrConfigured && (
                <TabsTrigger value="opportunities" className="text-xs h-7 px-3" data-testid="tab-opportunities">
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                  Opportunities
                  {data.profitableCount > 0 && (
                    <Badge className="ml-1.5 bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 text-[10px] px-1 py-0 h-4 border-0">
                      {data.profitableCount}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              {data.mrrConfigured && (
                <TabsTrigger value="autorent" className="text-xs h-7 px-3" data-testid="tab-autorent">
                  <Bot className="w-3.5 h-3.5 mr-1.5" />
                  Auto-Rent
                </TabsTrigger>
              )}
              {data.mrrConfigured && (
                <TabsTrigger value="pools" className="text-xs h-7 px-3" data-testid="tab-pools">
                  <Wallet className="w-3.5 h-3.5 mr-1.5" />
                  Pools & Wallets
                </TabsTrigger>
              )}
            </TabsList>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-[140px] sm:w-[180px] pl-8 text-xs"
                  data-testid="input-search"
                />
              </div>
              <Select value={algoFilter} onValueChange={setAlgoFilter}>
                <SelectTrigger className="w-[150px] h-8 text-xs" data-testid="select-algorithm">
                  <SelectValue placeholder="Algorithm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Algorithms</SelectItem>
                  {data.algorithms.map((algo) => (
                    <SelectItem key={algo} value={algo}>{algo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {data.mrrConfigured && (
                <div className="flex items-center gap-2 bg-muted/30 rounded-md px-2.5 py-1.5">
                  <Switch
                    checked={profitableOnly}
                    onCheckedChange={setProfitableOnly}
                    className="scale-[0.8]"
                    data-testid="switch-profitable"
                  />
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">Profitable only</span>
                </div>
              )}
            </div>
          </div>

          <TabsContent value="coins" className="mt-4">
            <CoinsTable coins={data.coins} algoFilter={algoFilter} searchQuery={searchQuery} />
          </TabsContent>

          {data.mrrConfigured && (
            <TabsContent value="opportunities" className="mt-4">
              <OpportunitiesTable
                opportunities={data.opportunities}
                algoFilter={algoFilter}
                profitableOnly={profitableOnly}
                searchQuery={searchQuery}
              />
            </TabsContent>
          )}

          {data.mrrConfigured && (
            <TabsContent value="autorent" className="mt-4">
              <AutoRentPanel />
            </TabsContent>
          )}
          {data.mrrConfigured && (
            <TabsContent value="pools" className="mt-4">
              <PoolsPanel coins={data.coins ?? []} />
            </TabsContent>
          )}
        </Tabs>

        {!data.mrrConfigured && <SetupBanner />}

        <footer className="text-center py-4 border-t border-border/50">
          <p className="text-[11px] text-muted-foreground">
            Data from{" "}
            <a href="https://whattomine.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">WhatToMine</a>
            {data.mrrConfigured && (
              <> and{" "}
                <a href="https://www.miningrigrentals.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">MiningRigRentals</a>
              </>
            )}
            . Revenue estimates based on default hashrates. Actual results may vary.
          </p>
        </footer>
      </main>
    </div>
  );
}
