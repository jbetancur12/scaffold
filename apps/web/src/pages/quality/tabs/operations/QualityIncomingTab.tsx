import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ControlledDocument, DocumentCategory, IncomingInspectionResult, IncomingInspectionStatus, NonConformityStatus, OperationalConfig, QualitySeverity, UserRole } from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { IncomingInspectionEvidenceType, mrpApi } from '@/services/mrpApi';
import { useControlledDocumentsQuery } from '@/hooks/mrp/useQuality';
import { useOperationalConfigQuery, useSaveOperationalConfigMutation } from '@/hooks/mrp/useOperationalConfig';
import { Settings } from 'lucide-react';
import { getErrorMessage } from '@/lib/api-error';
import { useHasRole } from '@/components/auth/RoleGuard';
import type { QualityComplianceModel } from '../types';

const shortId = (value?: string) => {
  if (!value) return 'N/A';
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
};

type AuditStageStatus = 'ok' | 'pending';

const auditStageClassName: Record<AuditStageStatus, string> = {
  ok: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
};

export function QualityIncomingTab({ model }: { model: QualityComplianceModel }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasRole } = useHasRole();
  const canManageIncoming = Boolean(hasRole([UserRole.ADMIN, UserRole.SUPERADMIN]));
  const [showReceptionDocSettings, setShowReceptionDocSettings] = useState(false);
  const [globalReceptionDocCode, setGlobalReceptionDocCode] = useState('');
  const [expandedIncomingInspectionId, setExpandedIncomingInspectionId] = useState<string | null>(null);
  const [resolverOpenId, setResolverOpenId] = useState<string | null>(null);
  const [showCostAdjustment, setShowCostAdjustment] = useState(false);
  const [auditFilter, setAuditFilter] = useState<'all' | 'pending' | 'blocked' | 'complete'>('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [resolverForm, setResolverForm] = useState<{
    inspectionResult: IncomingInspectionResult;
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
    setShowCostAdjustment(false);
    setResolverForm({
      inspectionResult: IncomingInspectionResult.APROBADO,
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
    if (!controlledDocumentsAllError) return;
    toast({
      title: 'Error',
      description: 'No se pudieron cargar formatos de control documental',
      variant: 'destructive',
    });
  }, [controlledDocumentsAllError, toast]);
  useEffect(() => {
    setGlobalReceptionDocCode(operationalConfig?.defaultIncomingInspectionControlledDocumentCode || '');
  }, [operationalConfig]);

  const submitResolveInspection = async (inspectionId: string, quantityReceived: number) => {
    const inspection = model.incomingInspections.find((row) => row.id === inspectionId);
    const hasCertificateFile = Boolean(inspection?.certificateFileName);
    const hasInvoiceFile = Boolean(inspection?.invoiceFileName);

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
    if (quantityAccepted > 0 && !resolverForm.certificateRef.trim() && !hasCertificateFile) {
      toast({ title: 'Error', description: 'Para cantidad aceptada debes registrar certificado/COA o cargar el archivo', variant: 'destructive' });
      return;
    }
    if (quantityAccepted > 0 && !resolverForm.invoiceNumber.trim() && !hasInvoiceFile) {
      toast({ title: 'Error', description: 'Para cantidad aceptada debes registrar factura/remisión o cargar el archivo', variant: 'destructive' });
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

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsDataURL(file);
    });

  const promptAndUploadEvidence = async (
    inspectionId: string,
    evidenceType: IncomingInspectionEvidenceType
  ) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.png,.jpg,.jpeg,.webp';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const base64Data = await toBase64(file);
        await mrpApi.uploadIncomingInspectionEvidence(inspectionId, evidenceType, {
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64Data,
          actor: 'sistema-web',
        });
        toast({
          title: 'Adjunto cargado',
          description: evidenceType === 'invoice' ? 'Factura adjuntada correctamente.' : 'Certificado adjuntado correctamente.',
        });
        await model.refetchIncomingInspections();
      } catch (error) {
        toast({
          title: 'Error',
          description: getErrorMessage(error, 'No se pudo cargar el archivo'),
          variant: 'destructive',
        });
      }
    };
    input.click();
  };

  const downloadEvidence = async (
    inspectionId: string,
    evidenceType: IncomingInspectionEvidenceType
  ) => {
    try {
      const blob = await mrpApi.downloadIncomingInspectionEvidence(inspectionId, evidenceType);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${evidenceType}-${inspectionId.slice(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudo descargar el adjunto'),
        variant: 'destructive',
      });
    }
  };

  const goCreateNcFromInspection = (inspection: NonNullable<typeof model.incomingInspections>[number]) => {
    const materialLabel = inspection.rawMaterial?.name || inspection.rawMaterial?.sku || inspection.rawMaterialId;
    const supplierLabel = inspection.purchaseOrder?.supplier?.name || 'N/A';
    const lotLabel = inspection.supplierLotCode || 'N/A';
    const invoiceLabel = inspection.invoiceNumber || 'N/A';
    const description = [
      'No conformidad detectada en recepción de materia prima.',
      `Materia prima: ${materialLabel}`,
      `Proveedor: ${supplierLabel}`,
      `Lote: ${lotLabel}`,
      `Factura: ${invoiceLabel}`,
      `Resultado inspección: ${inspection.inspectionResult || 'rechazado'}`,
      `Notas: ${inspection.notes || 'Sin notas registradas'}`,
    ].join('\n');

    navigate('/quality/nc', {
      state: {
        prefillNc: {
          title: `NC Recepción - ${materialLabel}`,
          description,
          severity: QualitySeverity.ALTA,
          source: 'recepcion_materia_prima',
          incomingInspectionId: inspection.id,
        },
      },
    });
  };

  const linkedNcInspectionIds = useMemo(
    () =>
      new Set(
        (model.nonConformities ?? [])
          .filter((nc) => nc.incomingInspectionId && nc.status !== NonConformityStatus.CERRADA)
          .map((nc) => nc.incomingInspectionId as string)
      ),
    [model.nonConformities]
  );
  const hasLinkedNc = (inspectionId: string) => linkedNcInspectionIds.has(inspectionId);

  const auditedInspections = useMemo(() => {
    return (model.incomingInspections ?? []).map((inspection) => {
      const stages = [
        { key: 'oc', label: 'OC', status: inspection.purchaseOrderId ? 'ok' : 'pending' as AuditStageStatus },
        { key: 'recepcion', label: 'Recepción', status: 'ok' as AuditStageStatus },
        { key: 'for28', label: 'FOR-28', status: inspection.documentControlCode ? 'ok' : 'pending' as AuditStageStatus },
        { key: 'resultado', label: 'Resultado', status: inspection.status !== IncomingInspectionStatus.PENDIENTE ? 'ok' : 'pending' as AuditStageStatus },
      ];
      const needsNc = inspection.status === IncomingInspectionStatus.RECHAZADO;
      stages.push({
        key: 'nc',
        label: 'NC',
        status: needsNc ? (hasLinkedNc(inspection.id) ? 'ok' : 'pending') : 'ok',
      });

      const pendingStages = stages.filter((stage) => stage.status === 'pending').length;
      const blocked = inspection.status === IncomingInspectionStatus.PENDIENTE || (needsNc && !hasLinkedNc(inspection.id));
      const complete = pendingStages === 0 && !blocked;
      return { inspection, stages, pendingStages, blocked, complete };
    });
  }, [model.incomingInspections, linkedNcInspectionIds]);

  const filteredInspections = useMemo(() => {
    const search = auditSearch.trim().toLowerCase();
    return auditedInspections.filter((row) => {
      const byFilter =
        auditFilter === 'all'
          ? true
          : auditFilter === 'pending'
            ? row.pendingStages > 0
            : auditFilter === 'blocked'
              ? row.blocked
              : row.complete;
      if (!byFilter) return false;
      if (!search) return true;
      const haystack = [
        row.inspection.id,
        row.inspection.rawMaterial?.name || '',
        row.inspection.rawMaterial?.sku || '',
        row.inspection.documentControlCode || '',
        row.inspection.purchaseOrder?.supplier?.name || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [auditedInspections, auditFilter, auditSearch]);

  const auditSummary = useMemo(() => {
    const total = auditedInspections.length;
    const blocked = auditedInspections.filter((row) => row.blocked).length;
    const complete = auditedInspections.filter((row) => row.complete).length;
    const pending = auditedInspections.filter((row) => row.pendingStages > 0).length;
    return { total, blocked, complete, pending };
  }, [auditedInspections]);

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
    <TabsContent value="incoming" className="space-y-5">

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-50/40 to-transparent pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
                <Settings className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Inspecciones de Recepción</h2>
                <p className="text-slate-500 text-sm mt-0.5">Control de calidad en recepción de materia prima.</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowReceptionDocSettings((prev) => !prev)}
              disabled={!canManageIncoming}
              title={!canManageIncoming ? 'Solo administrador/superadmin' : undefined}
              className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-medium shrink-0"
            >
              <Settings className="h-4 w-4 mr-2" />
              Formato global
            </Button>
          </div>

          {/* Settings panel */}
          {showReceptionDocSettings && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <p className="text-sm text-slate-600">
                Selecciona el código documental global para recepción. Se aplicará por defecto en esta sección y en nuevos PDFs.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Formato global (Calidad / FOR)</label>
                  <select
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                  disabled={!canManageIncoming || savingReceptionDocSetting}
                  className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium"
                >
                  {savingReceptionDocSetting ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                      Guardando...
                    </>
                  ) : 'Guardar'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100">
          {[
            { label: 'Total', value: auditSummary.total, color: 'text-slate-700', bg: '' },
            { label: 'Pendientes', value: auditSummary.pending, color: 'text-amber-700', bg: 'bg-amber-50/60' },
            { label: 'Bloqueadas', value: auditSummary.blocked, color: 'text-red-600', bg: 'bg-red-50/60' },
            { label: 'Completas', value: auditSummary.complete, color: 'text-emerald-700', bg: 'bg-emerald-50/60' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`flex flex-col items-center py-3 px-4 ${bg}`}>
              <span className={`text-2xl font-bold ${color}`}>{value}</span>
              <span className="text-xs text-slate-500 font-medium mt-0.5">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Filtro operativo</label>
            <select
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value as typeof auditFilter)}
            >
              <option value="all">Todas</option>
              <option value="pending">Con pendientes</option>
              <option value="blocked">Bloqueadas</option>
              <option value="complete">Completas</option>
            </select>
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Buscar inspección</label>
            <Input
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Material, SKU, proveedor, código documental o ID"
              className="h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500"
            />
          </div>
        </div>
      </div>

      {/* Inspection list */}
      {model.loadingIncomingInspections ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <div className="animate-spin mr-3 h-6 w-6 border-4 border-slate-200 border-t-violet-600 rounded-full" />
          <span className="text-sm animate-pulse">Cargando inspecciones...</span>
        </div>
      ) : filteredInspections.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl text-slate-400">
          <Settings className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Sin inspecciones para el filtro actual.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInspections.map(({ inspection, stages, blocked, complete }) => {
            const statusStyle =
              inspection.status === IncomingInspectionStatus.PENDIENTE
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : inspection.status === IncomingInspectionStatus.RECHAZADO
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200';

            return (
              <div key={inspection.id} className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${blocked ? 'border-red-200' : complete ? 'border-emerald-200' : 'border-slate-200'}`}>

                {/* Card header row */}
                <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <span className="font-bold text-slate-900 text-sm">
                        {inspection.rawMaterial?.name || inspection.rawMaterialId}
                        {inspection.rawMaterial?.sku ? <span className="ml-1.5 font-normal text-slate-400 text-xs font-mono">({inspection.rawMaterial.sku})</span> : null}
                      </span>
                      <Badge variant="outline" className={`font-semibold text-[11px] ring-1 ring-inset ${statusStyle}`}>
                        {inspection.status}
                      </Badge>
                      {isConditionalPending(inspection) && (
                        <span className="text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">Condicional pendiente</span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 space-y-0.5">
                      <div>
                        Recibido: <span className="font-semibold text-slate-700">{inspection.quantityReceived}</span>
                        &nbsp;·&nbsp;Aceptado: <span className="font-semibold text-emerald-700">{inspection.quantityAccepted}</span>
                        &nbsp;·&nbsp;Rechazado: <span className="font-semibold text-red-600">{inspection.quantityRejected}</span>
                      </div>
                      <div>
                        OC:{' '}
                        {inspection.purchaseOrderId ? (
                          <button type="button" className="underline text-violet-600 hover:text-violet-800 font-medium"
                            onClick={() => navigate(`/mrp/purchase-orders/${inspection.purchaseOrderId}`)}
                            title={inspection.purchaseOrderId}>
                            OC-{inspection.purchaseOrderId.slice(0, 8).toUpperCase()}
                          </button>
                        ) : 'N/A'}
                        &nbsp;·&nbsp;Proveedor:{' '}
                        {inspection.purchaseOrder?.supplier?.id ? (
                          <button type="button" className="underline text-violet-600 hover:text-violet-800 font-medium"
                            onClick={() => navigate(`/mrp/suppliers/${inspection.purchaseOrder!.supplier!.id}`)}
                            title={inspection.purchaseOrder!.supplier!.id}>
                            {inspection.purchaseOrder?.supplier?.name || 'N/A'}
                          </button>
                        ) : (inspection.purchaseOrder?.supplier?.name || 'N/A')}
                        &nbsp;·&nbsp;Cert: {inspection.certificateRef || <span className="italic text-slate-400">Sin certificado</span>}
                      </div>
                    </div>

                    {/* Audit stage pills */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {stages.map((stage) => (
                        <span
                          key={stage.key}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${auditStageClassName[stage.status]}`}
                        >
                          {stage.status === 'ok' ? '✓' : '◐'} {stage.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    <Button size="sm" variant="outline"
                      onClick={() => setExpandedIncomingInspectionId((prev) => (prev === inspection.id ? null : inspection.id))}
                      className="rounded-lg border-slate-200 text-xs h-8">
                      {expandedIncomingInspectionId === inspection.id ? 'Ocultar' : 'Detalle'}
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => downloadFor28Pdf(inspection.id)}
                      className="rounded-lg border-slate-200 text-xs h-8">
                      FOR-28
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => promptAndUploadEvidence(inspection.id, 'invoice')}
                      disabled={!canManageIncoming}
                      className="rounded-lg border-slate-200 text-xs h-8">
                      + Factura
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => promptAndUploadEvidence(inspection.id, 'certificate')}
                      disabled={!canManageIncoming}
                      className="rounded-lg border-slate-200 text-xs h-8">
                      + Certif.
                    </Button>
                    {inspection.invoiceFileName && (
                      <Button size="sm" variant="outline" onClick={() => downloadEvidence(inspection.id, 'invoice')} className="rounded-lg border-slate-200 text-xs h-8">
                        ↓ Factura
                      </Button>
                    )}
                    {inspection.certificateFileName && (
                      <Button size="sm" variant="outline" onClick={() => downloadEvidence(inspection.id, 'certificate')} className="rounded-lg border-slate-200 text-xs h-8">
                        ↓ Certif.
                      </Button>
                    )}
                    {inspection.status === IncomingInspectionStatus.PENDIENTE ? (
                      <Button size="sm"
                        onClick={() => openResolver(inspection.id, Number(inspection.quantityReceived))}
                        disabled={!canManageIncoming}
                        className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs h-8 font-medium">
                        {isConditionalPending(inspection) ? 'Cerrar condicional' : 'Resolver QA'}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline"
                        onClick={() => model.quickCorrectIncomingInspectionCost(inspection.id)}
                        disabled={!canManageIncoming || Number(inspection.quantityAccepted) <= 0}
                        title={Number(inspection.quantityAccepted) <= 0 ? 'No aplica: sin cantidad aceptada' : undefined}
                        className="rounded-lg border-slate-200 text-xs h-8">
                        Corregir costo
                      </Button>
                    )}
                    {inspection.status === IncomingInspectionStatus.RECHAZADO && (
                      <Button size="sm" variant="outline"
                        disabled={!canManageIncoming || hasLinkedNc(inspection.id)}
                        onClick={() => goCreateNcFromInspection(inspection)}
                        className={`rounded-lg text-xs h-8 ${hasLinkedNc(inspection.id) ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>
                        {hasLinkedNc(inspection.id) ? '✓ NC creada' : 'Crear NC'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedIncomingInspectionId === inspection.id && (
                  <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/60">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4 text-xs">
                      {[
                        { label: 'Resultado', value: inspection.inspectionResult || 'N/A' },
                        { label: 'Formato', value: `${inspection.documentControlCode || 'N/A'} v${inspection.documentControlVersion || 1}` },
                        { label: 'Costo unitario', value: inspection.acceptedUnitCost ?? 'N/A' },
                        { label: 'Lote proveedor', value: inspection.supplierLotCode || 'N/A', mono: true },
                        { label: 'Factura N°', value: inspection.invoiceNumber || 'N/A', mono: true },
                        { label: 'Archivo factura', value: inspection.invoiceFileName || 'Sin adjunto' },
                        { label: 'Archivo certificado', value: inspection.certificateFileName || 'Sin adjunto' },
                        { label: 'Notas', value: inspection.notes || 'Sin notas' },
                        { label: 'Inspeccionado por', value: inspection.inspectedBy || 'N/A' },
                        { label: 'Fecha inspección', value: inspection.inspectedAt ? new Date(inspection.inspectedAt).toLocaleString() : 'N/A' },
                        { label: 'Liberado por', value: inspection.releasedBy || 'N/A' },
                        { label: 'Fecha liberación', value: inspection.releasedAt ? new Date(inspection.releasedAt).toLocaleString() : 'N/A' },
                      ].map(({ label, value, mono }) => (
                        <div key={label}>
                          <span className="text-slate-400 font-medium">{label}</span>
                          <p className={`text-slate-700 font-semibold truncate mt-0.5 ${mono ? 'font-mono' : ''}`}>{String(value)}</p>
                        </div>
                      ))}
                    </div>
                    {inspection.purchaseOrderItemId && (
                      <div className="mt-3 text-xs text-slate-500 font-mono">
                        Ítem OC:{' '}
                        {inspection.purchaseOrderItem?.rawMaterial
                          ? `${inspection.purchaseOrderItem.rawMaterial.name} (${inspection.purchaseOrderItem.rawMaterial.sku}) x ${inspection.purchaseOrderItem.quantity || 0}`
                          : inspection.purchaseOrderItemId}
                        {' '}<span title={inspection.purchaseOrderItemId} className="text-slate-400">[{shortId(inspection.purchaseOrderItemId)}]</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Inline Resolver Form */}
                {resolverOpenId === inspection.id && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5 space-y-4">

                    {/* Decisión */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Decisión de inspección</p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-slate-700">Resultado</Label>
                          <select
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-slate-700">Cantidad aceptada</Label>
                          <Input type="number" min={0} step="0.0001"
                            value={resolverForm.quantityAccepted}
                            disabled={resolverForm.inspectionResult === IncomingInspectionResult.CONDICIONAL}
                            onChange={(e) => setResolverForm((p) => ({ ...p, quantityAccepted: e.target.value }))}
                            className="h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-slate-700">Cantidad rechazada</Label>
                          <Input readOnly
                            value={(() => {
                              if (resolverForm.inspectionResult === IncomingInspectionResult.CONDICIONAL) return '0';
                              const accepted = Number(resolverForm.quantityAccepted);
                              if (Number.isNaN(accepted)) return 'N/A';
                              return String(Number((Number(inspection.quantityReceived) - accepted).toFixed(4)));
                            })()}
                            className="h-10 rounded-xl border-slate-200 bg-slate-100 text-slate-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-slate-700">Notas</Label>
                          <Input value={resolverForm.notes}
                            onChange={(e) => setResolverForm((p) => ({ ...p, notes: e.target.value }))}
                            placeholder="Obligatorio en condicional/rechazado"
                            className="h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Trazabilidad */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trazabilidad documental</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          { key: 'supplierLotCode' as const, label: 'Lote proveedor', placeholder: 'Requerido si hay aceptado', mono: true },
                          { key: 'certificateRef' as const, label: 'Certificado / COA', placeholder: 'Requerido para aprobado/condicional' },
                          { key: 'invoiceNumber' as const, label: 'Factura / remisión N°', placeholder: 'Requerido si hay cantidad aceptada', mono: true },
                        ].map(({ key, label, placeholder, mono }) => (
                          <div key={key} className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-700">{label}</Label>
                            <Input value={resolverForm[key]} onChange={(e) => setResolverForm((p) => ({ ...p, [key]: e.target.value }))}
                              placeholder={placeholder}
                              className={`h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500 ${mono ? 'font-mono' : ''}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Firmas */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Firmas y aprobación</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          { key: 'inspectedBy' as const, label: 'Inspector QA', placeholder: 'Obligatorio' },
                          { key: 'approvedBy' as const, label: 'Aprobador QA', placeholder: 'Obligatorio' },
                          { key: 'managerApprovedBy' as const, label: 'Jefe de Calidad', placeholder: 'Obligatorio en condicional/rechazado' },
                        ].map(({ key, label, placeholder }) => (
                          <div key={key} className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-700">{label}</Label>
                            <Input value={resolverForm[key]} onChange={(e) => setResolverForm((p) => ({ ...p, [key]: e.target.value }))}
                              placeholder={placeholder}
                              className="h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Costo unitario opcional */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${showCostAdjustment ? 'bg-violet-600 border-violet-600' : 'border-slate-300 bg-white'}`}
                          onClick={() => setShowCostAdjustment((v) => !v)}
                        >
                          {showCostAdjustment && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                        </div>
                        <input type="checkbox" className="sr-only" checked={showCostAdjustment} onChange={(e) => setShowCostAdjustment(e.target.checked)} />
                        <span className="text-sm text-slate-700">Ajustar costo unitario aceptado <span className="text-slate-400">(opcional)</span></span>
                      </label>
                      {showCostAdjustment && (
                        <div className="mt-3 max-w-xs">
                          <Label className="text-xs font-medium text-slate-700">Costo unitario aceptado</Label>
                          <Input type="number" min={0} step="0.0001"
                            value={resolverForm.acceptedUnitCost}
                            onChange={(e) => setResolverForm((p) => ({ ...p, acceptedUnitCost: e.target.value }))}
                            placeholder="Opcional"
                            className="h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500 mt-1.5"
                          />
                        </div>
                      )}
                    </div>

                    {/* Footer actions */}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setResolverOpenId(null)} className="rounded-xl border-slate-200">
                        Cancelar
                      </Button>
                      <Button type="button"
                        disabled={model.resolvingIncomingInspection}
                        onClick={() => submitResolveInspection(inspection.id, Number(inspection.quantityReceived))}
                        className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium px-6"
                      >
                        {model.resolvingIncomingInspection ? (
                          <>
                            <div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                            Resolviendo...
                          </>
                        ) : 'Confirmar resolución'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </TabsContent>
  );
}
