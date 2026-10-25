---
description: Implement an approved feature in Envello according to project rules, accounting invariants, and design system.
---

# Implement Feature Workflow

## Purpose
Execute the implementation of an approved feature plan in Envello while maintaining strict type safety, zero-defect accounting, and clean verification.

---

## 1. Pre-Implementation Checklist
1. Review the approved implementation plan.
2. Verify local development server and Supabase environment are running.
3. Review related files before making changes.

---

## 2. Implementation Execution Order
Follow a bottom-up implementation strategy:
1. **Database Schema & Migrations**:
   - Write timestamped migration in `supabase/migrations/`.
   - Define tables, foreign keys, `CHECK` constraints, and RLS policies.
   - Write atomic RPC functions for multi-table updates.
2. **Domain & Accounting Logic**:
   - Write pure calculation functions in `src/lib/accounting/` with integer paise.
   - Write unit tests verifying edge cases and invariants.
3. **Data Access Services**:
   - Add Supabase query functions and Zod input validation in `src/services/` or `src/lib/api/`.
4. **React Hooks & State**:
   - Create custom hooks managing queries, mutations, and local state.
5. **UI Components & Pages**:
   - Build accessible components adhering to the design system.
   - Implement loading skeletons, empty states, error banners, and success feedback.

---

## 3. Strict Verification Pipeline
Run the full verification suite before declaring completion:
1. `npm run lint` — Must report 0 errors and 0 warnings.
2. `npm run build` or `npx tsc -b` — Must compile cleanly with 0 TypeScript errors.
3. **Runtime Verification**:
   - Verify balance calculations match accounting invariants.
   - Test empty states, validation error messages, and form submissions.
   - Check dark/light mode rendering and contrast.
