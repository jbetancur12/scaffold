import {
  RegulatoryCodingStandard,
  RegulatoryDeviceType,
  RegulatoryLabelScopeType,
  RegulatoryLabelStatus,
} from '@scaffold/types';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { QualityComplianceModel } from '../types';

export function QualityLabelingTab({ model }: { model: QualityComplianceModel }) {
  return (
                <TabsContent value="labeling" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Registrar Etiqueta Regulatoria</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={model.handleUpsertRegulatoryLabel}>
                                <div className="space-y-1">
                                    <Label>ID Lote</Label>
                                    <Input
                                        value={model.regulatoryLabelForm.productionBatchId}
                                        onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, productionBatchId: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>ID Unidad Serial (opcional)</Label>
                                    <Input
                                        value={model.regulatoryLabelForm.productionBatchUnitId}
                                        onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, productionBatchUnitId: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Alcance</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={model.regulatoryLabelForm.scopeType}
                                        onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, scopeType: e.target.value as RegulatoryLabelScopeType }))}
                                    >
                                        <option value={RegulatoryLabelScopeType.LOTE}>Lote</option>
                                        <option value={RegulatoryLabelScopeType.SERIAL}>Serial</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Tipo de dispositivo</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={model.regulatoryLabelForm.deviceType}
                                        onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, deviceType: e.target.value as RegulatoryDeviceType }))}
                                    >
                                        {Object.values(RegulatoryDeviceType).map((v) => (
                                            <option key={v} value={v}>{v}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Estándar de codificación</Label>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                        value={model.regulatoryLabelForm.codingStandard}
                                        onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, codingStandard: e.target.value as RegulatoryCodingStandard }))}
                                    >
                                        {Object.values(RegulatoryCodingStandard).map((v) => (
                                            <option key={v} value={v}>{v}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Producto</Label>
                                    <Input
                                        value={model.regulatoryLabelForm.productName}
                                        onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, productName: e.target.value }))}
                                        placeholder="Si lo dejas vacío se toma del lote"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Fabricante</Label>
                                    <Input
                                        value={model.regulatoryLabelForm.manufacturerName}
                                        onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, manufacturerName: e.target.value }))}
                                        placeholder="Opcional, autocompleta desde registro INVIMA"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Registro INVIMA</Label>
                                    <Input
                                        value={model.regulatoryLabelForm.invimaRegistration}
                                        onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, invimaRegistration: e.target.value }))}
                                        placeholder="Opcional si el producto tiene INVIMA asociado"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Lote</Label>
                                    <Input
                                        value={model.regulatoryLabelForm.lotCode}
                                        onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, lotCode: e.target.value }))}
                                        placeholder="Opcional, por defecto usa código del lote"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Serial</Label>
                                    <Input
                                        value={model.regulatoryLabelForm.serialCode}
                                        onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, serialCode: e.target.value }))}
                                        required={model.regulatoryLabelForm.scopeType === RegulatoryLabelScopeType.SERIAL}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Fecha de fabricación</Label>
                                    <Input
                                        type="date"
                                        value={model.regulatoryLabelForm.manufactureDate}
                                        onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, manufactureDate: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Fecha de vencimiento</Label>
                                    <Input
                                        type="date"
                                        value={model.regulatoryLabelForm.expirationDate}
                                        onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, expirationDate: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>GTIN</Label>
                                    <Input
                                        value={model.regulatoryLabelForm.gtin}
                                        onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, gtin: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>UDI-DI</Label>
                                    <Input
                                        value={model.regulatoryLabelForm.udiDi}
                                        onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, udiDi: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>UDI-PI</Label>
                                    <Input
                                        value={model.regulatoryLabelForm.udiPi}
                                        onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, udiPi: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Código interno</Label>
                                    <Input
                                        value={model.regulatoryLabelForm.internalCode}
                                        onChange={(e) => model.setRegulatoryLabelForm((p) => ({ ...p, internalCode: e.target.value }))}
                                    />
                                </div>
                                <div className="md:col-span-2 flex justify-end gap-2">
                                    <Button type="button" variant="outline" disabled={model.validatingDispatch} onClick={model.quickValidateDispatch}>
                                        {model.validatingDispatch ? 'Validando...' : 'Validar despacho'}
                                    </Button>
                                    <Button type="submit" disabled={model.savingRegulatoryLabel}>
                                        {model.savingRegulatoryLabel ? 'Guardando...' : 'Guardar etiqueta'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Etiquetas regulatorias ({model.regulatoryLabels.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {model.loadingRegulatoryLabels ? <div>Cargando...</div> : model.regulatoryLabels.length === 0 ? <div className="text-sm text-slate-500">Sin etiquetas.</div> : model.regulatoryLabels.map((label) => (
                                <div key={label.id} className="border rounded-md p-3">
                                    <div className="font-medium">{label.productName} | {label.scopeType}</div>
                                    <div className="text-xs text-slate-600 mt-1">
                                        Lote: {label.lotCode} | Serial: {label.serialCode || 'N/A'} | Tipo: {label.deviceType}
                                    </div>
                                    <div className="text-xs text-slate-600 mt-1">
                                        Estándar: {label.codingStandard} | Código: {label.codingValue || 'N/A'}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Registro INVIMA: {label.invimaRegistration} | Fabricación: {new Date(label.manufactureDate).toLocaleDateString()}
                                    </div>
                                    {label.validationErrors && label.validationErrors.length > 0 ? (
                                        <div className="text-xs text-red-600 mt-1">
                                            Errores: {label.validationErrors.join(' | ')}
                                        </div>
                                    ) : null}
                                    <Badge
                                        variant="outline"
                                        className="mt-2"
                                    >
                                        {label.status === RegulatoryLabelStatus.VALIDADA ? 'validada' : label.status}
                                    </Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
  );
}
