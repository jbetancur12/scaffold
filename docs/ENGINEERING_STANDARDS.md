# Estándares de Ingeniería (API + Web + Packages)

Este documento define reglas obligatorias para garantizar escalabilidad, mantenibilidad y trazabilidad.

## 0. Principios rectores

- Separación de responsabilidades por capa y por módulo.
- Contratos compartidos como fuente única de verdad.
- Cambios pequeños, reversibles y observables.
- Diseño orientado a evolución (bajo acoplamiento, alta cohesión).

Convención normativa:

- `MUST`: obligatorio.
- `SHOULD`: recomendado fuerte (si no se cumple, debe justificarse en PR).
- `MAY`: opcional.

## 1. Arquitectura general

- Monorepo con contratos compartidos en `packages/`.
- `packages/types` es la fuente de verdad de tipos de dominio compartidos.
- `packages/schemas` es la fuente de verdad de validaciones DTO (Zod).
- `apps/api` implementa reglas de negocio, transacciones y persistencia.
- `apps/web` implementa UI y orquestación de casos de uso del frontend.

Reglas:

- `MUST`: no duplicar tipos/schemas locales si ya existen en `packages`.
- `MUST`: si un tipo/schema se usa en 2 o más apps, moverlo a `packages`.
- `MUST`: cada módulo nuevo definir explícitamente su frontera (qué expone y qué no).
- `SHOULD`: evitar dependencias cruzadas entre módulos de dominio.

## 2. Contrato estándar de API

### 2.1 Envelope de respuesta

Todas las rutas `MUST` responder usando `ApiResponse`.

Formato éxito:

```json
{
  "success": true,
  "message": "Texto",
  "data": {}
}
```

Formato error:

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

Nota: en web existe interceptor que desempaqueta `data`; no romper ese flujo.

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

- `MUST`: toda entrada de controller validada con Zod desde `@scaffold/schemas`.
- `MUST`: no usar `req.body`/`req.query` sin parseo.
- `MUST`: en módulos compartidos (MRP/Calidad), no definir `z.object(...)` inline en controller.
- `SHOULD`: evitar schemas locales salvo transición corta; crear ticket para migrar a `packages/schemas`.

## 3. Reglas backend (`apps/api`)

### 3.1 Separación de responsabilidades

- Controllers: parsing/validación + delegación a servicios + formateo de respuesta.
- Services: reglas de negocio, coordinación de repositorios y transacciones.
- Entities: persistencia y relaciones, sin lógica de negocio compleja.

Reglas:

- `MUST`: errores de negocio con `AppError` y status correcto.
- `MUST`: operaciones críticas registran auditoría.
- `MUST`: cada cambio de esquema incluye migración reversible (`up/down`).
- `SHOULD`: servicios grandes dividirse por subdominio (ej. `quality-dhr.service.ts`, `quality-labeling.service.ts`).

### 3.2 Límites de complejidad (backend)

- `SHOULD`: controllers < 300 líneas por archivo.
- `SHOULD`: servicios < 600 líneas por archivo.
- `SHOULD`: métodos > 80 líneas evaluar extracción.
- `MUST`: si un servicio crece por múltiples subflujos, separarlo por capacidades.

## 4. Reglas frontend (`apps/web`)

### 4.1 Separación de responsabilidades

- `services/`: acceso HTTP puro.
- `hooks/mrp/`: casos de uso y estado de UI-orquestación.
- `pages/`: render y wiring de componentes, mínima lógica.
- `components/`: UI reutilizable/presentacional.

Reglas:

- `MUST`: páginas sin lógica de negocio compleja.
- `MUST`: formularios/side-effects de dominio en hooks de módulo.
- `SHOULD`: secciones grandes (tabs/submódulos) en componentes separados.

### 4.2 Fetching y caché

- `MUST`: usar `useMrpQuery`/`useMrpMutation`.
- `MUST`: query keys centralizados.
- `MUST`: invalidar caché por recurso afectado tras mutaciones.
- `SHOULD`: defaults conservadores para evitar stale data en CRUD crítico.

### 4.3 Manejo de errores UI

- `MUST`: mensajes orientados a usuario en español.
- `MUST`: mostrar causa real cuando exista (`getErrorMessage`).
- `SHOULD`: reutilizar hooks comunes para errores repetitivos:
  - `useMrpQueryErrorToast`
  - `useMrpQueryErrorRedirect`

### 4.4 Idioma

- `MUST`: textos de UI y acciones en español.
- `MUST`: evitar labels en inglés para estados operativos visibles al usuario final.

### 4.5 Límites de complejidad (frontend)

- `SHOULD`: páginas < 250 líneas.
- `SHOULD`: hooks < 400 líneas.
- `SHOULD`: componentes de sección < 300 líneas.
- `MUST`: si una pantalla supera límites por múltiples submódulos, dividir por secciones/feature components.

## 5. Centralización en `packages`

### 5.1 Qué va en `packages/types`

- Tipos de dominio compartidos (`Entity`, `DTO`, `payloads`, enums).
- Contratos de respuesta reutilizables por API y Web.

### 5.2 Qué va en `packages/schemas`

- Schemas Zod de entrada/salida compartidos.
- Validaciones de negocio básicas de DTO (shape y consistencia mínima).

### 5.3 Política de duplicación

- `MUST`: si un tipo/schema existe local y compartido, usar el compartido.
- `MUST`: no crear interfaces de payload en `services/*Api.ts` si son compartidas.
- `SHOULD`: migrar gradualmente duplicados existentes con commits atómicos.

## 6. Diseño de módulos y rutas (UX + arquitectura)

- `MUST`: rutas seguir jerarquía de módulo padre (`/quality/*`, `/postmarket/*`, etc.).
- `MUST`: evitar slugs híbridos/confusos (`/mrp/quality/*`) salvo redirect legacy temporal.
- `SHOULD`: mantener navegación consistente (padre/submódulo) y terminología del dominio.
- `MUST`: flujos transversales documentados (ej. OC -> recepción -> QC -> etiquetado -> liberación -> despacho).

## 7. Observabilidad y operación

- `MUST`: registrar eventos auditables para acciones críticas de negocio.
- `SHOULD`: agregar `errorCode` estable para errores de negocio frecuentes.
- `SHOULD`: incluir contexto mínimo en logs (entidad, actor, acción, timestamp).

## 8. Tests y calidad de cambio

- `MUST`: `ts-check` y `lint` en verde en apps afectadas.
- `SHOULD`: tests de integración en flujos críticos (regulatorio, inventario, producción, despacho).
- `MUST`: no mezclar refactor estructural y cambio funcional grande si se puede separar.

## 9. Convenciones de cambios

- Commits pequeños, atómicos y con mensaje claro.
- Si se agrega patrón nuevo, documentarlo en `docs/`.
- `SHOULD`: un commit por intención técnica (ej. `refactor(api)`, `feat(web)`, `chore(types)`).

## 10. Definición de terminado (DoD)

Un cambio está "listo" cuando:

- [ ] Cumple este estándar.
- [ ] Separación de responsabilidades verificada por capa.
- [ ] Contratos/tipos/schemas compartidos centralizados en `packages` cuando aplique.
- [ ] `ts-check` y `lint` verdes en apps afectadas.
- [ ] Tests relevantes ejecutados o justificación documentada.
- [ ] Migraciones aplicables ejecutadas localmente (si hubo DB changes).
- [ ] No rompe contrato de API ni contratos compartidos.
- [ ] Riesgos y decisiones no triviales documentados en PR.

## 11. Checklist rápido por PR

### Backend

- [ ] Controller delgado (parsea/valida/delega).
- [ ] Servicio con responsabilidad clara y acotada.
- [ ] Sin schemas inline en controller.
- [ ] `ApiResponse` consistente.
- [ ] Migración reversible (si aplica).
- [ ] Auditoría en acciones críticas.

### Frontend

- [ ] Página delgada, sin lógica de negocio compleja.
- [ ] Hooks por caso de uso/submódulo.
- [ ] Query keys/invalidation correctas.
- [ ] Errores UX claros y en español.
- [ ] Rutas coherentes con módulo padre.

### Shared packages

- [ ] Tipos/schemas compartidos movidos a `packages` cuando aplica.
- [ ] Sin duplicación innecesaria entre `apps/*` y `packages/*`.
