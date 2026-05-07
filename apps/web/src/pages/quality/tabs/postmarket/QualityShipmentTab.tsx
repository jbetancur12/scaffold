import { useEffect, useMemo, useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BadgeCheck, CalendarClock, Download, FileText, PackageCheck, Plus, Save, Search, Trash2, Truck, UserPlus, Users, X } from 'lucide-react';
import type { QualityComplianceModel } from '../types';
import { mrpApi } from '@/services/mrpApi';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';

const shortId = (value?: string) => {
    if (!value) return 'N/A';
    return value.length > 12 ? `${value.slice(0, 8)}...` : value;
};

const formatQty = (value: number | string | undefined) => {
    const parsed = Number(value || 0);
    return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
};

export function QualityShipmentTab({ model }: { model: QualityComplianceModel }) {
    const { toast } = useToast();
    const [showCustomerForm, setShowCustomerForm] = useState(false);
    const [showShipmentForm, setShowShipmentForm] = useState(true);
    const [targetItemIndex, setTargetItemIndex] = useState(0);
    const [pdfOptionsOpen, setPdfOptionsOpen] = useState(false);
    const [pdfTarget, setPdfTarget] = useState<{ id: string; commercialDocument?: string } | null>(null);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [pdfColumns, setPdfColumns] = useState({
        variant: true,
        lot: true,
        serial: true,
    });

    const totalShipmentItems = useMemo(
        () => model.shipments.reduce((sum, shipment) => sum + shipment.items.length, 0),
        [model.shipments]
    );

    useEffect(() => {
        if (targetItemIndex >= model.shipmentForm.items.length) {
            setTargetItemIndex(Math.max(0, model.shipmentForm.items.length - 1));
        }
    }, [model.shipmentForm.items.length, targetItemIndex]);

    const handleCustomerSubmit = async (e: React.FormEvent) => {
        await model.handleCreateCustomer(e);
        setShowCustomerForm(false);
    };

    const handleShipmentSubmit = async (e: React.FormEvent) => {
        await model.handleCreateShipment(e);
    };

    const handleDownloadShipmentPdf = async (
        shipmentId: string,
        commercialDocument?: string,
        columns?: string[]
    ) => {
        try {
            setDownloadingPdf(true);
            const blob = await mrpApi.getShipmentPdf(shipmentId, columns ? { columns } : undefined);
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `remision-${commercialDocument || shipmentId}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo generar la remision'), variant: 'destructive' });
        } finally {
            setDownloadingPdf(false);
        }
    };

    const openPdfOptions = (shipmentId: string, commercialDocument?: string) => {
        setPdfTarget({ id: shipmentId, commercialDocument });
        setPdfOptionsOpen(true);
    };

    const confirmPdfDownload = async () => {
        if (!pdfTarget) return;
        const columns = ['product', 'quantity'];
        if (pdfColumns.variant) columns.push('variant');
        if (pdfColumns.lot) columns.push('lot');
        if (pdfColumns.serial) columns.push('serial');
        await handleDownloadShipmentPdf(pdfTarget.id, pdfTarget.commercialDocument, columns);
        setPdfOptionsOpen(false);
    };

    const inputClass = 'h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-sky-500';
    const selectClass = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500';

    return (
        <TabsContent value="shipment" className="space-y-5">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                            <Truck className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-slate-950">Despachos</h2>
                            <p className="mt-1 text-sm text-slate-500">Selecciona lotes con saldo disponible, registra cliente y genera remision.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-center">
                        {[
                            { label: 'Clientes', value: model.customers.length },
                            { label: 'Despachos', value: model.shipments.length },
                            { label: 'Items', value: totalShipmentItems },
                        ].map((item) => (
                            <div key={item.label} className="min-w-24 border-r border-slate-200 px-4 py-2 last:border-r-0">
                                <p className="text-lg font-bold text-slate-950">{item.value}</p>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-5 py-3">
                    <Button
                        type="button"
                        onClick={() => setShowShipmentForm((value) => !value)}
                        className="h-9 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                        {showShipmentForm ? <><X className="mr-1.5 h-3.5 w-3.5" />Ocultar despacho</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />Registrar despacho</>}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCustomerForm((value) => !value)}
                        className="h-9 rounded-lg border-slate-200 text-xs font-semibold"
                    >
                        {showCustomerForm ? <><X className="mr-1.5 h-3.5 w-3.5" />Cerrar cliente</> : <><UserPlus className="mr-1.5 h-3.5 w-3.5" />Nuevo cliente</>}
                    </Button>
                </div>
            </section>

            {showCustomerForm && (
                <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h3 className="text-sm font-bold text-slate-900">Crear cliente</h3>
                    </div>
                    <form className="space-y-4 px-5 py-5" onSubmit={handleCustomerSubmit}>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre <span className="text-red-500">*</span></Label>
                                <Input value={model.customerForm.name} onChange={(e) => model.setCustomerForm((p) => ({ ...p, name: e.target.value }))} required className={inputClass} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documento</Label>
                                <Input value={model.customerForm.documentNumber} onChange={(e) => model.setCustomerForm((p) => ({ ...p, documentNumber: e.target.value }))} className={inputClass} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contacto</Label>
                                <Input value={model.customerForm.contactName} onChange={(e) => model.setCustomerForm((p) => ({ ...p, contactName: e.target.value }))} className={inputClass} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</Label>
                                <Input type="email" value={model.customerForm.email} onChange={(e) => model.setCustomerForm((p) => ({ ...p, email: e.target.value }))} className={inputClass} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Telefono</Label>
                                <Input value={model.customerForm.phone} onChange={(e) => model.setCustomerForm((p) => ({ ...p, phone: e.target.value }))} className={inputClass} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Direccion</Label>
                                <Input value={model.customerForm.address} onChange={(e) => model.setCustomerForm((p) => ({ ...p, address: e.target.value }))} className={inputClass} />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notas</Label>
                                <Textarea value={model.customerForm.notes} onChange={(e) => model.setCustomerForm((p) => ({ ...p, notes: e.target.value }))} className="min-h-[70px] resize-none rounded-lg border-slate-200 focus-visible:ring-sky-500" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowCustomerForm(false)} className="rounded-lg border-slate-200">Cancelar</Button>
                            <Button type="submit" disabled={model.creatingCustomer} className="rounded-lg bg-sky-700 px-5 text-white hover:bg-sky-800">
                                {model.creatingCustomer ? 'Guardando...' : 'Crear cliente'}
                            </Button>
                        </div>
                    </form>
                </section>
            )}

            {showShipmentForm && (
                <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <form onSubmit={handleShipmentSubmit}>
                        <div className="grid grid-cols-1 border-b border-slate-100 lg:grid-cols-[1fr_360px]">
                            <div className="space-y-5 px-5 py-5">
                                <div className="flex items-center gap-2">
                                    <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white">1</span>
                                    <h3 className="text-sm font-bold text-slate-900">Datos del despacho</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</Label>
                                        <select className={selectClass} value={model.shipmentForm.customerId}
                                            onChange={(e) => model.setShipmentForm((p) => ({ ...p, customerId: e.target.value }))}>
                                            <option value="">{model.loadingCustomers ? 'Cargando...' : 'Selecciona cliente...'}</option>
                                            {model.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documento comercial <span className="text-red-500">*</span></Label>
                                        <Input value={model.shipmentForm.commercialDocument}
                                            onChange={(e) => model.setShipmentForm((p) => ({ ...p, commercialDocument: e.target.value }))}
                                            required className={inputClass} placeholder="Factura o remision" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha despacho</Label>
                                        <Input type="datetime-local" value={model.shipmentForm.shippedAt}
                                            onChange={(e) => model.setShipmentForm((p) => ({ ...p, shippedAt: e.target.value }))}
                                            className={inputClass} />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white">2</span>
                                        <h3 className="text-sm font-bold text-slate-900">Buscar lote disponible</h3>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px_150px]">
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                value={model.batchLookupQuery}
                                                onChange={(e) => model.setBatchLookupQuery(e.target.value)}
                                                placeholder="Buscar por lote, SKU o producto"
                                                className={`${inputClass} pl-9`}
                                            />
                                        </div>
                                        <select
                                            className={selectClass}
                                            value={String(targetItemIndex)}
                                            onChange={(e) => setTargetItemIndex(Number(e.target.value))}
                                        >
                                            {model.shipmentForm.items.map((_, index) => (
                                                <option key={`target-item-${index}`} value={String(index)}>
                                                    Aplicar a item {index + 1}
                                                </option>
                                            ))}
                                        </select>
                                        <Button
                                            type="button"
                                            onClick={model.lookupProductionBatches}
                                            disabled={model.loadingBatchLookup || !model.batchLookupQuery.trim()}
                                            className="h-10 rounded-lg bg-slate-950 text-xs font-semibold text-white hover:bg-slate-800"
                                        >
                                            {model.loadingBatchLookup ? 'Buscando...' : 'Buscar'}
                                        </Button>
                                    </div>

                                    <div className="overflow-hidden rounded-lg border border-slate-200">
                                        <div className="grid grid-cols-[140px_1fr_110px_130px_110px] bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                            <span>Lote</span>
                                            <span>Producto</span>
                                            <span>Disponible</span>
                                            <span>Bodega</span>
                                            <span className="text-right">Accion</span>
                                        </div>
                                        {model.batchLookupResults.length === 0 ? (
                                            <div className="px-3 py-5 text-center text-sm text-slate-400">
                                                Busca un producto o lote para ver saldos disponibles.
                                            </div>
                                        ) : (
                                            model.batchLookupResults.map((lot) => (
                                                <div key={lot.id} className="grid grid-cols-[140px_1fr_110px_130px_110px] items-center border-t border-slate-100 px-3 py-2 text-xs">
                                                    <span className="font-mono font-semibold text-slate-900">{lot.productionBatch?.code || lot.productionBatchId}</span>
                                                    <span className="truncate text-slate-700">
                                                        {lot.productionBatch?.variant?.product?.name || 'Producto'}
                                                        {lot.productionBatch?.variant?.name ? ` / ${lot.productionBatch.variant.name}` : ''}
                                                    </span>
                                                    <span className="font-bold text-emerald-700">{formatQty(lot.quantity)}</span>
                                                    <span className="truncate text-slate-500">{lot.warehouse?.name || 'Bodega PT'}</span>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => model.applyBatchToShipmentItem(targetItemIndex, lot)}
                                                        className="ml-auto h-8 rounded-lg border-slate-200 px-3 text-xs"
                                                    >
                                                        Usar
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <aside className="border-t border-slate-100 bg-slate-50 px-5 py-5 lg:border-l lg:border-t-0">
                                <div className="mb-4 flex items-center gap-2">
                                    <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white">3</span>
                                    <h3 className="text-sm font-bold text-slate-900">Items de despacho</h3>
                                    <Button type="button" variant="outline" size="sm" onClick={model.addShipmentItem}
                                        className="ml-auto h-8 rounded-lg border-slate-200 text-xs">
                                        <Plus className="mr-1 h-3.5 w-3.5" />Item
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {model.shipmentForm.items.map((item, index) => {
                                        const selectedLot = model.selectedLotByBatchId[item.productionBatchId];
                                        const maxQuantity = selectedLot ? Number(selectedLot.quantity || 0) : undefined;
                                        return (
                                            <div key={`shipment-item-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
                                                <div className="mb-3 flex items-start gap-2">
                                                    <PackageCheck className="mt-0.5 h-4 w-4 text-sky-700" />
                                                    <div className="min-w-0 flex-1">
                                                        {selectedLot ? (
                                                            <>
                                                                <p className="truncate font-mono text-xs font-bold text-slate-950">{selectedLot.productionBatch?.code || selectedLot.productionBatchId}</p>
                                                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                                                    {selectedLot.productionBatch?.variant?.product?.name || 'Producto'}
                                                                    {selectedLot.productionBatch?.variant?.name ? ` / ${selectedLot.productionBatch.variant.name}` : ''}
                                                                </p>
                                                                <p className="mt-1 text-xs font-semibold text-emerald-700">Disponible {formatQty(selectedLot.quantity)}</p>
                                                            </>
                                                        ) : item.productionBatchId ? (
                                                            <p className="font-mono text-xs text-slate-500">{item.productionBatchId}</p>
                                                        ) : (
                                                            <p className="text-xs text-slate-400">Sin lote seleccionado</p>
                                                        )}
                                                    </div>
                                                    <Button type="button" variant="ghost" size="sm"
                                                        onClick={() => model.removeShipmentItem(index)}
                                                        disabled={model.shipmentForm.items.length === 1}
                                                        className="h-8 w-8 rounded-lg p-0 text-red-500 hover:bg-red-50">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Input placeholder="Serial opcional" value={item.productionBatchUnitId}
                                                        onChange={(e) => model.updateShipmentItem(index, 'productionBatchUnitId', e.target.value)}
                                                        className="h-9 rounded-lg border-slate-200 font-mono text-xs focus-visible:ring-sky-500" />
                                                    <Input type="number" min={0.0001} max={maxQuantity} step={0.0001} placeholder="Cantidad"
                                                        value={item.quantity}
                                                        onChange={(e) => model.updateShipmentItem(index, 'quantity', Number(e.target.value))}
                                                        className="h-9 rounded-lg border-slate-200 text-xs focus-visible:ring-sky-500" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-4 flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setShowShipmentForm(false)} className="rounded-lg border-slate-200">Cancelar</Button>
                                    <Button type="submit" disabled={model.creatingShipment} className="rounded-lg bg-sky-700 px-5 text-white hover:bg-sky-800">
                                        {model.creatingShipment ? <><div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Guardando...</> : <><Save className="mr-2 h-4 w-4" />Registrar</>}
                                    </Button>
                                </div>
                            </aside>
                        </div>
                    </form>
                </section>
            )}

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                    <Users className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-900">Clientes</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">{model.customers.length}</span>
                </div>
                <div className="px-5 py-4">
                    {model.loadingCustomers ? (
                        <div className="py-4 text-center text-sm text-slate-400">Cargando clientes...</div>
                    ) : model.customers.length === 0 ? (
                        <div className="py-4 text-center text-sm text-slate-400">Sin clientes registrados.</div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {model.customers.map((customer) => (
                                <span key={customer.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
                                    <strong className="text-slate-800">{customer.name}</strong>
                                    {customer.contactName && <span className="text-slate-400"> / {customer.contactName}</span>}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-900">Historial de despachos</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">{model.shipments.length}</span>
                </div>
                <div className="divide-y divide-slate-100">
                    {model.loadingShipments ? (
                        <div className="py-8 text-center text-sm text-slate-400">Cargando despachos...</div>
                    ) : model.shipments.length === 0 ? (
                        <div className="py-8 text-center text-sm text-slate-400">Sin despachos registrados.</div>
                    ) : model.shipments.map((shipment) => (
                        <div key={shipment.id} className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-slate-950">{shipment.commercialDocument}</span>
                                    <span className="text-slate-300">/</span>
                                    <span className="font-semibold text-slate-700">{shipment.customer?.name || shortId(shipment.customerId)}</span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                    <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{new Date(shipment.shippedAt).toLocaleString('es-CO')}</span>
                                    {shipment.dispatchedBy && <span className="inline-flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5" />{shipment.dispatchedBy}</span>}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {shipment.items.map((item, index) => (
                                        <span key={`${shipment.id}-${index}`} className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700">
                                            {item.productionBatch?.code || shortId(item.productionBatchId)}
                                            {item.productionBatchUnit?.serialCode ? `/${item.productionBatchUnit.serialCode}` : ''} x {formatQty(item.quantity)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openPdfOptions(shipment.id, shipment.commercialDocument)}
                                className="h-8 rounded-lg border-slate-200 text-xs"
                            >
                                <Download className="mr-1.5 h-3.5 w-3.5" />Remision PDF
                            </Button>
                        </div>
                    ))}
                </div>
            </section>

            <Dialog open={pdfOptionsOpen} onOpenChange={setPdfOptionsOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Columnas de la remision</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <p className="text-sm text-slate-500">
                            Selecciona las columnas opcionales. Producto y cantidad siempre se incluyen.
                        </p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {[
                                ['variant', 'Variante'],
                                ['lot', 'Lote'],
                                ['serial', 'Serial'],
                            ].map(([key, label]) => (
                                <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={pdfColumns[key as keyof typeof pdfColumns]}
                                        onChange={(e) => setPdfColumns((prev) => ({ ...prev, [key]: e.target.checked }))}
                                        className="h-4 w-4 rounded border-slate-300"
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setPdfOptionsOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="button" onClick={confirmPdfDownload} disabled={downloadingPdf}>
                            {downloadingPdf ? 'Generando...' : 'Descargar PDF'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TabsContent>
    );
}
