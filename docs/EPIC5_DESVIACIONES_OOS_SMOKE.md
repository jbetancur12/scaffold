# Epic 5 - Smoke Test Desviaciones y OOS

Fecha: 2026-02-15

Objetivo: validar flujo operativo de desviaciones/OOS y bloqueos de liberación/despacho.

## Precondiciones

1. Migración aplicada:
- `Migration20260216100000_AddDeviationAndOos`

2. Tener un lote existente con:
- checklist QA disponible,
- opción de despacho en módulo de calidad/postmercado.

## Flujo A - Desviación bloquea liberación QA

1. Ir a `Calidad > Desviaciones/OOS`.
2. Crear desviación vinculada al lote (`productionBatchId`).
3. Intentar firmar liberación QA del mismo lote.

Resultado esperado:
- Se bloquea liberación con mensaje de desviación abierta.

4. Cerrar desviación (requiere):
- resumen de investigación,
- evidencia de cierre.
5. Reintentar liberación QA.

Resultado esperado:
- Se permite continuar si no hay otros bloqueos.

## Flujo B - OOS bloquea despacho

1. Crear caso OOS para el lote.
2. Intentar despacho del mismo lote.

Resultado esperado:
- Se bloquea despacho con mensaje de OOS abierto.

3. Cerrar OOS (requiere):
- disposición QA,
- notas de decisión.
4. Reintentar despacho.

Resultado esperado:
- Se permite continuar si no hay otros bloqueos.

## Flujo C - Vínculo CAPA

1. En formularios de Desviación/OOS, seleccionar CAPA relacionado.
2. Guardar registro.
3. Verificar en listado que aparece `capaActionId`.

Resultado esperado:
- Trazabilidad visible entre desviación/OOS y CAPA.

## Flujo D - KPI de cumplimiento

1. Ir a `Calidad > Cumplimiento`.
2. Verificar tarjetas:
- `Desviaciones abiertas`
- `Casos OOS abiertos`

Resultado esperado:
- KPIs reflejan cambios al abrir/cerrar casos.
