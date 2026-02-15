import { ChangeControlStatus, ChangeControlType, ChangeImpactLevel } from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { QualityComplianceModel } from '../types';

export function QualityChangeControlTab({ model }: { model: QualityComplianceModel }) {
    return (
        <TabsContent value="change-control" className="space-y-4">
            <Card>
                <CardHeader><CardTitle>Solicitud de Control de Cambios</CardTitle></CardHeader>
                <CardContent>
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={model.handleCreateChangeControl}>
                        <div className="space-y-1">
                            <Label>Título</Label>
                            <Input value={model.changeControlForm.title} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, title: e.target.value }))} required />
                        </div>
                        <div className="space-y-1">
                            <Label>Solicitante</Label>
                            <Input value={model.changeControlForm.requestedBy} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, requestedBy: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Tipo</Label>
                            <select
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                                value={model.changeControlForm.type}
                                onChange={(e) => model.setChangeControlForm((p) => ({ ...p, type: e.target.value as ChangeControlType }))}
                            >
                                {Object.values(ChangeControlType).map((v) => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label>Impacto</Label>
                            <select
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                                value={model.changeControlForm.impactLevel}
                                onChange={(e) => model.setChangeControlForm((p) => ({ ...p, impactLevel: e.target.value as ChangeImpactLevel }))}
                            >
                                {Object.values(ChangeImpactLevel).map((v) => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <Label>Descripción</Label>
                            <Textarea value={model.changeControlForm.description} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, description: e.target.value }))} required />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <Label>Resumen de evaluación (opcional)</Label>
                            <Textarea value={model.changeControlForm.evaluationSummary} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, evaluationSummary: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Fecha efectiva (opcional)</Label>
                            <Input type="date" value={model.changeControlForm.effectiveDate} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, effectiveDate: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Documento controlado ID (opcional)</Label>
                            <Input value={model.changeControlForm.linkedDocumentId} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, linkedDocumentId: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Orden de producción ID (opcional)</Label>
                            <Input value={model.changeControlForm.affectedProductionOrderId} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, affectedProductionOrderId: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Lote afectado ID (opcional)</Label>
                            <Input value={model.changeControlForm.affectedProductionBatchId} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, affectedProductionBatchId: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Lote antes cambio (opcional)</Label>
                            <Input value={model.changeControlForm.beforeChangeBatchCode} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, beforeChangeBatchCode: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Lote después cambio (opcional)</Label>
                            <Input value={model.changeControlForm.afterChangeBatchCode} onChange={(e) => model.setChangeControlForm((p) => ({ ...p, afterChangeBatchCode: e.target.value }))} />
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <Button type="submit" disabled={model.creatingChangeControl}>
                                {model.creatingChangeControl ? 'Guardando...' : 'Crear control de cambio'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Controles de Cambio ({model.changeControls.length})</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    {model.loadingChangeControls ? <div>Cargando...</div> : model.changeControls.length === 0 ? <div className="text-sm text-slate-500">Sin cambios registrados.</div> : model.changeControls.map((row) => (
                        <div key={row.id} className="border rounded-md p-3 flex items-start justify-between gap-4">
                            <div>
                                <div className="font-medium">{row.code} - {row.title}</div>
                                <div className="text-sm text-slate-600">{row.description}</div>
                                <div className="text-xs text-slate-500 mt-1">Tipo: {row.type} | Impacto: {row.impactLevel} | Lote: {row.affectedProductionBatchId || 'N/A'}</div>
                                <div className="text-xs text-slate-500">Antes: {row.beforeChangeBatchCode || 'N/A'} | Después: {row.afterChangeBatchCode || 'N/A'}</div>
                                <div className="text-xs text-slate-500">Aprobaciones: {row.approvals?.length || 0}</div>
                                <div className="flex gap-2 mt-2"><Badge variant="outline">{row.status}</Badge></div>
                            </div>
                            <div className="flex gap-2">
                                {row.status !== ChangeControlStatus.APROBADO ? (
                                    <>
                                        <Button size="sm" variant="outline" onClick={() => model.quickAddApproval(row.id)}>Aprobar rol</Button>
                                        <Button size="sm" variant="outline" onClick={() => model.quickApproveChangeControl(row.id)}>Marcar aprobado</Button>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </TabsContent>
    );
}
