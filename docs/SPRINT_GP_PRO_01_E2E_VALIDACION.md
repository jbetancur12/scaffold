# Validación E2E - Sprint GP-PRO-01

Fecha: 2026-02-24
Responsable: Codex + Jorge
Estado: `LISTA PARA EJECUCIÓN`

## Objetivo
Validar punta a punta el flujo:
`OC -> Recepción -> FOR-28 -> (NC si aplica) -> Trazabilidad histórica`

## Precondiciones
- Migraciones aplicadas (`migration:up` en API).
- Usuario con rol `admin` o `superadmin` para acciones de gestión.
- Configuración de documento global de recepción definida o en automático.

## Matriz de Casos (A-E)

### Caso A - Compra directa proveedor habitual
Estado: `[ ]`
- Crear OC con materia prima de catálogo.
- Verificar autoselección/propuesta de proveedor habitual/preferido.
- Recibir OC.
- Verificar creación de inspección de recepción y stock en cuarentena.

Resultado esperado:
- OC en estado recibido.
- Inspección creada con vínculo a OC y material.

Evidencia:
- OC ID:
- Inspección ID:
- Captura/nota:

---

### Caso B - Compra con cotización
Estado: `[ ]`
- (Opcional según implementación actual) crear flujo de compra no directa.
- Confirmar que el proceso permite identificar proveedor final.

Resultado esperado:
- OC creada y trazable al criterio de selección.

Evidencia:
- OC ID:
- Referencia cotización:
- Captura/nota:

---

### Caso C - Recepción aprobada
Estado: `[ ]`
- Resolver inspección con resultado `aprobado`.
- Registrar lote proveedor, factura, certificado (ref o archivo).
- Descargar FOR-28.

Resultado esperado:
- Estado de inspección `liberado`.
- FOR-28 descargable con código/versión/fecha documental.
- Movimientos de stock correctos (cuarentena -> almacén materia prima).

Evidencia:
- Inspección ID:
- Archivo FOR-28:
- Captura/nota:

---

### Caso D - Recepción rechazada + NC
Estado: `[ ]`
- Resolver inspección con resultado `rechazado`.
- Usar botón `Crear NC` desde recepción.
- Verificar formulario NC prellenado y vínculo `incomingInspectionId`.
- Guardar NC.

Resultado esperado:
- NC creada con trazabilidad a inspección.
- En recepción, botón cambia a `NC ya creada` cuando hay NC abierta vinculada.

Evidencia:
- Inspección ID:
- NC ID:
- Captura/nota:

---

### Caso E - PDF histórico con versión documental congelada
Estado: `[ ]`
- Crear inspección con formato documental actual (vN).
- Cambiar documento controlado a versión nueva (vN+1).
- Descargar PDF de inspección anterior.

Resultado esperado:
- El PDF anterior mantiene código/versión/fecha con la que fue creada la inspección (no cambia retroactivamente).

Evidencia:
- Inspección vieja ID:
- Versión esperada en PDF:
- Captura/nota:

## Criterio de Aprobación Final
- [ ] Casos A, C, D, E en `OK`.
- [ ] Caso B validado o documentado como `No aplica` según alcance.
- [ ] Sin errores bloqueantes en UI ni API.
- [ ] Evidencias adjuntas por caso.

## Registro de Hallazgos
- Hallazgo 1:
- Hallazgo 2:
- Acción correctiva:

## Cierre
- Aprobado por:
- Fecha cierre:
- Observaciones finales:
