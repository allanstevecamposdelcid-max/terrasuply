-- ============================================================
--  TerraSupply — Migración: descripción de la venta
--  Ejecuta este script en: Supabase → SQL Editor → New Query
--  (Aplícalo después de supabase_migration_ventas_v2.sql)
-- ============================================================

-- ─────────────────────────────────────────
--  1. NUEVA COLUMNA EN SALES
-- ─────────────────────────────────────────
alter table sales
  add column if not exists description text;

-- ─────────────────────────────────────────
--  2. RPC: create_sale_multi (v3)
--     Se elimina la versión anterior porque cambia la firma
--     (nuevo parámetro: descripción de la venta).
--     Se incluyen ambas firmas previas posibles por si la
--     migración v2 todavía no se había ejecutado.
-- ─────────────────────────────────────────
drop function if exists create_sale_multi(text, text, jsonb, numeric);
drop function if exists create_sale_multi(text, text, text, jsonb, numeric, numeric);

create or replace function create_sale_multi(
  p_customer_name     text,
  p_customer_phone    text,
  p_customer_address  text,
  p_items             jsonb,
  p_dtf_cost          numeric,
  p_advance_payment   numeric default 0,
  p_description       text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_sale_id  uuid;
  v_total    numeric := 0;
  v_item     jsonb;
begin
  -- Calcula el total sumando qty * unit_price de cada ítem
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_total := v_total
      + (v_item->>'qty')::integer
      * (v_item->>'unit_price')::numeric;
  end loop;

  -- Inserta la venta (incluye dirección, anticipo y descripción)
  insert into sales (
    customer_name, customer_phone, customer_address,
    total, dtf_cost, advance_payment, description
  )
  values (
    p_customer_name,
    p_customer_phone,
    p_customer_address,
    v_total,
    coalesce(p_dtf_cost, 0),
    coalesce(p_advance_payment, 0),
    p_description
  )
  returning id into v_sale_id;

  -- Inserta cada ítem (incluye imagen del producto) y descuenta stock
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into sale_items (
      sale_id, product_id, product_name, qty, unit_price, unit_cost, image_url
    )
    values (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      (v_item->>'qty')::integer,
      (v_item->>'unit_price')::numeric,
      (v_item->>'unit_cost')::numeric,
      v_item->>'image_url'
    );

    update products
    set stock = stock - (v_item->>'qty')::integer
    where id = (v_item->>'product_id')::uuid;
  end loop;

  return v_sale_id;
end;
$$;

-- ─────────────────────────────────────────
--  FIN DE LA MIGRACIÓN
-- ─────────────────────────────────────────
