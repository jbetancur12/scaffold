import { DocumentProcess } from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { qualityProcessLabels } from '@/constants/mrpQuality';
import type { QualityComplianceModel } from '../types';

export function QualityDhrDmrTab({ model }: { model: QualityComplianceModel }) {
  return (
                <TabsContent value="dhr-dmr" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Plantilla DMR por producto/proceso</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={model.handleCreateDmrTemplate}>
                                <div className="space-y-1">
                                    <Label>ID Producto (opcional)</Label>
                                    <Input
                                        value={model.dmrTemplateForm.productId}
                                        onChange={(e) => model.setDmrTemplateForm((p) => ({ ...p, productId: e.target.value }))}
                                        placeholder="UUID del producto"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Proceso</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                                        value={model.dmrTemplateForm.process}
                                        onChange={(e) => model.setDmrTemplateForm((p) => ({ ...p, process: e.target.value as DocumentProcess }))}
                                    >
                                        <option value={DocumentProcess.PRODUCCION}>Producción</option>
                                        <option value={DocumentProcess.CONTROL_CALIDAD}>Control de calidad</option>
                                        <option value={DocumentProcess.EMPAQUE}>Empaque</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Código</Label>
                                    <Input
                                        value={model.dmrTemplateForm.code}
                                        onChange={(e) => model.setDmrTemplateForm((p) => ({ ...p, code: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Título</Label>
                                    <Input
                                        value={model.dmrTemplateForm.title}
                                        onChange={(e) => model.setDmrTemplateForm((p) => ({ ...p, title: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Versión</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={model.dmrTemplateForm.version}
                                        onChange={(e) => model.setDmrTemplateForm((p) => ({ ...p, version: Number(e.target.value) || 1 }))}
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Secciones (una por línea)</Label>
                                    <Textarea
                                        value={model.dmrTemplateForm.sections}
                                        onChange={(e) => model.setDmrTemplateForm((p) => ({ ...p, sections: e.target.value }))}
                                        placeholder={'Materia prima\nHitos de producción/QC\nEtiquetado\nLiberación QA\nDespacho\nIncidencias'}
                                        required
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Evidencias requeridas (una por línea)</Label>
                                    <Textarea
                                        value={model.dmrTemplateForm.requiredEvidence}
                                        onChange={(e) => model.setDmrTemplateForm((p) => ({ ...p, requiredEvidence: e.target.value }))}
                                        placeholder={'Acta QC\nFirma QA\nEvidencia de empaque'}
                                    />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={model.creatingDmrTemplate}>
                                        {model.creatingDmrTemplate ? 'Guardando...' : 'Guardar plantilla DMR'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Plantillas DMR ({model.dmrTemplates.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {model.loadingDmrTemplates ? <div>Cargando...</div> : model.dmrTemplates.length === 0 ? <div className="text-sm text-slate-500">Sin plantillas DMR.</div> : model.dmrTemplates.map((template) => (
                                <div key={template.id} className="border rounded-md p-3">
                                    <div className="font-medium">{template.code} v{template.version} - {template.title}</div>
                                    <div className="text-xs text-slate-600 mt-1">
                                        Proceso: {qualityProcessLabels[template.process]} | Producto: {template.product?.name || 'Genérico'}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Secciones: {template.sections.join(' | ')}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Evidencias: {template.requiredEvidence.length > 0 ? template.requiredEvidence.join(' | ') : 'Sin lista obligatoria'}
                                    </div>
                                    <Badge variant="outline" className="mt-2">{template.isActive ? 'activa' : 'inactiva'}</Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Expediente DHR por lote</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1 md:col-span-2">
                                    <Label>ID Lote</Label>
                                    <Input
                                        value={model.dhrBatchId}
                                        onChange={(e) => model.setDhrBatchId(e.target.value)}
                                        placeholder="UUID del lote de producción"
                                    />
                                </div>
                                <div className="flex items-end justify-end gap-2">
                                    <Button variant="outline" disabled={model.exportingBatchDhr} onClick={() => model.handleExportBatchDhr('json')}>
                                        {model.exportingBatchDhr ? 'Generando...' : 'Exportar JSON'}
                                    </Button>
                                    <Button variant="outline" disabled={model.exportingBatchDhr} onClick={() => model.handleExportBatchDhr('csv')}>
                                        {model.exportingBatchDhr ? 'Generando...' : 'Exportar CSV'}
                                    </Button>
                                </div>
                            </div>

                            {!model.dhrBatchId ? (
                                <div className="text-sm text-slate-500">Ingresa un ID de lote para cargar el expediente DHR.</div>
                            ) : model.loadingBatchDhr ? (
                                <div>Cargando expediente...</div>
                            ) : !model.batchDhrData ? (
                                <div className="text-sm text-slate-500">Sin expediente.</div>
                            ) : (
                                <div className="space-y-2 border rounded-md p-3">
                                    <div className="font-medium">
                                        Lote: {model.batchDhrData.productionBatch.code} | Producto: {model.batchDhrData.productionBatch.variant?.product?.name || 'N/A'}
                                    </div>
                                    <div className="text-xs text-slate-600">
                                        Orden: {model.batchDhrData.productionBatch.productionOrder?.code || 'N/A'} | Producido: {model.batchDhrData.productionBatch.producedQty} / Planeado: {model.batchDhrData.productionBatch.plannedQty}
                                    </div>
                                    <div className="text-xs text-slate-600">
                                        QC: {model.batchDhrData.productionAndQuality.qcPassedUnits} aprobadas, {model.batchDhrData.productionAndQuality.qcFailedUnits} no aprobadas, {model.batchDhrData.productionAndQuality.rejectedUnits} rechazadas
                                    </div>
                                    <div className="text-xs text-slate-600">
                                        Empaque: {model.batchDhrData.productionAndQuality.packagedUnits} empaquetadas | Etiquetas: {model.batchDhrData.regulatoryLabels.length} | Despachos: {model.batchDhrData.shipments.length}
                                    </div>
                                    <div className="text-xs text-slate-600">
                                        Incidencias: NC {model.batchDhrData.incidents.nonConformities.length} | CAPA {model.batchDhrData.incidents.capas.length} | Tecnovigilancia {model.batchDhrData.incidents.technovigilanceCases.length} | Recall {model.batchDhrData.incidents.recalls.length}
                                    </div>
                                    <div className="text-xs text-slate-600">
                                        Plantilla DMR: {model.batchDhrData.dmrTemplate ? `${model.batchDhrData.dmrTemplate.code} v${model.batchDhrData.dmrTemplate.version}` : 'No definida'}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

  );
}
