import { InvimaRegistrationStatus } from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { QualityComplianceModel } from '../types';

export function QualityInvimaTab({ model }: { model: QualityComplianceModel }) {
  return (
                <TabsContent value="invima" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Crear Registro INVIMA</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={model.handleCreateInvimaRegistration}>
                                <div className="space-y-1">
                                    <Label>Código INVIMA</Label>
                                    <Input
                                        value={model.invimaRegistrationForm.code}
                                        onChange={(e) => model.setInvimaRegistrationForm((p) => ({ ...p, code: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Titular</Label>
                                    <Input
                                        value={model.invimaRegistrationForm.holderName}
                                        onChange={(e) => model.setInvimaRegistrationForm((p) => ({ ...p, holderName: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Fabricante (opcional)</Label>
                                    <Input
                                        value={model.invimaRegistrationForm.manufacturerName}
                                        onChange={(e) => model.setInvimaRegistrationForm((p) => ({ ...p, manufacturerName: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Estado</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={model.invimaRegistrationForm.status}
                                        onChange={(e) => model.setInvimaRegistrationForm((p) => ({ ...p, status: e.target.value as InvimaRegistrationStatus }))}
                                    >
                                        <option value={InvimaRegistrationStatus.ACTIVO}>activo</option>
                                        <option value={InvimaRegistrationStatus.INACTIVO}>inactivo</option>
                                        <option value={InvimaRegistrationStatus.SUSPENDIDO}>suspendido</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Válido desde (opcional)</Label>
                                    <Input
                                        type="date"
                                        value={model.invimaRegistrationForm.validFrom}
                                        onChange={(e) => model.setInvimaRegistrationForm((p) => ({ ...p, validFrom: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Válido hasta (opcional)</Label>
                                    <Input
                                        type="date"
                                        value={model.invimaRegistrationForm.validUntil}
                                        onChange={(e) => model.setInvimaRegistrationForm((p) => ({ ...p, validUntil: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Notas (opcional)</Label>
                                    <Textarea
                                        value={model.invimaRegistrationForm.notes}
                                        onChange={(e) => model.setInvimaRegistrationForm((p) => ({ ...p, notes: e.target.value }))}
                                    />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={model.creatingInvimaRegistration}>
                                        {model.creatingInvimaRegistration ? 'Guardando...' : 'Guardar registro'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Registros INVIMA ({model.invimaRegistrations.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {model.loadingInvimaRegistrations ? <div>Cargando...</div> : model.invimaRegistrations.length === 0 ? <div className="text-sm text-slate-500">Sin registros.</div> : model.invimaRegistrations.map((reg) => (
                                <div key={reg.id} className="border rounded-md p-3">
                                    <div className="font-medium">{reg.code}</div>
                                    <div className="text-xs text-slate-600 mt-1">
                                        Titular: {reg.holderName} | Fabricante: {reg.manufacturerName || 'N/A'}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Vigencia: {reg.validFrom ? new Date(reg.validFrom).toLocaleDateString() : 'N/A'} - {reg.validUntil ? new Date(reg.validUntil).toLocaleDateString() : 'N/A'}
                                    </div>
                                    <Badge variant="outline" className="mt-2">{reg.status}</Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

  );
}
