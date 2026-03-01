import {
    TechnovigilanceCaseType,
    TechnovigilanceCausality,
    TechnovigilanceSeverity,
    TechnovigilanceStatus,
} from '@scaffold/types';
import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Plus, X, Save } from 'lucide-react';
import type { QualityComplianceModel } from '../types';

const severityStyle: Record<string, string> = {
    [TechnovigilanceSeverity.LEVE]: 'bg-amber-50 text-amber-700 border-amber-200',
    [TechnovigilanceSeverity.MODERADA]: 'bg-orange-50 text-orange-700 border-orange-200',
    [TechnovigilanceSeverity.SEVERA]: 'bg-red-50 text-red-700 border-red-200',
    [TechnovigilanceSeverity.CRITICA]: 'bg-red-100 text-red-900 border-red-300',
};

const statusStyle: Record<string, string> = {
    [TechnovigilanceStatus.ABIERTO]: 'bg-amber-50 text-amber-700 border-amber-200',
    [TechnovigilanceStatus.EN_INVESTIGACION]: 'bg-blue-50 text-blue-700 border-blue-200',
    [TechnovigilanceStatus.CERRADO]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function QualityTechnoTab({ model }: { model: QualityComplianceModel }) {
    const [showForm, setShowForm] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        await model.handleCreateTechnoCase(e);
        setShowForm(false);
    };

    const open = model.technovigilanceCases.filter((c) => c.status !== TechnovigilanceStatus.CERRADO).length;
    const unreported = model.technovigilanceCases.filter((c) => !c.reportedToInvima).length;

    const selectClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';
    const inputClass = 'h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500';

    return (
        <TabsContent value="techno" className="space-y-5">

            {/* Hero */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-50/40 to-transparent pointer-events-none" />
                    <div className="relative flex items-start gap-4">
                        <div className="p-2.5 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
                            <ShieldAlert className="h-6 w-6 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tecnovigilancia</h2>
                            <p className="text-slate-500 text-sm mt-0.5">Quejas y eventos adversos relacionados con dispositivos médicos.</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
                    {[
                        { label: 'Total', value: model.technovigilanceCases.length, color: 'text-slate-700', bg: '' },
                        { label: 'Abiertos', value: open, color: 'text-amber-700', bg: 'bg-amber-50/60' },
                        { label: 'Sin reportar', value: unreported, color: unreported > 0 ? 'text-red-600' : 'text-slate-400', bg: unreported > 0 ? 'bg-red-50/60' : '' },
                    ].map(({ label, value, color, bg }) => (
                        <div key={label} className={`flex flex-col items-center py-3 px-4 ${bg}`}>
                            <span className={`text-2xl font-bold ${color}`}>{value}</span>
                            <span className="text-xs text-slate-500 font-medium mt-0.5">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cases list */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-violet-500" />
                    <h3 className="font-semibold text-slate-800">Casos</h3>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">{model.technovigilanceCases.length}</span>
                    <div className="ml-auto">
                        <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)}
                            className={showForm
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl h-8 text-xs border border-slate-200'
                                : 'bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-8 text-xs font-medium'}>
                            {showForm ? <><X className="mr-1.5 h-3.5 w-3.5" />Cancelar</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />Nuevo caso</>}
                        </Button>
                    </div>
                </div>

                {showForm && (
                    <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-5">
                        <p className="text-sm font-bold text-slate-700 mb-4">Registrar caso de tecnovigilancia</p>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Título <span className="text-red-500">*</span></Label>
                                    <Input value={model.technoForm.title} onChange={(e) => model.setTechnoForm((p) => ({ ...p, title: e.target.value }))} required className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Tipo</Label>
                                    <select className={selectClass} value={model.technoForm.type}
                                        onChange={(e) => model.setTechnoForm((p) => ({ ...p, type: e.target.value as TechnovigilanceCaseType }))}>
                                        <option value={TechnovigilanceCaseType.QUEJA}>Queja</option>
                                        <option value={TechnovigilanceCaseType.EVENTO_ADVERSO}>Evento adverso</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Severidad</Label>
                                    <select className={selectClass} value={model.technoForm.severity}
                                        onChange={(e) => model.setTechnoForm((p) => ({ ...p, severity: e.target.value as TechnovigilanceSeverity }))}>
                                        {Object.values(TechnovigilanceSeverity).map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Causalidad <span className="normal-case text-slate-400">(opcional)</span></Label>
                                    <select className={selectClass} value={model.technoForm.causality}
                                        onChange={(e) => model.setTechnoForm((p) => ({ ...p, causality: e.target.value as '' | TechnovigilanceCausality }))}>
                                        <option value="">Sin definir</option>
                                        {Object.values(TechnovigilanceCausality).map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Código lote <span className="normal-case text-slate-400">(opcional)</span></Label>
                                    <Input value={model.technoForm.lotCode} onChange={(e) => model.setTechnoForm((p) => ({ ...p, lotCode: e.target.value }))} className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Serial <span className="normal-case text-slate-400">(opcional)</span></Label>
                                    <Input value={model.technoForm.serialCode} onChange={(e) => model.setTechnoForm((p) => ({ ...p, serialCode: e.target.value }))} className={inputClass} />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Descripción <span className="text-red-500">*</span></Label>
                                    <Textarea value={model.technoForm.description} onChange={(e) => model.setTechnoForm((p) => ({ ...p, description: e.target.value }))} required className="rounded-xl border-slate-200 focus-visible:ring-violet-500 min-h-[80px] resize-none" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="rounded-xl border-slate-200">Cancelar</Button>
                                <Button type="submit" disabled={model.creatingTechnoCase} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-6">
                                    {model.creatingTechnoCase ? <><div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />Guardando...</> : <><Save className="mr-2 h-4 w-4" />Crear caso</>}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="p-4 space-y-3">
                    {model.loadingTechno ? (
                        <div className="flex items-center justify-center py-8 text-slate-400">
                            <div className="animate-spin mr-3 h-5 w-5 border-4 border-slate-200 border-t-violet-600 rounded-full" />
                            <span className="text-sm animate-pulse">Cargando...</span>
                        </div>
                    ) : model.technovigilanceCases.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Sin casos registrados.</p>
                        </div>
                    ) : model.technovigilanceCases.map((c) => (
                        <div key={c.id} className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 ${c.status === TechnovigilanceStatus.CERRADO ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white'}`}>
                            <div className="flex-1 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-slate-900 text-sm">{c.title}</span>
                                    <Badge variant="outline" className={`text-[10px] font-semibold ring-1 ring-inset ${severityStyle[c.severity] || ''}`}>{c.severity}</Badge>
                                    <Badge variant="outline" className={`text-[10px] font-semibold ring-1 ring-inset ${statusStyle[c.status] || ''}`}>{c.status}</Badge>
                                    {!c.reportedToInvima && (
                                        <span className="text-[10px] font-bold bg-red-50 border border-red-200 text-red-700 rounded-lg px-1.5 py-0.5">Sin reportar INVIMA</span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-600">{c.description}</p>
                                <div className="flex flex-wrap gap-x-3 text-xs text-slate-500">
                                    <span>Tipo: <span className="font-medium text-slate-700">{c.type}</span></span>
                                    {c.causality && <span>Causalidad: <span className="font-medium text-slate-700">{c.causality}</span></span>}
                                    {c.lotCode && <span>Lote: <span className="font-mono font-medium text-slate-700">{c.lotCode}</span></span>}
                                    {c.reportedToInvima && c.invimaReportNumber && <span>Radicado: <span className="font-mono font-medium text-slate-700">{c.invimaReportNumber}</span></span>}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 shrink-0">
                                {c.status !== TechnovigilanceStatus.EN_INVESTIGACION && (
                                    <Button size="sm" variant="outline" onClick={() => model.quickSetTechnoStatus(c.id, TechnovigilanceStatus.EN_INVESTIGACION)} className="rounded-xl h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50">Investigar</Button>
                                )}
                                {c.status !== TechnovigilanceStatus.CERRADO && (
                                    <Button size="sm" variant="outline" onClick={() => model.quickSetTechnoStatus(c.id, TechnovigilanceStatus.CERRADO)} className="rounded-xl h-8 text-xs">Cerrar</Button>
                                )}
                                {!c.reportedToInvima && (
                                    <Button size="sm" onClick={() => model.quickReportTechno(c.id)} className="rounded-xl h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white">Reportar INVIMA</Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </TabsContent>
    );
}
