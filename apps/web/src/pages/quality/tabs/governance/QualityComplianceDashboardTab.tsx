import { DocumentProcess, QualityRiskControlStatus } from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { QualityComplianceModel } from '../types';

export function QualityComplianceDashboardTab({ model }: { model: QualityComplianceModel }) {
  return (
                <TabsContent value="compliance" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Tablero de Cumplimiento</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {model.loadingComplianceDashboard ? <div>Cargando...</div> : !model.complianceDashboard ? <div className="text-sm text-slate-500">Sin datos.</div> : (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div className="border rounded-md p-3">
                                        <div className="text-xs text-slate-500">NC abiertas</div>
                                        <div className="text-2xl font-semibold">{model.complianceDashboard.nonConformitiesOpen}</div>
                                    </div>
                                    <div className="border rounded-md p-3">
                                        <div className="text-xs text-slate-500">CAPA abiertas</div>
                                        <div className="text-2xl font-semibold">{model.complianceDashboard.capasOpen}</div>
                                    </div>
                                    <div className="border rounded-md p-3">
                                        <div className="text-xs text-slate-500">Tecnovigilancia abierta</div>
                                        <div className="text-2xl font-semibold">{model.complianceDashboard.technovigilanceOpen}</div>
                                    </div>
                                    <div className="border rounded-md p-3">
                                        <div className="text-xs text-slate-500">Recalls abiertos</div>
                                        <div className="text-2xl font-semibold">{model.complianceDashboard.recallsOpen}</div>
                                    </div>
                                    <div className="border rounded-md p-3">
                                        <div className="text-xs text-slate-500">Cobertura recall promedio</div>
                                        <div className="text-2xl font-semibold">{model.complianceDashboard.recallCoverageAverage}%</div>
                                    </div>
                                    <div className="border rounded-md p-3">
                                        <div className="text-xs text-slate-500">Eventos auditoría (30 días)</div>
                                        <div className="text-2xl font-semibold">{model.complianceDashboard.auditEventsLast30Days}</div>
                                    </div>
                                    <div className="border rounded-md p-3">
                                        <div className="text-xs text-slate-500">% Documentos aprobados</div>
                                        <div className="text-2xl font-semibold">{model.complianceDashboard.documentApprovalRate}%</div>
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" disabled={model.exportingCompliance} onClick={() => model.handleExportCompliance('csv')}>
                                    {model.exportingCompliance ? 'Generando...' : 'Exportar CSV'}
                                </Button>
                                <Button variant="outline" disabled={model.exportingCompliance} onClick={() => model.handleExportCompliance('json')}>
                                    {model.exportingCompliance ? 'Generando...' : 'Exportar JSON'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Matriz de Riesgos y Controles</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={model.handleCreateRiskControl}>
                                <div className="space-y-1">
                                    <Label>Proceso</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={model.riskControlForm.process}
                                        onChange={(e) => model.setRiskControlForm((p) => ({ ...p, process: e.target.value as DocumentProcess }))}
                                    >
                                        <option value={DocumentProcess.PRODUCCION}>Producción</option>
                                        <option value={DocumentProcess.CONTROL_CALIDAD}>Control de calidad</option>
                                        <option value={DocumentProcess.EMPAQUE}>Empaque</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Rol responsable</Label>
                                    <Input value={model.riskControlForm.ownerRole} onChange={(e) => model.setRiskControlForm((p) => ({ ...p, ownerRole: e.target.value }))} required />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Riesgo</Label>
                                    <Textarea value={model.riskControlForm.risk} onChange={(e) => model.setRiskControlForm((p) => ({ ...p, risk: e.target.value }))} required />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Control</Label>
                                    <Textarea value={model.riskControlForm.control} onChange={(e) => model.setRiskControlForm((p) => ({ ...p, control: e.target.value }))} required />
                                </div>
                                <div className="space-y-1">
                                    <Label>Estado</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={model.riskControlForm.status}
                                        onChange={(e) => model.setRiskControlForm((p) => ({ ...p, status: e.target.value as QualityRiskControlStatus }))}
                                    >
                                        {Object.values(QualityRiskControlStatus).map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Evidencia (opcional)</Label>
                                    <Input value={model.riskControlForm.evidenceRef} onChange={(e) => model.setRiskControlForm((p) => ({ ...p, evidenceRef: e.target.value }))} />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={model.creatingRiskControl}>
                                        {model.creatingRiskControl ? 'Guardando...' : 'Agregar riesgo/control'}
                                    </Button>
                                </div>
                            </form>

                            <div className="space-y-2">
                                {model.loadingRiskControls ? <div>Cargando...</div> : model.riskControls.length === 0 ? <div className="text-sm text-slate-500">Sin riesgos/controles.</div> : model.riskControls.map((r) => (
                                    <div key={r.id} className="border rounded-md p-3">
                                        <div className="font-medium">{r.process} | {r.ownerRole}</div>
                                        <div className="text-xs text-slate-600 mt-1">Riesgo: {r.risk}</div>
                                        <div className="text-xs text-slate-600 mt-1">Control: {r.control}</div>
                                        <Badge variant="outline" className="mt-2">{r.status}</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Evidencia de Capacitación por Rol</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={model.handleCreateTrainingEvidence}>
                                <div className="space-y-1">
                                    <Label>Rol</Label>
                                    <Input value={model.trainingForm.role} onChange={(e) => model.setTrainingForm((p) => ({ ...p, role: e.target.value }))} required />
                                </div>
                                <div className="space-y-1">
                                    <Label>Nombre del colaborador</Label>
                                    <Input value={model.trainingForm.personName} onChange={(e) => model.setTrainingForm((p) => ({ ...p, personName: e.target.value }))} required />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Tema de capacitación</Label>
                                    <Input value={model.trainingForm.trainingTopic} onChange={(e) => model.setTrainingForm((p) => ({ ...p, trainingTopic: e.target.value }))} required />
                                </div>
                                <div className="space-y-1">
                                    <Label>Fecha completada</Label>
                                    <Input type="date" value={model.trainingForm.completedAt} onChange={(e) => model.setTrainingForm((p) => ({ ...p, completedAt: e.target.value }))} required />
                                </div>
                                <div className="space-y-1">
                                    <Label>Válido hasta (opcional)</Label>
                                    <Input type="date" value={model.trainingForm.validUntil} onChange={(e) => model.setTrainingForm((p) => ({ ...p, validUntil: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Instructor (opcional)</Label>
                                    <Input value={model.trainingForm.trainerName} onChange={(e) => model.setTrainingForm((p) => ({ ...p, trainerName: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Evidencia (opcional)</Label>
                                    <Input value={model.trainingForm.evidenceRef} onChange={(e) => model.setTrainingForm((p) => ({ ...p, evidenceRef: e.target.value }))} />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={model.creatingTrainingEvidence}>
                                        {model.creatingTrainingEvidence ? 'Guardando...' : 'Registrar capacitación'}
                                    </Button>
                                </div>
                            </form>

                            <div className="space-y-2">
                                {model.loadingTrainingEvidence ? <div>Cargando...</div> : model.trainingEvidence.length === 0 ? <div className="text-sm text-slate-500">Sin evidencias de capacitación.</div> : model.trainingEvidence.map((t) => (
                                    <div key={t.id} className="border rounded-md p-3">
                                        <div className="font-medium">{t.role} | {t.personName}</div>
                                        <div className="text-xs text-slate-600 mt-1">Tema: {t.trainingTopic}</div>
                                        <div className="text-xs text-slate-600 mt-1">
                                            Completada: {new Date(t.completedAt).toLocaleDateString()} | Vence: {t.validUntil ? new Date(t.validUntil).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

  );
}
