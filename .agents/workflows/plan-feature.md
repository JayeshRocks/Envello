---
description: Create a detailed, implementation-ready plan for a new feature in Envello without writing code.
---

# Plan Feature Workflow

## Purpose
Create a detailed, implementation-ready plan for a new feature or modification in Envello before writing any code.

---

## 1. Understand Intent & Financial Invariants

Before designing the feature:
1. Read the user request carefully.
2. Review relevant project documentation:
   - [`docs/PRODUCT_SPEC.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/docs/PRODUCT_SPEC.md) (Feature behavior)
   - [`docs/ACCOUNTING_RULES.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/docs/ACCOUNTING_RULES.md) (Accounting constraints)
   - [`docs/DATABASE_DESIGN.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/docs/DATABASE_DESIGN.md) (Schema impacts)
   - [`docs/SECURITY.md`](file:///c:/Users/Jayesh%20Yadav/Documents/Github%20Repos/Envelo/docs/SECURITY.md) (RLS & auth boundaries)
3. Check project rules in `.agents/rules/`:
   - `accounting.md` (Integer paise, balance category separation, double-sided consistency)
   - `security.md` (RLS policies, zero-trust client IDs)
   - `frontend.md` (Domain separation, strict TypeScript)
   - `design.md` (No single ambiguous total balance, tabular numbers)

---

## 2. Impact Assessment

Evaluate the impact across:
- **Ledger & Accounting**: Does this feature create new transactions, alter balances, or touch multiple accounts? Are monetary values handled in integer paise?
- **Database Schema & RLS**: Does this require a new table or column? What RLS policies are needed? Does it need an atomic PostgreSQL RPC function?
- **UI & Balance Presentation**: Does it fit into the 6 standard balance pillars? What are the loading, empty, and error states?
- **Performance & Cost**: Does it stay within Supabase Free and Vercel Hobby limits?

---

## 3. Implementation Plan Document

Create an implementation plan artifact containing:
- **Goal Description**: Clear summary of what the feature does.
- **Accounting & Data Model Impact**: Detailed database and calculation breakdown.
- **Component Changes**: List of files to create, modify, or delete (`[NEW]`, `[MODIFY]`, `[DELETE]`).
- **Security & Authorization Review**: RLS policy specs and input validation schemas.
- **Verification Plan**: Step-by-step automated and manual testing steps to prove correctness.

---

## 4. User Review & Approval

Present the plan to the user and obtain explicit confirmation before proceeding to code implementation.
