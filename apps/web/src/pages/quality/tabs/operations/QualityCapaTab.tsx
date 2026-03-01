import { CapaStatus } from '@scaffold/types';
import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Plus, X, Save } from 'lucide-react';
import type { QualityComplianceModel } from '../types';

const statusStyle: Record<string, string> = {
    [CapaStatus.ABIERTA]: 'bg-amber-50 text-amber-700 border-amber-200',
    [CapaStatus.EN_PROGRESO]: 'bg-blue-50 text-blue-700 border-blue-200',
    [CapaStatus.CERRADA]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function QualityCapaTab({ model }: { model: QualityComplianceModel }) {
    const [showForm, setShowForm] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        await model.handleCreateCapa(e);
        setShowForm(false);
    };

    const open = model.capas.filter((c) => c.status === CapaStatus.ABIERTA || c.status === CapaStatus.EN_PROGRESO).length;
    const closed = model.capas.filter((c) => c.status === CapaStatus.CERRADA).length;

    const selectClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';
    const inputClass = 'h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500';

    return (
        <TabsContent value="capa" className="space-y-5">

            {/* Hero */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-50/40 to-transparent pointer-events-none" />
                    <div className="relative flex items-start gap-4">
                        <div className="p-2.5 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
                            <ClipboardCheck className="h-6 w-6 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Acciones CAPA</h2>
                            <p className="text-slate-500 text-sm mt-0.5">Acciones correctivas y preventivas vinculadas a no conformidades.</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
                    {[
                        { label: 'Total', value: model.capas.length, color: 'text-slate-700', bg: '' },
                        { label: 'En curso', value: open, color: 'text-amber-700', bg: 'bg-amber-50/60' },
                        { label: 'Cerradas', value: closed, color: 'text-emerald-700', bg: 'bg-emerald-50/60' },
                    ].map(({ label, value, color, bg }) => (
                        <div key={label} className={`flex flex-col items-center py-3 px-4 ${bg}`}>
                            <span className={`text-2xl font-bold ${color}`}>{value}</span>
                            <span className="text-xs text-slate-500 font-medium mt-0.5">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* CAPA list + inline form */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-violet-500" />
                    <h3 className="font-semibold text-slate-800">Acciones CAPA</h3>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
                        {model.capas.length}
                    </span>
                    <div className="ml-auto">
                        <Button type="button" size="sm"
                            onClick={() => setShowForm((v) => !v)}
                            className={showForm
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl h-8 text-xs border border-slate-200'
                                : 'bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-8 text-xs font-medium'}>
                            {showForm ? <><X className="mr-1.5 h-3.5 w-3.5" />Cancelar</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />Nueva CAPA</>}
                        </Button>
                    </div>
                </div>

                {showForm && (
                    <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-5">
                        <p className="text-sm font-bold text-slate-700 mb-4">Nueva acción CAPA</p>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">No Conformidad vinculada</Label>
                                    <select className={selectClass} value={model.capaForm.nonConformityId}
                                        onChange={(e) => model.setCapaForm((p) => ({ ...p, nonConformityId: e.target.value }))}>
                                        <option value="">Selecciona una NC...</option>
                                        {model.openNc.map((n) => (
                                            <option key={n.id} value={n.id}>{n.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Responsable</Label>
                                    <Input value={model.capaForm.owner} onChange={(e) => model.setCapaForm((p) => ({ ...p, owner: e.target.value }))}
                                        className={inputClass} placeholder="Nombre o área responsable" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Fecha objetivo</Label>
                                    <Input type="date" value={model.capaForm.dueDate}
                                        onChange={(e) => model.setCapaForm((p) => ({ ...p, dueDate: e.target.value }))}
                                        className={inputClass} />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Plan de acción</Label>
                                    <Textarea value={model.capaForm.actionPlan}
                                        onChange={(e) => model.setCapaForm((p) => ({ ...p, actionPlan: e.target.value }))}
                                        required className="rounded-xl border-slate-200 focus-visible:ring-violet-500 min-h-[90px] resize-none" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="rounded-xl border-slate-200">Cancelar</Button>
                                <Button type="submit" disabled={model.creatingCapa}
                                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium px-6">
                                    {model.creatingCapa
                                        ? <><div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />Guardando...</>
                                        : <><Save className="mr-2 h-4 w-4" />Crear CAPA</>}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="p-4 space-y-3">
                    {model.loadingCapas ? (
                        <div className="flex items-center justify-center py-10 text-slate-400">
                            <div className="animate-spin mr-3 h-6 w-6 border-4 border-slate-200 border-t-violet-600 rounded-full" />
                            <span className="text-sm animate-pulse">Cargando...</span>
                        </div>
                    ) : model.capas.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">Sin acciones CAPA registradas.</p>
                        </div>
                    ) : (
                        model.capas.map((c) => (
                            <div key={c.id}
                                className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 transition-all ${c.status === CapaStatus.CERRADA ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white'}`}>
                                <div className="flex-1 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className={`text-[11px] font-semibold ring-1 ring-inset ${statusStyle[c.status] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                            {c.status}
                                        </Badge>
                                        {c.dueDate && (
                                            <span className="text-[11px] text-slate-500 font-medium">
                                                Objetivo: {new Date(c.dueDate).toLocaleDateString('es-CO')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-slate-800 leading-relaxed">{c.actionPlan}</p>
                                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-3">
                                        <span>NC: <span className="font-mono font-semibold text-slate-700">{c.nonConformityId.slice(0, 8)}...</span></span>
                                        <span>Responsable: <span className="font-semibold text-slate-700">{c.owner || 'N/A'}</span></span>
                                    </div>
                                </div>
                                {c.status !== CapaStatus.CERRADA && (
                                    <Button size="sm" variant="outline"
                                        onClick={() => model.quickCloseCapa(c.id)}
                                        className="rounded-xl border-slate-200 text-xs h-8 shrink-0">
                                        Cerrar CAPA
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
