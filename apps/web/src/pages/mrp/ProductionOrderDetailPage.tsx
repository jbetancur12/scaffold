import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProductionOrderStatus, ProductionOrderItem, ProductVariant, Product } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ArrowLeft, Printer, Play, CheckCircle, Truck, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ProductionRequirementsTable } from '@/components/mrp/ProductionRequirementsTable';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { getErrorMessage } from '@/lib/api-error';
import { useWarehousesQuery } from '@/hooks/mrp/useWarehouses';
import {
    useAddProductionBatchUnitsMutation,
    useCreateProductionBatchMutation,
    useProductionBatchesQuery,
    useProductionOrderQuery,
    useProductionRequirementsQuery,
    useUpdateProductionBatchPackagingMutation,
    useUpdateProductionBatchQcMutation,
    useUpdateProductionBatchUnitPackagingMutation,
    useUpdateProductionBatchUnitQcMutation,
    useUpdateProductionOrderStatusMutation,
} from '@/hooks/mrp/useProductionOrders';

export default function ProductionOrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Warehouse selection for completion
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
    const [newBatchVariantId, setNewBatchVariantId] = useState<string>('');
    const [newBatchQty, setNewBatchQty] = useState<number>(1);
    const [newBatchCode, setNewBatchCode] = useState<string>('');

    const { data: order, loading, error, execute: reloadOrder } = useProductionOrderQuery(id);
    const { data: requirementsData, loading: loadingReqs, error: requirementsError } = useProductionRequirementsQuery(id);
    const { data: batchesData, error: batchesError, execute: reloadBatches } = useProductionBatchesQuery(id);
    const { data: warehousesData, error: warehousesError } = useWarehousesQuery();
    const requirements = requirementsData ?? [];
    const batches = batchesData ?? [];
    const warehouses = warehousesData ?? [];
    const { execute: updateOrderStatus, loading: submitting } = useUpdateProductionOrderStatusMutation();
    const { execute: createBatch, loading: creatingBatch } = useCreateProductionBatchMutation();
    const { execute: addBatchUnits } = useAddProductionBatchUnitsMutation();
    const { execute: updateBatchQc } = useUpdateProductionBatchQcMutation();
    const { execute: updateBatchPackaging } = useUpdateProductionBatchPackagingMutation();
    const { execute: updateUnitQc } = useUpdateProductionBatchUnitQcMutation();
    const { execute: updateUnitPackaging } = useUpdateProductionBatchUnitPackagingMutation();

    useEffect(() => {
        if (!error) return;
        toast({
            title: "Error",
            description: getErrorMessage(error, 'No se pudo cargar la orden de producción'),
            variant: "destructive"
        });
        navigate('/mrp/production-orders');
    }, [error, navigate, toast]);

    useEffect(() => {
        if (!requirementsError) return;
        toast({
            title: "Error",
            description: getErrorMessage(requirementsError, 'No se pudieron calcular los requerimientos'),
            variant: "destructive"
        });
    }, [requirementsError, toast]);

    useEffect(() => {
        if (!warehousesError) return;
        toast({
            title: "Error",
            description: getErrorMessage(warehousesError, 'No se pudieron cargar los almacenes'),
            variant: "destructive"
        });
    }, [warehousesError, toast]);

    useEffect(() => {
        if (!batchesError) return;
        toast({
            title: "Error",
            description: getErrorMessage(batchesError, 'No se pudieron cargar los lotes'),
            variant: "destructive"
        });
    }, [batchesError, toast]);

    const handleStatusChange = async (newStatus: ProductionOrderStatus) => {
        if (!order) return;

        if (newStatus === ProductionOrderStatus.COMPLETED) {
            setIsCompleteDialogOpen(true);
            return;
        }

        try {
            await updateOrderStatus({ orderId: order.id, status: newStatus });
            toast({ title: "Estado actualizado", description: `La orden ahora está: ${newStatus}` });
            await reloadOrder({ force: true });
        } catch (error) {
            toast({
                title: "Error al actualizar",
                description: getErrorMessage(error, 'No se pudo cambiar el estado'),
                variant: "destructive"
            });
        }
    };

    const handleComplete = async () => {
        if (!order) return;
        try {
            await updateOrderStatus({
                orderId: order.id,
                status: ProductionOrderStatus.COMPLETED,
                warehouseId: selectedWarehouseId || undefined,
            });
            toast({ title: "Orden completada", description: "El producto terminado ha sido agregado al inventario." });
            setIsCompleteDialogOpen(false);
            await reloadOrder({ force: true });
        } catch (error) {
            toast({
                title: "Error",
                description: getErrorMessage(error, 'No se pudo completar la orden'),
                variant: "destructive"
            });
        }
    };

    const handleCreateBatch = async () => {
        if (!id || !newBatchVariantId || newBatchQty <= 0) return;
        try {
            await createBatch({
                orderId: id,
                variantId: newBatchVariantId,
                plannedQty: newBatchQty,
                code: newBatchCode || undefined,
            });
            toast({ title: 'Lote creado', description: 'Lote creado correctamente.' });
            setNewBatchCode('');
            await reloadBatches({ force: true });
            await reloadOrder({ force: true });
        } catch (err) {
            toast({
                title: 'Error',
                description: getErrorMessage(err, 'No se pudo crear el lote'),
                variant: 'destructive',
            });
        }
    };

    const handleAddUnits = async (batchId: string) => {
        if (!id) return;
        const value = prompt('Cantidad de unidades a generar para este lote:', '1');
        const quantity = Number(value);
        if (!quantity || quantity <= 0) return;
        try {
            await addBatchUnits({ orderId: id, batchId, quantity });
            toast({ title: 'Unidades generadas', description: `${quantity} unidades agregadas al lote.` });
            await reloadBatches({ force: true });
        } catch (err) {
            toast({
                title: 'Error',
                description: getErrorMessage(err, 'No se pudieron generar unidades'),
                variant: 'destructive',
            });
        }
    };

    const handleBatchQc = async (batchId: string, passed: boolean) => {
        if (!id) return;
        try {
            await updateBatchQc({ orderId: id, batchId, passed });
            await reloadBatches({ force: true });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo actualizar QC'), variant: 'destructive' });
        }
    };

    const handleBatchPackaging = async (batchId: string, packed: boolean) => {
        if (!id) return;
        try {
            await updateBatchPackaging({ orderId: id, batchId, packed });
            await reloadBatches({ force: true });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo actualizar empaque'), variant: 'destructive' });
        }
    };

    const handleUnitQc = async (unitId: string, passed: boolean) => {
        if (!id) return;
        try {
            await updateUnitQc({ orderId: id, unitId, passed });
            await reloadBatches({ force: true });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo actualizar QC de unidad'), variant: 'destructive' });
        }
    };

    const handleUnitPackaging = async (unitId: string, packaged: boolean) => {
        if (!id) return;
        try {
            await updateUnitPackaging({ orderId: id, unitId, packaged });
            await reloadBatches({ force: true });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo actualizar empaque de unidad'), variant: 'destructive' });
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8">Cargando...</div>;
    }

    if (!order) {
        return <div className="p-8">Orden no encontrada</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/mrp/production-orders')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            {order.code}
                            <Badge variant="outline" className="ml-2">
                                {order.status}
                            </Badge>
                        </h1>
                        <p className="text-slate-500">Detalle de Orden de Producción</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {order.status === ProductionOrderStatus.DRAFT && (
                        <Button onClick={() => handleStatusChange(ProductionOrderStatus.PLANNED)} className="bg-blue-600 hover:bg-blue-700">
                            <Truck className="mr-2 h-4 w-4" />
                            Planificar
                        </Button>
                    )}
                    {order.status === ProductionOrderStatus.PLANNED && (
                        <Button onClick={() => handleStatusChange(ProductionOrderStatus.IN_PROGRESS)} className="bg-amber-600 hover:bg-amber-700">
                            <Play className="mr-2 h-4 w-4" />
                            Iniciar Producción
                        </Button>
                    )}
                    {order.status === ProductionOrderStatus.IN_PROGRESS && (
                        <Button onClick={() => handleStatusChange(ProductionOrderStatus.COMPLETED)} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Finalizar
                        </Button>
                    )}
                    <Button variant="outline" size="icon">
                        <Printer className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="details" className="w-full">
                <TabsList>
                    <TabsTrigger value="details">Detalles</TabsTrigger>
                    <TabsTrigger value="procurement">Aprovisionamiento</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Información General</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-slate-500">Fecha Inicio:</span>
                                    <span>{order.startDate ? format(new Date(order.startDate), 'dd/MM/yyyy') : '-'}</span>

                                    <span className="text-slate-500">Fecha Fin:</span>
                                    <span>{order.endDate ? format(new Date(order.endDate), 'dd/MM/yyyy') : '-'}</span>

                                    <span className="text-slate-500">Notas:</span>
                                    <span className="col-span-2 mt-1 p-2 bg-slate-50 rounded border text-slate-700 text-xs">
                                        {order.notes || "Sin notas"}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Items a Producir</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {order.items?.map((item) => {
                                        const populatedItem = item as ProductionOrderItem & { variant?: ProductVariant & { product?: Product } };
                                        return (
                                            <div key={item.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                                                <div>
                                                    <div className="font-medium">{populatedItem.variant?.product?.name} - {populatedItem.variant?.name}</div>
                                                    <div className="text-xs text-slate-500">{populatedItem.variant?.sku}</div>
                                                </div>
                                                <div className="font-bold text-lg">
                                                    {item.quantity} unds
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Trazabilidad por Lotes</CardTitle>
                            <CardDescription>
                                Crea lotes, controla QC y empaque. La orden solo se puede finalizar cuando todos los lotes estén liberados.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                <Select value={newBatchVariantId} onValueChange={setNewBatchVariantId}>
                                    <SelectTrigger className="md:col-span-2">
                                        <SelectValue placeholder="Variante para el lote" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(order.items ?? []).map((item) => {
                                            const populatedItem = item as ProductionOrderItem & { variant?: ProductVariant & { product?: Product } };
                                            return (
                                                <SelectItem key={item.variantId} value={item.variantId}>
                                                    {populatedItem.variant?.product?.name} - {populatedItem.variant?.name}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                                <input
                                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    type="number"
                                    min={1}
                                    value={newBatchQty}
                                    onChange={(e) => setNewBatchQty(Number(e.target.value) || 1)}
                                    placeholder="Cantidad"
                                />
                                <Button onClick={handleCreateBatch} disabled={!newBatchVariantId || creatingBatch}>
                                    {creatingBatch ? 'Creando...' : 'Crear Lote'}
                                </Button>
                            </div>
                            <input
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full md:w-1/2"
                                value={newBatchCode}
                                onChange={(e) => setNewBatchCode(e.target.value)}
                                placeholder="Código lote opcional"
                            />

                            <div className="space-y-3">
                                {batches.length === 0 ? (
                                    <div className="text-sm text-slate-500">Sin lotes registrados.</div>
                                ) : (
                                    batches.map((batch) => (
                                        <div key={batch.id} className="border rounded-md p-3 space-y-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <div className="font-semibold">{batch.code}</div>
                                                    <div className="text-xs text-slate-500">
                                                        {batch.variant?.product?.name} - {batch.variant?.name} | Plan: {batch.plannedQty} | Producido: {batch.producedQty}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="outline">QC: {batch.qcStatus}</Badge>
                                                    <Badge variant="outline">Empaque: {batch.packagingStatus}</Badge>
                                                    <Button size="sm" variant="outline" onClick={() => handleAddUnits(batch.id)}>+ Unidades</Button>
                                                    <Button size="sm" variant="outline" onClick={() => handleBatchQc(batch.id, true)}>QC OK</Button>
                                                    <Button size="sm" variant="outline" onClick={() => handleBatchPackaging(batch.id, true)}>Empacar</Button>
                                                </div>
                                            </div>

                                            {(batch.units ?? []).length > 0 ? (
                                                <div className="overflow-auto">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b">
                                                                <th className="text-left p-1">Serial</th>
                                                                <th className="text-left p-1">QC</th>
                                                                <th className="text-left p-1">Empaque</th>
                                                                <th className="text-right p-1">Acciones</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {(batch.units ?? []).map((unit) => (
                                                                <tr key={unit.id} className="border-b">
                                                                    <td className="p-1">{unit.serialCode}</td>
                                                                    <td className="p-1">{unit.qcPassed ? 'OK' : 'Pendiente'}</td>
                                                                    <td className="p-1">{unit.packaged ? 'Empacada' : 'Pendiente'}</td>
                                                                    <td className="p-1 text-right space-x-1">
                                                                        <Button size="sm" variant="ghost" onClick={() => handleUnitQc(unit.id, true)}>QC</Button>
                                                                        <Button size="sm" variant="ghost" onClick={() => handleUnitPackaging(unit.id, true)}>Emp</Button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="procurement">
                    <Card>
                        <CardHeader>
                            <CardTitle>Análisis de Materiales</CardTitle>
                            <CardDescription>
                                Requerimientos de materia prima para esta orden y disponibilidad en inventario.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingReqs ? (
                                <div className="text-center py-8">Calculando requerimientos...</div>
                            ) : (
                                <ProductionRequirementsTable requirements={requirements} />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Finalizar Orden de Producción</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <p className="text-sm text-slate-500">
                            ¿Estás seguro de finalizar esta orden? Los productos terminados se agregarán al inventario.
                        </p>
                        <div className="grid gap-2">
                            <Label htmlFor="warehouse">Almacén de Destino</Label>
                            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar almacén (Opcional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((w) => (
                                        <SelectItem key={w.id} value={w.id}>
                                            {w.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-400">
                                Si no selecciona uno, se usará el Almacén Principal.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleComplete} disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Finalizando...
                                </>
                            ) : (
                                'Confirmar y Finalizar'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
