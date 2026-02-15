import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { QualityComplianceModel } from '../types';

const auditEntityLabels: Record<string, string> = {
  incoming_inspection: 'Inspeccion de recepcion',
  controlled_document: 'Documento controlado',
  non_conformity: 'No conformidad',
  capa: 'CAPA',
  technovigilance_case: 'Tecnovigilancia',
  recall_case: 'Recall',
  recall_notification: 'Notificacion de recall',
  regulatory_label: 'Etiqueta regulatoria',
  production_batch: 'Lote de produccion',
  production_batch_unit: 'Unidad serial',
  production_order: 'Orden de produccion',
  quality_risk_control: 'Riesgo/control',
  quality_training_evidence: 'Capacitacion',
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
  signed: 'Liberacion firmada',
  reopened: 'Liberacion reabierta',
  generated: 'Generado',
};

const shortId = (value?: string) => {
  if (!value) return 'N/A';
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
};

const formatAuditMetadata = (
  metadata?: Record<string, unknown>,
  rawMaterialLabelsById?: Record<string, string>
) => {
  if (!metadata) return '';

  const metadataLabels: Record<string, string> = {
    code: 'Codigo',
    batchId: 'Lote',
    productionBatchId: 'Lote de produccion',
    batchUnitId: 'Unidad serial',
    rawMaterialId: 'Materia prima',
    purchaseOrderId: 'Orden de compra',
    recallCaseId: 'Caso de recall',
    status: 'Estado',
    scopeType: 'Alcance',
    inspectionResult: 'Resultado de inspeccion',
    quantityAccepted: 'Cantidad aceptada',
    quantityRejected: 'Cantidad rechazada',
    quantity: 'Cantidad',
    coveragePercent: 'Cobertura (%)',
    reportNumber: 'Numero de reporte',
    reportChannel: 'Canal de reporte',
  };

  const knownKeys = [
    'code',
    'batchId',
    'productionBatchId',
    'batchUnitId',
    'rawMaterialId',
    'purchaseOrderId',
    'recallCaseId',
    'status',
    'scopeType',
    'inspectionResult',
    'quantityAccepted',
    'quantityRejected',
    'quantity',
    'coveragePercent',
    'reportNumber',
    'reportChannel',
  ];

  const values = knownKeys
    .filter((key) => metadata[key] !== undefined && metadata[key] !== null && metadata[key] !== '')
    .map((key) => {
      const value = metadata[key];
      const printable = typeof value === 'string' ? value : JSON.stringify(value);
      const label = metadataLabels[key] || key;
      if (key === 'rawMaterialId' && rawMaterialLabelsById && rawMaterialLabelsById[printable]) {
        return `${label}: ${rawMaterialLabelsById[printable]}`;
      }
      if (key.toLowerCase().endsWith('id')) return `${label}: ${shortId(printable)}`;
      return `${label}: ${printable}`;
    });

  if (values.length > 0) return values.join(' | ');

  const fallback = Object.entries(metadata)
    .slice(0, 4)
    .map(([key, value]) => `${metadataLabels[key] || key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
  return fallback.join(' | ');
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
    <TabsContent value="audit">
      <Card>
        <CardHeader><CardTitle>Eventos de Auditoria</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {model.loadingAudit ? <div>Cargando...</div> : model.audits.length === 0 ? <div className="text-sm text-slate-500">Sin eventos.</div> : model.audits.map((a) => (
            <div key={a.id} className="border rounded-md p-3">
              <div className="text-sm font-medium">
                {auditEntityLabels[a.entityType] || a.entityType} /{' '}
                <span title={a.entityId}>{shortId(a.entityId)}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">ID: {a.entityId}</div>
              <div className="text-xs text-slate-600">
                {auditActionLabels[a.action] || a.action} {a.actor ? `por ${a.actor}` : ''}
              </div>
              {a.metadata ? (
                <div className="text-[11px] text-slate-600 mt-1">
                  {formatAuditMetadata(a.metadata, rawMaterialLabelsById)}
                </div>
              ) : null}
              <div className="text-[11px] text-slate-500">{new Date(a.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
