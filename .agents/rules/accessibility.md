# Accessibility & Inclusion Rules

## Purpose
Ensure Envello meets WCAG 2.1 AA accessibility standards for financial interfaces, tabular data, form inputs, and modal dialogues.

---

## 1. Semantic Structure & Landmarks
- Use semantic HTML landmarks: `<header>`, `<main>`, `<nav>`, `<section>`, `<aside>`, `<table>`, `<dialog>`.
- Keep clean heading hierarchy (`<h1>` -> `h2` -> `h3`) without skipping levels for visual styling.
- Use native `<button>` for actions and `<a>` for page navigations.

---

## 2. Accessible Financial Tables & Numbers
- Tabular financial ledgers must use proper `<table>`, `<thead>`, `<tbody>`, `<th> scope="col"`, and `<td>` markup.
- For screen readers, provide clear descriptions of credit/debit statuses (e.g. `aria-label="Debited 500 rupees"` rather than just `-₹500` in red text).
- Avoid relying solely on color (green vs red) to convey positive/negative cashflow. Always pair colors with icons or textual indicators (+ / -).

---

## 3. Keyboard Navigation & Focus Management
- Form inputs, buttons, and dropdowns must display visible focus rings (`focus-visible:ring-2 focus-visible:ring-primary`).
- Modal dialogues (transaction entry, account creation, confirmation prompts) must trap focus inside the modal and return focus to the trigger button when closed.
- Support `Escape` key to close modals, drawers, and popovers.

---

## 4. Contrast & Readability
- Maintain a minimum 4.5:1 text-to-background contrast ratio for normal text and 3:1 for large text across both light and dark themes.
- Form inputs must have distinct borders and accessible `<label>` elements connected via `htmlFor`.
