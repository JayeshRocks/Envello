# Contributing to Envello

Thank you for your interest in contributing to **Envello**! 

Envello is a deterministic personal finance ledger and envelope-budgeting application designed for accounting correctness, strict data isolation, and a ₹0/month operating footprint.

To maintain absolute trust in personal financial calculations and security, all contributions must strictly adhere to the engineering guidelines detailed below.

---

## 🏛️ Non-Negotiable Engineering Rules

### 1. Absolute Accounting Correctness (No Floating-Point Math)
- **Integer Paise Only**: All currency amounts must be stored and calculated in integer **paise** (`₹1.00 = 100 paise`) or PostgreSQL `NUMERIC(12, 2)`.
- **Never use standard JavaScript IEEE 754 floats** (`0.1 + 0.2`) for financial addition, subtraction, or ledger balancing without a fixed-point precision helper.
- **Database is Authoritative**: Never compute ad-hoc client-side balances that bypass or contradict persisted ledger transactions.

### 2. Explicit Six-Pillar Balance Taxonomy
Never collapse balances into an ambiguous "Total Balance". Always explicitly preserve the distinction between:
1. **Spendable Cash** (liquid checking/savings/cash)
2. **Envelope Allocations** (budgeted money for current month spending)
3. **Savings & Fixed Deposits** (locked long-term assets)
4. **Credit Card Liabilities** (unsettled debt owed to card issuers)
5. **Actual Debts** (debts owed to friends, family, or lenders)
6. **Monthly Targets** (planning goals, not liquid balances)

### 3. Strict Row Level Security (RLS) & Zero-Trust Client IDs
- Every PostgreSQL table, view, and storage bucket must have RLS enabled with explicit least-privilege policies.
- Never trust `user_id` or `auth.uid()` passed in client request bodies. All ownership checks must resolve strictly against `auth.uid()` directly in database policies.

### 4. Zero Secrets in Client Bundles
- Never commit `.env` or reference Supabase `service_role` keys or database credentials in client code.
- Variables prefixed with `VITE_*` are publicly exposed in the browser bundle.

### 5. Mobile & Tablet Ergonomics
- All form inputs, selects, and textareas must use `text-base sm:text-sm` (16px on mobile to prevent iOS Safari auto-zoom).
- Interactive buttons and dropdown items must maintain at least a 44px minimum touch target (`min-h-[44px]`).

### 6. Zero-Cost Operating Architecture
- The project targets ₹0/month operating cost using open-source packages on free tiers (Vercel Hobby, Supabase Free).
- Never introduce paid third-party APIs, proprietary libraries, or subscription services.

---

## 🛠️ Development Workflow

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS)
- **npm**: `v10.x`+
- **Git**

### 2. Setup
```bash
git clone https://github.com/JayeshRocks/Envello.git
cd Envello
npm install
cp .env.example .env
npm run dev
```

### 3. Branching & Commit Discipline
- Create focused feature branches from `main`:
  ```bash
  git checkout -b feat/your-feature-name
  ```
- Use Conventional Commits:
  - `feat(accounts): add multi-currency exchange rate helper`
  - `fix(ledger): correct paise rounding on envelope carryover`
  - `docs(readme): expand migration guide`
  - `test(accounting): add self-emi repayment invariant test`

---

## ✅ Definition of Done (Quality Gate)

Before submitting any Pull Request, you MUST ensure that all automated checks pass locally:

```bash
# 1. Typecheck and Linting
npm run lint

# 2. Accounting Invariant Test Suite
npm run test

# 3. Production Bundle Build
npm run build
```

---

## 📬 Submitting a Pull Request

1. Push your branch to GitHub.
2. Open a Pull Request targeting `main`.
3. Fill out the PR template completely:
   - Provide a clear summary of what changes were made and why.
   - Confirm that no floating-point arithmetic was introduced.
   - Verify that all database changes include corresponding RLS policies and migration scripts in `supabase/migrations/`.
   - Confirm all quality checks passed.

Thank you for helping keep Envello robust, deterministic, and transparent!
