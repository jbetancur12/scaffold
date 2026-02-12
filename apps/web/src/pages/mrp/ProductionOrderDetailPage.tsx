import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mrpApi, MaterialRequirement } from '@/services/mrpApi';
import { ProductionOrder, ProductionOrderStatus, ProductionOrderItem, ProductVariant, Product, Warehouse } from '@scaffold/types';
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

export default function ProductionOrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [order, setOrder] = useState<ProductionOrder | null>(null);
    const [requirements, setRequirements] = useState<MaterialRequirement[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingReqs, setLoadingReqs] = useState(false);

    // Warehouse selection for completion
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const loadOrder = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await mrpApi.getProductionOrder(id);
            setOrder(data);
        } catch (error) {
            console.error('Error loading production order:', error);
            toast({
                title: "Error",
                description: "No se pudo cargar la orden de producción",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [id, toast]);

    const loadRequirements = useCallback(async () => {
        if (!id) return;
        try {
            setLoadingReqs(true);
            const data = await mrpApi.getMaterialRequirements(id);
            setRequirements(data);
        } catch (error) {
            console.error('Error loading requirements:', error);
            toast({
                title: "Error",
                description: "No se pudieron calcular los requerimientos",
                variant: "destructive"
            });
        } finally {
            setLoadingReqs(false);
        }
    }, [id, toast]);

    const loadWarehouses = useCallback(async () => {
        try {
            const data = await mrpApi.getWarehouses();
            setWarehouses(data);
        } catch (error) {
            console.error('Error loading warehouses', error);
        }
    }, []);

    useEffect(() => {
        loadOrder();
        loadWarehouses();
    }, [loadOrder, loadWarehouses]);

    useEffect(() => {
        if (order) loadRequirements();
    }, [order, loadRequirements]);

    const handleStatusChange = async (newStatus: ProductionOrderStatus) => {
        if (!order) return;

        if (newStatus === ProductionOrderStatus.COMPLETED) {
            setIsCompleteDialogOpen(true);
            return;
        }

        try {
            await mrpApi.updateProductionOrderStatus(order.id, newStatus);
            toast({ title: "Estado actualizado", description: `La orden ahora está: ${newStatus}` });
            loadOrder();
        } catch (error) {
            toast({
                title: "Error al actualizar",
                description: "No se pudo cambiar el estado",
                variant: "destructive"
            });
        }
    };

    const handleComplete = async () => {
        if (!order) return;
        try {
            setSubmitting(true);
            await mrpApi.updateProductionOrderStatus(order.id, ProductionOrderStatus.COMPLETED, selectedWarehouseId || undefined);
            toast({ title: "Orden completada", description: "El producto terminado ha sido agregado al inventario." });
            setIsCompleteDialogOpen(false);
            loadOrder();
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo completar la orden",
                variant: "destructive"
            });
        } finally {
            setSubmitting(false);
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
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/mrp/production-orders')}>
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
