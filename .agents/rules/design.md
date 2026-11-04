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
  2. **Envelope Allocations**: Funds assigned to specific monthly spending envelopes (Spendable, Emergency, Savings, and lifestyle categories).
  3. **FDs & RDs**: Locked term deposits, recurring deposits, and long-term growth assets. Shorten to **"FDs & RDs"** on space-constrained UI elements (cards, navigation pills, tab headers).
  4. **Credit Card Liabilities**: Outstanding card debt and billing status (managed under Cards & Debts, NOT envelopes).
  5. **Actual Debts**: External debt obligations owed to lenders/individuals.
  6. **Monthly Targets & Standing Costs**: Forward planning targets and recurring schedule commitments (distinguished from spendable cash).

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

## 5. Mobile & Tablet Touch Standards, Centered Modals & Wrapping Layouts

- **Comfortable Touch Targets**: Every button, pill toggle, quick-action trigger, and modal close button must provide at least 44px of touch height on mobile devices (`min-h-[44px] min-w-[44px]`).
- **Visual Feedback on Tap**: All interactive elements must feature subtle active scale feedback (`active:scale-[0.98]` or `active:scale-95`) to give tactile touch confirmation.
- **Form Readability & iOS Zoom Prevention**: Form inputs, selects, and textareas must always use `text-base sm:text-sm` (16px on mobile viewports to prevent iOS Safari auto-zoom, 14px on tablet and desktop). Never use cramped `sm:text-xs` (12px).
- **Centered Modal Experience & Portal Isolation**: All pop-out forms and modals must be rendered via `ModalPortal` (`createPortal(..., document.body)`) to escape parent containers with `overflow-hidden` or `backdrop-filter`. Modals automatically center to the viewport across all screen sizes (`flex items-center justify-center p-3 sm:p-4 md:p-6`, `rounded-2xl sm:rounded-3xl`, `max-h-[90vh] sm:max-h-[88vh] overflow-y-auto`) with high-contrast borders and frosted backdrop blur. Body and documentElement scroll locking (`html.modal-open, body.modal-open`) and overscroll containment (`overscroll-behavior: contain`) isolate background touch and scroll events.
- **Zero Horizontal Scrolling & Visible Button Layouts**: Never hide buttons, tabs, quick amount chips, or category filters behind horizontal scrolling (`overflow-x-auto`, `scrollbar-none`, `flex-nowrap`). All buttons, tabs, and action pills must be arranged in responsive wrapping layouts (`flex flex-wrap gap-2`, `grid grid-cols-2 xs:grid-cols-3 md:flex`) so 100% of controls are visible at a glance on PC, tablet, and phone without horizontal scrolling.
- **Pinned Header Navigation**: The application header is pinned fixed to the top of the viewport (`fixed top-0 left-0 right-0 z-40`) with an explicit spacer (`h-16`) and CSS `scroll-padding-top` to follow the user during scrolling without obscuring content or anchor targets.
- **In-App Custom Confirmation Prompts**: Native browser `window.confirm` and `window.alert` dialogs are strictly prohibited. All destructive or consequential user actions (deleting accounts, cards, recurring rules, or reverting transactions) must use the accessible in-app `ConfirmModal` (`useConfirm()`).
- **Dropdown Safe Area**: Never let dropdowns overflow viewport edges. Ensure responsive width capping (`w-[min(calc(100vw-24px),22rem)]`) and soft shadow containment.
- **Viewport Containment**: `html`, `body`, and `#root` must enforce strict horizontal containment (`width: 100%; max-width: 100%; overflow-x: hidden; position: relative;`) and `-webkit-text-size-adjust: 100%`. Decorative glow and blur sections must be wrapped in `overflow-hidden` to prevent layout blowout and zoom-out margin gutter bugs.

---

## 6. Shimmering Skeleton System & Spotlight Aesthetics

- **Left-to-Right Shimmering Skeletons**:
  - All loading skeletons use `.skeleton-shimmer` with a sweeping left-to-right gradient wave (`@keyframes shimmerWave`) from transparent to `rgba(255, 255, 255, 0.08)` (dark mode) or `rgba(0, 0, 0, 0.04)` (light mode).
  - Background surface uses `bg-neutral-800/40` with subtle border `border-neutral-700/30` to blend naturally with dark glassmorphic cards.
  - Skeletons must mirror target text, badge, or card heights (`h-4`, `h-6`, `h-9`, `h-10`) with matching rounded corners (`rounded-lg`, `rounded-xl`).
- **Spotlight Tour Visual System**:
  - Target elements are framed with an absolute bounding outline (`border-2 border-sky-400/80` or `emerald-400/80`) with an expanding outer halo pulse (`tour-pulsate-halo`).
  - Darkened viewport cutout backdrop (`rgba(0, 0, 0, 0.75)`) spotlights the active control while suppressing background distractions.
  - Controls card uses elevated glassmorphism (`backdrop-blur-xl bg-neutral-900/95 border border-white/10`) with step progress indicator and 3 tactile buttons.
- **Multi-Density App Brand Icons**:
  - High-resolution SVG vectors and pre-rendered PNG icons (`public/logo.png`, `apple-touch-icon.png`, `favicon-32x32.png`, `android-chrome-512x512.png`, `og-image.png`) must maintain crisp edge rendering without downsampling blur across standard, @2x, and @3x mobile screens.

