-- ============================================================
--  TerraSupply — Schema completo para Supabase
--  Ejecuta este script en: Supabase → SQL Editor → New Query
-- ============================================================

-- ─────────────────────────────────────────
--  1. PRODUCTS (inventario)
-- ─────────────────────────────────────────
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  sku         text,
  stock       integer     not null default 0,
  cost        numeric(10,2) not null default 0,
  price       numeric(10,2) not null default 0,
  active      boolean     not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists products_name_idx on products (name);
create index if not exists products_sku_idx  on products (sku);

-- ─────────────────────────────────────────
--  2. SALES (ventas)
-- ─────────────────────────────────────────
create table if not exists sales (
  id                uuid primary key default gen_random_uuid(),
  customer_name     text        not null,
  customer_phone    text,
  customer_address  text,
  description       text,
  total             numeric(10,2) not null default 0,
  dtf_cost          numeric(10,2) not null default 0,
  advance_payment   numeric(10,2) not null default 0,
  status            text        not null default 'pendiente'
                      check (status in ('pendiente', 'enviado')),
  created_at        timestamptz not null default now()
);

create index if not exists sales_created_at_idx on sales (created_at desc);
create index if not exists sales_status_idx     on sales (status);

-- ─────────────────────────────────────────
--  3. SALE_ITEMS (detalle de cada venta)
-- ─────────────────────────────────────────
create table if not exists sale_items (
  id            uuid primary key default gen_random_uuid(),
  sale_id       uuid        not null references sales (id) on delete cascade,
  product_id    uuid        references products (id) on delete set null,
  product_name  text        not null,
  qty           integer     not null check (qty > 0),
  unit_price    numeric(10,2) not null default 0,
  unit_cost     numeric(10,2) not null default 0,
  image_url     text
);

create index if not exists sale_items_sale_id_idx on sale_items (sale_id);

-- ─────────────────────────────────────────
--  4. EXPENSES (gastos diarios)
-- ─────────────────────────────────────────
create table if not exists expenses (
  id            uuid primary key default gen_random_uuid(),
  description   text        not null,
  amount        numeric(10,2) not null check (amount >= 0),
  expense_date  date        not null,
  created_at    timestamptz not null default now()
);

create index if not exists expenses_date_idx on expenses (expense_date desc);

-- ─────────────────────────────────────────
--  5. FUNCIÓN RPC: create_sale_multi
--     Crea la venta, los items y descuenta stock
--     en una sola transacción atómica.
-- ─────────────────────────────────────────
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

    -- Descuenta stock del producto
    update products
    set stock = stock - (v_item->>'qty')::integer
    where id = (v_item->>'product_id')::uuid;
  end loop;

  return v_sale_id;
end;
$$;

-- ─────────────────────────────────────────
--  6. ROW LEVEL SECURITY (RLS)
--     Habilita RLS y permite acceso anónimo
--     (ajusta según tu modelo de autenticación)
-- ─────────────────────────────────────────

-- Products
alter table products enable row level security;
create policy "Acceso público a productos"
  on products for all
  using (true)
  with check (true);

-- Sales
alter table sales enable row level security;
create policy "Acceso público a ventas"
  on sales for all
  using (true)
  with check (true);

-- Sale items
alter table sale_items enable row level security;
create policy "Acceso público a items de venta"
  on sale_items for all
  using (true)
  with check (true);

-- Expenses
alter table expenses enable row level security;
create policy "Acceso público a gastos"
  on expenses for all
  using (true)
  with check (true);

-- ─────────────────────────────────────────
--  7. STORAGE: bucket público para imágenes
--     de productos vendidos (se guarda la URL
--     pública resultante en sale_items.image_url)
-- ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('sale-images', 'sale-images', true)
on conflict (id) do nothing;

create policy "Lectura pública imágenes de ventas"
  on storage.objects for select
  using (bucket_id = 'sale-images');

create policy "Subida pública imágenes de ventas"
  on storage.objects for insert
  with check (bucket_id = 'sale-images');

create policy "Gestión pública imágenes de ventas"
  on storage.objects for update
  using (bucket_id = 'sale-images')
  with check (bucket_id = 'sale-images');

create policy "Borrado público imágenes de ventas"
  on storage.objects for delete
  using (bucket_id = 'sale-images');

-- ─────────────────────────────────────────
--  FIN DEL SCRIPT
-- ─────────────────────────────────────────
