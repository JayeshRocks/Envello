# Design & Visual Styling Rules

## Purpose
Guide the visual design system, financial data legibility, responsive layouts, and UI polish in Envello.

---

## 1. Visual Aesthetics & Design System

- **Design Philosophy**: High-precision, modern fintech aesthetic with subtle glassmorphism and clean card elevation. The interface must look and feel like an elite personal finance tool, not a generic admin template.
- **Color Variables & Semantic Palettes**:
  - Semantic financial colors:
    - **Income / Surplus**: Muted Emerald/Teal (e.g. `#10b981` / `#059669`).
    - **Expense / Liability**: Deep Coral/Crimson (e.g. `#ef4444` / `#dc2626`).
    - **Transfers / Movement**: Indigo/Cobalt (e.g. `#6366f1` / `#4f46e5`).
    - **Savings & Investments**: Amber/Gold (e.g. `#f59e0b` / `#d97706`).
  - Dark mode and light mode must both be fully supported with high contrast and balanced luminance.
- **Glassmorphism & Elevation**: Use backdrop blur (`backdrop-blur-md`), subtle borders (`border-white/10` or `border-neutral-200/80`), and soft shadows for cards and tooltips.

---

## 2. Explicit Balance Taxonomy (No Ambiguous "Total Balance")

- **Mandatory Clear Categorization**:
  The user interface must NEVER present a single ambiguous number labeled "Total Balance".
  It must always display the six distinct financial pillars:
  1. **Spendable Cash**: Liquid bank accounts and cash in hand.
  2. **Envelope Allocations**: Funds assigned to specific monthly spending envelopes.
  3. **Savings & Fixed Deposits**: Non-spendable locked assets.
  4. **Credit Card Liabilities**: Outstanding card debt and billing status.
  5. **Actual Debts**: External debt obligations owed to lenders/individuals.
  6. **Monthly Targets**: Forward planning targets (distinguished from cash).

---

## 3. Dark Mode & Hover State Safety

- **Explicit Dark Mode Hover**: When styling elements with dark mode variants, always explicitly declare both light and dark hover states (e.g. `hover:bg-neutral-100 dark:hover:bg-neutral-800`).
- **Disabled State Hover Guard**: When styling interactive elements that can be disabled, use `enabled:hover:` to avoid hovering over disabled buttons.

---

## 4. Typography & Financial Number Formatting

- **Font Family**: Modern sans-serif (e.g. Inter, Outfit, or system-ui) optimized for tabular numbers.
- **Tabular Figures**: Use `font-mono` or `tabular-nums` for all financial figures in tables, cards, and transaction lists to ensure decimal points and digits align vertically.
- **Indian Currency Formatting**: Format all INR figures with the Indian numbering format (`₹1,50,000.00`).
- **Credit Card Utilization**: Display utilization percentages with visual indicators (< 30% green, 30% - 50% yellow, > 50% red). Do not present 30% as an absolute legal rule, but as a healthy financial guideline.

---

## 5. Mobile & Tablet Touch Standards & Layouts

- **Comfortable Touch Targets**: Every button, pill toggle, and modal trigger must provide at least 44px of touch height on mobile devices (`min-h-[44px]`).
- **Visual Feedback on Tap**: All interactive elements must feature subtle active scale feedback (`active:scale-[0.98]` or `active:scale-95`) to give tactile touch confirmation.
- **Form Readability**: Form inputs must never be smaller than 14px on tablets/desktops and must always be 16px on mobile viewports to ensure legible financial data entry without viewport zoom.
- **Dropdown Safe Area**: Never let dropdowns overflow viewport edges. Ensure responsive padding and soft shadow containment.
