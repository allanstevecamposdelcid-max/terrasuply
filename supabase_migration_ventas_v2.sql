-- ============================================================
--  TerraSupply — Migración: dirección del cliente, anticipo
--  e imagen del producto en cada venta
--  Ejecuta este script en: Supabase → SQL Editor → New Query
-- ============================================================

-- ─────────────────────────────────────────
--  1. NUEVAS COLUMNAS EN SALES
-- ─────────────────────────────────────────
alter table sales
  add column if not exists customer_address text,
  add column if not exists advance_payment numeric(10,2) not null default 0;

-- ─────────────────────────────────────────
--  2. NUEVA COLUMNA EN SALE_ITEMS (imagen del producto)
--     Guarda la URL pública del archivo en Storage
-- ─────────────────────────────────────────
alter table sale_items
  add column if not exists image_url text;

-- ─────────────────────────────────────────
--  3. BUCKET PÚBLICO PARA LAS IMÁGENES DE VENTAS
-- ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('sale-images', 'sale-images', true)
on conflict (id) do nothing;

-- Lectura pública (para que la URL guardada en la BD sea accesible)
drop policy if exists "Lectura pública imágenes de ventas" on storage.objects;
create policy "Lectura pública imágenes de ventas"
  on storage.objects for select
  using (bucket_id = 'sale-images');

-- Subida pública (mismo modelo de acceso anónimo que el resto del sistema)
drop policy if exists "Subida pública imágenes de ventas" on storage.objects;
create policy "Subida pública imágenes de ventas"
  on storage.objects for insert
  with check (bucket_id = 'sale-images');

-- Permite reemplazar/eliminar archivos propios desde el cliente
drop policy if exists "Gestión pública imágenes de ventas" on storage.objects;
create policy "Gestión pública imágenes de ventas"
  on storage.objects for update
  using (bucket_id = 'sale-images')
  with check (bucket_id = 'sale-images');

drop policy if exists "Borrado público imágenes de ventas" on storage.objects;
create policy "Borrado público imágenes de ventas"
  on storage.objects for delete
  using (bucket_id = 'sale-images');

-- ─────────────────────────────────────────
--  4. RPC: create_sale_multi (v2)
--     Se elimina la versión anterior porque cambia la firma
--     (nuevos parámetros: dirección y anticipo).
-- ─────────────────────────────────────────
drop function if exists create_sale_multi(text, text, jsonb, numeric);

create or replace function create_sale_multi(
  p_customer_name     text,
  p_customer_phone    text,
  p_customer_address  text,
  p_items             jsonb,
  p_dtf_cost          numeric,
  p_advance_payment   numeric default 0
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

  -- Inserta la venta (incluye dirección y anticipo)
  insert into sales (
    customer_name, customer_phone, customer_address,
    total, dtf_cost, advance_payment
  )
  values (
    p_customer_name,
    p_customer_phone,
    p_customer_address,
    v_total,
    coalesce(p_dtf_cost, 0),
    coalesce(p_advance_payment, 0)
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
