import { NextFunction, Request, Response } from 'express';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { ProductService } from './services/product.service';
import { SupplierService } from './services/supplier.service';
import { MrpService } from './services/mrp.service';
import { InventoryService } from './services/inventory.service';
import { ProductionService } from './services/production.service';
import { PurchaseOrderService } from './services/purchase-order.service';
import { PurchaseOrderPdfService } from './services/purchase-order-pdf.service';
import { PackagingFormPdfService } from './services/packaging-form-pdf.service';
import { PurchaseRequisitionService } from './services/purchase-requisition.service';
import { QualityService } from './services/quality.service';
import { DocumentControlService } from './services/document-control.service';
import { QualityIncomingPdfService } from './services/quality-incoming-pdf.service';
import {
    ProductSchema,
    UpdateProductSchema,
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
    CreateInvimaRegistrationSchema,
    UpdateInvimaRegistrationSchema,
    ListInvimaRegistrationsQuerySchema,
    PaginationQuerySchema,
    ListRawMaterialsQuerySchema,
    AddSupplierMaterialSchema,
    UpdateProductionOrderStatusSchema,
    InventoryQuerySchema,
    ListPurchaseOrdersQuerySchema,
    CreatePurchaseRequisitionSchema,
    CreatePurchaseRequisitionFromProductionOrderSchema,
    ListPurchaseRequisitionsQuerySchema,
    UpdatePurchaseRequisitionStatusSchema,
    MarkPurchaseRequisitionConvertedSchema,
    UpdatePurchaseOrderStatusSchema,
    ReceivePurchaseOrderSchema,
    CreateNonConformitySchema,
    ListNonConformitiesQuerySchema,
    UpdateNonConformitySchema,
    CreateCapaSchema,
    ListCapasQuerySchema,
    UpdateCapaSchema,
    CreateProcessDeviationSchema,
    UpdateProcessDeviationSchema,
    ListProcessDeviationsQuerySchema,
    CreateOosCaseSchema,
    UpdateOosCaseSchema,
    ListOosCasesQuerySchema,
    CreateChangeControlSchema,
    UpdateChangeControlSchema,
    ListChangeControlsQuerySchema,
    CreateChangeControlApprovalSchema,
    CreateEquipmentSchema,
    UpdateEquipmentSchema,
    ListEquipmentQuerySchema,
    CreateEquipmentCalibrationSchema,
    CreateEquipmentMaintenanceSchema,
    RegisterBatchEquipmentUsageSchema,
    ListEquipmentUsageQuerySchema,
    ListEquipmentAlertsQuerySchema,
    ListOperationalAlertsQuerySchema,
    ExportWeeklyComplianceReportQuerySchema,
    ListQualityAuditQuerySchema,
    CreateTechnovigilanceCaseSchema,
    ListTechnovigilanceCasesQuerySchema,
    UpdateTechnovigilanceCaseSchema,
    ReportTechnovigilanceCaseSchema,
    CreateRecallCaseSchema,
    ListRecallCasesQuerySchema,
    CustomerSchema,
    ListCustomersQuerySchema,
    CreateShipmentSchema,
    ListShipmentsQuerySchema,
    CreateDmrTemplateSchema,
    ListDmrTemplatesQuerySchema,
    ExportBatchDhrQuerySchema,
    UpdateRecallProgressSchema,
    CreateRecallNotificationSchema,
    UpdateRecallNotificationSchema,
    CloseRecallCaseSchema,
    UpsertRegulatoryLabelSchema,
    ListRegulatoryLabelsQuerySchema,
    ValidateDispatchReadinessSchema,
    ComplianceExportQuerySchema,
    CreateQualityRiskControlSchema,
    ListQualityRiskControlsQuerySchema,
    CreateQualityTrainingEvidenceSchema,
    ListQualityTrainingEvidenceQuerySchema,
    ListIncomingInspectionsQuerySchema,
    ResolveIncomingInspectionSchema,
    CorrectIncomingInspectionCostSchema,
    IncomingInspectionEvidenceTypeSchema,
    UploadIncomingInspectionEvidenceSchema,
    UpsertBatchReleaseChecklistSchema,
    SignBatchReleaseSchema,
    ListBatchReleasesQuerySchema,
    CreateControlledDocumentSchema,
    UploadControlledDocumentSourceSchema,
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
    UpsertProductionBatchPackagingFormSchema,
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
    private get purchaseOrderService() { return new PurchaseOrderService(this.em); }
    private get purchaseOrderPdfService() { return new PurchaseOrderPdfService(this.em); }
    private get packagingFormPdfService() { return new PackagingFormPdfService(this.em); }
    private get qualityIncomingPdfService() { return new QualityIncomingPdfService(this.em); }
    private get purchaseRequisitionService() { return new PurchaseRequisitionService(this.em); }
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
            const data = UpdateProductSchema.parse(req.body);
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

    async createInvimaRegistration(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = CreateInvimaRegistrationSchema.parse(req.body);
            const row = await this.productService.createInvimaRegistration(payload);
            return ApiResponse.success(res, row, 'Registro INVIMA creado', 201);
        } catch (error) {
            next(error);
        }
    }

    async updateInvimaRegistration(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = UpdateInvimaRegistrationSchema.parse(req.body);
            const row = await this.productService.updateInvimaRegistration(id, payload);
            return ApiResponse.success(res, row, 'Registro INVIMA actualizado');
        } catch (error) {
            next(error);
        }
    }

    async listInvimaRegistrations(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListInvimaRegistrationsQuerySchema.parse(req.query);
            const rows = await this.productService.listInvimaRegistrations(filters);
            return ApiResponse.success(res, rows);
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

    async upsertProductionBatchPackagingForm(req: Request, res: Response, next: NextFunction) {
        try {
            const { batchId } = req.params;
            const payload = UpsertProductionBatchPackagingFormSchema.parse(req.body);
            const batch = await this.productionService.upsertBatchPackagingForm(batchId, payload);
            return ApiResponse.success(res, batch, 'FOR de empaque guardado');
        } catch (error) {
            next(error);
        }
    }

    async getProductionBatchPackagingForm(req: Request, res: Response, next: NextFunction) {
        try {
            const { batchId } = req.params;
            const form = await this.productionService.getBatchPackagingForm(batchId);
            return ApiResponse.success(res, form);
        } catch (error) {
            next(error);
        }
    }

    async downloadProductionBatchPackagingFormPdf(req: Request, res: Response, next: NextFunction) {
        try {
            const { batchId } = req.params;
            const pdf = await this.packagingFormPdfService.generatePackagingFormPdf(batchId);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${pdf.fileName}"`);
            return res.send(pdf.buffer);
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

    async createProcessDeviation(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = CreateProcessDeviationSchema.parse(req.body);
            const row = await this.qualityService.createProcessDeviation(payload);
            return ApiResponse.success(res, row, 'Desviación registrada', 201);
        } catch (error) {
            next(error);
        }
    }

    async listProcessDeviations(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListProcessDeviationsQuerySchema.parse(req.query);
            const rows = await this.qualityService.listProcessDeviations(filters);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async updateProcessDeviation(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = UpdateProcessDeviationSchema.parse(req.body);
            const row = await this.qualityService.updateProcessDeviation(id, payload, payload.actor);
            return ApiResponse.success(res, row, 'Desviación actualizada');
        } catch (error) {
            next(error);
        }
    }

    async createOosCase(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = CreateOosCaseSchema.parse(req.body);
            const row = await this.qualityService.createOosCase(payload);
            return ApiResponse.success(res, row, 'Caso OOS registrado', 201);
        } catch (error) {
            next(error);
        }
    }

    async listOosCases(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListOosCasesQuerySchema.parse(req.query);
            const rows = await this.qualityService.listOosCases(filters);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async updateOosCase(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = UpdateOosCaseSchema.parse(req.body);
            const row = await this.qualityService.updateOosCase(id, payload, payload.actor);
            return ApiResponse.success(res, row, 'Caso OOS actualizado');
        } catch (error) {
            next(error);
        }
    }

    async createChangeControl(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = CreateChangeControlSchema.parse(req.body);
            const row = await this.qualityService.createChangeControl(payload);
            return ApiResponse.success(res, row, 'Control de cambio creado', 201);
        } catch (error) {
            next(error);
        }
    }

    async listChangeControls(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListChangeControlsQuerySchema.parse(req.query);
            const rows = await this.qualityService.listChangeControls(filters);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async updateChangeControl(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = UpdateChangeControlSchema.parse(req.body);
            const row = await this.qualityService.updateChangeControl(id, payload, payload.actor);
            return ApiResponse.success(res, row, 'Control de cambio actualizado');
        } catch (error) {
            next(error);
        }
    }

    async createChangeControlApproval(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = CreateChangeControlApprovalSchema.parse(req.body);
            const row = await this.qualityService.createChangeControlApproval(payload);
            return ApiResponse.success(res, row, 'Aprobación de cambio registrada', 201);
        } catch (error) {
            next(error);
        }
    }

    async createEquipment(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = CreateEquipmentSchema.parse(req.body);
            const row = await this.qualityService.createEquipment(payload);
            return ApiResponse.success(res, row, 'Equipo registrado', 201);
        } catch (error) {
            next(error);
        }
    }

    async listEquipment(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListEquipmentQuerySchema.parse(req.query);
            const rows = await this.qualityService.listEquipment(filters);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async updateEquipment(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = UpdateEquipmentSchema.parse(req.body);
            const row = await this.qualityService.updateEquipment(id, payload, payload.actor);
            return ApiResponse.success(res, row, 'Equipo actualizado');
        } catch (error) {
            next(error);
        }
    }

    async createEquipmentCalibration(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = CreateEquipmentCalibrationSchema.parse(req.body);
            const row = await this.qualityService.createEquipmentCalibration(id, payload);
            return ApiResponse.success(res, row, 'Calibración registrada', 201);
        } catch (error) {
            next(error);
        }
    }

    async createEquipmentMaintenance(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = CreateEquipmentMaintenanceSchema.parse(req.body);
            const row = await this.qualityService.createEquipmentMaintenance(id, payload);
            return ApiResponse.success(res, row, 'Mantenimiento registrado', 201);
        } catch (error) {
            next(error);
        }
    }

    async registerBatchEquipmentUsage(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = RegisterBatchEquipmentUsageSchema.parse(req.body);
            const row = await this.qualityService.registerBatchEquipmentUsage(payload);
            return ApiResponse.success(res, row, 'Uso de equipo registrado', 201);
        } catch (error) {
            next(error);
        }
    }

    async listBatchEquipmentUsage(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListEquipmentUsageQuerySchema.parse(req.query);
            const rows = await this.qualityService.listBatchEquipmentUsage(filters);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async getEquipmentHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const row = await this.qualityService.getEquipmentHistory(id);
            return ApiResponse.success(res, row);
        } catch (error) {
            next(error);
        }
    }

    async listEquipmentAlerts(req: Request, res: Response, next: NextFunction) {
        try {
            const { daysAhead } = ListEquipmentAlertsQuerySchema.parse(req.query);
            const rows = await this.qualityService.listEquipmentAlerts(daysAhead);
            return ApiResponse.success(res, rows);
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

    async createRecallCase(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = CreateRecallCaseSchema.parse(req.body);
            const row = await this.qualityService.createRecallCase(payload);
            return ApiResponse.success(res, row, 'Caso de recall creado', 201);
        } catch (error) {
            next(error);
        }
    }

    async listRecallCases(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListRecallCasesQuerySchema.parse(req.query);
            const rows = await this.qualityService.listRecallCases(filters);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async createCustomer(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = CustomerSchema.parse(req.body);
            const row = await this.qualityService.createCustomer(payload);
            return ApiResponse.success(res, row, 'Cliente creado', 201);
        } catch (error) {
            next(error);
        }
    }

    async listCustomers(req: Request, res: Response, next: NextFunction) {
        try {
            const { search } = ListCustomersQuerySchema.parse(req.query);
            const rows = await this.qualityService.listCustomers({ search });
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async createShipment(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = CreateShipmentSchema.parse(req.body);
            const row = await this.qualityService.createShipment(payload, payload.dispatchedBy || 'sistema-web');
            return ApiResponse.success(res, row, 'Despacho registrado', 201);
        } catch (error) {
            next(error);
        }
    }

    async listShipments(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListShipmentsQuerySchema.parse(req.query);
            const rows = await this.qualityService.listShipments(filters);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async createDmrTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = CreateDmrTemplateSchema.parse(req.body);
            const row = await this.qualityService.createDmrTemplate(payload);
            return ApiResponse.success(res, row, 'Plantilla DMR creada', 201);
        } catch (error) {
            next(error);
        }
    }

    async listDmrTemplates(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListDmrTemplatesQuerySchema.parse(req.query);
            const rows = await this.qualityService.listDmrTemplates(filters);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async getBatchDhr(req: Request, res: Response, next: NextFunction) {
        try {
            const { productionBatchId } = req.params;
            const actor = typeof req.query.actor === 'string' ? req.query.actor : undefined;
            const row = await this.qualityService.getBatchDhr(productionBatchId, actor);
            return ApiResponse.success(res, row, 'Expediente DHR generado');
        } catch (error) {
            next(error);
        }
    }

    async exportBatchDhr(req: Request, res: Response, next: NextFunction) {
        try {
            const { productionBatchId } = req.params;
            const { format, actor } = ExportBatchDhrQuerySchema.parse(req.query);
            const row = await this.qualityService.exportBatchDhr(productionBatchId, format, actor);
            return ApiResponse.success(res, row, 'Exportable DHR generado');
        } catch (error) {
            next(error);
        }
    }

    async listRecallAffectedCustomers(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const rows = await this.qualityService.listRecallAffectedCustomers(id);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async updateRecallProgress(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = UpdateRecallProgressSchema.parse(req.body);
            const row = await this.qualityService.updateRecallProgress(id, payload);
            return ApiResponse.success(res, row, 'Avance de recall actualizado');
        } catch (error) {
            next(error);
        }
    }

    async createRecallNotification(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = CreateRecallNotificationSchema.parse(req.body);
            const row = await this.qualityService.addRecallNotification(id, payload);
            return ApiResponse.success(res, row, 'Notificación de recall creada', 201);
        } catch (error) {
            next(error);
        }
    }

    async updateRecallNotification(req: Request, res: Response, next: NextFunction) {
        try {
            const { notificationId } = req.params;
            const payload = UpdateRecallNotificationSchema.parse(req.body);
            const row = await this.qualityService.updateRecallNotification(notificationId, payload);
            return ApiResponse.success(res, row, 'Notificación de recall actualizada');
        } catch (error) {
            next(error);
        }
    }

    async closeRecallCase(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = CloseRecallCaseSchema.parse(req.body);
            const row = await this.qualityService.closeRecallCase(id, payload);
            return ApiResponse.success(res, row, 'Recall cerrado');
        } catch (error) {
            next(error);
        }
    }

    async upsertRegulatoryLabel(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = UpsertRegulatoryLabelSchema.parse(req.body);
            const row = await this.qualityService.upsertRegulatoryLabel(payload);
            return ApiResponse.success(res, row, 'Etiqueta regulatoria registrada', 201);
        } catch (error) {
            next(error);
        }
    }

    async listRegulatoryLabels(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListRegulatoryLabelsQuerySchema.parse(req.query);
            const rows = await this.qualityService.listRegulatoryLabels(filters);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async validateDispatchReadiness(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = ValidateDispatchReadinessSchema.parse(req.body);
            const result = await this.qualityService.validateDispatchReadiness(payload.productionBatchId, payload.actor);
            return ApiResponse.success(res, result, result.eligible ? 'Despacho habilitado' : 'Despacho bloqueado');
        } catch (error) {
            next(error);
        }
    }

    async getComplianceDashboard(_req: Request, res: Response, next: NextFunction) {
        try {
            const data = await this.qualityService.getComplianceDashboard();
            return ApiResponse.success(res, data, 'Tablero de cumplimiento');
        } catch (error) {
            next(error);
        }
    }

    async exportCompliance(req: Request, res: Response, next: NextFunction) {
        try {
            const { format } = ComplianceExportQuerySchema.parse(req.query);
            const data = await this.qualityService.exportCompliance(format);
            return ApiResponse.success(res, data, 'Exportable de cumplimiento generado');
        } catch (error) {
            next(error);
        }
    }

    async listOperationalAlerts(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListOperationalAlertsQuerySchema.parse(req.query);
            const data = await this.qualityService.listOperationalAlerts(filters);
            return ApiResponse.success(res, data, 'Bandeja de alertas operativas');
        } catch (error) {
            next(error);
        }
    }

    async exportWeeklyComplianceReport(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ExportWeeklyComplianceReportQuerySchema.parse(req.query);
            const data = await this.qualityService.exportWeeklyComplianceReport(filters);
            return ApiResponse.success(res, data, 'Reporte semanal de cumplimiento');
        } catch (error) {
            next(error);
        }
    }

    async createQualityRiskControl(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = CreateQualityRiskControlSchema.parse(req.body);
            const row = await this.qualityService.createRiskControl(payload);
            return ApiResponse.success(res, row, 'Riesgo/control registrado', 201);
        } catch (error) {
            next(error);
        }
    }

    async listQualityRiskControls(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListQualityRiskControlsQuerySchema.parse(req.query);
            const rows = await this.qualityService.listRiskControls(filters);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async createQualityTrainingEvidence(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = CreateQualityTrainingEvidenceSchema.parse(req.body);
            const row = await this.qualityService.createTrainingEvidence(payload);
            return ApiResponse.success(res, row, 'Evidencia de capacitación registrada', 201);
        } catch (error) {
            next(error);
        }
    }

    async listQualityTrainingEvidence(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListQualityTrainingEvidenceQuerySchema.parse(req.query);
            const rows = await this.qualityService.listTrainingEvidence(filters);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async listIncomingInspections(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListIncomingInspectionsQuerySchema.parse(req.query);
            const rows = await this.qualityService.listIncomingInspections(filters);
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async resolveIncomingInspection(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = ResolveIncomingInspectionSchema.parse(req.body);
            const row = await this.qualityService.resolveIncomingInspection(id, payload);
            return ApiResponse.success(res, row, 'Inspección de recepción resuelta');
        } catch (error) {
            next(error);
        }
    }

    async correctResolvedIncomingInspectionCost(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = CorrectIncomingInspectionCostSchema.parse(req.body);
            const row = await this.qualityService.correctResolvedIncomingInspectionCost(id, payload);
            return ApiResponse.success(res, row, 'Costo de recepción corregido');
        } catch (error) {
            next(error);
        }
    }

    async uploadIncomingInspectionEvidence(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const evidenceType = IncomingInspectionEvidenceTypeSchema.parse(req.params.evidenceType);
            const payload = UploadIncomingInspectionEvidenceSchema.parse(req.body);
            const row = await this.qualityService.uploadIncomingInspectionEvidence(id, evidenceType, payload);
            return ApiResponse.success(res, row, 'Adjunto de inspección cargado');
        } catch (error) {
            next(error);
        }
    }

    async downloadIncomingInspectionEvidence(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const evidenceType = IncomingInspectionEvidenceTypeSchema.parse(req.params.evidenceType);
            const file = await this.qualityService.readIncomingInspectionEvidence(id, evidenceType);
            res.setHeader('Content-Type', file.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
            return res.send(file.buffer);
        } catch (error) {
            next(error);
        }
    }

    async downloadIncomingInspectionPdf(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const file = await this.qualityIncomingPdfService.generateIncomingInspectionPdf(id);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
            return res.send(file.buffer);
        } catch (error) {
            next(error);
        }
    }

    async upsertBatchReleaseChecklist(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = UpsertBatchReleaseChecklistSchema.parse(req.body);
            const row = await this.qualityService.upsertBatchReleaseChecklist(payload);
            return ApiResponse.success(res, row, 'Checklist de liberación QA actualizado', 201);
        } catch (error) {
            next(error);
        }
    }

    async signBatchRelease(req: Request, res: Response, next: NextFunction) {
        try {
            const { productionBatchId } = req.params;
            const payload = SignBatchReleaseSchema.parse(req.body);
            const row = await this.qualityService.signBatchRelease(productionBatchId, payload);
            return ApiResponse.success(res, row, 'Lote liberado por QA');
        } catch (error) {
            next(error);
        }
    }

    async listBatchReleases(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = ListBatchReleasesQuerySchema.parse(req.query);
            const rows = await this.qualityService.listBatchReleases(filters);
            return ApiResponse.success(res, rows);
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

    async uploadControlledDocumentSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const payload = UploadControlledDocumentSourceSchema.parse(req.body);
            const row = await this.documentControlService.uploadSourceFile(id, payload);
            return ApiResponse.success(res, row, 'Archivo fuente adjuntado al documento');
        } catch (error) {
            next(error);
        }
    }

    async downloadControlledDocumentSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const file = await this.documentControlService.readSourceFile(id);
            res.setHeader('Content-Type', file.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
            return res.send(file.buffer);
        } catch (error) {
            next(error);
        }
    }

    async printControlledDocument(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const html = await this.documentControlService.getPrintableHtml(id);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);
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

    async downloadPurchaseOrderPdf(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const pdf = await this.purchaseOrderPdfService.generatePurchaseOrderPdf(id);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${pdf.fileName}"`);
            return res.send(pdf.buffer);
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

    // --- Purchase Requisitions ---
    async createPurchaseRequisition(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = CreatePurchaseRequisitionSchema.parse(req.body);
            const row = await this.purchaseRequisitionService.create(payload);
            return ApiResponse.success(res, row, 'Requisición de compra creada', 201);
        } catch (error) {
            next(error);
        }
    }

    async createPurchaseRequisitionFromProductionOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const { id: productionOrderId } = req.params;
            const payload = CreatePurchaseRequisitionFromProductionOrderSchema.parse(req.body ?? {});
            const requirements = await this.productionService.calculateMaterialRequirements(productionOrderId);
            const shortageItems = requirements
                .filter((reqRow) => Number(reqRow.required) > Number(reqRow.available))
                .map((reqRow) => {
                    const deficit = Number((Number(reqRow.required) - Number(reqRow.available)).toFixed(4));
                    return {
                        rawMaterialId: reqRow.material.id,
                        quantity: deficit,
                        suggestedSupplierId: reqRow.potentialSuppliers[0]?.supplier?.id,
                        notes: `Autogenerado desde OP ${productionOrderId}`,
                    };
                });

            if (shortageItems.length === 0) {
                throw new AppError('La orden no tiene faltantes de materias primas para requisición', 409);
            }

            const row = await this.purchaseRequisitionService.create({
                requestedBy: payload.requestedBy,
                productionOrderId,
                neededBy: payload.neededBy,
                notes: payload.notes,
                items: shortageItems,
            });
            return ApiResponse.success(res, row, 'Requisición generada desde la orden de producción', 201);
        } catch (error) {
            next(error);
        }
    }

    async listPurchaseRequisitions(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit, status, productionOrderId } = ListPurchaseRequisitionsQuerySchema.parse(req.query);
            const rows = await this.purchaseRequisitionService.list(page || 1, limit || 20, { status, productionOrderId });
            return ApiResponse.success(res, rows);
        } catch (error) {
            next(error);
        }
    }

    async getPurchaseRequisition(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const row = await this.purchaseRequisitionService.getById(id);
            if (!row) throw new AppError('Requisición no encontrada', 404);
            return ApiResponse.success(res, row);
        } catch (error) {
            next(error);
        }
    }

    async updatePurchaseRequisitionStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status } = UpdatePurchaseRequisitionStatusSchema.parse(req.body);
            const row = await this.purchaseRequisitionService.updateStatus(id, status);
            return ApiResponse.success(res, row, 'Estado de requisición actualizado');
        } catch (error) {
            next(error);
        }
    }

    async markPurchaseRequisitionConverted(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { purchaseOrderId } = MarkPurchaseRequisitionConvertedSchema.parse(req.body);
            const row = await this.purchaseRequisitionService.markConverted(id, purchaseOrderId);
            return ApiResponse.success(res, row, 'Requisición marcada como convertida');
        } catch (error) {
            next(error);
        }
    }
}
