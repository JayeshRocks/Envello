<div align="center">

  <img src="public/logo.png" alt="Envello Logo" width="88" height="88" style="border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(14, 165, 233, 0.3);" />

  # Envello

  **A deterministic personal finance ledger and envelope-budgeting system built on exact accounting invariants.**

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
  [![React](https://img.shields.io/badge/React-19.0-61dafb.svg?style=flat-square&logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.7%20Strict-3178c6.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20RLS-3ecf8e.svg?style=flat-square&logo=supabase)](https://supabase.com/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
  [![Accounting Math](https://img.shields.io/badge/Math-Integer%20Paise%20(No%20Floats)-emerald.svg?style=flat-square)](#-accounting-correctness--deterministic-math)
  [![Zero Cost](https://img.shields.io/badge/Operating%20Cost-%E2%82%B90%2Fmonth-purple.svg?style=flat-square)](#-zero-cost-operating-architecture)

  <p align="center">
    <a href="#-why-envello">Why Envello</a> •
    <a href="#-the-six-financial-pillars">Six Financial Pillars</a> •
    <a href="#-key-features">Key Features</a> •
    <a href="#-technology-stack">Tech Stack</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-documentation-architecture">Documentation</a> •
    <a href="#-privacy--legal-compliance">Privacy & Legal</a>
  </p>

</div>

---

## 🌟 Why Envello?

Most personal finance apps suffer from two fundamental engineering flaws:
1. **Ambiguous Balances**: They collapse all your assets into a single misleading number labeled *"Total Balance"*. In reality, credit card limits are not money you own, locked fixed deposits cannot pay for groceries, and money planned for rent next week is already spoken for.
2. **Floating-Point Drift**: Performing financial math with standard JavaScript IEEE 754 numbers (`0.1 + 0.2 = 0.30000000000000004`) introduces subtle compounding rounding errors that erode user trust in personal ledgers.

**Envello is engineered differently:**
- **Zero Binary Float Math**: Every monetary value is stored and calculated in integer **paise** (`₹1.00 = 100 paise`) or PostgreSQL `NUMERIC(12, 2)`.
- **Explicit Balance Taxonomy**: Separates spendable liquid cash, allocated spending funds, locked deposits, credit card debt, debts owed to individuals, and monthly planning targets into 6 authoritative financial pillars.
- **Authoritative Database Truth**: The database ledger is the single source of truth. UI states never invent balances that contradict persisted transactions.
- **₹0/Month Zero-Cost Architecture**: Operates 100% within free tiers (Vercel Hobby, Supabase Free tier, Resend SMTP) with zero paid third-party dependencies or subscriptions.

---

## 🏛️ The Six Financial Pillars

Envello provides clarity by strictly separating your financial positions into six distinct pillars:

| Pillar | Classification | Description |
| :--- | :--- | :--- |
| **1. Spendable Cash** | Liquid Asset | Actual spendable money across checking accounts, savings accounts, and cash in hand. |
| **2. Envelope Allocations** | Assigned Funds | Cash assigned to envelopes (Groceries, Utilities, Subscriptions, Dining) for current-month spending. |
| **3. Savings & Fixed Deposits** | Locked Asset | Term deposits, emergency funds, and locked reserves that are **not** immediately spendable. |
| **4. Credit Card Liabilities** | Unsettled Debt | Outstanding card balances that represent debt owed to issuing banks. Tracked against credit limits. |
| **5. Actual Debts** | Counterparty Debt | Money borrowed from or lent to family, friends, or lenders with repayment ledger tracking. |
| **6. Monthly Targets** | Planning Goals | Financial goals you intend to fund during the month. Targets are goals, never liquid cash. |

---

## 🚀 Key Features

### ✉️ Envelope Budgeting & Rollovers
- Allocate income into discrete digital envelopes with custom icons and color tokens.
- Selectable month-end rollover policies per envelope:
  - **Carry Forward**: Unspent balance rolls into the next month.
  - **Sweep to Regular**: Excess unspent funds sweep back into general spendable cash.
  - **Reset**: Resets envelope allocation to zero each cycle.

### 💳 Credit Cards & Utilization Safety
- Track outstanding balances against credit limits with real-time utilization analytics.
- Automated utilization status safeguards:
  - 🟢 **Comfortable** (< 30% utilization)
  - 🟡 **Caution** (30% – 50% utilization)
  - 🔴 **High Risk** (> 50% utilization — impacts credit health)
- Integrated bill payment ledger logging debits against liquid accounts.

### 🏦 Fixed Deposits & Self-EMIs
- **Fixed Deposits**: Principal, interest rates, compounding frequency, and maturity schedules with 1-click liquidation back to liquid accounts.
- **Self-EMIs**: Borrow from your own savings for major purchases and enforce disciplined internal monthly repayments to yourself with zero interest.

### 🤝 Actual Debts (Lent & Borrowed)
- Track debts owed to individuals or lenders with counterparty names, interest rates, and dedicated repayment ledger tracking.

### ⏰ Standing Recurring Rules
- Automate fixed monthly expenses (rent, broadband, insurance, SIPs) with automated due date detection, notification alerts, and 1-click batch ledger entry.

### ⚖️ Bank Account Reconciliations
- Reconcile recorded ledger balances against official bank statements with audit logging and variance adjustment tracking.

### 🔒 Privacy, Security & Account Lifecycle
- **Row Level Security (RLS)**: Enforced on 100% of database tables with zero trust for client-provided user IDs (`auth.uid() = user_id`).
- **Private Beta Gating**: Database-enforced owner allowlist prevents unauthorized signups from accessing workspace data.
- **30-Day Closure Grace Period**: Account closure follows a 30-day deactivation period with 1-click restoration upon sign-in and automated expiry sweeping.
- **Immediate Data Wipe**: Advanced option to permanently purge all data immediately upon typed email confirmation.
- **Complete Data Portability**: 1-click export of your complete financial ledger into formatted JSON backup files.

### 📱 Responsive Ergonomics
- Strict mobile and tablet ergonomics adhering to `text-base sm:text-sm` (16px mobile input scale to eliminate iOS Safari auto-zoom).
- Minimum 44px touch targets across all buttons, dropdown actions, and modal controls.

---

## 🏗️ Technology Stack

```
Envello/
├── Frontend         React 19, TypeScript 5.7 (Strict), Vite 6, Tailwind CSS 3.4
├── Icons            Lucide React
├── Database         Supabase PostgreSQL with Row Level Security (RLS)
├── Authentication   Supabase Auth (Google OAuth, Email/Password, Magic Link)
├── Emails           Resend via Supabase Custom SMTP (Production Branded Templates)
├── Testing          Vitest (18/18 Accounting Invariant Suites)
└── Hosting          Vercel Hobby (Frontend) + Supabase Cloud Free Tier (Backend)
```

---

## 📐 Accounting Correctness & Deterministic Math

Envello strictly rejects binary floating-point arithmetic for financial calculations.

```ts
// ❌ Dangerous binary float math:
0.1 + 0.2 === 0.30000000000000004

// ✅ Envello integer paise arithmetic:
10 paise + 20 paise === 30 paise (₹0.30)
```

All arithmetic is verified through automated invariant testing suites:
- **Conservation of Value**: Account transfers debit and credit identical paise amounts.
- **Non-Negative Invariants**: Envelope balances cannot drop below zero paise without explicit overdraft handling.
- **Utilization Precision**: Credit card utilization percentages are calculated deterministically without division-by-zero vulnerabilities.

Run the test suite:
```bash
npm run test
```

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10.x` or higher
- **Supabase Account**: Free project on [supabase.com](https://supabase.com)

### 1. Clone the Repository
```bash
git clone https://github.com/JayeshRocks/Envello.git
cd Envello
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Populate `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_APP_NAME=Envello
VITE_APP_ENV=development
VITE_APP_URL=http://localhost:5173
```

> [!CAUTION]
> Never put Supabase `service_role` keys or private database passwords into client `.env` files. Variables prefixed with `VITE_` are publicly visible in browser bundles.

### 4. Apply Database Migrations
Apply the migrations located in `supabase/migrations/` sequentially using the Supabase CLI or SQL Editor:
1. `20261025000000_initial_schema.sql` — Core tables, constraints, RLS policies, and transfer RPC.
2. `20261026000000_profile_setup_and_security.sql` — Auth profile triggers and owner allowlist gating.
3. `20261027000001_account_deletion_grace_period.sql` — 30-day closure lifecycle, restore, and purge RPCs.

### 5. Launch the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 6. Run Quality & Build Checks
```bash
# Type check and linting
npm run lint

# Run accounting invariant test suite
npm run test

# Production build bundle verification
npm run build
```

---

## 📖 Documentation Architecture

Comprehensive architectural and engineering specifications are maintained in [`docs/`](docs/):

| Document | Purpose |
| :--- | :--- |
| [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) | Functional product specification across all budgeting, cards, and debt modules. |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | High-level system architecture, client layers, state management, and Supabase integration. |
| [`docs/DATABASE_DESIGN.md`](docs/DATABASE_DESIGN.md) | Full relational database schema, foreign keys, indexes, and Row Level Security rules. |
| [`docs/ACCOUNTING_RULES.md`](docs/ACCOUNTING_RULES.md) | Invariant accounting rules, transaction taxonomy, and envelope rollover logic. |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Threat model, OAuth configuration, RLS policies, allowlist gating, and pre-launch checklist. |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phased implementation schedule from project initialization to beta testing. |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) | Developer workflow, local Supabase setup, migrations discipline, and coding standards. |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architectural Decision Records (ADRs) explaining key design choices. |
| [`docs/TESTING.md`](docs/TESTING.md) | Testing strategy, invariant verification suites, and release checklists. |

---

## ⚖️ Privacy, Security & Legal Compliance

- **Google OAuth Verification**: Publicly provides compliant Privacy Policy and Terms of Service endpoints reachable at `/privacy`, `/terms`, `/#privacy`, and `/#terms`.
- **Non-Financial-Advisor Disclaimer**: Envello is an educational, self-directed ledger and envelope-budgeting software tool. It does not provide certified financial, investment, legal, or tax advisory services.
- **Zero Third-Party Advertising**: We do not sell, rent, monetize, or broker financial data to advertisers or third-party brokers.
- **Cloud Sub-Processors**: Financial data is securely hosted on Supabase (AWS eu-central-1 / ap-south-1), transactional emails are routed via Resend, and web bundles are served via Vercel's Edge Network.
- **Account Deletion & Data Portability**: Users can export their complete data anytime via JSON, and request a 30-day grace period account closure or an immediate permanent wipe.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — see the [LICENSE](LICENSE) file for details.

Copyright © 2026 [JayeshRocks](https://github.com/JayeshRocks). All rights reserved.
