-- ============================================================
--  TerraSupply — Migración v5: fecha de entrega, otros insumos,
--  registro diferido del costo DTF y stock mínimo por producto
--  Ejecuta este script en: Supabase → SQL Editor → New Query
--  (Aplícalo después de supabase_migration_ventas_v4.sql)
-- ============================================================

-- ─────────────────────────────────────────
--  1. NUEVAS COLUMNAS EN SALES
-- ─────────────────────────────────────────

-- El costo DTF ahora puede quedar en null = "aún no registrado".
-- Antes tenía default 0, lo que impedía distinguir "sin costo"
-- de "todavía no se registró el costo real".
alter table sales
  alter column dtf_cost drop not null,
  alter column dtf_cost drop default;

alter table sales
  add column if not exists other_supplies_cost numeric(10,2) not null default 0,
  add column if not exists delivery_date date;

-- Rellena fecha de entrega para ventas ya existentes (creación + 5 días)
update sales
set delivery_date = (created_at::date + 5)
where delivery_date is null;

create index if not exists sales_delivery_date_idx on sales (delivery_date);

-- ─────────────────────────────────────────
--  2. NUEVA COLUMNA EN PRODUCTS (stock mínimo configurable)
-- ─────────────────────────────────────────
alter table products
  add column if not exists min_stock integer not null default 5;

-- ─────────────────────────────────────────
--  3. RPC: create_sale_multi (v5)
--     Nuevos parámetros: p_other_supplies_cost, p_delivery_date
--     p_dtf_cost ahora acepta null (costo aún no registrado)
-- ─────────────────────────────────────────
drop function if exists create_sale_multi(text, text, text, jsonb, numeric, numeric, text, numeric);

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
  p_delivery_date        date     default (current_date + 5)
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

  -- Inserta la venta
  insert into sales (
    customer_name, customer_phone, customer_address,
    total, dtf_cost, advance_payment, description, shipping_cost,
    other_supplies_cost, delivery_date
  )
  values (
    p_customer_name,
    p_customer_phone,
    p_customer_address,
    v_total,
    p_dtf_cost,
    coalesce(p_advance_payment, 0),
    p_description,
    coalesce(p_shipping_cost, 0),
    coalesce(p_other_supplies_cost, 0),
    coalesce(p_delivery_date, current_date + 5)
  )
  returning id into v_sale_id;

  -- Inserta cada ítem y descuenta stock
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
--  4. RPC: update_sale_items
--     Reemplaza los productos de una venta ya creada: restaura
--     el stock de los ítems anteriores, inserta los nuevos y
--     vuelve a descontar stock. Recalcula sales.total.
--     Se usa desde "Editar venta" para cambiar cantidades,
--     precios, o agregar/quitar playeras después de guardada.
-- ─────────────────────────────────────────
drop function if exists update_sale_items(uuid, jsonb);

create or replace function update_sale_items(
  p_sale_id  uuid,
  p_items    jsonb
)
returns numeric
language plpgsql
security definer
as $$
declare
  v_total  numeric := 0;
  v_item   jsonb;
  v_old    record;
begin
  -- Restaura el stock de los ítems actuales antes de reemplazarlos
  for v_old in
    select product_id, qty from sale_items where sale_id = p_sale_id
  loop
    if v_old.product_id is not null then
      update products set stock = stock + v_old.qty where id = v_old.product_id;
    end if;
  end loop;

  delete from sale_items where sale_id = p_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_total := v_total
      + (v_item->>'qty')::integer
      * (v_item->>'unit_price')::numeric;

    insert into sale_items (
      sale_id, product_id, product_name, qty, unit_price, unit_cost, image_url
    )
    values (
      p_sale_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      (v_item->>'qty')::integer,
      (v_item->>'unit_price')::numeric,
      (v_item->>'unit_cost')::numeric,
      v_item->>'image_url'
    );

    if (v_item->>'product_id') is not null then
      update products
      set stock = stock - (v_item->>'qty')::integer
      where id = (v_item->>'product_id')::uuid;
    end if;
  end loop;

  update sales set total = v_total where id = p_sale_id;

  return v_total;
end;
$$;

-- ─────────────────────────────────────────
--  FIN DE LA MIGRACIÓN
-- ─────────────────────────────────────────
