# AGENTS.md — mrp monorepo

## Quick Start

```bash
npm run db:up          # Start postgres (5433), redis (6379), minio (9010/9001)
npm run dev            # Starts all 4 watchers: types, schemas, api (tsx), web (vite)
npm run build          # Build packages first, then apps (order matters)
```

## Architecture

Monorepo with npm workspaces. Two apps, three shared packages.

| Path | Purpose |
|---|---|
| `apps/api/` | Express + MikroORM + PostgreSQL backend (port 5050 default) |
| `apps/web/` | React 18 + Vite + Tailwind frontend (port 3000) |
| `packages/types/` | Shared TS interfaces and enums (`@scaffold/types`) |
| `packages/schemas/` | Shared Zod validation schemas (`@scaffold/schemas`) |
| `packages/config/` | Shared tsconfig, eslint, prettier presets |

API has 4 modules: `auth/`, `user/`, `health/`, `mrp/`. The MRP module is the largest — a full manufacturing/quality ERP.

**Key wiring:** `apps/api/src/index.ts` → `RequestContext` middleware → routes mounted at both `/` and `/api` (nginx compatibility). All MRP routes require `authenticateToken`.

## Commands

### Verification order (run before committing)
```bash
npm run build:packages   # Must run first — apps depend on compiled types/schemas
npm run ts-check         # Runs tsc --noEmit in both apps (extends build)
npm run lint             # Runs eslint in both workspaces
```

### Per-workspace shortcuts
```bash
npm run ts-check --workspace=apps/api    # tsc --noEmit (api)
npm run ts-check --workspace=apps/web    # tsc --noEmit (web)
npm run lint --workspace=apps/api
npm run lint --workspace=apps/web
```

### Database / Migrations
```bash
npm run migration:create   # Creates new migration file
npm run migration:up       # Applies pending migrations (uses custom tsx script)
npm run migration:down     # Rolls back last migration
npm run seed               # Seeds dev database
npm run db:reset           # Drops volumes and recreates (destructive)
```

**Production migrations:** The `migration:prod` script runs `node dist/apps/api/src/scripts/run-migration.js`.
The production deploy script (`deploy.sh`) runs migrations automatically via:
```bash
docker compose -f $COMPOSE_FILE exec -T api npm run migration:prod --workspace=api
```
If migrations fail in production, manually run:
```bash
docker exec mrp-app-api-1 npm run migration:prod --workspace=api
```
The migration snapshot file `apps/api/src/migrations/.snapshot-scaffold_db.json` can cause false "No migrations pending" — if columns are missing in prod, force-reapply by deleting the migration row from `mikro_orm_migrations` table and re-running.

### PDF generation
PDF services use Playwright + Pug. Requires one-time setup:
```bash
npm run pdf:setup --workspace=api   # Installs playwright, pug, chromium
```

## Critical Conventions

### Package build order
`@scaffold/types` → `@scaffold/schemas` → apps. The `npm run build` root script handles this. If you edit types or schemas, run `npm run build:packages` before `ts-check` in apps will see the changes.

### MikroORM patterns
- Entities live in `apps/api/src/modules/*/entities/*.entity.ts` with glob auto-discovery
- Migrations in `apps/api/src/modules/*/migrations/`
- `.env` loaded from monorepo root (`../../.env` relative to config)
- `allowGlobalContext: true` in dev, false in production
- Uses `RequestContext.create(orm.em, next)` per-request DI pattern
- `repo.create()` requires all non-nullable fields including `createdAt`/`updatedAt` (BaseEntity has defaults but TS types don't infer them)
- **PostgreSQL ILIKE**: Use `$ilike` (not `$like`) for case-insensitive search in MikroORM queries

### API response pattern
All controllers use `ApiResponse.success(res, data, message, statusCode)` or throw `AppError(message, statusCode)`. Errors caught by `errorHandler` middleware (must be last).

### Web app patterns
- Path alias `@/*` maps to `src/*`
- `@scaffold/types` and `@scaffold/schemas` imported via workspace `*` — tsconfig maps to source `.ts` files for dev, compiled `.d.ts` for build
- `getErrorMessage(error, fallback)` in `@/lib/api-error` requires **2 arguments** (error + fallback string)
- Toast hook: `const { toast } = useToast()` from `@/components/ui/use-toast`
- `mrpApi.getProducts()` returns `{ products: Product[], total }`, NOT `{ data: [...] }`
- `mrpApi.getProductionOrders()` returns `{ orders: ProductionOrder[], total }`
- **Pagination pattern**: API endpoints accept `?page=N&limit=M&search=text`, hooks return `{ ..., page, limit, totalPages }`
- **Debounced search**: Use `setTimeout` + `clearTimeout` in `useEffect` with 500ms delay

### Zod schemas
- `CreateProductionEntrySchema` uses `z.number().int()` — quantities must be integers
- Schemas are in `packages/schemas/src/index.ts` — rebuild after edits

### Controller/service pattern
- Each feature has a service class (takes `EntityManager` or `MikroORM` in constructor)
- Controller methods take `(req, res, next)` and are wired in `mrp.routes.ts`
- Routes registered in `mrp.routes.ts` with `authenticateToken` middleware at router level
- `resolveActor(req)` extracts user identity from JWT — not all services use it

## Infrastructure

| Service | Dev Port | Creds |
|---|---|---|
| PostgreSQL | 5433 | postgres/postgres, db: scaffold_db |
| Redis | 6379 | no auth |
| MinIO | 9010 (API), 9001 (console) | minioadmin/minioadmin, bucket: mrp-quality-documents |

JWT secret and other config in `.env` at monorepo root.

**Production:**
- Prod DB name is `mrp_db` (not `scaffold_db` — check `.env` in prod)
- Deploy script: `~/mrp-app/deploy.sh` (runs `docker compose -f docker-compose.prod.yml`)
- Containers: `mrp-app-api-1`, `mrp-app-web-1`, `mrp-app-postgres-1`, `mrp-app-redis-1`
- To check prod logs: `docker logs mrp-app-api-1 --tail 100`
- **Migration path issue**: Prod builds create nested `dist/apps/api/dist/...` paths. The `migration:prod` script must use the correct path to `run-migration.js`.

## Testing
No test framework currently configured. `npm run test` runs workspaces with `--if-present` (no-op).

## Git
No pre-commit hooks, no CI workflows in repo. Push directly.

## Deploy FAQ

**Q: API returns 500 with "column does not exist"**
A: Production is missing DB columns. The migration ran but columns weren't created. Fix:
```bash
docker exec mrp-app-postgres-1 psql -U postgres -d mrp_db -c "ALTER TABLE <table> ADD COLUMN IF NOT EXISTS <col> <type>;"
docker exec mrp-app-api-1 npm run migration:prod --workspace=api
```

**Q: Supplier list search/pagination not working**
A: Ensure the `useSuppliersQuery` hook passes `search` in the query key. Check `mrpQueryKeys.suppliersList` includes search param. The API `listSuppliers` service method must accept `search?: string` and use `$ilike` operator.

**Q: How to check if migrations actually applied in prod**
A:
```bash
docker exec mrp-app-postgres-1 psql -U postgres -d mrp_db -c "SELECT * FROM mikro_orm_migrations ORDER BY id DESC LIMIT 10;"
docker exec mrp-app-postgres-1 psql -U postgres -d mrp_db -c "\d <table_name>"
```
