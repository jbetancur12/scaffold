import { BatchReleaseStatus } from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { QualityComplianceModel } from '../types';

const shortId = (value?: string) => {
  if (!value) return 'N/A';
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
};

export function QualityBatchReleaseTab({ model }: { model: QualityComplianceModel }) {
  return (
                <TabsContent value="batch-release" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Checklist de Liberación QA</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={model.handleUpsertBatchReleaseChecklist}>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>ID Lote de producción</Label>
                                    <Input
                                        value={model.batchReleaseForm.productionBatchId}
                                        onChange={(e) => model.setBatchReleaseForm((p) => ({ ...p, productionBatchId: e.target.value }))}
                                        placeholder="UUID del lote"
                                        required
                                    />
                                </div>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={model.batchReleaseForm.qcApproved}
                                        onChange={(e) => model.setBatchReleaseForm((p) => ({ ...p, qcApproved: e.target.checked }))}
                                    />
                                    QC aprobado
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={model.batchReleaseForm.labelingValidated}
                                        onChange={(e) => model.setBatchReleaseForm((p) => ({ ...p, labelingValidated: e.target.checked }))}
                                    />
                                    Etiquetado validado
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={model.batchReleaseForm.documentsCurrent}
                                        onChange={(e) => model.setBatchReleaseForm((p) => ({ ...p, documentsCurrent: e.target.checked }))}
                                    />
                                    Documentación vigente
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={model.batchReleaseForm.evidencesComplete}
                                        onChange={(e) => model.setBatchReleaseForm((p) => ({ ...p, evidencesComplete: e.target.checked }))}
                                    />
                                    Evidencias completas
                                </label>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Notas de checklist (opcional)</Label>
                                    <Textarea
                                        value={model.batchReleaseForm.checklistNotes}
                                        onChange={(e) => model.setBatchReleaseForm((p) => ({ ...p, checklistNotes: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Motivo de rechazo (opcional)</Label>
                                    <Textarea
                                        value={model.batchReleaseForm.rejectedReason}
                                        onChange={(e) => model.setBatchReleaseForm((p) => ({ ...p, rejectedReason: e.target.value }))}
                                        placeholder="Si se llena, el lote queda rechazado"
                                    />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={model.savingBatchReleaseChecklist}>
                                        {model.savingBatchReleaseChecklist ? 'Guardando...' : 'Guardar checklist'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Liberaciones QA ({model.batchReleases.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {model.loadingBatchReleases ? <div>Cargando...</div> : model.batchReleases.length === 0 ? <div className="text-sm text-slate-500">Sin liberaciones.</div> : model.batchReleases.map((release) => (
                                <div key={release.id} className="border rounded-md p-3 flex items-start justify-between gap-4">
                                    <div>
                                        <div className="font-medium">
                                            Lote: {release.productionBatch?.code || shortId(release.productionBatchId)}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            ID: <span title={release.productionBatchId}>{release.productionBatchId}</span>
                                        </div>
                                        <div className="text-xs text-slate-600 mt-1">
                                            QC: {release.qcApproved ? 'ok' : 'pendiente'} | Etiquetado: {release.labelingValidated ? 'ok' : 'pendiente'} | Docs: {release.documentsCurrent ? 'ok' : 'pendiente'} | Evidencias: {release.evidencesComplete ? 'ok' : 'pendiente'}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            Revisó: {release.reviewedBy || 'N/A'} | Firma: {release.signedBy || 'N/A'}
                                        </div>
                                        {release.rejectedReason ? (
                                            <div className="text-xs text-red-600 mt-1">Motivo rechazo: {release.rejectedReason}</div>
                                        ) : null}
                                        <Badge variant="outline" className="mt-2">
                                            {release.status === BatchReleaseStatus.PENDIENTE_LIBERACION
                                                ? 'pendiente_liberacion'
                                                : release.status === BatchReleaseStatus.LIBERADO_QA
                                                    ? 'liberado_qa'
                                                    : 'rechazado'}
                                        </Badge>
                                    </div>
                                    <div className="flex gap-2">
                                        {release.status === BatchReleaseStatus.PENDIENTE_LIBERACION ? (
                                            <Button
                                                size="sm"
                                                disabled={model.signingBatchRelease}
                                                onClick={() => model.quickSignBatchRelease(release.productionBatchId)}
                                            >
                                                {model.signingBatchRelease ? 'Firmando...' : 'Firmar liberación'}
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
