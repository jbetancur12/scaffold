import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { mrpApi } from '@/services/mrpApi';
import { useOperationalConfigQuery } from '@/hooks/mrp/useOperationalConfig';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { calculateShippingSplit } from '@/utils/shipping';

type ItemForm = {
    isCatalogItem: boolean;
    productSearch: string;
    productId?: string;
    variantId?: string;
    customDescription?: string;
    customSku?: string;
    quantity: number;
    approvedQuantity: number;
    unitPrice: number;
    discountPercent: number;
    taxRate: number;
};

const createItem = (): ItemForm => ({
    isCatalogItem: true,
    productSearch: '',
    productId: undefined,
    variantId: undefined,
    customDescription: '',
    customSku: '',
    quantity: 1,
    approvedQuantity: 1,
    unitPrice: 0,
    discountPercent: 0,
    taxRate: 0,
});

export default function QuotationFormPage() {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
    const [products, setProducts] = useState<Array<{ id: string; name: string; sku: string; reference?: string; variants?: Array<{ id: string; name: string; price: number; cost: number; targetMargin: number }> }>>([]);

    const [customerId, setCustomerId] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [notes, setNotes] = useState('');
    const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
    const [shippingAmount, setShippingAmount] = useState(0);
    const [items, setItems] = useState<ItemForm[]>([createItem()]);
    const [focusedDiscountIndex, setFocusedDiscountIndex] = useState<number | null>(null);
    const { data: operationalConfig, error: operationalConfigError } = useOperationalConfigQuery();
    useMrpQueryErrorToast(operationalConfigError, 'No se pudo cargar configuración de envíos');

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const [customersData, productsData] = await Promise.all([
                    mrpApi.listCustomers(''),
                    mrpApi.getProducts(1, 300, ''),
                ]);
                setCustomers(customersData.map((c) => ({ id: c.id, name: c.name })));
                const productRows = await Promise.all(productsData.products.map(async (p) => {
                    const full = await mrpApi.getProduct(p.id);
                    return {
                        id: full.id,
                        name: full.name,
                        sku: full.sku,
                        reference: (full as any).productReference || '',
                        variants: full.variants?.map((v) => ({
                            id: v.id,
                            name: v.name,
                            price: Number(v.price || 0),
                            cost: Number(v.cost || 0),
                            targetMargin: Number(v.targetMargin ?? 0.4),
                        })) || [],
                    };
                }));
                setProducts(productRows);

                if (isEdit && id) {
                    const q = await mrpApi.getQuotation(id);
                    setCustomerId((q as any).customerId || (q as any).customer?.id || '');
                    setValidUntil(q.validUntil ? new Date(q.validUntil as string).toISOString().slice(0, 10) : '');
                    setNotes(q.notes || '');
                    setGlobalDiscountPercent(Number((q as any).globalDiscountPercent || 0));
                    setItems((q.items || []).map((it: any) => {
                        const netUnitPrice = Number(it.unitPrice || 0);
                        const discountPercent = Number(it.discountPercent || 0);
                        const listUnitPrice = discountPercent > 0 && discountPercent < 100
                            ? netUnitPrice / (1 - (discountPercent / 100))
                            : netUnitPrice;
                        return {
                            isCatalogItem: it.isCatalogItem !== false,
                            productSearch: '',
                            productId: it.productId || it.product?.id,
                            variantId: it.variantId || it.variant?.id,
                            customDescription: it.customDescription || '',
                            customSku: it.customSku || '',
                            quantity: Number(it.quantity || 0),
                            approvedQuantity: Number(it.approvedQuantity ?? it.quantity ?? 0),
                            unitPrice: Number.isFinite(listUnitPrice) ? Number(listUnitPrice.toFixed(4)) : 0,
                            discountPercent,
                            taxRate: Number(it.taxRate || 0),
                        };
                    }));
                } else if (customersData.length > 0) {
                    setCustomerId((prev) => prev || customersData[0].id);
                }
            } catch (error) {
                toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo cargar formulario'), variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, isEdit, toast]);

    const addItem = () => setItems((prev) => [...prev, createItem()]);
    const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
    const patchItem = (idx: number, patch: Partial<ItemForm>) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
    const hasPerItemDiscount = useMemo(() => items.some((it) => Number(it.discountPercent || 0) > 0), [items]);

    const updateGlobalDiscount = (value: number) => {
        const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
        const limited = globalDiscountLimit === null ? safe : Math.min(safe, globalDiscountLimit);
        setGlobalDiscountPercent(limited);
        if (limited > 0) {
            setItems((prev) => prev.map((it) => ({ ...it, discountPercent: 0 })));
        }
    };

    const resolveCatalogUnitPrice = (productId?: string, variantId?: string): number => {
        if (!productId) return 0;
        const product = products.find((p) => p.id === productId);
        if (!product) return 0;
        if (variantId) {
            const variant = product.variants?.find((v) => v.id === variantId);
            return Number(variant?.price || 0);
        }
        const firstVariantPrice = Number(product.variants?.[0]?.price || 0);
        return firstVariantPrice;
    };

    const resolveDiscountLimit = (item: ItemForm) => {
        if (!item.isCatalogItem || !item.productId) return null;
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const variant = item.variantId
            ? product.variants?.find((v) => v.id === item.variantId)
            : product.variants?.[0];
        if (!variant) return null;

        const listPrice = Number(item.unitPrice || 0);
        if (listPrice <= 0) return null;

        const minAllowedMargin = Math.max(0, Number(variant.targetMargin || 0.4) - 0.1);
        const minAllowedPrice = minAllowedMargin >= 1
            ? Number.POSITIVE_INFINITY
            : Number(variant.cost || 0) / (1 - minAllowedMargin);

        const maxDiscountPercent = Math.max(0, (1 - (minAllowedPrice / listPrice)) * 100);
        const maxDiscountValue = Math.max(0, listPrice - minAllowedPrice);
        return {
            maxDiscountPercent: Number.isFinite(maxDiscountPercent) ? maxDiscountPercent : 0,
            maxDiscountValue: Number.isFinite(maxDiscountValue) ? maxDiscountValue : 0,
            minAllowedMarginPercent: minAllowedMargin * 100,
        };
    };

    const globalDiscountLimit = useMemo(() => {
        const limits = items
            .map((it) => resolveDiscountLimit(it)?.maxDiscountPercent)
            .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
        if (limits.length === 0) return null;
        return Math.max(0, Math.min(...limits));
    }, [items, products]);

    const totalsPreview = useMemo(() => {
        const summary = items.reduce((acc, it) => {
            const qty = Number(it.quantity || 0);
            const listUnit = Number(it.unitPrice || 0);
            const listSubtotal = listUnit * qty;
            const effectiveDiscount = globalDiscountPercent > 0 ? globalDiscountPercent : Number(it.discountPercent || 0);
            const netUnit = listUnit * (1 - effectiveDiscount / 100);
            const discountedSubtotal = netUnit * qty;
            const tax = discountedSubtotal * (Number(it.taxRate || 0) / 100);
            return {
                listSubtotal: acc.listSubtotal + listSubtotal,
                discountedSubtotal: acc.discountedSubtotal + discountedSubtotal,
                taxTotal: acc.taxTotal + tax,
            };
        }, { listSubtotal: 0, discountedSubtotal: 0, taxTotal: 0 });

        return {
            listSubtotal: summary.listSubtotal,
            discountAmount: summary.listSubtotal - summary.discountedSubtotal,
            discountedSubtotal: summary.discountedSubtotal,
            taxTotal: summary.taxTotal,
            total: summary.discountedSubtotal + summary.taxTotal,
        };
    }, [globalDiscountPercent, items]);

    const shippingSplit = useMemo(() => {
        const orderThreshold = Number(operationalConfig?.shippingOrderCoverageThreshold || 0);
        const fullLimit = Number(operationalConfig?.shippingCoverageLimitFull || 0);
        const sharedLimit = Number(operationalConfig?.shippingCoverageLimitShared || 0);
        return calculateShippingSplit(totalsPreview.total, shippingAmount, orderThreshold, fullLimit, sharedLimit);
    }, [
        shippingAmount,
        totalsPreview.total,
        operationalConfig?.shippingOrderCoverageThreshold,
        operationalConfig?.shippingCoverageLimitFull,
        operationalConfig?.shippingCoverageLimitShared,
    ]);

    const onSubmit = async () => {
        try {
            for (let i = 0; i < items.length; i += 1) {
                const row = items[i];
                if (row.isCatalogItem && !row.productId) {
                    toast({
                        title: 'Dato requerido',
                        description: `Ítem ${i + 1}: selecciona un producto o cambia el tipo a Libre.`,
                        variant: 'destructive',
                    });
                    return;
                }
                if (!row.isCatalogItem && !(row.customDescription || '').trim()) {
                    toast({
                        title: 'Dato requerido',
                        description: `Ítem ${i + 1}: ingresa una descripción para el ítem libre.`,
                        variant: 'destructive',
                    });
                    return;
                }
            }

            const payload = {
                customerId,
                validUntil: validUntil || undefined,
                notes,
                globalDiscountPercent: Number(globalDiscountPercent || 0),
                items: items.map((it) => it.isCatalogItem ? ({
                    isCatalogItem: true as const,
                    productId: it.productId!,
                    variantId: it.variantId || undefined,
                    quantity: Number(it.quantity),
                    approvedQuantity: Number(it.approvedQuantity),
                    unitPrice: Number(it.unitPrice),
                    discountPercent: Number(it.discountPercent),
                    taxRate: Number(it.taxRate),
                }) : ({
                    isCatalogItem: false as const,
                    customDescription: it.customDescription || 'Ítem libre',
                    customSku: it.customSku || undefined,
                    quantity: Number(it.quantity),
                    approvedQuantity: Number(it.approvedQuantity),
                    unitPrice: Number(it.unitPrice),
                    discountPercent: Number(it.discountPercent),
                    taxRate: Number(it.taxRate),
                })),
            };

            const row = isEdit && id
                ? await mrpApi.updateQuotation(id, payload)
                : await mrpApi.createQuotation(payload);
            toast({ title: 'Guardado', description: 'Cotización guardada correctamente' });
            navigate(`/mrp/quotations/${row.id}`);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo guardar'), variant: 'destructive' });
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Editar Cotización' : 'Nueva Cotización'}</h1>
            </div>

            <Card>
                <CardHeader><CardTitle>Cabecera</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                        <Label>Cliente</Label>
                        <select className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)} disabled={loading}>
                            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Válida hasta</Label>
                        <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                    </div>
                    <div className="space-y-1.5 md:col-span-3">
                        <Label>Notas</Label>
                        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                    <div className="space-y-1.5 md:col-span-3">
                        <Label>Descuento global (%)</Label>
                        <Input
                            type="number"
                            min={0}
                            max={globalDiscountLimit ?? undefined}
                            step={0.01}
                            value={globalDiscountPercent}
                            onChange={(e) => updateGlobalDiscount(Number(e.target.value))}
                            disabled={hasPerItemDiscount && globalDiscountPercent <= 0}
                        />
                        <p className="text-xs text-slate-500">
                            Si usas descuento global, se bloquea descuento por ítem y viceversa.
                        </p>
                        {globalDiscountPercent > 0 && (
                            <p className="text-xs text-slate-600">
                                Con descuento global, el subtotal queda en {totalsPreview.discountedSubtotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} (ahorras {totalsPreview.discountAmount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}).
                            </p>
                        )}
                        {globalDiscountLimit !== null && (
                            <p className="text-xs text-amber-700">
                                Máximo global permitido con los ítems actuales: {globalDiscountLimit.toFixed(2)}%.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Ítems</CardTitle>
                    <Button variant="outline" onClick={addItem}>Agregar ítem</Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {items.map((it, idx) => {
                        const variants = products.find((p) => p.id === it.productId)?.variants || [];
                        const effectiveDiscount = globalDiscountPercent > 0 ? Number(globalDiscountPercent || 0) : Number(it.discountPercent || 0);
                        const unitListPrice = Number(it.unitPrice || 0);
                        const unitNetPrice = unitListPrice * (1 - (effectiveDiscount / 100));
                        const formatMoney = (value: number) => value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 });
                        return (
                            <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-semibold">Ítem {idx + 1}</p>
                                    {items.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeItem(idx)}>Eliminar</Button>}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div className="space-y-1.5">
                                        <Label>Tipo</Label>
                                        <select className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm" value={it.isCatalogItem ? 'catalog' : 'custom'} onChange={(e) => patchItem(idx, { isCatalogItem: e.target.value === 'catalog' })}>
                                            <option value="catalog">Catálogo</option>
                                            <option value="custom">Libre</option>
                                        </select>
                                    </div>
                                    {it.isCatalogItem ? (
                                        <>
                                            <div className="space-y-1.5">
                                                <Label>Buscar (nombre o referencia)</Label>
                                                <Input
                                                    placeholder="Ej: cabestrillo o CLM015"
                                                    value={it.productSearch}
                                                    onChange={(e) => patchItem(idx, { productSearch: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>Producto</Label>
                                                {(() => {
                                                    const filteredProducts = products.filter((p) => {
                                                        const needle = (it.productSearch || '').trim().toLowerCase();
                                                        if (!needle) return true;
                                                        return p.name.toLowerCase().includes(needle)
                                                            || p.sku.toLowerCase().includes(needle)
                                                            || (p.reference || '').toLowerCase().includes(needle);
                                                    });
                                                    return (
                                                <select
                                                    className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm"
                                                    value={it.productId || ''}
                                                    onChange={(e) => {
                                                        const productId = e.target.value || undefined;
                                                        patchItem(idx, {
                                                            productId,
                                                            variantId: undefined,
                                                            unitPrice: resolveCatalogUnitPrice(productId, undefined),
                                                        });
                                                    }}
                                                >
                                                    <option value="">Seleccionar</option>
                                                    {filteredProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                                    );
                                                })()}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>Variante</Label>
                                                <select
                                                    className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm"
                                                    value={it.variantId || ''}
                                                    onChange={(e) => {
                                                        const variantId = e.target.value || undefined;
                                                        patchItem(idx, {
                                                            variantId,
                                                            unitPrice: resolveCatalogUnitPrice(it.productId, variantId),
                                                        });
                                                    }}
                                                >
                                                    <option value="">(Opcional)</option>
                                                    {variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                                                </select>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="space-y-1.5">
                                                <Label>Descripción libre</Label>
                                                <Input value={it.customDescription || ''} onChange={(e) => patchItem(idx, { customDescription: e.target.value })} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>SKU libre</Label>
                                                <Input value={it.customSku || ''} onChange={(e) => patchItem(idx, { customSku: e.target.value })} />
                                            </div>
                                        </>
                                    )}
                                    <div className="space-y-1.5"><Label>Cantidad</Label><Input type="number" min={0.001} value={it.quantity} onChange={(e) => patchItem(idx, { quantity: Number(e.target.value) })} /></div>
                                    <div className="space-y-1.5"><Label>Aprobada</Label><Input type="number" min={0} value={it.approvedQuantity} onChange={(e) => patchItem(idx, { approvedQuantity: Number(e.target.value) })} /></div>
                                    <div className="space-y-1.5">
                                        <Label>Vr Unit</Label>
                                        <Input type="number" min={0} value={it.unitPrice} onChange={(e) => patchItem(idx, { unitPrice: Number(e.target.value) })} />
                                        {effectiveDiscount > 0 && (
                                            <p className="text-xs text-slate-600">
                                                Con descuento queda en {formatMoney(unitNetPrice)} por unidad.
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Desc %</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={it.discountPercent}
                                            onFocus={() => setFocusedDiscountIndex(idx)}
                                            onBlur={() => setFocusedDiscountIndex((current) => (current === idx ? null : current))}
                                            onChange={(e) => patchItem(idx, { discountPercent: Number(e.target.value) })}
                                            disabled={globalDiscountPercent > 0}
                                        />
                                        {focusedDiscountIndex === idx && (() => {
                                            const limit = resolveDiscountLimit(it);
                                            if (!limit) {
                                                return <p className="text-xs text-slate-500">Selecciona producto/variante con precio para calcular el máximo.</p>;
                                            }
                                            return (
                                                <p className="text-xs text-amber-700">
                                                    Máx descuento: {limit.maxDiscountPercent.toFixed(2)}% ({limit.maxDiscountValue.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}) · margen mínimo {limit.minAllowedMarginPercent.toFixed(2)}%
                                                </p>
                                            );
                                        })()}
                                    </div>
                                    <div className="space-y-1.5"><Label>IVA %</Label><Input type="number" min={0} value={it.taxRate} onChange={(e) => patchItem(idx, { taxRate: Number(e.target.value) })} /></div>
                                    <div className="space-y-1.5">
                                        <Label className="opacity-0">IVA 19%</Label>
                                        <button
                                            type="button"
                                            onClick={() => patchItem(idx, { taxRate: Number(it.taxRate) === 19 ? 0 : 19 })}
                                            className={`h-10 w-full rounded-md border text-sm font-medium transition-colors ${
                                                Number(it.taxRate) === 19
                                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            {Number(it.taxRate) === 19 ? 'IVA 19% activo' : 'Aplicar IVA 19%'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600 space-y-1">
                    <p>Subtotal lista (sin descuento): {totalsPreview.listSubtotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
                    <p>Descuento total: -{totalsPreview.discountAmount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
                    <p>Subtotal con descuento: {totalsPreview.discountedSubtotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
                    <p>IVA total: {totalsPreview.taxTotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
                    <p className="font-semibold text-slate-800">Total estimado: {totalsPreview.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
                    <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3 space-y-1">
                        <p className="text-xs font-semibold text-cyan-900 uppercase tracking-wide">Calculadora de envío</p>
                        <div className="space-y-1.5">
                            <Label htmlFor="quotationShippingValue">Valor envío</Label>
                            <Input
                                id="quotationShippingValue"
                                type="number"
                                min={0}
                                step={0.01}
                                value={shippingAmount}
                                onChange={(e) => setShippingAmount(Number(e.target.value) || 0)}
                            />
                        </div>
                        <p className="text-xs text-cyan-900">
                            Tope mínimo de pedido: {Number(operationalConfig?.shippingOrderCoverageThreshold || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
                        </p>
                        <p>Pagas tú: {shippingSplit.wePay.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
                        <p>Paga cliente: {shippingSplit.clientPays.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
                        {!shippingSplit.policyApplies && (
                            <p className="text-xs text-amber-700">El pedido no supera el tope mínimo, por eso el cliente asume 100% del envío.</p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/mrp/quotations')}>Cancelar</Button>
                    <Button onClick={onSubmit}>Guardar</Button>
                </div>
            </div>
        </div>
    );
}
