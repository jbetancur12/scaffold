import { DocumentProcess, DocumentStatus } from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { qualityDocumentStatusLabels, qualityProcessLabels } from '@/constants/mrpQuality';
import type { QualityComplianceModel } from '../types';

export function QualityDocsTab({ model }: { model: QualityComplianceModel }) {
  return (
                <TabsContent value="docs" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Registrar Documento Controlado</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={model.handleCreateDocument}>
                                <div className="space-y-1">
                                    <Label>Código</Label>
                                    <Input
                                        value={model.documentForm.code}
                                        onChange={(e) => model.setDocumentForm((p) => ({ ...p, code: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Título</Label>
                                    <Input
                                        value={model.documentForm.title}
                                        onChange={(e) => model.setDocumentForm((p) => ({ ...p, title: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Proceso</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={model.documentForm.process}
                                        onChange={(e) => model.setDocumentForm((p) => ({ ...p, process: e.target.value as DocumentProcess }))}
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
                                        value={model.documentForm.version}
                                        onChange={(e) => model.setDocumentForm((p) => ({ ...p, version: Number(e.target.value) || 1 }))}
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Contenido / alcance</Label>
                                    <Textarea
                                        value={model.documentForm.content}
                                        onChange={(e) => model.setDocumentForm((p) => ({ ...p, content: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Vigencia desde</Label>
                                    <Input
                                        type="date"
                                        value={model.documentForm.effectiveDate}
                                        onChange={(e) => model.setDocumentForm((p) => ({ ...p, effectiveDate: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Vigencia hasta</Label>
                                    <Input
                                        type="date"
                                        value={model.documentForm.expiresAt}
                                        onChange={(e) => model.setDocumentForm((p) => ({ ...p, expiresAt: e.target.value }))}
                                    />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={model.creatingDocument}>
                                        {model.creatingDocument ? 'Guardando...' : 'Crear documento'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Documentos ({model.documents.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {model.loadingDocuments ? <div>Cargando...</div> : model.documents.length === 0 ? <div className="text-sm text-slate-500">Sin documentos.</div> : model.documents.map((doc) => (
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
                                                disabled={model.submittingDocument}
                                                onClick={() => model.handleSubmitDocument(doc.id)}
                                            >
                                                Enviar revisión
                                            </Button>
                                        ) : null}
                                        {(doc.status === DocumentStatus.BORRADOR || doc.status === DocumentStatus.EN_REVISION) ? (
                                            <Button
                                                size="sm"
                                                disabled={model.approvingDocument}
                                                onClick={() => model.handleApproveDocument(doc.id)}
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

  );
}
