# Performance & Resource Optimization Rules

## Purpose
Maintain fast client load times, small bundle sizes, efficient Supabase queries, and minimal client memory usage in Envello.

---

## 1. Bundle Size & Tree Shaking
- **Direct Icon Imports**: Import icons directly from `lucide-react` (e.g. `import { Wallet } from 'lucide-react'`) to enable effective tree shaking.
- **Vite Route & Modal Code Splitting**: Lazy-load heavy routes and secondary modals (`CoverPage`, `RecordTransactionModal`, `AccountListModal`, `EnvelopePaymentReceiptModal`, `ReconcileModal`, `RecurringRulesModal`, `ExportDataModal`, `LegalModal`, `SetNameModal`, `ChangeEmailModal`, `SetPasswordModal`, `AccountDeletionModal`, `SpotlightTour`) using `React.lazy()` and `<React.Suspense fallback={null}>`.
- **Vendor Chunking Strategy**: Group high-impact dependencies into dedicated manual vendor chunks in `vite.config.ts` (`vendor-zod`, `vendor-react`, `vendor-supabase`, `vendor-icons`). Keep the entry JavaScript payload below 700 kB (under 160 kB gzipped).
- **Dependency Vetting**: Before introducing any new npm package, evaluate its bundle size impact. Never import heavyweight libraries for simple tasks that can be achieved with small native utility functions.

---

## 2. Supabase Query Performance & Atomic RPCs
- **Atomic PostgreSQL RPCs**: High-frequency or multi-table state updates (such as budgeting allocations, account hold distributions, and transaction reversals) must execute via atomic RPC functions (`upsert_envelope_allocation_atomic`, `revert_transaction_atomic`, `execute_account_transfer`). This collapses multi-step client waterfall queries into a single database roundtrip, eliminating lag and choppy UI state updates.
- **Parallel Query Dispatching**: Independent data hooks should initiate queries in parallel using `Promise.all` or concurrent Supabase calls rather than sequential `await` cascades.
- **Selective Column Queries**: Query only the specific columns needed by the view (e.g. `select('id, name, balance')`) rather than `select('*')`.
- **Pagination & Date Range Filtering**: Always apply date filters (`gte`, `lte`) or limit/offset pagination to transaction queries. Never load years of ledger records into client memory at once.
- **Index Alignment**: Ensure foreign keys (`user_id`, `account_id`, `envelope_id`) and sorted columns (`transaction_date`) have matching composite indexes in PostgreSQL.

---

## 3. Shimmering Skeleton Placeholders & Perceived Speed
- **GPU-Accelerated Shimmer Wave**: Always render left-to-right shimmering skeleton placeholders (`.skeleton-shimmer`, `Skeleton.tsx`) while awaiting network requests. Use CSS gradient animation with `transform: translateZ(0)` or `will-change: transform` to run at a consistent 60fps without triggering layout recalculations.
- **Zero Content Jitter**: Match skeleton placeholder geometry (height, width, border radius) precisely to the loaded content to guarantee zero layout shift (CLS = 0).

---

## 4. Chart Rendering & UI Responsiveness
- **Debounced Calculations**: When filtering or projecting future spending targets, debounce input controls to prevent re-computing heavy calculations on every keystroke.
- **Memoized Aggregations**: Use `useMemo` for client-side aggregations (such as category spending sums) so that unrelated component re-renders do not re-calculate totals.
- **Contained Tooltip Bounds**: Charts using Recharts must contain tooltips strictly within viewport and chart element bounds to eliminate DOM detaching or offscreen overflow.
