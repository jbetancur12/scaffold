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
- [x] **Fase 2 (Catálogo)**: productos, variantes, BOM, listas de precios.
- [x] **Fase 3 (Comercial)**: pedidos de cliente, clientes, proveedores.
- [x] **Fase 4 (Acciones especiales)**: eliminaciones, cambios masivos, ajustes de inventario.

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

### Fase 2 - Catálogo (Completada)
- Objetivo: auditar cambios en la definición del producto y su costo (impacto directo en operación y finanzas).
- Incluir before/after en:
  - Precios
  - BOM (materiales y cantidades)
  - Variantes (atributos)
- [x] **Productos**
  - [x] Crear / editar / eliminar
- [x] **Variantes**
  - [x] Crear / editar / eliminar
  - [x] Cambios de precio
- [x] **BOM**
  - [x] Crear / editar / eliminar
  - [x] Cambios de cantidades
- [x] **Precios**
  - [x] Configuración de lista de precios
  - [x] Ediciones manuales (por variante)

### Fase 3 - Comercial (Completada)
- Objetivo: trazabilidad de ventas y datos maestros de clientes/proveedores.
- Eventos principales: creación, edición, cancelación, cambios de estado.
- [x] **Pedidos de cliente**
  - [x] Crear / editar / cancelar
  - [x] Cambio de estado
- [x] **Clientes**
  - [x] Crear / editar / eliminar
  - [x] Importación masiva
- [x] **Proveedores**
  - [x] Crear / editar
  - [x] Importación masiva

### Fase 4 - Acciones especiales (Completada)
- Objetivo: cubrir acciones de alto riesgo o impacto masivo.
- Registrar actor + motivo cuando aplique.
- [x] **Eliminaciones** (soft delete/hard delete)
- [x] **Cambios masivos** (importaciones)
- [x] **Ajustes de inventario** (stock manual / stock actualizado)
