import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { mrpApi } from '@/services/mrpApi';

type ItemForm = {
    isCatalogItem: boolean;
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
    const [products, setProducts] = useState<Array<{ id: string; name: string; sku: string; variants?: Array<{ id: string; name: string }> }>>([]);

    const [customerId, setCustomerId] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<ItemForm[]>([createItem()]);

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
                        variants: full.variants?.map((v) => ({ id: v.id, name: v.name })) || [],
                    };
                }));
                setProducts(productRows);

                if (isEdit && id) {
                    const q = await mrpApi.getQuotation(id);
                    setCustomerId(q.customerId);
                    setValidUntil(q.validUntil ? new Date(q.validUntil as string).toISOString().slice(0, 10) : '');
                    setNotes(q.notes || '');
                    setItems((q.items || []).map((it: any) => ({
                        isCatalogItem: it.isCatalogItem,
                        productId: it.productId,
                        variantId: it.variantId,
                        customDescription: it.customDescription || '',
                        customSku: it.customSku || '',
                        quantity: Number(it.quantity || 0),
                        approvedQuantity: Number(it.approvedQuantity || 0),
                        unitPrice: Number(it.unitPrice || 0),
                        discountPercent: Number(it.discountPercent || 0),
                        taxRate: Number(it.taxRate || 0),
                    })));
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

    const totalPreview = useMemo(() => items.reduce((acc, it) => {
        const unit = Number(it.unitPrice || 0) * (1 - Number(it.discountPercent || 0) / 100);
        const subtotal = unit * Number(it.quantity || 0);
        const tax = subtotal * (Number(it.taxRate || 0) / 100);
        return acc + subtotal + tax;
    }, 0), [items]);

    const onSubmit = async () => {
        try {
            const payload = {
                customerId,
                validUntil: validUntil || undefined,
                notes,
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
                                                <Label>Producto</Label>
                                                <select className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm" value={it.productId || ''} onChange={(e) => patchItem(idx, { productId: e.target.value, variantId: undefined })}>
                                                    <option value="">Seleccionar</option>
                                                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>Variante</Label>
                                                <select className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm" value={it.variantId || ''} onChange={(e) => patchItem(idx, { variantId: e.target.value || undefined })}>
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
                                    <div className="space-y-1.5"><Label>Vr Unit</Label><Input type="number" min={0} value={it.unitPrice} onChange={(e) => patchItem(idx, { unitPrice: Number(e.target.value) })} /></div>
                                    <div className="space-y-1.5"><Label>Desc %</Label><Input type="number" min={0} value={it.discountPercent} onChange={(e) => patchItem(idx, { discountPercent: Number(e.target.value) })} /></div>
                                    <div className="space-y-1.5"><Label>IVA %</Label><Input type="number" min={0} value={it.taxRate} onChange={(e) => patchItem(idx, { taxRate: Number(e.target.value) })} /></div>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">Total estimado: {totalPreview.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/mrp/quotations')}>Cancelar</Button>
                    <Button onClick={onSubmit}>Guardar</Button>
                </div>
            </div>
        </div>
    );
}
