# Epic 8 - Smoke Test (Alertas Operativas y Gobierno)

Objetivo: validar bandeja única de pendientes por rol y reporte semanal de cumplimiento.

## 1. Generar alertas base

Crear/forzar al menos un caso de cada tipo:
- CAPA vencida (`/quality/capa`).
- Capacitación vencida (`/quality/compliance`).
- Documento aprobado próximo a vencer o vencido (`/quality/docs`).
- Lote pendiente de liberación QA (`/quality/batch-release`).
- Recall abierto (`/postmarket/recall`).
- Equipo crítico con calibración/mantenimiento vencido (`/quality/equipment`).

Esperado:
- Al menos 1 alerta visible por tipo aplicable.

## 2. Bandeja por rol

1. Ir a `Calidad > Alertas`.
2. Probar filtro de rol: `QA`, `Producción`, `Regulatorio`, `Dirección técnica`.

Esperado:
- Solo aparecen alertas relevantes al rol seleccionado.
- El contador total cambia según filtro.

## 3. Verificar severidades

Esperado:
- `crítica`: recall abierto, equipo crítico vencido, documento vencido.
- `alta`: CAPA vencida, documento por vencer, lote pendiente > 2 días.
- `media`: capacitación vencida, lote pendiente reciente.

## 4. Exportar reporte semanal

1. En `Calidad > Alertas`, exportar `Reporte semanal CSV` y `Reporte semanal JSON`.

Esperado:
- Se descarga archivo sin error.
- El contenido incluye resumen y detalle de alertas.

## 5. Cierre de alertas

1. Cerrar/corregir casos (por ejemplo, CAPA cerrada, lote liberado, documento renovado).
2. Refrescar bandeja.

Esperado:
- Las alertas relacionadas desaparecen de la bandeja.
