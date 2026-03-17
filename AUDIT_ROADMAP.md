# Auditoria Global - Fases

## Objetivo
Implementar auditoría global de eventos para el MRP y áreas comerciales, con trazabilidad clara de **quién**, **qué** y **cuándo**. 
La meta es registrar acciones críticas (creación, edición, estado, conversiones) y cambios sensibles con **before/after**, 
de forma que Auditoría pueda responder preguntas operativas y regulatorias sin revisar logs técnicos.

## Enfoque por fases
El trabajo se divide por dominio funcional. Cada fase agrega:
- **Eventos clave** de negocio (acciones y estados).
- **Metadata relevante** (before/after en cambios sensibles).
- **Traducciones UI** para auditoría.
Al final de cada fase se marca como completada.

## Estado General
- [x] **Fase 1 (MRP núcleo)**: órdenes de producción, órdenes de compra, requisiciones, cotizaciones.
- [ ] **Fase 2 (Catálogo)**: productos, variantes, BOM, listas de precios.
- [ ] **Fase 3 (Comercial)**: pedidos de cliente, clientes, proveedores.
- [ ] **Fase 4 (Acciones especiales)**: eliminaciones, cambios masivos, ajustes de inventario.

## Detalle por Fase

### Fase 1 - MRP núcleo (Completada)
- Objetivo: trazabilidad operativa base para flujos de compras y producción.
- Acciones con before/after en cambios sensibles.
- [x] **Órdenes de producción**
  - [x] Creación de OP
  - [x] Cambio de estado
  - [x] Vincular / desvincular pedido de cliente
- [x] **Órdenes de compra**
  - [x] Creación
  - [x] Actualización (before/after)
  - [x] Cambio de estado
  - [x] Recepción
  - [x] Cancelación
- [x] **Requisiciones**
  - [x] Creación
  - [x] Cambio de estado
  - [x] Conversión a OC
- [x] **Cotizaciones**
  - [x] Creación
  - [x] Actualización (before/after)
  - [x] Cambio de estado
  - [x] Aprobación
  - [x] Conversión a pedido

### Fase 2 - Catálogo
- Objetivo: auditar cambios en la definición del producto y su costo (impacto directo en operación y finanzas).
- Incluir before/after en:
  - Precios
  - BOM (materiales y cantidades)
  - Variantes (atributos)
- [ ] **Productos**
  - [ ] Crear / editar / eliminar
  - [ ] Cambios de estado
- [ ] **Variantes**
  - [ ] Crear / editar / eliminar
  - [ ] Cambios de estado
- [ ] **BOM**
  - [ ] Crear / editar / eliminar
  - [ ] Cambios de cantidades
- [ ] **Precios**
  - [ ] Ediciones manuales
  - [ ] Cambios masivos

### Fase 3 - Comercial
- Objetivo: trazabilidad de ventas y datos maestros de clientes/proveedores.
- Eventos principales: creación, edición, cancelación, cambios de estado.
- [ ] **Pedidos de cliente**
  - [ ] Crear / editar / cancelar
  - [ ] Cambio de estado
- [ ] **Clientes**
  - [ ] Crear / editar / eliminar
- [ ] **Proveedores**
  - [ ] Crear / editar / eliminar

### Fase 4 - Acciones especiales
- Objetivo: cubrir acciones de alto riesgo o impacto masivo.
- Registrar actor + motivo cuando aplique.
- [ ] **Eliminaciones** (soft delete/hard delete)
- [ ] **Cambios masivos**
- [ ] **Ajustes de inventario**
