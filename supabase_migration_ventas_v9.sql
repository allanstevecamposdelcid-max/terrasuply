-- ============================================================
--  TerraSupply — Migración v9: gastos fijos (recurrentes)
--  Ejecuta este script en: Supabase → SQL Editor → New Query
--  (Aplícalo después de supabase_migration_ventas_v8.sql)
-- ============================================================

alter table expenses
  add column if not exists is_fixed boolean not null default false;

-- ─────────────────────────────────────────
--  FIN DE LA MIGRACIÓN
-- ─────────────────────────────────────────
