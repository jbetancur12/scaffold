import { ChangeControlStatus, ChangeControlType, ChangeImpactLevel } from '@scaffold/types';
import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { GitMerge, Plus, X, Save } from 'lucide-react';
import type { QualityComplianceModel } from '../types';

const impactStyle: Record<string, string> = {
    [ChangeImpactLevel.BAJO]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [ChangeImpactLevel.MEDIO]: 'bg-amber-50 text-amber-700 border-amber-200',
    [ChangeImpactLevel.ALTO]: 'bg-red-50 text-red-700 border-red-200',
    [ChangeImpactLevel.CRITICO]: 'bg-red-100 text-red-900 border-red-300',
};
const statusStyle: Record<string, string> = {
    [ChangeControlStatus.BORRADOR]: 'bg-slate-100 text-slate-600 border-slate-200',
    [ChangeControlStatus.EN_EVALUACION]: 'bg-amber-50 text-amber-700 border-amber-200',
    [ChangeControlStatus.APROBADO]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [ChangeControlStatus.RECHAZADO]: 'bg-red-50 text-red-700 border-red-200',
    [ChangeControlStatus.IMPLEMENTADO]: 'bg-violet-50 text-violet-700 border-violet-200',
    [ChangeControlStatus.CANCELADO]: 'bg-slate-50 text-slate-400 border-slate-200',
};

export function QualityChangeControlTab({ model }: { model: QualityComplianceModel }) {
    const [showForm, setShowForm] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        await model.handleCreateChangeControl(e);
        setShowForm(false);
    };

    const open = model.changeControls.filter((c) => c.status !== ChangeControlStatus.APROBADO && c.status !== ChangeControlStatus.RECHAZADO && c.status !== ChangeControlStatus.IMPLEMENTADO && c.status !== ChangeControlStatus.CANCELADO).length;
    const selectClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';
    const inputClass = 'h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500';

    return (
        <TabsContent value="change-control" className="space-y-5">

            {/* Hero */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-50/40 to-transparent pointer-events-none" />
                    <div className="relative flex items-start gap-4">
                        <div className="p-2.5 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
                            <GitMerge className="h-6 w-6 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Control de Cambios</h2>
                            <p className="text-slate-500 text-sm mt-0.5">Solicitudes y aprobaciones de cambios en procesos, documentos y lotes.</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
                    {[
                        { label: 'Total', value: model.changeControls.length, color: 'text-slate-700', bg: '' },
                        { label: 'Pendientes', value: open, color: open > 0 ? 'text-amber-700' : 'text-slate-400', bg: open > 0 ? 'bg-amber-50/60' : '' },
                        { label: 'Aprobados', value: model.changeControls.filter((c) => c.status === ChangeControlStatus.APROBADO || c.status === ChangeControlStatus.IMPLEMENTADO).length, color: 'text-emerald-700', bg: 'bg-emerald-50/60' },
                    ].map(({ label, value, color, bg }) => (
                        <div key={label} className={`flex flex-col items-center py-3 px-4 ${bg}`}>
                            <span className={`text-2xl font-bold ${color}`}>{value}</span>
                            <span className="text-xs text-slate-500 font-medium mt-0.5">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <GitMerge className="h-4 w-4 text-violet-500" />
                    <h3 className="font-semibold text-slate-800">Controles de cambio</h3>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">{model.changeControls.length}</span>
                    <div className="ml-auto">
                        <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)}
                            className={showForm
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl h-8 text-xs border border-slate-200'
                                : 'bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-8 text-xs font-medium'}>
                            {showForm ? <><X className="mr-1.5 h-3.5 w-3.5" />Cancelar</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />Nueva solicitud</>}
                        </Button>
                    </div>
                </div>

                {showForm && (
                    <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-5">
                        <p className="text-sm font-bold text-slate-700 mb-4">Nueva solicitud de cambio</p>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Título <span className="text-red-500">*</span></Label>
                                    <Input value={model.changeControlForm.title} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, title: e.target.value }))} required className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Solicitante</Label>
                                    <Input value={model.changeControlForm.requestedBy} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, requestedBy: e.target.value }))} className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Tipo</Label>
                                    <select className={selectClass} value={model.changeControlForm.type}
                                        onChange={(e) => model.setChangeControlForm((p) => ({ ...p, type: e.target.value as ChangeControlType }))}>
                                        {Object.values(ChangeControlType).map((v) => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Nivel de impacto</Label>
                                    <select className={selectClass} value={model.changeControlForm.impactLevel}
                                        onChange={(e) => model.setChangeControlForm((p) => ({ ...p, impactLevel: e.target.value as ChangeImpactLevel }))}>
                                        {Object.values(ChangeImpactLevel).map((v) => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Descripción <span className="text-red-500">*</span></Label>
                                    <Textarea value={model.changeControlForm.description} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, description: e.target.value }))} required className="rounded-xl border-slate-200 focus-visible:ring-violet-500 min-h-[72px] resize-none" />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Resumen de evaluación <span className="normal-case text-slate-400">(opcional)</span></Label>
                                    <Textarea value={model.changeControlForm.evaluationSummary} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, evaluationSummary: e.target.value }))} className="rounded-xl border-slate-200 focus-visible:ring-violet-500 min-h-[56px] resize-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Fecha efectiva <span className="normal-case text-slate-400">(opcional)</span></Label>
                                    <Input type="date" value={model.changeControlForm.effectiveDate} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, effectiveDate: e.target.value }))} className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Doc. controlado ID <span className="normal-case text-slate-400">(opcional)</span></Label>
                                    <Input value={model.changeControlForm.linkedDocumentId} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, linkedDocumentId: e.target.value }))} className={`${inputClass} font-mono`} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Orden producción ID <span className="normal-case text-slate-400">(opcional)</span></Label>
                                    <Input value={model.changeControlForm.affectedProductionOrderId} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, affectedProductionOrderId: e.target.value }))} className={`${inputClass} font-mono`} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Lote afectado ID <span className="normal-case text-slate-400">(opcional)</span></Label>
                                    <Input value={model.changeControlForm.affectedProductionBatchId} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, affectedProductionBatchId: e.target.value }))} className={`${inputClass} font-mono`} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Lote antes del cambio</Label>
                                    <Input value={model.changeControlForm.beforeChangeBatchCode} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, beforeChangeBatchCode: e.target.value }))} className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Lote después del cambio</Label>
                                    <Input value={model.changeControlForm.afterChangeBatchCode} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, afterChangeBatchCode: e.target.value }))} className={inputClass} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="rounded-xl border-slate-200">Cancelar</Button>
                                <Button type="submit" disabled={model.creatingChangeControl} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-6">
                                    {model.creatingChangeControl ? <><div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />Guardando...</> : <><Save className="mr-2 h-4 w-4" />Crear solicitud</>}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="p-4 space-y-3">
                    {model.loadingChangeControls ? (
                        <div className="flex items-center justify-center py-8 text-slate-400">
                            <div className="animate-spin mr-3 h-5 w-5 border-4 border-slate-200 border-t-violet-600 rounded-full" />
                            <span className="text-sm animate-pulse">Cargando...</span>
                        </div>
                    ) : model.changeControls.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <GitMerge className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Sin controles de cambio registrados.</p>
                        </div>
                    ) : model.changeControls.map((row) => (
                        <div key={row.id} className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 ${row.status === ChangeControlStatus.APROBADO ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white'}`}>
                            <div className="flex-1 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-slate-900 font-mono text-xs">{row.code}</span>
                                    <span className="font-semibold text-slate-800 text-sm">— {row.title}</span>
                                    <Badge variant="outline" className={`text-[10px] font-semibold ring-1 ring-inset ${statusStyle[row.status] || ''}`}>{row.status}</Badge>
                                    <Badge variant="outline" className={`text-[10px] font-semibold ring-1 ring-inset ${impactStyle[row.impactLevel] || ''}`}>{row.impactLevel}</Badge>
                                </div>
                                <p className="text-sm text-slate-600">{row.description}</p>
                                <div className="flex flex-wrap gap-x-3 text-xs text-slate-500">
                                    <span>Tipo: <span className="font-medium text-slate-700">{row.type}</span></span>
                                    {row.affectedProductionBatchId && <span>Lote afectado: <span className="font-mono text-slate-700">{row.affectedProductionBatchId.slice(0, 8)}…</span></span>}
                                    {row.beforeChangeBatchCode && <span>Antes: <span className="font-medium text-slate-700">{row.beforeChangeBatchCode}</span></span>}
                                    {row.afterChangeBatchCode && <span>Después: <span className="font-medium text-slate-700">{row.afterChangeBatchCode}</span></span>}
                                </div>
                                <p className="text-xs text-slate-400">
                                    Aprobaciones: {row.approvals?.length || 0} · Roles: {model.approvalMatrix[row.type][row.impactLevel].join(', ')}
                                </p>
                            </div>
                            {row.status !== ChangeControlStatus.APROBADO && row.status !== ChangeControlStatus.IMPLEMENTADO && row.status !== ChangeControlStatus.CANCELADO && (
                                <div className="flex gap-2 shrink-0">
                                    <Button size="sm" variant="outline" onClick={() => model.quickAddApproval(row.id)} className="rounded-xl h-8 text-xs">Aprobar rol</Button>
                                    <Button size="sm" onClick={() => model.quickApproveChangeControl(row.id)} className="rounded-xl h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">Marcar aprobado</Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </TabsContent>
    );
}
