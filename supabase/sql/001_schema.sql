-- Extensions
create extension if not exists pgcrypto;

-- Public users table linked to auth.users
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'agent' check (role in ('admin', 'agent')),
  created_at timestamptz not null default now()
);

-- Companies tracked for prospecting
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rfc text not null,
  rfc_normalized text not null unique,
  phone text,
  email text,
  notes text,
  status text not null default 'prospect' check (status in ('prospect', 'contacted', 'negotiation', 'client')),
  assigned_to uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger helper for updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger for companies
 drop trigger if exists trg_companies_updated_at on public.companies;
create trigger trg_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

-- Auto-create public.users row when new auth user is created
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'agent')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

 drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
