import { useState, useMemo, useCallback, useEffect, Fragment } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Truck, Search, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { mrpApi } from '@/services/mrpApi';
import { Customer, PendingDispatchItem } from '@scaffold/types';
import { getErrorMessage } from '@/lib/api-error';
import { useMrpMutation } from '@/hooks/useMrpQuery';

type LotQuantities = Record<string, Record<string, number>>;

export default function DispatchPage() {
    const { toast } = useToast();
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [items, setItems] = useState<PendingDispatchItem[]>([]);
    const [lotQuantities, setLotQuantities] = useState<LotQuantities>({});
    const [loading, setLoading] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [commercialDocument, setCommercialDocument] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(true);

    const toggleRow = (id: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    useEffect(() => {
        mrpApi.getCustomersWithPendingDispatch().then(setCustomers).catch(() => {
            // Silently fail, customer list will be empty
        }).finally(() => setLoadingCustomers(false));
    }, []);

    const { execute: createDispatch, loading: submitting } = useMrpMutation(
        async (payload: Parameters<typeof mrpApi.createDispatchFromSalesOrder>[0]) => {
            return mrpApi.createDispatchFromSalesOrder(payload);
        },
        {
            onSuccess: async () => {
                toast({ title: 'Despacho creado', description: 'El despacho se registró exitosamente.' });
                setConfirmOpen(false);
                setCommercialDocument('');
                setLotQuantities({});
                if (selectedCustomerId) {
                    await loadItems(selectedCustomerId);
                }
            },
        }
    );

    const loadItems = useCallback(async (customerId: string) => {
        setLoading(true);
        try {
            const data = await mrpApi.getPendingDispatchItems(customerId);
            setItems(data);
        } catch (err) {
            toast({
                title: 'Error',
                description: getErrorMessage(err, 'Error al cargar items pendientes'),
                variant: 'destructive',
            });
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const handleCustomerChange = (value: string) => {
        setSelectedCustomerId(value);
        if (value) {
            loadItems(value);
        } else {
            setItems([]);
            setLotQuantities({});
        }
    };

    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return customers;
        const q = customerSearch.toLowerCase();
        return customers.filter(
            (c) => c.name.toLowerCase().includes(q) || c.documentNumber?.toLowerCase().includes(q)
        );
    }, [customers, customerSearch]);

    const selectedCustomer = useMemo(() => {
        return customers.find((c) => c.id === selectedCustomerId);
    }, [customers, selectedCustomerId]);

    const totalForItem = useCallback((salesOrderItemId: string): number => {
        const lots = lotQuantities[salesOrderItemId];
        if (!lots) return 0;
        return Object.values(lots).reduce((sum, q) => sum + q, 0);
    }, [lotQuantities]);

    const selectedItems = useMemo(() => {
        return items.filter((item) => totalForItem(item.salesOrderItemId) > 0);
    }, [items, totalForItem]);

    const setLotQty = (salesOrderItemId: string, lotId: string, value: number) => {
        setLotQuantities((prev) => {
            const next = { ...prev };
            if (!next[salesOrderItemId]) next[salesOrderItemId] = {};
            next[salesOrderItemId] = { ...next[salesOrderItemId], [lotId]: Math.max(0, value) };
            return next;
        });
    };

    const handleConfirm = async () => {
        if (!commercialDocument.trim()) {
            toast({ title: 'Error', description: 'Debe ingresar el número de documento comercial', variant: 'destructive' });
            return;
        }
        const dispatchItems = items.reduce<Array<{
            salesOrderItemId: string;
            quantity: number;
            lotAllocations: { lotId: string; quantity: number }[];
        }>>((acc, item) => {
            const lots = lotQuantities[item.salesOrderItemId];
            if (!lots) return acc;
            const lotEntries = Object.entries(lots).filter(([, qty]) => qty > 0);
            if (lotEntries.length === 0) return acc;
            const totalQty = lotEntries.reduce((s, [, q]) => s + q, 0);
            acc.push({
                salesOrderItemId: item.salesOrderItemId,
                quantity: totalQty,
                lotAllocations: lotEntries.map(([lotId, qty]) => ({ lotId, quantity: qty })),
            });
            return acc;
        }, []);

        if (dispatchItems.length === 0) {
            toast({ title: 'Error', description: 'Debe seleccionar al menos un item con cantidad > 0', variant: 'destructive' });
            return;
        }
        await createDispatch({
            customerId: selectedCustomerId,
            commercialDocument: commercialDocument.trim(),
            items: dispatchItems,
        });
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <Truck className="h-6 w-6 text-indigo-600" />
                <h1 className="text-2xl font-bold">Despachos por Orden de Venta</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Seleccionar Cliente</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4 items-end">
                    <div className="grid gap-2 flex-1">
                        <Label htmlFor="customer">Cliente</Label>
                        <Select value={selectedCustomerId} onValueChange={handleCustomerChange} disabled={loadingCustomers}>
                            <SelectTrigger>
                                {loadingCustomers ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                <SelectValue placeholder="Seleccionar cliente..." />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredCustomers.map((customer) => (
                                    <SelectItem key={customer.id} value={customer.id}>
                                        {customer.name}{customer.documentNumber ? ` (${customer.documentNumber})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="search">Buscar cliente</Label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="search"
                                placeholder="Nombre o documento..."
                                className="pl-8"
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {selectedCustomer && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                            <span>Items Pendientes de Despacho — {selectedCustomer.name}</span>
                            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {items.length === 0 && !loading ? (
                            <p className="text-muted-foreground text-sm">No hay items pendientes de despacho para este cliente.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>OV</TableHead>
                                            <TableHead>Producto</TableHead>
                                            <TableHead>Variante</TableHead>
                                            <TableHead className="text-right">Ordenado</TableHead>
                                            <TableHead className="text-right">Despachado</TableHead>
                                            <TableHead className="text-right">Pendiente</TableHead>
                                            <TableHead className="text-right">Stock</TableHead>
                                            <TableHead className="text-right w-32">A Despachar</TableHead>
                                            <TableHead className="w-8"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item) => {
                                            const ttl = totalForItem(item.salesOrderItemId);
                                            const hasStock = item.availableStock > 0;
                                            const isExpanded = expandedRows.has(item.salesOrderItemId);
                                            const itemLots = lotQuantities[item.salesOrderItemId] ?? {};
                                            return (
                                                <Fragment key={item.salesOrderItemId}>
                                                    <TableRow className={!hasStock ? 'opacity-50' : ''}>
                                                        <TableCell className="font-mono text-xs">{item.salesOrderCode}</TableCell>
                                                        <TableCell>{item.productName}</TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {item.variantName || item.variantSku || '-'}
                                                        </TableCell>
                                                        <TableCell className="text-right">{item.orderedQuantity}</TableCell>
                                                        <TableCell className="text-right">{item.dispatchedQuantity}</TableCell>
                                                        <TableCell className="text-right font-medium">{item.pendingQuantity}</TableCell>
                                                        <TableCell className={`text-right ${item.availableStock < item.pendingQuantity ? 'text-red-600 font-semibold' : 'text-green-600'}`}>
                                                            {item.availableStock}
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold text-indigo-600">
                                                            {ttl > 0 ? ttl : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <button
                                                                onClick={() => toggleRow(item.salesOrderItemId)}
                                                                className="text-slate-400 hover:text-slate-600 transition-colors"
                                                                title="Asignar lotes"
                                                            >
                                                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                            </button>
                                                        </TableCell>
                                                    </TableRow>
                                                    {isExpanded && (
                                                        <TableRow>
                                                            <TableCell colSpan={9} className="bg-slate-50 p-3">
                                                                <div className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">
                                                                    <Package className="h-4 w-4" />
                                                                    Asignar cantidades por lote
                                                                </div>
                                                                {item.availableLots.length === 0 ? (
                                                                    <p className="text-xs text-slate-400">Stock disponible sin desglose por lote</p>
                                                                ) : (
                                                                    <div className="space-y-2">
                                                                        {item.availableLots.map((lot) => {
                                                                            const lotQty = itemLots[lot.lotId] ?? 0;
                                                                            const lotMax = Math.min(lot.quantity, item.pendingQuantity);
                                                                            return (
                                                                                <div key={lot.lotId} className="flex items-center justify-between gap-4 pl-4 pr-2 py-2 rounded bg-white border border-slate-100">
                                                                                    <div className="flex items-center gap-4 text-xs flex-1">
                                                                                        <span className="font-mono font-medium text-slate-700 min-w-[100px]">{lot.lotCode}</span>
                                                                                        <span className="text-slate-500 min-w-[120px]">{lot.warehouseName}</span>
                                                                                        <span className="font-semibold text-slate-600">disp. {lot.quantity} unid.</span>
                                                                                    </div>
                                                                                    <Input
                                                                                        type="number"
                                                                                        min={0}
                                                                                        max={lotMax}
                                                                                        step={1}
                                                                                        value={lotQty}
                                                                                        onChange={(e) => {
                                                                                            const val = Math.min(Number(e.target.value) || 0, lotMax);
                                                                                            setLotQty(item.salesOrderItemId, lot.lotId, Math.max(0, val));
                                                                                        }}
                                                                                        className="w-20 text-right h-8 text-xs"
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        })}
                                                                        {ttl > 0 && (
                                                                            <div className="text-xs text-right text-indigo-600 font-medium pt-1 pr-2">
                                                                                Total asignado: {ttl} / {Math.min(item.pendingQuantity, item.availableStock)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {selectedCustomer && items.length > 0 && selectedItems.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Crear Despacho</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2 max-w-md">
                            <Label htmlFor="doc">Documento Comercial (Factura/Guía)</Label>
                            <Input
                                id="doc"
                                placeholder="Ej. F001-000001"
                                value={commercialDocument}
                                onChange={(e) => setCommercialDocument(e.target.value)}
                            />
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {selectedItems.length} item(s) seleccionado(s) — Total a despachar:{' '}
                            <strong>{selectedItems.reduce((sum, i) => sum + totalForItem(i.salesOrderItemId), 0)}</strong> unidades
                        </div>
                        <Button onClick={() => setConfirmOpen(true)} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Crear Despacho
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Confirmar Despacho</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                        <p className="text-sm text-muted-foreground">
                            Cliente: <strong>{selectedCustomer?.name}</strong>
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Documento: <strong>{commercialDocument}</strong>
                        </p>
                        {selectedItems.map((item) => {
                            const lots = lotQuantities[item.salesOrderItemId] ?? {};
                            const lotEntries = Object.entries(lots).filter(([, q]) => q > 0);
                            return (
                                <div key={item.salesOrderItemId} className="border rounded-lg p-3">
                                    <p className="text-sm font-medium mb-1">{item.productName}{item.variantName ? ` - ${item.variantName}` : ''}</p>
                                    <p className="text-xs text-muted-foreground mb-2">Total: {lotEntries.reduce((s, [, q]) => s + q, 0)} unidades</p>
                                    <div className="space-y-1">
                                        {lotEntries.map(([lotId, qty]) => {
                                            const lot = item.availableLots.find((l) => l.lotId === lotId);
                                            return (
                                                <div key={lotId} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1">
                                                    <span className="font-mono text-slate-600">{lot?.lotCode || lotId}</span>
                                                    <span className="font-semibold text-slate-700">{qty} unid.</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
                        <Button onClick={handleConfirm} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Confirmar Despacho
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
