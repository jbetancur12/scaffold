import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { QualityComplianceModel } from '../types';

const shortId = (value?: string) => {
  if (!value) return 'N/A';
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
};

export function QualityShipmentTab({ model }: { model: QualityComplianceModel }) {
  return (
                <TabsContent value="shipment" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Crear Cliente</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={model.handleCreateCustomer}>
                                <div className="space-y-1">
                                    <Label>Nombre</Label>
                                    <Input value={model.customerForm.name} onChange={(e) => model.setCustomerForm((p) => ({ ...p, name: e.target.value }))} required />
                                </div>
                                <div className="space-y-1">
                                    <Label>Documento</Label>
                                    <Input value={model.customerForm.documentNumber} onChange={(e) => model.setCustomerForm((p) => ({ ...p, documentNumber: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Contacto</Label>
                                    <Input value={model.customerForm.contactName} onChange={(e) => model.setCustomerForm((p) => ({ ...p, contactName: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Email</Label>
                                    <Input type="email" value={model.customerForm.email} onChange={(e) => model.setCustomerForm((p) => ({ ...p, email: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Teléfono</Label>
                                    <Input value={model.customerForm.phone} onChange={(e) => model.setCustomerForm((p) => ({ ...p, phone: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Dirección</Label>
                                    <Input value={model.customerForm.address} onChange={(e) => model.setCustomerForm((p) => ({ ...p, address: e.target.value }))} />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Notas</Label>
                                    <Textarea value={model.customerForm.notes} onChange={(e) => model.setCustomerForm((p) => ({ ...p, notes: e.target.value }))} />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={model.creatingCustomer}>{model.creatingCustomer ? 'Guardando...' : 'Crear cliente'}</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Registrar Despacho</CardTitle></CardHeader>
                        <CardContent>
                            <form className="space-y-3" onSubmit={model.handleCreateShipment}>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <Label>Cliente</Label>
                                        <select
                                            className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                                            value={model.shipmentForm.customerId}
                                            onChange={(e) => model.setShipmentForm((p) => ({ ...p, customerId: e.target.value }))}
                                        >
                                            <option value="">{model.loadingCustomers ? 'Cargando...' : 'Selecciona cliente...'}</option>
                                            {model.customers.map((customer) => (
                                                <option key={customer.id} value={customer.id}>{customer.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Documento comercial</Label>
                                        <Input
                                            value={model.shipmentForm.commercialDocument}
                                            onChange={(e) => model.setShipmentForm((p) => ({ ...p, commercialDocument: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Fecha despacho</Label>
                                        <Input
                                            type="datetime-local"
                                            value={model.shipmentForm.shippedAt}
                                            onChange={(e) => model.setShipmentForm((p) => ({ ...p, shippedAt: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Ítems de despacho</Label>
                                        <Button type="button" variant="outline" size="sm" onClick={model.addShipmentItem}>+ Ítem</Button>
                                    </div>
                                    {model.shipmentForm.items.map((item, index) => (
                                        <div key={`shipment-item-${index}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 border rounded-md p-2">
                                            <Input
                                                placeholder="ID lote (UUID)"
                                                value={item.productionBatchId}
                                                onChange={(e) => model.updateShipmentItem(index, 'productionBatchId', e.target.value)}
                                            />
                                            <Input
                                                placeholder="ID unidad serial (opcional)"
                                                value={item.productionBatchUnitId}
                                                onChange={(e) => model.updateShipmentItem(index, 'productionBatchUnitId', e.target.value)}
                                            />
                                            <Input
                                                type="number"
                                                min={0.0001}
                                                step={0.0001}
                                                placeholder="Cantidad"
                                                value={item.quantity}
                                                onChange={(e) => model.updateShipmentItem(index, 'quantity', Number(e.target.value))}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => model.removeShipmentItem(index)}
                                                disabled={model.shipmentForm.items.length === 1}
                                            >
                                                Quitar
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={model.creatingShipment}>
                                        {model.creatingShipment ? 'Guardando...' : 'Registrar despacho'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Despachos ({model.shipments.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {model.loadingShipments ? <div>Cargando...</div> : model.shipments.length === 0 ? <div className="text-sm text-slate-500">Sin despachos.</div> : model.shipments.map((shipment) => (
                                <div key={shipment.id} className="border rounded-md p-3">
                                    <div className="font-medium">{shipment.commercialDocument} | {shipment.customer?.name || shipment.customerId}</div>
                                    <div className="text-xs text-slate-600 mt-1">
                                        Fecha: {new Date(shipment.shippedAt).toLocaleString()} | Responsable: {shipment.dispatchedBy || 'N/A'}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Ítems: {shipment.items.map((item) => (
                                            `${item.productionBatch?.code || shortId(item.productionBatchId)}${item.productionBatchUnit?.serialCode ? `/${item.productionBatchUnit.serialCode}` : ''} x ${item.quantity}`
                                        )).join(' | ')}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
  );
}
