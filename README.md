# RigProfit

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A real-time mining rig rental profitability analyzer. Fetches live coin data from [WhatToMine](https://whattomine.com) and available rigs from [MiningRigRentals](https://www.miningrigrentals.com), calculates profit margins after pool fees, and can auto-rent rigs when margins exceed a configurable threshold.

## Features

- **Live Coin Data** — pulls real-time profitability for 40+ coins across all major algorithms from WhatToMine
- **Rental Opportunities** — cross-references MRR rig listings to find rigs where mining revenue exceeds rental cost
- **Profit Margin Calculation** — deducts pool fees per coin, shows net BTC and USD profit per day
- **Auto-Rent** — background scheduler (every 5 min) auto-rents rigs when profit margin exceeds your threshold
  - Configurable margin threshold, max daily BTC spend cap, max rigs per run
  - Rental history log with status per rig
  - Daily BTC budget tracker with midnight UTC reset
- **Pools & Wallets** — configure stratum connection details per coin and algorithm
  - Coins with multiple algorithms (e.g. DGB: SHA-256, Scrypt, Qubit, Skein) each get independent pool entries
  - One wallet address per coin ticker
  - One-click sync to MRR: automatically creates a pool + profile on your MRR account

---

## Local Installation

### Prerequisites

- **Node.js 20+** — [download here](https://nodejs.org/)
- A [MiningRigRentals](https://www.miningrigrentals.com) account with an API key (required for rig data and auto-rent)

### 1. Clone the repo

```bash
git clone https://github.com/acousticallyregarded/Mining-Profit-Finder.git
cd Mining-Profit-Finder
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```
MRR_API_KEY=your_mrr_api_key_here
MRR_API_SECRET=your_mrr_api_secret_here
SESSION_SECRET=any_random_string_here
```

**Getting your MRR API credentials:**
1. Log in to [miningrigrentals.com](https://www.miningrigrentals.com)
2. Go to **Account → API Keys**
3. Create a new key — for auto-rent to work, enable the **Rent** permission
4. Copy the key and secret into your `.env`

> **Never commit your `.env` file.** It is already in `.gitignore`.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

The app fetches coin data from WhatToMine on first load (no API key needed for that). Rig rental data and the Auto-Rent / Pools tabs require valid MRR credentials.

### 5. (Optional) Auto-Rent setup

Once the app is running:
1. Go to the **Pools & Wallets** tab and configure your stratum pools per coin/algorithm
2. Click **Sync to MRR** on each pool to create the pool + profile on your MRR account
3. Copy the generated **Profile ID** from the MRR Profiles section
4. Go to the **Auto-Rent** tab, paste the Profile ID, set your margin threshold and daily BTC budget, then enable it

---

## Tech Stack

- **Frontend**: React + TypeScript, Vite, TailwindCSS, shadcn/ui, TanStack Query, Framer Motion
- **Backend**: Express.js, TypeScript
- **APIs**: WhatToMine (public), MiningRigRentals v2 (HMAC SHA1 auth)
- **Data**: In-memory cache (5 min TTL), no database required

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard` | All coin + opportunity data |
| GET | `/api/autorent/status` | Auto-rent state, logs, budget |
| GET/POST | `/api/autorent/config` | Read/update auto-rent settings |
| POST | `/api/autorent/run` | Trigger an immediate auto-rent cycle |
| POST | `/api/autorent/clear-logs` | Clear rental history |
| GET | `/api/pools` | All pool configs, wallets, MRR pools + profiles |
| PUT | `/api/pools/config/:coinTag/:algo` | Save pool config for a coin+algo |
| DELETE | `/api/pools/config/:coinTag/:algo` | Delete pool config |
| PUT | `/api/pools/wallet/:coinTag` | Save wallet address |
| DELETE | `/api/pools/wallet/:coinTag` | Delete wallet address |
| POST | `/api/pools/sync/:coinTag/:algo` | Create MRR pool + profile from local config |

## Notes

- Pool configs and wallet addresses are stored in memory and reset on server restart. For persistence, connect a database.
- Auto-rent uses MRR's `PUT /rental` endpoint — make sure your API key has "Rent" permission.
- NiceHash coins are filtered out from WhatToMine data automatically.
