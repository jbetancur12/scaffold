import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Wand2 } from 'lucide-react';
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
        <div className="p-6 space-y-6">
            <div>
                <Button variant="ghost" onClick={() => navigate('/mrp/purchase-requisitions')} className="mb-3">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
                <h1 className="text-3xl font-bold">Nueva Requisición de Compra</h1>
                <p className="text-slate-600">Registra faltantes y luego conviértelos en orden de compra.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6 space-y-4">
                    <h2 className="text-xl font-semibold">Información General</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Solicitado por *</Label>
                            <Input value={form.requestedBy} onChange={(e) => setForm((p) => ({ ...p, requestedBy: e.target.value }))} />
                        </div>
                        <div>
                            <Label>Orden de producción (opcional)</Label>
                            <select
                                className="w-full mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white"
                                value={form.productionOrderId}
                                onChange={(e) => setForm((p) => ({ ...p, productionOrderId: e.target.value }))}
                            >
                                <option value="">Sin asociar OP (requisición manual)</option>
                                {productionOrders.map((order) => (
                                    <option key={order.id} value={order.id}>
                                        {order.code} - {getStatusLabel(order.status)}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-slate-500">
                                {selectedProductionOrder
                                    ? `Asociada a ${selectedProductionOrder.code}. Puedes cargar faltantes automáticamente.`
                                    : 'Si no asocias OP, la requisición se crea manualmente.'}
                            </p>
                        </div>
                        <div>
                            <Label>Necesario para</Label>
                            <Input type="date" value={form.neededBy} onChange={(e) => setForm((p) => ({ ...p, neededBy: e.target.value }))} />
                        </div>
                    </div>
                    <div>
                        <Label>Notas</Label>
                        <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={loadShortagesPreview}>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Cargar faltantes de OP
                        </Button>
                        <Button type="button" variant="outline" disabled={!canAutoGenerateFromOrder || creatingFromProductionOrder} onClick={handleAutoGenerateFromProductionOrder}>
                            {creatingFromProductionOrder ? 'Generando...' : 'Generar requisición automática'}
                        </Button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Ítems</h2>
                        <Button type="button" variant="outline" size="sm" onClick={addItem}>
                            <Plus className="mr-2 h-4 w-4" />
                            Agregar ítem
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={`req-item-${index}`} className="border rounded-md p-3 grid grid-cols-1 md:grid-cols-12 gap-3">
                                <div className="md:col-span-4">
                                    <Label>Materia prima *</Label>
                                    <select
                                        className="w-full mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm"
                                        value={item.rawMaterialId}
                                        onChange={(e) => updateItem(index, { rawMaterialId: e.target.value })}
                                    >
                                        <option value="">Selecciona...</option>
                                        {materials.map((material) => (
                                            <option key={material.id} value={material.id}>{material.name} ({material.sku})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <Label>Cantidad *</Label>
                                    <Input
                                        type="number"
                                        min={0.01}
                                        step={0.0001}
                                        value={item.quantity || ''}
                                        onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="md:col-span-4">
                                    <Label>Proveedor sugerido</Label>
                                    <select
                                        className="w-full mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm"
                                        value={item.suggestedSupplierId}
                                        onChange={(e) => updateItem(index, { suggestedSupplierId: e.target.value })}
                                    >
                                        <option value="">Sin sugerencia</option>
                                        {suppliers.map((supplier) => (
                                            <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-1 flex items-end">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={items.length === 1}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="md:col-span-12">
                                    <Label>Nota del ítem</Label>
                                    <Input value={item.notes} onChange={(e) => updateItem(index, { notes: e.target.value })} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => navigate('/mrp/purchase-requisitions')}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={creatingRequisition}>
                        {creatingRequisition ? 'Guardando...' : 'Crear requisición'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
