import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Wand2, ClipboardList, User, Calendar, FileText, Package, Building2, Sparkles, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { useRawMaterialsQuery } from '@/hooks/mrp/useRawMaterials';
import { useSuppliersQuery } from '@/hooks/mrp/useSuppliers';
import { useCreatePurchaseRequisitionMutation } from '@/hooks/mrp/usePurchaseRequisitions';
import { useProductionOrdersQuery } from '@/hooks/mrp/useProductionOrders';
import { mrpApi } from '@/services/mrpApi';
import { ProductionOrder, ProductionOrderStatus } from '@scaffold/types';

interface SourceProductionOrderForm {
    productionOrderId: string;
    productionOrderCode?: string;
    quantity: number;
}

interface RequisitionItemForm {
    rawMaterialId: string;
    quantity: number;
    suggestedSupplierId: string;
    notes: string;
    sourceProductionOrders?: SourceProductionOrderForm[];
}

export default function PurchaseRequisitionFormPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const preselectedProductionOrderId = searchParams.get('productionOrderId') || '';

    const [form, setForm] = useState({
        requestedBy: '',
        neededBy: '',
        notes: '',
    });
    const [items, setItems] = useState<RequisitionItemForm[]>([
        { rawMaterialId: '', quantity: 0, suggestedSupplierId: '', notes: '' },
    ]);
    const [selectedProductionOrderIds, setSelectedProductionOrderIds] = useState<string[]>(
        preselectedProductionOrderId ? [preselectedProductionOrderId] : []
    );
    const [productionOrderSearch, setProductionOrderSearch] = useState('');
    const [loadingShortages, setLoadingShortages] = useState(false);

    const { materials } = useRawMaterialsQuery(1, 1000, '');
    const { data: suppliersResponse } = useSuppliersQuery(1, 200);
    const { data: productionOrdersResponse } = useProductionOrdersQuery(1, 200);
    const suppliers = suppliersResponse?.suppliers ?? [];
    const productionOrders = productionOrdersResponse?.orders ?? [];
    const { execute: createRequisition, loading: creatingRequisition } = useCreatePurchaseRequisitionMutation();

    const selectedProductionOrders = useMemo(
        () => selectedProductionOrderIds
            .map((id) => productionOrders.find((order) => order.id === id))
            .filter((order): order is ProductionOrder => Boolean(order)),
        [productionOrders, selectedProductionOrderIds]
    );
    const filteredProductionOrders = useMemo(() => {
        const term = productionOrderSearch.trim().toLowerCase();
        const selectedIdSet = new Set(selectedProductionOrderIds);
        return productionOrders.filter((order) => {
            if (!term) return true;
            return (
                order.code.toLowerCase().includes(term) ||
                getStatusLabel(order.status).toLowerCase().includes(term) ||
                (selectedIdSet.has(order.id) && 'seleccionada'.includes(term))
            );
        });
    }, [productionOrders, productionOrderSearch, selectedProductionOrderIds]);

    function getStatusLabel(status: ProductionOrderStatus) {
        switch (status) {
            case ProductionOrderStatus.DRAFT: return 'Borrador';
            case ProductionOrderStatus.PLANNED: return 'Planificada';
            case ProductionOrderStatus.IN_PROGRESS: return 'En Progreso';
            case ProductionOrderStatus.COMPLETED: return 'Completada';
            case ProductionOrderStatus.CANCELLED: return 'Cancelada';
            default: return status;
        }
    }

    const addItem = () => {
        setItems((prev) => [...prev, { rawMaterialId: '', quantity: 0, suggestedSupplierId: '', notes: '' }]);
    };

    const removeItem = (index: number) => {
        setItems((prev) => prev.filter((_, idx) => idx !== index));
    };

    const updateItem = (index: number, patch: Partial<RequisitionItemForm>) => {
        setItems((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
    };

    const toggleProductionOrder = (productionOrderId: string) => {
        setSelectedProductionOrderIds((prev) => (
            prev.includes(productionOrderId)
                ? prev.filter((id) => id !== productionOrderId)
                : [...prev, productionOrderId]
        ));
    };

    const loadShortagesPreview = async () => {
        if (selectedProductionOrderIds.length === 0) {
            toast({ title: 'Error', description: 'Selecciona al menos una orden de producción', variant: 'destructive' });
            return;
        }

        setLoadingShortages(true);
        try {
            const requirementsByOrder = await Promise.all(
                selectedProductionOrderIds.map(async (productionOrderId) => {
                    const order = productionOrders.find((row) => row.id === productionOrderId);
                    const requirements = await mrpApi.getMaterialRequirements(productionOrderId);
                    return {
                        productionOrderId,
                        productionOrderCode: order?.code || productionOrderId,
                        requirements,
                    };
                })
            );

            const consolidated = new Map<string, {
                rawMaterialId: string;
                quantity: number;
                suggestedSupplierId: string;
                notes: string;
                sourceProductionOrders: SourceProductionOrderForm[];
                remainingAvailable: number;
            }>();

            for (const orderRequirements of requirementsByOrder) {
                for (const requirement of orderRequirements.requirements) {
                    const materialId = requirement.material.id;
                    const required = Number(requirement.required || 0);
                    const available = Number(requirement.available || 0);

                    if (!consolidated.has(materialId)) {
                        const suggestedSupplier = requirement.potentialSuppliers.find(
                            (supplierRow) => Number(supplierRow.lastPrice || 0) > 0
                        );
                        consolidated.set(materialId, {
                            rawMaterialId: materialId,
                            quantity: 0,
                            suggestedSupplierId: suggestedSupplier?.supplier?.id || '',
                            notes: selectedProductionOrderIds.length === 1
                                ? `Faltante OP ${orderRequirements.productionOrderCode}`
                                : `Faltante consolidado de ${selectedProductionOrderIds.length} OP`,
                            sourceProductionOrders: [],
                            remainingAvailable: available,
                        });
                    }

                    const row = consolidated.get(materialId)!;
                    const shortage = Math.max(0, Number((required - row.remainingAvailable).toFixed(4)));
                    row.remainingAvailable = Math.max(0, Number((row.remainingAvailable - required).toFixed(4)));

                    if (shortage <= 0) continue;

                    row.quantity = Number((row.quantity + shortage).toFixed(4));
                    row.sourceProductionOrders.push({
                        productionOrderId: orderRequirements.productionOrderId,
                        productionOrderCode: orderRequirements.productionOrderCode,
                        quantity: shortage,
                    });
                }
            }

            const shortages = Array.from(consolidated.values())
                .filter((item) => item.quantity > 0)
                .map(({ remainingAvailable: _remainingAvailable, ...item }) => item);

            if (shortages.length === 0) {
                toast({ title: 'Sin faltantes', description: 'Las OP seleccionadas no requieren compra adicional.' });
                return;
            }

            setItems(shortages);
            toast({
                title: 'Faltantes cargados',
                description: `Se consolidaron ${shortages.length} materiales desde ${selectedProductionOrderIds.length} OP.`,
            });
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudieron cargar faltantes de las OP'), variant: 'destructive' });
        } finally {
            setLoadingShortages(false);
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
            const primaryProductionOrderId = selectedProductionOrderIds[0];
            const row = await createRequisition({
                requestedBy: form.requestedBy.trim(),
                productionOrderId: primaryProductionOrderId || undefined,
                productionOrderIds: selectedProductionOrderIds.length > 0 ? selectedProductionOrderIds : undefined,
                neededBy: form.neededBy || undefined,
                notes: form.notes || undefined,
                items: items.map((item) => ({
                    rawMaterialId: item.rawMaterialId,
                    quantity: Number(item.quantity),
                    suggestedSupplierId: item.suggestedSupplierId || undefined,
                    notes: item.notes || undefined,
                    sourceProductionOrders: item.sourceProductionOrders?.length
                        ? item.sourceProductionOrders.map((source) => ({
                            productionOrderId: source.productionOrderId,
                            productionOrderCode: source.productionOrderCode,
                            quantity: Number(source.quantity),
                        }))
                        : undefined,
                })),
            });
            toast({ title: 'Requisición creada', description: 'La requisición de compra fue registrada.' });
            navigate(`/mrp/purchase-requisitions/${row.id}`);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo crear la requisición'), variant: 'destructive' });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-slate-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
                            <p className="text-slate-500 mt-1 text-sm">Consolida faltantes de una o varias OP antes de generar la compra.</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
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
                            </div>

                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                    <Package className="h-3.5 w-3.5 text-slate-400" />
                                    Órdenes de Producción <span className="text-slate-400 font-normal text-xs">(Opcional, puedes elegir varias)</span>
                                </Label>

                                <div className="relative">
                                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <Input
                                        className="pl-9 h-10 border-slate-200 focus-visible:ring-orange-500 rounded-xl bg-white"
                                        placeholder="Buscar OP por código o estado..."
                                        value={productionOrderSearch}
                                        onChange={(e) => setProductionOrderSearch(e.target.value)}
                                    />
                                </div>

                                {selectedProductionOrders.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedProductionOrders.map((order) => (
                                            <button
                                                key={order.id}
                                                type="button"
                                                onClick={() => toggleProductionOrder(order.id)}
                                                className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700"
                                            >
                                                {order.code}
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        ))}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setSelectedProductionOrderIds([])}
                                            className="h-8 rounded-full px-3 text-xs text-slate-500"
                                        >
                                            Limpiar
                                        </Button>
                                    </div>
                                )}

                                <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/60 p-2 space-y-2">
                                    {filteredProductionOrders.length === 0 ? (
                                        <div className="px-3 py-8 text-center text-sm text-slate-500">
                                            No hay órdenes que coincidan con la búsqueda.
                                        </div>
                                    ) : filteredProductionOrders.map((order) => {
                                        const isSelected = selectedProductionOrderIds.includes(order.id);
                                        return (
                                            <button
                                                key={order.id}
                                                type="button"
                                                onClick={() => toggleProductionOrder(order.id)}
                                                className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                                                    isSelected
                                                        ? 'border-orange-300 bg-orange-50 shadow-sm'
                                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{order.code}</div>
                                                        <div className="text-xs text-slate-500 mt-1">{getStatusLabel(order.status)}</div>
                                                    </div>
                                                    <div className={`h-5 w-5 rounded-md border flex items-center justify-center ${isSelected ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300 bg-white'}`}>
                                                        {isSelected && <Sparkles className="h-3 w-3" />}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {selectedProductionOrders.length > 0 && (
                                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                        <Sparkles className="h-3 w-3 text-orange-400" />
                                        Puedes consolidar faltantes netos de {selectedProductionOrders.length} OP en una sola requisición.
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

                            {selectedProductionOrderIds.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={loadShortagesPreview}
                                        disabled={loadingShortages}
                                        className="rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50 font-medium"
                                    >
                                        {loadingShortages ? (
                                            <>
                                                <div className="animate-spin mr-2 h-4 w-4 border-2 border-orange-200 border-t-orange-700 rounded-full" />
                                                Consolidando...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="mr-2 h-4 w-4" />
                                                Cargar faltantes consolidados
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

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

                                    {item.sourceProductionOrders?.length ? (
                                        <div className="md:col-span-12 rounded-xl border border-orange-100 bg-orange-50/60 px-3 py-2">
                                            <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">Origen del faltante</div>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {item.sourceProductionOrders.map((source) => (
                                                    <span
                                                        key={`${source.productionOrderId}-${source.quantity}`}
                                                        className="inline-flex items-center rounded-full border border-orange-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                                                    >
                                                        {source.productionOrderCode || source.productionOrderId}: {Number(source.quantity).toLocaleString('es-CO')}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </div>

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
