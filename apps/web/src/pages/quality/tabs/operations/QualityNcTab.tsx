import { NonConformityStatus, QualitySeverity, UserRole } from '@scaffold/types';
import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useHasRole } from '@/components/auth/RoleGuard';
import { AlertOctagon, Plus, X, Save } from 'lucide-react';
import type { QualityComplianceModel } from '../types';

const severityStyle: Record<string, string> = {
    [QualitySeverity.CRITICA]: 'bg-red-50 text-red-700 border-red-200',
    [QualitySeverity.ALTA]: 'bg-orange-50 text-orange-700 border-orange-200',
    [QualitySeverity.BAJA]: 'bg-amber-50 text-amber-700 border-amber-200',
};

const statusStyle: Record<string, string> = {
    [NonConformityStatus.ABIERTA]: 'bg-amber-50 text-amber-700 border-amber-200',
    [NonConformityStatus.EN_ANALISIS]: 'bg-blue-50 text-blue-700 border-blue-200',
    [NonConformityStatus.CERRADA]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function QualityNcTab({ model }: { model: QualityComplianceModel }) {
    const { hasRole } = useHasRole();
    const canManageNc = Boolean(hasRole([UserRole.ADMIN, UserRole.SUPERADMIN]));
    const [showForm, setShowForm] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        await model.handleCreateNc(e);
        setShowForm(false);
    };

    const open = model.nonConformities.filter((n) => n.status === NonConformityStatus.ABIERTA).length;
    const closed = model.nonConformities.filter((n) => n.status === NonConformityStatus.CERRADA).length;

    const selectClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50';
    const inputClass = 'h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500 disabled:opacity-50';

    return (
        <TabsContent value="nc" className="space-y-5">

            {/* Hero */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-50/40 to-transparent pointer-events-none" />
                    <div className="relative flex items-start gap-4">
                        <div className="p-2.5 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
                            <AlertOctagon className="h-6 w-6 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">No Conformidades</h2>
                            <p className="text-slate-500 text-sm mt-0.5">Registro y seguimiento de NC encontradas en el proceso.</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
                    {[
                        { label: 'Total', value: model.nonConformities.length, color: 'text-slate-700', bg: '' },
                        { label: 'Abiertas', value: open, color: 'text-amber-700', bg: 'bg-amber-50/60' },
                        { label: 'Cerradas', value: closed, color: 'text-emerald-700', bg: 'bg-emerald-50/60' },
                    ].map(({ label, value, color, bg }) => (
                        <div key={label} className={`flex flex-col items-center py-3 px-4 ${bg}`}>
                            <span className={`text-2xl font-bold ${color}`}>{value}</span>
                            <span className="text-xs text-slate-500 font-medium mt-0.5">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* NC List + inline form */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4 text-violet-500" />
                    <h3 className="font-semibold text-slate-800">No Conformidades</h3>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
                        {model.nonConformities.length}
                    </span>
                    {canManageNc && (
                        <div className="ml-auto">
                            <Button type="button" size="sm"
                                onClick={() => setShowForm((v) => !v)}
                                className={showForm
                                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl h-8 text-xs border border-slate-200'
                                    : 'bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-8 text-xs font-medium'}>
                                {showForm ? <><X className="mr-1.5 h-3.5 w-3.5" />Cancelar</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />Nueva NC</>}
                            </Button>
                        </div>
                    )}
                </div>

                {showForm && (
                    <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-5">
                        <p className="text-sm font-bold text-slate-700 mb-4">Nueva No Conformidad</p>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Título</Label>
                                    <Input value={model.ncForm.title} onChange={(e) => model.setNcForm((p) => ({ ...p, title: e.target.value }))}
                                        required disabled={!canManageNc} className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Severidad</Label>
                                    <select className={selectClass} value={model.ncForm.severity}
                                        onChange={(e) => model.setNcForm((p) => ({ ...p, severity: e.target.value as QualitySeverity }))}
                                        disabled={!canManageNc}>
                                        {Object.values(QualitySeverity).map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Origen</Label>
                                    <Input value={model.ncForm.source} onChange={(e) => model.setNcForm((p) => ({ ...p, source: e.target.value }))}
                                        disabled={!canManageNc} className={inputClass} placeholder="Proceso, área, cliente..." />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Inspección vinculada <span className="normal-case text-slate-400">(opcional)</span></Label>
                                    <div className="flex gap-2">
                                        <Input value={model.ncForm.incomingInspectionId || ''}
                                            onChange={(e) => model.setNcForm((p) => ({ ...p, incomingInspectionId: e.target.value }))}
                                            placeholder="UUID de inspección" disabled={!canManageNc}
                                            className={`${inputClass} font-mono flex-1`} />
                                        {model.ncForm.incomingInspectionId && (
                                            <Button type="button" variant="outline" size="sm"
                                                onClick={() => model.setNcForm((p) => ({ ...p, incomingInspectionId: '' }))}
                                                disabled={!canManageNc} className="rounded-xl h-10">
                                                <X className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Descripción</Label>
                                    <Textarea value={model.ncForm.description}
                                        onChange={(e) => model.setNcForm((p) => ({ ...p, description: e.target.value }))}
                                        required disabled={!canManageNc}
                                        className="rounded-xl border-slate-200 focus-visible:ring-violet-500 min-h-[80px] resize-none disabled:opacity-50" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="rounded-xl border-slate-200">Cancelar</Button>
                                <Button type="submit" disabled={!canManageNc || model.creatingNc}
                                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium px-6">
                                    {model.creatingNc
                                        ? <><div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />Guardando...</>
                                        : <><Save className="mr-2 h-4 w-4" />Crear NC</>}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="p-4 space-y-3">
                    {model.loadingNc ? (
                        <div className="flex items-center justify-center py-10 text-slate-400">
                            <div className="animate-spin mr-3 h-6 w-6 border-4 border-slate-200 border-t-violet-600 rounded-full" />
                            <span className="text-sm animate-pulse">Cargando...</span>
                        </div>
                    ) : model.nonConformities.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <AlertOctagon className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">Sin no conformidades registradas.</p>
                        </div>
                    ) : (
                        model.nonConformities.map((n) => (
                            <div key={n.id}
                                className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 transition-all ${n.status === NonConformityStatus.CERRADA ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white'}`}>
                                <div className="flex-1 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-bold text-slate-900 text-sm">{n.title}</span>
                                        <Badge variant="outline" className={`text-[11px] font-semibold ring-1 ring-inset ${severityStyle[n.severity] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                            {n.severity}
                                        </Badge>
                                        <Badge variant="outline" className={`text-[11px] font-semibold ring-1 ring-inset ${statusStyle[n.status] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                            {n.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed">{n.description}</p>
                                    {(n.source || n.incomingInspectionId) && (
                                        <div className="text-xs text-slate-500 flex flex-wrap gap-x-3">
                                            {n.source && <span>Origen: <span className="font-semibold text-slate-700">{n.source}</span></span>}
                                            {n.incomingInspectionId && <span>Inspección: <span className="font-mono font-semibold text-slate-700">{n.incomingInspectionId.slice(0, 8)}...</span></span>}
                                        </div>
                                    )}
                                </div>
                                {n.status !== NonConformityStatus.CERRADA && (
                                    <Button size="sm" variant="outline"
                                        onClick={() => model.quickCloseNc(n.id)}
                                        disabled={!canManageNc}
                                        className="rounded-xl border-slate-200 text-xs h-8 shrink-0">
                                        Cerrar NC
                                    </Button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </TabsContent>
    );
}
