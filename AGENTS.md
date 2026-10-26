# Envello — Master Project Guide & Agent Instructions

This document is the authoritative, permanent instructions guide for any AI agent or software engineer working on **Envello**.

---

## 1. Project Identity & Vision

- **Project Name**: Envello (working name; trademark and domain clearance to be revisited prior to public release).
- **Category**: Personal finance management and envelope-budgeting web application.
- **Initial User & Owner**: A single owner managing personal finances in a private beta.
- **Future Vision**: Scale to multi-tenant user base with complete data isolation.
- **Core Product Values**:
  1. **Accounting Correctness**: Absolute accuracy in financial math. Zero floating-point calculation errors.
  2. **Data Privacy & Security**: Financial data is confidential. Strict Row Level Security (RLS) on all database tables.
  3. **Zero-Cost Operation**: Target ₹0/month operating cost using free tiers (Vercel Hobby, Supabase Free). Never introduce paid APIs or subscriptions.
  4. **Useful Without AI**: AI is explicitly deferred to Version 2. The core ledger, budgeting engine, and reporting must be fully deterministic and complete on their own.

---

## 2. Core Technology Stack

- **Frontend**: React 19 + TypeScript (Strict Mode) + Vite
- **Styling**: Tailwind CSS with custom design tokens for financial surfaces and glassmorphic elevation
- **Icons**: Lucide React
- **Charts**: Lightweight, tree-shakeable charting library (e.g., Recharts or Chart.js)
- **Backend & Database**: Supabase PostgreSQL + Supabase Auth + Row Level Security (RLS)
- **Email Delivery**: Resend via Supabase Custom SMTP for production transactional emails
- **Deployment**: Vercel Hobby (Frontend) + Supabase Cloud (Backend/DB)
- **Authentication**: Google OAuth + Email/Password + Magic Link via Supabase Auth

---

## 3. Non-Negotiable Engineering Rules

### 3.1 Accounting & Calculations
- **Database is Authoritative**: Never compute ad-hoc balances in UI components that contradict or bypass persisted transactions.
- **No Binary Floating-Point Math**: Store all currency in integer paise (the smallest currency unit in INR: ₹1.00 = 100 paise) or PostgreSQL `NUMERIC(12, 2)`. Never use JavaScript `Number` floats for financial additions/subtractions without a fixed-point precision helper.
- **Clear Balance Taxonomy**: Never display a single ambiguous number labeled "Total Balance". The UI must distinguish:
  1. **Spendable Cash** (liquid bank accounts and cash in hand).
  2. **Envelope Allocations** (assigned funds for specific purposes).
  3. **Savings & Fixed Deposits** (locked or long-term assets).
  4. **Credit Card Liabilities** (unsettled card debt).
  5. **Actual Debts** (debts owed to friends, family, or lenders).
  6. **Monthly Targets** (planning goals, not liquid balances).
- **Atomic Operations**: Transfers, allocations, and multi-table financial movements must be executed inside database transactions or secure PostgreSQL RPC functions. No partial state updates.

### 3.2 Security, Auth & Profile Lifecycle
- **RLS on Every Table**: Every table, view, and bucket must have Row Level Security enabled with explicit least-privilege policies.
- **Zero Trust for Client User ID**: Never trust `auth.uid()` or user IDs passed in request bodies or query params. All operations must resolve ownership against `auth.uid()` directly in PostgreSQL policies or server-side functions.
- **Private Beta Gating**: New account registrations must not automatically gain access to financial workspaces. Access must be verified against a server-enforced owner allowlist. Never rely on frontend-only email checks.
- **No Secrets in Frontend**: Never commit `.env` or expose Supabase `service_role` keys in browser code or `VITE_*` environment variables.
- **Account Lifecycle & Security**: User profile updates (display name, email change, password setup/change, and account deletion requests) must follow strict verification and confirmation dialogs. Account deletions enforce the legal 30-day grace period with one-click restoration on sign-in, an auto-sweep purge when the window elapses, and an optional immediate purge path upon explicit typed email confirmation.
- **Branded Transactional Emails**: All auth templates (confirm signup, magic link, password reset, email change, verification code, and security notifications) must be production-ready HTML, free of temporary beta markers, and use the official hosted logo (`public/logo.png`).
- **Regulatory Compliance & Legal Routing**: Publicly expose comprehensive Privacy Policy and Terms of Service interfaces accessible via clean paths (`/privacy`, `/terms`) and hashes (`/#privacy`, `/#terms`). Ensure full compliance with Google OAuth consent requirements, non-financial-advisor disclaimers, cloud sub-processor disclosures (Supabase, Resend, Vercel), data portability (export), and account deletion rights.

### 3.3 Mobile & Tablet Ergonomics
- **Form Typography Scale**: Always use `text-base sm:text-sm` for inputs, selects, and textareas. Never use `sm:text-xs` (12px), which is cramped and illegible on tablets and desktops.
- **iOS Safari Auto-Zoom Safeguard**: Enforce `font-size: 16px` on mobile inputs (< 640px) to prevent automatic viewport zooming.
- **44px Minimum Touch Targets**: Interactive buttons, dropdown items, and modal actions must have at least 44px height (`min-h-[44px]`) on touch viewports.
- **Responsive Overlays**: Overlays and dropdown menus must never use fixed pixel widths that overflow small devices; always cap with `w-[min(calc(100vw-24px),22rem)]`.

### 3.4 Code Quality & Architecture
- **Strict TypeScript**: No `any`, no unhandled promises, no `@ts-ignore` without documented justification.
- **Separation of Concerns**: Keep presentation components separate from business logic, domain calculations, and database access layers.
- **No Placeholder Functionality**: Do not leave dead buttons, pretend modal triggers, or mockup forms in completed features.
- **Verification-Driven**: A feature is not complete until it passes type check (`tsc -b`), linting (`eslint`), and automated/manual verification.

---

## 4. Documentation Architecture

All architectural, security, and financial specifications are documented in `docs/`:

| Document | Purpose |
| :--- | :--- |
| [`docs/PRODUCT_SPEC.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/docs/PRODUCT_SPEC.md) | Comprehensive functional specification for all budgeting, envelope, account, and card features. |
| [`docs/ARCHITECTURE.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/docs/ARCHITECTURE.md) | High-level system architecture, client layers, state management, and Supabase integration. |
| [`docs/DATABASE_DESIGN.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/docs/DATABASE_DESIGN.md) | Full relational database schema, tables, foreign keys, indexes, and RLS policies. |
| [`docs/SECURITY.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/docs/SECURITY.md) | Threat model, OAuth configuration, RLS rules, private beta allowlist, and pre-launch checklist. |
| [`docs/ACCOUNTING_RULES.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/docs/ACCOUNTING_RULES.md) | Deterministic accounting rules, transaction taxonomy, envelope rollover, and credit card mechanics. |
| [`docs/ROADMAP.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/docs/ROADMAP.md) | Phased implementation schedule from project initialization to beta testing and V2 AI features. |
| [`docs/DEVELOPMENT.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/docs/DEVELOPMENT.md) | Developer workflow, local Supabase setup, migrations discipline, and coding standards. |
| [`docs/DECISIONS.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/docs/DECISIONS.md) | Architectural Decision Records (ADRs) explaining key design and technical choices. |
| [`docs/TESTING.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/docs/TESTING.md) | Testing strategy, accounting invariant suites, RLS policy tests, and release verification. |

---

## 5. Antigravity Workflows & Rules

Workflows and rules are located in `.agents/` (and aliased to `.agent/`):

- **Rules**:
  - [`.agents/rules/accounting.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/.agents/rules/accounting.md) — Exact currency math, transaction invariants, envelope rollover logic.
  - [`.agents/rules/security.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/.agents/rules/security.md) — RLS requirements, Google OAuth flow, private beta allowlist, secret isolation.
  - [`.agents/rules/database.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/.agents/rules/database.md) — PostgreSQL migrations, constraint standards, atomic transactions.
  - [`.agents/rules/frontend.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/.agents/rules/frontend.md) — React 19 patterns, TypeScript typing, modular architecture.
  - [`.agents/rules/design.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/.agents/rules/design.md) — Design system, visual hierarchy, financial color coding, responsive layouts.
  - [`.agents/rules/quality.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/.agents/rules/quality.md) — Verification definition of done, error handling, test discipline.

- **Workflows**:
  - `/plan-feature` ([`.agents/workflows/plan-feature.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/.agents/workflows/plan-feature.md)) — Plan a new feature without writing code.
  - `/implement-feature` ([`.agents/workflows/implement-feature.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/.agents/workflows/implement-feature.md)) — Execute feature implementation with strict verification.
  - `/database-migration` ([`.agents/workflows/database-migration.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/.agents/workflows/database-migration.md)) — Create and verify Supabase SQL schema migrations and RLS policies.
  - `/security-review` ([`.agents/workflows/security-review.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/.agents/workflows/security-review.md)) — Audit RLS, auth boundaries, input sanitization, and secret leaks.
  - `/test-and-debug` ([`.agents/workflows/test-and-debug.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/.agents/workflows/test-and-debug.md)) — Systematically diagnose bugs and verify accounting invariants.
  - `/release-checklist` ([`.agents/workflows/release-checklist.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/.agents/workflows/release-checklist.md)) — Pre-deployment verification for Vercel and Supabase.
