---
description: Perform release verification and production deployment checks for Envello on Vercel and Supabase.
---

# Release Checklist Workflow

## Purpose
Ensure zero-defect, secure, and compliant production releases of Envello to Vercel and Supabase.

---

## 1. Static Verification & Quality Gates
- [ ] TypeScript compiles cleanly: `npx tsc -b` (0 errors).
- [ ] ESLint passes with zero warnings: `npm run lint`.
- [ ] Production bundle builds cleanly: `npm run build`.
- [ ] Bundle size analyzed; no unintended heavy dependencies.

---

## 2. Security & Compliance Gates
- [ ] All database migrations applied to production Supabase database.
- [ ] All production tables have Row Level Security (RLS) enabled.
- [ ] Server-enforced private beta allowlist is active.
- [ ] No `service_role` keys or private credentials are in Vercel environment variables prefixed with `VITE_`.
- [ ] OAuth redirect URIs in Supabase Auth match production Vercel domain.

---

## 3. Financial Invariant Sanity Check
- [ ] Transaction creation, editing, and deletion work correctly.
- [ ] Account-to-account transfer updates both balances atomically.
- [ ] Credit card purchase increments liability; card bill repayment settles liability.
- [ ] Emergency envelope remains locked against auto-deductions.
- [ ] Monetary numbers render in Indian formatting (`₹1,50,000.00`) with tabular alignment.

---

## 4. Post-Deployment Smoke Test
- [ ] Log in with authorized Google account on production domain.
- [ ] Verify financial overview renders all 6 balance pillars cleanly.
- [ ] Check browser console: 0 errors, 0 unhandled rejections.
