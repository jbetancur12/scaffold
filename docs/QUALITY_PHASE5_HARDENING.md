# Fase 5 - Hardening Calidad/INVIMA

Objetivo: cerrar hardening funcional del flujo regulatorio con foco en mensajes de error, trazabilidad y smoke tests manuales.

## Cambios implementados

1. Normalización de errores de validación en API:
- Archivo: `apps/api/src/shared/middleware/error.middleware.ts`
- Si ocurre `ZodError`, la API ahora responde:
  - `message` legible (sin arreglo JSON crudo).
  - `details` con `{ path, message }` para trazabilidad.

2. Mejor parsing de errores en web:
- Archivo: `apps/web/src/lib/api-error.ts`
- El frontend ahora interpreta:
  - mensajes serializados tipo JSON (caso validación),
  - arreglos de errores estructurados,
  - `details` devuelto por la API.
- Resultado: toasts más claros para usuario final.

## Smoke test manual (checklist)

1. OC/Recepción
- [ ] Crear OC con materia prima.
- [ ] Recibir OC y verificar registro en inspección de recepción.
- [ ] Resolver inspección (aprobado/rechazado) y validar estado resultante.

2. NC/CAPA
- [ ] Crear no conformidad.
- [ ] Crear CAPA asociado.
- [ ] Cerrar NC y CAPA verificando trazabilidad en auditoría.

3. Documentos controlados
- [ ] Crear documento en borrador.
- [ ] Enviar a revisión.
- [ ] Aprobar con firma y método.
- [ ] Verificar que queda vigente para proceso.

4. DHR/DMR
- [ ] Crear plantilla DMR.
- [ ] Exportar DHR por lote (JSON/CSV).
- [ ] Verificar archivo y metadatos de exportación.

5. Etiquetado (lote/serial)
- [ ] Registrar etiqueta regulatoria por lote.
- [ ] Registrar etiqueta regulatoria por serial (si aplica).
- [ ] Confirmar validación de despacho sin errores.

6. Liberación QA
- [ ] Completar checklist de liberación.
- [ ] Firmar liberación QA.
- [ ] Verificar estado final `liberado_qa`.

7. Despacho y recall
- [ ] Crear despacho con lote liberado.
- [ ] Ejecutar flujo recall y notificaciones.
- [ ] Confirmar trazabilidad bidireccional lote <-> cliente.

## Hallazgos residuales esperados

1. Algunas validaciones de negocio aún dependen de datos maestros completos (INVIMA, GTIN/código interno, firma).
2. Falta automatizar estos smoke tests como integración E2E/API para evitar regresiones manuales.

## Evidencia técnica ejecutada

1. `npm run ts-check --workspace=web`
2. `npm run lint --workspace=web`
3. `npm run ts-check --workspace=api`
4. `npm run lint --workspace=api`
