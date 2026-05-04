# MRP Monorepo — Sistema de Gestión Manufacturera y Calidad

Monorepo Full-stack con React, Express, MikroORM y PostgreSQL. Incluye módulos de manufactura, calidad (ISO 13485), ventas, compras y proveedores.

## Inicio Rápido

### Prerequisitos
- Node.js 20+
- Docker y Docker Compose
- PostgreSQL (o usar el contenedor Docker)
- MinIO (o usar el contenedor Docker)

### Instalación
```bash
npm install
npm run db:up          # Levanta postgres (5433), redis (6379), minio (9010/9001)
npm run dev            # Inicia 4 watchers: types, schemas, api (tsx), web (vite)
```

- **API**: http://localhost:5050
- **Web**: http://localhost:3000
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)

## Estructura del Proyecto

| Path | Propósito |
|---|---|
| `apps/api/` | Backend Express + MikroORM + PostgreSQL (port 5050) |
| `apps/web/` | Frontend React 18 + Vite + Tailwind (port 3000) |
| `packages/types/` | Interfaces y tipos TS compartidos (`@scaffold/types`) |
| `packages/schemas/` | Esquemas Zod de validación (`@scaffold/schemas`) |
| `packages/config/` | Configuraciones tsconfig, eslint, prettier |

## Comandos Principales

### Desarrollo
```bash
npm run dev              # Inicia todo el entorno de desarrollo
npm run build            # Build packages primero, luego apps (orden importa)
npm run ts-check         # Verificación de tipos en ambos workspaces
npm run lint             # Lint en ambos workspaces
```

### Base de Datos
```bash
npm run migration:create   # Crea nuevo archivo de migración
npm run migration:up       # Aplica migraciones pendientes
npm run migration:down     # Revierte última migración
npm run seed               # Llena BD con datos de prueba
npm run db:reset           # Reinicia volúmenes Docker (destruvtivo)
```

### Producción
```bash
# En el servidor de producción (~/mrp-app/)
./deploy.sh                 # Despliegue completo con migraciones automáticas

# O manualmente:
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker exec mrp-app-api-1 npm run migration:prod --workspace=api
```

## Módulos Principales

### API (`apps/api/src/modules/mrp/`)
- **auth/**: Autenticación JWT
- **user/**: Gestión de usuarios
- **health/**: Health checks
- **mrp/**: Módulo principal (manufactura/calidad ERP)
  - Proveedores y materia prima
  - Órdenes de compra y requisiciones
  - Producción y órdenes de fabricación
  - Gestión de calidad (ISO 13485)
  - Documentos controlados
  - Inventario y trazabilidad

### Características Implementadas
- ✅ Pronóstico de producción basado en ventas históricas
- ✅ Retenciones en compras (IVA y Fuente) con MikroORM
- ✅ Carga de documento RUT para proveedores (MinIO)
- ✅ Paginación y búsqueda en listas (proveedores, productos, órdenes)
- ✅ Generación de PDFs (Playwright + Pug)
- ✅ Gestión de calidad completa (no conformidades, CAPA, auditorías)

## Convenciones Importantes

### Orden de Build
`@scaffold/types` → `@scaffold/schemas` → apps. Siempre ejecuta `npm run build:packages` antes de `ts-check` en apps.

### Migraciones
- Entidades en `apps/api/src/modules/*/entities/*.entity.ts`
- Migraciones en `apps/api/src/modules/*/migrations/`
- `.env` se carga desde la raíz del monorepo
- `allowGlobalContext: true` en dev, `false` en producción

### Frontend
- Alias de ruta `@/*` mapea a `src/*`
- `getErrorMessage(error, fallback)` requiere **2 argumentos**
- Paginación: API devuelve `{ data: [], total }`, hooks retornan `{ ..., page, limit, totalPages }`

## Infraestructura

| Servicio | Puerto Dev | Credenciales |
|---|---|---|
| PostgreSQL | 5433 | postgres/postgres, db: scaffold_db |
| Redis | 6379 | sin auth |
| MinIO | 9010 (API), 9001 (consola) | minioadmin/minioadmin, bucket: mrp-quality-documents |

**Producción**: La BD se llama `mrp_db` (no `scaffold_db`). Despliegue vía `~/mrp-app/deploy.sh`.

## Testing

No hay framework de testing configurado actualmente. `npm run test` ejecuta workspaces con `--if-present` (no-op).

## Contribución

No hay pre-commit hooks ni workflows de CI en el repo. Haz push directo a `main`.

---

Para más detalles técnicos, ver [AGENTS.md](./AGENTS.md).
