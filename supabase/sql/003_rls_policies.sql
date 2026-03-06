alter table public.users enable row level security;
alter table public.companies enable row level security;

-- Role helper
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

-- USERS policies
 drop policy if exists "users_select_self_or_admin" on public.users;
create policy "users_select_self_or_admin"
on public.users
for select
to authenticated
using (id = auth.uid() or public.is_admin());

 drop policy if exists "users_update_self_or_admin" on public.users;
create policy "users_update_self_or_admin"
on public.users
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

 drop policy if exists "users_insert_self" on public.users;
create policy "users_insert_self"
on public.users
for insert
to authenticated
with check (id = auth.uid());

-- COMPANIES policies
 drop policy if exists "companies_select_assigned_or_admin" on public.companies;
create policy "companies_select_assigned_or_admin"
on public.companies
for select
to authenticated
using (assigned_to = auth.uid() or public.is_admin());

 drop policy if exists "companies_insert_self_or_admin" on public.companies;
create policy "companies_insert_self_or_admin"
on public.companies
for insert
to authenticated
with check (assigned_to = auth.uid() or public.is_admin());

 drop policy if exists "companies_update_assigned_or_admin" on public.companies;
create policy "companies_update_assigned_or_admin"
on public.companies
for update
to authenticated
using (assigned_to = auth.uid() or public.is_admin())
with check (assigned_to = auth.uid() or public.is_admin());

 drop policy if exists "companies_delete_admin_only" on public.companies;
create policy "companies_delete_admin_only"
on public.companies
for delete
to authenticated
using (public.is_admin());
