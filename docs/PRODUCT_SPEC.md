# Envello — Product Specification

## 1. Executive Summary

Envello is a personal finance management and envelope-budgeting web application built for precision, privacy, and proactive wealth allocation. Initially deployed as a private single-owner beta, it provides full control over cash flow, envelope allocations, credit card liabilities, debt repayments, and savings assets.

---

## 2. Core Functional Modules

### 2.1 Balance Taxonomy & Financial Overview
The application strictly rejects a single ambiguous "Total Balance" figure. The financial dashboard organizes wealth into six distinct, transparent pillars:

1. **Spendable Cash (Liquid Assets)**:
   - Sum of all liquid checking/savings bank accounts and physical cash on hand.
   - Represents money that is actually available to be spent or allocated.
2. **Envelope Allocations (Assigned Money)**:
   - Funds from spendable cash that have been budgeted into active spending categories (across Spendable, Emergency, Savings, and lifestyle envelopes).
3. **FDs & RDs (Term Assets)**:
   - Long-term reserves, bank fixed deposits (FDs), and recurring deposits (RDs) with monthly contributions.
   - Shortened to **"FDs & RDs"** on space-constrained UI elements (metric cards, navigation pills, tab headers).
   - Explicitly excluded from spendable cash to prevent accidental spending.
4. **Credit Card Liabilities (Unsettled Debt)**:
   - Total outstanding balances across all active credit cards.
   - Managed directly under the Cards & Debts hub, not as an envelope.
5. **Debts & Loans (External & Personal Obligations)**:
   - Amounts borrowed from individuals (friends, family) or financial institutions with on-demand manual repayment from liquid bank accounts (mirrors credit card bill payments).
   - Fixed recurring monthly instalments (e.g. car, gadget, personal loans) are organized under the unified **EMIs** hub alongside Self EMIs.
6. **Monthly Targets & Standing Costs (Forward Planning)**:
   - Forward-looking financial goals and recurring purchase intentions.
   - Setting a target does NOT deduct cash until actual contributions are recorded.

---

### 2.2 Envelope Budgeting System
Envello utilizes zero-based envelope budgeting principles: every rupee of spendable cash has a designated role.

#### Total User Control & Dynamic Layout:
- **Total User Envelope Control**: Every envelope can be edited, renamed, customized, rearranged, and deleted. No envelopes are locked or permanent mandatory compartments.
- **Envelope Rearranging**: Users can reorder envelopes via tactile move arrow buttons and drag-and-drop, persisted with `sort_order` in the database and local state.
- **Starter Envelopes**: Workspace initialization automatically generates default starter envelopes (`Spendable`, `Emergency`, `Savings`) alongside common lifestyle categories (`Groceries`, `Dining Out`, `Utilities`, `Entertainment`, `Travel`).
- **Protected Reserve Feature**: Any envelope can be designated as a "Protected Reserve" styled in emerald green with a compact shield symbol. Expanding reveals full protection rules. Direct expenses and transfers out require an explicit warning confirmation and user authorization checkbox (`Emergency` and `Savings` spawn with this feature on by default).
- Credit Cards and EMIs are direct debt liabilities and repayments managed in the Cards & Debts hub, NOT envelopes.

#### Account Holds, Ghost Banks & Greedy Deduction:
- **Explicit Account Holds**: Allocating budget to an envelope places an explicit hold on backing liquid accounts (`envelope_allocation_sources`).
- **Multi-Account Funding & Headroom Invariant**: An envelope can be funded across multiple liquid bank accounts with strict headroom validation ($\text{unallocatedPaise} + \text{existingHoldOnEnvelope} \le \text{balancePaise}$), preventing over-allocation.
- **Inline Liquid Account Headroom Display**: Liquid accounts display physical bank balance, reserved envelope holds, and free unallocated balance inline in a single cohesive row for immediate headroom clarity.
- **Account Holds Protection**: An account's balance cannot be decreased below active holds (`newBalancePaise >= allocatedPaise`), nor can an account be deleted while holds remain (`allocatedPaise > 0n`).
- **Ghost Banks & Greedy Deduction**: When recording an expense, selecting an envelope runs a greedy largest-first deduction across backing accounts and provides an in-app settlement receipt breakdown with dual actions ("Mark as completed" and 1-click "Revert this Transaction").
- **Direct Account Spending Guard**: Direct bills or card repayments cannot exceed an account's free unallocated balance (`amountPaise <= unallocatedPaise`).

#### Anti-Negative Envelope Invariant:
- **Strict Guard**: Envelopes can NEVER be overspent into negative balances.
- **Validation**: When recording an expense, debits cannot exceed available allocation (`amountPaise <= availablePaise`).
- **Direct Bills**: Expenses that do not deduct from an envelope use "None".
- **Direct Income Assignment**: Income recording can optionally allocate directly into an envelope, increasing that envelope's allocation and available balance in lockstep.

#### Rollover & Previous Month Locking:
- **Deterministic Rollover Policies**:
  1. `carry_forward`: Keeps unspent funds and account holds reserved in this envelope into next month.
  2. `reset`: Releases unused funds and holds back to backing accounts' free unallocated balance.
- **Previous Month View-Only Lock**: Historical months accessed via the month selector are locked against edits, reallocations, or budget modifications. A persistent guidance banner informs users that previous months represent frozen snapshots prior to month-end rollover and directs them to the current month to make changes.
- Overspent envelopes are strictly prevented at transaction entry time; available balances are guaranteed to remain non-negative.
- Monthly transitions must never silently discard or reset unused balances.

---

### 2.3 Account Management & Ledger Tracking
- **Account Types**:
  - Checking & Savings Bank Accounts
  - Cash in Hand
  - Fixed Deposits & Term Deposits
  - Credit Card Accounts
- **Attributes Tracked**:
  - Account Name, Financial Institution, Account Type, Currency (INR), Current Balance, Status (Active/Archived).

---

### 2.4 Transaction Taxonomy & Accounting Invariants
Every financial movement is classified deterministically:

| Transaction Type | Impact on Cash | Impact on Envelopes | Notes |
| :--- | :--- | :--- | :--- |
| **Income** | Increases liquid balance | Increases unallocated pool | Salary, bonuses, interest |
| **Expense** | Decreases liquid balance | Decreases specified envelope | Outflow of cash for goods/services |
| **Account Transfer** | Neutral (A- / B+) | Neutral | Internal transfer between bank accounts |
| **Envelope Allocation** | Neutral | Regular- / Envelope+ | Budgeting money into categories |
| **Envelope Reallocation**| Neutral | Env A- / Env B+ | Moving budget between envelopes |
| **Credit Card Purchase**| Neutral to cash | Envelope- / CC Liability+ | Increases card balance owed |
| **Credit Card Payment** | Decreases bank cash | Decreases CC Liability | Settles card bill; NOT an expense |
| **FD Deposit** | Decreases bank cash | Increases FD Asset | Converting cash to savings asset |
| **FD Liquidation** | Increases bank cash | Decreases FD Asset | Principal + interest payout |
| **Self EMI Repayment** | Decreases Regular | Increases Savings balance | Paying oneself back for past savings |
| **Actual Debt Payment** | Decreases bank cash | Decreases Debt liability | Principal/interest debt reduction |
| **Refund** | Increases liquid cash | Restores envelope balance | Linked to original transaction |
| **Balance Adjustment** | Adjusts account balance | Neutral or Audit entry | Formal reconciliation adjustment |

---

### 2.5 Credit Cards, EMIs & Debts/Loans

#### 2.5.1 Credit Card Management
- **Tracking Fields**: Card name, Issuer, Credit Limit, Outstanding Balance, Available Credit, Utilisation %, Statement Date, Payment Due Date, Statement Balance, Minimum Payment.
- **Utilisation Threshold**: Configurable warning indicator with a recommended target below 30%. Never presented as a legal requirement.
- **Billing Cycle Discipline**: Distinguishes unbilled transactions from closed statement balances.
- **Security Constraint**: Never store full PAN, CVV, expiry dates, or banking passwords.

#### 2.5.2 Unified EMIs Hub (Self EMIs & External EMIs)
- **Self EMIs (Internal Savings Reimbursement)**:
  - Used when a significant purchase is funded upfront from savings, with the intention of paying back savings over several months.
  - Tracks: Description, initial amount drawn from savings, monthly reimbursement target, total reimbursed to date, and remaining balance.
  - Repayment: Inline reimbursement moves money back into savings reserves.
- **External EMIs (Scheduled External Instalments)**:
  - Tracks structured recurring loan instalments owed to external lenders, banks, or finance companies (auto loans, equipment loans, personal loans).
  - Tracks: Lender name, initial principal, monthly instalment, due date, payment records, and remaining debt.
  - Unified view: Metric strip computes combined monthly EMI commitment and total outstanding balance.

#### 2.5.3 Debts & Loans (Manual-Pay Personal & External Borrowing)
- Designed for lump-sum or flexible borrowings (e.g. money borrowed from friends, family, or lenders) that do not follow a strict automated monthly instalment schedule.
- **Tracking Fields**: Lender name, borrowed amount, remaining balance, interest rate (%), due date, notes, and settlement status.
- **Manual Payment Flow**: Mirrors the credit card payment modal:
  - Select source liquid bank account with real-time balance validation.
  - Quick-pay chips (`25%`, `50%`, `Full Balance`).
  - Strict validation capping payment at remaining balance.
  - Atomic ledger transaction logging (`type: 'debt_repayment'`).
  - Auto-marks debt as settled when balance reaches ₹0.

---

### 2.6 Standing Costs & Recurring Needs Engine
A deterministic engine for recurring household and personal obligations:
- **Dual Frequency Scheduling**:
  1. **Interval in Days** (`interval_days`): Repeats every $X$ days for rolling supplies and consumables (e.g. water cans every 15 days, whey protein every 45 days).
  2. **Day of Month** (`monthly_day`): Triggers on a fixed calendar day of each month for regular bills (rent, utilities, WiFi, streaming subscriptions).
- **Real-Time Due Status**: Dynamically calculates status relative to current date (`Due Today`, `Overdue by X days`, `Due in X days`).
- **1-Click Batch Logging**: Users can log due items individually or batch-log all due items with verified source accounts and optional envelope deductions.
- **Normalized 30-Day Monthly Commitment**: Calculates normalized monthly commitment ($\text{amount} \times 30 / \text{interval\_days}$) alongside monthly day sums to give an accurate monthly projection.
- **Rule**: Creating or editing a standing cost does NOT deduct funds until an explicit transaction is logged.

---

### 2.7 Transaction Reversion & 3-Day Rollover Policy
- **Detailed In-App Preview**: When clicking Revert on a transaction, an in-app confirmation modal (`RevertTransactionModal`) displays the exact ledger impact: which accounts will be credited/debited, which envelopes will be refunded/deducted, and card/debt liability updates, naming specific accounts and envelopes.
- **Strict Anti-Negative Envelope Guard**: Reversions are guarded; if an income transaction assigned money to an envelope and that money was subsequently spent, the reversion is rejected to prevent the envelope from dropping below zero.
- **3-Day Month-End Grace Period & Rollover Cascade**: Reversions are permitted for transactions from the current calendar month, plus transactions dated in the final 3 days of the preceding month to accommodate month-end reconciliation. Reverting a previous month transaction updates that month's envelope available balance, and any resulting surplus balance automatically cascades into that envelope's designated rollover policy.
- **Atomic Database Execution**: Reversions execute via `revert_transaction_atomic` in PostgreSQL, preventing partial state mutations.

---

### 2.8 UI/UX Standards, Modals & Mobile Ergonomics
- **Shimmering Skeleton Placeholder Standard**: Empty jumpy text or raw zeroes during data fetching are forbidden. All data surfaces render GPU-composited left-to-right shimmering placeholders (`.skeleton-shimmer`, `Skeleton.tsx`) matching loaded content dimensions.
- **Cross-Device Onboarding Tutorial**: Onboarding completion is stored in the database (`tutorial_completed` on `profiles`) and Supabase Auth metadata. Completing or skipping the tour on one device suppresses it permanently across all user devices.
- **Spotlight Tour UX**: Anchors to dynamic element coordinates, locks page scrolling (`modal-open`), projects an accent pulsating halo (`tour-pulsate-halo`), and features a dedicated 3-button control strip (Skip tutorial, Previous, Next / Finish Tour) without a top-right close 'X'.
- **Chart Tooltip Ergonomics**: Monthly Cashflow and Savings Rate chart tooltips are anchored strictly within the chart boundaries (`<ResponsiveContainer>`), activated only upon direct hover or touch without drifting away.
- **Multi-Density Social Sharing & App Assets**: Full OpenGraph and Twitter card metadata in `index.html` with high-resolution assets (`apple-touch-icon.png`, `favicon-32x32.png`, `favicon-16x16.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `og-image.png`).
- **Centered Modal Experience**: All dialogs and pop-outs render via `ModalPortal` (`createPortal(..., document.body)`) to escape card clipping or backdrop-filter traps, centering automatically across all device viewports with frosted backdrop blur and scroll locking.
- **Zero Horizontal Scrolling**: Controls, filter chips, tabs, and action pills are arranged in responsive wrapping layouts (`flex-wrap`, responsive grids) so 100% of controls are visible at a glance without horizontal scrolling.
- **Touch Target Ergonomics**: All interactive buttons, chips, and close triggers maintain at least a 44px minimum touch target (`min-h-[44px] min-w-[44px]`) with `active:scale-95` tactile feedback. Form controls strictly use `text-base sm:text-sm` (16px on mobile to prevent iOS Safari auto-zoom).
- **Pinned Header Navigation**: The application header is pinned fixed to the top of the viewport (`fixed top-0 left-0 right-0 z-40`) with an explicit spacer (`h-16`) and CSS `scroll-padding-top`.
- **In-App Branded Confirmations**: Native browser `window.confirm` and `window.alert` dialogs are strictly prohibited; all confirmations use the accessible in-app `ConfirmModal` (`useConfirm()`).

---

### 2.9 Reports, Forecasting & Exports
- Monthly cashflow analysis (Total Income vs Total Consumption).
- Envelope spending breakdown and budget variance.
- Credit card utilization and statement payment history.
- Net worth trend (Liquid Cash + FDs - Card Liabilities - Debts).
- Data export in standardized formats (CSV, JSON) for personal backups.

---

### 2.10 Performance & Bundle Architecture
- **Route & Modal Code-Splitting**: Non-critical modals and marketing routes (`CoverPage`, `RecordTransactionModal`, `AccountListModal`, `EnvelopePaymentReceiptModal`, `ReconcileModal`, `RecurringRulesModal`, `ExportDataModal`, `LegalModal`, `SetNameModal`, `ChangeEmailModal`, `SetPasswordModal`, `AccountDeletionModal`, `SpotlightTour`) are code-split via `React.lazy()` and `<React.Suspense fallback={null}>`.
- **Vendor Chunking**: Granular chunking in `vite.config.ts` (`vendor-zod`, `vendor-react`, `vendor-supabase`, `vendor-icons`) limits entry JS size to < 680 kB (159 kB gzipped).
- **Atomic RPCs**: Multi-table operations execute server-side in a single atomic database trip, eliminating client waterfall latency.

---

### 2.11 Future Scope (Version 2)
- Explicitly deferred AI-assisted features: Natural language transaction entry, SMS/receipt parsing, predictive spending alerts, and financial conversational queries.
- Version 1 is 100% complete and fully usable without any AI dependencies.
