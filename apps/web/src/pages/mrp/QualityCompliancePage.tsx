import {
    CapaStatus,
    DocumentProcess,
    DocumentStatus,
    NonConformityStatus,
    QualitySeverity,
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

export default function QualityCompliancePage() {
    const {
        nonConformities,
        capas,
        audits,
        technovigilanceCases,
        documents,
        openNc,
        ncForm,
        capaForm,
        documentForm,
        technoForm,
        setNcForm,
        setCapaForm,
        setDocumentForm,
        setTechnoForm,
        loadingNc,
        loadingCapas,
        loadingAudit,
        loadingTechno,
        loadingDocuments,
        creatingNc,
        creatingCapa,
        creatingDocument,
        creatingTechnoCase,
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
    } = useQualityCompliance();

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
                                    <div className="text-sm font-medium">{a.entityType} / {a.entityId}</div>
                                    <div className="text-xs text-slate-600">{a.action} {a.actor ? `por ${a.actor}` : ''}</div>
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
