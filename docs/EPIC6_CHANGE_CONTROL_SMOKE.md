# Epic 6 - Smoke Test Control de Cambios

Fecha: 2026-02-15

Objetivo: validar flujo de control de cambios con aprobaciones y trazabilidad de lotes/documentos.

## Precondiciones

1. Migración aplicada:
- `Migration20260216120000_AddChangeControl`

2. Tener IDs de referencia (opcionales):
- documento controlado,
- orden/lote de producción.

## Flujo A - Crear solicitud de cambio

1. Ir a `Calidad > Control de cambios`.
2. Crear una solicitud con:
- tipo,
- impacto,
- descripción,
- referencias opcionales (documento/lote/orden).

Resultado esperado:
- estado inicial `borrador`,
- evento de auditoría `change_control.created`.

## Flujo B - Aprobaciones por rol

1. En la solicitud, usar acción `Aprobar rol`.
2. Registrar aprobación para rol `QA`.
3. Para cambio `critico`, registrar segunda aprobación (ej. `Producción`).

Resultado esperado:
- solicitud pasa a `en_evaluacion` tras primera aprobación,
- quedan aprobaciones visibles por solicitud.

## Flujo C - Regla crítica de aprobación

1. Intentar marcar `aprobado` un cambio crítico con solo 1 aprobación.

Resultado esperado:
- API bloquea con mensaje de mínimo 2 aprobaciones.

2. Con 2 aprobaciones válidas, marcar `aprobado`.

Resultado esperado:
- solicitud queda en `aprobado`.

## Flujo D - KPI

1. Ir a `Calidad > Cumplimiento`.
2. Verificar tarjeta `Cambios pendientes`.

Resultado esperado:
- contabiliza `borrador` + `en_evaluacion`,
- disminuye al pasar cambios a `aprobado/rechazado/implementado/cancelado`.
