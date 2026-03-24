do $$
declare
  main_office_id uuid;
  admin_user_id uuid;
  agent_user_id uuid;
  demo_company_id uuid;
begin
  select id
  into main_office_id
  from public.offices
  where name = 'Main Office'
  limit 1;

  if main_office_id is null then
    insert into public.offices (name)
    values ('Main Office')
    returning id into main_office_id;
  end if;

  insert into public.users (
    name,
    email,
    role,
    office_id,
    is_active,
    password_hash
  )
  values (
    'Demo Admin',
    'admin@mini-crm.demo',
    'admin',
    main_office_id,
    true,
    'scrypt:8da0b4aaaf23af7a02ce592763671918:d13a4629570691e891b4500df68afa625be2e7216f44755946f4773ef703fb193c005dba077121c949ead70636376217b604bcc123e29517fc89229d81f072a1'
  )
  on conflict (email) do update
  set
    name = excluded.name,
    role = excluded.role,
    office_id = excluded.office_id,
    is_active = excluded.is_active,
    password_hash = excluded.password_hash
  returning id into admin_user_id;

  insert into public.users (
    name,
    email,
    role,
    office_id,
    is_active,
    password_hash
  )
  values (
    'Demo Agent',
    'agent@mini-crm.demo',
    'agent',
    main_office_id,
    true,
    'scrypt:2294d6cb0a70033d7fdd83a5f90a0117:7a81483e1cf3d86b5a18db9544b6c953fcb92373623a607e5406c9def880b681dcb3481c83e7741460474270f2c4a8759a060e4043033c19e995e6da9ed22734'
  )
  on conflict (email) do update
  set
    name = excluded.name,
    role = excluded.role,
    office_id = excluded.office_id,
    is_active = excluded.is_active,
    password_hash = excluded.password_hash
  returning id into agent_user_id;

  insert into public.companies (
    name,
    rfc,
    rfc_normalized,
    phone,
    email,
    notes,
    status,
    product,
    contract_status,
    contact_source,
    next_action_at,
    assigned_to,
    office_id
  )
  values (
    'Casa Demo Capital',
    'CADC850101AB1',
    'CADC850101AB1',
    '+52 55 5555 0101',
    'contacto@casademocapital.mx',
    'Empresa de ejemplo para validar flujo comercial, cambios de estado y recordatorios.',
    'contacted',
    'divisas',
    'activo',
    'referido',
    now() + interval '1 day',
    agent_user_id,
    main_office_id
  )
  on conflict (rfc_normalized) do update
  set
    name = excluded.name,
    phone = excluded.phone,
    email = excluded.email,
    notes = excluded.notes,
    status = excluded.status,
    product = excluded.product,
    contract_status = excluded.contract_status,
    contact_source = excluded.contact_source,
    next_action_at = excluded.next_action_at,
    assigned_to = excluded.assigned_to,
    office_id = excluded.office_id
  returning id into demo_company_id;

  insert into public.company_activities (company_id, user_id, type, content)
  select demo_company_id, agent_user_id, 'call', 'Se contacto al prospecto y se agendo seguimiento.'
  where not exists (
    select 1
    from public.company_activities
    where company_id = demo_company_id
      and user_id = agent_user_id
      and type = 'call'
      and content = 'Se contacto al prospecto y se agendo seguimiento.'
  );

  insert into public.company_activities (company_id, user_id, type, content)
  select demo_company_id, admin_user_id, 'note', 'Cuenta de demostracion preparada para revision del cliente.'
  where not exists (
    select 1
    from public.company_activities
    where company_id = demo_company_id
      and user_id = admin_user_id
      and type = 'note'
      and content = 'Cuenta de demostracion preparada para revision del cliente.'
  );

  insert into public.notifications (user_id, type, title, message, meta)
  select
    admin_user_id,
    'company_created',
    'Demo lista',
    'La empresa Casa Demo Capital esta disponible para pruebas del panel admin.',
    jsonb_build_object('company_id', demo_company_id, 'seed', true)
  where not exists (
    select 1
    from public.notifications
    where user_id = admin_user_id
      and type = 'company_created'
      and meta @> jsonb_build_object('company_id', demo_company_id, 'seed', true)
  );

  insert into public.notifications (user_id, type, title, message, meta)
  select
    agent_user_id,
    'reminder_next_action',
    'Seguimiento demo',
    'Casa Demo Capital tiene una accion pendiente en las proximas 24 horas.',
    jsonb_build_object('company_id', demo_company_id, 'seed', true)
  where not exists (
    select 1
    from public.notifications
    where user_id = agent_user_id
      and type = 'reminder_next_action'
      and meta @> jsonb_build_object('company_id', demo_company_id, 'seed', true)
  );
end $$;
