import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { ScrollText, FileSearch } from 'lucide-react';
import type { QualityComplianceModel } from '../types';

const auditEntityLabels: Record<string, string> = {
  incoming_inspection: 'Inspección de recepción',
  controlled_document: 'Documento controlado',
  non_conformity: 'No conformidad',
  capa: 'CAPA',
  technovigilance_case: 'Tecnovigilancia',
  recall_case: 'Recall',
  recall_notification: 'Notificación recall',
  regulatory_label: 'Etiqueta regulatoria',
  production_batch: 'Lote de producción',
  production_batch_unit: 'Unidad serial',
  production_order: 'Orden de producción',
  purchase_order: 'Orden de compra',
  purchase_requisition: 'Requisición de compra',
  quotation: 'Cotización',
  quality_risk_control: 'Riesgo/control',
  quality_training_evidence: 'Capacitación',
  dmr_template: 'Plantilla DMR',
  batch_dhr: 'Expediente DHR',
  customer: 'Cliente',
  batch_release: 'Liberación de lote',
  shipment: 'Despacho',
  raw_material_lot: 'Lote de materia prima',
};

const auditActionLabels: Record<string, string> = {
  created: 'Creado',
  updated: 'Actualizado',
  approved: 'Aprobado',
  closed: 'Cerrado',
  resolved: 'Resuelto',
  upserted: 'Registrado',
  dispatch_validated: 'Despacho validado',
  reported_invima: 'Reportado a INVIMA',
  status_updated: 'Estado actualizado',
  units_added: 'Unidades agregadas',
  qc_updated: 'QC actualizado',
  packaging_updated: 'Empaque actualizado',
  progress_updated: 'Avance actualizado',
  checklist_updated: 'Checklist actualizado',
  signed: 'Liberación firmada',
  reopened: 'Liberación reabierta',
  generated: 'Generado',
  invoice_number_updated: 'Factura actualizada',
  evidence_uploaded: 'Evidencia cargada',
  raw_material_consumed_by_production: 'Materia prima consumida',
  finished_inspection_form_updated: 'Inspección final actualizada',
  packaging_form_updated: 'Formato de empaque actualizado',
  received: 'Recibido',
  cancelled: 'Cancelado',
  converted: 'Convertido',
  converted_to_sales_order: 'Convertido a pedido',
  sales_order_linked: 'Pedido vinculado',
  sales_order_unlinked: 'Pedido desvinculado',
};

const actionColors: Record<string, string> = {
  created: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  updated: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-violet-50 text-violet-700 border-violet-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
  signed: 'bg-amber-50 text-amber-700 border-amber-200',
  reported_invima: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  invoice_number_updated: 'bg-blue-50 text-blue-700 border-blue-200',
  checklist_updated: 'bg-blue-50 text-blue-700 border-blue-200',
  reopened: 'bg-rose-50 text-rose-700 border-rose-200',
  raw_material_consumed_by_production: 'bg-orange-50 text-orange-700 border-orange-200',
  finished_inspection_form_updated: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  packaging_form_updated: 'bg-sky-50 text-sky-700 border-sky-200',
  received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  converted: 'bg-violet-50 text-violet-700 border-violet-200',
  converted_to_sales_order: 'bg-violet-50 text-violet-700 border-violet-200',
  sales_order_linked: 'bg-blue-50 text-blue-700 border-blue-200',
  sales_order_unlinked: 'bg-slate-100 text-slate-600 border-slate-200',
};

const shortId = (value?: string) => {
  if (!value) return 'N/A';
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
};

const formatAuditMetadata = (
  metadata?: Record<string, unknown>,
  rawMaterialLabelsById?: Record<string, string>
) => {
  if (!metadata) return '';
  const metadataLabels: Record<string, string> = {
    code: 'Código', batchId: 'Lote', productionBatchId: 'Lote producción',
    batchUnitId: 'Unidad serial', rawMaterialId: 'Materia prima',
    purchaseOrderId: 'Orden compra', recallCaseId: 'Caso recall',
    customerId: 'Cliente', supplierId: 'Proveedor',
    status: 'Estado', scopeType: 'Alcance',
    previousStatus: 'Estado anterior',
    inspectionResult: 'Resultado', quantityAccepted: 'Aceptado',
    quantityRejected: 'Rechazado', quantity: 'Cantidad',
    coveragePercent: 'Cobertura (%)', reportNumber: 'Nro. reporte',
    reportChannel: 'Canal reporte',
    previousInvoiceNumber: 'Factura anterior',
    nextInvoiceNumber: 'Factura nueva',
    totalAmount: 'Total',
    netTotalAmount: 'Total neto',
    itemsCount: 'Ítems',
    salesOrderId: 'Pedido cliente',
    previousSalesOrderId: 'Pedido anterior',
  };
  const knownKeys = Object.keys(metadataLabels);
  const values = knownKeys
    .filter((key) => metadata[key] !== undefined && metadata[key] !== null && metadata[key] !== '')
    .map((key) => {
      const value = metadata[key];
      const printable = typeof value === 'string' ? value : JSON.stringify(value);
      const label = metadataLabels[key] || key;
      if (key === 'rawMaterialId' && rawMaterialLabelsById?.[printable]) return `${label}: ${rawMaterialLabelsById[printable]}`;
      if (key.toLowerCase().endsWith('id')) return `${label}: ${shortId(printable)}`;
      return `${label}: ${printable}`;
    });
  if (values.length > 0) return values.join(' · ');
  return Object.entries(metadata).slice(0, 3)
    .map(([key, value]) => `${metadataLabels[key] || key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(' · ');
};

export function QualityAuditTab({ model }: { model: QualityComplianceModel }) {
  const rawMaterialLabelsById = model.incomingInspections.reduce<Record<string, string>>((acc, inspection) => {
    if (inspection.rawMaterialId && inspection.rawMaterial?.name) {
      acc[inspection.rawMaterialId] = inspection.rawMaterial.sku
        ? `${inspection.rawMaterial.name} (${inspection.rawMaterial.sku})`
        : inspection.rawMaterial.name;
    }
    return acc;
  }, {});
  const customerLabelsById = (model.customers ?? []).reduce<Record<string, string>>((acc, customer) => {
    if (customer?.id && customer.name) {
      const doc = [customer.documentType, customer.documentNumber].filter(Boolean).join(' ');
      acc[customer.id] = doc ? `${customer.name} (${doc})` : customer.name;
    }
    return acc;
  }, {});
  const auditFilters = model.auditFilters;
  const auditTotal = model.auditTotal;
  const auditPage = model.auditPage;
  const auditLimit = model.auditLimit;
  const totalPages = Math.max(1, Math.ceil(auditTotal / auditLimit));
  const showingFrom = auditTotal === 0 ? 0 : (auditPage - 1) * auditLimit + 1;
  const showingTo = Math.min(auditPage * auditLimit, auditTotal);
  const actionOptions = Object.keys(auditActionLabels).sort();
  const [actionSearch, setActionSearch] = useState('');
  const filteredActions = actionOptions.filter((action) => {
    const label = auditActionLabels[action] || action;
    const q = actionSearch.trim().toLowerCase();
    if (!q) return true;
    return label.toLowerCase().includes(q) || action.toLowerCase().includes(q);
  });

  return (
    <TabsContent value="audit" className="space-y-5">

      {/* Hero */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-50/40 to-transparent pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="p-2.5 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
              <ScrollText className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Auditoría</h2>
              <p className="text-slate-500 text-sm mt-0.5">Registro cronológico de eventos en el sistema de calidad.</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
          <div className="flex flex-col items-center py-3 px-4">
            <span className="text-2xl font-bold text-slate-700">{auditTotal}</span>
            <span className="text-xs text-slate-500 font-medium mt-0.5">Eventos registrados</span>
          </div>
          <div className="flex flex-col items-center py-3 px-4">
            <span className="text-2xl font-bold text-violet-700">
              {new Set(model.audits.map((a) => a.entityType)).size}
            </span>
            <span className="text-xs text-slate-500 font-medium mt-0.5">Tipos de entidad</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Filtros de auditoría</h3>
            <p className="text-xs text-slate-500">Selecciona eventos y rango de fechas para afinar el historial.</p>
          </div>
          <button
            type="button"
            onClick={() => model.setAuditFilters({ actions: [], dateFrom: '', dateTo: '', page: 1, limit: auditLimit })}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Limpiar filtros
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Eventos</label>
              <span className="text-[11px] text-slate-400">{auditFilters.actions.length} seleccionados</span>
            </div>
            <input
              type="text"
              value={actionSearch}
              onChange={(e) => setActionSearch(e.target.value)}
              placeholder="Buscar evento..."
              className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <div className="mt-3 max-h-44 overflow-auto rounded-xl border border-slate-200 bg-slate-50/60 p-2">
              <div className="flex flex-wrap gap-2">
                {filteredActions.map((action) => {
                  const selected = auditFilters.actions.includes(action);
                  return (
                    <button
                      key={action}
                      type="button"
                      onClick={() => {
                        model.setAuditFilters((prev) => {
                          const next = selected
                            ? prev.actions.filter((value) => value !== action)
                            : [...prev.actions, action];
                          return { ...prev, actions: next, page: 1 };
                        });
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${selected
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-violet-200 hover:text-slate-800'
                        }`}
                    >
                      {auditActionLabels[action] || action}
                    </button>
                  );
                })}
                {filteredActions.length === 0 && (
                  <span className="text-xs text-slate-400 px-2 py-1">Sin resultados</span>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Desde</label>
              <input
                type="date"
                value={auditFilters.dateFrom}
                onChange={(e) => model.setAuditFilters((prev) => ({ ...prev, dateFrom: e.target.value, page: 1 }))}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Hasta</label>
              <input
                type="date"
                value={auditFilters.dateTo}
                onChange={(e) => model.setAuditFilters((prev) => ({ ...prev, dateTo: e.target.value, page: 1 }))}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Audit log */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-violet-500" />
          <h3 className="font-semibold text-slate-800">Eventos de auditoría</h3>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">{auditTotal}</span>
        </div>
        <div className="p-4 space-y-2">
          {model.loadingAudit ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <div className="animate-spin mr-3 h-5 w-5 border-4 border-slate-200 border-t-violet-600 rounded-full" />
              <span className="text-sm animate-pulse">Cargando eventos...</span>
            </div>
          ) : model.audits.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Sin eventos de auditoría.</p>
            </div>
          ) : model.audits.map((a) => (
            <div key={a.id} className="flex items-start gap-3 border border-slate-100 bg-slate-50/60 rounded-2xl px-4 py-3 hover:border-violet-100 transition-colors">
              {/* action pill */}
              <span className={`shrink-0 text-[10px] font-bold border rounded-lg px-2 py-0.5 mt-0.5 ${actionColors[a.action] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {auditActionLabels[a.action] || a.action}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-800">{auditEntityLabels[a.entityType] || a.entityType}</span>
                  {a.entityType === 'customer' && customerLabelsById[a.entityId] ? (
                    <span className="text-xs text-slate-500" title={a.entityId}>{customerLabelsById[a.entityId]}</span>
                  ) : (
                    <span className="text-xs font-mono text-slate-400" title={a.entityId}>{shortId(a.entityId)}</span>
                  )}
                  {a.actor && <span className="text-xs text-slate-500">por <span className="font-medium text-slate-700">{a.actor}</span></span>}
                </div>
                {a.metadata && (
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {formatAuditMetadata(a.metadata, rawMaterialLabelsById)}
                  </p>
                )}
                {a.notes && (
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed italic">
                    Motivo: {a.notes}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-[11px] text-slate-400 mt-0.5">{new Date(a.createdAt).toLocaleString('es-CO')}</span>
            </div>
          ))}
          {model.audits.length > 0 && (
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
              <span>Mostrando {showingFrom}-{showingTo} de {auditTotal}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => model.setAuditFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={auditPage <= 1}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span>Página {auditPage} de {totalPages}</span>
                <button
                  type="button"
                  onClick={() => model.setAuditFilters((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
                  disabled={auditPage >= totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </TabsContent>
  );
}
