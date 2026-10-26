## 📝 Description
Provide a clear and concise summary of the changes proposed in this Pull Request.

Fixes #(issue)

---

## 🏛️ Financial & Accounting Invariants
- [ ] Uses integer paise / fixed-point math (`₹1.00 = 100 paise`). **No floating-point arithmetic.**
- [ ] Preserves the 6-pillar balance taxonomy without conflating liquid assets and liabilities.
- [ ] Multi-table financial operations are atomic (executed in database transactions or RPCs).

---

## 🔒 Security & Authorization Check
- [ ] RLS policies enabled and verified for all touched tables/views.
- [ ] `auth.uid() = user_id` enforced in database policies (no trust in client-sent user IDs).
- [ ] No secrets, private API keys, or service role keys exposed in client bundles.

---

## 📱 Mobile & Tablet Ergonomics
- [ ] Form inputs use `text-base sm:text-sm` (16px on mobile to prevent iOS Safari auto-zoom).
- [ ] Minimum 44px touch targets on all interactive elements (`min-h-[44px]`).

---

## ✅ Quality Checklist
- [ ] `npm run lint` (`tsc -b`) passes with 0 errors.
- [ ] `npm run test` passes all accounting invariant tests.
- [ ] `npm run build` succeeds without build warnings or bundle regressions.
- [ ] Corresponding documentation or migration scripts in `supabase/migrations/` updated.
