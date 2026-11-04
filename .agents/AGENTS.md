# Envello — Workspace Agent Rules

These rules apply to any AI agent working on the Envello codebase.

## 1. Accounting Accuracy & Authoritative Source of Truth
- **Rule**: The database is the single authoritative source of truth. All calculations must use integer paise or PostgreSQL `NUMERIC(12, 2)`. Never use binary floating-point calculations for financial amounts.
- **Context**: Inaccurate financial calculations or floating-point rounding errors (e.g., 0.1 + 0.2 = 0.30000000000000004) destroy user trust in a personal finance tool.

## 2. Explicit Balance Taxonomy
- **Rule**: Never display a single ambiguous number labeled "Total Balance". Always explicitly separate:
  1. Liquid Funds (Liquid bank accounts & cash in hand)
  2. Envelope Allocations (Assigned funds for Spendable, Emergency, Savings, and lifestyle categories)
  3. FDs & RDs (Locked term deposits, recurring deposits, and growth assets)
  4. Credit Card Liabilities (Unsettled debt on active credit cards)
  5. Actual Debts (Debts owed to friends, family, or personal lenders)
  6. Monthly Targets & Standing Costs (Planning targets and recurring budget commitments)
- **Context**: Conflating locked savings, fixed deposits, or credit card limits with liquid funds leads to overdrafts, missed payments, and financial distortion. Shorten "Fixed Deposits & Recurring Deposits" to **"FDs & RDs"** on space-constrained UI elements (pills, tabs, summary cards).

## 3. Row Level Security & Zero Trust Client IDs
- **Rule**: Enable RLS on every table without exception. Never accept a `user_id` from the client request body or query params to establish data ownership. All RLS policies must strictly enforce `auth.uid() = user_id`. All PostgreSQL functions must follow least-privilege grants (`REVOKE EXECUTE FROM PUBLIC, anon`) and assert caller identity in `SECURITY DEFINER` functions.
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

## 7. Atomic Financial Operations, Envelope Rearranging, Account Holds & Ghost Banks
- **Rule**: Multi-table updates (account transfers, debt repayments, envelope reallocations) must execute inside database transactions or secure PostgreSQL RPC functions. Users have total control over all envelopes: every envelope can be edited, renamed, customized, rearranged (via move arrows and drag-and-drop, backed by `sort_order`), and deleted (no permanently locked system envelopes). Default envelopes (Spendable, Emergency, Savings) spawn automatically upon workspace initialization. Any envelope can be toggled as a "Protected Reserve" styled in emerald green; on cards it displays a compact green shield symbol that expands on click to reveal full details. It requires explicit user authorization warnings and confirmation checkboxes before funds can be withdrawn or debited for expenses (Emergency and Savings have this enabled by default). Credit cards and EMIs are direct liabilities/repayments tracked under Cards & Debts, never envelopes. Envelopes can NEVER be overspent into negative balances (`amountPaise <= availablePaise`). Allocating funds to an envelope places a hold on backing liquid accounts (`envelope_allocation_sources`); accounts display physical bank balance, reserved holds, and free unallocated balance. Budgeting supports funding from multiple liquid accounts via "Add from another account" with locked previous selectors and row-level revert buttons; each account contribution is strictly guarded against exceeding that account's available headroom ($\text{unallocatedPaise} + \text{existingHoldOnEnvelope} \le \text{balancePaise}$) to prevent over-allocation. In expense flows, envelopes act as "Ghost Banks" that greedily deduct from backing accounts (largest first) and display a real-life settlement receipt prompt ("Mark as completed" & 1-click "Revert this Transaction"). Direct spending from accounts (bills, card/loan repayments) can never exceed free unallocated funds (`amountPaise <= unallocatedPaise`). Envelope transfers shift backing account holds without data loss. Envelope cards feature card-wide click-to-view allocation triggers, enlarged quick action buttons (Edit, Transfer, Modify Budget) with stopPropagation containment, and a "View Allocation →" link opening the backing account hold breakdown prompt.
- **Context**: Prevents partial failure scenarios and ensures financial invariants remain unbreakable while giving the user absolute sovereignty over their budgeting compartments and layout order.

## 8. Mobile & Tablet Form Ergonomics, Centered Modals & In-App Prompts
- **Rule**: All form inputs, selects, and textareas must use `text-base sm:text-sm` (16px on mobile, 14px on tablet/desktop). Never use `sm:text-xs` (12px). All primary touch actions, dropdown items, quick actions, tab pills, and modal close triggers must meet the 44px minimum touch target (`min-h-[44px] min-w-[44px]`) with `active:scale-95` tactile feedback. All modals and pop-out forms must be rendered via `ModalPortal` (`createPortal(..., document.body)`) to escape parent cards with `overflow-hidden` or `backdrop-filter`, and must automatically center to the viewport on all device sizes (`flex items-center justify-center p-3 sm:p-4 md:p-6`, `rounded-2xl sm:rounded-3xl`, `max-h-[90vh] sm:max-h-[88vh] overflow-y-auto`) with high-contrast borders and smooth backdrop blur. Never hide buttons or tabs behind horizontal scrolling (`overflow-x-auto`, `scrollbar-none`); arrange tab strips, quick action pills, and filter buttons in responsive wrapping layouts (`flex-wrap`, responsive grids) so 100% of controls are visible at a glance on PC, tablet, and phone. The application header is pinned fixed to the top of the viewport (`fixed top-0 left-0 right-0 z-40`) with an explicit spacer (`h-16`) and CSS `scroll-padding-top`. Native browser `window.confirm` and `window.alert` dialogs are strictly prohibited; use the in-app `ConfirmModal` (`useConfirm()`). `html`, `body`, and `#root` must enforce strict horizontal containment (`width: 100%; max-width: 100%; overflow-x: hidden; position: relative;`) and `-webkit-text-size-adjust: 100%`. Sections with background blurs/glows must be wrapped in `overflow-hidden` to prevent layout blowout and zoom-out margin gutter bugs.
- **Context**: Mobile inputs below 16px trigger iOS Safari auto-zoom. Rendering fixed-position modals inside containers with `backdrop-filter` or `overflow-hidden` traps and clips the modal within that container, breaking viewport centering. Using `ModalPortal` teleports modals to `document.body` for true edge-to-edge backdrop coverage and centering. Custom modals and pinned headers provide a polished, consistent user experience.


## 9. Transactional Emails & Resend Custom SMTP
- **Rule**: Supabase Auth transactional emails are powered by Resend custom SMTP. All email templates must be production-ready HTML, free of temporary beta markers, and reference the official hosted brand logo (`public/logo.png`).
- **Context**: Delivers high deliverability, consistent typography, and cohesive branding across the full user lifecycle.

## 10. Legal Compliance, Privacy Policies, & OAuth Routing
- **Rule**: Envello must provide accessible, responsive Privacy Policy and Terms of Service interfaces accessible via direct URL routing (`/privacy`, `/terms`, `/#privacy`, `/#terms`). Auth forms must link to terms, and external OAuth reviewers must receive valid public endpoints.
- **Context**: Required for Google OAuth verification, GDPR/CCPA compliance, and establishing clear legal boundaries (e.g. non-investment-advisor disclaimer) for a personal financial management tool.

## 11. Account Deletion & 30-Day Closure Lifecycle
- **Rule**: Account closure strictly adheres to the 30-day grace period stated in the Terms of Service and Privacy Policy. When requested, an account transitions to `pending_deletion` with `scheduled_deletion_at = now() + 30 days`. Signing in during this window displays a persistent warning banner with 1-click restoration (`cancel_account_deletion`). Past 30 days, an automated sweep permanently cascades and purges all financial records. Users also retain the right to bypass the 30 days and execute an immediate wipe via explicit typed email confirmation.
- **Context**: Prevents catastrophic accidental data loss while honoring GDPR/CCPA data erasure and regulatory compliance commitments.

## 12. Month-End Rollover Policies & Transaction Reversions
- **Rule**: Envelopes enforce three deterministic rollover mechanics at the month boundary:
  1. `carry_forward`: Retain unspent funds in this envelope and maintain backing liquid account holds.
  2. `sweep_to_regular`: Transfer unused budget surplus to the Spendable envelope at month-end.
  3. `reset`: Release unspent funds and account holds back to the backing bank account's free unallocated balance.
  Transaction reversions require a detailed in-app modal preview explaining the exact double-entry ledger impact across accounts, envelopes, cards, and debts before confirmation, referencing target accounts and envelopes by name. Reversions are permitted only for transactions from the current calendar month, plus a 3-day grace period for transactions dated in the final 3 days of the preceding month. The reversion engine must reject any reversion that would cause an envelope's available balance to drop below zero (e.g., if income assigned to an envelope was already spent).
- **Context**: Protects historical monthly budget snapshots while accommodating human corrections right after month rollover without corrupting ledger integrity.

## 13. Dual-Mode Recurring Costs Engine
- **Rule**: Recurring commitments support two deterministic scheduling cadences:
  1. **Interval in Days** (`interval_days`): repeat every $X$ days for rolling consumable needs (e.g., water cans every 15 days, protein every 45 days).
  2. **Day of Month** (`monthly_day`): trigger on a fixed day of each month for regular monthly bills (rent, utilities, subscriptions).
  Due dates are evaluated dynamically in real time (`Due Today`, `Overdue by X days`, `Due in X days`). The UI provides 1-click batch logging and calculates normalized 30-day monthly commitments ($\text{amount} \times 30 / \text{interval\_days}$) alongside monthly day sums.
- **Context**: Accurately models real-life household cash flow where not all recurring costs fall cleanly on calendar month dates.

## 14. Definition of Done
- **Rule**: A feature or fix is done ONLY after:
  `Plan -> Implement -> Lint (npm run lint) -> Build (npm run build) -> Verify`
  Never leave placeholder buttons, pretend actions, or unhandled errors.
