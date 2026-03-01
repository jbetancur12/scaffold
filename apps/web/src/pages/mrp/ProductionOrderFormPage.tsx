import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MaterialRequirement } from '@/services/mrpApi';
import { Product, ProductionOrder, ProductionOrderStatus } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import {
    ArrowLeft, Plus, Save, Trash2, ClipboardList,
    Factory, Calendar, FileText, Package, CheckCircle2,
    AlertCircle, PlayCircle, XCircle, Loader2, TrendingUp
} from 'lucide-react';
import { CreateProductionOrderSchema } from '@scaffold/schemas';
import { getErrorMessage } from '@/lib/api-error';
import { useProductsQuery } from '@/hooks/mrp/useProducts';
import { useCreateProductionOrderMutation, useProductionOrderQuery, useProductionRequirementsQuery, useUpdateProductionOrderStatusMutation } from '@/hooks/mrp/useProductionOrders';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';

interface OrderItem {
    id: string;
    productId: string;
    variantId: string;
    quantity: number;
}

type PopulatedProductionOrderItem = NonNullable<ProductionOrder['items']>[number] & {
    variant?: {
        name?: string;
        product?: {
            name?: string;
        };
    };
};

const statusConfig: Record<ProductionOrderStatus, { label: string; classes: string; icon: React.ReactNode }> = {
    [ProductionOrderStatus.DRAFT]: {
        label: 'Borrador',
        classes: 'bg-slate-50 text-slate-600 border-slate-200 ring-slate-500/10',
        icon: <FileText className="h-3.5 w-3.5" />,
    },
    [ProductionOrderStatus.PLANNED]: {
        label: 'Planificada',
        classes: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20',
        icon: <ClipboardList className="h-3.5 w-3.5" />,
    },
    [ProductionOrderStatus.IN_PROGRESS]: {
        label: 'En Progreso',
        classes: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
        icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    },
    [ProductionOrderStatus.COMPLETED]: {
        label: 'Completada',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    [ProductionOrderStatus.CANCELLED]: {
        label: 'Cancelada',
        classes: 'bg-red-50 text-red-600 border-red-200 ring-red-500/10',
        icon: <XCircle className="h-3.5 w-3.5" />,
    },
};

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

    const { data: productsResponse, error: productsError } = useProductsQuery(1, 1000);
    const { data: orderData, error: orderError } = useProductionOrderQuery(isEditing ? id : undefined);
    const { data: requirementsData, error: requirementsError } = useProductionRequirementsQuery(isEditing ? id : undefined);
    const { execute: createProductionOrder } = useCreateProductionOrderMutation();
    const { execute: updateOrderStatus } = useUpdateProductionOrderStatusMutation();

    useEffect(() => {
        setProducts(productsResponse?.products ?? []);
    }, [productsResponse]);

    useEffect(() => {
        if (!orderData) return;
        setOrder(orderData);
        setFormData({
            startDate: orderData.startDate ? new Date(orderData.startDate).toISOString().split('T')[0] : '',
            endDate: orderData.endDate ? new Date(orderData.endDate).toISOString().split('T')[0] : '',
            notes: orderData.notes || '',
        });
    }, [orderData]);

    useEffect(() => {
        setRequirements(requirementsData ?? []);
    }, [requirementsData]);

    useMrpQueryErrorToast(productsError, 'No se pudo cargar la información');
    useMrpQueryErrorToast(orderError, 'No se pudo cargar la información');
    useMrpQueryErrorToast(requirementsError, 'No se pudo cargar la información');

    const handleAddItem = () => {
        setItems([...items, { id: crypto.randomUUID(), productId: '', variantId: '', quantity: 1 }]);
    };

    const handleRemoveItem = (itemId: string) => {
        setItems(items.filter((item) => item.id !== itemId));
    };

    const handleItemChange = (itemId: string, field: keyof OrderItem, value: string | number) => {
        setItems(items.map((item) => {
            if (item.id === itemId) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'productId') updatedItem.variantId = '';
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
                items: items.map(item => ({ variantId: item.variantId, quantity: item.quantity }))
            };
            CreateProductionOrderSchema.parse(payload);
            if (isEditing) {
                toast({ title: 'Info', description: 'Edición en construcción' });
            } else {
                const newOrder = await createProductionOrder(payload);
                toast({ title: 'Éxito', description: 'Orden creada exitosamente' });
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
            const updatedOrder = await updateOrderStatus({ orderId: order.id, status: newStatus });
            setOrder(updatedOrder);
            toast({ title: 'Estado actualizado', description: `La orden ahora está en estado: ${newStatus}` });
            if (newStatus === ProductionOrderStatus.COMPLETED) {
                toast({ title: 'Inventario Actualizado', description: 'Se han agregado los productos terminados al inventario.', className: 'bg-green-50 border-green-200 text-green-800' });
            }
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo actualizar el estado'), variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const isReadOnly = isEditing && order?.status !== ProductionOrderStatus.DRAFT;
    const statusCfg = order ? statusConfig[order.status] : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/20 to-slate-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Header */}
                <div>
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/mrp/production-orders')}
                        className="mb-4 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a Órdenes
                    </Button>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-violet-50 rounded-2xl ring-1 ring-violet-100 shadow-sm shrink-0">
                                <Factory className="h-7 w-7 text-violet-600" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                        {isEditing ? (order?.code || '...') : 'Nueva Orden de Producción'}
                                    </h1>
                                    {statusCfg && (
                                        <Badge variant="outline" className={`inline-flex items-center gap-1.5 font-semibold ring-1 ring-inset ${statusCfg.classes}`}>
                                            {statusCfg.icon}
                                            {statusCfg.label}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-slate-500 mt-1 text-sm">
                                    {isEditing ? `Gestiona el ciclo de fabricación de esta orden.` : 'Define los productos y variantes a fabricar.'}
                                </p>
                            </div>
                        </div>

                        {/* Status Action Buttons */}
                        {isEditing && order && (
                            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                {order.status === ProductionOrderStatus.DRAFT && (
                                    <Button
                                        onClick={() => handleStatusChange(ProductionOrderStatus.PLANNED)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium h-10 px-5"
                                    >
                                        <ClipboardList className="mr-2 h-4 w-4" />
                                        Planificar
                                    </Button>
                                )}
                                {order.status === ProductionOrderStatus.PLANNED && (
                                    <Button
                                        onClick={() => handleStatusChange(ProductionOrderStatus.IN_PROGRESS)}
                                        className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium h-10 px-5"
                                    >
                                        <PlayCircle className="mr-2 h-4 w-4" />
                                        Iniciar Producción
                                    </Button>
                                )}
                                {order.status === ProductionOrderStatus.IN_PROGRESS && (
                                    <Button
                                        onClick={() => handleStatusChange(ProductionOrderStatus.COMPLETED)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium h-10 px-5"
                                    >
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Finalizar Orden
                                    </Button>
                                )}
                                {order.status !== ProductionOrderStatus.COMPLETED && order.status !== ProductionOrderStatus.CANCELLED && (
                                    <Button
                                        variant="outline"
                                        onClick={() => handleStatusChange(ProductionOrderStatus.CANCELLED)}
                                        className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl h-10 px-4"
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Cancelar
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* General Info */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-violet-500" />
                            <h2 className="font-semibold text-slate-800">Información General</h2>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                        Fecha de Inicio
                                    </Label>
                                    <Input
                                        type="date"
                                        className="h-10 border-slate-200 focus-visible:ring-violet-500 rounded-xl bg-white"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                        Fecha de Fin
                                    </Label>
                                    <Input
                                        type="date"
                                        className="h-10 border-slate-200 focus-visible:ring-violet-500 rounded-xl bg-white"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                                    Notas
                                </Label>
                                <Textarea
                                    className="resize-none border-slate-200 focus-visible:ring-violet-500 rounded-xl bg-white h-[80px]"
                                    placeholder="Instrucciones u observaciones para esta orden..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    disabled={isReadOnly}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-violet-500" />
                                <h2 className="font-semibold text-slate-800">Ítems de Producción</h2>
                                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                                    {isEditing && order?.items && items.length === 0 ? order.items.length : items.length}
                                </span>
                            </div>
                            {!isReadOnly && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddItem}
                                    className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50 font-medium h-9"
                                >
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    Agregar ítem
                                </Button>
                            )}
                        </div>
                        <div className="p-6">
                            {/* View mode: existing order items */}
                            {isEditing && order?.items && items.length === 0 ? (
                                <div className="space-y-3">
                                    {order.items.map((item) => {
                                        const populatedItem = item as PopulatedProductionOrderItem;
                                        return (
                                            <div key={item.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-violet-50 rounded-lg">
                                                        <Package className="h-4 w-4 text-violet-500" />
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-slate-900 text-sm">
                                                            {populatedItem.variant?.product?.name || 'Producto sin nombre'}
                                                        </span>
                                                        <span className="text-slate-500 mx-1.5">·</span>
                                                        <span className="text-slate-600 text-sm">
                                                            {populatedItem.variant?.name || 'Variante sin nombre'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-1 text-sm">
                                                    {item.quantity} un.
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : items.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">Sin ítems. Agrega al menos un producto para fabricar.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {items.map((item, idx) => (
                                        <div
                                            key={item.id}
                                            className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-4 group"
                                        >
                                            <div className="md:col-span-1 flex items-center">
                                                <span className="text-xs font-bold text-slate-400 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                                                    {idx + 1}
                                                </span>
                                            </div>
                                            <div className="md:col-span-4 space-y-1.5">
                                                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                                    Producto <span className="text-red-500">*</span>
                                                </Label>
                                                <Select
                                                    value={item.productId}
                                                    onValueChange={(val) => handleItemChange(item.id, 'productId', val)}
                                                    disabled={isReadOnly}
                                                >
                                                    <SelectTrigger className="h-10 border-slate-200 focus:ring-violet-500 rounded-xl bg-white">
                                                        <SelectValue placeholder="Selecciona producto" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {products.map(p => (
                                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="md:col-span-4 space-y-1.5">
                                                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                                    Variante <span className="text-red-500">*</span>
                                                </Label>
                                                <Select
                                                    value={item.variantId}
                                                    onValueChange={(val) => handleItemChange(item.id, 'variantId', val)}
                                                    disabled={!item.productId || isReadOnly}
                                                >
                                                    <SelectTrigger className="h-10 border-slate-200 focus:ring-violet-500 rounded-xl bg-white">
                                                        <SelectValue placeholder={item.productId ? 'Selecciona variante' : 'Elige producto primero'} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {getVariantsForProduct(item.productId).map(v => (
                                                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="md:col-span-2 space-y-1.5">
                                                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Cantidad</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    className="h-10 border-slate-200 focus-visible:ring-violet-500 rounded-xl bg-white"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                                    disabled={isReadOnly}
                                                />
                                            </div>
                                            <div className="md:col-span-1 flex items-end">
                                                {!isReadOnly && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveItem(item.id)}
                                                        className="h-10 w-10 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Material Requirements (edit/view only) */}
                    {isEditing && (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-violet-500" />
                                <h2 className="font-semibold text-slate-800">Requerimientos de Material</h2>
                            </div>
                            <div className="p-6">
                                {requirements.length === 0 ? (
                                    <p className="text-slate-400 italic text-sm text-center py-6">No hay requerimientos calculados o disponibles.</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50/80 border-b border-slate-100 hover:bg-slate-50/80">
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 pl-4">Material</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3">Requerido</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3">Disponible</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3">Estado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {requirements.map((req, idx) => {
                                                const { material, required, available } = req;
                                                const missing = Math.max(0, required - available);
                                                return (
                                                    <TableRow key={idx} className="border-b border-slate-50 hover:bg-slate-50/60">
                                                        <TableCell className="py-3 pl-4 font-semibold text-slate-800 text-sm">{material?.name || 'N/A'}</TableCell>
                                                        <TableCell className="py-3 text-sm text-slate-600">{required || 0} {material?.unit || ''}</TableCell>
                                                        <TableCell className="py-3 text-sm text-slate-600">{available || 0} {material?.unit || ''}</TableCell>
                                                        <TableCell className="py-3">
                                                            {missing > 0 ? (
                                                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 ring-1 ring-red-500/20 font-semibold flex items-center gap-1 w-fit">
                                                                    <AlertCircle className="h-3 w-3" />
                                                                    Falta {missing.toFixed(2)}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20 font-semibold flex items-center gap-1 w-fit">
                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                    Cubierto
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Sticky Footer */}
                    <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-lg p-4 flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => navigate('/mrp/production-orders')}
                            className="rounded-xl text-slate-600"
                        >
                            Cancelar
                        </Button>
                        {!isReadOnly && (
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-200 font-medium rounded-xl h-11 px-8 transition-all"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        {isEditing ? 'Guardar Cambios' : 'Crear Orden'}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
