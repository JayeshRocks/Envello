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

## 8. Mobile & Tablet Form Ergonomics
- **Rule**: All form inputs, selects, and textareas must use `text-base sm:text-sm` (16px on mobile, 14px on tablet/desktop). Never use `sm:text-xs` (12px). All primary touch actions, dropdown items, and modal triggers must meet the 44px minimum touch target height (`min-h-[44px]`).
- **Context**: Mobile inputs below 16px trigger iOS Safari auto-zoom, and tiny 12px inputs on tablets cause eye strain and mis-taps.

## 9. Transactional Emails & Resend Custom SMTP
- **Rule**: Supabase Auth transactional emails are powered by Resend custom SMTP. All email templates must be production-ready HTML, free of temporary beta markers, and reference the official hosted brand logo (`public/logo.png`).
- **Context**: Delivers high deliverability, consistent typography, and cohesive branding across the full user lifecycle.

## 10. Legal Compliance, Privacy Policies, & OAuth Routing
- **Rule**: Envello must provide accessible, responsive Privacy Policy and Terms of Service interfaces accessible via direct URL routing (`/privacy`, `/terms`, `/#privacy`, `/#terms`). Auth forms must link to terms, and external OAuth reviewers must receive valid public endpoints.
- **Context**: Required for Google OAuth verification, GDPR/CCPA compliance, and establishing clear legal boundaries (e.g. non-investment-advisor disclaimer) for a personal financial management tool.

## 11. Account Deletion & 30-Day Closure Lifecycle
- **Rule**: Account closure strictly adheres to the 30-day grace period stated in the Terms of Service and Privacy Policy. When requested, an account transitions to `pending_deletion` with `scheduled_deletion_at = now() + 30 days`. Signing in during this window displays a persistent warning banner with 1-click restoration (`cancel_account_deletion`). Past 30 days, an automated sweep permanently cascades and purges all financial records. Users also retain the right to bypass the 30 days and execute an immediate wipe via explicit typed email confirmation.
- **Context**: Prevents catastrophic accidental data loss while honoring GDPR/CCPA data erasure and regulatory compliance commitments.

## 12. Definition of Done
- **Rule**: A feature or fix is done ONLY after:
  `Plan -> Implement -> Lint (npm run lint) -> Build (npm run build) -> Verify`
  Never leave placeholder buttons, pretend actions, or unhandled errors.
