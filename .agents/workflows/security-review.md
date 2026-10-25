---
description: Perform a multi-point security, authorization, and secret audit on Envello code and database policies.
---

# Security Review Workflow

## Purpose
Systematically audit the Envello codebase, database schemas, API surfaces, and authorization controls for security flaws and credential exposure.

---

## 1. Row Level Security & Access Control Audit
- [ ] Every table in `supabase/migrations/` has `ENABLE ROW LEVEL SECURITY;`.
- [ ] Every table has explicit policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
- [ ] `auth.uid() = user_id` is enforced in all policies without bypassing filters.
- [ ] No policy trusts client-supplied `user_id` parameters.
- [ ] SQL functions marked `SECURITY DEFINER` explicitly check `auth.uid()` or are restricted to trusted scopes.
- [ ] The server-enforced private beta allowlist prevents unauthorized accounts from reading financial data.

---

## 2. Secrets & Credential Protection
- [ ] `.env` is listed in `.gitignore` and has never been committed.
- [ ] No Supabase `service_role` keys exist anywhere in frontend code or `VITE_*` environment variables.
- [ ] No API keys, passwords, private tokens, or test credentials are committed to Git.
- [ ] Console logs and error handlers never print sensitive tokens or account details.

---

## 3. Injection, XSS, and Input Validation
- [ ] All client inputs (amounts, account IDs, dates, descriptions) are validated using Zod schemas.
- [ ] SQL queries use PostgREST client parameterization; no raw concatenated SQL strings.
- [ ] User descriptions and notes rendered in the DOM are properly escaped.

---

## 4. Reporting & Remediation
Document findings in a security review report:
- Severity level: `Critical`, `High`, `Medium`, `Low`.
- Location: File path and line numbers.
- Remediation: Exact fix required before release.
