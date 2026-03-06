-- Offices (multi-branch)
create table if not exists public.offices (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into public.offices (name)
values ('Main Office')
on conflict (name) do nothing;

-- Users enhancements
alter table public.users
  add column if not exists office_id uuid references public.offices(id) on delete restrict,
  add column if not exists is_active boolean not null default true;

update public.users
set office_id = (select id from public.offices order by created_at asc limit 1)
where office_id is null;

alter table public.users
  alter column office_id set not null;

create index if not exists idx_users_office_id on public.users(office_id);
create index if not exists idx_users_is_active on public.users(is_active);

-- Companies office scoping
alter table public.companies
  add column if not exists office_id uuid references public.offices(id) on delete restrict;

update public.companies c
set office_id = u.office_id
from public.users u
where c.assigned_to = u.id
  and c.office_id is null;

update public.companies
set office_id = (select id from public.offices order by created_at asc limit 1)
where office_id is null;

alter table public.companies
  alter column office_id set not null;

create index if not exists idx_companies_office_id on public.companies(office_id);

-- RFC temporary locks
create table if not exists public.rfc_locks (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete restrict,
  rfc_normalized text not null unique,
  company_name text,
  locked_by uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rfc_locks_office_expires on public.rfc_locks(office_id, expires_at);

-- In-app notifications
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

create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_user_read on public.notifications(user_id, read_at);

-- Helpers for office-based access
create or replace function public.current_user_office()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select office_id from public.users where id = auth.uid();
$$;

-- Ensure auth trigger includes office and active
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_office uuid;
begin
  select id into default_office
  from public.offices
  order by created_at asc
  limit 1;

  insert into public.users (id, name, email, role, office_id, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'agent'),
    coalesce((new.raw_user_meta_data ->> 'office_id')::uuid, default_office),
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- RLS enable
alter table public.offices enable row level security;
alter table public.rfc_locks enable row level security;
alter table public.notifications enable row level security;

-- Replace policies with office-scoped rules
 drop policy if exists "users_select_self_or_admin" on public.users;
create policy "users_select_self_or_admin"
on public.users
for select
to authenticated
using (
  id = auth.uid()
  or (
    public.is_admin()
    and office_id = public.current_user_office()
  )
);

 drop policy if exists "users_update_self_or_admin" on public.users;
create policy "users_update_self_or_admin"
on public.users
for update
to authenticated
using (
  id = auth.uid()
  or (
    public.is_admin()
    and office_id = public.current_user_office()
  )
)
with check (
  id = auth.uid()
  or (
    public.is_admin()
    and office_id = public.current_user_office()
  )
);

 drop policy if exists "users_insert_self" on public.users;
create policy "users_insert_self"
on public.users
for insert
to authenticated
with check (
  id = auth.uid()
  and office_id = public.current_user_office()
);

 drop policy if exists "companies_select_assigned_or_admin" on public.companies;
create policy "companies_select_assigned_or_admin"
on public.companies
for select
to authenticated
using (
  (assigned_to = auth.uid() and office_id = public.current_user_office())
  or (
    public.is_admin()
    and office_id = public.current_user_office()
  )
);

 drop policy if exists "companies_insert_self_or_admin" on public.companies;
create policy "companies_insert_self_or_admin"
on public.companies
for insert
to authenticated
with check (
  office_id = public.current_user_office()
  and (
    assigned_to = auth.uid()
    or public.is_admin()
  )
);

 drop policy if exists "companies_update_assigned_or_admin" on public.companies;
create policy "companies_update_assigned_or_admin"
on public.companies
for update
to authenticated
using (
  office_id = public.current_user_office()
  and (
    assigned_to = auth.uid()
    or public.is_admin()
  )
)
with check (
  office_id = public.current_user_office()
  and (
    assigned_to = auth.uid()
    or public.is_admin()
  )
);

 drop policy if exists "companies_delete_admin_only" on public.companies;
create policy "companies_delete_admin_only"
on public.companies
for delete
to authenticated
using (
  public.is_admin()
  and office_id = public.current_user_office()
);

-- Offices policies
 drop policy if exists "offices_select_same_office" on public.offices;
create policy "offices_select_same_office"
on public.offices
for select
to authenticated
using (id = public.current_user_office());

-- RFC lock policies
 drop policy if exists "rfc_locks_select_office" on public.rfc_locks;
create policy "rfc_locks_select_office"
on public.rfc_locks
for select
to authenticated
using (office_id = public.current_user_office());

 drop policy if exists "rfc_locks_insert_owner" on public.rfc_locks;
create policy "rfc_locks_insert_owner"
on public.rfc_locks
for insert
to authenticated
with check (
  locked_by = auth.uid()
  and office_id = public.current_user_office()
);

 drop policy if exists "rfc_locks_update_owner_or_admin" on public.rfc_locks;
create policy "rfc_locks_update_owner_or_admin"
on public.rfc_locks
for update
to authenticated
using (
  office_id = public.current_user_office()
  and (
    locked_by = auth.uid()
    or public.is_admin()
  )
)
with check (
  office_id = public.current_user_office()
  and (
    locked_by = auth.uid()
    or public.is_admin()
  )
);

 drop policy if exists "rfc_locks_delete_owner_or_admin" on public.rfc_locks;
create policy "rfc_locks_delete_owner_or_admin"
on public.rfc_locks
for delete
to authenticated
using (
  office_id = public.current_user_office()
  and (
    locked_by = auth.uid()
    or public.is_admin()
  )
);

-- Notifications policies
 drop policy if exists "notifications_select_self_or_admin" on public.notifications;
create policy "notifications_select_self_or_admin"
on public.notifications
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    public.is_admin()
    and exists (
      select 1
      from public.users u
      where u.id = notifications.user_id
        and u.office_id = public.current_user_office()
    )
  )
);

 drop policy if exists "notifications_insert_self_or_admin" on public.notifications;
create policy "notifications_insert_self_or_admin"
on public.notifications
for insert
to authenticated
with check (
  user_id = auth.uid()
  or (
    public.is_admin()
    and exists (
      select 1
      from public.users u
      where u.id = notifications.user_id
        and u.office_id = public.current_user_office()
    )
  )
);

 drop policy if exists "notifications_update_self_or_admin" on public.notifications;
create policy "notifications_update_self_or_admin"
on public.notifications
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
)
with check (
  user_id = auth.uid()
  or public.is_admin()
);
