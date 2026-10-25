---
description: Create, test, and apply version-controlled Supabase SQL migrations with strict RLS policies.
---

# Database Migration Workflow

## Purpose
Safely evolve the Envello PostgreSQL schema via version-controlled Supabase migrations with strict Row Level Security.

---

## 1. Plan Migration & Schema Changes
1. Identify required tables, columns, indexes, and constraints.
2. Ensure monetary columns use `NUMERIC(12, 2)` or `BIGINT` representing paise.
3. Every table must reference `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`.
4. Define atomic RPC functions for any operation updating multiple balances.

---

## 2. Author Timestamped Migration File
Create a new migration file under `supabase/migrations/`:
```bash
# Naming pattern: YYYYMMDDHHMMSS_descriptive_name.sql
```
Include:
1. `CREATE TABLE IF NOT EXISTS ...`
2. Foreign key constraints with `ON DELETE RESTRICT` for financial accounts.
3. `CHECK` constraints on valid amounts and enum statuses.
4. Performance indexes on `(user_id, created_at DESC)` and foreign keys.
5. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
6. Explicit RLS policies for `SELECT`, `INSERT`, `UPDATE`, `DELETE` using `auth.uid() = user_id`.

---

## 3. Local Verification
1. Apply migration locally:
   ```bash
   npx supabase db reset
   ```
2. Verify table structures, triggers, and constraints.
3. Test RLS policies:
   - Verify authenticated user can only access their own records.
   - Verify unauthenticated requests are rejected.
   - Verify user A cannot query or mutate user B's records.

---

## 4. Production Application Checklist
- Pre-migration database backup taken via Supabase dashboard.
- Verify migration contains no destructive drops of existing active data.
- Run migration and verify application health.
