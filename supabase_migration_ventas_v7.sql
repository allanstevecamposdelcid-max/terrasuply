-- ============================================================
--  TerraSupply — Migración v7: email del cliente
--  Permite crear "pedidos manuales" (solo seguimiento, sin
--  productos) con los mismos datos de contacto que tenía el
--  admin del sitio externo de tracking (cliente, teléfono, email).
--  Ejecuta este script en: Supabase → SQL Editor → New Query
--  (Aplícalo después de supabase_migration_ventas_v6.sql)
-- ============================================================

alter table sales
  add column if not exists customer_email text;

-- ─────────────────────────────────────────
--  2. RPC: create_sale_multi (v7)
--     Nuevo parámetro: p_customer_email
-- ─────────────────────────────────────────
drop function if exists create_sale_multi(text, text, text, jsonb, numeric, numeric, text, numeric, numeric, date);

create or replace function create_sale_multi(
  p_customer_name        text,
  p_customer_phone       text,
  p_customer_address     text,
  p_items                jsonb,
  p_dtf_cost             numeric  default null,
  p_advance_payment      numeric  default 0,
  p_description          text     default null,
  p_shipping_cost        numeric  default 0,
  p_other_supplies_cost  numeric  default 0,
  p_delivery_date        date     default (current_date + 5),
  p_customer_email       text     default null
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
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_total := v_total
      + (v_item->>'qty')::integer
      * (v_item->>'unit_price')::numeric;
  end loop;

  insert into sales (
    customer_name, customer_phone, customer_address, customer_email,
    total, dtf_cost, advance_payment, description, shipping_cost,
    other_supplies_cost, delivery_date
  )
  values (
    p_customer_name,
    p_customer_phone,
    p_customer_address,
    p_customer_email,
    v_total,
    p_dtf_cost,
    coalesce(p_advance_payment, 0),
    p_description,
    coalesce(p_shipping_cost, 0),
    coalesce(p_other_supplies_cost, 0),
    coalesce(p_delivery_date, current_date + 5)
  )
  returning id into v_sale_id;

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
