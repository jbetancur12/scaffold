# Plan: Parcial Rapido y Finalizacion Rapida de OP

## Resumen
Implementar un flujo opcional de `quick-complete` para dos casos: enviar produccion parcial a bodega sin cerrar la OP, y finalizar completamente una OP con un boton "Finalizar rapido" que evite el flujo manual tedioso. El flujo manual actual queda intacto como opcion "Finalizar".

## Cambios clave
- Backend: crear `POST /production-orders/:id/quick-complete`.
  - Parcial rapido: payload `{ variantId, partialQuantity, warehouseId? }`.
  - Finalizar rapido: payload `{ warehouseId?, materialConsumption? }` sin `partialQuantity`.
  - El lote se autogenera como `ProductionBatch.code`; no se pide al usuario.
  - Cada parcial crea un batch/lote terminado, suma inventario en `FinishedGoodsLotInventory` e `InventoryItem`, actualiza `ProductionOrderItem.producedQuantity`, y mantiene la OP `IN_PROGRESS`.
  - Validar que la cantidad parcial no supere lo pendiente de esa variante.
  - Al finalizar rapido, completar el saldo pendiente, consumir materiales al final, mover producto terminado restante a bodega, evitar duplicar inventario ya enviado parcialmente, y cerrar la OP como `COMPLETED`.
  - `PATCH /production-orders/:id/status` queda para el flujo manual existente.

- Frontend: en `ProductionOrderDetailPage`.
  - Mantener boton `Finalizar` para el flujo manual actual.
  - Agregar boton `Parcial rapido`: abre dialogo con variante, cantidad pendiente y bodega destino.
  - Agregar boton `Finalizar rapido`: abre dialogo simple con bodega destino y consumo real de materiales, luego completa/cierra la OP usando `quick-complete`.
  - Mostrar claramente cantidades planeadas, ya enviadas/producidas y pendientes por variante.
  - Agregar `mrpApi.quickCompleteProductionOrder()` y hook `useQuickCompleteProductionOrderMutation()` con invalidacion de OP, batches, inventario, lotes PT, materias primas y listas.

## Plan de pruebas
- `npm run build:packages`
- `npm run ts-check --workspace=apps/api`
- `npm run ts-check --workspace=apps/web`
- `npm run lint --workspace=apps/api`
- `npm run lint --workspace=apps/web`
- Escenarios manuales:
  - Enviar parcial de una variante y verificar OP abierta, lote autogenerado e inventario actualizado.
  - Enviar varios parciales y verificar que cada uno tenga lote propio.
  - Intentar enviar mas de lo pendiente y confirmar error.
  - Usar `Finalizar rapido` sin parciales previos y verificar cierre completo.
  - Usar `Finalizar rapido` despues de parciales y confirmar que no duplique inventario.
  - Usar `Finalizar` manual y confirmar que el flujo actual sigue disponible.

## Supuestos
- El lote de producto terminado sera siempre un `ProductionBatch.code` autogenerado.
- El flujo rapido es opcional: no reemplaza el flujo manual actual.
- En OP con multiples variantes, el parcial rapido opera sobre una variante seleccionada por operacion.
