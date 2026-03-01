import { OosCaseStatus, ProcessDeviationStatus } from '@scaffold/types';
import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Activity, FlaskConical, Plus, X, Save } from 'lucide-react';
import type { QualityComplianceModel } from '../types';

const deviationStatusStyle: Record<string, string> = {
    [ProcessDeviationStatus.ABIERTA]: 'bg-amber-50 text-amber-700 border-amber-200',
    [ProcessDeviationStatus.EN_INVESTIGACION]: 'bg-blue-50 text-blue-700 border-blue-200',
    [ProcessDeviationStatus.CERRADA]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const oosStatusStyle: Record<string, string> = {
    [OosCaseStatus.EN_INVESTIGACION]: 'bg-blue-50 text-blue-700 border-blue-200',
    [OosCaseStatus.CERRADO]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function QualityDeviationOosTab({ model }: { model: QualityComplianceModel }) {
    const [showDeviationForm, setShowDeviationForm] = useState(false);
    const [showOosForm, setShowOosForm] = useState(false);

    const handleDeviationSubmit = async (e: React.FormEvent) => {
        await model.handleCreateProcessDeviation(e);
        setShowDeviationForm(false);
    };

    const handleOosSubmit = async (e: React.FormEvent) => {
        await model.handleCreateOosCase(e);
        setShowOosForm(false);
    };

    const selectClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';
    const inputClass = 'h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500';

    return (
        <TabsContent value="deviations-oos" className="space-y-5">

            {/* Hero */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-50/40 to-transparent pointer-events-none" />
                    <div className="relative flex items-start gap-4">
                        <div className="p-2.5 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
                            <Activity className="h-6 w-6 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Desviaciones & OOS</h2>
                            <p className="text-slate-500 text-sm mt-0.5">Desviaciones de proceso y casos fuera de especificación (Out Of Spec).</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100">
                    {[
                        { label: 'Desviaciones', value: model.processDeviations.length, color: 'text-slate-700', bg: '' },
                        { label: 'Abiertas', value: model.processDeviations.filter((d) => d.status !== ProcessDeviationStatus.CERRADA).length, color: 'text-amber-700', bg: 'bg-amber-50/60' },
                        { label: 'Casos OOS', value: model.oosCases.length, color: 'text-slate-700', bg: '' },
                        { label: 'OOS Activos', value: model.oosCases.filter((o) => o.status !== OosCaseStatus.CERRADO).length, color: 'text-red-600', bg: 'bg-red-50/60' },
                    ].map(({ label, value, color, bg }) => (
                        <div key={label} className={`flex flex-col items-center py-3 px-2 ${bg}`}>
                            <span className={`text-2xl font-bold ${color}`}>{value}</span>
                            <span className="text-xs text-slate-500 font-medium mt-0.5 text-center">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Desviaciones */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-violet-500" />
                    <h3 className="font-semibold text-slate-800">Desviaciones de proceso</h3>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">{model.processDeviations.length}</span>
                    <div className="ml-auto">
                        <Button type="button" size="sm" onClick={() => { setShowDeviationForm((v) => !v); setShowOosForm(false); }}
                            className={showDeviationForm
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl h-8 text-xs border border-slate-200'
                                : 'bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-8 text-xs font-medium'}>
                            {showDeviationForm ? <><X className="mr-1.5 h-3.5 w-3.5" />Cancelar</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />Nueva desviación</>}
                        </Button>
                    </div>
                </div>

                {showDeviationForm && (
                    <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-5">
                        <p className="text-sm font-bold text-slate-700 mb-4">Nueva desviación de proceso</p>
                        <form className="space-y-4" onSubmit={handleDeviationSubmit}>
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Título</Label>
                                    <Input value={model.processDeviationForm.title}
                                        onChange={(e) => model.setProcessDeviationForm((p) => ({ ...p, title: e.target.value }))}
                                        required className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Clasificación</Label>
                                    <Input value={model.processDeviationForm.classification}
                                        onChange={(e) => model.setProcessDeviationForm((p) => ({ ...p, classification: e.target.value }))}
                                        className={inputClass} placeholder="Crítica, Mayor, Menor..." />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">ID Lote <span className="normal-case text-slate-400">(opcional)</span></Label>
                                    <Input value={model.processDeviationForm.productionBatchId}
                                        onChange={(e) => model.setProcessDeviationForm((p) => ({ ...p, productionBatchId: e.target.value }))}
                                        className={`${inputClass} font-mono`} placeholder="UUID" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Acción de contención <span className="normal-case text-slate-400">(opcional)</span></Label>
                                    <Input value={model.processDeviationForm.containmentAction}
                                        onChange={(e) => model.setProcessDeviationForm((p) => ({ ...p, containmentAction: e.target.value }))}
                                        className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">CAPA relacionado <span className="normal-case text-slate-400">(opcional)</span></Label>
                                    <select className={selectClass} value={model.processDeviationForm.capaActionId}
                                        onChange={(e) => model.setProcessDeviationForm((p) => ({ ...p, capaActionId: e.target.value }))}>
                                        <option value="">Sin CAPA</option>
                                        {model.capas.map((c) => <option key={c.id} value={c.id}>{c.id.slice(0, 8)}... | {c.status}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Descripción</Label>
                                    <Textarea value={model.processDeviationForm.description}
                                        onChange={(e) => model.setProcessDeviationForm((p) => ({ ...p, description: e.target.value }))}
                                        required className="rounded-xl border-slate-200 focus-visible:ring-violet-500 min-h-[72px] resize-none" />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Resumen de investigación <span className="normal-case text-slate-400">(opcional)</span></Label>
                                    <Textarea value={model.processDeviationForm.investigationSummary}
                                        onChange={(e) => model.setProcessDeviationForm((p) => ({ ...p, investigationSummary: e.target.value }))}
                                        className="rounded-xl border-slate-200 focus-visible:ring-violet-500 min-h-[60px] resize-none" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowDeviationForm(false)} className="rounded-xl border-slate-200">Cancelar</Button>
                                <Button type="submit" disabled={model.creatingProcessDeviation}
                                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium px-6">
                                    {model.creatingProcessDeviation ? <><div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />Guardando...</> : <><Save className="mr-2 h-4 w-4" />Crear desviación</>}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="p-4 space-y-3">
                    {model.loadingProcessDeviations ? (
                        <div className="flex items-center justify-center py-8 text-slate-400">
                            <div className="animate-spin mr-3 h-5 w-5 border-4 border-slate-200 border-t-violet-600 rounded-full" />
                            <span className="text-sm animate-pulse">Cargando...</span>
                        </div>
                    ) : model.processDeviations.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <Activity className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Sin desviaciones registradas.</p>
                        </div>
                    ) : model.processDeviations.map((row) => (
                        <div key={row.id}
                            className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 ${row.status === ProcessDeviationStatus.CERRADA ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white'}`}>
                            <div className="flex-1 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-slate-900 font-mono text-xs">{row.code}</span>
                                    <span className="font-semibold text-slate-800 text-sm">— {row.title}</span>
                                    <Badge variant="outline" className={`text-[11px] font-semibold ring-1 ring-inset ${deviationStatusStyle[row.status] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>{row.status}</Badge>
                                </div>
                                <p className="text-sm text-slate-600">{row.description}</p>
                                <div className="text-xs text-slate-500 flex flex-wrap gap-x-3">
                                    {row.classification && <span>Clasificación: <span className="font-semibold text-slate-700">{row.classification}</span></span>}
                                    <span>Lote: <span className="font-mono font-semibold text-slate-700">{row.productionBatchId || 'N/A'}</span></span>
                                    {row.capaActionId && <span>CAPA: <span className="font-mono text-violet-700">{row.capaActionId.slice(0, 8)}...</span></span>}
                                </div>
                            </div>
                            {row.status !== ProcessDeviationStatus.CERRADA && (
                                <Button size="sm" variant="outline" onClick={() => model.quickCloseProcessDeviation(row.id)}
                                    className="rounded-xl border-slate-200 text-xs h-8 shrink-0">Cerrar</Button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* OOS Cases */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-violet-500" />
                    <h3 className="font-semibold text-slate-800">Casos OOS</h3>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">{model.oosCases.length}</span>
                    <div className="ml-auto">
                        <Button type="button" size="sm" onClick={() => { setShowOosForm((v) => !v); setShowDeviationForm(false); }}
                            className={showOosForm
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl h-8 text-xs border border-slate-200'
                                : 'bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-8 text-xs font-medium'}>
                            {showOosForm ? <><X className="mr-1.5 h-3.5 w-3.5" />Cancelar</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />Nuevo OOS</>}
                        </Button>
                    </div>
                </div>

                {showOosForm && (
                    <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-5">
                        <p className="text-sm font-bold text-slate-700 mb-4">Nuevo caso OOS</p>
                        <form className="space-y-4" onSubmit={handleOosSubmit}>
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Prueba</Label>
                                    <Input value={model.oosCaseForm.testName}
                                        onChange={(e) => model.setOosCaseForm((p) => ({ ...p, testName: e.target.value }))}
                                        required className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Resultado obtenido</Label>
                                    <Input value={model.oosCaseForm.resultValue}
                                        onChange={(e) => model.setOosCaseForm((p) => ({ ...p, resultValue: e.target.value }))}
                                        required className={`${inputClass} font-mono`} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Especificación</Label>
                                    <Input value={model.oosCaseForm.specification}
                                        onChange={(e) => model.setOosCaseForm((p) => ({ ...p, specification: e.target.value }))}
                                        required className={`${inputClass} font-mono`} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">ID Lote <span className="normal-case text-slate-400">(opcional)</span></Label>
                                    <Input value={model.oosCaseForm.productionBatchId}
                                        onChange={(e) => model.setOosCaseForm((p) => ({ ...p, productionBatchId: e.target.value }))}
                                        className={`${inputClass} font-mono`} placeholder="UUID" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">CAPA relacionado <span className="normal-case text-slate-400">(opcional)</span></Label>
                                    <select className={selectClass} value={model.oosCaseForm.capaActionId}
                                        onChange={(e) => model.setOosCaseForm((p) => ({ ...p, capaActionId: e.target.value }))}>
                                        <option value="">Sin CAPA</option>
                                        {model.capas.map((c) => <option key={c.id} value={c.id}>{c.id.slice(0, 8)}... | {c.status}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Resumen de investigación <span className="normal-case text-slate-400">(opcional)</span></Label>
                                    <Textarea value={model.oosCaseForm.investigationSummary}
                                        onChange={(e) => model.setOosCaseForm((p) => ({ ...p, investigationSummary: e.target.value }))}
                                        className="rounded-xl border-slate-200 focus-visible:ring-violet-500 min-h-[60px] resize-none" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowOosForm(false)} className="rounded-xl border-slate-200">Cancelar</Button>
                                <Button type="submit" disabled={model.creatingOosCase}
                                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium px-6">
                                    {model.creatingOosCase ? <><div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />Guardando...</> : <><Save className="mr-2 h-4 w-4" />Crear OOS</>}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="p-4 space-y-3">
                    {model.loadingOosCases ? (
                        <div className="flex items-center justify-center py-8 text-slate-400">
                            <div className="animate-spin mr-3 h-5 w-5 border-4 border-slate-200 border-t-violet-600 rounded-full" />
                            <span className="text-sm animate-pulse">Cargando...</span>
                        </div>
                    ) : model.oosCases.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Sin casos OOS registrados.</p>
                        </div>
                    ) : model.oosCases.map((row) => (
                        <div key={row.id}
                            className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 ${row.status === OosCaseStatus.CERRADO ? 'border-emerald-200 bg-emerald-50/20' : 'border-red-200 bg-red-50/20'}`}>
                            <div className="flex-1 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-slate-900 font-mono text-xs">{row.code}</span>
                                    <span className="font-semibold text-slate-800 text-sm">— {row.testName}</span>
                                    <Badge variant="outline" className={`text-[11px] font-semibold ring-1 ring-inset ${oosStatusStyle[row.status] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>{row.status}</Badge>
                                </div>
                                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                                    <span>Resultado: <span className="font-mono font-bold text-red-700">{row.resultValue}</span></span>
                                    <span>Especificación: <span className="font-mono font-semibold text-slate-700">{row.specification}</span></span>
                                </div>
                                <div className="text-xs text-slate-500 flex flex-wrap gap-x-3">
                                    <span>Lote: <span className="font-mono text-slate-700">{row.productionBatchId || 'N/A'}</span></span>
                                    <span>Bloqueado: <span className="text-slate-700">{new Date(row.blockedAt).toLocaleString('es-CO')}</span></span>
                                    {row.capaActionId && <span>CAPA: <span className="font-mono text-violet-700">{row.capaActionId.slice(0, 8)}...</span></span>}
                                </div>
                            </div>
                            {row.status !== OosCaseStatus.CERRADO && (
                                <Button size="sm" variant="outline" onClick={() => model.quickCloseOosCase(row.id)}
                                    className="rounded-xl border-slate-200 text-xs h-8 shrink-0">Cerrar</Button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </TabsContent>
    );
}
