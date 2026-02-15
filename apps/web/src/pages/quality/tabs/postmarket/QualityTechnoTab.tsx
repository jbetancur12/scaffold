import {
  TechnovigilanceCaseType,
  TechnovigilanceCausality,
  TechnovigilanceSeverity,
  TechnovigilanceStatus,
} from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { QualityComplianceModel } from '../types';

export function QualityTechnoTab({ model }: { model: QualityComplianceModel }) {
  return (
                <TabsContent value="techno" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Registrar Caso de Tecnovigilancia</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={model.handleCreateTechnoCase}>
                                <div className="space-y-1">
                                    <Label>Título</Label>
                                    <Input
                                        value={model.technoForm.title}
                                        onChange={(e) => model.setTechnoForm((p) => ({ ...p, title: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Tipo</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={model.technoForm.type}
                                        onChange={(e) => model.setTechnoForm((p) => ({ ...p, type: e.target.value as TechnovigilanceCaseType }))}
                                    >
                                        <option value={TechnovigilanceCaseType.QUEJA}>Queja</option>
                                        <option value={TechnovigilanceCaseType.EVENTO_ADVERSO}>Evento adverso</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Severidad</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={model.technoForm.severity}
                                        onChange={(e) => model.setTechnoForm((p) => ({ ...p, severity: e.target.value as TechnovigilanceSeverity }))}
                                    >
                                        {Object.values(TechnovigilanceSeverity).map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Causalidad (opcional)</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={model.technoForm.causality}
                                        onChange={(e) => model.setTechnoForm((p) => ({ ...p, causality: e.target.value as '' | TechnovigilanceCausality }))}
                                    >
                                        <option value="">Sin definir</option>
                                        {Object.values(TechnovigilanceCausality).map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Descripción</Label>
                                    <Textarea
                                        value={model.technoForm.description}
                                        onChange={(e) => model.setTechnoForm((p) => ({ ...p, description: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Código de lote (opcional)</Label>
                                    <Input
                                        value={model.technoForm.lotCode}
                                        onChange={(e) => model.setTechnoForm((p) => ({ ...p, lotCode: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Serial (opcional)</Label>
                                    <Input
                                        value={model.technoForm.serialCode}
                                        onChange={(e) => model.setTechnoForm((p) => ({ ...p, serialCode: e.target.value }))}
                                    />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={model.creatingTechnoCase}>
                                        {model.creatingTechnoCase ? 'Guardando...' : 'Crear caso'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Casos ({model.technovigilanceCases.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {model.loadingTechno ? <div>Cargando...</div> : model.technovigilanceCases.length === 0 ? <div className="text-sm text-slate-500">Sin casos registrados.</div> : model.technovigilanceCases.map((c) => (
                                <div key={c.id} className="border rounded-md p-3 flex items-start justify-between gap-4">
                                    <div>
                                        <div className="font-medium">{c.title}</div>
                                        <div className="text-sm text-slate-600">{c.description}</div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            Tipo: {c.type} | Severidad: {c.severity} | Causalidad: {c.causality || 'sin definir'}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            Lote: {c.lotCode || 'N/A'} | Serial: {c.serialCode || 'N/A'} | INVIMA: {c.reportedToInvima ? 'Reportado' : 'Pendiente'}
                                        </div>
                                        {c.reportedToInvima ? (
                                            <div className="text-xs text-slate-500 mt-1">
                                                Radicado: {c.invimaReportNumber || 'N/A'} | Canal: {c.invimaReportChannel || 'N/A'}
                                            </div>
                                        ) : null}
                                        <Badge variant="outline" className="mt-2">{c.status}</Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-2 justify-end">
                                        {c.status !== TechnovigilanceStatus.EN_INVESTIGACION ? (
                                            <Button size="sm" variant="outline" onClick={() => model.quickSetTechnoStatus(c.id, TechnovigilanceStatus.EN_INVESTIGACION)}>
                                                Investigar
                                            </Button>
                                        ) : null}
                                        {c.status !== TechnovigilanceStatus.CERRADO ? (
                                            <Button size="sm" variant="outline" onClick={() => model.quickSetTechnoStatus(c.id, TechnovigilanceStatus.CERRADO)}>
                                                Cerrar
                                            </Button>
                                        ) : null}
                                        {!c.reportedToInvima ? (
                                            <Button size="sm" onClick={() => model.quickReportTechno(c.id)}>
                                                Reportar a INVIMA
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
