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
  1. **Liquid Funds** (liquid bank accounts and cash in hand).
  2. **Envelope Allocations** (assigned funds for specific purposes across Spendable, Emergency, Savings, and custom categories).
  3. **FDs & RDs** (locked term deposits, recurring deposits, and growth assets).
  4. **Credit Card Liabilities** (unsettled card debt).
  5. **Actual Debts** (debts owed to friends, family, or lenders).
  6. **Monthly Targets & Standing Costs** (planning goals and recurring cadences).
- **Total User Envelope Control, Envelope Rearranging & Protected Reserve Feature**:
  - Total user control: Every envelope can be edited, customized, renamed, rearranged, and deleted. No envelopes are locked or permanent mandatory compartments.
  - Envelope Rearranging: Users can reorder envelopes via tactile move arrow buttons and drag-and-drop, persisted with `sort_order` in the database and local cache.
  - Default starter envelopes: Spendable, Emergency, and Savings spawn automatically upon workspace initialization alongside lifestyle categories.
  - Protected Reserve Feature: Any envelope can be toggled on/off as a Protected Reserve in emerald green. On envelope cards, a compact green shield symbol is displayed; clicking/expanding it reveals the full "Protected Reserve" description and rules. Requires explicit user authorization warnings and confirmation checkboxes before funds can be withdrawn or debited for expenses (Emergency and Savings spawn with this feature on by default).
  - Credit Cards and EMIs are direct liabilities/repayments tracked under Cards & Debts, never envelopes.
- **Anti-Negative Envelope Guard**: Envelopes can NEVER be overspent into negative balances. When recording an expense, the transaction engine strictly enforces that debits do not exceed available allocation (`amountPaise <= availablePaise`). Direct bills without envelope deduction must use "None". Income can be credited directly to accounts and optionally assigned to an envelope.
- **Account Holds, Ghost Banks & Greedy Deduction**:
  - Allocating budget to an envelope places an explicit hold on backing liquid accounts (`envelope_allocation_sources`).
  - Multi-Account Funding & Headroom Invariant: Budgeting supports funding from multiple liquid accounts via "Add from another account". Previous account selectors become locked/disabled with already-selected indicators, with row-level revert buttons. "Add from another account" unlocks only when current rows have valid positive amounts and unselected liquid accounts remain. Each account contribution is strictly guarded against exceeding that account's available headroom ($\text{unallocatedPaise} + \text{existingHoldOnEnvelope} \le \text{balancePaise}$), preventing over-allocation.
  - Accounts display a 3-tier balance taxonomy: Physical Bank Balance, Reserved across Envelopes, and Free Unallocated Balance.
  - Envelopes act as "Ghost Banks": users can choose an envelope as the payment method for an expense. The engine runs a greedy largest-first deduction across backing liquid accounts.
  - On completing an envelope expense, a real-life settlement receipt prompt appears with the exact bank-by-bank payout breakdown and dual actions: "Mark as completed" and 1-click "Revert this Transaction".
  - Direct account spending (direct bills, credit card bill payments, loan settlements) is strictly guarded against exceeding the account's free unallocated balance (`amountPaise <= unallocatedPaise`), preventing overdrafts on reserved envelope funds.
  - Transfers between envelopes shift backing account holds without data loss.
  - Envelope cards feature card-wide click-to-view allocation triggers, enlarged quick action buttons (Edit, Transfer, Modify Budget) with stopPropagation containment, and a bottom-right "View Allocation →" link opening the backing account hold breakdown.
- **Month-End Rollover Policies & Reversion Process**:
  - Three deterministic rollover mechanics:
    1. **Carry Forward** (`carry_forward`): Keep unused funds and backing account holds reserved in this envelope into next month.
    2. **Sweep to Spendable** (`sweep_to_regular`): Transfer unused budget surplus to the Spendable envelope at month-end.
    3. **Reset to Bank** (`reset`): Release unused budget and holds back to the backing bank account's free unallocated balance.
  - Detailed Reversion Process & 3-Day Rollover Policy: Transaction reversions require an in-app preview detailing exact double-entry ledger impact across accounts, envelopes, cards, and debts, referencing target accounts and envelopes by name rather than generic phrases. Allowed for the current month and up to 3 days post month-end. Reversions are guarded against driving envelope balances below zero if allocated funds were already spent.
- **Reimagined Recurring Costs Engine**: Supports dual frequency models:
  1. **Interval in Days** (`interval_days`): repeat every X days for rolling supplies and consumables (e.g., water cans every 15 days, protein every 45 days).
  2. **Day of Month** (`monthly_day`): triggers on a specific day of each month for regular bills (rent, utilities, subscriptions).
  Real-time due triggers alert when items are due to be logged with 1-click batch entry and normalized 30-day monthly commitment projections.
- **Atomic Operations**: Transfers, allocations, and multi-table financial movements must be executed inside database transactions or secure PostgreSQL RPC functions. No partial state updates.

### 3.2 Security, Auth & Profile Lifecycle
- **RLS on Every Table**: Every table, view, and bucket must have Row Level Security enabled with explicit least-privilege policies.
- **Zero Trust for Client User ID**: Never trust `auth.uid()` or user IDs passed in request bodies or query params. All operations must resolve ownership against `auth.uid()` directly in PostgreSQL policies or server-side functions.
- **Private Beta Gating**: New account registrations must not automatically gain access to financial workspaces. Access must be verified against a server-enforced owner allowlist. Never rely on frontend-only email checks.
- **No Secrets in Frontend**: Never commit `.env` or expose Supabase `service_role` keys in browser code or `VITE_*` environment variables.
- **Least-Privilege Database Functions & Security Headers**: In PostgreSQL, newly declared functions grant `EXECUTE` to `PUBLIC` by default; explicitly revoke public execution on sensitive or `SECURITY DEFINER` functions and enforce caller identity assertions (`auth.uid() = target_id`). Enforce HSTS, CSP, COOP, and CORP headers in production. Production builds must strip console and debugger statements and conceal internal system errors.
- **Account Lifecycle & Security**: User profile updates (display name, email change, password setup/change, and account deletion requests) must follow strict verification and confirmation dialogs. Account deletions enforce the legal 30-day grace period with one-click restoration on sign-in, an auto-sweep purge when the window elapses, and an optional immediate purge path upon explicit typed email confirmation.
- **Branded Transactional Emails**: All auth templates (confirm signup, magic link, password reset, email change, verification code, and security notifications) must be production-ready HTML, free of temporary beta markers, and use the official hosted logo (`public/logo.png`).
- **Regulatory Compliance & Legal Routing**: Publicly expose comprehensive Privacy Policy and Terms of Service interfaces accessible via clean paths (`/privacy`, `/terms`) and hashes (`/#privacy`, `/#terms`). Ensure full compliance with Google OAuth consent requirements, non-financial-advisor disclaimers, cloud sub-processor disclosures (Supabase, Resend, Vercel), data portability (export), and account deletion rights.

### 3.3 Mobile & Tablet Ergonomics
- **Form Typography Scale**: Always use `text-base sm:text-sm` for inputs, selects, and textareas. Never use `sm:text-xs` (12px), which is cramped and illegible on tablets and desktops.
- **iOS Safari Auto-Zoom Safeguard**: Enforce `font-size: 16px` on mobile inputs (< 640px) to prevent automatic viewport zooming.
- **44px Minimum Touch Targets**: Interactive buttons, dropdown items, quick actions, tab pills, and modal close triggers must have at least 44px height (`min-h-[44px] min-w-[44px]`) on touch viewports with `active:scale-95` tactile feedback.
- **Centered Modal Experience & Portal Isolation**: All pop-out forms and modals must be rendered via `ModalPortal` (`createPortal(..., document.body)`) to escape parent containers with `overflow-hidden` or `backdrop-filter`. Modals automatically center to the viewport on all device sizes (`flex items-center justify-center p-3 sm:p-4 md:p-6`, `rounded-2xl sm:rounded-3xl`, `max-h-[90vh] sm:max-h-[88vh] overflow-y-auto`) with high-contrast borders and smooth backdrop blur. Body and documentElement scroll locking (`html.modal-open, body.modal-open`) and overscroll containment (`overscroll-behavior: contain`) must isolate background touch events.
- **Zero Horizontal Scrolling & Visible Button Layouts**: Never hide buttons, tabs, quick amount chips, or category filters behind horizontal scrolling (`overflow-x-auto`, `scrollbar-none`, `flex-nowrap`). All buttons, tabs, and action pills must be arranged in responsive wrapping layouts (`flex flex-wrap gap-2`, `grid grid-cols-2 xs:grid-cols-3 md:flex`) so 100% of controls are visible at a glance on PC, tablet, and phone without horizontal scrolling.
- **Responsive Overlays**: Overlays and dropdown menus must never use fixed pixel widths that overflow small devices; always cap with `w-[min(calc(100vw-24px),22rem)]`.
- **Pinned Header Navigation**: The application header is pinned fixed to the top of the viewport (`fixed top-0 left-0 right-0 z-40`) with an explicit spacer (`h-16`) and CSS `scroll-padding-top` to follow the user during scrolling without layout obscuration.
- **Custom In-App Branded Confirmation Prompts**: Native browser `window.confirm` and `window.alert` dialogs are strictly prohibited. All destructive or consequential user actions (deleting accounts, cards, recurring rules, or reverting transactions) must use the accessible in-app `ConfirmModal` (`useConfirm()`).
- **Concise Terminology (FDs & RDs)**: Shorten "Fixed Deposits & Recurring Deposits" to **"FDs & RDs"** in all space-constrained UI elements (metric cards, navigation pills, tab headers).
- **Viewport & Horizontal Overflow Containment**: `html`, `body`, and `#root` must enforce `width: 100%; max-width: 100%; overflow-x: hidden; position: relative;` and `-webkit-text-size-adjust: 100%`. Sections with decorative blur or glow backdrops must be contained with `overflow-hidden` to prevent layout blowout, mobile zoom anomalies, and blank margin gutters on zoom out. Avoid negative horizontal margins (`-mx-*`) on full-width unclipped containers.


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
