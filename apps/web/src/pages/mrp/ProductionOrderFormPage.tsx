import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mrpApi, MaterialRequirement } from '@/services/mrpApi';
import { Product, ProductionOrder, ProductionOrderStatus } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
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
import { ArrowLeft, Plus, Save, Trash2, ClipboardList } from 'lucide-react';
import { CreateProductionOrderSchema } from '@scaffold/schemas';
import { getErrorMessage } from '@/lib/api-error';

interface OrderItem {
    id: string; // temp id for UI
    productId: string;
    variantId: string;
    quantity: number;
}

export default function ProductionOrderFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [order, setOrder] = useState<ProductionOrder | null>(null);
    const [requirements, setRequirements] = useState<MaterialRequirement[]>([]);
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        notes: '',
    });

    const loadProducts = useCallback(async () => {
        try {
            const data = await mrpApi.getProducts(1, 1000);
            setProducts(data.products);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }, []);

    const loadRequirements = useCallback(async (orderId: string) => {
        try {
            const reqs = await mrpApi.getMaterialRequirements(orderId);
            setRequirements(reqs);
        } catch (error) {
            console.error('Error loading requirements:', error);
        }
    }, []);

    const loadOrder = useCallback(async () => {
        try {
            setLoading(true);
            const data = await mrpApi.getProductionOrder(id!);
            setOrder(data);
            setFormData({
                startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '',
                endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
                notes: data.notes || '',
            });

            // Load requirements if order exists
            loadRequirements(id!);

        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo cargar la orden'), variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [id, loadRequirements, toast]);

    useEffect(() => {
        loadProducts();
        if (id) {
            loadOrder();
        }
    }, [id, loadOrder, loadProducts]);

    const handleAddItem = () => {
        setItems([
            ...items,
            {
                id: crypto.randomUUID(),
                productId: '',
                variantId: '',
                quantity: 1,
            },
        ]);
    };

    const handleRemoveItem = (itemId: string) => {
        setItems(items.filter((item) => item.id !== itemId));
    };

    const handleItemChange = (itemId: string, field: keyof OrderItem, value: string | number) => {
        setItems(items.map((item) => {
            if (item.id === itemId) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'productId') {
                    updatedItem.variantId = '';
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const getVariantsForProduct = (productId: string) => {
        return products.find((p) => p.id === productId)?.variants || [];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const payload = {
                ...formData,
                items: items.map(item => ({
                    variantId: item.variantId,
                    quantity: item.quantity
                }))
            };
            CreateProductionOrderSchema.parse(payload);

            if (isEditing) {
                toast({ title: 'Info', description: 'Edición en construcción' });
            } else {
                const newOrder = await mrpApi.createProductionOrder(payload);
                toast({ title: 'Éxito', description: 'Orden creada exitosamente' });
                // Instead of navigating away, maybe go to view mode?
                navigate(`/mrp/production-orders/${newOrder.id}`);
            }
        } catch (error: unknown) {
            toast({ title: 'Error', description: getErrorMessage(error, 'Error al guardar'), variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: ProductionOrderStatus) => {
        if (!order) return;
        try {
            setLoading(true);
            const updatedOrder = await mrpApi.updateProductionOrderStatus(order.id, newStatus);
            setOrder(updatedOrder);
            toast({ title: 'Estado actualizado', description: `La orden ahora está en estado: ${newStatus}` });

            if (newStatus === ProductionOrderStatus.COMPLETED) {
                toast({ title: 'Inventario Actualizado', description: 'Se han agregado los productos terminados al inventario.', className: 'bg-green-50 border-green-200 text-green-800' });
            }
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo actualizar el estado'), variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const isReadOnly = isEditing && order?.status !== ProductionOrderStatus.DRAFT;

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/mrp/production-orders')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            {isEditing ? `Orden: ${order?.code || '...'}` : 'Nueva Orden de Producción'}
                        </h1>
                        <p className="text-slate-500">
                            {isEditing ? `Estado: ${order?.status}` : 'Define los productos a fabricar.'}
                        </p>
                    </div>
                </div>

                {isEditing && order && (
                    <div className="flex gap-2">
                        {order.status === ProductionOrderStatus.DRAFT && (
                            <Button onClick={() => handleStatusChange(ProductionOrderStatus.PLANNED)} className="bg-blue-600 hover:bg-blue-700">
                                Planificar Orden
                            </Button>
                        )}
                        {order.status === ProductionOrderStatus.PLANNED && (
                            <Button onClick={() => handleStatusChange(ProductionOrderStatus.IN_PROGRESS)} className="bg-amber-600 hover:bg-amber-700">
                                Iniciar Producción
                            </Button>
                        )}
                        {order.status === ProductionOrderStatus.IN_PROGRESS && (
                            <Button onClick={() => handleStatusChange(ProductionOrderStatus.COMPLETED)} className="bg-green-600 hover:bg-green-700">
                                Finalizar Orden
                            </Button>
                        )}
                        {order.status !== ProductionOrderStatus.COMPLETED && order.status !== ProductionOrderStatus.CANCELLED && (
                            <Button variant="destructive" size="icon" title="Cancelar Orden" onClick={() => handleStatusChange(ProductionOrderStatus.CANCELLED)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid gap-6 md:grid-cols-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="space-y-2">
                        <Label htmlFor="startDate">Fecha de Inicio</Label>
                        <Input
                            id="startDate"
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            disabled={isReadOnly}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="endDate">Fecha de Fin</Label>
                        <Input
                            id="endDate"
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            disabled={isReadOnly}
                        />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label htmlFor="notes">Notas</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>

                {/* ITEMS SECTION */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">Items de Producción</h2>
                        {!isReadOnly && (
                            <Button type="button" variant="secondary" size="sm" onClick={handleAddItem}>
                                <Plus className="mr-2 h-4 w-4" /> Agregar
                            </Button>
                        )}
                    </div>

                    {/* If in view mode and items loaded from API */}
                    {isEditing && order?.items && items.length === 0 ? (
                        <div className="space-y-2">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {order.items.map((item: any) => (
                                <div key={item.id} className="p-4 bg-slate-50 rounded-lg flex justify-between items-center">
                                    <div>
                                        <span className="font-semibold text-slate-900">
                                            {item.variant?.product?.name || 'Producto sin nombre'}
                                        </span>
                                        <span className="text-slate-600"> - </span>
                                        <span className="text-slate-700">
                                            {item.variant?.name || 'Variante sin nombre'}
                                        </span>
                                    </div>
                                    <span className="font-bold text-slate-900">{item.quantity} un.</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Variante</TableHead>
                                    <TableHead>Cantidad</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Select
                                                value={item.productId}
                                                onValueChange={(val) => handleItemChange(item.id, 'productId', val)}
                                                disabled={isReadOnly}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Producto" /></SelectTrigger>
                                                <SelectContent>
                                                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={item.variantId}
                                                onValueChange={(val) => handleItemChange(item.id, 'variantId', val)}
                                                disabled={!item.productId || isReadOnly}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Variante" /></SelectTrigger>
                                                <SelectContent>
                                                    {getVariantsForProduct(item.productId).map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number" min="1"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                                disabled={isReadOnly}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {!isReadOnly && (
                                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {/* REQUIREMENTS SECTION (View Only) */}
                {isEditing && (
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 mt-8">
                        <div className="flex items-center gap-2 mb-4">
                            <ClipboardList className="h-5 w-5 text-slate-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Requerimientos de Material (Plan)</h2>
                        </div>

                        {requirements.length === 0 ? (
                            <p className="text-slate-500 italic">No hay requerimientos calculados o disponibles.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Material</TableHead>
                                        <TableHead>Requerido</TableHead>
                                        <TableHead>Disponible</TableHead>
                                        <TableHead>Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requirements.map((req, idx) => {
                                        // API returns: { material: { name, unit, ... }, required, available }
                                        const { material, required, available } = req;
                                        const missing = Math.max(0, required - available);

                                        return (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">{material?.name || 'N/A'}</TableCell>
                                                <TableCell>{required || 0} {material?.unit || ''}</TableCell>
                                                <TableCell>{available || 0} {material?.unit || ''}</TableCell>
                                                <TableCell>
                                                    {missing > 0 ? (
                                                        <span className="text-red-600 font-bold">Falta {missing.toFixed(2)}</span>
                                                    ) : (
                                                        <span className="text-green-600">Cubierto</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="ghost" onClick={() => navigate('/mrp/production-orders')}>
                        Volver
                    </Button>
                    {!isReadOnly && (
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Guardando...' : <><Save className="mr-2 h-4 w-4" /> Guardar</>}
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
}
