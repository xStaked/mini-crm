# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages and API routes (`app/api/**/route.ts`).
- `components/`: Reusable UI and feature components (forms, dashboards, status/priority controls).
- `lib/`: Shared server/client utilities (auth, env, notifications, Supabase clients, types).
- `supabase/sql/`: Ordered SQL migrations and seed data (`001_*.sql` to `006_*.sql`).
- `public/`: Static assets.

Keep business logic in `lib/` and keep route handlers thin.

## Build, Test, and Development Commands
- `pnpm install`: Install dependencies.
- `pnpm dev`: Run local dev server.
- `pnpm build`: Create production build.
- `pnpm start`: Run built app.
- `pnpm lint`: Run ESLint (`eslint-config-next` + TypeScript rules).

Local setup also requires copying env vars and applying SQL files in order:
`cp .env.example .env.local` and execute `supabase/sql/001...006`.

## Coding Style & Naming Conventions
- Language: TypeScript (`strict: true`), React 19, Next.js App Router.
- Indentation: 2 spaces; prefer single-responsibility modules and small route handlers.
- File naming: kebab-case for component files (for example, `company-status-select.tsx`), `route.ts` for API endpoints.
- Use path alias imports via `@/*` when clearer than long relative paths.
- Run `pnpm lint` before opening a PR.

## Testing Guidelines
There is no test suite configured yet. For now:
- Treat `pnpm lint` and a successful `pnpm build` as the minimum quality gate.
- Manually verify key flows: login, company creation, status updates, notifications, reminders, and admin user actions.

When adding tests, prefer colocated `*.test.ts`/`*.test.tsx` near the feature or under a `__tests__/` folder by domain.

## Commit & Pull Request Guidelines
Commit history uses Conventional Commit style (example: `feat(crm): add RFC locks...`). Follow:
- `type(scope): short imperative summary` (e.g., `fix(api): validate office scope in notifications route`).

PRs should include:
- Clear description of behavior changes.
- Linked issue/ticket when applicable.
- API examples for endpoint changes.
- UI screenshots/GIFs for visual updates (`app/`, `components/`).
- Notes for SQL migration order or env var changes.

## Security & Configuration Tips
- Never commit secrets; `.env*` is ignored.
- Required keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Treat service-role operations as admin-only and validate role/office constraints in server routes.
