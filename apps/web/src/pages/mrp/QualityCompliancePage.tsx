import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BatchReleaseStatus,
    CapaStatus,
    DocumentProcess,
    DocumentStatus,
    NonConformityStatus,
    QualitySeverity,
    RecallNotificationStatus,
    RecallScopeType,
    RecallStatus,
    RegulatoryCodingStandard,
    RegulatoryDeviceType,
    RegulatoryLabelScopeType,
    RegulatoryLabelStatus,
    QualityRiskControlStatus,
    IncomingInspectionStatus,
    InvimaRegistrationStatus,
    TechnovigilanceCaseType,
    TechnovigilanceCausality,
    TechnovigilanceSeverity,
    TechnovigilanceStatus,
} from '@scaffold/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { qualityDocumentStatusLabels, qualityProcessLabels } from '@/constants/mrpQuality';
import { useQualityCompliance } from '@/hooks/mrp/useQualityCompliance';

const auditEntityLabels: Record<string, string> = {
    incoming_inspection: 'Inspección de recepción',
    controlled_document: 'Documento controlado',
    non_conformity: 'No conformidad',
    capa: 'CAPA',
    technovigilance_case: 'Tecnovigilancia',
    recall_case: 'Recall',
    recall_notification: 'Notificación de recall',
    regulatory_label: 'Etiqueta regulatoria',
    production_batch: 'Lote de producción',
    production_batch_unit: 'Unidad serial',
    production_order: 'Orden de producción',
    quality_risk_control: 'Riesgo/control',
    quality_training_evidence: 'Capacitación',
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
        code: 'Código',
        batchId: 'Lote',
        productionBatchId: 'Lote de producción',
        batchUnitId: 'Unidad serial',
        rawMaterialId: 'Materia prima',
        purchaseOrderId: 'Orden de compra',
        recallCaseId: 'Caso de recall',
        status: 'Estado',
        scopeType: 'Alcance',
        inspectionResult: 'Resultado de inspección',
        quantityAccepted: 'Cantidad aceptada',
        quantityRejected: 'Cantidad rechazada',
        quantity: 'Cantidad',
        coveragePercent: 'Cobertura (%)',
        reportNumber: 'Número de reporte',
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

export default function QualityCompliancePage() {
    const navigate = useNavigate();
    const [expandedIncomingInspectionId, setExpandedIncomingInspectionId] = useState<string | null>(null);

    const {
        nonConformities,
        capas,
        audits,
        technovigilanceCases,
        recalls,
        customers,
        shipments,
        regulatoryLabels,
        incomingInspections,
        batchReleases,
        invimaRegistrations,
        complianceDashboard,
        riskControls,
        trainingEvidence,
        documents,
        openNc,
        ncForm,
        capaForm,
        documentForm,
        technoForm,
        recallForm,
        customerForm,
        shipmentForm,
        regulatoryLabelForm,
        riskControlForm,
        trainingForm,
        batchReleaseForm,
        invimaRegistrationForm,
        setNcForm,
        setCapaForm,
        setDocumentForm,
        setTechnoForm,
        setRecallForm,
        setCustomerForm,
        setShipmentForm,
        setRegulatoryLabelForm,
        setRiskControlForm,
        setTrainingForm,
        setBatchReleaseForm,
        setInvimaRegistrationForm,
        loadingNc,
        loadingCapas,
        loadingAudit,
        loadingTechno,
        loadingRecalls,
        loadingCustomers,
        loadingShipments,
        loadingRegulatoryLabels,
        loadingIncomingInspections,
        loadingBatchReleases,
        loadingInvimaRegistrations,
        loadingComplianceDashboard,
        loadingRiskControls,
        loadingTrainingEvidence,
        loadingDocuments,
        creatingNc,
        creatingCapa,
        creatingDocument,
        creatingTechnoCase,
        creatingRecall,
        creatingCustomer,
        creatingShipment,
        savingRegulatoryLabel,
        validatingDispatch,
        exportingCompliance,
        creatingRiskControl,
        creatingTrainingEvidence,
        savingBatchReleaseChecklist,
        signingBatchRelease,
        creatingInvimaRegistration,
        submittingDocument,
        approvingDocument,
        handleCreateNc,
        handleCreateCapa,
        quickCloseNc,
        quickCloseCapa,
        handleCreateDocument,
        handleSubmitDocument,
        handleApproveDocument,
        handleCreateTechnoCase,
        quickSetTechnoStatus,
        quickReportTechno,
        handleCreateRecall,
        handleCreateCustomer,
        handleCreateShipment,
        addShipmentItem,
        removeShipmentItem,
        updateShipmentItem,
        quickUpdateRecallProgress,
        quickShowRecallAffectedCustomers,
        quickCreateRecallNotification,
        quickUpdateRecallNotificationStatus,
        quickCloseRecall,
        handleUpsertRegulatoryLabel,
        quickValidateDispatch,
        quickResolveIncomingInspection,
        handleUpsertBatchReleaseChecklist,
        quickSignBatchRelease,
        handleCreateInvimaRegistration,
        handleExportCompliance,
        handleCreateRiskControl,
        handleCreateTrainingEvidence,
    } = useQualityCompliance();

    const rawMaterialLabelsById = incomingInspections.reduce<Record<string, string>>((acc, inspection) => {
        if (inspection.rawMaterialId && inspection.rawMaterial?.name) {
            acc[inspection.rawMaterialId] = inspection.rawMaterial.sku
                ? `${inspection.rawMaterial.name} (${inspection.rawMaterial.sku})`
                : inspection.rawMaterial.name;
        }
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Calidad y Cumplimiento</h1>
                <p className="text-slate-500 mt-1">
                    Base regulatoria: No conformidades, CAPA y auditoría de acciones críticas.
                </p>
            </div>

            <Tabs defaultValue="nc" className="w-full">
                <TabsList>
                    <TabsTrigger value="nc">No Conformidades</TabsTrigger>
                    <TabsTrigger value="capa">CAPA</TabsTrigger>
                    <TabsTrigger value="techno">Tecnovigilancia</TabsTrigger>
                    <TabsTrigger value="recall">Recall</TabsTrigger>
                    <TabsTrigger value="shipment">Despachos</TabsTrigger>
                    <TabsTrigger value="labeling">Etiquetado</TabsTrigger>
                    <TabsTrigger value="incoming">Recepción</TabsTrigger>
                    <TabsTrigger value="batch-release">Liberación QA</TabsTrigger>
                    <TabsTrigger value="invima">Registros INVIMA</TabsTrigger>
                    <TabsTrigger value="compliance">Cumplimiento</TabsTrigger>
                    <TabsTrigger value="docs">Control documental</TabsTrigger>
                    <TabsTrigger value="audit">Auditoría</TabsTrigger>
                </TabsList>

                <TabsContent value="nc" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Registrar No Conformidad</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleCreateNc}>
                                <div className="space-y-1">
                                    <Label>Título</Label>
                                    <Input value={ncForm.title} onChange={(e) => setNcForm((p) => ({ ...p, title: e.target.value }))} required />
                                </div>
                                <div className="space-y-1">
                                    <Label>Severidad</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={ncForm.severity}
                                        onChange={(e) => setNcForm((p) => ({ ...p, severity: e.target.value as QualitySeverity }))}
                                    >
                                        {Object.values(QualitySeverity).map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Descripción</Label>
                                    <Textarea value={ncForm.description} onChange={(e) => setNcForm((p) => ({ ...p, description: e.target.value }))} required />
                                </div>
                                <div className="space-y-1">
                                    <Label>Origen</Label>
                                    <Input value={ncForm.source} onChange={(e) => setNcForm((p) => ({ ...p, source: e.target.value }))} />
                                </div>
                                <div className="flex items-end justify-end">
                                    <Button type="submit" disabled={creatingNc}>{creatingNc ? 'Guardando...' : 'Crear No Conformidad'}</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>No Conformidades ({nonConformities.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {loadingNc ? <div>Cargando...</div> : nonConformities.length === 0 ? <div className="text-sm text-slate-500">Sin registros.</div> : nonConformities.map((n) => (
                                <div key={n.id} className="border rounded-md p-3 flex items-start justify-between gap-4">
                                    <div>
                                        <div className="font-medium">{n.title}</div>
                                        <div className="text-sm text-slate-600">{n.description}</div>
                                        <div className="text-xs text-slate-500 mt-1">{n.source} | {n.severity}</div>
                                        <div className="flex gap-2 mt-2">
                                            <Badge variant="outline">{n.status}</Badge>
                                        </div>
                                    </div>
                                    {n.status !== NonConformityStatus.CERRADA ? (
                                        <Button size="sm" variant="outline" onClick={() => quickCloseNc(n.id)}>Cerrar</Button>
                                    ) : null}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="invima" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Crear Registro INVIMA</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleCreateInvimaRegistration}>
                                <div className="space-y-1">
                                    <Label>Código INVIMA</Label>
                                    <Input
                                        value={invimaRegistrationForm.code}
                                        onChange={(e) => setInvimaRegistrationForm((p) => ({ ...p, code: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Titular</Label>
                                    <Input
                                        value={invimaRegistrationForm.holderName}
                                        onChange={(e) => setInvimaRegistrationForm((p) => ({ ...p, holderName: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Fabricante (opcional)</Label>
                                    <Input
                                        value={invimaRegistrationForm.manufacturerName}
                                        onChange={(e) => setInvimaRegistrationForm((p) => ({ ...p, manufacturerName: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Estado</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={invimaRegistrationForm.status}
                                        onChange={(e) => setInvimaRegistrationForm((p) => ({ ...p, status: e.target.value as InvimaRegistrationStatus }))}
                                    >
                                        <option value={InvimaRegistrationStatus.ACTIVO}>activo</option>
                                        <option value={InvimaRegistrationStatus.INACTIVO}>inactivo</option>
                                        <option value={InvimaRegistrationStatus.SUSPENDIDO}>suspendido</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Válido desde (opcional)</Label>
                                    <Input
                                        type="date"
                                        value={invimaRegistrationForm.validFrom}
                                        onChange={(e) => setInvimaRegistrationForm((p) => ({ ...p, validFrom: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Válido hasta (opcional)</Label>
                                    <Input
                                        type="date"
                                        value={invimaRegistrationForm.validUntil}
                                        onChange={(e) => setInvimaRegistrationForm((p) => ({ ...p, validUntil: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Notas (opcional)</Label>
                                    <Textarea
                                        value={invimaRegistrationForm.notes}
                                        onChange={(e) => setInvimaRegistrationForm((p) => ({ ...p, notes: e.target.value }))}
                                    />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={creatingInvimaRegistration}>
                                        {creatingInvimaRegistration ? 'Guardando...' : 'Guardar registro'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Registros INVIMA ({invimaRegistrations.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {loadingInvimaRegistrations ? <div>Cargando...</div> : invimaRegistrations.length === 0 ? <div className="text-sm text-slate-500">Sin registros.</div> : invimaRegistrations.map((reg) => (
                                <div key={reg.id} className="border rounded-md p-3">
                                    <div className="font-medium">{reg.code}</div>
                                    <div className="text-xs text-slate-600 mt-1">
                                        Titular: {reg.holderName} | Fabricante: {reg.manufacturerName || 'N/A'}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Vigencia: {reg.validFrom ? new Date(reg.validFrom).toLocaleDateString() : 'N/A'} - {reg.validUntil ? new Date(reg.validUntil).toLocaleDateString() : 'N/A'}
                                    </div>
                                    <Badge variant="outline" className="mt-2">{reg.status}</Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="capa" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Crear CAPA</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleCreateCapa}>
                                <div className="space-y-1">
                                    <Label>No Conformidad</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={capaForm.nonConformityId}
                                        onChange={(e) => setCapaForm((p) => ({ ...p, nonConformityId: e.target.value }))}
                                    >
                                        <option value="">Selecciona...</option>
                                        {openNc.map((n) => (
                                            <option key={n.id} value={n.id}>{n.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Responsable</Label>
                                    <Input value={capaForm.owner} onChange={(e) => setCapaForm((p) => ({ ...p, owner: e.target.value }))} />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Plan de acción</Label>
                                    <Textarea value={capaForm.actionPlan} onChange={(e) => setCapaForm((p) => ({ ...p, actionPlan: e.target.value }))} required />
                                </div>
                                <div className="space-y-1">
                                    <Label>Fecha objetivo</Label>
                                    <Input type="date" value={capaForm.dueDate} onChange={(e) => setCapaForm((p) => ({ ...p, dueDate: e.target.value }))} />
                                </div>
                                <div className="flex items-end justify-end">
                                    <Button type="submit" disabled={creatingCapa}>{creatingCapa ? 'Guardando...' : 'Crear CAPA'}</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Acciones CAPA ({capas.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {loadingCapas ? <div>Cargando...</div> : capas.length === 0 ? <div className="text-sm text-slate-500">Sin registros.</div> : capas.map((c) => (
                                <div key={c.id} className="border rounded-md p-3 flex items-start justify-between gap-4">
                                    <div>
                                        <div className="font-medium">{c.actionPlan}</div>
                                        <div className="text-sm text-slate-600">NC: {c.nonConformityId}</div>
                                        <div className="text-xs text-slate-500 mt-1">Responsable: {c.owner || 'N/A'}</div>
                                        <Badge variant="outline" className="mt-2">{c.status}</Badge>
                                    </div>
                                    {c.status !== CapaStatus.CERRADA ? (
                                        <Button size="sm" variant="outline" onClick={() => quickCloseCapa(c.id)}>Cerrar</Button>
                                    ) : null}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="techno" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Registrar Caso de Tecnovigilancia</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleCreateTechnoCase}>
                                <div className="space-y-1">
                                    <Label>Título</Label>
                                    <Input
                                        value={technoForm.title}
                                        onChange={(e) => setTechnoForm((p) => ({ ...p, title: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Tipo</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={technoForm.type}
                                        onChange={(e) => setTechnoForm((p) => ({ ...p, type: e.target.value as TechnovigilanceCaseType }))}
                                    >
                                        <option value={TechnovigilanceCaseType.QUEJA}>Queja</option>
                                        <option value={TechnovigilanceCaseType.EVENTO_ADVERSO}>Evento adverso</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Severidad</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={technoForm.severity}
                                        onChange={(e) => setTechnoForm((p) => ({ ...p, severity: e.target.value as TechnovigilanceSeverity }))}
                                    >
                                        {Object.values(TechnovigilanceSeverity).map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Causalidad (opcional)</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={technoForm.causality}
                                        onChange={(e) => setTechnoForm((p) => ({ ...p, causality: e.target.value as '' | TechnovigilanceCausality }))}
                                    >
                                        <option value="">Sin definir</option>
                                        {Object.values(TechnovigilanceCausality).map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Descripción</Label>
                                    <Textarea
                                        value={technoForm.description}
                                        onChange={(e) => setTechnoForm((p) => ({ ...p, description: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Código de lote (opcional)</Label>
                                    <Input
                                        value={technoForm.lotCode}
                                        onChange={(e) => setTechnoForm((p) => ({ ...p, lotCode: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Serial (opcional)</Label>
                                    <Input
                                        value={technoForm.serialCode}
                                        onChange={(e) => setTechnoForm((p) => ({ ...p, serialCode: e.target.value }))}
                                    />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={creatingTechnoCase}>
                                        {creatingTechnoCase ? 'Guardando...' : 'Crear caso'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Casos ({technovigilanceCases.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {loadingTechno ? <div>Cargando...</div> : technovigilanceCases.length === 0 ? <div className="text-sm text-slate-500">Sin casos registrados.</div> : technovigilanceCases.map((c) => (
                                <div key={c.id} className="border rounded-md p-3 flex items-start justify-between gap-4">
                                    <div>
                                        <div className="font-medium">{c.title}</div>
                                        <div className="text-sm text-slate-600">{c.description}</div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            Tipo: {c.type} | Severidad: {c.severity} | Causalidad: {c.causality || 'sin definir'}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            Lote: {c.lotCode || 'N/A'} | Serial: {c.serialCode || 'N/A'} | INVIMA: {c.reportedToInvima ? 'Reportado' : 'Pendiente'}
                                        </div>
                                        {c.reportedToInvima ? (
                                            <div className="text-xs text-slate-500 mt-1">
                                                Radicado: {c.invimaReportNumber || 'N/A'} | Canal: {c.invimaReportChannel || 'N/A'}
                                            </div>
                                        ) : null}
                                        <Badge variant="outline" className="mt-2">{c.status}</Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-2 justify-end">
                                        {c.status !== TechnovigilanceStatus.EN_INVESTIGACION ? (
                                            <Button size="sm" variant="outline" onClick={() => quickSetTechnoStatus(c.id, TechnovigilanceStatus.EN_INVESTIGACION)}>
                                                Investigar
                                            </Button>
                                        ) : null}
                                        {c.status !== TechnovigilanceStatus.CERRADO ? (
                                            <Button size="sm" variant="outline" onClick={() => quickSetTechnoStatus(c.id, TechnovigilanceStatus.CERRADO)}>
                                                Cerrar
                                            </Button>
                                        ) : null}
                                        {!c.reportedToInvima ? (
                                            <Button size="sm" onClick={() => quickReportTechno(c.id)}>
                                                Reportar a INVIMA
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="recall" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Crear Recall / Simulacro</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleCreateRecall}>
                                <div className="space-y-1">
                                    <Label>Título</Label>
                                    <Input
                                        value={recallForm.title}
                                        onChange={(e) => setRecallForm((p) => ({ ...p, title: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Tipo de alcance</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={recallForm.scopeType}
                                        onChange={(e) => setRecallForm((p) => ({ ...p, scopeType: e.target.value as RecallScopeType }))}
                                    >
                                        <option value={RecallScopeType.LOTE}>Por lote</option>
                                        <option value={RecallScopeType.SERIAL}>Por serial</option>
                                    </select>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Motivo</Label>
                                    <Textarea
                                        value={recallForm.reason}
                                        onChange={(e) => setRecallForm((p) => ({ ...p, reason: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Código de lote</Label>
                                    <Input
                                        value={recallForm.lotCode}
                                        onChange={(e) => setRecallForm((p) => ({ ...p, lotCode: e.target.value }))}
                                        required={recallForm.scopeType === RecallScopeType.LOTE}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Código serial</Label>
                                    <Input
                                        value={recallForm.serialCode}
                                        onChange={(e) => setRecallForm((p) => ({ ...p, serialCode: e.target.value }))}
                                        required={recallForm.scopeType === RecallScopeType.SERIAL}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Cantidad afectada</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={recallForm.affectedQuantity}
                                        onChange={(e) => setRecallForm((p) => ({ ...p, affectedQuantity: Number(e.target.value) || 1 }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Objetivo de respuesta (min)</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={recallForm.targetResponseMinutes}
                                        onChange={(e) => setRecallForm((p) => ({ ...p, targetResponseMinutes: e.target.value }))}
                                    />
                                </div>
                                <div className="md:col-span-2 flex items-center justify-between">
                                    <label className="text-sm flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={recallForm.isMock}
                                            onChange={(e) => setRecallForm((p) => ({ ...p, isMock: e.target.checked }))}
                                        />
                                        Marcar como simulacro
                                    </label>
                                    <Button type="submit" disabled={creatingRecall}>
                                        {creatingRecall ? 'Guardando...' : 'Crear recall'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Casos de Recall ({recalls.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {loadingRecalls ? <div>Cargando...</div> : recalls.length === 0 ? <div className="text-sm text-slate-500">Sin recalls registrados.</div> : recalls.map((recall) => (
                                <div key={recall.id} className="border rounded-md p-3 space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="font-medium">{recall.code} - {recall.title}</div>
                                            <div className="text-sm text-slate-600">{recall.reason}</div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                Alcance: {recall.scopeType} | Lote: {recall.lotCode || 'N/A'} | Serial: {recall.serialCode || 'N/A'}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                Recuperado: {recall.retrievedQuantity}/{recall.affectedQuantity} ({recall.coveragePercent}%)
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                Simulacro: {recall.isMock ? 'Sí' : 'No'} | Meta(min): {recall.targetResponseMinutes || 'N/A'} | Real(min): {recall.actualResponseMinutes || 'N/A'}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                Inicio: {new Date(recall.startedAt).toLocaleString()} {recall.endedAt ? `| Cierre: ${new Date(recall.endedAt).toLocaleString()}` : ''}
                                            </div>
                                            {recall.closureEvidence ? (
                                                <div className="text-xs text-slate-500 mt-1">Evidencia: {recall.closureEvidence}</div>
                                            ) : null}
                                            <Badge variant="outline" className="mt-2">{recall.status}</Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            <Button size="sm" variant="outline" onClick={() => quickShowRecallAffectedCustomers(recall.id)}>
                                                Ver afectados
                                            </Button>
                                            {recall.status !== RecallStatus.CERRADO ? (
                                                <>
                                                    <Button size="sm" variant="outline" onClick={() => quickUpdateRecallProgress(recall.id, recall.retrievedQuantity)}>
                                                        Actualizar avance
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => quickCreateRecallNotification(recall.id)}>
                                                        Notificar cliente
                                                    </Button>
                                                    <Button size="sm" onClick={() => quickCloseRecall(recall.id)}>
                                                        Cerrar con evidencia
                                                    </Button>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="border rounded-md p-2 space-y-2">
                                        <div className="text-sm font-medium">Notificaciones ({recall.notifications?.length || 0})</div>
                                        {recall.notifications && recall.notifications.length > 0 ? recall.notifications.map((notification) => (
                                            <div key={notification.id} className="border rounded p-2 flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-sm font-medium">{notification.recipientName}</div>
                                                    <div className="text-xs text-slate-600">
                                                        {notification.channel} | {notification.recipientContact}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        Enviada: {notification.sentAt ? new Date(notification.sentAt).toLocaleString() : 'pendiente'} | Confirmada: {notification.acknowledgedAt ? new Date(notification.acknowledgedAt).toLocaleString() : 'pendiente'}
                                                    </div>
                                                    <Badge variant="outline" className="mt-2">{notification.status}</Badge>
                                                </div>
                                                <div className="flex flex-wrap gap-2 justify-end">
                                                    {notification.status === RecallNotificationStatus.PENDIENTE ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => quickUpdateRecallNotificationStatus(notification.id, RecallNotificationStatus.ENVIADA)}
                                                        >
                                                            Marcar enviada
                                                        </Button>
                                                    ) : null}
                                                    {notification.status !== RecallNotificationStatus.CONFIRMADA ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => quickUpdateRecallNotificationStatus(notification.id, RecallNotificationStatus.CONFIRMADA)}
                                                        >
                                                            Marcar confirmada
                                                        </Button>
                                                    ) : null}
                                                    {notification.status !== RecallNotificationStatus.FALLIDA ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => quickUpdateRecallNotificationStatus(notification.id, RecallNotificationStatus.FALLIDA)}
                                                        >
                                                            Marcar fallida
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="text-xs text-slate-500">Sin notificaciones registradas.</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="shipment" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Crear Cliente</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleCreateCustomer}>
                                <div className="space-y-1">
                                    <Label>Nombre</Label>
                                    <Input value={customerForm.name} onChange={(e) => setCustomerForm((p) => ({ ...p, name: e.target.value }))} required />
                                </div>
                                <div className="space-y-1">
                                    <Label>Documento</Label>
                                    <Input value={customerForm.documentNumber} onChange={(e) => setCustomerForm((p) => ({ ...p, documentNumber: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Contacto</Label>
                                    <Input value={customerForm.contactName} onChange={(e) => setCustomerForm((p) => ({ ...p, contactName: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Email</Label>
                                    <Input type="email" value={customerForm.email} onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Teléfono</Label>
                                    <Input value={customerForm.phone} onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Dirección</Label>
                                    <Input value={customerForm.address} onChange={(e) => setCustomerForm((p) => ({ ...p, address: e.target.value }))} />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Notas</Label>
                                    <Textarea value={customerForm.notes} onChange={(e) => setCustomerForm((p) => ({ ...p, notes: e.target.value }))} />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={creatingCustomer}>{creatingCustomer ? 'Guardando...' : 'Crear cliente'}</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Registrar Despacho</CardTitle></CardHeader>
                        <CardContent>
                            <form className="space-y-3" onSubmit={handleCreateShipment}>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <Label>Cliente</Label>
                                        <select
                                            className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                                            value={shipmentForm.customerId}
                                            onChange={(e) => setShipmentForm((p) => ({ ...p, customerId: e.target.value }))}
                                        >
                                            <option value="">{loadingCustomers ? 'Cargando...' : 'Selecciona cliente...'}</option>
                                            {customers.map((customer) => (
                                                <option key={customer.id} value={customer.id}>{customer.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Documento comercial</Label>
                                        <Input
                                            value={shipmentForm.commercialDocument}
                                            onChange={(e) => setShipmentForm((p) => ({ ...p, commercialDocument: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Fecha despacho</Label>
                                        <Input
                                            type="datetime-local"
                                            value={shipmentForm.shippedAt}
                                            onChange={(e) => setShipmentForm((p) => ({ ...p, shippedAt: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Ítems de despacho</Label>
                                        <Button type="button" variant="outline" size="sm" onClick={addShipmentItem}>+ Ítem</Button>
                                    </div>
                                    {shipmentForm.items.map((item, index) => (
                                        <div key={`shipment-item-${index}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 border rounded-md p-2">
                                            <Input
                                                placeholder="ID lote (UUID)"
                                                value={item.productionBatchId}
                                                onChange={(e) => updateShipmentItem(index, 'productionBatchId', e.target.value)}
                                            />
                                            <Input
                                                placeholder="ID unidad serial (opcional)"
                                                value={item.productionBatchUnitId}
                                                onChange={(e) => updateShipmentItem(index, 'productionBatchUnitId', e.target.value)}
                                            />
                                            <Input
                                                type="number"
                                                min={0.0001}
                                                step={0.0001}
                                                placeholder="Cantidad"
                                                value={item.quantity}
                                                onChange={(e) => updateShipmentItem(index, 'quantity', Number(e.target.value))}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => removeShipmentItem(index)}
                                                disabled={shipmentForm.items.length === 1}
                                            >
                                                Quitar
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={creatingShipment}>
                                        {creatingShipment ? 'Guardando...' : 'Registrar despacho'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Despachos ({shipments.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {loadingShipments ? <div>Cargando...</div> : shipments.length === 0 ? <div className="text-sm text-slate-500">Sin despachos.</div> : shipments.map((shipment) => (
                                <div key={shipment.id} className="border rounded-md p-3">
                                    <div className="font-medium">{shipment.commercialDocument} | {shipment.customer?.name || shipment.customerId}</div>
                                    <div className="text-xs text-slate-600 mt-1">
                                        Fecha: {new Date(shipment.shippedAt).toLocaleString()} | Responsable: {shipment.dispatchedBy || 'N/A'}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Ítems: {shipment.items.map((item) => (
                                            `${item.productionBatch?.code || shortId(item.productionBatchId)}${item.productionBatchUnit?.serialCode ? `/${item.productionBatchUnit.serialCode}` : ''} x ${item.quantity}`
                                        )).join(' | ')}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="labeling" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Registrar Etiqueta Regulatoria</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleUpsertRegulatoryLabel}>
                                <div className="space-y-1">
                                    <Label>ID Lote</Label>
                                    <Input
                                        value={regulatoryLabelForm.productionBatchId}
                                        onChange={(e) => setRegulatoryLabelForm((p) => ({ ...p, productionBatchId: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>ID Unidad Serial (opcional)</Label>
                                    <Input
                                        value={regulatoryLabelForm.productionBatchUnitId}
                                        onChange={(e) => setRegulatoryLabelForm((p) => ({ ...p, productionBatchUnitId: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Alcance</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={regulatoryLabelForm.scopeType}
                                        onChange={(e) => setRegulatoryLabelForm((p) => ({ ...p, scopeType: e.target.value as RegulatoryLabelScopeType }))}
                                    >
                                        <option value={RegulatoryLabelScopeType.LOTE}>Lote</option>
                                        <option value={RegulatoryLabelScopeType.SERIAL}>Serial</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Tipo de dispositivo</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={regulatoryLabelForm.deviceType}
                                        onChange={(e) => setRegulatoryLabelForm((p) => ({ ...p, deviceType: e.target.value as RegulatoryDeviceType }))}
                                    >
                                        {Object.values(RegulatoryDeviceType).map((v) => (
                                            <option key={v} value={v}>{v}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Estándar de codificación</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={regulatoryLabelForm.codingStandard}
                                        onChange={(e) => setRegulatoryLabelForm((p) => ({ ...p, codingStandard: e.target.value as RegulatoryCodingStandard }))}
                                    >
                                        {Object.values(RegulatoryCodingStandard).map((v) => (
                                            <option key={v} value={v}>{v}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Producto</Label>
                                    <Input
                                        value={regulatoryLabelForm.productName}
                                        onChange={(e) => setRegulatoryLabelForm((p) => ({ ...p, productName: e.target.value }))}
                                        placeholder="Si lo dejas vacío se toma del lote"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Fabricante</Label>
                                    <Input
                                        value={regulatoryLabelForm.manufacturerName}
                                        onChange={(e) => setRegulatoryLabelForm((p) => ({ ...p, manufacturerName: e.target.value }))}
                                        placeholder="Opcional, autocompleta desde registro INVIMA"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Registro INVIMA</Label>
                                    <Input
                                        value={regulatoryLabelForm.invimaRegistration}
                                        onChange={(e) => setRegulatoryLabelForm((p) => ({ ...p, invimaRegistration: e.target.value }))}
                                        placeholder="Opcional si el producto tiene INVIMA asociado"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Lote</Label>
                                    <Input
                                        value={regulatoryLabelForm.lotCode}
                                        onChange={(e) => setRegulatoryLabelForm((p) => ({ ...p, lotCode: e.target.value }))}
                                        placeholder="Opcional, por defecto usa código del lote"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Serial</Label>
                                    <Input
                                        value={regulatoryLabelForm.serialCode}
                                        onChange={(e) => setRegulatoryLabelForm((p) => ({ ...p, serialCode: e.target.value }))}
                                        required={regulatoryLabelForm.scopeType === RegulatoryLabelScopeType.SERIAL}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Fecha de fabricación</Label>
                                    <Input
                                        type="date"
                                        value={regulatoryLabelForm.manufactureDate}
                                        onChange={(e) => setRegulatoryLabelForm((p) => ({ ...p, manufactureDate: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Fecha de vencimiento</Label>
                                    <Input
                                        type="date"
                                        value={regulatoryLabelForm.expirationDate}
                                        onChange={(e) => setRegulatoryLabelForm((p) => ({ ...p, expirationDate: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>GTIN</Label>
                                    <Input
                                        value={regulatoryLabelForm.gtin}
                                        onChange={(e) => setRegulatoryLabelForm((p) => ({ ...p, gtin: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>UDI-DI</Label>
                                    <Input
                                        value={regulatoryLabelForm.udiDi}
                                        onChange={(e) => setRegulatoryLabelForm((p) => ({ ...p, udiDi: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>UDI-PI</Label>
                                    <Input
                                        value={regulatoryLabelForm.udiPi}
                                        onChange={(e) => setRegulatoryLabelForm((p) => ({ ...p, udiPi: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Código interno</Label>
                                    <Input
                                        value={regulatoryLabelForm.internalCode}
                                        onChange={(e) => setRegulatoryLabelForm((p) => ({ ...p, internalCode: e.target.value }))}
                                    />
                                </div>
                                <div className="md:col-span-2 flex justify-end gap-2">
                                    <Button type="button" variant="outline" disabled={validatingDispatch} onClick={quickValidateDispatch}>
                                        {validatingDispatch ? 'Validando...' : 'Validar despacho'}
                                    </Button>
                                    <Button type="submit" disabled={savingRegulatoryLabel}>
                                        {savingRegulatoryLabel ? 'Guardando...' : 'Guardar etiqueta'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Etiquetas regulatorias ({regulatoryLabels.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {loadingRegulatoryLabels ? <div>Cargando...</div> : regulatoryLabels.length === 0 ? <div className="text-sm text-slate-500">Sin etiquetas.</div> : regulatoryLabels.map((label) => (
                                <div key={label.id} className="border rounded-md p-3">
                                    <div className="font-medium">{label.productName} | {label.scopeType}</div>
                                    <div className="text-xs text-slate-600 mt-1">
                                        Lote: {label.lotCode} | Serial: {label.serialCode || 'N/A'} | Tipo: {label.deviceType}
                                    </div>
                                    <div className="text-xs text-slate-600 mt-1">
                                        Estándar: {label.codingStandard} | Código: {label.codingValue || 'N/A'}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Registro INVIMA: {label.invimaRegistration} | Fabricación: {new Date(label.manufactureDate).toLocaleDateString()}
                                    </div>
                                    {label.validationErrors && label.validationErrors.length > 0 ? (
                                        <div className="text-xs text-red-600 mt-1">
                                            Errores: {label.validationErrors.join(' | ')}
                                        </div>
                                    ) : null}
                                    <Badge
                                        variant="outline"
                                        className="mt-2"
                                    >
                                        {label.status === RegulatoryLabelStatus.VALIDADA ? 'validada' : label.status}
                                    </Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="compliance" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Tablero de Cumplimiento</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {loadingComplianceDashboard ? <div>Cargando...</div> : !complianceDashboard ? <div className="text-sm text-slate-500">Sin datos.</div> : (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div className="border rounded-md p-3">
                                        <div className="text-xs text-slate-500">NC abiertas</div>
                                        <div className="text-2xl font-semibold">{complianceDashboard.nonConformitiesOpen}</div>
                                    </div>
                                    <div className="border rounded-md p-3">
                                        <div className="text-xs text-slate-500">CAPA abiertas</div>
                                        <div className="text-2xl font-semibold">{complianceDashboard.capasOpen}</div>
                                    </div>
                                    <div className="border rounded-md p-3">
                                        <div className="text-xs text-slate-500">Tecnovigilancia abierta</div>
                                        <div className="text-2xl font-semibold">{complianceDashboard.technovigilanceOpen}</div>
                                    </div>
                                    <div className="border rounded-md p-3">
                                        <div className="text-xs text-slate-500">Recalls abiertos</div>
                                        <div className="text-2xl font-semibold">{complianceDashboard.recallsOpen}</div>
                                    </div>
                                    <div className="border rounded-md p-3">
                                        <div className="text-xs text-slate-500">Cobertura recall promedio</div>
                                        <div className="text-2xl font-semibold">{complianceDashboard.recallCoverageAverage}%</div>
                                    </div>
                                    <div className="border rounded-md p-3">
                                        <div className="text-xs text-slate-500">Eventos auditoría (30 días)</div>
                                        <div className="text-2xl font-semibold">{complianceDashboard.auditEventsLast30Days}</div>
                                    </div>
                                    <div className="border rounded-md p-3">
                                        <div className="text-xs text-slate-500">% Documentos aprobados</div>
                                        <div className="text-2xl font-semibold">{complianceDashboard.documentApprovalRate}%</div>
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" disabled={exportingCompliance} onClick={() => handleExportCompliance('csv')}>
                                    {exportingCompliance ? 'Generando...' : 'Exportar CSV'}
                                </Button>
                                <Button variant="outline" disabled={exportingCompliance} onClick={() => handleExportCompliance('json')}>
                                    {exportingCompliance ? 'Generando...' : 'Exportar JSON'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Matriz de Riesgos y Controles</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleCreateRiskControl}>
                                <div className="space-y-1">
                                    <Label>Proceso</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={riskControlForm.process}
                                        onChange={(e) => setRiskControlForm((p) => ({ ...p, process: e.target.value as DocumentProcess }))}
                                    >
                                        <option value={DocumentProcess.PRODUCCION}>Producción</option>
                                        <option value={DocumentProcess.CONTROL_CALIDAD}>Control de calidad</option>
                                        <option value={DocumentProcess.EMPAQUE}>Empaque</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Rol responsable</Label>
                                    <Input value={riskControlForm.ownerRole} onChange={(e) => setRiskControlForm((p) => ({ ...p, ownerRole: e.target.value }))} required />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Riesgo</Label>
                                    <Textarea value={riskControlForm.risk} onChange={(e) => setRiskControlForm((p) => ({ ...p, risk: e.target.value }))} required />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Control</Label>
                                    <Textarea value={riskControlForm.control} onChange={(e) => setRiskControlForm((p) => ({ ...p, control: e.target.value }))} required />
                                </div>
                                <div className="space-y-1">
                                    <Label>Estado</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={riskControlForm.status}
                                        onChange={(e) => setRiskControlForm((p) => ({ ...p, status: e.target.value as QualityRiskControlStatus }))}
                                    >
                                        {Object.values(QualityRiskControlStatus).map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Evidencia (opcional)</Label>
                                    <Input value={riskControlForm.evidenceRef} onChange={(e) => setRiskControlForm((p) => ({ ...p, evidenceRef: e.target.value }))} />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={creatingRiskControl}>
                                        {creatingRiskControl ? 'Guardando...' : 'Agregar riesgo/control'}
                                    </Button>
                                </div>
                            </form>

                            <div className="space-y-2">
                                {loadingRiskControls ? <div>Cargando...</div> : riskControls.length === 0 ? <div className="text-sm text-slate-500">Sin riesgos/controles.</div> : riskControls.map((r) => (
                                    <div key={r.id} className="border rounded-md p-3">
                                        <div className="font-medium">{r.process} | {r.ownerRole}</div>
                                        <div className="text-xs text-slate-600 mt-1">Riesgo: {r.risk}</div>
                                        <div className="text-xs text-slate-600 mt-1">Control: {r.control}</div>
                                        <Badge variant="outline" className="mt-2">{r.status}</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Evidencia de Capacitación por Rol</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleCreateTrainingEvidence}>
                                <div className="space-y-1">
                                    <Label>Rol</Label>
                                    <Input value={trainingForm.role} onChange={(e) => setTrainingForm((p) => ({ ...p, role: e.target.value }))} required />
                                </div>
                                <div className="space-y-1">
                                    <Label>Nombre del colaborador</Label>
                                    <Input value={trainingForm.personName} onChange={(e) => setTrainingForm((p) => ({ ...p, personName: e.target.value }))} required />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Tema de capacitación</Label>
                                    <Input value={trainingForm.trainingTopic} onChange={(e) => setTrainingForm((p) => ({ ...p, trainingTopic: e.target.value }))} required />
                                </div>
                                <div className="space-y-1">
                                    <Label>Fecha completada</Label>
                                    <Input type="date" value={trainingForm.completedAt} onChange={(e) => setTrainingForm((p) => ({ ...p, completedAt: e.target.value }))} required />
                                </div>
                                <div className="space-y-1">
                                    <Label>Válido hasta (opcional)</Label>
                                    <Input type="date" value={trainingForm.validUntil} onChange={(e) => setTrainingForm((p) => ({ ...p, validUntil: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Instructor (opcional)</Label>
                                    <Input value={trainingForm.trainerName} onChange={(e) => setTrainingForm((p) => ({ ...p, trainerName: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Evidencia (opcional)</Label>
                                    <Input value={trainingForm.evidenceRef} onChange={(e) => setTrainingForm((p) => ({ ...p, evidenceRef: e.target.value }))} />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={creatingTrainingEvidence}>
                                        {creatingTrainingEvidence ? 'Guardando...' : 'Registrar capacitación'}
                                    </Button>
                                </div>
                            </form>

                            <div className="space-y-2">
                                {loadingTrainingEvidence ? <div>Cargando...</div> : trainingEvidence.length === 0 ? <div className="text-sm text-slate-500">Sin evidencias de capacitación.</div> : trainingEvidence.map((t) => (
                                    <div key={t.id} className="border rounded-md p-3">
                                        <div className="font-medium">{t.role} | {t.personName}</div>
                                        <div className="text-xs text-slate-600 mt-1">Tema: {t.trainingTopic}</div>
                                        <div className="text-xs text-slate-600 mt-1">
                                            Completada: {new Date(t.completedAt).toLocaleDateString()} | Vence: {t.validUntil ? new Date(t.validUntil).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="incoming" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Inspecciones de Recepción</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {loadingIncomingInspections ? <div>Cargando...</div> : incomingInspections.length === 0 ? <div className="text-sm text-slate-500">Sin inspecciones.</div> : incomingInspections.map((inspection) => (
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
                                                onClick={() => quickResolveIncomingInspection(inspection.id, Number(inspection.quantityReceived))}
                                            >
                                                Resolver QA
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="batch-release" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Checklist de Liberación QA</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleUpsertBatchReleaseChecklist}>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>ID Lote de producción</Label>
                                    <Input
                                        value={batchReleaseForm.productionBatchId}
                                        onChange={(e) => setBatchReleaseForm((p) => ({ ...p, productionBatchId: e.target.value }))}
                                        placeholder="UUID del lote"
                                        required
                                    />
                                </div>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={batchReleaseForm.qcApproved}
                                        onChange={(e) => setBatchReleaseForm((p) => ({ ...p, qcApproved: e.target.checked }))}
                                    />
                                    QC aprobado
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={batchReleaseForm.labelingValidated}
                                        onChange={(e) => setBatchReleaseForm((p) => ({ ...p, labelingValidated: e.target.checked }))}
                                    />
                                    Etiquetado validado
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={batchReleaseForm.documentsCurrent}
                                        onChange={(e) => setBatchReleaseForm((p) => ({ ...p, documentsCurrent: e.target.checked }))}
                                    />
                                    Documentación vigente
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={batchReleaseForm.evidencesComplete}
                                        onChange={(e) => setBatchReleaseForm((p) => ({ ...p, evidencesComplete: e.target.checked }))}
                                    />
                                    Evidencias completas
                                </label>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Notas de checklist (opcional)</Label>
                                    <Textarea
                                        value={batchReleaseForm.checklistNotes}
                                        onChange={(e) => setBatchReleaseForm((p) => ({ ...p, checklistNotes: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Motivo de rechazo (opcional)</Label>
                                    <Textarea
                                        value={batchReleaseForm.rejectedReason}
                                        onChange={(e) => setBatchReleaseForm((p) => ({ ...p, rejectedReason: e.target.value }))}
                                        placeholder="Si se llena, el lote queda rechazado"
                                    />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={savingBatchReleaseChecklist}>
                                        {savingBatchReleaseChecklist ? 'Guardando...' : 'Guardar checklist'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Liberaciones QA ({batchReleases.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {loadingBatchReleases ? <div>Cargando...</div> : batchReleases.length === 0 ? <div className="text-sm text-slate-500">Sin liberaciones.</div> : batchReleases.map((release) => (
                                <div key={release.id} className="border rounded-md p-3 flex items-start justify-between gap-4">
                                    <div>
                                        <div className="font-medium">
                                            Lote: {release.productionBatch?.code || shortId(release.productionBatchId)}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            ID: <span title={release.productionBatchId}>{release.productionBatchId}</span>
                                        </div>
                                        <div className="text-xs text-slate-600 mt-1">
                                            QC: {release.qcApproved ? 'ok' : 'pendiente'} | Etiquetado: {release.labelingValidated ? 'ok' : 'pendiente'} | Docs: {release.documentsCurrent ? 'ok' : 'pendiente'} | Evidencias: {release.evidencesComplete ? 'ok' : 'pendiente'}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            Revisó: {release.reviewedBy || 'N/A'} | Firma: {release.signedBy || 'N/A'}
                                        </div>
                                        {release.rejectedReason ? (
                                            <div className="text-xs text-red-600 mt-1">Motivo rechazo: {release.rejectedReason}</div>
                                        ) : null}
                                        <Badge variant="outline" className="mt-2">
                                            {release.status === BatchReleaseStatus.PENDIENTE_LIBERACION
                                                ? 'pendiente_liberacion'
                                                : release.status === BatchReleaseStatus.LIBERADO_QA
                                                    ? 'liberado_qa'
                                                    : 'rechazado'}
                                        </Badge>
                                    </div>
                                    <div className="flex gap-2">
                                        {release.status === BatchReleaseStatus.PENDIENTE_LIBERACION ? (
                                            <Button
                                                size="sm"
                                                disabled={signingBatchRelease}
                                                onClick={() => quickSignBatchRelease(release.productionBatchId)}
                                            >
                                                {signingBatchRelease ? 'Firmando...' : 'Firmar liberación'}
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="docs" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Registrar Documento Controlado</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleCreateDocument}>
                                <div className="space-y-1">
                                    <Label>Código</Label>
                                    <Input
                                        value={documentForm.code}
                                        onChange={(e) => setDocumentForm((p) => ({ ...p, code: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Título</Label>
                                    <Input
                                        value={documentForm.title}
                                        onChange={(e) => setDocumentForm((p) => ({ ...p, title: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Proceso</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={documentForm.process}
                                        onChange={(e) => setDocumentForm((p) => ({ ...p, process: e.target.value as DocumentProcess }))}
                                    >
                                        <option value={DocumentProcess.PRODUCCION}>Producción</option>
                                        <option value={DocumentProcess.CONTROL_CALIDAD}>Control de calidad</option>
                                        <option value={DocumentProcess.EMPAQUE}>Empaque</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Versión</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={documentForm.version}
                                        onChange={(e) => setDocumentForm((p) => ({ ...p, version: Number(e.target.value) || 1 }))}
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Contenido / alcance</Label>
                                    <Textarea
                                        value={documentForm.content}
                                        onChange={(e) => setDocumentForm((p) => ({ ...p, content: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Vigencia desde</Label>
                                    <Input
                                        type="date"
                                        value={documentForm.effectiveDate}
                                        onChange={(e) => setDocumentForm((p) => ({ ...p, effectiveDate: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Vigencia hasta</Label>
                                    <Input
                                        type="date"
                                        value={documentForm.expiresAt}
                                        onChange={(e) => setDocumentForm((p) => ({ ...p, expiresAt: e.target.value }))}
                                    />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={creatingDocument}>
                                        {creatingDocument ? 'Guardando...' : 'Crear documento'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Documentos ({documents.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {loadingDocuments ? <div>Cargando...</div> : documents.length === 0 ? <div className="text-sm text-slate-500">Sin documentos.</div> : documents.map((doc) => (
                                <div key={doc.id} className="border rounded-md p-3 flex items-start justify-between gap-4">
                                    <div>
                                        <div className="font-medium">{doc.code} v{doc.version} - {doc.title}</div>
                                        <div className="text-xs text-slate-600 mt-1">
                                            Proceso: {qualityProcessLabels[doc.process]} | Estado: {qualityDocumentStatusLabels[doc.status]}
                                        </div>
                                        {doc.approvedAt ? (
                                            <div className="text-[11px] text-slate-500 mt-1">
                                                Aprobado: {new Date(doc.approvedAt).toLocaleString()}
                                            </div>
                                        ) : null}
                                        <Badge variant="outline" className="mt-2">{qualityDocumentStatusLabels[doc.status]}</Badge>
                                    </div>
                                    <div className="flex gap-2">
                                        {doc.status === DocumentStatus.BORRADOR ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={submittingDocument}
                                                onClick={() => handleSubmitDocument(doc.id)}
                                            >
                                                Enviar revisión
                                            </Button>
                                        ) : null}
                                        {(doc.status === DocumentStatus.BORRADOR || doc.status === DocumentStatus.EN_REVISION) ? (
                                            <Button
                                                size="sm"
                                                disabled={approvingDocument}
                                                onClick={() => handleApproveDocument(doc.id)}
                                            >
                                                Aprobar
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="audit">
                    <Card>
                        <CardHeader><CardTitle>Eventos de Auditoría</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {loadingAudit ? <div>Cargando...</div> : audits.length === 0 ? <div className="text-sm text-slate-500">Sin eventos.</div> : audits.map((a) => (
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
            </Tabs>
        </div>
    );
}
