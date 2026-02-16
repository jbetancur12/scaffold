# TODO Detallado INVIMA - Siguiente Etapa (Post Fase 6)

Este plan extiende lo ya implementado en `docs/INVIMA_TODO.md` y se enfoca en cerrar brechas operativas desde ingreso de materia prima hasta despacho y postmercado.

## Plan de ejecución técnica

Para ejecutar este roadmap con foco en escalabilidad y mantenibilidad (separación de responsabilidades y centralización en `packages`), seguir:

- `docs/QUALITY_REFACTOR_PHASES.md`

## Objetivo

Llevar la app de "buen soporte de trazabilidad" a "operación robusta para auditoría en planta", con controles obligatorios, evidencia consolidada y bloqueos preventivos.

## Prioridad de ejecución

1. Liberación formal de lote por QA.
2. Inspección de recepción y cuarentena de materia prima.
3. Trazabilidad de despacho por cliente.
4. DHR/DMR digital exportable por lote.
5. Desviaciones/OOS.
6. Control de cambios.
7. Calibración/mantenimiento.
8. Alertas operativas.

## Epic 1 - Recepción, Inspección y Cuarentena de Materia Prima

### Alcance funcional

- Registrar inspección de recepción por ítem de OC:
  - resultado (`aprobado`, `condicional`, `rechazado`)
  - muestreo/lote proveedor
  - certificado adjunto (ref documental)
  - observaciones
- Flujo de cuarentena:
  - todo ingreso inicial en estado `cuarentena`
  - solo QA puede mover a `liberado` o `rechazado`
- Bloqueo de consumo en producción si materia prima no está `liberada`.

### Entidades sugeridas

- `incoming_inspection`
- `incoming_inspection_attachment` (opcional si no se reutiliza módulo documental)

### Criterios de aceptación

- No se puede reservar ni consumir inventario en producción desde `cuarentena`.
- Auditoría registra actor, fecha y decisión de liberación/rechazo.
- Se puede listar historial por lote proveedor y por materia prima.

## Epic 2 - Liberación de Lote por QA (Batch Release)

### Alcance funcional

- Nuevo estado de lote: `pendiente_liberacion` -> `liberado_qa`.
- Checklist de liberación obligatorio:
  - QC aprobado
  - etiquetado regulatorio validado
  - documentación vigente
  - evidencias requeridas completas
- Firma de liberación (manual/digital) con responsable QA.
- Bloqueo de despacho si lote no está `liberado_qa`.

### Entidades sugeridas

- `batch_release`
- `batch_release_item` (ítems de checklist)

### Criterios de aceptación

- Ningún despacho se confirma sin `liberado_qa`.
- Si cambia una condición crítica post-liberación, lote vuelve a bloqueado.
- Exportable de liberación por lote (PDF/JSON/CSV según política).

## Epic 3 - Trazabilidad de Despacho por Cliente

### Alcance funcional

- Registro de despacho:
  - cliente, documento comercial, fecha, responsable
  - lotes/unidades seriales despachadas
- Consulta inversa:
  - por cliente -> qué lotes/seriales recibió
  - por serial/lote -> a qué cliente salió
- Integrar con recall para notificación dirigida.

### Entidades sugeridas

- `shipment`
- `shipment_item` (batch/serial)
- `customer` (si no existe módulo comercial)

### Criterios de aceptación

- Se puede ejecutar trazabilidad bidireccional en menos de 2 consultas UI.
- Recall puede filtrar automáticamente destinatarios afectados.
- Auditoría registra creación y ajustes de despacho.

## Epic 4 - DHR/DMR Digital por Lote

### Alcance funcional

- Generar expediente de lote unificado (DHR):
  - materias primas usadas
  - hitos de producción/QC/empaque
  - etiquetas regulatorias
  - liberación QA
  - despacho
  - incidencias (NC/CAPA/Desviación)
- Definir plantilla DMR por producto/proceso.
- Exportación consolidada para auditoría.

### Criterios de aceptación

- Un lote puede exportarse con paquete único de evidencia.
- Toda sección incluye timestamp y actor.
- El expediente es reproducible (mismo lote, misma evidencia histórica).

## Epic 5 - Desviaciones y OOS

Estado actual (implementación base):
- Flujo API/UI para `process_deviation` y `oos_case` ya disponible.
- Bloqueo de liberación QA y despacho cuando existan desviaciones/OOS abiertos por lote.
- Inclusión de métricas de desviaciones/OOS en tablero de cumplimiento.
- Guía de verificación manual: `docs/EPIC5_DESVIACIONES_OOS_SMOKE.md`.

### Alcance funcional

- Flujo dedicado para desviación en proceso:
  - apertura, clasificación, contención, investigación, cierre
- OOS (Out Of Spec) para controles QC:
  - resultado fuera de especificación
  - bloqueo automático de lote hasta disposición QA
- Integración con CAPA cuando aplique.

### Entidades sugeridas

- `process_deviation`
- `oos_case`

### Criterios de aceptación

- OOS bloquea lote y evita liberación/despacho.
- Cierre requiere causa y decisión documentada.
- Enlaces visibles entre OOS/Desviación y CAPA.

## Epic 6 - Control de Cambios

Estado actual (implementación base):
- Flujo API/UI para `change_control` y `change_control_approval` disponible.
- Regla de aprobación: cambio crítico requiere al menos 2 aprobaciones para pasar a `aprobado`.
- KPI de cumplimiento incluye cambios pendientes (`borrador`/`en_evaluacion`).
- Guía de verificación manual: `docs/EPIC6_CHANGE_CONTROL_SMOKE.md`.

### Alcance funcional

- Solicitudes de cambio (material/proceso/documento/parámetro).
- Evaluación de impacto (calidad, regulatorio, inventario, capacitación).
- Aprobaciones por rol y fecha efectiva.
- Trazabilidad de qué lotes se fabricaron antes/después del cambio.

### Entidades sugeridas

- `change_control`
- `change_control_approval`

### Criterios de aceptación

- No se ejecuta cambio crítico sin aprobación requerida.
- Cambios quedan vinculados a documentos y lotes afectados.
- Auditoría completa por etapa del flujo.

## Epic 7 - Calibración y Mantenimiento de Equipos

Estado actual (implementación base):
- Flujo API/UI para `equipment`, `equipment_calibration`, `equipment_maintenance` y `batch_equipment_usage` disponible.
- Alertas operativas por vencimiento (próximo/vencido) visibles en módulo de calidad.
- Bloqueo de liberación QA/despacho cuando el lote tenga uso de equipo crítico con calibración o mantenimiento vencido.
- Guía de verificación manual: `docs/EPIC7_EQUIPOS_SMOKE.md`.

### Alcance funcional

- Maestro de equipos críticos.
- Plan de calibración/mantenimiento con vencimientos.
- Evidencia de ejecución.
- Bloqueo de operación si equipo crítico está vencido.

### Entidades sugeridas

- `equipment`
- `equipment_maintenance`
- `equipment_calibration`

### Criterios de aceptación

- Alertas previas a vencimiento.
- No permite liberar lote si se usó equipo crítico vencido.
- Historial completo por equipo.

## Epic 8 - Alertas Operativas y Gobierno de Cumplimiento

Estado actual (implementación base):
- Bandeja única de alertas operativas por rol (`qa`, `produccion`, `regulatorio`, `direccion_tecnica`) disponible en UI/API.
- Alertas implementadas: CAPA vencida, capacitación vencida, documento próximo a expirar/vencido, lote pendiente de liberación, recall abierto y equipo crítico vencido.
- Exportación de reporte semanal de cumplimiento en CSV/JSON disponible.
- Guía de verificación manual: `docs/EPIC8_ALERTAS_SMOKE.md`.

### Alcance funcional

- Alertas de:
  - CAPA vencida
  - entrenamiento vencido
  - documento próximo a expirar
  - lote pendiente de liberación
  - recall abierto
- Bandeja única de pendientes por rol.
- Reporte semanal automático de cumplimiento.

### Criterios de aceptación

- Pendientes críticos visibles al abrir módulo.
- Alertas accionables con link directo al caso.
- Reducción de cierres tardíos medible en KPI.

## Plan técnico recomendado (backend/web/packages)

1. Contratos primero:
- `packages/types`: enums/interfaces nuevos.
- `packages/schemas`: DTOs zod para todos los endpoints.

2. Backend:
- entidades + migraciones reversibles
- servicios con reglas de bloqueo
- controller sin schemas inline
- auditoría obligatoria en acciones críticas

3. Frontend:
- `services` API pura
- `hooks/mrp` con invalidaciones de cache
- `pages` delgadas (formularios, listas, estados y acciones)

## Definición de terminado por epic

- Inputs validados con schemas compartidos.
- Reglas de bloqueo operativas cubiertas por pruebas manuales.
- Eventos de auditoría visibles.
- `ts-check` + `lint` en verde (`api`, `web`, `packages`).
- Migración aplicada localmente.

## Checklist transversal de evidencias

- Actor identificado en acciones críticas.
- Timestamp en UTC.
- Referencia documental o adjunto cuando aplique.
- Exportable por lote/caso disponible.
- Trazabilidad cruzada (origen -> proceso -> salida -> postmercado).
