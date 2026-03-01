import {
    RecallNotificationStatus,
    RecallScopeType,
    RecallStatus,
} from '@scaffold/types';
import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Plus, X, Save, CheckCircle, Bell } from 'lucide-react';
import type { QualityComplianceModel } from '../types';

const recallStatusStyle: Record<string, string> = {
    [RecallStatus.ABIERTO]: 'bg-red-50 text-red-700 border-red-200',
    [RecallStatus.EN_EJECUCION]: 'bg-orange-50 text-orange-700 border-orange-200',
    [RecallStatus.CERRADO]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const notifStatusStyle: Record<string, string> = {
    [RecallNotificationStatus.PENDIENTE]: 'bg-amber-50 text-amber-700 border-amber-200',
    [RecallNotificationStatus.ENVIADA]: 'bg-blue-50 text-blue-700 border-blue-200',
    [RecallNotificationStatus.CONFIRMADA]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [RecallNotificationStatus.FALLIDA]: 'bg-red-50 text-red-700 border-red-200',
};

export function QualityRecallTab({ model }: { model: QualityComplianceModel }) {
    const [showForm, setShowForm] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        await model.handleCreateRecall(e);
        setShowForm(false);
    };

    const active = model.recalls.filter((r) => r.status !== RecallStatus.CERRADO).length;
    const mocks = model.recalls.filter((r) => r.isMock).length;

    const selectClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';
    const inputClass = 'h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500';

    return (
        <TabsContent value="recall" className="space-y-5">

            {/* Hero */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-50/40 to-transparent pointer-events-none" />
                    <div className="relative flex items-start gap-4">
                        <div className="p-2.5 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
                            <RotateCcw className="h-6 w-6 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Recall & Simulacros</h2>
                            <p className="text-slate-500 text-sm mt-0.5">Retiro de producto del mercado y ejercicios de simulacro.</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
                    {[
                        { label: 'Total', value: model.recalls.length, color: 'text-slate-700', bg: '' },
                        { label: 'Activos', value: active, color: active > 0 ? 'text-red-600' : 'text-slate-400', bg: active > 0 ? 'bg-red-50/60' : '' },
                        { label: 'Simulacros', value: mocks, color: 'text-violet-700', bg: 'bg-violet-50/40' },
                    ].map(({ label, value, color, bg }) => (
                        <div key={label} className={`flex flex-col items-center py-3 px-4 ${bg}`}>
                            <span className={`text-2xl font-bold ${color}`}>{value}</span>
                            <span className="text-xs text-slate-500 font-medium mt-0.5">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recalls list */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-violet-500" />
                    <h3 className="font-semibold text-slate-800">Casos de Recall</h3>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">{model.recalls.length}</span>
                    <div className="ml-auto">
                        <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)}
                            className={showForm
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl h-8 text-xs border border-slate-200'
                                : 'bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-8 text-xs font-medium'}>
                            {showForm ? <><X className="mr-1.5 h-3.5 w-3.5" />Cancelar</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />Nueva recall</>}
                        </Button>
                    </div>
                </div>

                {showForm && (
                    <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-5">
                        <p className="text-sm font-bold text-slate-700 mb-4">Crear recall / simulacro</p>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Título <span className="text-red-500">*</span></Label>
                                    <Input value={model.recallForm.title} onChange={(e) => model.setRecallForm((p) => ({ ...p, title: e.target.value }))} required className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Tipo de alcance</Label>
                                    <select className={selectClass} value={model.recallForm.scopeType}
                                        onChange={(e) => model.setRecallForm((p) => ({ ...p, scopeType: e.target.value as RecallScopeType }))}>
                                        <option value={RecallScopeType.LOTE}>Por lote</option>
                                        <option value={RecallScopeType.SERIAL}>Por serial</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Código lote</Label>
                                    <Input value={model.recallForm.lotCode} onChange={(e) => model.setRecallForm((p) => ({ ...p, lotCode: e.target.value }))}
                                        required={model.recallForm.scopeType === RecallScopeType.LOTE} className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Código serial</Label>
                                    <Input value={model.recallForm.serialCode} onChange={(e) => model.setRecallForm((p) => ({ ...p, serialCode: e.target.value }))}
                                        required={model.recallForm.scopeType === RecallScopeType.SERIAL} className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Cantidad afectada <span className="text-red-500">*</span></Label>
                                    <Input type="number" min={1} value={model.recallForm.affectedQuantity}
                                        onChange={(e) => model.setRecallForm((p) => ({ ...p, affectedQuantity: Number(e.target.value) || 1 }))}
                                        required className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Meta respuesta (min)</Label>
                                    <Input type="number" min={1} value={model.recallForm.targetResponseMinutes}
                                        onChange={(e) => model.setRecallForm((p) => ({ ...p, targetResponseMinutes: e.target.value }))}
                                        className={inputClass} />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Motivo <span className="text-red-500">*</span></Label>
                                    <Textarea value={model.recallForm.reason} onChange={(e) => model.setRecallForm((p) => ({ ...p, reason: e.target.value }))}
                                        required className="rounded-xl border-slate-200 focus-visible:ring-violet-500 min-h-[72px] resize-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                        <div className="relative">
                                            <input type="checkbox" className="sr-only peer" checked={model.recallForm.isMock}
                                                onChange={(e) => model.setRecallForm((p) => ({ ...p, isMock: e.target.checked }))} />
                                            <div className="h-5 w-5 rounded border-2 border-slate-300 bg-white peer-checked:border-violet-600 peer-checked:bg-violet-600 transition-colors flex items-center justify-center">
                                                {model.recallForm.isMock && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                                            </div>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Marcar como simulacro</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="rounded-xl border-slate-200">Cancelar</Button>
                                <Button type="submit" disabled={model.creatingRecall} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-6">
                                    {model.creatingRecall ? <><div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />Guardando...</> : <><Save className="mr-2 h-4 w-4" />Crear recall</>}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="p-4 space-y-4">
                    {model.loadingRecalls ? (
                        <div className="flex items-center justify-center py-8 text-slate-400">
                            <div className="animate-spin mr-3 h-5 w-5 border-4 border-slate-200 border-t-violet-600 rounded-full" />
                            <span className="text-sm animate-pulse">Cargando...</span>
                        </div>
                    ) : model.recalls.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Sin recalls registrados.</p>
                        </div>
                    ) : model.recalls.map((recall) => (
                        <div key={recall.id} className={`border rounded-2xl overflow-hidden ${recall.status === RecallStatus.CERRADO ? 'border-emerald-200' : 'border-red-200'}`}>
                            {/* Recall header */}
                            <div className={`p-4 ${recall.status === RecallStatus.CERRADO ? 'bg-emerald-50/20' : 'bg-red-50/20'}`}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex-1 space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-slate-900 font-mono text-xs">{recall.code}</span>
                                            <span className="font-semibold text-slate-800">— {recall.title}</span>
                                            <Badge variant="outline" className={`text-[10px] font-semibold ring-1 ring-inset ${recallStatusStyle[recall.status] || ''}`}>{recall.status}</Badge>
                                            {recall.isMock && <span className="text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 rounded-lg px-1.5 py-0.5">SIMULACRO</span>}
                                        </div>
                                        <p className="text-sm text-slate-600">{recall.reason}</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                                            <span>Alcance: <span className="font-medium text-slate-700">{recall.scopeType}</span></span>
                                            {recall.lotCode && <span>Lote: <span className="font-mono font-medium text-slate-700">{recall.lotCode}</span></span>}
                                            <span>Recuperado: <span className="font-bold text-slate-800">{recall.retrievedQuantity}/{recall.affectedQuantity}</span> <span className="text-slate-400">({recall.coveragePercent}%)</span></span>
                                            {recall.targetResponseMinutes && <span>Meta: <span className="font-medium text-slate-700">{recall.targetResponseMinutes}min</span></span>}
                                            {recall.actualResponseMinutes && <span>Real: <span className="font-medium text-slate-700">{recall.actualResponseMinutes}min</span></span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 shrink-0">
                                        <Button size="sm" variant="outline" onClick={() => model.quickShowRecallAffectedCustomers(recall.id)} className="rounded-xl h-8 text-xs">Ver afectados</Button>
                                        {recall.status !== RecallStatus.CERRADO && (
                                            <>
                                                <Button size="sm" variant="outline" onClick={() => model.quickUpdateRecallProgress(recall.id, recall.retrievedQuantity)} className="rounded-xl h-8 text-xs">Avance</Button>
                                                <Button size="sm" variant="outline" onClick={() => model.quickCreateRecallNotification(recall.id)} className="rounded-xl h-8 text-xs"><Bell className="mr-1 h-3.5 w-3.5" />Notificar</Button>
                                                <Button size="sm" onClick={() => model.quickCloseRecall(recall.id)} className="rounded-xl h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">Cerrar</Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Notifications sub-section */}
                            <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 space-y-2">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Notificaciones ({recall.notifications?.length || 0})
                                </p>
                                {!recall.notifications || recall.notifications.length === 0 ? (
                                    <p className="text-xs text-slate-400">Sin notificaciones registradas.</p>
                                ) : recall.notifications.map((n) => (
                                    <div key={n.id} className="flex items-start justify-between gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
                                        <div className="flex-1 space-y-0.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-semibold text-slate-800">{n.recipientName}</span>
                                                <Badge variant="outline" className={`text-[10px] font-semibold ring-1 ring-inset ${notifStatusStyle[n.status] || ''}`}>{n.status}</Badge>
                                            </div>
                                            <div className="text-xs text-slate-500">{n.channel} · {n.recipientContact}</div>
                                            <div className="text-xs text-slate-400">
                                                Enviada: {n.sentAt ? new Date(n.sentAt).toLocaleString('es-CO') : 'pendiente'}
                                                {n.acknowledgedAt && ` · Confirmada: ${new Date(n.acknowledgedAt).toLocaleString('es-CO')}`}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 shrink-0">
                                            {n.status === RecallNotificationStatus.PENDIENTE && (
                                                <Button size="sm" variant="outline" onClick={() => model.quickUpdateRecallNotificationStatus(n.id, RecallNotificationStatus.ENVIADA)} className="rounded-lg h-7 text-[11px]">Enviada</Button>
                                            )}
                                            {n.status !== RecallNotificationStatus.CONFIRMADA && (
                                                <Button size="sm" variant="outline" onClick={() => model.quickUpdateRecallNotificationStatus(n.id, RecallNotificationStatus.CONFIRMADA)} className="rounded-lg h-7 text-[11px]">Confirmar</Button>
                                            )}
                                            {n.status !== RecallNotificationStatus.FALLIDA && (
                                                <Button size="sm" variant="outline" onClick={() => model.quickUpdateRecallNotificationStatus(n.id, RecallNotificationStatus.FALLIDA)} className="rounded-lg h-7 text-[11px] text-red-600 border-red-100 hover:bg-red-50">Fallida</Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </TabsContent>
    );
}
