import { OosCaseStatus, ProcessDeviationStatus } from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { QualityComplianceModel } from '../types';

export function QualityDeviationOosTab({ model }: { model: QualityComplianceModel }) {
    return (
        <TabsContent value="deviations-oos" className="space-y-4">
            <Card>
                <CardHeader><CardTitle>Registrar Desviación de Proceso</CardTitle></CardHeader>
                <CardContent>
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={model.handleCreateProcessDeviation}>
                        <div className="space-y-1">
                            <Label>Título</Label>
                            <Input value={model.processDeviationForm.title} onChange={(e) => model.setProcessDeviationForm((p) => ({ ...p, title: e.target.value }))} required />
                        </div>
                        <div className="space-y-1">
                            <Label>Clasificación</Label>
                            <Input value={model.processDeviationForm.classification} onChange={(e) => model.setProcessDeviationForm((p) => ({ ...p, classification: e.target.value }))} />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <Label>Descripción</Label>
                            <Textarea value={model.processDeviationForm.description} onChange={(e) => model.setProcessDeviationForm((p) => ({ ...p, description: e.target.value }))} required />
                        </div>
                        <div className="space-y-1">
                            <Label>ID lote (opcional)</Label>
                            <Input value={model.processDeviationForm.productionBatchId} onChange={(e) => model.setProcessDeviationForm((p) => ({ ...p, productionBatchId: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Acción de contención (opcional)</Label>
                            <Input value={model.processDeviationForm.containmentAction} onChange={(e) => model.setProcessDeviationForm((p) => ({ ...p, containmentAction: e.target.value }))} />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <Label>Resumen de investigación (opcional)</Label>
                            <Textarea value={model.processDeviationForm.investigationSummary} onChange={(e) => model.setProcessDeviationForm((p) => ({ ...p, investigationSummary: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>CAPA relacionado (opcional)</Label>
                            <select
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                                value={model.processDeviationForm.capaActionId}
                                onChange={(e) => model.setProcessDeviationForm((p) => ({ ...p, capaActionId: e.target.value }))}
                            >
                                <option value="">Sin CAPA</option>
                                {model.capas.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.id.slice(0, 8)}... | {c.status}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <Button type="submit" disabled={model.creatingProcessDeviation}>{model.creatingProcessDeviation ? 'Guardando...' : 'Crear desviación'}</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Registrar Caso OOS</CardTitle></CardHeader>
                <CardContent>
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={model.handleCreateOosCase}>
                        <div className="space-y-1">
                            <Label>Prueba</Label>
                            <Input value={model.oosCaseForm.testName} onChange={(e) => model.setOosCaseForm((p) => ({ ...p, testName: e.target.value }))} required />
                        </div>
                        <div className="space-y-1">
                            <Label>Resultado</Label>
                            <Input value={model.oosCaseForm.resultValue} onChange={(e) => model.setOosCaseForm((p) => ({ ...p, resultValue: e.target.value }))} required />
                        </div>
                        <div className="space-y-1">
                            <Label>Especificación</Label>
                            <Input value={model.oosCaseForm.specification} onChange={(e) => model.setOosCaseForm((p) => ({ ...p, specification: e.target.value }))} required />
                        </div>
                        <div className="space-y-1">
                            <Label>ID lote (opcional)</Label>
                            <Input value={model.oosCaseForm.productionBatchId} onChange={(e) => model.setOosCaseForm((p) => ({ ...p, productionBatchId: e.target.value }))} />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <Label>Resumen de investigación (opcional)</Label>
                            <Textarea value={model.oosCaseForm.investigationSummary} onChange={(e) => model.setOosCaseForm((p) => ({ ...p, investigationSummary: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>CAPA relacionado (opcional)</Label>
                            <select
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                                value={model.oosCaseForm.capaActionId}
                                onChange={(e) => model.setOosCaseForm((p) => ({ ...p, capaActionId: e.target.value }))}
                            >
                                <option value="">Sin CAPA</option>
                                {model.capas.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.id.slice(0, 8)}... | {c.status}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <Button type="submit" disabled={model.creatingOosCase}>{model.creatingOosCase ? 'Guardando...' : 'Crear OOS'}</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Desviaciones ({model.processDeviations.length})</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    {model.loadingProcessDeviations ? <div>Cargando...</div> : model.processDeviations.length === 0 ? <div className="text-sm text-slate-500">Sin desviaciones.</div> : model.processDeviations.map((row) => (
                        <div key={row.id} className="border rounded-md p-3 flex items-start justify-between gap-4">
                            <div>
                                <div className="font-medium">{row.code} - {row.title}</div>
                                <div className="text-sm text-slate-600">{row.description}</div>
                                <div className="text-xs text-slate-500 mt-1">Clasificación: {row.classification} | Lote: {row.productionBatchId || 'N/A'}</div>
                                <div className="text-xs text-slate-500">CAPA: {row.capaActionId ? row.capaActionId : 'Sin vínculo'}</div>
                                <div className="flex gap-2 mt-2"><Badge variant="outline">{row.status}</Badge></div>
                            </div>
                            {row.status !== ProcessDeviationStatus.CERRADA ? (
                                <Button size="sm" variant="outline" onClick={() => model.quickCloseProcessDeviation(row.id)}>Cerrar</Button>
                            ) : null}
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Casos OOS ({model.oosCases.length})</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    {model.loadingOosCases ? <div>Cargando...</div> : model.oosCases.length === 0 ? <div className="text-sm text-slate-500">Sin casos OOS.</div> : model.oosCases.map((row) => (
                        <div key={row.id} className="border rounded-md p-3 flex items-start justify-between gap-4">
                            <div>
                                <div className="font-medium">{row.code} - {row.testName}</div>
                                <div className="text-sm text-slate-600">Resultado: {row.resultValue} | Especificación: {row.specification}</div>
                                <div className="text-xs text-slate-500 mt-1">Lote: {row.productionBatchId || 'N/A'} | Bloqueado: {new Date(row.blockedAt).toLocaleString('es-CO')}</div>
                                <div className="text-xs text-slate-500">CAPA: {row.capaActionId ? row.capaActionId : 'Sin vínculo'}</div>
                                <div className="flex gap-2 mt-2"><Badge variant="outline">{row.status}</Badge></div>
                            </div>
                            {row.status !== OosCaseStatus.CERRADO ? (
                                <Button size="sm" variant="outline" onClick={() => model.quickCloseOosCase(row.id)}>Cerrar</Button>
                            ) : null}
                        </div>
                    ))}
                </CardContent>
            </Card>
        </TabsContent>
    );
}
