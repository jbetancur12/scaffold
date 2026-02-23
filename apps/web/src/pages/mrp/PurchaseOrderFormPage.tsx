import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Plus, Trash2, ArrowLeft, Calculator, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
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
import { useOperationalConfigQuery } from '@/hooks/mrp/useOperationalConfig';
import { mrpApi, RawMaterialSupplier } from '@/services/mrpApi';

interface OrderItem {
    isCatalogItem: boolean;
    rawMaterialId: string;
    catalogSearch: string;
    customDescription: string;
    customUnit: string;
    isInventoriable: boolean;
    quantity: number;
    unitPrice: number;
    hasIva: boolean;
    ivaIncluded: boolean;
}



export default function PurchaseOrderFormPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const requisitionId = searchParams.get('requisitionId') || undefined;
    const didHydrateRequisitionRef = useRef(false);
    const [loading, setLoading] = useState(false);
    const [expandedItemIndex, setExpandedItemIndex] = useState<number | null>(0);
    const [activeCalcIdx, setActiveCalcIdx] = useState<number | null>(null);
    const [activeCatalogComboboxIdx, setActiveCatalogComboboxIdx] = useState<number | null>(null);
    const [catalogHighlightByIndex, setCatalogHighlightByIndex] = useState<Record<number, number>>({});
    const [calcBulkPrice, setCalcBulkPrice] = useState<number>(0);
    const [calcBulkQty, setCalcBulkQty] = useState<number>(0);
    const [formData, setFormData] = useState({
        supplierId: '',
        expectedDeliveryDate: '',
        notes: '',
    });
    const [purchaseConditions, setPurchaseConditions] = useState({
        purchaseType: 'compra',
        deliveryLocation: '',
        paymentMethod: 'Contado',
        currency: 'COP',
        qualityRequirements: '',
        approvedBy: '',
        discountAmount: 0,
        otherChargesAmount: 0,
    });
    const [materialSuppliersByMaterialId, setMaterialSuppliersByMaterialId] = useState<Record<string, RawMaterialSupplier[]>>({});
    const [loadingMaterialSuppliersByMaterialId, setLoadingMaterialSuppliersByMaterialId] = useState<Record<string, boolean>>({});

    const [items, setItems] = useState<OrderItem[]>([
        {
            isCatalogItem: true,
            rawMaterialId: '',
            catalogSearch: '',
            customDescription: '',
            customUnit: '',
            isInventoriable: true,
            quantity: 0,
            unitPrice: 0,
            hasIva: false,
            ivaIncluded: false,
        }
    ]);

    const { data: suppliersResponse, error: suppliersError } = useSuppliersQuery(1, 100);
    const { materials: rawMaterials, error: rawMaterialsError } = useRawMaterialsQuery(1, 100, '');
    const { execute: createPurchaseOrder } = useCreatePurchaseOrderMutation();
    const { execute: markPurchaseRequisitionConverted } = useMarkPurchaseRequisitionConvertedMutation();
    const { data: requisition, error: requisitionError } = usePurchaseRequisitionQuery(requisitionId);
    const { data: operationalConfig, error: operationalConfigError } = useOperationalConfigQuery();
    const suppliers = suppliersResponse?.suppliers ?? [];

    useMrpQueryErrorToast(suppliersError, 'No se pudo cargar la información inicial');
    useMrpQueryErrorToast(rawMaterialsError, 'No se pudo cargar la información inicial');
    useMrpQueryErrorToast(requisitionError, 'No se pudo cargar la requisición para precargar la orden');
    useMrpQueryErrorToast(operationalConfigError, 'No se pudo cargar la configuración operativa');

    useEffect(() => {
        if (!requisition || didHydrateRequisitionRef.current) return;

        const requisitionItems = requisition.items ?? [];
        if (requisitionItems.length > 0) {
            setItems(
                requisitionItems.map((item) => ({
                    isCatalogItem: true,
                    rawMaterialId: item.rawMaterial.id,
                    catalogSearch: `${item.rawMaterial.sku} ${item.rawMaterial.name}`,
                    customDescription: '',
                    customUnit: '',
                    isInventoriable: true,
                    quantity: item.quantity,
                    unitPrice: 0,
                    hasIva: false,
                    ivaIncluded: false,
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

    useEffect(() => {
        if (!operationalConfig) return;
        const firstPayment = operationalConfig.purchasePaymentMethods?.[0] || 'Contado';
        const firstRule = operationalConfig.purchaseWithholdingRules?.find((rule) => rule.active) || operationalConfig.purchaseWithholdingRules?.[0];
        setPurchaseConditions((prev) => ({
            ...prev,
            paymentMethod: prev.paymentMethod || firstPayment,
            purchaseType: prev.purchaseType || firstRule?.key || 'compra',
        }));
    }, [operationalConfig]);

    const addItem = () => {
        setItems((prev) => {
            const next = [...prev, {
                isCatalogItem: true,
                rawMaterialId: '',
                catalogSearch: '',
                customDescription: '',
                customUnit: '',
                isInventoriable: true,
                quantity: 0,
                unitPrice: 0,
                hasIva: false,
                ivaIncluded: false,
            }];
            setExpandedItemIndex(next.length - 1);
            return next;
        });
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
        setItems((prev) => prev.filter((_, i) => i !== index));
        setExpandedItemIndex((prev) => {
            if (prev === null) return null;
            if (prev === index) return null;
            if (prev > index) return prev - 1;
            return prev;
        });
    };

    const updateItem = (index: number, field: keyof OrderItem, value: string | number | boolean) => {
        setItems((prev) => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [field]: value } as OrderItem;
            return newItems;
        });
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
        const selectedMaterial = rawMaterials.find((material) => material.id === materialId);
        updateItem(index, 'rawMaterialId', materialId);
        if (selectedMaterial) {
            updateItem(index, 'catalogSearch', `${selectedMaterial.sku} ${selectedMaterial.name}`);
        }
        if (!materialId) return;
        if (!items[index]?.isCatalogItem) return;

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
            if (!item.isCatalogItem || !item.rawMaterialId) continue;
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
            const enteredLineTotal = item.quantity * item.unitPrice;
            const subtotal = item.hasIva && item.ivaIncluded ? enteredLineTotal / 1.19 : enteredLineTotal;
            const taxAmount = item.hasIva ? (item.ivaIncluded ? enteredLineTotal - subtotal : subtotal * 0.19) : 0;
            const lineTotal = item.hasIva && item.ivaIncluded ? enteredLineTotal : subtotal + taxAmount;
            return {
                subtotal: acc.subtotal + subtotal,
                tax: acc.tax + taxAmount,
                total: acc.total + lineTotal
            };
        }, { subtotal: 0, tax: 0, total: 0 });
    };

    const activeWithholdingRules = (operationalConfig?.purchaseWithholdingRules ?? []).filter((rule) => rule.active);
    const withholdingRule = activeWithholdingRules.find((rule) => rule.key === purchaseConditions.purchaseType) || activeWithholdingRules[0];
    const withholdingRate = withholdingRule?.rate ?? 0;
    const totals = calculateTotals();
    const discountAmount = Number(purchaseConditions.discountAmount || 0);
    const otherChargesAmount = Number(purchaseConditions.otherChargesAmount || 0);
    const taxableBase = Math.max(0, totals.subtotal - discountAmount);
    const withholdingAmount = taxableBase * (withholdingRate / 100);
    const grossTotal = Math.max(0, totals.total - discountAmount + otherChargesAmount);
    const netTotal = Math.max(0, grossTotal - withholdingAmount);

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

        const invalidItems = items.filter((item) => {
            if (item.quantity <= 0 || item.unitPrice <= 0) return true;
            if (item.isCatalogItem) return !item.rawMaterialId;
            return !item.customDescription.trim() || !item.customUnit.trim();
        });

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
                notes: buildStructuredNotes(),
                purchaseType: purchaseConditions.purchaseType,
                paymentMethod: purchaseConditions.paymentMethod,
                currency: purchaseConditions.currency,
                discountAmount,
                withholdingRate,
                withholdingAmount,
                otherChargesAmount,
                netTotalAmount: netTotal,
                expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
                items: items.map(item => ({
                    ...(item.isCatalogItem ? (
                        item.hasIva && item.ivaIncluded
                        ? {
                            isCatalogItem: true,
                            rawMaterialId: item.rawMaterialId,
                            quantity: item.quantity,
                            unitPrice: item.quantity > 0 ? ((item.quantity * item.unitPrice) / 1.19) / item.quantity : 0,
                            taxAmount: (item.quantity * item.unitPrice) - ((item.quantity * item.unitPrice) / 1.19),
                        }
                        : {
                            isCatalogItem: true,
                            rawMaterialId: item.rawMaterialId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            taxAmount: item.hasIva ? (item.quantity * item.unitPrice) * 0.19 : 0,
                        }
                    ) : (
                        item.hasIva && item.ivaIncluded
                        ? {
                            isCatalogItem: false,
                            customDescription: item.customDescription.trim(),
                            customUnit: item.customUnit.trim(),
                            isInventoriable: item.isInventoriable,
                            quantity: item.quantity,
                            unitPrice: item.quantity > 0 ? ((item.quantity * item.unitPrice) / 1.19) / item.quantity : 0,
                            taxAmount: (item.quantity * item.unitPrice) - ((item.quantity * item.unitPrice) / 1.19),
                        }
                        : {
                            isCatalogItem: false,
                            customDescription: item.customDescription.trim(),
                            customUnit: item.customUnit.trim(),
                            isInventoriable: item.isInventoriable,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            taxAmount: item.hasIva ? (item.quantity * item.unitPrice) * 0.19 : 0,
                        }
                    )),
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
    const getFilteredMaterials = (search: string) => {
        const normalized = search.trim().toLowerCase();
        if (!normalized) return rawMaterials.slice(0, 50);
        return rawMaterials
            .filter((material) =>
                material.name.toLowerCase().includes(normalized) ||
                material.sku.toLowerCase().includes(normalized)
            )
            .slice(0, 100);
    };
    const handleCatalogInputKeyDown = async (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
        const list = getFilteredMaterials(items[index]?.catalogSearch || '');
        if (list.length === 0) return;
        const current = catalogHighlightByIndex[index] ?? 0;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveCatalogComboboxIdx(index);
            setCatalogHighlightByIndex((prev) => ({
                ...prev,
                [index]: Math.min(current + 1, list.length - 1),
            }));
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveCatalogComboboxIdx(index);
            setCatalogHighlightByIndex((prev) => ({
                ...prev,
                [index]: Math.max(current - 1, 0),
            }));
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            const selected = list[current] || list[0];
            if (selected) {
                await handleMaterialChange(index, selected.id);
                setActiveCatalogComboboxIdx(null);
            }
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            setActiveCatalogComboboxIdx(null);
        }
    };
    const selectedSupplier = getSupplierById(formData.supplierId);

    const buildStructuredNotes = () => {
        const blocks: string[] = [];
        const purchaseTypeLabel = activeWithholdingRules.find((rule) => rule.key === purchaseConditions.purchaseType)?.label || purchaseConditions.purchaseType;
        if (formData.notes.trim()) {
            blocks.push(formData.notes.trim());
        }

        const structuredLines = [
            `Tipo de compra: ${purchaseTypeLabel}`,
            `Lugar de entrega: ${purchaseConditions.deliveryLocation || 'N/A'}`,
            `Forma de pago: ${purchaseConditions.paymentMethod || 'N/A'}`,
            `Moneda: ${purchaseConditions.currency || 'N/A'}`,
            `Aprobador: ${purchaseConditions.approvedBy || 'N/A'}`,
            `Requisitos de calidad: ${purchaseConditions.qualityRequirements || 'N/A'}`,
            `Descuento: ${discountAmount.toFixed(2)}`,
            `Retención (${withholdingRate}%): ${withholdingAmount.toFixed(2)}`,
            `Otros cargos: ${otherChargesAmount.toFixed(2)}`,
            `Total neto estimado: ${netTotal.toFixed(2)}`,
            requisition ? `Requisicion origen: ${requisition.id}` : '',
            requisition?.productionOrderId ? `OP origen: ${requisition.productionOrderId}` : '',
        ].filter(Boolean);

        if (structuredLines.length > 0) {
            blocks.push('[DETALLE OC]');
            blocks.push(...structuredLines);
        }
        return blocks.join('\n');
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
                    <h2 className="text-xl font-semibold">Encabezado y Proveedor</h2>

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
                                        Seleccionado: {selectedSupplier?.name || 'N/A'}
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

                    {selectedSupplier ? (
                        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                            <div className="text-sm font-semibold text-slate-800 mb-2">Ficha rápida del proveedor</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-700">
                                <div><span className="font-medium">Contacto:</span> {selectedSupplier.contactName || 'N/A'}</div>
                                <div><span className="font-medium">Email:</span> {selectedSupplier.email || 'N/A'}</div>
                                <div><span className="font-medium">Teléfono:</span> {selectedSupplier.phone || 'N/A'}</div>
                                <div><span className="font-medium">Ciudad:</span> {selectedSupplier.city || 'N/A'}</div>
                                <div className="md:col-span-2"><span className="font-medium">Dirección:</span> {selectedSupplier.address || 'N/A'}</div>
                            </div>
                        </div>
                    ) : null}

                    {requisition ? (
                        <div className="rounded-md border border-slate-200 p-4">
                            <div className="text-sm font-semibold text-slate-800 mb-2">Trazabilidad de origen</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-700">
                                <div><span className="font-medium">Requisición:</span> {requisition.id.slice(0, 8).toUpperCase()}</div>
                                <div><span className="font-medium">Estado:</span> {requisition.status}</div>
                                <div><span className="font-medium">Solicitó:</span> {requisition.requestedBy}</div>
                                <div className="md:col-span-2"><span className="font-medium">OP origen:</span> {requisition.productionOrderId || 'N/A'}</div>
                                <div><span className="font-medium">Necesaria para:</span> {requisition.neededBy ? new Date(requisition.neededBy).toLocaleDateString() : 'N/A'}</div>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="bg-white rounded-lg shadow p-6 space-y-4">
                    <h2 className="text-xl font-semibold">Condiciones y Requisitos</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="purchaseType">Tipo de compra</Label>
                            <select
                                id="purchaseType"
                                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={purchaseConditions.purchaseType}
                                onChange={(e) => setPurchaseConditions({ ...purchaseConditions, purchaseType: e.target.value })}
                            >
                                {activeWithholdingRules.length === 0 ? (
                                    <option value="compra">Compra</option>
                                ) : (
                                    activeWithholdingRules.map((rule) => (
                                        <option key={rule.key} value={rule.key}>
                                            {rule.label}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="paymentMethod">Forma de pago</Label>
                            <select
                                id="paymentMethod"
                                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={purchaseConditions.paymentMethod}
                                onChange={(e) => setPurchaseConditions({ ...purchaseConditions, paymentMethod: e.target.value })}
                            >
                                {(operationalConfig?.purchasePaymentMethods?.length
                                    ? operationalConfig.purchasePaymentMethods
                                    : ['Contado']).map((method) => (
                                    <option key={method} value={method}>
                                        {method}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="currency">Moneda</Label>
                            <Input
                                id="currency"
                                value={purchaseConditions.currency}
                                onChange={(e) => setPurchaseConditions({ ...purchaseConditions, currency: e.target.value.toUpperCase() })}
                                placeholder="COP"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="deliveryLocation">Lugar de entrega</Label>
                            <Input
                                id="deliveryLocation"
                                value={purchaseConditions.deliveryLocation}
                                onChange={(e) => setPurchaseConditions({ ...purchaseConditions, deliveryLocation: e.target.value })}
                                placeholder="Bodega principal / sede..."
                            />
                        </div>
                        <div>
                            <Label htmlFor="approvedBy">Quién aprueba</Label>
                            <Input
                                id="approvedBy"
                                value={purchaseConditions.approvedBy}
                                onChange={(e) => setPurchaseConditions({ ...purchaseConditions, approvedBy: e.target.value })}
                                placeholder="Nombre del aprobador"
                            />
                        </div>
                        <div>
                            <Label htmlFor="discountAmount">Descuento</Label>
                            <CurrencyInput
                                id="discountAmount"
                                value={purchaseConditions.discountAmount || ''}
                                onValueChange={(value) => setPurchaseConditions({ ...purchaseConditions, discountAmount: value || 0 })}
                                placeholder="$0"
                            />
                        </div>
                        <div>
                            <Label htmlFor="otherChargesAmount">Otros cargos</Label>
                            <CurrencyInput
                                id="otherChargesAmount"
                                value={purchaseConditions.otherChargesAmount || ''}
                                onValueChange={(value) => setPurchaseConditions({ ...purchaseConditions, otherChargesAmount: value || 0 })}
                                placeholder="$0"
                            />
                        </div>
                        <div>
                            <Label>Retención aplicada</Label>
                            <div className="mt-1 h-10 px-3 flex items-center rounded-md border border-slate-300 bg-slate-50 text-sm text-slate-700">
                                {withholdingRule ? `${withholdingRule.label} (${withholdingRate}%)` : 'Sin regla activa'}
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="qualityRequirements">Requisitos de compra/calidad</Label>
                        <Textarea
                            id="qualityRequirements"
                            value={purchaseConditions.qualityRequirements}
                            onChange={(e) => setPurchaseConditions({ ...purchaseConditions, qualityRequirements: e.target.value })}
                            placeholder="Ej: Exigir CoA, lote, fecha de vencimiento, condiciones de empaque y transporte..."
                            rows={3}
                        />
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
                            <div className="hidden xl:grid xl:grid-cols-12 gap-6 px-6 py-3 bg-slate-50 border border-slate-200 rounded-t-lg text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <div className="xl:col-span-3">Materia Prima</div>
                                <div className="xl:col-span-2 text-center">Cantidad</div>
                                <div className="xl:col-span-2 text-right">Precio Unit.</div>
                                <div className="xl:col-span-2 text-center">IVA</div>
                                <div className="xl:col-span-2 text-right">Total Línea</div>
                                <div className="xl:col-span-1"></div>
                            </div>
                        )}

                        {items.map((item, index) => {
                            const material = getMaterialById(item.rawMaterialId);
                            const itemLabel = item.isCatalogItem
                                ? (material ? `${material.name} (${material.sku})` : `Ítem ${index + 1}`)
                                : (item.customDescription?.trim() || `Ítem libre ${index + 1}`);
                            const itemUnit = item.isCatalogItem ? (material?.unit || '') : (item.customUnit || '');
                            const enteredLineTotal = item.quantity * item.unitPrice;
                            const subtotal = item.hasIva && item.ivaIncluded ? enteredLineTotal / 1.19 : enteredLineTotal;
                            const taxAmount = item.hasIva ? (item.ivaIncluded ? enteredLineTotal - subtotal : subtotal * 0.19) : 0;
                            const lineTotal = item.hasIva && item.ivaIncluded ? enteredLineTotal : subtotal + taxAmount;
                            const isExpanded = expandedItemIndex === index;

                            return (
                                <div key={index} className="border border-slate-200 rounded-lg xl:rounded-none xl:border-t-0 p-4 xl:px-6 xl:py-4 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-slate-900 truncate">
                                                {itemLabel}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {item.isCatalogItem ? 'Catálogo' : 'Libre'} | Cant: {item.quantity || 0} {itemUnit} | Total: {formatCurrency(lineTotal)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setExpandedItemIndex(isExpanded ? null : index)}
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        <ChevronUp className="h-4 w-4 mr-1" />
                                                        Ocultar
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown className="h-4 w-4 mr-1" />
                                                        Ver detalle
                                                    </>
                                                )}
                                            </Button>
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

                                    {isExpanded ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5 items-start xl:items-center pt-4">
                                        <div className="xl:col-span-12">
                                            <Label>Tipo de línea</Label>
                                            <select
                                                className="w-full md:w-64 mt-1 px-2 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                value={item.isCatalogItem ? 'catalog' : 'free'}
                                                onChange={(e) => {
                                                    const isCatalog = e.target.value === 'catalog';
                                                    setItems((prev) => {
                                                        const next = [...prev];
                                                        next[index] = {
                                                            ...next[index],
                                                            isCatalogItem: isCatalog,
                                                            rawMaterialId: isCatalog ? next[index].rawMaterialId : '',
                                                            catalogSearch: isCatalog ? next[index].catalogSearch : '',
                                                            customDescription: isCatalog ? '' : next[index].customDescription,
                                                            customUnit: isCatalog ? '' : next[index].customUnit,
                                                            isInventoriable: isCatalog ? true : false,
                                                        };
                                                        return next;
                                                    });
                                                }}
                                            >
                                                <option value="catalog">Ítem de catálogo</option>
                                                <option value="free">Ítem libre (ocasional)</option>
                                            </select>
                                        </div>
                                        <div className="xl:col-span-3">
                                            <Label className="xl:hidden">{item.isCatalogItem ? 'Materia Prima *' : 'Descripción *'}</Label>
                                            {item.isCatalogItem ? (
                                                <>
                                                    <div className="relative">
                                                        <Input
                                                            className="mt-1 md:mt-0"
                                                            placeholder="Buscar por nombre o SKU..."
                                                            value={item.catalogSearch}
                                                            onFocus={() => {
                                                                setActiveCatalogComboboxIdx(index);
                                                                setCatalogHighlightByIndex((prev) => ({ ...prev, [index]: 0 }));
                                                            }}
                                                            onBlur={() => {
                                                                setTimeout(() => {
                                                                    setActiveCatalogComboboxIdx((prev) => (prev === index ? null : prev));
                                                                }, 120);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                void handleCatalogInputKeyDown(index, e);
                                                            }}
                                                            onChange={(e) => {
                                                                updateItem(index, 'catalogSearch', e.target.value);
                                                                setActiveCatalogComboboxIdx(index);
                                                                setCatalogHighlightByIndex((prev) => ({ ...prev, [index]: 0 }));
                                                            }}
                                                        />
                                                        {activeCatalogComboboxIdx === index ? (
                                                            <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-60 overflow-auto">
                                                                {getFilteredMaterials(item.catalogSearch).length === 0 ? (
                                                                    <div className="px-3 py-2 text-xs text-slate-500">Sin resultados para tu búsqueda.</div>
                                                                ) : (
                                                                    getFilteredMaterials(item.catalogSearch).map((material, resultIndex) => {
                                                                        const highlighted = (catalogHighlightByIndex[index] ?? 0) === resultIndex;
                                                                        return (
                                                                            <button
                                                                                key={material.id}
                                                                                type="button"
                                                                                className={`w-full text-left px-3 py-2 text-sm border-b border-slate-100 last:border-b-0 ${highlighted ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                                                                                onMouseDown={() => {
                                                                                    void handleMaterialChange(index, material.id);
                                                                                    setActiveCatalogComboboxIdx(null);
                                                                                }}
                                                                            >
                                                                                <span className="font-medium">{material.sku}</span> - {material.name}
                                                                            </button>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </>
                                            ) : (
                                                <Input
                                                    className="mt-1 md:mt-0"
                                                    placeholder="Ej: Servicio de transporte especial"
                                                    value={item.customDescription}
                                                    onChange={(e) => updateItem(index, 'customDescription', e.target.value)}
                                                />
                                            )}
                                            {item.isCatalogItem && item.rawMaterialId ? (
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

                                        <div className="xl:col-span-2">
                                            <Label className="xl:hidden">Cantidad *</Label>
                                            <div className="flex flex-col gap-1">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    className="px-3 py-2 h-9 text-sm text-center"
                                                    value={item.quantity || ''}
                                                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                    required
                                                />
                                                {material && (
                                                    <span className="text-[11px] text-slate-500">{material.unit}</span>
                                                )}
                                                {!item.isCatalogItem ? (
                                                    <Input
                                                        className="h-8 text-xs"
                                                        placeholder="Unidad (ej: servicio, und, hora)"
                                                        value={item.customUnit}
                                                        onChange={(e) => updateItem(index, 'customUnit', e.target.value)}
                                                    />
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="xl:col-span-2 relative">
                                            <Label className="xl:hidden">Precio Unitario *</Label>
                                            <div className="flex flex-col lg:flex-row lg:items-center gap-2">
                                                <CurrencyInput
                                                    className="h-9 text-sm text-right flex-1"
                                                    value={item.unitPrice || ''}
                                                    onValueChange={(val) => updateItem(index, 'unitPrice', val || 0)}
                                                    placeholder="$0"
                                                    required
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className={`h-9 w-9 p-0 shrink-0 self-end lg:self-auto ${activeCalcIdx === index ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}
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

                                        <div className="xl:col-span-2 flex items-center justify-start xl:justify-center">
                                            <Label className="xl:hidden mr-2">IVA (19%)</Label>
                                            <div className="flex flex-col gap-1 w-full md:w-auto md:min-w-[120px]">
                                                <label className="flex items-center gap-2 text-xs text-slate-600">
                                                    <input
                                                        type="checkbox"
                                                        id={`iva-${index}`}
                                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                                                        checked={item.hasIva}
                                                        onChange={(e) => {
                                                            updateItem(index, 'hasIva', e.target.checked);
                                                            if (!e.target.checked) {
                                                                updateItem(index, 'ivaIncluded', false);
                                                            }
                                                        }}
                                                    />
                                                    Aplica IVA
                                                </label>
                                                {item.hasIva ? (
                                                    <select
                                                        className="h-9 min-w-[110px] px-2 py-1 border border-slate-300 rounded-md text-sm"
                                                        value={item.ivaIncluded ? 'included' : 'add'}
                                                        onChange={(e) => updateItem(index, 'ivaIncluded', e.target.value === 'included')}
                                                    >
                                                        <option value="add">+ IVA</option>
                                                        <option value="included">Incluido</option>
                                                    </select>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="xl:col-span-2 flex xl:flex-row flex-col items-start xl:items-center justify-between xl:justify-end gap-2">
                                            <div className="w-full xl:min-w-[180px]">
                                                <Label className="xl:hidden">Total Línea</Label>
                                                <div className="mt-1 xl:mt-0 px-2 py-1 bg-slate-50 border border-slate-100 rounded xl:border-none xl:bg-transparent text-right text-base font-semibold text-slate-700">
                                                    {formatCurrency(lineTotal)}
                                                </div>
                                                {item.hasIva ? (
                                                    <div className="text-xs text-slate-500 text-right">
                                                        IVA: {formatCurrency(taxAmount)}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="xl:col-span-1"></div>
                                        {!item.isCatalogItem ? (
                                            <div className="xl:col-span-12">
                                                <label className="text-sm flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.isInventoriable}
                                                        onChange={(e) => updateItem(index, 'isInventoriable', e.target.checked)}
                                                    />
                                                    Item libre inventariable (si se marca, se gestiona como compra interna sin materia prima)
                                                </label>
                                            </div>
                                        ) : null}
                                    </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Subtotal (Base):</span>
                                <span>{formatCurrency(totals.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>IVA Total:</span>
                                <span>{formatCurrency(totals.tax)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Descuento:</span>
                                <span>- {formatCurrency(discountAmount)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Retención ({withholdingRate}%):</span>
                                <span>- {formatCurrency(withholdingAmount)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Otros cargos:</span>
                                <span>{formatCurrency(otherChargesAmount)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Total bruto:</span>
                                <span>{formatCurrency(grossTotal)}</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold pt-2 border-t text-slate-900">
                                <span>Total neto</span>
                                <span>{formatCurrency(netTotal)}</span>
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
