-- Add business fields to companies
alter table public.companies
  add column if not exists priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  add column if not exists next_action_at timestamptz;

-- Activity timeline per company
create table if not exists public.company_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  type text not null check (type in ('note', 'call', 'email', 'meeting', 'status_change', 'reassignment')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_company_activities_company_id
  on public.company_activities(company_id, created_at desc);

alter table public.company_activities enable row level security;

drop policy if exists "company_activities_select_scope" on public.company_activities;
create policy "company_activities_select_scope"
on public.company_activities
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.companies c
    where c.id = company_id
      and c.assigned_to = auth.uid()
  )
);

drop policy if exists "company_activities_insert_scope" on public.company_activities;
create policy "company_activities_insert_scope"
on public.company_activities
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1
      from public.companies c
      where c.id = company_id
        and c.assigned_to = auth.uid()
    )
  )
);

drop policy if exists "company_activities_delete_admin" on public.company_activities;
create policy "company_activities_delete_admin"
on public.company_activities
for delete
to authenticated
using (public.is_admin());
