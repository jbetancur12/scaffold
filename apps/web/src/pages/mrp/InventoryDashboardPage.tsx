import { useState, useEffect } from 'react';

import { mrpApi } from '@/services/mrpApi';
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
import { Loader2, Package, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatQuantity } from '@/lib/utils';

interface PopulatedInventoryItem extends InventoryItem {
    variant?: ProductVariant & { product?: Product };
    rawMaterial?: RawMaterial;
    warehouse?: Warehouse;
}

export default function InventoryDashboardPage() {
    const { toast } = useToast();
    const [inventory, setInventory] = useState<PopulatedInventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Manual Add State
    const [isManualAddOpen, setIsManualAddOpen] = useState(false);
    const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [selectedFilterWarehouseId, setSelectedFilterWarehouseId] = useState<string>('all');
    const [selectedMaterialId, setSelectedMaterialId] = useState('');
    const [manualQuantity, setManualQuantity] = useState('');
    const [manualCost, setManualCost] = useState('');
    const [submittingManual, setSubmittingManual] = useState(false);

    useEffect(() => {
        loadInventory();
        loadRawMaterials();
        loadWarehouses();
    }, [selectedFilterWarehouseId]);

    const loadInventory = async () => {
        try {
            setLoading(true);
            const warehouseId = selectedFilterWarehouseId === 'all' ? undefined : selectedFilterWarehouseId;
            const data = await mrpApi.getInventory(1, 100, warehouseId); // Fetch mostly all for now
            setInventory(data.items as PopulatedInventoryItem[]);
        } catch (err) {
            console.error(err);
            setError('Error al cargar el inventario');
        } finally {
            setLoading(false);
        }
    };

    const loadWarehouses = async () => {
        try {
            const data = await mrpApi.getWarehouses();
            setWarehouses(data);
        } catch (err) {
            console.error('Error loading warehouses', err);
        }
    };

    const loadRawMaterials = async () => {
        try {
            const data = await mrpApi.getRawMaterials(1, 100);

            setRawMaterials(data.materials || []);
        } catch (err) {
            console.error('Error loading raw materials', err);
        }
    };

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
            setSubmittingManual(true);
            await mrpApi.addManualStock({
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
            loadInventory(); // Reload to see changes
        } catch (err) {
            console.error(err);
            toast({
                title: 'Error',
                description: 'No se pudo agregar el stock manual.',
                variant: 'destructive',
            });
        } finally {
            setSubmittingManual(false);
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

    const getItemType = (item: PopulatedInventoryItem) => {
        if (item.variant) return <Badge variant="default">Producto Final</Badge>;
        if (item.rawMaterial) return <Badge variant="secondary">Materia Prima</Badge>;
        return <Badge variant="outline">Desconocido</Badge>;
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Inventario
                    </h1>
                    <p className="text-slate-500">
                        Gestión de Stock: Materias Primas y Productos Terminados por Almacén.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Select value={selectedFilterWarehouseId} onValueChange={setSelectedFilterWarehouseId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filtrar por Almacén" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Almacenes</SelectItem>
                            {warehouses.map((w) => (
                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Dialog open={isManualAddOpen} onOpenChange={setIsManualAddOpen}>
                        <DialogTrigger asChild>
                            <Button>
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

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                <div className="p-4 text-red-500 bg-red-50 rounded-md">
                    {error}
                </div>
            ) : (
                <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ítem</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Almacén</TableHead>
                                <TableHead className="text-right">Cantidad</TableHead>
                                <TableHead>Última Actualización</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inventory.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No hay ítems en inventario.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                inventory.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4 text-slate-400" />
                                                {getItemName(item)}
                                            </div>
                                        </TableCell>
                                        <TableCell>{getItemType(item)}</TableCell>
                                        <TableCell>{item.warehouse?.name || '---'}</TableCell>
                                        <TableCell className="text-right font-bold text-lg text-slate-700">
                                            {formatQuantity(item.quantity)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {item.updatedAt ? format(new Date(item.updatedAt), 'dd/MM/yyyy HH:mm') : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
