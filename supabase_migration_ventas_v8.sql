-- ============================================================
--  TerraSupply — Migración v8: proveedor/tienda del producto
--  Ejecuta este script en: Supabase → SQL Editor → New Query
--  (Aplícalo después de supabase_migration_ventas_v7.sql)
-- ============================================================

alter table products
  add column if not exists supplier text;

-- ─────────────────────────────────────────
--  FIN DE LA MIGRACIÓN
-- ─────────────────────────────────────────
