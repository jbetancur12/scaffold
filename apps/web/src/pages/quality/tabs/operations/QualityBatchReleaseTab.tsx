import { useState } from 'react';
import { BatchReleaseStatus } from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DocumentApprovalMethod } from '@scaffold/types';
import { CheckCircle, ClipboardList, ShieldCheck, Save, Plus, X } from 'lucide-react';
import type { QualityComplianceModel } from '../types';

const shortId = (value?: string) => {
    if (!value) return 'N/A';
    return value.length > 12 ? `${value.slice(0, 8)}...` : value;
};

const statusStyle: Record<string, string> = {
    [BatchReleaseStatus.PENDIENTE_LIBERACION]: 'bg-amber-50 text-amber-700 border-amber-200',
    [BatchReleaseStatus.LIBERADO_QA]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rechazado: 'bg-red-50 text-red-600 border-red-200',
};

const statusLabel: Record<string, string> = {
    [BatchReleaseStatus.PENDIENTE_LIBERACION]: 'Pendiente liberación',
    [BatchReleaseStatus.LIBERADO_QA]: 'Liberado QA',
    rechazado: 'Rechazado',
};

export function QualityBatchReleaseTab({ model }: { model: QualityComplianceModel }) {
    const [signModalOpen, setSignModalOpen] = useState(false);
    const [signingBatchId, setSigningBatchId] = useState('');
    const [signerName, setSignerName] = useState('sistema-web');
    const [signMethod, setSignMethod] = useState<DocumentApprovalMethod>(DocumentApprovalMethod.FIRMA_MANUAL);
    const [showForm, setShowForm] = useState(false);

    const openSignModal = (productionBatchId: string) => {
        setSigningBatchId(productionBatchId);
        setSignerName('sistema-web');
        setSignMethod(DocumentApprovalMethod.FIRMA_MANUAL);
        setSignModalOpen(true);
    };

    const submitSign = async () => {
        if (!signingBatchId) return;
        if (!signerName.trim() || signerName.trim().length < 2) return;
        await model.signBatchReleaseWithPayload({
            productionBatchId: signingBatchId,
            actor: 'sistema-web',
            approvalMethod: signMethod,
            approvalSignature: signerName.trim(),
        });
        setSignModalOpen(false);
    };

    const handleSubmitChecklist = async (e: React.FormEvent) => {
        await model.handleUpsertBatchReleaseChecklist(e);
        setShowForm(false);
    };

    const pending = model.batchReleases.filter((r) => r.status === BatchReleaseStatus.PENDIENTE_LIBERACION).length;
    const released = model.batchReleases.filter((r) => r.status === BatchReleaseStatus.LIBERADO_QA).length;
    const rejected = model.batchReleases.filter(
        (r) => r.status !== BatchReleaseStatus.PENDIENTE_LIBERACION && r.status !== BatchReleaseStatus.LIBERADO_QA
    ).length;

    return (
        <TabsContent value="batch-release" className="space-y-5">

            {/* Hero Header with KPI bar */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-50/40 to-transparent pointer-events-none" />
                    <div className="relative flex items-start gap-4">
                        <div className="p-2.5 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
                            <ShieldCheck className="h-6 w-6 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Liberación de Lotes QA</h2>
                            <p className="text-slate-500 text-sm mt-0.5">Checklist y firma de liberación para lotes de producción.</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100">
                    {[
                        { label: 'Total', value: model.batchReleases.length, color: 'text-slate-700', bg: '' },
                        { label: 'Pendientes', value: pending, color: 'text-amber-700', bg: 'bg-amber-50/60' },
                        { label: 'Liberados', value: released, color: 'text-emerald-700', bg: 'bg-emerald-50/60' },
                        { label: 'Rechazados', value: rejected, color: 'text-red-600', bg: 'bg-red-50/60' },
                    ].map(({ label, value, color, bg }) => (
                        <div key={label} className={`flex flex-col items-center py-3 px-4 ${bg}`}>
                            <span className={`text-2xl font-bold ${color}`}>{value}</span>
                            <span className="text-xs text-slate-500 font-medium mt-0.5">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Releases List — contains the "new" form inline */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

                {/* List header with "+ Nueva liberación" button */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-violet-500" />
                    <h3 className="font-semibold text-slate-800">Liberaciones QA</h3>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
                        {model.batchReleases.length}
                    </span>
                    <div className="ml-auto">
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setShowForm((v) => !v)}
                            className={showForm
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl h-8 text-xs border border-slate-200'
                                : 'bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-8 text-xs font-medium'}
                        >
                            {showForm ? (
                                <><X className="mr-1.5 h-3.5 w-3.5" />Cancelar</>
                            ) : (
                                <><Plus className="mr-1.5 h-3.5 w-3.5" />Nueva liberación</>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Inline checklist form — collapses when not needed */}
                {showForm && (
                    <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-5">
                        <div className="flex items-center gap-2 mb-4">
                            <ClipboardList className="h-4 w-4 text-violet-500" />
                            <p className="text-sm font-bold text-slate-700">Nuevo checklist de liberación</p>
                        </div>
                        <form className="space-y-4" onSubmit={handleSubmitChecklist}>
                            {/* Batch ID */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">ID Lote de producción</Label>
                                <Input
                                    value={model.batchReleaseForm.productionBatchId}
                                    onChange={(e) => model.setBatchReleaseForm((p) => ({ ...p, productionBatchId: e.target.value }))}
                                    placeholder="UUID del lote"
                                    required
                                    className="h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500 font-mono"
                                />
                            </div>

                            {/* Checklist items */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Verificación previa</p>
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[
                                        { key: 'qcApproved' as const, label: 'QC aprobado' },
                                        { key: 'labelingValidated' as const, label: 'Etiquetado validado' },
                                        { key: 'documentsCurrent' as const, label: 'Documentación vigente' },
                                        { key: 'evidencesComplete' as const, label: 'Evidencias completas' },
                                    ].map(({ key, label }) => {
                                        const checked = model.batchReleaseForm[key] as boolean;
                                        return (
                                            <label key={key} className="flex items-center gap-3 cursor-pointer select-none">
                                                <div
                                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 bg-white'}`}
                                                    onClick={() => model.setBatchReleaseForm((p) => ({ ...p, [key]: !checked }))}
                                                >
                                                    {checked && <CheckCircle className="h-3 w-3 text-white" />}
                                                </div>
                                                <input type="checkbox" className="sr-only" checked={checked}
                                                    onChange={(e) => model.setBatchReleaseForm((p) => ({ ...p, [key]: e.target.checked }))} />
                                                <span className="text-sm text-slate-700">{label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Notes + Rejection */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                        Notas <span className="normal-case text-slate-400">(opcional)</span>
                                    </Label>
                                    <Textarea
                                        value={model.batchReleaseForm.checklistNotes}
                                        onChange={(e) => model.setBatchReleaseForm((p) => ({ ...p, checklistNotes: e.target.value }))}
                                        className="rounded-xl border-slate-200 focus-visible:ring-violet-500 min-h-[72px] resize-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                        Motivo de rechazo <span className="normal-case text-slate-400">(si aplica → rechaza el lote)</span>
                                    </Label>
                                    <Textarea
                                        value={model.batchReleaseForm.rejectedReason}
                                        onChange={(e) => model.setBatchReleaseForm((p) => ({ ...p, rejectedReason: e.target.value }))}
                                        placeholder="Dejar vacío si el lote es aprobado"
                                        className="rounded-xl border-slate-200 focus-visible:ring-red-400 min-h-[72px] resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="rounded-xl border-slate-200 text-slate-600">
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={model.savingBatchReleaseChecklist}
                                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium px-6">
                                    {model.savingBatchReleaseChecklist ? (
                                        <>
                                            <div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Guardar checklist
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Releases list */}
                <div className="p-4 space-y-3">
                    {model.loadingBatchReleases ? (
                        <div className="flex items-center justify-center py-12 text-slate-400">
                            <div className="animate-spin mr-3 h-6 w-6 border-4 border-slate-200 border-t-violet-600 rounded-full" />
                            <span className="text-sm animate-pulse">Cargando liberaciones...</span>
                        </div>
                    ) : model.batchReleases.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">Sin liberaciones registradas.</p>
                            <p className="text-xs mt-1 text-slate-400">Usa el botón "Nueva liberación" para comenzar.</p>
                        </div>
                    ) : (
                        model.batchReleases.map((release) => {
                            const st =
                                release.status === BatchReleaseStatus.PENDIENTE_LIBERACION
                                    ? BatchReleaseStatus.PENDIENTE_LIBERACION
                                    : release.status === BatchReleaseStatus.LIBERADO_QA
                                        ? BatchReleaseStatus.LIBERADO_QA
                                        : 'rechazado';
                            return (
                                <div
                                    key={release.id}
                                    className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 transition-all ${st === BatchReleaseStatus.PENDIENTE_LIBERACION
                                            ? 'border-amber-200 bg-amber-50/30'
                                            : st === BatchReleaseStatus.LIBERADO_QA
                                                ? 'border-emerald-200 bg-emerald-50/30'
                                                : 'border-red-200 bg-red-50/20'
                                        }`}
                                >
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-slate-900 font-mono text-sm">
                                                {release.productionBatch?.code || shortId(release.productionBatchId)}
                                            </span>
                                            <Badge variant="outline" className={`text-[11px] font-semibold ring-1 ring-inset ${statusStyle[st] || ''}`}>
                                                {statusLabel[st] || st}
                                            </Badge>
                                        </div>

                                        {/* Checklist pills */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                { label: 'QC', ok: release.qcApproved },
                                                { label: 'Etiquetado', ok: release.labelingValidated },
                                                { label: 'Docs', ok: release.documentsCurrent },
                                                { label: 'Evidencias', ok: release.evidencesComplete },
                                            ].map(({ label, ok }) => (
                                                <span
                                                    key={label}
                                                    className={`inline-flex items-center gap-1 rounded-lg border text-[11px] font-semibold px-2 py-0.5 ${ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'
                                                        }`}
                                                >
                                                    {ok ? '✓' : '◐'} {label}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="text-xs text-slate-500">
                                            Revisó: <span className="font-medium text-slate-700">{release.reviewedBy || 'N/A'}</span>
                                            &nbsp;·&nbsp;Firma: <span className="font-medium text-slate-700">{release.signedBy || 'N/A'}</span>
                                        </div>

                                        {release.rejectedReason && (
                                            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                                                ⚠ {release.rejectedReason}
                                            </div>
                                        )}
                                    </div>

                                    {release.status === BatchReleaseStatus.PENDIENTE_LIBERACION && (
                                        <Button
                                            size="sm"
                                            disabled={model.signingBatchRelease}
                                            onClick={() => openSignModal(release.productionBatchId)}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-xs h-8 px-4 shrink-0"
                                        >
                                            {model.signingBatchRelease ? (
                                                <>
                                                    <div className="animate-spin mr-1.5 h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full" />
                                                    Firmando...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                                                    Firmar liberación
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Sign Dialog */}
            <Dialog open={signModalOpen} onOpenChange={setSignModalOpen}>
                <DialogContent>
                    <DialogHeader className="pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 rounded-xl">
                                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold text-slate-900">Firmar liberación QA</DialogTitle>
                                <p className="text-xs text-slate-500 mt-0.5">Confirma la firma del responsable de calidad.</p>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">ID Lote</Label>
                            <Input value={signingBatchId} readOnly
                                className="h-10 rounded-xl border-slate-200 bg-slate-50 font-mono text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Firmado por</Label>
                            <Input
                                value={signerName}
                                onChange={(e) => setSignerName(e.target.value)}
                                placeholder="Nombre del firmante"
                                className="h-10 rounded-xl border-slate-200 focus-visible:ring-emerald-500"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Método de firma</Label>
                            <select
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={signMethod}
                                onChange={(e) => setSignMethod(e.target.value as DocumentApprovalMethod)}
                            >
                                <option value={DocumentApprovalMethod.FIRMA_MANUAL}>Firma manual</option>
                                <option value={DocumentApprovalMethod.FIRMA_DIGITAL}>Firma digital</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter className="pt-3 border-t border-slate-100 gap-2">
                        <Button variant="outline" onClick={() => setSignModalOpen(false)} className="rounded-xl border-slate-200">
                            Cancelar
                        </Button>
                        <Button
                            onClick={submitSign}
                            disabled={model.signingBatchRelease || signerName.trim().length < 2}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium px-6"
                        >
                            {model.signingBatchRelease ? (
                                <>
                                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                                    Firmando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Confirmar firma
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TabsContent>
    );
}
