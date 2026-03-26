# RigProfit - Mining Rig Rental Profitability Analyzer

## Overview
A real-time cryptocurrency mining rig rental profitability analyzer. Compares mining revenue data from WhatToMine with rental prices from MiningRigRentals to identify profitable rental opportunities, and can automatically rent rigs when profit margins exceed a configured threshold.

## Architecture
- **Frontend**: React + TypeScript with Vite, TailwindCSS, shadcn/ui components
- **Backend**: Express.js server with API proxy endpoints
- **No database**: Uses in-memory caching for API responses (5-minute TTL) and in-memory state for auto-rent config/logs

## Key Features
- Real-time coin profitability data from WhatToMine ASIC API
- MiningRigRentals integration for rental price comparison (requires API keys)
- Pool fee integration: lowest mining pool fees per coin from miningpoolstats.stream, deducted from revenue
- Profitability calculations: revenue (net of pool fee) vs rental cost analysis
- Sortable/filterable data tables with search
- Dark mode default theme
- Auto-refresh every 5 minutes
- **Auto-Rental**: Background scheduler checks opportunities every 5 minutes and auto-rents rigs above a configurable margin threshold (default 10%)

## Auto-Rental System
- Configurable settings: margin threshold, rental duration, MRR pool profile ID, max daily BTC spend, max rigs per run
- Background interval runs every 5 minutes when enabled
- Safety guards: per-rig deduplication (rented once per day), daily spend cap, max rigs per run limit
- Full rental history log with success/failure status and MRR rental IDs
- "Run Now" button for manual trigger
- Daily budget resets at midnight UTC

## Data Flow
1. Backend fetches coin data from `whattomine.com/asic.json`
2. Backend fetches BTC price from CoinGecko
3. If MRR API keys configured, fetches available rigs per algorithm
4. Calculates profit = mining revenue (net of pool fee) - rental cost for each coin/rig combination
5. Frontend displays sorted profitability results
6. Auto-rent scheduler fires every 5 minutes, rents rigs above margin threshold up to daily budget

## Environment Variables
- `MRR_API_KEY` - MiningRigRentals API key (requires Rent permission for auto-rental)
- `MRR_API_SECRET` - MiningRigRentals API secret

## File Structure
- `shared/schema.ts` - TypeScript interfaces (CoinData, ProfitOpportunity, DashboardData, AutoRentConfig, RentalLog, AutoRentStatus)
- `server/routes.ts` - API routes, MRR rental creation, background auto-rent scheduler
- `server/storage.ts` - In-memory API cache + auto-rent config/logs/state
- `client/src/pages/home.tsx` - Main dashboard with Coins, Opportunities, and Auto-Rent tabs
- `client/src/App.tsx` - Router setup

## API Endpoints
- `GET /api/dashboard` - Returns complete dashboard data (coins, opportunities, stats)
- `POST /api/refresh` - Clears cache and forces fresh data fetch
- `GET /api/autorent/status` - Returns auto-rent config, logs, next run time, daily spend
- `PUT /api/autorent/config` - Update auto-rent settings
- `POST /api/autorent/run` - Manually trigger an auto-rent check
- `POST /api/autorent/clear-logs` - Clear rental history logs

## Algorithm Mapping
Maps WhatToMine algorithm names to MRR types with default hashrate references for revenue normalization.
