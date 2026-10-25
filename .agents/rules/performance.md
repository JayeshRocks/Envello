# Performance & Resource Optimization Rules

## Purpose
Maintain fast client load times, small bundle sizes, efficient Supabase queries, and minimal client memory usage in Envello.

---

## 1. Bundle Size & Tree Shaking
- **Direct Icon Imports**: Import icons directly from `lucide-react` (e.g. `import { Wallet } from 'lucide-react'`) to enable effective tree shaking.
- **Vite Code Splitting**: Lazy-load secondary views (e.g. historical reports, settings, export dialogue) using `React.lazy()` and `Suspense`.
- **Dependency Vetting**: Before introducing any new npm package, evaluate its bundle size impact. Never import heavyweight libraries for simple tasks that can be achieved with small native utility functions.

---

## 2. Supabase Query Performance & Caching
- **Selective Column Queries**: Query only the specific columns needed by the view (e.g. `select('id, name, balance')`) rather than `select('*')`.
- **Pagination & Date Range Filtering**: Always apply date filters (`gte`, `lte`) or limit/offset pagination to transaction queries. Never load years of ledger records into client memory at once.
- **Index Alignment**: Ensure foreign keys (`user_id`, `account_id`, `envelope_id`) and sorted columns (`transaction_date`) have matching composite indexes in PostgreSQL.

---

## 3. Chart Rendering & UI Responsiveness
- **Debounced Calculations**: When filtering or projecting future spending targets, debounce input controls to prevent re-computing heavy calculations on every keystroke.
- **Memoized Aggregations**: Use `useMemo` for client-side aggregations (such as category spending sums) so that unrelated component re-renders do not re-calculate totals.
