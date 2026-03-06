# Mini CRM (Supabase)

CRM web para equipo comercial pequeno, enfocado en evitar duplicidad de prospectos por RFC.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Auth + Postgres + RLS)

## Funcionalidades

- Login por roles (`admin`, `agent`)
- Bloqueo de RFC duplicado en alta
- RFC lock temporal (45m) para evitar choques de prospeccion
- Estados + prioridad + proxima accion
- Historial de actividad por empresa
- Notificaciones internas por eventos
- Recordatorios de proximas acciones (ejecucion manual/API)
- Multi-sucursal (`office_id`) con visibilidad por oficina
- Gestion de usuarios (admin): alta, activar/desactivar, eliminar

## Setup local

1. Instala dependencias:

```bash
pnpm install
```

2. Crea `.env.local` desde `.env.example`:

```bash
cp .env.example .env.local
```

3. Configura en `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (requerido para crear/eliminar usuarios desde admin)

4. Ejecuta scripts SQL en Supabase (en orden):

- `supabase/sql/001_schema.sql`
- `supabase/sql/002_indexes.sql`
- `supabase/sql/003_rls_policies.sql`
- `supabase/sql/005_crm_enhancements.sql`
- `supabase/sql/006_offices_locks_notifications_users.sql`
- `supabase/sql/004_seed.sql` (opcional)

5. Crea usuarios iniciales en Supabase Auth:

- 1 admin
- agentes necesarios

6. Levanta la app:

```bash
pnpm dev
```

## Endpoints nuevos

- `POST|DELETE /api/rfc-locks` bloquear/liberar RFC temporal
- `GET /api/notifications` ver notificaciones propias
- `PATCH /api/notifications/read-all` marcar todas leidas
- `POST /api/reminders/run` generar recordatorios de proximas acciones (admin)
- `GET|POST /api/admin/users` listar/crear usuarios (admin)
- `PATCH|DELETE /api/admin/users/:id` activar/desactivar/eliminar (admin)

## Nota sobre recordatorios automaticos

Puedes programar `POST /api/reminders/run` con un cron (Vercel Cron, GitHub Actions, etc.) para ejecucion diaria automatica.
