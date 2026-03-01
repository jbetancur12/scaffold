import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Wand2, ClipboardList, User, Calendar, FileText, Package, Building2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { useRawMaterialsQuery } from '@/hooks/mrp/useRawMaterials';
import { useSuppliersQuery } from '@/hooks/mrp/useSuppliers';
import { useCreatePurchaseRequisitionMutation, useCreatePurchaseRequisitionFromProductionOrderMutation } from '@/hooks/mrp/usePurchaseRequisitions';
import { useProductionOrdersQuery } from '@/hooks/mrp/useProductionOrders';
import { mrpApi } from '@/services/mrpApi';
import { ProductionOrderStatus } from '@scaffold/types';

interface RequisitionItemForm {
    rawMaterialId: string;
    quantity: number;
    suggestedSupplierId: string;
    notes: string;
}

export default function PurchaseRequisitionFormPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const preselectedProductionOrderId = searchParams.get('productionOrderId') || '';

    const [form, setForm] = useState({
        requestedBy: '',
        productionOrderId: preselectedProductionOrderId,
        neededBy: '',
        notes: '',
    });
    const [items, setItems] = useState<RequisitionItemForm[]>([
        { rawMaterialId: '', quantity: 0, suggestedSupplierId: '', notes: '' },
    ]);

    const { materials } = useRawMaterialsQuery(1, 200, '');
    const { data: suppliersResponse } = useSuppliersQuery(1, 200);
    const { data: productionOrdersResponse } = useProductionOrdersQuery(1, 200);
    const suppliers = suppliersResponse?.suppliers ?? [];
    const productionOrders = productionOrdersResponse?.orders ?? [];
    const { execute: createRequisition, loading: creatingRequisition } = useCreatePurchaseRequisitionMutation();
    const { execute: createFromProductionOrder, loading: creatingFromProductionOrder } = useCreatePurchaseRequisitionFromProductionOrderMutation();

    const canAutoGenerateFromOrder = useMemo(() => form.productionOrderId.trim().length > 0 && form.requestedBy.trim().length >= 2, [form]);
    const selectedProductionOrder = useMemo(
        () => productionOrders.find((order) => order.id === form.productionOrderId),
        [productionOrders, form.productionOrderId]
    );

    const getStatusLabel = (status: ProductionOrderStatus) => {
        switch (status) {
            case ProductionOrderStatus.DRAFT: return 'Borrador';
            case ProductionOrderStatus.PLANNED: return 'Planificada';
            case ProductionOrderStatus.IN_PROGRESS: return 'En Progreso';
            case ProductionOrderStatus.COMPLETED: return 'Completada';
            case ProductionOrderStatus.CANCELLED: return 'Cancelada';
            default: return status;
        }
    };

    const addItem = () => {
        setItems((prev) => [...prev, { rawMaterialId: '', quantity: 0, suggestedSupplierId: '', notes: '' }]);
    };

    const removeItem = (index: number) => {
        setItems((prev) => prev.filter((_, idx) => idx !== index));
    };

    const updateItem = (index: number, patch: Partial<RequisitionItemForm>) => {
        setItems((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
    };

    const loadShortagesPreview = async () => {
        if (!form.productionOrderId.trim()) {
            toast({ title: 'Error', description: 'Selecciona una orden de producción', variant: 'destructive' });
            return;
        }
        try {
            const requirements = await mrpApi.getMaterialRequirements(form.productionOrderId.trim());
            const shortages = requirements
                .filter((req) => Number(req.required) > Number(req.available))
                .map((req) => ({
                    rawMaterialId: req.material.id,
                    quantity: Number((Number(req.required) - Number(req.available)).toFixed(4)),
                    suggestedSupplierId: req.potentialSuppliers[0]?.supplier?.id || '',
                    notes: `Faltante OP ${form.productionOrderId.trim()}`,
                }));

            if (shortages.length === 0) {
                toast({ title: 'Sin faltantes', description: 'No hay materias primas faltantes en la OP.' });
                return;
            }
            setItems(shortages);
            toast({ title: 'Faltantes cargados', description: `Se cargaron ${shortages.length} ítems desde la OP.` });
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudieron cargar faltantes de la OP'), variant: 'destructive' });
        }
    };

    const handleAutoGenerateFromProductionOrder = async () => {
        if (!canAutoGenerateFromOrder) {
            toast({ title: 'Error', description: 'Completa solicitante y orden de producción', variant: 'destructive' });
            return;
        }
        try {
            const row = await createFromProductionOrder({
                productionOrderId: form.productionOrderId.trim(),
                payload: {
                    requestedBy: form.requestedBy.trim(),
                    neededBy: form.neededBy || undefined,
                    notes: form.notes || undefined,
                },
            });
            toast({ title: 'Requisición creada', description: 'Se generó automáticamente desde faltantes de la OP.' });
            navigate(`/mrp/purchase-requisitions?highlight=${row.id}`);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo crear la requisición desde la OP'), variant: 'destructive' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.requestedBy.trim()) {
            toast({ title: 'Error', description: 'Debes indicar el solicitante', variant: 'destructive' });
            return;
        }
        const invalidItems = items.filter((item) => !item.rawMaterialId || Number(item.quantity) <= 0);
        if (invalidItems.length > 0) {
            toast({ title: 'Error', description: 'Completa todos los ítems con material y cantidad', variant: 'destructive' });
            return;
        }
        try {
            const row = await createRequisition({
                requestedBy: form.requestedBy.trim(),
                productionOrderId: form.productionOrderId.trim() || undefined,
                neededBy: form.neededBy || undefined,
                notes: form.notes || undefined,
                items: items.map((item) => ({
                    rawMaterialId: item.rawMaterialId,
                    quantity: Number(item.quantity),
                    suggestedSupplierId: item.suggestedSupplierId || undefined,
                    notes: item.notes || undefined,
                })),
            });
            toast({ title: 'Requisición creada', description: 'La requisición de compra fue registrada.' });
            navigate(`/mrp/purchase-requisitions?highlight=${row.id}`);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo crear la requisición'), variant: 'destructive' });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-slate-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Header */}
                <div>
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/mrp/purchase-requisitions')}
                        className="mb-4 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a Requisiciones
                    </Button>
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-orange-50 rounded-2xl ring-1 ring-orange-100 shadow-sm shrink-0">
                            <ClipboardList className="h-7 w-7 text-orange-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Nueva Requisición de Compra</h1>
                            <p className="text-slate-500 mt-1 text-sm">Registra faltantes y conviértelos en órdenes de compra.</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* General Info Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500" />
                            <h2 className="font-semibold text-slate-800">Información General</h2>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                        <User className="h-3.5 w-3.5 text-slate-400" />
                                        Solicitado por <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        className="h-10 border-slate-200 focus-visible:ring-orange-500 rounded-xl bg-white"
                                        placeholder="Nombre del solicitante"
                                        value={form.requestedBy}
                                        onChange={(e) => setForm((p) => ({ ...p, requestedBy: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                        Necesario para
                                    </Label>
                                    <Input
                                        type="date"
                                        className="h-10 border-slate-200 focus-visible:ring-orange-500 rounded-xl bg-white"
                                        value={form.neededBy}
                                        onChange={(e) => setForm((p) => ({ ...p, neededBy: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                        <Package className="h-3.5 w-3.5 text-slate-400" />
                                        Orden de Producción <span className="text-slate-400 font-normal text-xs">(Opcional)</span>
                                    </Label>
                                    <select
                                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                                        value={form.productionOrderId}
                                        onChange={(e) => setForm((p) => ({ ...p, productionOrderId: e.target.value }))}
                                    >
                                        <option value="">Sin asociar OP (requisición manual)</option>
                                        {productionOrders.map((order) => (
                                            <option key={order.id} value={order.id}>
                                                {order.code} — {getStatusLabel(order.status)}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedProductionOrder && (
                                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                            <Sparkles className="h-3 w-3 text-orange-400" />
                                            Puedes cargar faltantes automáticamente desde <span className="font-semibold text-slate-700">{selectedProductionOrder.code}</span>.
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                                        Notas
                                    </Label>
                                    <Textarea
                                        className="resize-none border-slate-200 focus-visible:ring-orange-500 rounded-xl bg-white h-[80px]"
                                        placeholder="Observaciones o instrucciones adicionales..."
                                        value={form.notes}
                                        onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Auto-generate actions */}
                            {form.productionOrderId && (
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={loadShortagesPreview}
                                        className="rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50 font-medium"
                                    >
                                        <Wand2 className="mr-2 h-4 w-4" />
                                        Cargar faltantes de OP
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={!canAutoGenerateFromOrder || creatingFromProductionOrder}
                                        onClick={handleAutoGenerateFromProductionOrder}
                                        className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                                    >
                                        {creatingFromProductionOrder ? (
                                            <>
                                                <div className="animate-spin mr-2 h-4 w-4 border-2 border-slate-300 border-t-slate-700 rounded-full" />
                                                Generando...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Generar requisición automática
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-orange-500" />
                                <h2 className="font-semibold text-slate-800">Ítems de la Requisición</h2>
                                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                                    {items.length}
                                </span>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addItem}
                                className="rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50 font-medium h-9"
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                Agregar ítem
                            </Button>
                        </div>
                        <div className="p-6 space-y-4">
                            {items.map((item, index) => (
                                <div
                                    key={`req-item-${index}`}
                                    className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-4 group relative"
                                >
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeItem(index)}
                                            disabled={items.length === 1}
                                            className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>

                                    <div className="md:col-span-5 space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                                            <Package className="h-3 w-3 text-slate-400" />
                                            Materia Prima <span className="text-red-500">*</span>
                                        </Label>
                                        <select
                                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            value={item.rawMaterialId}
                                            onChange={(e) => updateItem(index, { rawMaterialId: e.target.value })}
                                        >
                                            <option value="">Selecciona material...</option>
                                            {materials.map((material) => (
                                                <option key={material.id} value={material.id}>
                                                    {material.name} ({material.sku})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="md:col-span-2 space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                            Cantidad <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            type="number"
                                            min={0.01}
                                            step={0.0001}
                                            className="h-10 border-slate-200 focus-visible:ring-orange-500 rounded-xl bg-white"
                                            placeholder="0"
                                            value={item.quantity || ''}
                                            onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })}
                                        />
                                    </div>

                                    <div className="md:col-span-5 space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                                            <Building2 className="h-3 w-3 text-slate-400" />
                                            Proveedor Sugerido
                                        </Label>
                                        <select
                                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            value={item.suggestedSupplierId}
                                            onChange={(e) => updateItem(index, { suggestedSupplierId: e.target.value })}
                                        >
                                            <option value="">Sin sugerencia de proveedor</option>
                                            {suppliers.map((supplier) => (
                                                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="md:col-span-12 space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nota del ítem</Label>
                                        <Input
                                            className="h-9 border-slate-200 focus-visible:ring-orange-500 rounded-xl bg-white text-sm"
                                            placeholder="Observación específica para este material..."
                                            value={item.notes}
                                            onChange={(e) => updateItem(index, { notes: e.target.value })}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sticky Footer */}
                    <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-lg p-4 flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => navigate('/mrp/purchase-requisitions')}
                            className="rounded-xl text-slate-600"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={creatingRequisition}
                            className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm shadow-orange-200 font-medium rounded-xl h-11 px-8 transition-all"
                        >
                            {creatingRequisition ? (
                                <>
                                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <ClipboardList className="mr-2 h-4 w-4" />
                                    Crear Requisición
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
