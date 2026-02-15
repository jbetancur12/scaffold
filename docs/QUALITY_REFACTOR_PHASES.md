# Plan de Fases - Refactor Calidad/INVIMA

Objetivo: llevar el módulo de Calidad/INVIMA a un estado más escalable y mantenible, cumpliendo `docs/ENGINEERING_STANDARDS.md`.

## Estado actual

- Rutas padre/hijo ya normalizadas (`/quality/*`, `/postmarket/*`) con redirects legacy.
- Contratos compartidos parcialmente centralizados en `packages/types` y `packages/schemas`.
- Persisten piezas grandes:
  - `apps/api/src/modules/mrp/services/quality.service.ts`
  - `apps/web/src/hooks/mrp/useQualityCompliance.ts`
  - `apps/web/src/pages/quality/QualityComplianceTabPanels.tsx`

## Principios de ejecución

- Cambios por fases pequeñas y reversibles.
- Mantener contrato externo estable (API/UI) durante el refactor.
- Un commit por intención técnica.
- Validación por fase: `ts-check` + `lint` + smoke test manual.

---

## Fase 1 - Backend: desacople por subservicios

### Alcance

- Extraer desde `QualityService` a servicios especializados:
  - `quality-labeling.service.ts`
  - `quality-incoming.service.ts`
  - `quality-batch-release.service.ts`
  - `quality-postmarket.service.ts` (techno/recall/shipments)
- Dejar `QualityService` como fachada/orquestador para no romper controller.

### Criterios de salida

- `QualityService` reduce tamaño y delega por responsabilidad.
- Sin cambios en endpoints ni payloads.
- `apps/api` en verde (`ts-check`, `lint`).

### Riesgos

- Regresión en reglas de negocio cruzadas (labeling + dispatch + release).

### Mitigación

- Mantener firmas públicas iguales.
- Verificar manualmente flujo: recepción -> etiquetado -> liberación -> despacho.

---

## Fase 2 - Frontend hooks: separar casos de uso

### Alcance

- Partir `useQualityCompliance` en hooks por dominio:
  - `useQualityNcCapaFlow`
  - `useQualityDocsFlow`
  - `useQualityPostmarketFlow`
  - `useQualityLabelingFlow`
  - `useQualityDhrFlow`
  - reusar `useQualityReceptionReleaseFlow` existente
- Mantener un hook facade opcional para compatibilidad temporal.

### Criterios de salida

- Hook monolítico reducido o eliminado.
- Cada hook con responsabilidad clara y menor tamaño.
- `apps/web` en verde (`ts-check`, `lint`).

### Riesgos

- Invalidaciones de caché incompletas.

### Mitigación

- Checklist por mutación: invalidar query key de recurso + auditoría + panel relacionado.

---

## Fase 3 - Frontend UI: dividir paneles por sección

### Alcance

- Partir `QualityComplianceTabPanels.tsx` en componentes por tab:
  - `QualityNcTab.tsx`, `QualityCapaTab.tsx`, `QualityDocsTab.tsx`, etc.
- Mantener `QualityCompliancePage` como contenedor delgado.

### Criterios de salida

- Componentes de sección independientes y legibles.
- Sin cambios de UX/flujo funcional.
- `apps/web` en verde (`ts-check`, `lint`).

### Riesgos

- Props drilling y contratos de props inestables.

### Mitigación

- Definir tipos de props compartidos en `packages/types` cuando se repitan.

---

## Fase 4 - Centralización de contratos compartidos

### Alcance

- Mover a `packages/types` y `packages/schemas` cualquier payload/schema duplicado restante.
- Eliminar interfaces locales redundantes de `apps/web/src/services/mrpApi.ts` o hooks.

### Criterios de salida

- Sin duplicación de contratos entre apps.
- Schemas de entrada en `packages/schemas` para rutas compartidas.

### Riesgos

- Cambios de import y ciclos no deseados.

### Mitigación

- Migración por bloques pequeños y verificación continua de compilación.

---

## Fase 5 - Hardening de calidad

### Alcance

- Completar smoke tests manuales de flujos críticos:
  - OC/recepción
  - NC/CAPA
  - documentos controlados
  - DHR/DMR
  - etiquetado/lote/serial
  - liberación QA
  - despacho y recall
- Ajuste final de mensajes de error y trazabilidad.

### Criterios de salida

- Flujos críticos sin regresión.
- Documento de hallazgos y pendientes residuales.

---

## Backlog técnico sugerido

- Agregar pruebas de integración por flujo regulatorio en API.
- Unificar factory/helpers de formularios para tabs de calidad.
- Definir métricas simples de tamaño por archivo para alertar crecimiento.

## Regla de finalización

Cada fase se cierra solo si:

- [ ] Scope completado.
- [ ] `ts-check` y `lint` en verde en apps afectadas.
- [ ] Sin ruptura de contrato público.
- [ ] Commit atómico y trazable.
