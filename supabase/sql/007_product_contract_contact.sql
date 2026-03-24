-- Migrate existing 'client' status to 'negotiation'
update public.companies set status = 'negotiation' where status = 'client';

-- Drop old status check constraint and add new one with 3 stages
alter table public.companies drop constraint if exists companies_status_check;
alter table public.companies add constraint companies_status_check
  check (status in ('prospect', 'contacted', 'negotiation'));

-- Rename priority column to product
alter table public.companies rename column priority to product;

-- Migrate priority values to product values (all become 'divisas' as default)
update public.companies set product = 'divisas';

-- Drop old priority constraint and add product constraint
alter table public.companies drop constraint if exists companies_priority_check;
alter table public.companies add constraint companies_product_check
  check (product in ('divisas', 'bursatil', 'ambos'));

-- Update default value for product
alter table public.companies alter column product set default 'divisas';

-- Add contract_status column
alter table public.companies
  add column if not exists contract_status text not null default 'activo'
  check (contract_status in ('activo', 'inactivo'));

-- Add contact_source column
alter table public.companies
  add column if not exists contact_source text not null default 'otro'
  check (contact_source in ('referido', 'google', 'base_propia', 'otro'));
