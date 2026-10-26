# Frontend Engineering Rules

## Purpose
Maintain clean React 19 architecture, strict TypeScript discipline, and clear separation between UI presentation, accounting engine, and Supabase data layers.

---

## 1. Stack Specifications

- **Framework**: React 19 + Vite
- **Language**: TypeScript (strict mode enabled, zero `any`)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Validation**: Zod (for runtime validation of forms, params, and API payloads)
- **State Management**: React Context or lightweight store for UI state; server cache / Supabase client for data sync.

---

## 2. Layer Separation & Domain Purity

Maintain clear boundaries between application layers:
1. **Presentation Layer (`src/components/`)**:
   - Pure UI cards, tables, modal dialogues, form inputs, charts.
   - Do NOT embed raw arithmetic, tax logic, or direct database calls inside presentational components.
2. **Domain & Accounting Engine (`src/lib/accounting/`)**:
   - Pure, deterministic calculation functions (balance math, credit card utilization %, interest calculation, rollover rules).
   - 100% unit-testable without React dependencies or database mocks.
3. **Data Access Layer (`src/lib/api/` or `src/services/`)**:
   - Supabase client queries, RPC calls, error mapping, and type conversions.
4. **Hooks Layer (`src/hooks/`)**:
   - React hooks binding UI components to data services and managing local component state.

---

## 3. TypeScript & Type Safety Discipline

- **Strict Mode**: `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`.
- **Generated Database Types**: Use Supabase CLI generated database types (`supabase gen types typescript`) as the foundation for database entity interfaces.
- **No Suppressions**: Do not bypass type errors with `any`, `as unknown as T`, or `@ts-ignore` without explicit, documented architecture justifications.
- **Explicit Return Types**: All domain calculation functions and service methods must have explicit return type annotations.

---

## 4. UI State & User Feedback Handling

- **Explicit Component States**: Every data-driven view must implement four distinct visual states:
  1. **Loading State**: Clean skeletons or subtle loaders (never blank screens).
  2. **Empty State**: Informative, action-oriented empty states (e.g. "No transactions recorded for this envelope yet").
  3. **Error State**: User-friendly error messages with recovery actions (retry button, clear error).
  4. **Success State**: Clear confirmation for critical actions (transaction recorded, balance reconciled).
- **Destructive Action Confirmation**: All irreversible or consequential actions (deleting an account, resetting an envelope allocation, recording a balance adjustment) must require explicit modal confirmation.
- **No Placeholder Elements**: Completed features must not contain non-functional buttons, dead links, or simulated UI elements.

---

## 5. Mobile & Tablet Responsiveness & Form Ergonomics

- **Input Typography Scale**: All inputs, selects, and textareas must be styled with `text-base sm:text-sm` (16px mobile, 14px tablet/desktop). Never use `sm:text-xs` on form controls.
- **Auto-Zoom Safeguard**: All input elements on mobile viewports (< 640px) must maintain at least 16px font size to prevent iOS Safari auto-zooming into the input.
- **Touch Target Sizing**: Primary interactive elements, modal buttons, and dropdown links must maintain at least a 44px minimum tap target (`min-h-[44px]`).
- **Responsive Dropdowns & Overlays**: Floating dropdowns must constrain their maximum width with responsive formulas (e.g. `w-[min(calc(100vw-24px),22rem)]`) to prevent horizontal screen overflow on 320px–375px screens.
- **Header Actions**: Mobile headers should remain clean and non-crowded (relying on bottom FAB for primary add actions) while tablet headers progressively reveal action buttons.
