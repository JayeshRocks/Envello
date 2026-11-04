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
  1. **Loading State**: Render left-to-right shimmering skeleton placeholders (`.skeleton-shimmer`, `Skeleton.tsx`) matching the geometry and layout of the eventual data. Never render jarring raw zeroes or empty flashing text.
  2. **Empty State**: Informative, action-oriented empty states (e.g. "No transactions recorded for this envelope yet").
  3. **Error State**: User-friendly error messages with recovery actions (retry button, clear error).
  4. **Success State**: Clear confirmation for critical actions (transaction recorded, balance reconciled).
- **Destructive Action Confirmation**: All irreversible or consequential actions (deleting an account, card, recurring rule, or reverting a transaction) must require explicit in-app confirmation using `ConfirmModal` (`useConfirm()`). Native browser `window.confirm` and `window.alert` dialogs are strictly prohibited.
- **Previous Month View-Only Lock**: Historical months accessed via the month selector are strictly read-only. All edit and reallocation actions must be disabled, and an informative guidance banner must instruct the user to return to the current month to adjust envelopes.
- **No Placeholder Elements**: Completed features must not contain non-functional buttons, dead links, or simulated UI elements.

---

## 5. Mobile & Tablet Responsiveness, Centered Modals & Ergonomics

- **Input Typography Scale**: All inputs, selects, and textareas must be styled with `text-base sm:text-sm` (16px mobile, 14px tablet/desktop). Never use `sm:text-xs` on form controls.
- **Auto-Zoom Safeguard**: All input elements on mobile viewports (< 640px) must maintain at least 16px font size to prevent iOS Safari auto-zooming into the input.
- **Touch Target Sizing**: Primary interactive elements, modal action buttons, tab pills, and modal close triggers must maintain at least a 44px minimum tap target (`min-h-[44px] min-w-[44px]`) on touch viewports with `active:scale-95` tactile feedback.
- **Centered Modal Experience & Portal Isolation**: All pop-out forms and modals must be rendered via `ModalPortal` (`createPortal(..., document.body)`) to escape parent containers with `overflow-hidden` or `backdrop-filter`. Modals automatically center to the viewport on all device sizes (`flex items-center justify-center p-3 sm:p-4 md:p-6`, `rounded-2xl sm:rounded-3xl`, `max-h-[90vh] sm:max-h-[88vh] overflow-y-auto`) with high-contrast borders and smooth backdrop blur. Body and documentElement scroll locking (`html.modal-open, body.modal-open`) and overscroll containment (`overscroll-behavior: contain`) isolate background touch events.
- **Zero Horizontal Scrolling & Visible Button Layouts**: Never hide buttons, tabs, quick amount chips, or category filters behind horizontal scrolling (`overflow-x-auto`, `scrollbar-none`, `flex-nowrap`). All buttons, tabs, and action pills must be arranged in responsive wrapping layouts (`flex flex-wrap gap-2`, `grid grid-cols-2 xs:grid-cols-3 md:flex`) so 100% of controls are visible at a glance on PC, tablet, and phone without horizontal scrolling.
- **Spotlight Onboarding Tour Ergonomics**: The onboarding tour must lock document scrolling (`modal-open`), track the absolute viewport bounding box of target elements, project an emerald/sky pulsating halo (`tour-pulsate-halo`), and provide a clean 3-button control strip (Skip tutorial, Previous, Next / Finish Tour) without a top-right close 'X'.
- **Chart Tooltip Containment**: Charts must anchor tooltips firmly within the chart container bounds, visible only upon direct hover or active touch, and display solely the targeted data point without drifting.
- **Pinned Header Navigation**: The application header is pinned fixed to the top of the viewport (`fixed top-0 left-0 right-0 z-40`) with an explicit spacer (`h-16`) and CSS `scroll-padding-top` to follow the user during scrolling without obscuring content or anchor targets.
- **Responsive Dropdowns & Overlays**: Floating dropdowns must constrain their maximum width with responsive formulas (e.g. `w-[min(calc(100vw-24px),22rem)]`) to prevent horizontal screen overflow on 320px–375px screens.
- **Header Actions**: Mobile headers should remain clean and non-crowded (relying on bottom FAB for primary add actions) while tablet headers progressively reveal action buttons.
- **Compliance Routing Support**: Ensure compliance routes (`/privacy`, `/terms`, `/#privacy`, `/#terms`) are supported at the top-level router/app layer to enable external verification crawlers and direct user access.

