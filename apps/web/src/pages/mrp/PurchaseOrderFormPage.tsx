import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Plus, Trash2, ArrowLeft, Calculator, Check, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { CurrencyInput } from '../../components/ui/currency-input';
import { formatCurrency } from '@/lib/utils';
import { CreatePurchaseOrderSchema } from '@scaffold/schemas';
import { PurchaseRequisitionStatus } from '@scaffold/types';
import { getErrorMessage } from '@/lib/api-error';
import { useSuppliersQuery } from '@/hooks/mrp/useSuppliers';
import { useRawMaterialsQuery } from '@/hooks/mrp/useRawMaterials';
import { useCreatePurchaseOrderMutation } from '@/hooks/mrp/usePurchaseOrders';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { useMarkPurchaseRequisitionConvertedMutation, usePurchaseRequisitionQuery } from '@/hooks/mrp/usePurchaseRequisitions';
import { mrpApi, RawMaterialSupplier } from '@/services/mrpApi';

interface OrderItem {
    rawMaterialId: string;
    quantity: number;
    unitPrice: number;
    hasIva: boolean;
}



export default function PurchaseOrderFormPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const requisitionId = searchParams.get('requisitionId') || undefined;
    const didHydrateRequisitionRef = useRef(false);
    const [loading, setLoading] = useState(false);
    const [activeCalcIdx, setActiveCalcIdx] = useState<number | null>(null);
    const [calcBulkPrice, setCalcBulkPrice] = useState<number>(0);
    const [calcBulkQty, setCalcBulkQty] = useState<number>(0);
    const [formData, setFormData] = useState({
        supplierId: '',
        expectedDeliveryDate: '',
        notes: '',
    });
    const [materialSuppliersByMaterialId, setMaterialSuppliersByMaterialId] = useState<Record<string, RawMaterialSupplier[]>>({});
    const [loadingMaterialSuppliersByMaterialId, setLoadingMaterialSuppliersByMaterialId] = useState<Record<string, boolean>>({});

    const [items, setItems] = useState<OrderItem[]>([
        { rawMaterialId: '', quantity: 0, unitPrice: 0, hasIva: false }
    ]);

    const { data: suppliersResponse, error: suppliersError } = useSuppliersQuery(1, 100);
    const { materials: rawMaterials, error: rawMaterialsError } = useRawMaterialsQuery(1, 100, '');
    const { execute: createPurchaseOrder } = useCreatePurchaseOrderMutation();
    const { execute: markPurchaseRequisitionConverted } = useMarkPurchaseRequisitionConvertedMutation();
    const { data: requisition, error: requisitionError } = usePurchaseRequisitionQuery(requisitionId);
    const suppliers = suppliersResponse?.suppliers ?? [];

    useMrpQueryErrorToast(suppliersError, 'No se pudo cargar la información inicial');
    useMrpQueryErrorToast(rawMaterialsError, 'No se pudo cargar la información inicial');
    useMrpQueryErrorToast(requisitionError, 'No se pudo cargar la requisición para precargar la orden');

    useEffect(() => {
        if (!requisition || didHydrateRequisitionRef.current) return;

        const requisitionItems = requisition.items ?? [];
        if (requisitionItems.length > 0) {
            setItems(
                requisitionItems.map((item) => ({
                    rawMaterialId: item.rawMaterial.id,
                    quantity: item.quantity,
                    unitPrice: 0,
                    hasIva: false,
                }))
            );
        }

        const requisitionSuggestedSupplier = requisitionItems.find((item) => item.suggestedSupplier?.id)?.suggestedSupplier?.id;
        const neededBy = requisition.neededBy ? new Date(requisition.neededBy) : null;
        const expectedDeliveryDate = neededBy && !Number.isNaN(neededBy.getTime())
            ? neededBy.toISOString().slice(0, 10)
            : '';

        setFormData((prev) => ({
            supplierId: prev.supplierId || requisitionSuggestedSupplier || '',
            expectedDeliveryDate: prev.expectedDeliveryDate || expectedDeliveryDate,
            notes: prev.notes || requisition.notes || '',
        }));

        didHydrateRequisitionRef.current = true;
    }, [requisition]);

    const addItem = () => {
        setItems([...items, { rawMaterialId: '', quantity: 0, unitPrice: 0, hasIva: false }]);
    };

    const removeItem = (index: number) => {
        if (items.length === 1) {
            toast({
                title: 'Error',
                description: 'Debe haber al menos un ítem',
                variant: 'destructive',
            });
            return;
        }
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof OrderItem, value: string | number | boolean) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value } as OrderItem;
        setItems(newItems);
    };

    const getSupplierById = (supplierId?: string) => {
        if (!supplierId) return undefined;
        return suppliers.find((supplier) => supplier.id === supplierId);
    };

    const fetchMaterialSuppliers = async (materialId: string) => {
        if (!materialId) return [];
        if (materialSuppliersByMaterialId[materialId]) {
            return materialSuppliersByMaterialId[materialId];
        }
        setLoadingMaterialSuppliersByMaterialId((prev) => ({ ...prev, [materialId]: true }));
        try {
            const rows = await mrpApi.getRawMaterialSuppliers(materialId);
            setMaterialSuppliersByMaterialId((prev) => ({ ...prev, [materialId]: rows }));
            return rows;
        } catch {
            toast({
                title: 'Advertencia',
                description: 'No se pudieron cargar proveedores sugeridos para la materia prima',
                variant: 'destructive',
            });
            return [];
        } finally {
            setLoadingMaterialSuppliersByMaterialId((prev) => ({ ...prev, [materialId]: false }));
        }
    };

    const handleMaterialChange = async (index: number, materialId: string) => {
        updateItem(index, 'rawMaterialId', materialId);
        if (!materialId) return;

        const material = getMaterialById(materialId);
        const suggestedSuppliers = await fetchMaterialSuppliers(materialId);
        const bestSuggestedSupplierId = suggestedSuppliers[0]?.supplier?.id || material?.supplierId;

        if (!formData.supplierId && bestSuggestedSupplierId) {
            setFormData((prev) => ({ ...prev, supplierId: bestSuggestedSupplierId }));
        }
    };

    const applyDominantSuggestedSupplier = () => {
        const counts: Record<string, number> = {};
        for (const item of items) {
            if (!item.rawMaterialId) continue;
            const material = getMaterialById(item.rawMaterialId);
            const suggested = materialSuppliersByMaterialId[item.rawMaterialId]?.[0]?.supplier?.id || material?.supplierId;
            if (!suggested) continue;
            counts[suggested] = (counts[suggested] || 0) + 1;
        }
        const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (!winner) {
            toast({
                title: 'Sin sugerencia',
                description: 'No hay sugerencias suficientes para aplicar proveedor automáticamente',
                variant: 'destructive',
            });
            return;
        }
        setFormData((prev) => ({ ...prev, supplierId: winner }));
    };

    const calculateTotals = () => {
        return items.reduce((acc, item) => {
            const subtotal = item.quantity * item.unitPrice;
            const taxAmount = item.hasIva ? subtotal * 0.19 : 0;
            return {
                subtotal: acc.subtotal + subtotal,
                tax: acc.tax + taxAmount,
                total: acc.total + subtotal + taxAmount
            };
        }, { subtotal: 0, tax: 0, total: 0 });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.supplierId) {
            toast({
                title: 'Error',
                description: 'Selecciona un proveedor',
                variant: 'destructive',
            });
            return;
        }

        const invalidItems = items.filter(item =>
            !item.rawMaterialId || item.quantity <= 0 || item.unitPrice <= 0
        );

        if (invalidItems.length > 0) {
            toast({
                title: 'Error',
                description: 'Completa todos los ítems correctamente',
                variant: 'destructive',
            });
            return;
        }

        try {
            setLoading(true);
            const submitData = {
                ...formData,
                expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
                items: items.map(item => ({
                    rawMaterialId: item.rawMaterialId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    taxAmount: item.hasIva ? (item.quantity * item.unitPrice) * 0.19 : 0
                })),
            };
            const validatedData = CreatePurchaseOrderSchema.parse(submitData);
            const createdOrder = await createPurchaseOrder(validatedData);

            if (requisitionId) {
                try {
                    await markPurchaseRequisitionConverted({ id: requisitionId, purchaseOrderId: createdOrder.id });
                } catch (markError) {
                    toast({
                        title: 'OC creada con advertencia',
                        description: getErrorMessage(markError, 'No se pudo marcar la requisición como convertida'),
                        variant: 'destructive',
                    });
                }
            }

            toast({
                title: 'Éxito',
                description: 'Orden de compra creada exitosamente',
                variant: 'default',
            });
            navigate('/mrp/purchase-orders');
        } catch (error: unknown) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo crear la orden de compra'),
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const getMaterialById = (id: string) => {
        return rawMaterials.find(m => m.id === id);
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/mrp/purchase-orders')}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
                <h1 className="text-3xl font-bold">Nueva Orden de Compra</h1>
                <p className="text-slate-600">Crea una nueva orden de compra de materias primas.</p>
            </div>

            {requisitionId ? (
                <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    {requisition ? (
                        <>
                            <span className="font-medium">Requisición vinculada:</span>{' '}
                            {requisition.id.slice(0, 8).toUpperCase()} ({requisition.status}).
                            {requisition.status === PurchaseRequisitionStatus.CONVERTIDA || requisition.status === PurchaseRequisitionStatus.CANCELADA ? (
                                <span className="ml-2 text-amber-700">
                                    Esta requisición ya no está activa; valida si deseas continuar con una nueva OC.
                                </span>
                            ) : null}
                        </>
                    ) : (
                        <span>Cargando requisición vinculada...</span>
                    )}
                </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6 space-y-4">
                    <h2 className="text-xl font-semibold">Información General</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="supplier">Proveedor *</Label>
                            <select
                                id="supplier"
                                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.supplierId}
                                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                                required
                            >
                                <option value="">Selecciona un proveedor</option>
                                {suppliers.map((supplier) => (
                                    <option key={supplier.id} value={supplier.id}>
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                            <div className="mt-2 flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={applyDominantSuggestedSupplier}
                                >
                                    Aplicar proveedor sugerido
                                </Button>
                                {formData.supplierId ? (
                                    <span className="text-xs text-slate-500">
                                        Seleccionado: {getSupplierById(formData.supplierId)?.name || 'N/A'}
                                    </span>
                                ) : (
                                    <span className="text-xs text-slate-500">Sin proveedor seleccionado</span>
                                )}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="expectedDeliveryDate">Fecha Esperada de Entrega</Label>
                            <Input
                                id="expectedDeliveryDate"
                                type="date"
                                value={formData.expectedDeliveryDate}
                                onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="notes">Notas</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Notas adicionales sobre la orden..."
                            rows={3}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Ítems de la Orden</h2>
                        <Button type="button" onClick={addItem} variant="outline" size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Agregar Ítem
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {/* Header for Desktop */}
                        {items.length > 0 && (
                            <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 bg-slate-50 border border-slate-200 rounded-t-lg text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <div className="md:col-span-4">Materia Prima</div>
                                <div className="md:col-span-1 text-center">Cantidad</div>
                                <div className="md:col-span-2 text-right">Precio Unit.</div>
                                <div className="md:col-span-1 text-center">IVA</div>
                                <div className="md:col-span-3 text-right">Total Línea</div>
                                <div className="md:col-span-1"></div>
                            </div>
                        )}

                        {items.map((item, index) => {
                            const material = getMaterialById(item.rawMaterialId);
                            const subtotal = item.quantity * item.unitPrice;

                            return (
                                <div key={index} className="border border-slate-200 rounded-lg md:rounded-none md:border-t-0 p-4 md:p-3 hover:bg-slate-50/50 transition-colors">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                        <div className="md:col-span-4">
                                            <Label className="md:hidden">Materia Prima *</Label>
                                            <select
                                                className="w-full mt-1 md:mt-0 px-2 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                value={item.rawMaterialId}
                                                onChange={(e) => {
                                                    void handleMaterialChange(index, e.target.value);
                                                }}
                                                required
                                            >
                                                <option value="">Selecciona...</option>
                                                {rawMaterials.map((material) => (
                                                    <option key={material.id} value={material.id}>
                                                        {material.name} ({material.sku})
                                                    </option>
                                                ))}
                                            </select>
                                            {item.rawMaterialId ? (
                                                <div className="mt-1 space-y-1">
                                                    {loadingMaterialSuppliersByMaterialId[item.rawMaterialId] ? (
                                                        <div className="text-[11px] text-slate-500">Cargando proveedores sugeridos...</div>
                                                    ) : null}
                                                    {(() => {
                                                        const suggestedRows = materialSuppliersByMaterialId[item.rawMaterialId] ?? [];
                                                        const materialPreferredSupplier = getMaterialById(item.rawMaterialId)?.supplierId;
                                                        const suggestedSupplierIds = new Set(suggestedRows.map((row) => row.supplier.id));
                                                        if (materialPreferredSupplier) suggestedSupplierIds.add(materialPreferredSupplier);
                                                        const selectedSupplierMismatch = Boolean(
                                                            formData.supplierId &&
                                                            suggestedSupplierIds.size > 0 &&
                                                            !suggestedSupplierIds.has(formData.supplierId)
                                                        );

                                                        return (
                                                            <>
                                                                {suggestedRows.length > 0 ? (
                                                                    <div className="text-[11px] text-slate-600">
                                                                        Sugeridos: {suggestedRows.slice(0, 3).map((row) => row.supplier.name).join(', ')}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-[11px] text-slate-500">
                                                                        Sin historial de proveedores para este material.
                                                                    </div>
                                                                )}
                                                                {selectedSupplierMismatch ? (
                                                                    <div className="text-[11px] text-amber-700">
                                                                        El proveedor seleccionado no coincide con sugeridos/histórico de esta materia prima.
                                                                    </div>
                                                                ) : null}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="md:col-span-1">
                                            <Label className="md:hidden">Cantidad *</Label>
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    className="px-2 py-1.5 h-8 text-sm text-center"
                                                    value={item.quantity || ''}
                                                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                    required
                                                />
                                                {material && (
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{material.unit}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 relative">
                                            <Label className="md:hidden">Precio Unitario *</Label>
                                            <div className="flex items-center gap-1">
                                                <CurrencyInput
                                                    className="h-8 text-sm text-right flex-1"
                                                    value={item.unitPrice || ''}
                                                    onValueChange={(val) => updateItem(index, 'unitPrice', val || 0)}
                                                    placeholder="$0"
                                                    required
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className={`h-8 w-8 p-0 ${activeCalcIdx === index ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}
                                                    onClick={() => {
                                                        if (activeCalcIdx === index) {
                                                            setActiveCalcIdx(null);
                                                        } else {
                                                            setActiveCalcIdx(index);
                                                            setCalcBulkPrice(0);
                                                            setCalcBulkQty(0);
                                                        }
                                                    }}
                                                    title="Calcular precio unitario"
                                                >
                                                    <Calculator className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {activeCalcIdx === index && (
                                                <div className="absolute z-10 top-full right-0 mt-1 w-64 bg-white border border-slate-200 rounded-md shadow-xl p-3 space-y-3 animate-in fade-in zoom-in duration-200">
                                                    <div className="flex justify-between items-center border-b pb-1 mb-2">
                                                        <span className="text-xs font-bold text-slate-700">Calculadora de Precio</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveCalcIdx(null)}
                                                            className="text-slate-400 hover:text-slate-600"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div>
                                                            <label className="text-[10px] uppercase font-bold text-slate-500">Precio Total Cotizado</label>
                                                            <CurrencyInput
                                                                className="h-7 text-xs text-right"
                                                                value={calcBulkPrice || ''}
                                                                onValueChange={(val) => setCalcBulkPrice(val || 0)}
                                                                placeholder="$0"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] uppercase font-bold text-slate-500">Cantidad en el Empaque / Rollo</label>
                                                            <Input
                                                                type="number"
                                                                className="h-7 text-xs text-right"
                                                                value={calcBulkQty || ''}
                                                                onChange={(e) => setCalcBulkQty(parseFloat(e.target.value) || 0)}
                                                                placeholder="Cant."
                                                            />
                                                        </div>

                                                        {calcBulkPrice > 0 && calcBulkQty > 0 && (
                                                            <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                                                                <div className="text-[10px] text-slate-500 uppercase">Precio Unitario Resultante</div>
                                                                <div className="text-sm font-bold text-blue-600">
                                                                    {formatCurrency(calcBulkPrice / calcBulkQty)}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex gap-2 pt-1">
                                                            <Button
                                                                type="button"
                                                                variant="default"
                                                                size="sm"
                                                                className="flex-1 h-7 text-xs"
                                                                disabled={!calcBulkPrice || !calcBulkQty}
                                                                onClick={() => {
                                                                    const calculated = calcBulkPrice / calcBulkQty;
                                                                    updateItem(index, 'unitPrice', calculated);
                                                                    setActiveCalcIdx(null);
                                                                }}
                                                            >
                                                                <Check className="h-3 w-3 mr-1" /> Aplicar
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="md:col-span-1 flex items-center justify-center md:justify-center">
                                            <Label className="md:hidden mr-2">IVA (19%)</Label>
                                            <div className="flex items-center h-8">
                                                <input
                                                    type="checkbox"
                                                    id={`iva-${index}`}
                                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                                                    checked={item.hasIva}
                                                    onChange={(e) => updateItem(index, 'hasIva', e.target.checked)}
                                                />
                                            </div>
                                        </div>

                                        <div className="md:col-span-3 flex md:flex-row flex-col items-center justify-between md:justify-end gap-2">
                                            <div className="w-full md:w-auto">
                                                <Label className="md:hidden">Total Línea</Label>
                                                <div className="mt-1 md:mt-0 px-2 py-1 bg-slate-50 border border-slate-100 rounded md:border-none md:bg-transparent text-right text-sm font-semibold text-slate-700">
                                                    {formatCurrency(subtotal)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="md:col-span-1 flex justify-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeItem(index)}
                                                className="text-slate-400 hover:text-red-600 h-8 w-8 p-0"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Subtotal (Base):</span>
                                <span>{formatCurrency(calculateTotals().subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>IVA Total:</span>
                                <span>{formatCurrency(calculateTotals().tax)}</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold pt-2 border-t text-slate-900">
                                <span>Gran Total</span>
                                <span>{formatCurrency(calculateTotals().total)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/mrp/purchase-orders')}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Creando...' : 'Crear Orden de Compra'}
                    </Button>
                </div>
            </form>
        </div>

    );
}
