# Mini CRM (Neon)

CRM web para equipo comercial pequeno, enfocado en evitar duplicidad de prospectos por RFC.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Neon Postgres
- Sesion propia por cookie HTTP-only

## Funcionalidades

- Login por roles (`admin`, `agent`)
- Bloqueo de RFC duplicado en alta
- RFC lock temporal (45m) para evitar choques de prospeccion
- Estados por etapa (0-30, 30-60, 60-90 dias) + producto + situacion de contrato + medio de contacto + proxima accion
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

- `DATABASE_URL`
- `SESSION_SECRET`

4. Ejecuta el esquema en Neon:

```bash
psql "$DATABASE_URL" -f neon/sql/001_init.sql
```

5. Si quieres datos demo para pruebas del cliente, carga el seed:

```bash
psql "$DATABASE_URL" -f neon/sql/002_demo_seed.sql
```

Credenciales demo:

- Admin: `admin@mini-crm.demo` / `Admin123!`
- Agente: `agent@mini-crm.demo` / `Agent123!`

6. Si prefieres crear tu propio primer admin:

```sql
insert into public.users (name, email, role, office_id, is_active, password_hash)
select
  'Admin',
  'admin@empresa.com',
  'admin',
  id,
  true,
  'PEGA_AQUI_EL_HASH'
from public.offices
order by created_at asc
limit 1;
```

7. O genera tu propio hash:

```bash
pnpm hash-password -- "tu-password"
```

8. Levanta la app:

```bash
pnpm dev
```

## Endpoints

- `POST|DELETE /api/rfc-locks` bloquear/liberar RFC temporal
- `GET /api/notifications` ver notificaciones propias
- `PATCH /api/notifications/read-all` marcar todas leidas
- `POST /api/reminders/run` generar recordatorios de proximas acciones (admin)
- `GET|POST /api/admin/users` listar/crear usuarios (admin)
- `PATCH|DELETE /api/admin/users/:id` activar/desactivar/eliminar (admin)

## Nota sobre recordatorios automaticos

Puedes programar `POST /api/reminders/run` con un cron (Vercel Cron, GitHub Actions, etc.) para ejecucion diaria automatica.
