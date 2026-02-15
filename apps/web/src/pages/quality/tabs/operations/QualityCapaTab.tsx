import { CapaStatus } from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { QualityComplianceModel } from '../types';

export function QualityCapaTab({ model }: { model: QualityComplianceModel }) {
  return (
                <TabsContent value="capa" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Crear CAPA</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={model.handleCreateCapa}>
                                <div className="space-y-1">
                                    <Label>No Conformidad</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={model.capaForm.nonConformityId}
                                        onChange={(e) => model.setCapaForm((p) => ({ ...p, nonConformityId: e.target.value }))}
                                    >
                                        <option value="">Selecciona...</option>
                                        {model.openNc.map((n) => (
                                            <option key={n.id} value={n.id}>{n.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Responsable</Label>
                                    <Input value={model.capaForm.owner} onChange={(e) => model.setCapaForm((p) => ({ ...p, owner: e.target.value }))} />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Plan de acción</Label>
                                    <Textarea value={model.capaForm.actionPlan} onChange={(e) => model.setCapaForm((p) => ({ ...p, actionPlan: e.target.value }))} required />
                                </div>
                                <div className="space-y-1">
                                    <Label>Fecha objetivo</Label>
                                    <Input type="date" value={model.capaForm.dueDate} onChange={(e) => model.setCapaForm((p) => ({ ...p, dueDate: e.target.value }))} />
                                </div>
                                <div className="flex items-end justify-end">
                                    <Button type="submit" disabled={model.creatingCapa}>{model.creatingCapa ? 'Guardando...' : 'Crear CAPA'}</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Acciones CAPA ({model.capas.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {model.loadingCapas ? <div>Cargando...</div> : model.capas.length === 0 ? <div className="text-sm text-slate-500">Sin registros.</div> : model.capas.map((c) => (
                                <div key={c.id} className="border rounded-md p-3 flex items-start justify-between gap-4">
                                    <div>
                                        <div className="font-medium">{c.actionPlan}</div>
                                        <div className="text-sm text-slate-600">NC: {c.nonConformityId}</div>
                                        <div className="text-xs text-slate-500 mt-1">Responsable: {c.owner || 'N/A'}</div>
                                        <Badge variant="outline" className="mt-2">{c.status}</Badge>
                                    </div>
                                    {c.status !== CapaStatus.CERRADA ? (
                                        <Button size="sm" variant="outline" onClick={() => model.quickCloseCapa(c.id)}>Cerrar</Button>
                                    ) : null}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

  );
}
