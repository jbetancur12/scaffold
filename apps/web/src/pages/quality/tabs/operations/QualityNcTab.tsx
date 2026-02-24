import { NonConformityStatus, QualitySeverity, UserRole } from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useHasRole } from '@/components/auth/RoleGuard';
import type { QualityComplianceModel } from '../types';

export function QualityNcTab({ model }: { model: QualityComplianceModel }) {
  const { hasRole } = useHasRole();
  const canManageNc = Boolean(hasRole([UserRole.ADMIN, UserRole.SUPERADMIN]));

  return (
                <TabsContent value="nc" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Registrar No Conformidad</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={model.handleCreateNc}>
                                <div className="space-y-1">
                                    <Label>Título</Label>
                                    <Input value={model.ncForm.title} onChange={(e) => model.setNcForm((p) => ({ ...p, title: e.target.value }))} required disabled={!canManageNc} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Severidad</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={model.ncForm.severity}
                                        onChange={(e) => model.setNcForm((p) => ({ ...p, severity: e.target.value as QualitySeverity }))}
                                        disabled={!canManageNc}
                                    >
                                        {Object.values(QualitySeverity).map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Descripción</Label>
                                    <Textarea value={model.ncForm.description} onChange={(e) => model.setNcForm((p) => ({ ...p, description: e.target.value }))} required disabled={!canManageNc} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Origen</Label>
                                    <Input value={model.ncForm.source} onChange={(e) => model.setNcForm((p) => ({ ...p, source: e.target.value }))} disabled={!canManageNc} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Inspección recepción vinculada</Label>
                                    <div className="flex gap-2">
                                      <Input
                                        value={model.ncForm.incomingInspectionId || ''}
                                        onChange={(e) => model.setNcForm((p) => ({ ...p, incomingInspectionId: e.target.value }))}
                                        placeholder="UUID de inspección (opcional)"
                                        disabled={!canManageNc}
                                      />
                                      {model.ncForm.incomingInspectionId ? (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => model.setNcForm((p) => ({ ...p, incomingInspectionId: '' }))}
                                          disabled={!canManageNc}
                                        >
                                          Limpiar
                                        </Button>
                                      ) : null}
                                    </div>
                                </div>
                                <div className="flex items-end justify-end">
                                    <Button type="submit" disabled={!canManageNc || model.creatingNc}>{model.creatingNc ? 'Guardando...' : 'Crear No Conformidad'}</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>No Conformidades ({model.nonConformities.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {model.loadingNc ? <div>Cargando...</div> : model.nonConformities.length === 0 ? <div className="text-sm text-slate-500">Sin registros.</div> : model.nonConformities.map((n) => (
                                <div key={n.id} className="border rounded-md p-3 flex items-start justify-between gap-4">
                                    <div>
                                        <div className="font-medium">{n.title}</div>
                                        <div className="text-sm text-slate-600">{n.description}</div>
                                        <div className="text-xs text-slate-500 mt-1">
                                          {n.source} | {n.severity}
                                          {n.incomingInspectionId ? ` | Inspección: ${n.incomingInspectionId}` : ''}
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <Badge variant="outline">{n.status}</Badge>
                                        </div>
                                    </div>
                                    {n.status !== NonConformityStatus.CERRADA ? (
                                        <Button size="sm" variant="outline" onClick={() => model.quickCloseNc(n.id)} disabled={!canManageNc}>Cerrar</Button>
                                    ) : null}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

  );
}
