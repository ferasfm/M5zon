-- supabase/init_tables.sql
-- Run this in your Supabase SQL editor (SQL -> New query) for the project you connect to
-- Enables gen_random_uuid() if not already available
create extension if not exists pgcrypto;

-- PRODUCTS
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  category text,
  standard_cost_price numeric default 0,
  has_warranty boolean default false,
  warranty_duration_value integer,
  warranty_duration_unit text check (warranty_duration_unit in ('days','months','years')),
  product_type text not null check (product_type in ('standard','bundle')),
  components jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SUPPLIERS
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  price_agreements jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PROVINCES / AREAS / CLIENTS
create table if not exists provinces (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  province_id uuid references provinces(id) on delete cascade
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area_id uuid references areas(id) on delete set null
);

-- INVENTORY ITEMS
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  serial_number text unique,
  cost_price numeric default 0,
  status text not null check (status in ('in_stock','dispatched','scrapped','damaged_on_arrival')),
  purchase_date timestamptz,
  dispatch_date timestamptz,
  scrap_date timestamptz,
  supplier_id uuid references suppliers(id) on delete set null,
  destination_client_id uuid references clients(id) on delete set null,
  dispatch_client_id uuid references clients(id) on delete set null,
  purchase_reason text,
  dispatch_reason text,
  scrap_reason text,
  dispatch_notes text,
  scrap_notes text,
  dispatch_reference text,
  warranty_end_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Helpful indexes
create index if not exists idx_inventory_product_id on inventory_items(product_id);
create index if not exists idx_inventory_status on inventory_items(status);

-- Small seed example (optional) — uncomment to run
-- insert into products (name, sku, category, standard_cost_price, has_warranty, product_type) values ('Sample Product','SKU-100','General',100,true,'standard');

-- End of init_tables.sql
