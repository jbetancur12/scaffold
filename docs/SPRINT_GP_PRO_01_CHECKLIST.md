# Sprint Checklist - GP-PRO-01 Control de Materias Primas

Estado general: `EN CURSO`
Responsable: `Codex + Jorge`

## Uso
- Marca cada tarea con `[x]` cuando esté completa.
- Actualiza `Fecha` y `Notas` en cada ítem.
- No cerrar el sprint hasta validar flujo end-to-end.

## Checklist de Implementación

- [x] 1. Proveedor preferido por materia prima
  - Alcance: agregar proveedor preferido y alternos por materia prima, autoselección en OC.
  - Entregables:
    - Backend: campos/relación en materia prima.
    - Frontend: formulario de materia prima con proveedor preferido/alternos.
    - Frontend OC: sugerencia automática de proveedor.
  - Fecha: 2026-02-23
  - Notas: Se activó el proveedor preferido usando `supplierId` existente en materia prima, se corrigió persistencia real en create/update, se prioriza en sugerencias por material y se muestra/configura en UI de materia prima. La OC usa esa prioridad al autoseleccionar proveedor.

- [ ] 2. OC rápida vs OC por cotización
  - Alcance: modo de compra `directa` o `cotizada`.
  - Entregables:
    - Backend: campo `procurementMode`.
    - Frontend OC: selector de modo y validaciones.
  - Fecha:
  - Notas:

- [ ] 3. Módulo mínimo de cotizaciones (opcional)
  - Alcance: registrar cotizaciones y elegir una para poblar OC.
  - Entregables:
    - Backend: entidad/campos de cotización.
    - Frontend: UI de alta/listado/selección de cotización.
  - Fecha:
  - Notas:

- [x] 4. Adjuntos reales en recepción (factura/certificado)
  - Alcance: carga y consulta de evidencia documental en inspección.
  - Entregables:
    - Backend: soporte de archivos en recepción.
    - Frontend: subir/descargar adjuntos en Calidad > Recepción.
    - PDF FOR-28: incluir referencia de adjuntos.
  - Fecha: 2026-02-24
  - Notas: Se agregaron endpoints de carga/descarga por inspección (`invoice`/`certificate`), persistencia en object storage (MinIO/local), metadatos de adjuntos en `incoming_inspection`, botones de adjuntar/descargar en la UI de recepción, detalle de adjuntos en tarjeta y referencia de adjuntos en PDF FOR-28.

- [x] 5. Rechazo -> No Conformidad (acción guiada)
  - Alcance: crear NC desde inspección rechazada con datos prellenados.
  - Entregables:
    - Backend: relación inspección -> NC.
    - Frontend: botón y flujo de creación prellenado.
  - Fecha: 2026-02-24
  - Notas: Se agregó `incomingInspectionId` en NC (schema/types/entidad), migración y FK a `incoming_inspection`. En Recepción aparece botón `Crear NC` para inspecciones rechazadas, navega a `/quality/nc` con formulario prellenado (material, proveedor, lote, factura, notas) y vínculo de inspección. Evita duplicado visual cuando ya existe NC abierta vinculada.

- [x] 6. Checklist auditable por etapa
  - Alcance: semáforo/estado por inspección para auditoría.
  - Entregables:
    - UI de estados: OC, recepción, FOR-28, resultado, NC.
    - Filtros para revisión operativa.
  - Fecha: 2026-02-24
  - Notas: Implementado en `QualityIncomingTab` un panel de checklist auditable con semáforo por etapas (OC, Recepción, FOR-28, Resultado, NC), resumen de conteos operativos y filtros (`todas`, `con pendientes`, `bloqueadas`, `completas`) + buscador por material/SKU/proveedor/código/ID.

- [x] 7. Reglas y permisos por rol
  - Alcance: controles de autorización por acción crítica.
  - Entregables:
    - Backend: validación por rol.
    - Frontend: ocultar/inhabilitar acciones según rol.
  - Fecha: 2026-02-24
  - Notas: Se exige autenticación en rutas MRP y se restringen acciones críticas de recepción/NC a `admin` y `superadmin` (resolver inspección, corregir costo, cargar evidencia, crear NC, actualizar configuración operativa). En frontend (`QualityIncomingTab` y `QualityNcTab`) se inhabilitan acciones de edición para usuarios sin permiso.

- [ ] 8. Pruebas E2E del flujo completo
  - Alcance: casos A-E validados con evidencia.
  - Entregables:
    - Caso A: compra directa proveedor habitual.
    - Caso B: compra con cotización.
    - Caso C: recepción aprobada.
    - Caso D: recepción rechazada + NC.
    - Caso E: PDF histórico con versión documental congelada.
  - Fecha:
  - Notas: Ver matriz de ejecución en `docs/SPRINT_GP_PRO_01_E2E_VALIDACION.md`.

## Criterio de cierre del sprint
- [ ] Todas las tareas 1-8 en `[x]`
- [ ] Sin errores bloqueantes en flujo OC -> Recepción -> FOR-28
- [ ] Trazabilidad documental validada en registros históricos
