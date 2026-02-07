import { Router } from 'express';
import { MikroORM } from '@mikro-orm/core';
import { MrpController } from './mrp.controller';

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

    // Raw Materials & BOM
    router.post('/raw-materials', (req, res, next) => mrpController.createRawMaterial(req, res, next));
    router.get('/raw-materials', (req, res, next) => mrpController.listRawMaterials(req, res, next));
    router.get('/raw-materials/:id', (req, res, next) => mrpController.getRawMaterial(req, res, next));
    router.patch('/raw-materials/:id', (req, res, next) => mrpController.updateRawMaterial(req, res, next));

    // BOM
    router.get('/variants/:variantId/bom', (req, res, next) => mrpController.getBOM(req, res, next));
    router.post('/bom-items', (req, res, next) => mrpController.addBOMItem(req, res, next));
    router.delete('/bom-items/:id', (req, res, next) => mrpController.deleteBOMItem(req, res, next));

    // Production Orders
    router.get('/production-orders', (req, res, next) => mrpController.listProductionOrders(req, res, next));
    router.get('/production-orders/:id', (req, res, next) => mrpController.getProductionOrder(req, res, next));
    router.patch('/production-orders/:id/status', (req, res, next) => mrpController.updateProductionOrderStatus(req, res, next));
    router.post('/production-orders', (req, res, next) => mrpController.createProductionOrder(req, res, next));
    router.get('/production-orders/:id/requirements', (req, res, next) => mrpController.calculateMaterialRequirements(req, res, next));


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

    return router;
};
