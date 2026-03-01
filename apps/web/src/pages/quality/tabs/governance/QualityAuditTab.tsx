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
  quality_risk_control: 'Riesgo/control',
  quality_training_evidence: 'Capacitación',
  dmr_template: 'Plantilla DMR',
  batch_dhr: 'Expediente DHR',
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
};

const actionColors: Record<string, string> = {
  created: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  updated: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-violet-50 text-violet-700 border-violet-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
  signed: 'bg-amber-50 text-amber-700 border-amber-200',
  reported_invima: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
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
    status: 'Estado', scopeType: 'Alcance',
    inspectionResult: 'Resultado', quantityAccepted: 'Aceptado',
    quantityRejected: 'Rechazado', quantity: 'Cantidad',
    coveragePercent: 'Cobertura (%)', reportNumber: 'Nro. reporte',
    reportChannel: 'Canal reporte',
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
            <span className="text-2xl font-bold text-slate-700">{model.audits.length}</span>
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

      {/* Audit log */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-violet-500" />
          <h3 className="font-semibold text-slate-800">Eventos de auditoría</h3>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">{model.audits.length}</span>
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
                  <span className="text-xs font-mono text-slate-400" title={a.entityId}>{shortId(a.entityId)}</span>
                  {a.actor && <span className="text-xs text-slate-500">por <span className="font-medium text-slate-700">{a.actor}</span></span>}
                </div>
                {a.metadata && (
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {formatAuditMetadata(a.metadata, rawMaterialLabelsById)}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-[11px] text-slate-400 mt-0.5">{new Date(a.createdAt).toLocaleString('es-CO')}</span>
            </div>
          ))}
        </div>
      </div>
    </TabsContent>
  );
}
