import { NextFunction, Request, Response } from 'express';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { ProductService } from './services/product.service';
import { SupplierService } from './services/supplier.service';
import { MrpService } from './services/mrp.service';
import { InventoryService } from './services/inventory.service';
import { ProductionService } from './services/production.service';
import { PurchaseOrderService } from './services/purchase-order.service';
import { QualityService } from './services/quality.service';
import { DocumentControlService } from './services/document-control.service';
import {
    ProductSchema,
    ProductionOrderSchema,
    RawMaterialSchema,
    BOMItemSchema,
    SupplierSchema,
    WarehouseSchema,
    CreatePurchaseOrderSchema,
    ManualStockSchema,
    CreateProductionOrderSchema,
    CreateProductVariantSchema,
    UpdateProductVariantSchema,
    PaginationQuerySchema,
    ListRawMaterialsQuerySchema,
    AddSupplierMaterialSchema,
    UpdateProductionOrderStatusSchema,
    InventoryQuerySchema,
    ListPurchaseOrdersQuerySchema,
    UpdatePurchaseOrderStatusSchema,
    ReceivePurchaseOrderSchema,
    CreateNonConformitySchema,
    ListNonConformitiesQuerySchema,
    UpdateNonConformitySchema,
    CreateCapaSchema,
    ListCapasQuerySchema,
    UpdateCapaSchema,
    ListQualityAuditQuerySchema,
    CreateTechnovigilanceCaseSchema,
    ListTechnovigilanceCasesQuerySchema,
    UpdateTechnovigilanceCaseSchema,
    ReportTechnovigilanceCaseSchema,
    CreateControlledDocumentSchema,
    ListControlledDocumentsQuerySchema,
    ActorPayloadSchema,
    ApproveControlledDocumentSchema,
    ActiveControlledDocumentsByProcessParamsSchema,
    CreateProductionBatchSchema,
    AddProductionBatchUnitsSchema,
    UpdateProductionBatchQcSchema,
    UpdateProductionBatchPackagingSchema,
    UpdateProductionBatchUnitQcSchema,
    UpdateProductionBatchUnitPackagingSchema,
} from '@scaffold/schemas';
import { ApiResponse, AppError } from '../../shared/utils/response';

export class MrpController {
    // ...

    constructor(private readonly orm: MikroORM) { }

    private get em() {
        const em = RequestContext.getEntityManager();
        if (!em) {
            // Fallback for non-request contexts (like tests) or if middleware fails
            return this.orm.em.fork();
        }
        return em;
    }

    private get productService() { return new ProductService(this.em); }
    private get supplierService() { return new SupplierService(this.em); }
    private get mrpService() { return new MrpService(this.em); }
    private get inventoryService() { return new InventoryService(this.em); }
    private get productionService() { return new ProductionService(this.em); }
    private get purchaseOrderService() { return new PurchaseOrderService(this.em, this.mrpService); }
    private get qualityService() { return new QualityService(this.em); }
    private get documentControlService() { return new DocumentControlService(this.em); }

    // --- Products ---
    async createProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const data = ProductSchema.parse(req.body);
            const product = await this.productService.createProduct(data);
            return ApiResponse.success(res, product, 'Producto creado', 201);
        } catch (error) {
            next(error);
        }
    }

    async listProducts(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = PaginationQuerySchema.parse(req.query);
            const result = await this.productService.listProducts(page || 1, limit || 10);
            return ApiResponse.success(res, result);
        } catch (error) {
            next(error);
        }
    }

    async getProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const product = await this.productService.getProduct(id);
            if (!product) {
                throw new AppError('Producto no encontrado', 404);
            }
            return ApiResponse.success(res, product);
        } catch (error) {
            next(error);
        }
    }

    async updateProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const data = ProductSchema.partial().parse(req.body);
            const product = await this.productService.updateProduct(id, data);
            return ApiResponse.success(res, product, 'Producto actualizado');
        } catch (error) {
            next(error);
        }
    }

    async deleteProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            await this.productService.deleteProduct(id);
            return ApiResponse.success(res, null, 'Producto eliminado');
        } catch (error) {
            next(error);
        }
    }

    // --- Variants ---
    async createVariant(req: Request, res: Response, next: NextFunction) {
        try {
            const { productId } = req.params;
            const data = CreateProductVariantSchema.parse(req.body);
            const variant = await this.productService.createVariant(productId, data);
            return ApiResponse.success(res, variant, 'Variante creada', 201);
        } catch (error) {
            next(error);
        }
    }

    async updateVariant(req: Request, res: Response, next: NextFunction) {
        try {
            const { variantId } = req.params;
            const data = UpdateProductVariantSchema.parse(req.body);
            const variant = await this.productService.updateVariant(variantId, data);
            return ApiResponse.success(res, variant, 'Variante actualizada');
        } catch (error) {
            next(error);
        }
    }

    async deleteVariant(req: Request, res: Response, next: NextFunction) {
        try {
            const { variantId } = req.params;
            await this.productService.deleteVariant(variantId);
            return ApiResponse.success(res, null, 'Variante eliminada');
        } catch (error) {
            next(error);
        }
    }

    // --- Suppliers ---
    async createSupplier(req: Request, res: Response, next: NextFunction) {
        try {
            const data = SupplierSchema.parse(req.body);
            const supplier = await this.supplierService.createSupplier(data);
            return ApiResponse.success(res, supplier, 'Proveedor creado', 201);
        } catch (error) {
            next(error);
        }
    }

    async listSuppliers(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = PaginationQuerySchema.parse(req.query);
            const result = await this.supplierService.listSuppliers(page || 1, limit || 10);
            return ApiResponse.success(res, result);
        } catch (error) {
            next(error);
        }
    }

    async getSupplier(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const supplier = await this.supplierService.getSupplier(id);
            if (!supplier) {
                throw new AppError('Proveedor no encontrado', 404);
            }
            return ApiResponse.success(res, supplier);
        } catch (error) {
            next(error);
        }
    }

    async updateSupplier(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const data = SupplierSchema.partial().parse(req.body);
            const supplier = await this.supplierService.updateSupplier(id, data);
            return ApiResponse.success(res, supplier, 'Proveedor actualizado');
        } catch (error) {
            next(error);
        }
    }

    async getSupplierMaterials(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const materials = await this.supplierService.getSupplierMaterials(id);
            return ApiResponse.success(res, materials);
        } catch (error) {
            next(error);
        }
    }

    async addSupplierMaterial(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { rawMaterialId, price } = AddSupplierMaterialSchema.parse(req.body);
            const link = await this.supplierService.addSupplierMaterial(id, rawMaterialId, price);
            return ApiResponse.success(res, link, 'Material vinculado al proveedor', 201);
        } catch (error) {
            next(error);
        }
    }

    async removeSupplierMaterial(req: Request, res: Response, next: NextFunction) {
        try {
            const { id, materialId } = req.params;
            await this.supplierService.removeSupplierMaterial(id, materialId);
            return ApiResponse.success(res, null, 'Material desvinculado del proveedor');
        } catch (error) {
            next(error);
        }
    }

    // --- Raw Materials ---
    async getRawMaterialSuppliers(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const suppliers = await this.supplierService.getSuppliersForMaterial(id);
            return ApiResponse.success(res, suppliers);
        } catch (error) {
            next(error);
        }
    }

    async createRawMaterial(req: Request, res: Response, next: NextFunction) {
        try {
            const data = RawMaterialSchema.parse(req.body);
            const material = await this.mrpService.createRawMaterial(data);
            return ApiResponse.success(res, material, 'Materia prima creada', 201);
        } catch (error) {
            next(error);
        }
    }

    async listRawMaterials(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit, search } = ListRawMaterialsQuerySchema.parse(req.query);
            const result = await this.mrpService.listRawMaterials(page || 1, limit || 10, search);
            return ApiResponse.success(res, result);
        } catch (error) {
            next(error);
        }
    }

    async getRawMaterial(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const material = await this.mrpService.getRawMaterial(id);
            return ApiResponse.success(res, material);
        } catch (error) {
            next(error);
        }
    }

    async updateRawMaterial(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const data = RawMaterialSchema.partial().parse(req.body);
            const material = await this.mrpService.updateRawMaterial(id, data);
            return ApiResponse.success(res, material, 'Materia prima actualizada');
        } catch (error) {
            next(error);
        }
    }

    async addBOMItem(req: Request, res: Response, next: NextFunction) {
        try {
            const data = BOMItemSchema.parse(req.body);
            const bomItem = await this.mrpService.addBOMItem(data);
            return ApiResponse.success(res, bomItem, 'Material agregado al BOM', 201);
        } catch (error) {
            next(error);
        }
    }

    async updateBOMItem(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const data = BOMItemSchema.partial().parse(req.body);
            const bomItem = await this.mrpService.updateBOMItem(id, data);
            return ApiResponse.success(res, bomItem, 'Ítem BOM actualizado');
        } catch (error) {
            next(error);
        }
    }

    async getBOM(req: Request, res: Response, next: NextFunction) {
        try {
            const { variantId } = req.params;
            const bom = await this.mrpService.getBOM(variantId);
            return ApiResponse.success(res, bom);
        } catch (error) {
            next(error);
        }
    }

    async deleteBOMItem(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            await this.mrpService.deleteBOMItem(id);
            return ApiResponse.success(res, null, 'Ítem BOM eliminado');
        } catch (error) {
            next(error);
        }
    }

    // --- Production & Inventory ---
    async listProductionOrders(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = PaginationQuerySchema.parse(req.query);
            const orders = await this.productionService.listOrders(
                page || 1,
                limit || 10
            );
            return ApiResponse.success(res, orders);
        } catch (error) {
            next(error);
        }
    }

    async getProductionOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const order = await this.productionService.getOrder(id);
            return ApiResponse.success(res, order);
        } catch (error) {
            next(error);
        }
    }

    async createProductionOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const { items, ...baseOrderData } = CreateProductionOrderSchema.parse(req.body);
            const orderData: Record<string, unknown> = { ...baseOrderData };

            // Auto-generate code if not provided
            if (!orderData.code) {
                const timestamp = Date.now().toString(36).toUpperCase();
                orderData.code = `PO-${timestamp}`;
            }

            // Set default status if not provided
            if (!orderData.status) {
                orderData.status = 'draft';
            }

            const validatedOrder = ProductionOrderSchema.parse(orderData);
            const order = await this.productionService.createOrder(validatedOrder, items);
            return ApiResponse.success(res, order, 'Orden de producción creada', 201);
        } catch (error) {
            next(error);
        }
    }



    async updateProductionOrderStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status, warehouseId } = UpdateProductionOrderStatusSchema.parse(req.body);
            const order = await this.productionService.updateStatus(id, status, warehouseId);
            return ApiResponse.success(res, order, 'Estado de orden actualizado');
        } catch (error) {
            next(error);
        }
    }

    async calculateMaterialRequirements(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const requirements = await this.productionService.calculateMaterialRequirements(id);
            return ApiResponse.success(res, requirements);
        } catch (error) {
            next(error);
        }
    }

    async listProductionBatches(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const batches = await this.productionService.listBatches(id);
            return ApiResponse.success(res, batches);
        } catch (error) {
            next(error);
        }
    }

    async createProductionBatch(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = CreateProductionBatchSchema.parse(req.body);

            const batch = await this.productionService.createBatch(id, payload);
            return ApiResponse.success(res, batch, 'Lote creado', 201);
        } catch (error) {
            next(error);
        }
    }

    async addProductionBatchUnits(req: Request, res: Response, next: NextFunction) {
        try {
            const { batchId } = req.params;
            const payload = AddProductionBatchUnitsSchema.parse(req.body);
            const batch = await this.productionService.addBatchUnits(batchId, payload.quantity);
            return ApiResponse.success(res, batch, 'Unidades generadas');
        } catch (error) {
            next(error);
        }
    }

    async updateProductionBatchQc(req: Request, res: Response, next: NextFunction) {
        try {
            const { batchId } = req.params;
            const payload = UpdateProductionBatchQcSchema.parse(req.body);
            const batch = await this.productionService.setBatchQc(batchId, payload.passed);
            return ApiResponse.success(res, batch, 'QC de lote actualizado');
        } catch (error) {
            next(error);
        }
    }

    async updateProductionBatchPackaging(req: Request, res: Response, next: NextFunction) {
        try {
            const { batchId } = req.params;
            const payload = UpdateProductionBatchPackagingSchema.parse(req.body);
            const batch = await this.productionService.setBatchPackaging(batchId, payload.packed);
            return ApiResponse.success(res, batch, 'Empaque de lote actualizado');
        } catch (error) {
            next(error);
        }
    }

    async updateProductionBatchUnitQc(req: Request, res: Response, next: NextFunction) {
        try {
            const { unitId } = req.params;
            const payload = UpdateProductionBatchUnitQcSchema.parse(req.body);
            const unit = await this.productionService.setBatchUnitQc(unitId, payload.passed);
            return ApiResponse.success(res, unit, 'QC de unidad actualizado');
        } catch (error) {
            next(error);
        }
    }

    async updateProductionBatchUnitPackaging(req: Request, res: Response, next: NextFunction) {
        try {
            const { unitId } = req.params;
            const payload = UpdateProductionBatchUnitPackagingSchema.parse(req.body);
            const unit = await this.productionService.setBatchUnitPackaging(unitId, payload.packaged);
            return ApiResponse.success(res, unit, 'Empaque de unidad actualizado');
        } catch (error) {
            next(error);
        }
    }

    // --- Quality / INVIMA ---
    async createNonConformity(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = CreateNonConformitySchema.parse(req.body);
            const nc = await this.qualityService.createNonConformity(payload);
            return ApiResponse.success(res, nc, 'No conformidad creada', 201);
        } catch (error) {
            next(error);
        }
    }

    async listNonConformities(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListNonConformitiesQuerySchema.parse(req.query);
            const rows = await this.qualityService.listNonConformities(filters);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async updateNonConformity(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = UpdateNonConformitySchema.parse(req.body);
            const row = await this.qualityService.updateNonConformity(id, payload, payload.actor);
            return ApiResponse.success(res, row, 'No conformidad actualizada');
        } catch (error) {
            next(error);
        }
    }

    async createCapa(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = CreateCapaSchema.parse(req.body);
            const row = await this.qualityService.createCapa(payload, payload.actor);
            return ApiResponse.success(res, row, 'CAPA creada', 201);
        } catch (error) {
            next(error);
        }
    }

    async listCapas(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListCapasQuerySchema.parse(req.query);
            const rows = await this.qualityService.listCapas(filters);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async updateCapa(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = UpdateCapaSchema.parse(req.body);
            const row = await this.qualityService.updateCapa(id, payload, payload.actor);
            return ApiResponse.success(res, row, 'CAPA actualizada');
        } catch (error) {
            next(error);
        }
    }

    async listQualityAudit(req: Request, res: Response, next: NextFunction) {
        try {
            const q = ListQualityAuditQuerySchema.parse(req.query);
            const rows = await this.qualityService.listAuditEvents(q.entityType, q.entityId);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async createTechnovigilanceCase(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = CreateTechnovigilanceCaseSchema.parse(req.body);
            const row = await this.qualityService.createTechnovigilanceCase(payload);
            return ApiResponse.success(res, row, 'Caso de tecnovigilancia creado', 201);
        } catch (error) {
            next(error);
        }
    }

    async listTechnovigilanceCases(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListTechnovigilanceCasesQuerySchema.parse(req.query);
            const rows = await this.qualityService.listTechnovigilanceCases(filters);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async updateTechnovigilanceCase(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = UpdateTechnovigilanceCaseSchema.parse(req.body);
            const row = await this.qualityService.updateTechnovigilanceCase(id, payload, payload.actor);
            return ApiResponse.success(res, row, 'Caso de tecnovigilancia actualizado');
        } catch (error) {
            next(error);
        }
    }

    async reportTechnovigilanceCase(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = ReportTechnovigilanceCaseSchema.parse(req.body);
            const row = await this.qualityService.reportTechnovigilanceCase(id, {
                reportNumber: payload.reportNumber,
                reportChannel: payload.reportChannel,
                reportPayloadRef: payload.reportPayloadRef,
                reportedAt: payload.reportedAt,
                ackAt: payload.ackAt,
            }, payload.actor);
            return ApiResponse.success(res, row, 'Caso reportado a INVIMA');
        } catch (error) {
            next(error);
        }
    }

    async createControlledDocument(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = CreateControlledDocumentSchema.parse(req.body);
            const row = await this.documentControlService.create(payload, payload.actor);
            return ApiResponse.success(res, row, 'Documento controlado creado', 201);
        } catch (error) {
            next(error);
        }
    }

    async listControlledDocuments(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListControlledDocumentsQuerySchema.parse(req.query);
            const rows = await this.documentControlService.list(filters);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async submitControlledDocument(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = ActorPayloadSchema.parse(req.body ?? {});
            const row = await this.documentControlService.submitForReview(id, payload.actor);
            return ApiResponse.success(res, row, 'Documento enviado a revisión');
        } catch (error) {
            next(error);
        }
    }

    async approveControlledDocument(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = ApproveControlledDocumentSchema.parse(req.body ?? {});
            const row = await this.documentControlService.approve(id, payload);
            return ApiResponse.success(res, row, 'Documento aprobado');
        } catch (error) {
            next(error);
        }
    }

    async listActiveControlledDocumentsByProcess(req: Request, res: Response, next: NextFunction) {
        try {
            const { process } = ActiveControlledDocumentsByProcessParamsSchema.parse(req.params);
            const rows = await this.documentControlService.getActiveByProcess(process);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    // --- Inventory ---
    async getInventory(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit, warehouseId } = InventoryQuerySchema.parse(req.query);
            const result = await this.inventoryService.getInventoryItems(page || 1, limit || 100, warehouseId);
            return ApiResponse.success(res, result);
        } catch (error) {
            next(error);
        }
    }

    async addManualStock(req: Request, res: Response, next: NextFunction) {
        try {
            const data = ManualStockSchema.parse(req.body);
            const result = await this.inventoryService.addManualStock(data);
            return ApiResponse.success(res, result, 'Stock agregado');
        } catch (error) {
            next(error);
        }
    }

    // --- Purchase Orders ---
    async createPurchaseOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const data = CreatePurchaseOrderSchema.parse(req.body);
            const purchaseOrder = await this.purchaseOrderService.createPurchaseOrder(data);
            return ApiResponse.success(res, purchaseOrder, 'Orden de compra creada', 201);
        } catch (error) {
            next(error);
        }
    }

    async getPurchaseOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const purchaseOrder = await this.purchaseOrderService.getPurchaseOrder(id);
            if (!purchaseOrder) {
                throw new AppError('Orden de compra no encontrada', 404);
            }
            return ApiResponse.success(res, purchaseOrder);
        } catch (error) {
            next(error);
        }
    }

    async listPurchaseOrders(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit, status, supplierId } = ListPurchaseOrdersQuerySchema.parse(req.query);
            const result = await this.purchaseOrderService.listPurchaseOrders(
                page || 1,
                limit || 10,
                { status, supplierId }
            );
            return ApiResponse.success(res, result);
        } catch (error) {
            next(error);
        }
    }

    async updatePurchaseOrderStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status } = UpdatePurchaseOrderStatusSchema.parse(req.body);
            const purchaseOrder = await this.purchaseOrderService.updateStatus(id, status);
            return ApiResponse.success(res, purchaseOrder, 'Estado de orden de compra actualizado');
        } catch (error) {
            next(error);
        }
    }

    async receivePurchaseOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { warehouseId } = ReceivePurchaseOrderSchema.parse(req.body ?? {});
            const purchaseOrder = await this.purchaseOrderService.receivePurchaseOrder(id, warehouseId);
            return ApiResponse.success(res, purchaseOrder, 'Orden de compra recibida');
        } catch (error) {
            next(error);
        }
    }

    // --- Warehouses ---
    async createWarehouse(req: Request, res: Response, next: NextFunction) {
        try {
            const data = WarehouseSchema.parse(req.body);
            const warehouse = await this.inventoryService.createWarehouse(data);
            return ApiResponse.success(res, warehouse, 'Almacén creado', 201);
        } catch (error) {
            next(error);
        }
    }

    async listWarehouses(_req: Request, res: Response, next: NextFunction) {
        try {
            const warehouses = await this.inventoryService.listWarehouses();
            return ApiResponse.success(res, warehouses);
        } catch (error) {
            next(error);
        }
    }

    async getWarehouse(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const warehouse = await this.inventoryService.getWarehouse(id);
            return ApiResponse.success(res, warehouse);
        } catch (error) {
            next(error);
        }
    }

    async updateWarehouse(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const data = WarehouseSchema.partial().parse(req.body);
            const warehouse = await this.inventoryService.updateWarehouse(id, data);
            return ApiResponse.success(res, warehouse, 'Almacén actualizado');
        } catch (error) {
            next(error);
        }
    }

    async deleteWarehouse(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            await this.inventoryService.deleteWarehouse(id);
            return ApiResponse.success(res, null, 'Almacén eliminado');
        } catch (error) {
            next(error);
        }
    }

    async cancelPurchaseOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            await this.purchaseOrderService.cancelPurchaseOrder(id);
            return ApiResponse.success(res, null, 'Orden de compra cancelada');
        } catch (error) {
            next(error);
        }
    }
}
