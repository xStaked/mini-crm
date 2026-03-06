create index if not exists idx_companies_assigned_to on public.companies(assigned_to);
create index if not exists idx_companies_status on public.companies(status);
create index if not exists idx_companies_created_at on public.companies(created_at desc);
create index if not exists idx_companies_name_search on public.companies using gin (to_tsvector('simple', name));
