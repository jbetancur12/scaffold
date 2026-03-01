import { useState, useMemo } from 'react';
import { InventoryItem, ProductVariant, RawMaterial, Warehouse, Product } from '@scaffold/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Package, Plus, Layers, AlertCircle, TrendingUp, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatQuantity } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api-error';
import { useInventoryQuery, useManualStockMutation } from '@/hooks/mrp/useInventory';
import { useInventoryKardexQuery } from '@/hooks/mrp/useInventory';
import { useRawMaterialsQuery } from '@/hooks/mrp/useRawMaterials';
import { useWarehousesQuery } from '@/hooks/mrp/useWarehouses';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { RawMaterialKardexRow } from '@/services/mrpApi';

interface PopulatedInventoryItem extends InventoryItem {
    variant?: ProductVariant & { product?: Product };
    rawMaterial?: RawMaterial;
    warehouse?: Warehouse;
}

export default function InventoryDashboardPage() {
    const { toast } = useToast();

    // Manual Add State
    const [isManualAddOpen, setIsManualAddOpen] = useState(false);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [selectedFilterWarehouseId, setSelectedFilterWarehouseId] = useState<string>('all');
    const [selectedMaterialId, setSelectedMaterialId] = useState('');
    const [manualQuantity, setManualQuantity] = useState('');
    const [manualCost, setManualCost] = useState('');
    const [kardexMaterialId, setKardexMaterialId] = useState<string>('all');
    const [kardexLotCode, setKardexLotCode] = useState('');
    const [kardexReference, setKardexReference] = useState('');
    const [kardexDateFrom, setKardexDateFrom] = useState('');
    const [kardexDateTo, setKardexDateTo] = useState('');
    const [activeView, setActiveView] = useState<'stock' | 'kardex'>('stock');
    const warehouseId = selectedFilterWarehouseId === 'all' ? undefined : selectedFilterWarehouseId;
    const { data: inventoryData, error: inventoryError, execute: refetchInventory, loading } = useInventoryQuery(1, 100, warehouseId);
    const { data: warehousesData, error: warehousesError } = useWarehousesQuery();
    const { materials: rawMaterials, error: rawMaterialsError } = useRawMaterialsQuery(1, 100, '');
    const { execute: addManualStock, loading: submittingManual } = useManualStockMutation();
    const { data: kardexData, loading: loadingKardex, error: kardexError } = useInventoryKardexQuery({
        page: 1,
        limit: 100,
        rawMaterialId: kardexMaterialId === 'all' ? undefined : kardexMaterialId,
        supplierLotCode: kardexLotCode.trim() || undefined,
        referenceId: kardexReference.trim() || undefined,
        dateFrom: kardexDateFrom || undefined,
        dateTo: kardexDateTo || undefined,
    });
    const inventory = (inventoryData?.items as PopulatedInventoryItem[]) ?? [];
    const kardexRows = (kardexData?.items as RawMaterialKardexRow[]) ?? [];
    const warehouses: Warehouse[] = warehousesData ?? [];
    const inventoryErrorMessage = inventoryError ? getErrorMessage(inventoryError, 'Error al cargar el inventario') : '';
    const kardexErrorMessage = kardexError ? getErrorMessage(kardexError, 'Error al cargar kardex') : '';

    useMrpQueryErrorToast(rawMaterialsError, 'No se pudo cargar información auxiliar');
    useMrpQueryErrorToast(warehousesError, 'No se pudo cargar información auxiliar');

    // Memos para KPIs
    const kpis = useMemo(() => {
        let rawMaterialCount = 0;
        let productCount = 0;

        inventory.forEach(item => {
            if (item.variant) productCount++;
            else if (item.rawMaterial) rawMaterialCount++;
        });

        return {
            total: inventory.length,
            rawMaterials: rawMaterialCount,
            products: productCount
        };
    }, [inventory]);

    const handleManualAdd = async () => {
        if (!selectedMaterialId || !manualQuantity || !manualCost) {
            toast({
                title: 'Error',
                description: 'Por favor complete todos los campos',
                variant: 'destructive',
            });
            return;
        }

        try {
            await addManualStock({
                rawMaterialId: selectedMaterialId,
                quantity: Number(manualQuantity),
                unitCost: Number(manualCost),
                warehouseId: selectedWarehouseId || undefined,
            });

            toast({
                title: 'Stock agregado',
                description: 'El inventario y costo promedio han sido actualizados.',
            });

            setIsManualAddOpen(false);
            setSelectedMaterialId('');
            setManualQuantity('');
            setManualCost('');
            await refetchInventory({ force: true });
        } catch (err) {
            console.error(err);
            toast({
                title: 'Error',
                description: getErrorMessage(err, 'No se pudo agregar el stock manual.'),
                variant: 'destructive',
            });
        }
    };

    const getItemName = (item: PopulatedInventoryItem) => {
        if (item.variant) {
            return `${item.variant.product?.name || 'Producto'} - ${item.variant.sku}`;
        }
        if (item.rawMaterial) {
            return item.rawMaterial.name;
        }
        return 'N/A';
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
            {/* Hero Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-2">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl ring-1 ring-indigo-100 hidden sm:block">
                        <Layers className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-1">
                            Inventario General
                        </h1>
                        <p className="text-sm text-slate-500">
                            Gestión centralizada de stock, materias primas y productos finalizados.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <Select value={selectedFilterWarehouseId} onValueChange={setSelectedFilterWarehouseId}>
                        <SelectTrigger className="w-full sm:w-[240px] bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Todos los Almacenes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                <span className="font-semibold">Todos los Almacenes</span>
                            </SelectItem>
                            {warehouses.map((w) => (
                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Dialog open={isManualAddOpen} onOpenChange={setIsManualAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all">
                                <Plus className="mr-2 h-4 w-4" />
                                Ajuste Manual
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Agregar Stock Manualmente</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="material">Materia Prima</Label>
                                    <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar materia prima" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rawMaterials.map((material) => (
                                                <SelectItem key={material.id} value={material.id}>
                                                    {material.name} ({material.sku})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="warehouse">Almacén</Label>
                                    <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar almacén (Opcional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {warehouses.map((warehouse) => (
                                                <SelectItem key={warehouse.id} value={warehouse.id}>
                                                    {warehouse.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="quantity">Cantidad a Agregar</Label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        step="0.01"
                                        value={manualQuantity}
                                        onChange={(e) => setManualQuantity(e.target.value)}
                                        placeholder="Ej. 10.5"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="cost">Costo Unitario (para promedio)</Label>
                                    <CurrencyInput
                                        id="cost"
                                        value={manualCost}
                                        onValueChange={(val) => setManualCost(val?.toString() || '')}
                                        placeholder="Ej. 1.500"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsManualAddOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleManualAdd} disabled={submittingManual}>
                                    {submittingManual ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        'Guardar Ajuste'
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-slate-50 text-slate-500 rounded-lg">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Referencias</h3>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mt-1">{kpis.total}</div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <Package className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Materias Primas</h3>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mt-1">{kpis.rawMaterials}</div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <Layers className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Prod. Terminados</h3>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mt-1">{kpis.products}</div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-2 inline-flex gap-2">
                <Button
                    variant={activeView === 'stock' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveView('stock')}
                >
                    Stock
                </Button>
                <Button
                    variant={activeView === 'kardex' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveView('kardex')}
                >
                    Kardex MP
                </Button>
            </div>

            {activeView === 'stock' ? (
                loading ? (
                    <div className="flex justify-center py-8" >
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : inventoryErrorMessage ? (
                    <div className="p-4 text-red-500 bg-red-50 rounded-md">
                        {inventoryErrorMessage}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                            <h2 className="text-lg font-bold text-slate-800">Stock Actual</h2>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">
                                {kpis.total} ítems
                            </Badge>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/80">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[30%] sm:w-[40%] text-xs font-semibold text-slate-500 uppercase tracking-wider py-4">Ítem</TableHead>
                                        <TableHead className="w-[20%] text-xs font-semibold text-slate-500 uppercase tracking-wider py-4">Tipo</TableHead>
                                        <TableHead className="w-[20%] text-xs font-semibold text-slate-500 uppercase tracking-wider py-4">Almacén</TableHead>
                                        <TableHead className="w-[15%] text-right text-xs font-semibold text-slate-500 uppercase tracking-wider py-4">Cantidad</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inventory.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-[400px]">
                                                <div className="flex flex-col items-center justify-center text-center h-full space-y-4">
                                                    <div className="p-6 bg-slate-50 rounded-full ring-8 ring-slate-50/50">
                                                        <Search className="h-10 w-10 text-slate-300" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-lg font-medium text-slate-900">
                                                            No se encontraron ítems
                                                        </p>
                                                        <p className="text-sm text-slate-500 max-w-sm mx-auto">
                                                            {selectedFilterWarehouseId === 'all'
                                                                ? 'Empieza recibiendo órdenes de compra o crea un ajuste manual de stock.'
                                                                : 'No hay inventario registrado para el almacén seleccionado.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        inventory.map((item) => (
                                            <TableRow key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg shrink-0 ${item.variant ? 'bg-indigo-50 text-indigo-500' : 'bg-amber-50 text-amber-500'}`}>
                                                            {item.variant ? <Layers className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-900 line-clamp-1">
                                                                {getItemName(item).split(' - ')[0]}
                                                            </div>
                                                            {(item.variant?.sku || item.rawMaterial?.sku) && (
                                                                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                                    <span className="font-mono bg-slate-100 px-1 rounded">{item.variant?.sku || item.rawMaterial?.sku}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    {item.variant ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/10">
                                                            Producto Final
                                                        </span>
                                                    ) : item.rawMaterial ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/10">
                                                            Materia Prima
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/10">
                                                            Desconocido
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-4 text-slate-700 font-medium">
                                                    {item.warehouse?.name || <span className="text-slate-400 italic">No asignado</span>}
                                                </TableCell>
                                                <TableCell className="py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {item.quantity <= 10 && (
                                                            <AlertCircle className="h-4 w-4 text-amber-500" />
                                                        )}
                                                        <span className="text-xl font-bold text-slate-900">
                                                            {formatQuantity(item.quantity)}
                                                        </span>
                                                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                            U
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )
            ) : null}

            {activeView === 'kardex' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <h2 className="text-lg font-bold text-slate-800">Kardex Materia Prima</h2>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">
                        {kardexRows.length} movimientos
                    </Badge>
                </div>
                <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-5 gap-3 border-b border-slate-100">
                    <div className="md:col-span-2">
                        <Label>Materia prima</Label>
                        <Select value={kardexMaterialId} onValueChange={setKardexMaterialId}>
                            <SelectTrigger className="bg-slate-50 border-slate-200">
                                <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {rawMaterials.map((material) => (
                                    <SelectItem key={material.id} value={material.id}>
                                        {material.name} ({material.sku})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Lote</Label>
                        <Input value={kardexLotCode} onChange={(e) => setKardexLotCode(e.target.value)} placeholder="Ej: LOT-001" />
                    </div>
                    <div>
                        <Label>Referencia</Label>
                        <Input value={kardexReference} onChange={(e) => setKardexReference(e.target.value)} placeholder="OP/INSPECCIÓN" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label>Desde</Label>
                            <Input type="date" value={kardexDateFrom} onChange={(e) => setKardexDateFrom(e.target.value)} />
                        </div>
                        <div>
                            <Label>Hasta</Label>
                            <Input type="date" value={kardexDateTo} onChange={(e) => setKardexDateTo(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loadingKardex ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : kardexErrorMessage ? (
                        <div className="p-4 text-red-500 bg-red-50 rounded-md m-4">
                            {kardexErrorMessage}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50/80">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Material</TableHead>
                                    <TableHead>Lote</TableHead>
                                    <TableHead>Movimiento</TableHead>
                                    <TableHead>Referencia</TableHead>
                                    <TableHead className="text-right">Cantidad</TableHead>
                                    <TableHead className="text-right">Saldo lote</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {kardexRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                                            Sin movimientos para los filtros actuales.
                                        </TableCell>
                                    </TableRow>
                                ) : kardexRows.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{new Date(row.occurredAt).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{row.rawMaterial?.name || 'N/A'}</div>
                                            <div className="text-xs text-slate-500">{row.rawMaterial?.sku || '-'}</div>
                                        </TableCell>
                                        <TableCell>{row.lot?.supplierLotCode || '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{row.movementType}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs text-slate-700">{row.referenceType || '-'}</div>
                                            <div className="font-mono text-xs text-slate-500">{row.referenceId || '-'}</div>
                                        </TableCell>
                                        <TableCell className={`text-right font-semibold ${Number(row.quantity) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                            {formatQuantity(Number(row.quantity))}
                                        </TableCell>
                                        <TableCell className="text-right">{formatQuantity(Number(row.balanceAfter))}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>
            ) : null}
        </div>
    );
}
