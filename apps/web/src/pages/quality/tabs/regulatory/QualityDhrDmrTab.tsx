import { useState } from 'react';
import { DocumentProcess } from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { qualityProcessLabels } from '@/constants/mrpQuality';
import { FileText, Plus, X, Save, Download, BookOpen } from 'lucide-react';
import type { QualityComplianceModel } from '../types';

export function QualityDhrDmrTab({ model }: { model: QualityComplianceModel }) {
    const [showDmrForm, setShowDmrForm] = useState(false);

    const handleSubmitDmr = async (e: React.FormEvent) => {
        await model.handleCreateDmrTemplate(e);
        setShowDmrForm(false);
    };

    const activeDmr = model.dmrTemplates.filter((t) => t.isActive).length;

    const selectClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';
    const inputClass = 'h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500';

    return (
        <TabsContent value="dhr-dmr" className="space-y-5">

            {/* Hero */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-50/40 to-transparent pointer-events-none" />
                    <div className="relative flex items-start gap-4">
                        <div className="p-2.5 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
                            <FileText className="h-6 w-6 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">DHR / DMR</h2>
                            <p className="text-slate-500 text-sm mt-0.5">Plantillas de historial de dispositivo (DMR) y expedientes de lote (DHR).</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
                    {[
                        { label: 'Plantillas', value: model.dmrTemplates.length, color: 'text-slate-700', bg: '' },
                        { label: 'Activas', value: activeDmr, color: 'text-emerald-700', bg: 'bg-emerald-50/60' },
                        { label: 'Inactivas', value: model.dmrTemplates.length - activeDmr, color: 'text-slate-400', bg: '' },
                    ].map(({ label, value, color, bg }) => (
                        <div key={label} className={`flex flex-col items-center py-3 px-4 ${bg}`}>
                            <span className={`text-2xl font-bold ${color}`}>{value}</span>
                            <span className="text-xs text-slate-500 font-medium mt-0.5">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* DMR Templates list + inline form */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-violet-500" />
                    <h3 className="font-semibold text-slate-800">Plantillas DMR</h3>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
                        {model.dmrTemplates.length}
                    </span>
                    <div className="ml-auto">
                        <Button type="button" size="sm"
                            onClick={() => setShowDmrForm((v) => !v)}
                            className={showDmrForm
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl h-8 text-xs border border-slate-200'
                                : 'bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-8 text-xs font-medium'}>
                            {showDmrForm
                                ? <><X className="mr-1.5 h-3.5 w-3.5" />Cancelar</>
                                : <><Plus className="mr-1.5 h-3.5 w-3.5" />Nueva plantilla</>}
                        </Button>
                    </div>
                </div>

                {/* Inline DMR form */}
                {showDmrForm && (
                    <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-5">
                        <p className="text-sm font-bold text-slate-700 mb-4">Nueva plantilla DMR</p>
                        <form className="space-y-4" onSubmit={handleSubmitDmr}>
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Código</Label>
                                    <Input value={model.dmrTemplateForm.code}
                                        onChange={(e) => model.setDmrTemplateForm((p) => ({ ...p, code: e.target.value }))}
                                        required className={`${inputClass} font-mono`} placeholder="DMR-001" />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Título</Label>
                                    <Input value={model.dmrTemplateForm.title}
                                        onChange={(e) => model.setDmrTemplateForm((p) => ({ ...p, title: e.target.value }))}
                                        required className={inputClass} placeholder="Título de la plantilla" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Proceso</Label>
                                    <select className={selectClass} value={model.dmrTemplateForm.process}
                                        onChange={(e) => model.setDmrTemplateForm((p) => ({ ...p, process: e.target.value as DocumentProcess }))}>
                                        <option value={DocumentProcess.PRODUCCION}>Producción</option>
                                        <option value={DocumentProcess.CONTROL_CALIDAD}>Control de calidad</option>
                                        <option value={DocumentProcess.EMPAQUE}>Empaque</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Versión</Label>
                                    <Input type="number" min={1} value={model.dmrTemplateForm.version}
                                        onChange={(e) => model.setDmrTemplateForm((p) => ({ ...p, version: Number(e.target.value) || 1 }))}
                                        className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">ID Producto <span className="normal-case text-slate-400">(opcional)</span></Label>
                                    <Input value={model.dmrTemplateForm.productId}
                                        onChange={(e) => model.setDmrTemplateForm((p) => ({ ...p, productId: e.target.value }))}
                                        className={`${inputClass} font-mono`} placeholder="UUID del producto" />
                                </div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Secciones <span className="normal-case text-slate-400">(una por línea)</span></Label>
                                    <Textarea value={model.dmrTemplateForm.sections}
                                        onChange={(e) => model.setDmrTemplateForm((p) => ({ ...p, sections: e.target.value }))}
                                        placeholder={'Materia prima\nHitos de producción/QC\nEtiquetado\nLiberación QA\nDespacho\nIncidencias'}
                                        required className="rounded-xl border-slate-200 focus-visible:ring-violet-500 min-h-[100px] resize-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Evidencias requeridas <span className="normal-case text-slate-400">(una por línea)</span></Label>
                                    <Textarea value={model.dmrTemplateForm.requiredEvidence}
                                        onChange={(e) => model.setDmrTemplateForm((p) => ({ ...p, requiredEvidence: e.target.value }))}
                                        placeholder={'Acta QC\nFirma QA\nEvidencia de empaque'}
                                        className="rounded-xl border-slate-200 focus-visible:ring-violet-500 min-h-[100px] resize-none" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowDmrForm(false)} className="rounded-xl border-slate-200 text-slate-600">
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={model.creatingDmrTemplate}
                                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium px-6">
                                    {model.creatingDmrTemplate ? (
                                        <><div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />Guardando...</>
                                    ) : (
                                        <><Save className="mr-2 h-4 w-4" />Guardar plantilla</>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* DMR template list */}
                <div className="p-4 space-y-3">
                    {model.loadingDmrTemplates ? (
                        <div className="flex items-center justify-center py-10 text-slate-400">
                            <div className="animate-spin mr-3 h-6 w-6 border-4 border-slate-200 border-t-violet-600 rounded-full" />
                            <span className="text-sm animate-pulse">Cargando plantillas...</span>
                        </div>
                    ) : model.dmrTemplates.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">Sin plantillas DMR.</p>
                            <p className="text-xs mt-1">Usa el botón "Nueva plantilla" para comenzar.</p>
                        </div>
                    ) : (
                        model.dmrTemplates.map((template) => (
                            <div key={template.id}
                                className={`border rounded-2xl p-4 transition-all ${template.isActive ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white'}`}>
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-slate-900 font-mono text-sm">{template.code}</span>
                                            <span className="text-xs text-slate-400">v{template.version}</span>
                                            <span className="font-semibold text-slate-700 text-sm">— {template.title}</span>
                                            <Badge variant="outline"
                                                className={`text-[11px] font-semibold ring-1 ring-inset ${template.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                {template.isActive ? 'Activa' : 'Inactiva'}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-0.5">
                                            <span>Proceso: <span className="font-semibold text-slate-700">{qualityProcessLabels[template.process]}</span></span>
                                            <span>Producto: <span className="font-semibold text-slate-700">{template.product?.name || 'Genérico'}</span></span>
                                        </div>
                                        {template.sections.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {template.sections.map((s) => (
                                                    <span key={s} className="text-[11px] bg-violet-50 border border-violet-100 text-violet-700 rounded-lg px-2 py-0.5 font-medium">{s}</span>
                                                ))}
                                            </div>
                                        )}
                                        {template.requiredEvidence.length > 0 && (
                                            <div className="text-xs text-slate-500">
                                                Evidencias: {template.requiredEvidence.join(' · ')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* DHR Expediente */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-violet-500" />
                    <h3 className="font-semibold text-slate-800">Expediente DHR por lote</h3>
                    <span className="text-xs text-slate-400 ml-1">Device History Record</span>
                </div>
                <div className="p-5 space-y-4">
                    {/* Lookup */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div className="md:col-span-2 space-y-1.5">
                            <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">ID Lote de producción</Label>
                            <Input value={model.dhrBatchId}
                                onChange={(e) => model.setDhrBatchId(e.target.value)}
                                placeholder="UUID del lote"
                                className="h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500 font-mono" />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" disabled={model.exportingBatchDhr || !model.dhrBatchId}
                                onClick={() => model.handleExportBatchDhr('json')}
                                className="flex-1 rounded-xl border-slate-200 text-xs h-10">
                                {model.exportingBatchDhr
                                    ? <div className="animate-spin h-3 w-3 border-2 border-slate-400/30 border-t-slate-500 rounded-full" />
                                    : <><Download className="mr-1.5 h-3.5 w-3.5" />JSON</>}
                            </Button>
                            <Button variant="outline" disabled={model.exportingBatchDhr || !model.dhrBatchId}
                                onClick={() => model.handleExportBatchDhr('csv')}
                                className="flex-1 rounded-xl border-slate-200 text-xs h-10">
                                {model.exportingBatchDhr
                                    ? <div className="animate-spin h-3 w-3 border-2 border-slate-400/30 border-t-slate-500 rounded-full" />
                                    : <><Download className="mr-1.5 h-3.5 w-3.5" />CSV</>}
                            </Button>
                        </div>
                    </div>

                    {/* DHR content */}
                    {!model.dhrBatchId ? (
                        <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                            <FileText className="h-4 w-4 shrink-0 opacity-50" />
                            Ingresa un ID de lote para cargar el expediente DHR.
                        </div>
                    ) : model.loadingBatchDhr ? (
                        <div className="flex items-center justify-center py-10 text-slate-400">
                            <div className="animate-spin mr-3 h-5 w-5 border-4 border-slate-200 border-t-violet-600 rounded-full" />
                            <span className="text-sm animate-pulse">Cargando expediente...</span>
                        </div>
                    ) : !model.batchDhrData ? (
                        <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">Sin expediente para este lote.</div>
                    ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                            {/* General */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">General</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4 text-xs">
                                    {[
                                        { label: 'Lote', value: model.batchDhrData.productionBatch.code, mono: true },
                                        { label: 'Producto', value: model.batchDhrData.productionBatch.variant?.product?.name || 'N/A' },
                                        { label: 'Orden', value: model.batchDhrData.productionBatch.productionOrder?.code || 'N/A', mono: true },
                                        { label: 'Plantilla DMR', value: model.batchDhrData.dmrTemplate ? `${model.batchDhrData.dmrTemplate.code} v${model.batchDhrData.dmrTemplate.version}` : 'No definida' },
                                    ].map(({ label, value, mono }) => (
                                        <div key={label}>
                                            <span className="text-slate-400 font-medium">{label}</span>
                                            <p className={`font-semibold text-slate-800 mt-0.5 truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Producción y QC */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Producción y QC</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4 text-xs">
                                    {[
                                        { label: 'Producido', value: String(model.batchDhrData.productionBatch.producedQty) },
                                        { label: 'Planeado', value: String(model.batchDhrData.productionBatch.plannedQty) },
                                        { label: 'QC Aprobadas', value: String(model.batchDhrData.productionAndQuality.qcPassedUnits), positive: true },
                                        { label: 'QC Fallidas', value: String(model.batchDhrData.productionAndQuality.qcFailedUnits), negative: true },
                                        { label: 'Rechazadas', value: String(model.batchDhrData.productionAndQuality.rejectedUnits), negative: true },
                                        { label: 'Empaquetadas', value: String(model.batchDhrData.productionAndQuality.packagedUnits) },
                                        { label: 'Etiquetas', value: String(model.batchDhrData.regulatoryLabels.length) },
                                        { label: 'Despachos', value: String(model.batchDhrData.shipments.length) },
                                    ].map(({ label, value, positive, negative }) => (
                                        <div key={label}>
                                            <span className="text-slate-400 font-medium">{label}</span>
                                            <p className={`font-bold mt-0.5 ${positive ? 'text-emerald-700' : negative ? 'text-red-600' : 'text-slate-800'}`}>{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Incidencias */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Incidencias</p>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: 'NC', value: model.batchDhrData.incidents.nonConformities.length },
                                        { label: 'CAPA', value: model.batchDhrData.incidents.capas.length },
                                        { label: 'Tecnovigilancia', value: model.batchDhrData.incidents.technovigilanceCases.length },
                                        { label: 'Recall', value: model.batchDhrData.incidents.recalls.length },
                                    ].map(({ label, value }) => (
                                        <div key={label}
                                            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold ${value > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                            <span>{label}</span>
                                            <span className={`text-sm font-bold ${value > 0 ? 'text-red-700' : 'text-slate-400'}`}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </TabsContent>
    );
}
