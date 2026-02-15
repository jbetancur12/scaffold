# Estándares de Ingeniería (API + Web + Packages)

Este documento define reglas mínimas para mantener consistencia, trazabilidad y calidad en cada cambio.

## 1. Arquitectura general

- Monorepo con contratos compartidos en `packages/`.
- `packages/types` es la fuente de verdad de tipos de dominio compartidos.
- `packages/schemas` es la fuente de verdad de validaciones DTO (Zod).
- `apps/api` implementa reglas de negocio y persistencia.
- `apps/web` implementa UI y orquestación de casos de uso del frontend.

Regla: no duplicar tipos/schemas locales si ya existen en `packages`.

## 2. Contrato estándar de API

### 2.1 Envelope de respuesta
Todas las rutas deben responder usando `ApiResponse`.

Formato de éxito:

```json
{
  "success": true,
  "message": "Texto",
  "data": {}
}
```

Formato de error:

```json
{
  "success": false,
  "message": "Texto",
  "errorCode": "OPCIONAL"
}
```

### 2.2 Paginación
Cuando aplique paginación, usar contrato consistente:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "items": [],
    "meta": {
      "total": 0,
      "page": 1,
      "limit": 10,
      "totalPages": 0
    }
  }
}
```

Nota: en web ya existe un interceptor que desempaqueta `data`. No romper ese flujo.

### 2.3 HTTP status

- `200`: operación exitosa.
- `201`: creación exitosa.
- `400`: validación/regla de negocio incumplida.
- `401`: no autenticado.
- `403`: no autorizado.
- `404`: recurso no encontrado.
- `409`: conflicto (duplicados, estado inválido por concurrencia).
- `500`: error no controlado.

### 2.4 Validación de entrada

- Toda entrada de controller se valida con `zod` desde `@scaffold/schemas` o schema local temporal justificado.
- No usar `req.body`/`req.query` sin parseo.

## 3. Reglas backend (`apps/api`)

- Controllers: parsing/validación + delegación a servicios + formateo de respuesta.
- Services: reglas de negocio, transacciones, coordinación de repositorios.
- Entities: persistencia y relaciones, sin lógica de negocio compleja.
- Errores de negocio: usar `AppError` con status correcto.
- Migraciones: cada cambio de esquema debe tener migración explícita y reversible (`up/down`).
- Auditoría: operaciones críticas deben registrar evento de auditoría.

Checklist backend por PR:

- [ ] Inputs validados.
- [ ] Errores con status correcto.
- [ ] Respuesta con `ApiResponse`.
- [ ] Migración incluida si cambia DB.
- [ ] `ts-check` y `lint` en verde.

## 4. Reglas frontend (`apps/web`)

### 4.1 Separación de responsabilidades

- `services/`: acceso HTTP puro.
- `hooks/mrp/`: casos de uso y estado de UI-orquestación.
- `pages/`: render y wiring de componentes (mínima lógica de negocio).
- `components/`: UI reutilizable/presentacional.

Regla: una página no debe contener lógica de negocio compleja si puede extraerse a hook de módulo.

### 4.2 Fetching y caché

- Usar `useMrpQuery`/`useMrpMutation`.
- Definir `queryKeys` centralizados.
- Invalidar cache por recurso afectado luego de mutaciones.
- Mantener defaults conservadores de caché para evitar datos obsoletos en CRUD crítico.

### 4.3 Manejo de errores UI

- Mensajes orientados a usuario en español.
- Mostrar causa real cuando exista (`getErrorMessage`).
- Reutilizar hooks comunes para errores repetitivos:
  - `useMrpQueryErrorToast`
  - `useMrpQueryErrorRedirect`

### 4.4 Idioma

- Textos de UI y acciones en español.
- Evitar labels en inglés para estados operativos visibles al usuario final.

Checklist frontend por PR:

- [ ] Página delgada (sin mezclar demasiada lógica).
- [ ] Errores consistentes y claros.
- [ ] Query keys e invalidaciones correctas.
- [ ] Textos en español.
- [ ] `ts-check` y `lint` en verde.

## 5. Reglas de dominio para trazabilidad (INVIMA)

- No permitir avanzar procesos críticos sin precondiciones regulatorias.
- Mantener trazabilidad por lote y, cuando aplique, por unidad serializada.
- Control documental vigente por proceso crítico (producción, QC, empaque).
- Registrar eventos auditables para acciones críticas.

## 6. Convenciones de cambios

- Commits pequeños, atómicos y con mensaje claro.
- No mezclar refactor estructural con cambio funcional grande en el mismo commit (si se puede evitar).
- Si se agrega patrón nuevo, documentarlo en `docs/`.

## 7. Definición de terminado (DoD)

Un cambio está "listo" cuando:

- [ ] Cumple este estándar.
- [ ] Tests/lint/types verdes.
- [ ] Migraciones aplicables ejecutadas en entorno local.
- [ ] No rompe contrato de API ni contratos compartidos de `packages`.
