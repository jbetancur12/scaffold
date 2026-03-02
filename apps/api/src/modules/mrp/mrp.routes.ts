import { Router } from 'express';
import { MikroORM } from '@mikro-orm/core';
import { MrpController } from './mrp.controller';
import { OperationalConfigService } from './services/operational-config.service';
import { OperationalConfigController } from './operational-config.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@scaffold/types';

export const createMrpRoutes = (orm: MikroORM) => {
    const router = Router();
    const mrpController = new MrpController(orm);
    const qualityEditors = [UserRole.ADMIN, UserRole.SUPERADMIN];

    // All MRP routes require authenticated user
    router.use(authenticateToken);

    // Products
    router.post('/products', (req, res, next) => mrpController.createProduct(req, res, next));
    router.get('/products', (req, res, next) => mrpController.listProducts(req, res, next));
    router.get('/products/export/csv', (req, res, next) => mrpController.exportProductsCsv(req, res, next));
    router.get('/products/import/template/csv', (req, res, next) => mrpController.getProductsImportTemplateCsv(req, res, next));
    router.post('/products/import/preview', (req, res, next) => mrpController.previewProductsImport(req, res, next));
    router.post('/products/import', (req, res, next) => mrpController.importProductsCsv(req, res, next));
    router.get('/products/:id', (req, res, next) => mrpController.getProduct(req, res, next));
    router.put('/products/:id', (req, res, next) => mrpController.updateProduct(req, res, next));
    router.delete('/products/:id', (req, res, next) => mrpController.deleteProduct(req, res, next));

    // Variants
    router.post('/products/:productId/variants', (req, res, next) => mrpController.createVariant(req, res, next));
    router.put('/variants/:variantId', (req, res, next) => mrpController.updateVariant(req, res, next));
    router.delete('/variants/:variantId', (req, res, next) => mrpController.deleteVariant(req, res, next));
    router.post('/invima-registrations', (req, res, next) => mrpController.createInvimaRegistration(req, res, next));
    router.get('/invima-registrations', (req, res, next) => mrpController.listInvimaRegistrations(req, res, next));
    router.patch('/invima-registrations/:id', (req, res, next) => mrpController.updateInvimaRegistration(req, res, next));

    // Suppliers
    router.post('/suppliers', (req, res, next) => mrpController.createSupplier(req, res, next));
    router.get('/suppliers', (req, res, next) => mrpController.listSuppliers(req, res, next));
    router.get('/suppliers/export/csv', (req, res, next) => mrpController.exportSuppliersCsv(req, res, next));
    router.get('/suppliers/import/template/csv', (req, res, next) => mrpController.getSuppliersImportTemplateCsv(req, res, next));
    router.post('/suppliers/import/preview', (req, res, next) => mrpController.previewSuppliersImport(req, res, next));
    router.post('/suppliers/import', (req, res, next) => mrpController.importSuppliersCsv(req, res, next));
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
    router.patch('/production-orders/:id/link-sales-order', (req, res, next) => mrpController.linkProductionToSalesOrder(req, res, next));
    router.post('/production-orders', (req, res, next) => mrpController.createProductionOrder(req, res, next));
    router.get('/production-orders/:id/requirements', (req, res, next) => mrpController.calculateMaterialRequirements(req, res, next));
    router.post('/production-orders/:id/material-allocation', (req, res, next) => mrpController.upsertProductionMaterialAllocation(req, res, next));
    router.post('/production-orders/:id/material-returns', (req, res, next) => mrpController.returnProductionMaterial(req, res, next));
    router.get('/production-orders/:id/batches', (req, res, next) => mrpController.listProductionBatches(req, res, next));
    router.post('/production-orders/:id/batches', (req, res, next) => mrpController.createProductionBatch(req, res, next));
    router.post('/production-batches/:batchId/units', (req, res, next) => mrpController.addProductionBatchUnits(req, res, next));
    router.patch('/production-batches/:batchId/qc', (req, res, next) => mrpController.updateProductionBatchQc(req, res, next));
    router.patch('/production-batches/:batchId/packaging', (req, res, next) => mrpController.updateProductionBatchPackaging(req, res, next));
    router.post('/production-batches/:batchId/packaging-form', (req, res, next) => mrpController.upsertProductionBatchPackagingForm(req, res, next));
    router.get('/production-batches/:batchId/packaging-form', (req, res, next) => mrpController.getProductionBatchPackagingForm(req, res, next));
    router.get('/production-batches/:batchId/packaging-form/pdf', (req, res, next) => mrpController.downloadProductionBatchPackagingFormPdf(req, res, next));
    router.patch('/production-batch-units/:unitId/qc', (req, res, next) => mrpController.updateProductionBatchUnitQc(req, res, next));
    router.patch('/production-batch-units/:unitId/packaging', (req, res, next) => mrpController.updateProductionBatchUnitPackaging(req, res, next));

    // Quality / INVIMA
    router.post('/quality/non-conformities', requireRole(qualityEditors), (req, res, next) => mrpController.createNonConformity(req, res, next));
    router.get('/quality/non-conformities', (req, res, next) => mrpController.listNonConformities(req, res, next));
    router.patch('/quality/non-conformities/:id', (req, res, next) => mrpController.updateNonConformity(req, res, next));
    router.post('/quality/capa-actions', (req, res, next) => mrpController.createCapa(req, res, next));
    router.get('/quality/capa-actions', (req, res, next) => mrpController.listCapas(req, res, next));
    router.patch('/quality/capa-actions/:id', (req, res, next) => mrpController.updateCapa(req, res, next));
    router.post('/quality/process-deviations', (req, res, next) => mrpController.createProcessDeviation(req, res, next));
    router.get('/quality/process-deviations', (req, res, next) => mrpController.listProcessDeviations(req, res, next));
    router.patch('/quality/process-deviations/:id', (req, res, next) => mrpController.updateProcessDeviation(req, res, next));
    router.post('/quality/oos-cases', (req, res, next) => mrpController.createOosCase(req, res, next));
    router.get('/quality/oos-cases', (req, res, next) => mrpController.listOosCases(req, res, next));
    router.patch('/quality/oos-cases/:id', (req, res, next) => mrpController.updateOosCase(req, res, next));
    router.post('/quality/change-controls', (req, res, next) => mrpController.createChangeControl(req, res, next));
    router.get('/quality/change-controls', (req, res, next) => mrpController.listChangeControls(req, res, next));
    router.patch('/quality/change-controls/:id', (req, res, next) => mrpController.updateChangeControl(req, res, next));
    router.post('/quality/change-controls/approvals', (req, res, next) => mrpController.createChangeControlApproval(req, res, next));
    router.post('/quality/equipment', (req, res, next) => mrpController.createEquipment(req, res, next));
    router.get('/quality/equipment', (req, res, next) => mrpController.listEquipment(req, res, next));
    router.patch('/quality/equipment/:id', (req, res, next) => mrpController.updateEquipment(req, res, next));
    router.post('/quality/equipment/:id/calibrations', (req, res, next) => mrpController.createEquipmentCalibration(req, res, next));
    router.post('/quality/equipment/:id/maintenances', (req, res, next) => mrpController.createEquipmentMaintenance(req, res, next));
    router.get('/quality/equipment/:id/history', (req, res, next) => mrpController.getEquipmentHistory(req, res, next));
    router.post('/quality/equipment-usage', (req, res, next) => mrpController.registerBatchEquipmentUsage(req, res, next));
    router.get('/quality/equipment-usage', (req, res, next) => mrpController.listBatchEquipmentUsage(req, res, next));
    router.get('/quality/equipment-alerts', (req, res, next) => mrpController.listEquipmentAlerts(req, res, next));
    router.get('/quality/audit-events', (req, res, next) => mrpController.listQualityAudit(req, res, next));
    router.post('/quality/technovigilance-cases', (req, res, next) => mrpController.createTechnovigilanceCase(req, res, next));
    router.get('/quality/technovigilance-cases', (req, res, next) => mrpController.listTechnovigilanceCases(req, res, next));
    router.patch('/quality/technovigilance-cases/:id', (req, res, next) => mrpController.updateTechnovigilanceCase(req, res, next));
    router.post('/quality/technovigilance-cases/:id/report-invima', (req, res, next) => mrpController.reportTechnovigilanceCase(req, res, next));
    router.post('/quality/recalls', (req, res, next) => mrpController.createRecallCase(req, res, next));
    router.get('/quality/recalls', (req, res, next) => mrpController.listRecallCases(req, res, next));
    router.post('/quality/customers', (req, res, next) => mrpController.createCustomer(req, res, next));
    router.get('/quality/customers', (req, res, next) => mrpController.listCustomers(req, res, next));
    router.get('/quality/customers/:id', (req, res, next) => mrpController.getCustomer(req, res, next));
    router.patch('/quality/customers/:id', (req, res, next) => mrpController.updateCustomer(req, res, next));
    router.delete('/quality/customers/:id', (req, res, next) => mrpController.deleteCustomer(req, res, next));
    router.post('/quality/shipments', (req, res, next) => mrpController.createShipment(req, res, next));
    router.get('/quality/shipments', (req, res, next) => mrpController.listShipments(req, res, next));
    router.post('/quality/dmr-templates', (req, res, next) => mrpController.createDmrTemplate(req, res, next));
    router.get('/quality/dmr-templates', (req, res, next) => mrpController.listDmrTemplates(req, res, next));
    router.get('/quality/dhr/:productionBatchId', (req, res, next) => mrpController.getBatchDhr(req, res, next));
    router.get('/quality/dhr/:productionBatchId/export', (req, res, next) => mrpController.exportBatchDhr(req, res, next));
    router.get('/quality/dhr/:productionBatchId/pdf', (req, res, next) => mrpController.downloadBatchDhrPdf(req, res, next));
    router.get('/quality/recalls/:id/affected-customers', (req, res, next) => mrpController.listRecallAffectedCustomers(req, res, next));
    router.patch('/quality/recalls/:id/progress', (req, res, next) => mrpController.updateRecallProgress(req, res, next));
    router.post('/quality/recalls/:id/notifications', (req, res, next) => mrpController.createRecallNotification(req, res, next));
    router.patch('/quality/recall-notifications/:notificationId', (req, res, next) => mrpController.updateRecallNotification(req, res, next));
    router.post('/quality/recalls/:id/close', (req, res, next) => mrpController.closeRecallCase(req, res, next));
    router.post('/quality/regulatory-labels', (req, res, next) => mrpController.upsertRegulatoryLabel(req, res, next));
    router.get('/quality/regulatory-labels', (req, res, next) => mrpController.listRegulatoryLabels(req, res, next));
    router.get('/quality/regulatory-labels/:productionBatchId/pdf', (req, res, next) => mrpController.downloadRegulatoryLabelPdf(req, res, next));
    router.post('/quality/regulatory-labels/validate-dispatch', (req, res, next) => mrpController.validateDispatchReadiness(req, res, next));
    router.get('/quality/compliance-dashboard', (req, res, next) => mrpController.getComplianceDashboard(req, res, next));
    router.get('/quality/compliance-export', (req, res, next) => mrpController.exportCompliance(req, res, next));
    router.get('/quality/operational-alerts', (req, res, next) => mrpController.listOperationalAlerts(req, res, next));
    router.get('/quality/weekly-compliance-report', (req, res, next) => mrpController.exportWeeklyComplianceReport(req, res, next));
    router.post('/quality/risk-controls', (req, res, next) => mrpController.createQualityRiskControl(req, res, next));
    router.get('/quality/risk-controls', (req, res, next) => mrpController.listQualityRiskControls(req, res, next));
    router.post('/quality/training-evidence', (req, res, next) => mrpController.createQualityTrainingEvidence(req, res, next));
    router.get('/quality/training-evidence', (req, res, next) => mrpController.listQualityTrainingEvidence(req, res, next));
    router.get('/quality/incoming-inspections', (req, res, next) => mrpController.listIncomingInspections(req, res, next));
    router.get('/quality/incoming-inspections/:id/pdf', (req, res, next) => mrpController.downloadIncomingInspectionPdf(req, res, next));
    router.post('/quality/incoming-inspections/:id/evidence/:evidenceType', requireRole(qualityEditors), (req, res, next) => mrpController.uploadIncomingInspectionEvidence(req, res, next));
    router.get('/quality/incoming-inspections/:id/evidence/:evidenceType', (req, res, next) => mrpController.downloadIncomingInspectionEvidence(req, res, next));
    router.patch('/quality/incoming-inspections/:id/resolve', requireRole(qualityEditors), (req, res, next) => mrpController.resolveIncomingInspection(req, res, next));
    router.patch('/quality/incoming-inspections/:id/correct-cost', requireRole(qualityEditors), (req, res, next) => mrpController.correctResolvedIncomingInspectionCost(req, res, next));
    router.post('/quality/batch-releases', (req, res, next) => mrpController.upsertBatchReleaseChecklist(req, res, next));
    router.get('/quality/batch-releases', (req, res, next) => mrpController.listBatchReleases(req, res, next));
    router.post('/quality/batch-releases/:productionBatchId/sign', (req, res, next) => mrpController.signBatchRelease(req, res, next));
    router.get('/quality/batch-releases/:productionBatchId/pdf', (req, res, next) => mrpController.downloadBatchReleasePdf(req, res, next));
    router.post('/quality/documents', (req, res, next) => mrpController.createControlledDocument(req, res, next));
    router.get('/quality/documents', (req, res, next) => mrpController.listControlledDocuments(req, res, next));
    router.post('/quality/documents/:id/submit-review', (req, res, next) => mrpController.submitControlledDocument(req, res, next));
    router.post('/quality/documents/:id/approve', (req, res, next) => mrpController.approveControlledDocument(req, res, next));
    router.post('/quality/documents/:id/source-file', (req, res, next) => mrpController.uploadControlledDocumentSource(req, res, next));
    router.get('/quality/documents/:id/source-file', (req, res, next) => mrpController.downloadControlledDocumentSource(req, res, next));
    router.get('/quality/documents/:id/print', (req, res, next) => mrpController.printControlledDocument(req, res, next));
    router.get('/quality/documents/active/:process', (req, res, next) => mrpController.listActiveControlledDocumentsByProcess(req, res, next));


    // Purchase Orders
    router.post('/purchase-orders', (req, res, next) => mrpController.createPurchaseOrder(req, res, next));
    router.get('/purchase-orders', (req, res, next) => mrpController.listPurchaseOrders(req, res, next));
    router.get('/purchase-orders/:id', (req, res, next) => mrpController.getPurchaseOrder(req, res, next));
    router.get('/purchase-orders/:id/pdf', (req, res, next) => mrpController.downloadPurchaseOrderPdf(req, res, next));
    router.put('/purchase-orders/:id/status', (req, res, next) => mrpController.updatePurchaseOrderStatus(req, res, next));
    router.post('/purchase-orders/:id/receive', (req, res, next) => mrpController.receivePurchaseOrder(req, res, next));
    router.delete('/purchase-orders/:id', (req, res, next) => mrpController.cancelPurchaseOrder(req, res, next));

    // Purchase Requisitions
    router.post('/purchase-requisitions', (req, res, next) => mrpController.createPurchaseRequisition(req, res, next));
    router.get('/purchase-requisitions', (req, res, next) => mrpController.listPurchaseRequisitions(req, res, next));
    router.get('/purchase-requisitions/:id', (req, res, next) => mrpController.getPurchaseRequisition(req, res, next));
    router.patch('/purchase-requisitions/:id/status', (req, res, next) => mrpController.updatePurchaseRequisitionStatus(req, res, next));
    router.post('/purchase-requisitions/:id/mark-converted', (req, res, next) => mrpController.markPurchaseRequisitionConverted(req, res, next));
    router.post('/production-orders/:id/purchase-requisition', (req, res, next) => mrpController.createPurchaseRequisitionFromProductionOrder(req, res, next));

    // Sales Orders
    router.post('/sales-orders', (req, res, next) => mrpController.createSalesOrder(req, res, next));
    router.get('/sales-orders', (req, res, next) => mrpController.listSalesOrders(req, res, next));
    router.get('/sales-orders/:id', (req, res, next) => mrpController.getSalesOrder(req, res, next));
    router.put('/sales-orders/:id', (req, res, next) => mrpController.updateSalesOrder(req, res, next));
    router.patch('/sales-orders/:id/status', (req, res, next) => mrpController.updateSalesOrderStatus(req, res, next));
    router.get('/sales-orders/:id/pdf', (req, res, next) => mrpController.downloadSalesOrderPdf(req, res, next));

    // Inventory
    router.get('/inventory', (req, res, next) => mrpController.getInventory(req, res, next));
    router.get('/inventory/kardex', (req, res, next) => mrpController.getInventoryKardex(req, res, next));
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
    router.put('/operational-config', requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]), (req, res, next) => configController.updateConfig(req, res, next));

    return router;
};
