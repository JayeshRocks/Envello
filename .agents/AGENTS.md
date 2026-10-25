# Envello — Workspace Agent Rules

These rules apply to any AI agent working on the Envello codebase.

## 1. Accounting Accuracy & Authoritative Source of Truth
- **Rule**: The database is the single authoritative source of truth. All calculations must use integer paise or PostgreSQL `NUMERIC(12, 2)`. Never use binary floating-point calculations for financial amounts.
- **Context**: Inaccurate financial calculations or floating-point rounding errors (e.g., 0.1 + 0.2 = 0.30000000000000004) destroy user trust in a personal finance tool.

## 2. Explicit Balance Taxonomy
- **Rule**: Never display a single ambiguous number labeled "Total Balance". Always explicitly separate:
  1. Spendable Cash (Liquid bank accounts & cash)
  2. Envelope Allocations (Allocated spending money)
  3. Savings & Fixed Deposits (Locked assets)
  4. Credit Card Liabilities (Unsettled debt)
  5. Actual Debts (Owed to other individuals/lenders)
  6. Monthly Targets (Planning goals)
- **Context**: Conflating locked savings or card limits with spendable cash leads to overdrafts and financial mistakes.

## 3. Row Level Security & Zero Trust Client IDs
- **Rule**: Enable RLS on every table without exception. Never accept a `user_id` from the client request body or query params to establish data ownership. All RLS policies must strictly enforce `auth.uid() = user_id`.
- **Context**: Even if the frontend application is publicly accessible, private financial data must remain 100% inaccessible to unauthorized users.

## 4. Private Beta Gating
- **Rule**: New Google OAuth registrations must not automatically access the financial workspace. Enforce a server-side allowlist check before granting workspace access. Never use a client-side only email check.
- **Context**: The application will be tested by the single owner for months before any public launch.

## 5. Secret Protection & Environment Boundary
- **Rule**: Never place Supabase `service_role` keys, database passwords, or private tokens in client code or `VITE_*` environment variables. Never commit `.env` files.
- **Context**: Vite inlines `VITE_*` variables directly into the compiled JavaScript bundle shipped to the browser.

## 6. Zero-Cost Architecture & Technology Stack
- **Rule**: Stack is React 19, TypeScript (Strict), Vite, Tailwind CSS, Supabase Free tier, and Vercel Hobby. Target ₹0/mo operating cost. Never add paid APIs, third-party subscriptions, or proprietary libraries. AI is explicitly deferred to Version 2.
- **Context**: The project operates on a personal ₹0 budget using open-source, AGPL/MIT-compatible packages.

## 7. Atomic Financial Operations
- **Rule**: Multi-table updates (e.g., account transfers, debt repayments, envelope reallocations) must be executed in database transactions or secure PostgreSQL RPC functions.
- **Context**: Prevents partial failure scenarios where funds are debited from one account but never credited to another.

## 8. Definition of Done
- **Rule**: A feature or fix is done ONLY after:
  `Plan -> Implement -> Lint (npm run lint) -> Build (npm run build) -> Verify`
  Never leave placeholder buttons, pretend actions, or unhandled errors.
