import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ControlledDocument, DocumentCategory, DocumentStatus, IncomingInspectionResult, IncomingInspectionStatus, OperationalConfig } from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { mrpApi } from '@/services/mrpApi';
import { useControlledDocumentsQuery } from '@/hooks/mrp/useQuality';
import { useOperationalConfigQuery, useSaveOperationalConfigMutation } from '@/hooks/mrp/useOperationalConfig';
import { Settings } from 'lucide-react';
import { getErrorMessage } from '@/lib/api-error';
import type { QualityComplianceModel } from '../types';

const shortId = (value?: string) => {
  if (!value) return 'N/A';
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
};

export function QualityIncomingTab({ model }: { model: QualityComplianceModel }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showReceptionDocSettings, setShowReceptionDocSettings] = useState(false);
  const [globalReceptionDocCode, setGlobalReceptionDocCode] = useState('');
  const [expandedIncomingInspectionId, setExpandedIncomingInspectionId] = useState<string | null>(null);
  const [resolverOpenId, setResolverOpenId] = useState<string | null>(null);
  const [resolverForm, setResolverForm] = useState<{
    inspectionResult: IncomingInspectionResult;
    controlledDocumentId: string;
    quantityAccepted: string;
    supplierLotCode: string;
    certificateRef: string;
    invoiceNumber: string;
    acceptedUnitCost: string;
    notes: string;
    inspectedBy: string;
    approvedBy: string;
    managerApprovedBy: string;
  }>({
    inspectionResult: IncomingInspectionResult.APROBADO,
    controlledDocumentId: '',
    quantityAccepted: '',
    supplierLotCode: '',
    certificateRef: '',
    invoiceNumber: '',
    acceptedUnitCost: '',
    notes: '',
    inspectedBy: '',
    approvedBy: '',
    managerApprovedBy: '',
  });

  const openResolver = (inspectionId: string, quantityReceived: number) => {
    setResolverOpenId(inspectionId);
    setResolverForm({
      inspectionResult: IncomingInspectionResult.APROBADO,
      controlledDocumentId: '',
      quantityAccepted: String(quantityReceived),
      supplierLotCode: '',
      certificateRef: '',
      invoiceNumber: '',
      acceptedUnitCost: '',
      notes: '',
      inspectedBy: '',
      approvedBy: '',
      managerApprovedBy: '',
    });
  };
  const { data: controlledDocuments, error: controlledDocumentsError } = useControlledDocumentsQuery({
    documentCategory: DocumentCategory.FOR,
    status: DocumentStatus.APROBADO,
  });
  const { data: controlledDocumentsAll, error: controlledDocumentsAllError } = useControlledDocumentsQuery({
    documentCategory: DocumentCategory.FOR,
  });
  const { data: operationalConfig } = useOperationalConfigQuery();
  const { execute: saveOperationalConfig, loading: savingReceptionDocSetting } = useSaveOperationalConfigMutation();
  const latestDocByCode = useMemo(
    () =>
      (controlledDocumentsAll ?? []).reduce<Record<string, ControlledDocument>>((acc, doc) => {
        const current = acc[doc.code];
        if (!current || doc.version > current.version) acc[doc.code] = doc;
        return acc;
      }, {}),
    [controlledDocumentsAll]
  );
  const documentCodeOptions = useMemo(
    () => Object.values(latestDocByCode).sort((a, b) => a.code.localeCompare(b.code)),
    [latestDocByCode]
  );
  useEffect(() => {
    if (!controlledDocumentsError && !controlledDocumentsAllError) return;
    toast({
      title: 'Error',
      description: 'No se pudieron cargar formatos de control documental',
      variant: 'destructive',
    });
  }, [controlledDocumentsError, controlledDocumentsAllError, toast]);
  useEffect(() => {
    if (!controlledDocuments?.length) return;
    setResolverForm((prev) => {
      if (prev.controlledDocumentId) return prev;
      if (operationalConfig?.defaultIncomingInspectionControlledDocumentCode) {
        const configured = controlledDocuments.find((doc) => doc.code === operationalConfig.defaultIncomingInspectionControlledDocumentCode);
        if (configured) return { ...prev, controlledDocumentId: configured.id };
      }
      return { ...prev, controlledDocumentId: controlledDocuments[0].id };
    });
  }, [controlledDocuments, operationalConfig]);
  useEffect(() => {
    setGlobalReceptionDocCode(operationalConfig?.defaultIncomingInspectionControlledDocumentCode || '');
  }, [operationalConfig]);

  const submitResolveInspection = async (inspectionId: string, quantityReceived: number) => {
    if (!resolverForm.inspectedBy.trim() || resolverForm.inspectedBy.trim().length < 2) {
      toast({ title: 'Error', description: 'Debes registrar el inspector QA', variant: 'destructive' });
      return;
    }
    if (!resolverForm.approvedBy.trim() || resolverForm.approvedBy.trim().length < 2) {
      toast({ title: 'Error', description: 'Debes registrar el aprobador QA', variant: 'destructive' });
      return;
    }
    if (
      [IncomingInspectionResult.CONDICIONAL, IncomingInspectionResult.RECHAZADO].includes(resolverForm.inspectionResult) &&
      (!resolverForm.managerApprovedBy.trim() || resolverForm.managerApprovedBy.trim().length < 2)
    ) {
      toast({ title: 'Error', description: 'Debes registrar el jefe de calidad para condicional/rechazado', variant: 'destructive' });
      return;
    }

    const quantityAccepted = Number(resolverForm.quantityAccepted);
    if (Number.isNaN(quantityAccepted) || quantityAccepted < 0) {
      toast({ title: 'Error', description: 'Cantidad aceptada inválida', variant: 'destructive' });
      return;
    }
    if (quantityAccepted > quantityReceived) {
      toast({ title: 'Error', description: 'La cantidad aceptada no puede exceder la recibida', variant: 'destructive' });
      return;
    }
    const quantityRejected = resolverForm.inspectionResult === IncomingInspectionResult.CONDICIONAL
      ? 0
      : Number((quantityReceived - quantityAccepted).toFixed(4));
    const acceptedUnitCost = resolverForm.acceptedUnitCost.trim()
      ? Number(resolverForm.acceptedUnitCost.trim())
      : undefined;
    if (resolverForm.acceptedUnitCost.trim() && (Number.isNaN(acceptedUnitCost) || (acceptedUnitCost ?? 0) < 0)) {
      toast({ title: 'Error', description: 'Costo unitario aceptado inválido', variant: 'destructive' });
      return;
    }

    try {
      await model.resolveIncomingInspectionWithPayload({
        id: inspectionId,
        inspectionResult: resolverForm.inspectionResult,
        controlledDocumentId: resolverForm.controlledDocumentId || undefined,
        supplierLotCode: resolverForm.supplierLotCode.trim() || undefined,
        certificateRef: resolverForm.certificateRef.trim() || undefined,
        invoiceNumber: resolverForm.invoiceNumber.trim() || undefined,
        notes: resolverForm.notes.trim() || undefined,
        quantityAccepted,
        quantityRejected,
        acceptedUnitCost,
        inspectedBy: resolverForm.inspectedBy.trim(),
        approvedBy: resolverForm.approvedBy.trim(),
        managerApprovedBy: resolverForm.managerApprovedBy.trim() || undefined,
      });
      setResolverOpenId(null);
    } catch {
      // Error toast handled in flow hook.
    }
  };

  const isConditionalPending = (inspection: NonNullable<typeof model.incomingInspections>[number]) =>
    inspection.status === IncomingInspectionStatus.PENDIENTE &&
    inspection.inspectionResult === IncomingInspectionResult.CONDICIONAL;

  const downloadFor28Pdf = async (inspectionId: string) => {
    try {
      const blob = await mrpApi.getIncomingInspectionPdf(inspectionId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GC-FOR-28-${inspectionId.slice(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo descargar el formato GC-FOR-28',
        variant: 'destructive',
      });
    }
  };
  const saveGlobalReceptionDoc = async () => {
    if (!operationalConfig) {
      toast({ title: 'Error', description: 'Configuración operativa no cargada todavía', variant: 'destructive' });
      return;
    }
    try {
      const sanitizedPaymentMethods = (operationalConfig.purchasePaymentMethods ?? [])
        .map((method) => String(method ?? '').trim())
        .filter((method) => method.length > 0);

      const sanitizedWithholdingRules = (operationalConfig.purchaseWithholdingRules ?? [])
        .map((rule) => ({
          key: String(rule.key ?? '').trim().toLowerCase(),
          label: String(rule.label ?? '').trim(),
          rate: Number(rule.rate ?? 0),
          active: rule.active ?? true,
        }))
        .filter((rule) => rule.key.length > 0 && rule.label.length > 0);

      const payload: Partial<OperationalConfig> = {
        operatorSalary: Number(operationalConfig.operatorSalary || 0),
        operatorLoadFactor: Number(operationalConfig.operatorLoadFactor || 1),
        operatorRealMonthlyMinutes: Number(operationalConfig.operatorRealMonthlyMinutes || 1),
        rent: Number(operationalConfig.rent || 0),
        utilities: Number(operationalConfig.utilities || 0),
        adminSalaries: Number(operationalConfig.adminSalaries || 0),
        otherExpenses: Number(operationalConfig.otherExpenses || 0),
        numberOfOperators: Number(operationalConfig.numberOfOperators || 1),
        purchasePaymentMethods: sanitizedPaymentMethods.length > 0
          ? sanitizedPaymentMethods
          : ['Contado'],
        purchaseWithholdingRules: sanitizedWithholdingRules.length > 0
          ? sanitizedWithholdingRules
          : [{ key: 'compra', label: 'Compra', rate: 2.5, active: true }],
        defaultPurchaseOrderControlledDocumentId: operationalConfig.defaultPurchaseOrderControlledDocumentId || undefined,
        defaultPurchaseOrderControlledDocumentCode: operationalConfig.defaultPurchaseOrderControlledDocumentCode || undefined,
        defaultIncomingInspectionControlledDocumentCode: globalReceptionDocCode || undefined,
      };
      await saveOperationalConfig(payload);
      toast({ title: 'Configuración guardada', description: 'Formato global de recepción actualizado.' });
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudo guardar el formato global de recepción'),
        variant: 'destructive',
      });
    }
  };

  return (
                <TabsContent value="incoming" className="space-y-4">
                    <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle>Inspecciones de Recepción</CardTitle>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowReceptionDocSettings((prev) => !prev)}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Formato global
                            </Button>
                          </div>
                          {showReceptionDocSettings ? (
                            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
                              <div className="text-sm text-slate-600">
                                Selecciona el código documental global para recepción. Se aplicará por defecto en esta sección y en nuevos PDFs.
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                                <div className="md:col-span-2 space-y-1">
                                  <Label>Formato global de recepción (Calidad / FOR)</Label>
                                  <select
                                    className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                                    value={globalReceptionDocCode}
                                    onChange={(e) => setGlobalReceptionDocCode(e.target.value)}
                                  >
                                    <option value="">Automático (GC-FOR-28 vigente)</option>
                                    {documentCodeOptions.map((doc) => (
                                      <option key={doc.code} value={doc.code}>
                                        {doc.code} (última v{doc.version}, {doc.status}) - {doc.title}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <Button
                                  type="button"
                                  onClick={saveGlobalReceptionDoc}
                                  disabled={savingReceptionDocSetting}
                                >
                                  {savingReceptionDocSetting ? 'Guardando...' : 'Guardar'}
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </CardHeader>
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
                                        {isConditionalPending(inspection) ? (
                                          <div className="text-xs text-amber-700 mt-1">
                                            Estado operativo: Condicional pendiente de cierre
                                          </div>
                                        ) : null}
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
                                                <div>Formato: {(inspection.documentControlCode || 'N/A')} v{inspection.documentControlVersion || 1}</div>
                                                <div>Costo unitario aceptado: {inspection.acceptedUnitCost ?? 'N/A'}</div>
                                                <div>Lote proveedor: {inspection.supplierLotCode || 'N/A'}</div>
                                                <div>Factura N°: {inspection.invoiceNumber || 'N/A'}</div>
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
                                        {resolverOpenId === inspection.id ? (
                                          <div className="mt-3 rounded-md border bg-slate-50 p-3 space-y-2">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                              <div className="space-y-1">
                                                <Label>Resultado inspección</Label>
                                                <select
                                                  className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                                                  value={resolverForm.inspectionResult}
                                                  onChange={(e) => {
                                                    const nextResult = e.target.value as IncomingInspectionResult;
                                                    setResolverForm((p) => ({
                                                      ...p,
                                                      inspectionResult: nextResult,
                                                      quantityAccepted: nextResult === IncomingInspectionResult.CONDICIONAL ? '0' : p.quantityAccepted,
                                                    }));
                                                  }}
                                                >
                                                  {isConditionalPending(inspection) ? null : (
                                                  <option value={IncomingInspectionResult.APROBADO}>Aprobado</option>
                                                  )}
                                                  <option value={IncomingInspectionResult.CONDICIONAL}>Condicional</option>
                                                  <option value={IncomingInspectionResult.RECHAZADO}>Rechazado</option>
                                                </select>
                                              </div>
                                              <div className="space-y-1">
                                                <Label>Formato control documental</Label>
                                                <select
                                                  className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                                                  value={resolverForm.controlledDocumentId}
                                                  onChange={(e) => setResolverForm((p) => ({ ...p, controlledDocumentId: e.target.value }))}
                                                >
                                                  <option value="">Usar formato vigente</option>
                                                  {(controlledDocuments ?? []).map((doc) => (
                                                    <option key={doc.id} value={doc.id}>
                                                      {doc.code} v{doc.version} - {doc.title}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>
                                              <div className="space-y-1">
                                                <Label>Cantidad aceptada</Label>
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  step="0.0001"
                                                  value={resolverForm.quantityAccepted}
                                                  disabled={resolverForm.inspectionResult === IncomingInspectionResult.CONDICIONAL}
                                                  onChange={(e) => setResolverForm((p) => ({ ...p, quantityAccepted: e.target.value }))}
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label>Cantidad rechazada</Label>
                                                <Input
                                                  readOnly
                                                  value={(() => {
                                                    if (resolverForm.inspectionResult === IncomingInspectionResult.CONDICIONAL) return '0';
                                                    const accepted = Number(resolverForm.quantityAccepted);
                                                    if (Number.isNaN(accepted)) return 'N/A';
                                                    return String(Number((Number(inspection.quantityReceived) - accepted).toFixed(4)));
                                                  })()}
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label>Lote proveedor</Label>
                                                <Input
                                                  value={resolverForm.supplierLotCode}
                                                  onChange={(e) => setResolverForm((p) => ({ ...p, supplierLotCode: e.target.value }))}
                                                  placeholder="Requerido si hay aceptado"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label>Certificado/COA</Label>
                                                <Input
                                                  value={resolverForm.certificateRef}
                                                  onChange={(e) => setResolverForm((p) => ({ ...p, certificateRef: e.target.value }))}
                                                  placeholder="Requerido para aprobado/condicional"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label>Factura N°</Label>
                                                <Input
                                                  value={resolverForm.invoiceNumber}
                                                  onChange={(e) => setResolverForm((p) => ({ ...p, invoiceNumber: e.target.value }))}
                                                  placeholder="Opcional"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label>Costo unitario aceptado</Label>
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  step="0.0001"
                                                  value={resolverForm.acceptedUnitCost}
                                                  onChange={(e) => setResolverForm((p) => ({ ...p, acceptedUnitCost: e.target.value }))}
                                                  placeholder="Opcional"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label>Inspector QA</Label>
                                                <Input
                                                  value={resolverForm.inspectedBy}
                                                  onChange={(e) => setResolverForm((p) => ({ ...p, inspectedBy: e.target.value }))}
                                                  placeholder="Obligatorio"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label>Aprobador QA</Label>
                                                <Input
                                                  value={resolverForm.approvedBy}
                                                  onChange={(e) => setResolverForm((p) => ({ ...p, approvedBy: e.target.value }))}
                                                  placeholder="Obligatorio"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <Label>Jefe de calidad</Label>
                                                <Input
                                                  value={resolverForm.managerApprovedBy}
                                                  onChange={(e) => setResolverForm((p) => ({ ...p, managerApprovedBy: e.target.value }))}
                                                  placeholder="Obligatorio en condicional/rechazado"
                                                />
                                              </div>
                                            </div>
                                            <div className="space-y-1">
                                              <Label>Notas de inspección</Label>
                                              <Textarea
                                                value={resolverForm.notes}
                                                onChange={(e) => setResolverForm((p) => ({ ...p, notes: e.target.value }))}
                                                placeholder="Requerido para condicional/rechazado (mín. 10 caracteres)"
                                              />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                              <Button type="button" variant="outline" onClick={() => setResolverOpenId(null)}>
                                                Cancelar
                                              </Button>
                                              <Button
                                                type="button"
                                                disabled={model.resolvingIncomingInspection}
                                                onClick={() => submitResolveInspection(inspection.id, Number(inspection.quantityReceived))}
                                              >
                                                {model.resolvingIncomingInspection ? 'Resolviendo...' : 'Confirmar resolución'}
                                              </Button>
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
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => downloadFor28Pdf(inspection.id)}
                                        >
                                            Descargar FOR-28
                                        </Button>
                                        {inspection.status === IncomingInspectionStatus.PENDIENTE ? (
                                            <Button
                                                size="sm"
                                                onClick={() => openResolver(inspection.id, Number(inspection.quantityReceived))}
                                            >
                                                {isConditionalPending(inspection) ? 'Cerrar condicional' : 'Resolver QA'}
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
