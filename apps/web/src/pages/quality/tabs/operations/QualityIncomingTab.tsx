import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IncomingInspectionStatus } from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { QualityComplianceModel } from '../types';

const shortId = (value?: string) => {
  if (!value) return 'N/A';
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
};

export function QualityIncomingTab({ model }: { model: QualityComplianceModel }) {
  const navigate = useNavigate();
  const [expandedIncomingInspectionId, setExpandedIncomingInspectionId] = useState<string | null>(null);

  return (
                <TabsContent value="incoming" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Inspecciones de Recepción</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {model.loadingIncomingInspections ? <div>Cargando...</div> : model.incomingInspections.length === 0 ? <div className="text-sm text-slate-500">Sin inspecciones.</div> : model.incomingInspections.map((inspection) => (
                                <div key={inspection.id} className="border rounded-md p-3 flex items-start justify-between gap-3">
                                    <div>
                                        <div className="font-medium">
                                            Materia prima: {inspection.rawMaterial?.name || inspection.rawMaterialId}
                                            {inspection.rawMaterial?.sku ? ` (${inspection.rawMaterial.sku})` : ''}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">ID: {inspection.rawMaterialId}</div>
                                        <div className="text-xs text-slate-600 mt-1">
                                            Recibido: {inspection.quantityReceived} | Aceptado: {inspection.quantityAccepted} | Rechazado: {inspection.quantityRejected}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            OC:{' '}
                                            {inspection.purchaseOrderId ? (
                                                <button
                                                    type="button"
                                                    className="underline text-blue-700 hover:text-blue-900"
                                                    onClick={() => navigate(`/mrp/purchase-orders/${inspection.purchaseOrderId}`)}
                                                    title={inspection.purchaseOrderId}
                                                >
                                                    {inspection.purchaseOrder?.id
                                                        ? `OC-${inspection.purchaseOrder.id.slice(0, 8).toUpperCase()}`
                                                        : `OC-${inspection.purchaseOrderId.slice(0, 8).toUpperCase()}`}
                                                </button>
                                            ) : 'N/A'}
                                            {' '}| Proveedor:{' '}
                                            {inspection.purchaseOrder?.supplier?.id ? (
                                                <button
                                                    type="button"
                                                    className="underline text-blue-700 hover:text-blue-900"
                                                    onClick={() => navigate(`/mrp/suppliers/${inspection.purchaseOrder!.supplier!.id}`)}
                                                    title={inspection.purchaseOrder!.supplier!.id}
                                                >
                                                    {inspection.purchaseOrder?.supplier?.name || 'N/A'}
                                                </button>
                                            ) : (inspection.purchaseOrder?.supplier?.name || 'N/A')}
                                            {' '}| Certificado: {inspection.certificateRef || 'Sin certificado cargado'}
                                        </div>
                                        {expandedIncomingInspectionId === inspection.id ? (
                                            <div className="text-xs text-slate-600 mt-2 border rounded-md p-2 bg-slate-50 space-y-1">
                                                <div>Resultado inspección: {inspection.inspectionResult || 'N/A'}</div>
                                                <div>Costo unitario aceptado: {inspection.acceptedUnitCost ?? 'N/A'}</div>
                                                <div>Lote proveedor: {inspection.supplierLotCode || 'N/A'}</div>
                                                <div>Notas: {inspection.notes || 'Sin notas'}</div>
                                                <div>Inspeccionado por: {inspection.inspectedBy || 'N/A'}</div>
                                                <div>Fecha inspección: {inspection.inspectedAt ? new Date(inspection.inspectedAt).toLocaleString() : 'N/A'}</div>
                                                <div>Liberado por: {inspection.releasedBy || 'N/A'}</div>
                                                <div>Fecha liberación: {inspection.releasedAt ? new Date(inspection.releasedAt).toLocaleString() : 'N/A'}</div>
                                                <div>
                                                    Ítem OC:{' '}
                                                    {inspection.purchaseOrderItem?.rawMaterial
                                                        ? `${inspection.purchaseOrderItem.rawMaterial.name} (${inspection.purchaseOrderItem.rawMaterial.sku}) x ${inspection.purchaseOrderItem.quantity || 0}`
                                                        : (inspection.purchaseOrderItemId || 'N/A')}
                                                    {inspection.purchaseOrderItemId ? (
                                                        <> {' '}<span title={inspection.purchaseOrderItemId} className="text-slate-500">[{shortId(inspection.purchaseOrderItemId)}]</span></>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ) : null}
                                        <Badge variant="outline" className="mt-2">{inspection.status}</Badge>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setExpandedIncomingInspectionId((prev) => (prev === inspection.id ? null : inspection.id))}
                                        >
                                            {expandedIncomingInspectionId === inspection.id ? 'Ocultar detalle' : 'Ver detalle'}
                                        </Button>
                                        {inspection.status === IncomingInspectionStatus.PENDIENTE ? (
                                            <Button
                                                size="sm"
                                                onClick={() => model.quickResolveIncomingInspection(inspection.id, Number(inspection.quantityReceived))}
                                            >
                                                Resolver QA
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => model.quickCorrectIncomingInspectionCost(inspection.id)}
                                                disabled={Number(inspection.quantityAccepted) <= 0}
                                                title={Number(inspection.quantityAccepted) <= 0 ? 'No aplica: inspección sin cantidad aceptada' : undefined}
                                            >
                                                Corregir costo
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

  );
}
