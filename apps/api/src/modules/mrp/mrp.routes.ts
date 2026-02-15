import { Router } from 'express';
import { MikroORM } from '@mikro-orm/core';
import { MrpController } from './mrp.controller';
import { OperationalConfigService } from './services/operational-config.service';
import { OperationalConfigController } from './operational-config.controller';

export const createMrpRoutes = (orm: MikroORM) => {
    const router = Router();
    const mrpController = new MrpController(orm);

    // Products
    router.post('/products', (req, res, next) => mrpController.createProduct(req, res, next));
    router.get('/products', (req, res, next) => mrpController.listProducts(req, res, next));
    router.get('/products/:id', (req, res, next) => mrpController.getProduct(req, res, next));
    router.put('/products/:id', (req, res, next) => mrpController.updateProduct(req, res, next));
    router.delete('/products/:id', (req, res, next) => mrpController.deleteProduct(req, res, next));

    // Variants
    router.post('/products/:productId/variants', (req, res, next) => mrpController.createVariant(req, res, next));
    router.put('/variants/:variantId', (req, res, next) => mrpController.updateVariant(req, res, next));
    router.delete('/variants/:variantId', (req, res, next) => mrpController.deleteVariant(req, res, next));

    // Suppliers
    router.post('/suppliers', (req, res, next) => mrpController.createSupplier(req, res, next));
    router.get('/suppliers', (req, res, next) => mrpController.listSuppliers(req, res, next));
    router.get('/suppliers/:id', (req, res, next) => mrpController.getSupplier(req, res, next));
    router.put('/suppliers/:id', (req, res, next) => mrpController.updateSupplier(req, res, next));
    router.get('/suppliers/:id/materials', (req, res, next) => mrpController.getSupplierMaterials(req, res, next));
    router.post('/suppliers/:id/materials', (req, res, next) => mrpController.addSupplierMaterial(req, res, next));
    router.delete('/suppliers/:id/materials/:materialId', (req, res, next) => mrpController.removeSupplierMaterial(req, res, next));

    // Raw Materials & BOM
    router.post('/raw-materials', (req, res, next) => mrpController.createRawMaterial(req, res, next));
    router.get('/raw-materials', (req, res, next) => mrpController.listRawMaterials(req, res, next));
    router.get('/raw-materials/:id', (req, res, next) => mrpController.getRawMaterial(req, res, next));
    router.patch('/raw-materials/:id', (req, res, next) => mrpController.updateRawMaterial(req, res, next));
    router.get('/raw-materials/:id/suppliers', (req, res, next) => mrpController.getRawMaterialSuppliers(req, res, next));

    // BOM
    router.get('/variants/:variantId/bom', (req, res, next) => mrpController.getBOM(req, res, next));
    router.post('/bom-items', (req, res, next) => mrpController.addBOMItem(req, res, next));
    router.put('/bom-items/:id', (req, res, next) => mrpController.updateBOMItem(req, res, next));
    router.delete('/bom-items/:id', (req, res, next) => mrpController.deleteBOMItem(req, res, next));

    // Production Orders
    router.get('/production-orders', (req, res, next) => mrpController.listProductionOrders(req, res, next));
    router.get('/production-orders/:id', (req, res, next) => mrpController.getProductionOrder(req, res, next));
    router.patch('/production-orders/:id/status', (req, res, next) => mrpController.updateProductionOrderStatus(req, res, next));
    router.post('/production-orders', (req, res, next) => mrpController.createProductionOrder(req, res, next));
    router.get('/production-orders/:id/requirements', (req, res, next) => mrpController.calculateMaterialRequirements(req, res, next));
    router.get('/production-orders/:id/batches', (req, res, next) => mrpController.listProductionBatches(req, res, next));
    router.post('/production-orders/:id/batches', (req, res, next) => mrpController.createProductionBatch(req, res, next));
    router.post('/production-batches/:batchId/units', (req, res, next) => mrpController.addProductionBatchUnits(req, res, next));
    router.patch('/production-batches/:batchId/qc', (req, res, next) => mrpController.updateProductionBatchQc(req, res, next));
    router.patch('/production-batches/:batchId/packaging', (req, res, next) => mrpController.updateProductionBatchPackaging(req, res, next));
    router.patch('/production-batch-units/:unitId/qc', (req, res, next) => mrpController.updateProductionBatchUnitQc(req, res, next));
    router.patch('/production-batch-units/:unitId/packaging', (req, res, next) => mrpController.updateProductionBatchUnitPackaging(req, res, next));

    // Quality / INVIMA
    router.post('/quality/non-conformities', (req, res, next) => mrpController.createNonConformity(req, res, next));
    router.get('/quality/non-conformities', (req, res, next) => mrpController.listNonConformities(req, res, next));
    router.patch('/quality/non-conformities/:id', (req, res, next) => mrpController.updateNonConformity(req, res, next));
    router.post('/quality/capa-actions', (req, res, next) => mrpController.createCapa(req, res, next));
    router.get('/quality/capa-actions', (req, res, next) => mrpController.listCapas(req, res, next));
    router.patch('/quality/capa-actions/:id', (req, res, next) => mrpController.updateCapa(req, res, next));
    router.get('/quality/audit-events', (req, res, next) => mrpController.listQualityAudit(req, res, next));
    router.post('/quality/technovigilance-cases', (req, res, next) => mrpController.createTechnovigilanceCase(req, res, next));
    router.get('/quality/technovigilance-cases', (req, res, next) => mrpController.listTechnovigilanceCases(req, res, next));
    router.patch('/quality/technovigilance-cases/:id', (req, res, next) => mrpController.updateTechnovigilanceCase(req, res, next));
    router.post('/quality/technovigilance-cases/:id/report-invima', (req, res, next) => mrpController.reportTechnovigilanceCase(req, res, next));
    router.post('/quality/documents', (req, res, next) => mrpController.createControlledDocument(req, res, next));
    router.get('/quality/documents', (req, res, next) => mrpController.listControlledDocuments(req, res, next));
    router.post('/quality/documents/:id/submit-review', (req, res, next) => mrpController.submitControlledDocument(req, res, next));
    router.post('/quality/documents/:id/approve', (req, res, next) => mrpController.approveControlledDocument(req, res, next));
    router.get('/quality/documents/active/:process', (req, res, next) => mrpController.listActiveControlledDocumentsByProcess(req, res, next));


    // Purchase Orders
    router.post('/purchase-orders', (req, res, next) => mrpController.createPurchaseOrder(req, res, next));
    router.get('/purchase-orders', (req, res, next) => mrpController.listPurchaseOrders(req, res, next));
    router.get('/purchase-orders/:id', (req, res, next) => mrpController.getPurchaseOrder(req, res, next));
    router.put('/purchase-orders/:id/status', (req, res, next) => mrpController.updatePurchaseOrderStatus(req, res, next));
    router.post('/purchase-orders/:id/receive', (req, res, next) => mrpController.receivePurchaseOrder(req, res, next));
    router.delete('/purchase-orders/:id', (req, res, next) => mrpController.cancelPurchaseOrder(req, res, next));

    // Inventory
    router.get('/inventory', (req, res, next) => mrpController.getInventory(req, res, next));
    router.post('/inventory/manual-add', (req, res, next) => mrpController.addManualStock(req, res, next));

    // Warehouses
    router.get('/warehouses', (req, res, next) => mrpController.listWarehouses(req, res, next));
    router.post('/warehouses', (req, res, next) => mrpController.createWarehouse(req, res, next));
    router.get('/warehouses/:id', (req, res, next) => mrpController.getWarehouse(req, res, next));
    router.put('/warehouses/:id', (req, res, next) => mrpController.updateWarehouse(req, res, next));
    router.delete('/warehouses/:id', (req, res, next) => mrpController.deleteWarehouse(req, res, next));

    // Operational Config
    const configService = new OperationalConfigService(orm.em);
    const configController = new OperationalConfigController(configService);

    router.get('/operational-config', (req, res, next) => configController.getConfig(req, res, next));
    router.put('/operational-config', (req, res, next) => configController.updateConfig(req, res, next));

    return router;
};
