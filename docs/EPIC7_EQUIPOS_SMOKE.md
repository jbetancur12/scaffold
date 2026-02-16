# Epic 7 - Smoke Test (Calibración y Mantenimiento)

Objetivo: validar maestro de equipos, historial y bloqueo operativo por vencimientos en equipos críticos.

## 1. Crear equipo crítico

1. Ir a `Calidad > Equipos`.
2. Crear equipo con:
- `code`: `PRENSA-01`
- `name`: `Prensa de termomoldeo`
- `isCritical`: `true`
- `calibrationFrequencyDays`: `30`
- `maintenanceFrequencyDays`: `30`

Esperado:
- Equipo aparece en listado.
- Estado inicial `activo`.

## 2. Registrar calibración y mantenimiento

1. En el formulario de calibración:
- equipo: `PRENSA-01`
- resultado: `aprobada`
- `executedAt`: hoy
- `dueAt`: hoy + 30 días (o dejar vacío si configuraste frecuencia)
2. En el formulario de mantenimiento:
- equipo: `PRENSA-01`
- tipo: `preventivo`
- resultado: `completado`
- `executedAt`: hoy
- `dueAt`: hoy + 30 días

Esperado:
- Se actualizan fechas de próximo vencimiento en el listado.
- Historial del equipo muestra ambos eventos.

## 3. Registrar uso en lote

1. Crear lote de producción (si no existe).
2. En "Vincular Equipo a Lote", registrar:
- `productionBatchId`: UUID de lote
- `equipmentId`: `PRENSA-01`

Esperado:
- Uso aparece en "Últimos usos".
- Historial del equipo muestra el lote vinculado.

## 4. Validar bloqueo por equipo vencido

1. Registrar una nueva calibración para `PRENSA-01` con `dueAt` en fecha pasada.
2. Mantener el equipo como crítico y con uso registrado en el lote.
3. Intentar firmar liberación QA del lote.

Esperado:
- Error de bloqueo: equipo crítico con calibración/mantenimiento vencido.
- No se libera el lote.

## 5. Levantar bloqueo

1. Registrar calibración/mantenimiento vigente para el mismo equipo.
2. Reintentar firma de liberación QA.

Esperado:
- Se elimina bloqueo por equipos.
- Firma QA procede (si resto de checklist está conforme).

## 6. Validar alertas

1. Ir a sección de alertas en `Calidad > Equipos`.
2. Verificar:
- alertas `vencido` para equipos con due date pasada
- alertas `proximo` para due dates dentro de 30 días

Esperado:
- Alertas muestran tipo (calibración/mantenimiento), días restantes y severidad.
