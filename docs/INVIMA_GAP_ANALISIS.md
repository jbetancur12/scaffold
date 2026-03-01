# Analisis GAP INVIMA - Estado Actual Plataforma

Fecha corte: 2026-03-01
Alcance: operación MRP/Calidad para materias primas, producción por lote y cumplimiento documental.

## Resumen ejecutivo

- Cumples una base fuerte en trazabilidad por lote de materia prima, kardex, control documental y bloqueos operativos.
- Las brechas principales no son de "falta total", sino de cierre operacional para auditoría: evidencia consolidada, controles homogéneos en todos los flujos y trazabilidad end-to-end más visible.
- Prioridad inmediata: dejar una matriz operativa única de cumplimiento y cerrar bloqueos críticos faltantes.

## Matriz de cumplimiento (alto nivel)

| Frente | Estado | Lo que ya existe | Brecha principal |
|---|---|---|---|
| Control documental (versionado/aprobación) | Parcial alto | Versionado, estado aprobado, uso en procesos y PDF | Homogeneizar selección/config global por proceso en todos los módulos |
| Trazabilidad MP por lote | Cumple | Recepción QA, lotes MP, kardex entradas/salidas | Mejorar visibilidad UI para consulta rápida por lote/documento |
| Consumo en producción (PEPS/FIFO) | Cumple | Consumo automático por OP y lógica PEPS | Reglas operativas de excepción y gestión de desvíos más explícitas |
| Recepción e inspección de MP | Parcial alto | Flujo QA y FOR de recepción | Ampliar checklist/estructura de evidencia para auditoría completa |
| Empaque por lote + FOR | Parcial alto | Formulario FOR, PDF y estado por lote | Controles transversales y UX para reducir fricción operativa |
| Liberación QA por lote | Parcial alto | Checklist + firma + validaciones | Trazabilidad documental más consolidada en un solo expediente |
| Kardex audit trail | Cumple | Movimientos con entradas/salidas y referencias | Exponer mejor consulta por filtro cruzado desde UI principal |
| Tecnovigilancia/CAPA/recall | Parcial | Base funcional creada (según roadmap interno) | Consolidar operación rutinaria y evidencia de uso real |
| Evidencia para inspección (paquete auditoría) | Parcial | PDFs y registros por proceso | Generar expediente único por lote (DHR) con enlaces cruzados |

## Checklist operativo recomendado (Go/No-Go INVIMA interno)

## A. Control documental por proceso
- [ ] Config global obligatoria para `recepcion`, `empaque`, `liberacion_qa`, `orden_compra`.
- [ ] En cada registro/PDF guardar snapshot: `codigo`, `titulo`, `version`, `fecha_control`.
- [ ] Bloqueo uniforme: no ejecutar proceso si no existe formato vigente o configuración explícita.

## B. Materia prima y bodega
- [ ] Recepción con datos mínimos obligatorios: lote proveedor, factura/remisión, COA/certificado (cuando aplique), resultado inspección.
- [ ] Cuarentena/liberado/rechazado segregado en inventario lógico.
- [ ] Kardex con motivo y documento origen obligatorio en cada movimiento.

## C. Producción por lote
- [ ] Planificación con sugerencia PEPS visible y selección manual permitida.
- [ ] Consumo automático al completar OP + opción de devolución de sobrantes a bodega (kardex).
- [ ] Regla de sobreproducción documentada (plan vs producido real y destino de excedente).

## D. QA + empaque + liberación
- [ ] FOR empaque diligenciado antes de cambiar estado a empacado.
- [ ] Checklist QA obligatorio y firma simple trazable por usuario/fecha/hora.
- [ ] Bloqueo de finalización OP si lotes no están en estado requerido.

## E. Evidencia de auditoría
- [ ] Vista única por lote: MP consumida, FOR recepción, FOR empaque, checklist/liberación QA, movimientos kardex, despacho.
- [ ] Exportable por lote (`PDF`/`ZIP`) para inspección.

## Priorización de implementación (siguientes sprints)

1. Sprint 1 (Crítico auditoría)
- Estandarizar configuración global de documentos por proceso y bloqueos homogéneos.
- Cerrar validaciones mínimas obligatorias en recepción, empaque y liberación.
- Mejorar vista UI de trazabilidad por lote sin navegación dispersa.

2. Sprint 2 (Evidencia)
- Generar expediente unificado por lote (DHR operativo).
- Enlaces cruzados entre OC/Recepción/OP/Empaque/QA/Kardex.
- Exportable consolidado para visita de inspección.

3. Sprint 3 (Madurez regulatoria)
- Ajustes de tecnovigilancia y rutina CAPA con indicadores de uso real.
- Alertas de vencimientos y pendientes críticos con SLA.

## Criterio de cierre interno

Declarar "listo para auditoría operativa" cuando:
- Todos los ítems de secciones A-D estén en `completo`.
- Exista al menos un caso E2E real (desde OC hasta liberación) con expediente exportado.
- No haya bypass operativo de bloqueos críticos.

## Backlog técnico ejecutable (seguimiento)

Convención:
- Estado: `[ ] pendiente` | `[~] en progreso` | `[x] completo`
- Prioridad: `P0` crítico auditoría, `P1` alto, `P2` mejora

### Sprint 1 - Bloqueos y configuración documental (P0)

- [~] `INV-001` Config global documental por proceso en un solo punto
  - Prioridad: `P0`
  - Objetivo: unificar selección de documento controlado para `recepción`, `empaque`, `liberación QA`, `OC`.
  - DoD:
  - existe endpoint único de lectura/escritura de configuración por proceso.
  - UI única de configuración global.
  - auditoría de cambio de configuración.
  - Avance 2026-03-01:
  - Se unificó UI en `Configuración Operativa > Documentos Globales` para guardar OC + recepción + empaque + etiquetado + liberación QA.
  - Pendiente: registrar auditoría explícita de cambios de configuración documental.

- [x] `INV-002` Snapshot documental obligatorio en cada registro/PDF
  - Prioridad: `P0`
  - Objetivo: guardar versión exacta usada en la ejecución.
  - DoD:
  - en DB quedan `code`, `title`, `version`, `control_date`, `doc_id`.
  - PDF histórico respeta snapshot aunque cambie la versión vigente.
  - Cierre 2026-03-01:
  - Recepción QA ahora persiste `documentControlId` + snapshot completo aunque no se seleccione manualmente (usa formato global o fallback aprobado).
  - Migración aplicada: `Migration20260301110000_AddIncomingInspectionDocumentControlId`.
  - Flujos de empaque y liberación QA ya venían con snapshot y PDF histórico por versión.

- [x] `INV-003` Bloqueos homogéneos por proceso
  - Prioridad: `P0`
  - Objetivo: evitar bypass por inconsistencias entre módulos.
  - DoD:
  - no se puede ejecutar recepción/empaque/liberación/OC sin documento aplicable.
  - mensajes de error claros en UI (sin errores técnicos crudos).
  - pruebas de regresión en flujos críticos.
  - Cierre 2026-03-01:
  - OC ahora exige FOR aprobado/vigente (si no existe, bloquea creación con mensaje guiado).
  - Se endureció validación por proceso documental en backend:
    - Empaque -> `EMPAQUE/FOR`
    - Etiquetado -> `EMPAQUE/FOR`
    - Liberación QA -> `CONTROL_CALIDAD/FOR`
    - Recepción -> `CONTROL_CALIDAD/FOR` con vigencia efectiva/expiración.
  - Se normalizaron errores técnicos comunes a mensajes operativos desde `apps/web/src/lib/api-error.ts`.

- [x] `INV-004` Validaciones mínimas obligatorias en recepción
  - Prioridad: `P0`
  - Objetivo: endurecer datos para trazabilidad auditada.
  - DoD:
  - validar lote proveedor, resultado inspección, responsable QA.
  - COA/certificado y factura obligatorios según resultado/proveedor.
  - rechazo condicional documentado con causa y acción.
  - Cierre 2026-03-01:
  - Backend exige soporte documental para cantidad aceptada: certificado/COA (referencia o archivo adjunto) y factura/remisión (número o archivo adjunto).
  - Frontend valida lo mismo antes de enviar, con mensajes operativos claros.
  - Persistencia normalizada con `trim` en datos críticos de resolución.

### Sprint 2 - Evidencia consolidada por lote (P1)

- [x] `INV-005` Vista única E2E por lote
  - Prioridad: `P1`
  - Objetivo: reducir navegación dispersa en operación y auditoría.
  - DoD:
  - timeline/línea de tiempo con hitos: OC -> recepción -> OP -> empaque -> QA -> despacho.
  - enlaces a FOR/PDF/documentos/firma/kardex desde la misma vista.
  - Cierre 2026-03-01:
  - `ProductionOrderDetailPage` incluye en "Centro de Lote" una vista E2E unificada con:
    - timeline operativo completo del lote
    - snapshot documental por etapa (código/version/fecha/estado)
    - bloque origen (recepción/OC) con enlace a OC cuando aplica
    - bloque de despacho por cliente/documento comercial
    - accesos directos a PDF FOR/PDF Etiquetado/PDF Liberación QA
    - acceso directo a Inventario/Kardex y exportación DHR

- [x] `INV-006` Expediente digital por lote (DHR operativo)
  - Prioridad: `P1`
  - Objetivo: paquete único para inspección.
  - DoD:
  - exportable consolidado por lote (`PDF` o `ZIP`).
  - incluye snapshot documental y firmas.
  - incluye consumos/devoluciones kardex.
  - Cierre 2026-03-01:
  - Se agregó exportación `PDF` del DHR por lote (`/mrp/quality/dhr/:productionBatchId/pdf`).
  - El DHR consolida ahora `materialMovements` (kardex) vinculados a OP con consumo/devolución.
  - La vista Centro de Lote muestra kardex MP (consumo/devolución) y acceso directo a `PDF DHR`.

- [x] `INV-007` Devolución de sobrantes a bodega con kardex
  - Prioridad: `P1`
  - Objetivo: cerrar ciclo operativo según procedimiento interno.
  - DoD:
  - registrar devolución parcial/total por lote de MP.
  - movimiento kardex de entrada con documento origen OP.
  - saldo lote actualizado y trazable.
  - Cierre 2026-03-01:
  - Nuevo endpoint: `POST /mrp/production-orders/:id/material-returns`.
  - Valida que no se devuelva más de lo consumido por esa OP/lote (`SALIDA_PRODUCCION` vs `ENTRADA_DEVOLUCION_PRODUCCION`).
  - Actualiza en transacción: saldo de lote MP, inventario agregado y movimiento kardex de entrada por devolución.
  - UI agregada en detalle de OP (pestaña Aprovisionamiento) para registrar devolución sin salir del flujo.

### Sprint 3 - Madurez operacional INVIMA (P2)

- [ ] `INV-008` Alertas operativas con SLA y bandeja por rol
  - Prioridad: `P2`
  - DoD:
  - alertas accionables para pendientes críticos.
  - indicadores de vencimiento/incumplimiento por rol.

- [ ] `INV-009` Tecnovigilancia + CAPA con evidencia de uso real
  - Prioridad: `P2`
  - DoD:
  - casos enlazables a lote/documento/proceso.
  - métricas básicas de cierre y tiempos.

- [ ] `INV-010` Auditoría interna digital pre-inspección
  - Prioridad: `P2`
  - DoD:
  - checklist auditable dentro de plataforma.
  - acta de cierre con hallazgos y plan de acción.

## Secuencia recomendada de implementación inmediata

1. Ejecutar `INV-001`, `INV-002`, `INV-003` juntos (misma capa de configuración/reglas).
2. Cerrar `INV-004` para robustecer recepción (impacto directo INVIMA).
3. Entrar a `INV-005` y `INV-006` para evidencia en inspección.

## Bitácora de ejecución

- 2026-03-01: se crea este backlog técnico con IDs para seguimiento incremental.
- 2026-03-01: avance `INV-001` en UI unificada de configuración documental global.
- 2026-03-01: cierre `INV-002` (snapshot completo en recepción + migración DB).
- 2026-03-01: cierre `INV-003` (bloqueos homogéneos + mensajes UI operativos).
- 2026-03-01: cierre `INV-004` (validaciones de recepción y evidencia mínima obligatoria).
- 2026-03-01: cierre `INV-005` (vista E2E de lote con origen y despacho).
- 2026-03-01: cierre `INV-006` (DHR PDF consolidado + kardex en expediente y centro de lote).
- 2026-03-01: cierre `INV-007` (devolución sobrantes MP con kardex y actualización de saldos).
