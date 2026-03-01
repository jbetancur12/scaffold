import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Truck, Users, Plus, X, Save, Trash2 } from 'lucide-react';
import type { QualityComplianceModel } from '../types';

const shortId = (value?: string) => {
    if (!value) return 'N/A';
    return value.length > 12 ? `${value.slice(0, 8)}…` : value;
};

export function QualityShipmentTab({ model }: { model: QualityComplianceModel }) {
    const [showCustomerForm, setShowCustomerForm] = useState(false);
    const [showShipmentForm, setShowShipmentForm] = useState(false);

    const handleCustomerSubmit = async (e: React.FormEvent) => {
        await model.handleCreateCustomer(e);
        setShowCustomerForm(false);
    };
    const handleShipmentSubmit = async (e: React.FormEvent) => {
        await model.handleCreateShipment(e);
        setShowShipmentForm(false);
    };

    const inputClass = 'h-10 rounded-xl border-slate-200 focus-visible:ring-violet-500';
    const selectClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';

    return (
        <TabsContent value="shipment" className="space-y-5">

            {/* Hero */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-50/40 to-transparent pointer-events-none" />
                    <div className="relative flex items-start gap-4">
                        <div className="p-2.5 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
                            <Truck className="h-6 w-6 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Despachos</h2>
                            <p className="text-slate-500 text-sm mt-0.5">Registro y trazabilidad de despachos por lote y cliente.</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
                    {[
                        { label: 'Clientes', value: model.customers.length, color: 'text-slate-700', bg: '' },
                        { label: 'Despachos', value: model.shipments.length, color: 'text-violet-700', bg: 'bg-violet-50/40' },
                        { label: 'Ítems totales', value: model.shipments.reduce((s, d) => s + d.items.length, 0), color: 'text-slate-700', bg: '' },
                    ].map(({ label, value, color, bg }) => (
                        <div key={label} className={`flex flex-col items-center py-3 px-4 ${bg}`}>
                            <span className={`text-2xl font-bold ${color}`}>{value}</span>
                            <span className="text-xs text-slate-500 font-medium mt-0.5">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Customers */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Users className="h-4 w-4 text-violet-500" />
                    <h3 className="font-semibold text-slate-800">Clientes</h3>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">{model.customers.length}</span>
                    <div className="ml-auto">
                        <Button type="button" size="sm" onClick={() => setShowCustomerForm((v) => !v)}
                            className={showCustomerForm
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl h-8 text-xs border border-slate-200'
                                : 'bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-8 text-xs font-medium'}>
                            {showCustomerForm ? <><X className="mr-1.5 h-3.5 w-3.5" />Cancelar</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />Nuevo cliente</>}
                        </Button>
                    </div>
                </div>

                {showCustomerForm && (
                    <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-5">
                        <p className="text-sm font-bold text-slate-700 mb-4">Crear cliente</p>
                        <form className="space-y-4" onSubmit={handleCustomerSubmit}>
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Nombre <span className="text-red-500">*</span></Label>
                                    <Input value={model.customerForm.name} onChange={(e) => model.setCustomerForm((p) => ({ ...p, name: e.target.value }))} required className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Documento</Label>
                                    <Input value={model.customerForm.documentNumber} onChange={(e) => model.setCustomerForm((p) => ({ ...p, documentNumber: e.target.value }))} className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Contacto</Label>
                                    <Input value={model.customerForm.contactName} onChange={(e) => model.setCustomerForm((p) => ({ ...p, contactName: e.target.value }))} className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Email</Label>
                                    <Input type="email" value={model.customerForm.email} onChange={(e) => model.setCustomerForm((p) => ({ ...p, email: e.target.value }))} className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Teléfono</Label>
                                    <Input value={model.customerForm.phone} onChange={(e) => model.setCustomerForm((p) => ({ ...p, phone: e.target.value }))} className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Dirección</Label>
                                    <Input value={model.customerForm.address} onChange={(e) => model.setCustomerForm((p) => ({ ...p, address: e.target.value }))} className={inputClass} />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Notas</Label>
                                    <Textarea value={model.customerForm.notes} onChange={(e) => model.setCustomerForm((p) => ({ ...p, notes: e.target.value }))} className="rounded-xl border-slate-200 focus-visible:ring-violet-500 min-h-[60px] resize-none" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowCustomerForm(false)} className="rounded-xl border-slate-200">Cancelar</Button>
                                <Button type="submit" disabled={model.creatingCustomer} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-6">
                                    {model.creatingCustomer ? <><div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />Guardando...</> : <><Save className="mr-2 h-4 w-4" />Crear cliente</>}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="p-4">
                    {model.loadingCustomers ? (
                        <div className="flex items-center justify-center py-6 text-slate-400">
                            <div className="animate-spin mr-3 h-5 w-5 border-4 border-slate-200 border-t-violet-600 rounded-full" />
                            <span className="text-sm animate-pulse">Cargando clientes...</span>
                        </div>
                    ) : model.customers.length === 0 ? (
                        <div className="text-center py-6 text-slate-400">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Sin clientes registrados.</p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {model.customers.map((c) => (
                                <div key={c.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm">
                                    <span className="font-semibold text-slate-800">{c.name}</span>
                                    {c.contactName && <span className="text-slate-400 text-xs">· {c.contactName}</span>}
                                    {c.email && <span className="text-slate-400 text-xs">· {c.email}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Shipments */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-violet-500" />
                    <h3 className="font-semibold text-slate-800">Despachos</h3>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">{model.shipments.length}</span>
                    <div className="ml-auto">
                        <Button type="button" size="sm" onClick={() => setShowShipmentForm((v) => !v)}
                            className={showShipmentForm
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl h-8 text-xs border border-slate-200'
                                : 'bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-8 text-xs font-medium'}>
                            {showShipmentForm ? <><X className="mr-1.5 h-3.5 w-3.5" />Cancelar</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />Registrar despacho</>}
                        </Button>
                    </div>
                </div>

                {showShipmentForm && (
                    <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-5">
                        <p className="text-sm font-bold text-slate-700 mb-4">Registrar despacho</p>
                        <form className="space-y-4" onSubmit={handleShipmentSubmit}>
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Cliente</Label>
                                    <select className={selectClass} value={model.shipmentForm.customerId}
                                        onChange={(e) => model.setShipmentForm((p) => ({ ...p, customerId: e.target.value }))}>
                                        <option value="">{model.loadingCustomers ? 'Cargando...' : 'Selecciona cliente...'}</option>
                                        {model.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Documento comercial <span className="text-red-500">*</span></Label>
                                    <Input value={model.shipmentForm.commercialDocument}
                                        onChange={(e) => model.setShipmentForm((p) => ({ ...p, commercialDocument: e.target.value }))}
                                        required className={inputClass} placeholder="Factura, remisión..." />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Fecha despacho</Label>
                                    <Input type="datetime-local" value={model.shipmentForm.shippedAt}
                                        onChange={(e) => model.setShipmentForm((p) => ({ ...p, shippedAt: e.target.value }))}
                                        className={inputClass} />
                                </div>
                            </div>

                            {/* Items */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Ítems de despacho</p>
                                    <Button type="button" variant="outline" size="sm" onClick={model.addShipmentItem}
                                        className="rounded-xl h-7 text-xs border-slate-200">
                                        <Plus className="mr-1 h-3.5 w-3.5" />Ítem
                                    </Button>
                                </div>
                                {model.shipmentForm.items.map((item, index) => (
                                    <div key={`shipment-item-${index}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                        <Input placeholder="UUID lote" value={item.productionBatchId}
                                            onChange={(e) => model.updateShipmentItem(index, 'productionBatchId', e.target.value)}
                                            className="h-9 rounded-xl border-slate-200 focus-visible:ring-violet-500 font-mono text-xs" />
                                        <Input placeholder="UUID serial (opcional)" value={item.productionBatchUnitId}
                                            onChange={(e) => model.updateShipmentItem(index, 'productionBatchUnitId', e.target.value)}
                                            className="h-9 rounded-xl border-slate-200 focus-visible:ring-violet-500 font-mono text-xs" />
                                        <Input type="number" min={0.0001} step={0.0001} placeholder="Cantidad"
                                            value={item.quantity}
                                            onChange={(e) => model.updateShipmentItem(index, 'quantity', Number(e.target.value))}
                                            className="h-9 rounded-xl border-slate-200 focus-visible:ring-violet-500 text-xs" />
                                        <Button type="button" variant="outline" size="sm"
                                            onClick={() => model.removeShipmentItem(index)}
                                            disabled={model.shipmentForm.items.length === 1}
                                            className="rounded-xl h-9 text-xs border-red-100 text-red-600 hover:bg-red-50">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowShipmentForm(false)} className="rounded-xl border-slate-200">Cancelar</Button>
                                <Button type="submit" disabled={model.creatingShipment} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-6">
                                    {model.creatingShipment ? <><div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />Guardando...</> : <><Save className="mr-2 h-4 w-4" />Registrar despacho</>}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="p-4 space-y-3">
                    {model.loadingShipments ? (
                        <div className="flex items-center justify-center py-8 text-slate-400">
                            <div className="animate-spin mr-3 h-5 w-5 border-4 border-slate-200 border-t-violet-600 rounded-full" />
                            <span className="text-sm animate-pulse">Cargando despachos...</span>
                        </div>
                    ) : model.shipments.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <Truck className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Sin despachos registrados.</p>
                        </div>
                    ) : model.shipments.map((shipment) => (
                        <div key={shipment.id} className="border border-slate-200 rounded-2xl p-4 space-y-2 bg-white">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-slate-900">{shipment.commercialDocument}</span>
                                <span className="text-slate-400">·</span>
                                <span className="font-semibold text-slate-600">{shipment.customer?.name || shortId(shipment.customerId)}</span>
                                <span className="text-slate-400 text-xs ml-auto">{new Date(shipment.shippedAt).toLocaleString('es-CO')}</span>
                            </div>
                            {shipment.dispatchedBy && (
                                <p className="text-xs text-slate-500">Responsable: <span className="font-medium text-slate-700">{shipment.dispatchedBy}</span></p>
                            )}
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {shipment.items.map((item, i) => (
                                    <span key={i} className="text-[11px] font-mono bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-2 py-0.5">
                                        {item.productionBatch?.code || shortId(item.productionBatchId)}
                                        {item.productionBatchUnit?.serialCode ? `/${item.productionBatchUnit.serialCode}` : ''} × {item.quantity}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </TabsContent>
    );
}
