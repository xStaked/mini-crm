create extension if not exists pgcrypto;

create table if not exists public.offices (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into public.offices (name)
values ('Main Office')
on conflict (name) do nothing;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null default 'agent' check (role in ('admin', 'agent')),
  office_id uuid not null references public.offices(id) on delete restrict,
  is_active boolean not null default true,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rfc text not null,
  rfc_normalized text not null unique,
  phone text,
  email text,
  notes text,
  status text not null default 'prospect' check (status in ('prospect', 'contacted', 'negotiation')),
  product text not null default 'divisas' check (product in ('divisas', 'bursatil', 'ambos')),
  contract_status text not null default 'activo' check (contract_status in ('activo', 'inactivo')),
  contact_source text not null default 'otro' check (contact_source in ('referido', 'google', 'base_propia', 'otro')),
  next_action_at timestamptz,
  assigned_to uuid not null references public.users(id) on delete restrict,
  office_id uuid not null references public.offices(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  type text not null check (type in ('note', 'call', 'email', 'meeting', 'status_change', 'reassignment')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rfc_locks (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete restrict,
  rfc_normalized text not null unique,
  company_name text,
  locked_by uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  meta jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_companies_updated_at on public.companies;
create trigger trg_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create index if not exists idx_users_office_id on public.users(office_id);
create index if not exists idx_users_is_active on public.users(is_active);
create index if not exists idx_companies_office_id on public.companies(office_id);
create index if not exists idx_companies_assigned_to on public.companies(assigned_to);
create index if not exists idx_companies_created_at on public.companies(created_at desc);
create index if not exists idx_companies_status on public.companies(status);
create index if not exists idx_companies_product on public.companies(product);
create index if not exists idx_companies_next_action_at on public.companies(next_action_at);
create index if not exists idx_company_activities_company_id on public.company_activities(company_id, created_at desc);
create index if not exists idx_rfc_locks_office_expires on public.rfc_locks(office_id, expires_at);
create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_user_read on public.notifications(user_id, read_at);
