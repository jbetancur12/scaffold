import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Plus, Trash2, ArrowLeft, Loader2, Users, Package, FileText, ChevronsUpDown, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CreateSalesOrderSchema } from '@scaffold/schemas';
import { getErrorMessage } from '@/lib/api-error';
import { useCustomersQuery } from '@/hooks/mrp/useCustomers';
import { useProductsQuery } from '@/hooks/mrp/useProducts';
import { useCreateSalesOrderMutation } from '@/hooks/mrp/useSalesOrders';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { CreateCustomerDialog } from './components/CreateCustomerDialog';
import { cn } from '@/lib/utils';

interface OrderItem {
    productId: string;
    variantId?: string;
    productSearch: string;
    quantity: number;
    unitPrice: number;
}

export default function SalesOrderFormPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [activeCatalogComboboxIdx, setActiveCatalogComboboxIdx] = useState<number | null>(null);
    const [catalogHighlightByIndex, setCatalogHighlightByIndex] = useState<Record<number, number>>({});
    const [showValidation, setShowValidation] = useState(false);

    // Customer Combobox State
    const [openCustomerCombobox, setOpenCustomerCombobox] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCreateCustomerDialog, setShowCreateCustomerDialog] = useState(false);

    const [formData, setFormData] = useState({
        customerId: '',
        expectedDeliveryDate: '',
        notes: '',
    });

    const [items, setItems] = useState<OrderItem[]>([
        {
            productId: '',
            variantId: undefined,
            productSearch: '',
            quantity: 1,
            unitPrice: 0,
        }
    ]);

    const { data: customersResponse, error: customersError } = useCustomersQuery();
    const { data: productsResponse, error: productsError } = useProductsQuery(1, 100);
    const { execute: createSalesOrder } = useCreateSalesOrderMutation();

    const customers = customersResponse || [];
    const products = productsResponse?.products ?? [];

    useMrpQueryErrorToast(customersError, 'No se pudo cargar los clientes');
    useMrpQueryErrorToast(productsError, 'No se pudieron cargar los productos');

    const addItem = () => {
        setItems((prev) => [
            ...prev,
            {
                productId: '',
                variantId: undefined,
                productSearch: '',
                quantity: 1,
                unitPrice: 0,
            }
        ]);
    };

    const removeItem = (index: number) => {
        if (items.length === 1) {
            toast({
                title: 'Error',
                description: 'Debe haber al menos un producto en el pedido',
                variant: 'destructive',
            });
            return;
        }
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof OrderItem, value: string | number | undefined) => {
        setItems((prev) => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [field]: value } as OrderItem;
            return newItems;
        });
    };

    const getProductById = (id: string) => {
        return products.find(p => p.id === id);
    };

    const getFilteredProducts = (search: string) => {
        const normalized = search.trim().toLowerCase();
        if (!normalized) return products.slice(0, 50);
        return products
            .filter((product) =>
                product.name.toLowerCase().includes(normalized) ||
                product.sku.toLowerCase().includes(normalized)
            )
            .slice(0, 100);
    };

    const getRefPrice = (productId: string): number => {
        const product = getProductById(productId);
        if (!product?.variants?.length) return 0;
        return Math.max(...product.variants.map(v => v.price ?? 0));
    };

    const handleProductChange = (index: number, productId: string) => {
        const selectedProduct = getProductById(productId);
        updateItem(index, 'productId', productId);
        updateItem(index, 'variantId', undefined);
        if (selectedProduct) {
            updateItem(index, 'productSearch', `${selectedProduct.sku} ${selectedProduct.name}`);
            const refPrice = getRefPrice(productId);
            if (refPrice > 0) updateItem(index, 'unitPrice', refPrice);
        }
    };

    const handleCatalogInputKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
        const list = getFilteredProducts(items[index]?.productSearch || '');
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
                handleProductChange(index, selected.id);
                setActiveCatalogComboboxIdx(null);
            }
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            setActiveCatalogComboboxIdx(null);
        }
    };

    const calculateTotals = () => {
        return items.reduce((acc, item) => {
            const lineTotal = item.quantity * item.unitPrice;
            return {
                total: acc.total + lineTotal
            };
        }, { total: 0 });
    };

    const totals = calculateTotals();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowValidation(true);

        if (!formData.customerId) {
            toast({
                title: 'Error',
                description: 'Selecciona un cliente',
                variant: 'destructive',
            });
            return;
        }

        const invalidItems = items.filter((item) => {
            if (item.quantity <= 0 || item.unitPrice < 0) return true;
            return !item.productId;
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
                customerId: formData.customerId,
                expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
                notes: formData.notes.trim() || undefined,
                items: items.map(item => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                })),
            };

            const validatedData = CreateSalesOrderSchema.parse(submitData);
            await createSalesOrder(validatedData);

            toast({
                title: 'Éxito',
                description: 'Pedido creado exitosamente',
                variant: 'default',
            });
            navigate('/mrp/sales-orders');
        } catch (error: unknown) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo crear el pedido'),
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/mrp/sales-orders')}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
                <h1 className="text-3xl font-bold">Nuevo Pedido de Cliente</h1>
                <p className="text-slate-600">Crea un nuevo pedido seleccionando los productos requeridos.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col xl:flex-row gap-6 items-start">
                <div className="flex-1 space-y-6 w-full min-w-0">
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Users className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-semibold text-slate-800">Cliente y Encabezado</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="customer">Cliente *</Label>
                                <Popover open={openCustomerCombobox} onOpenChange={setOpenCustomerCombobox}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCustomerCombobox}
                                            className={`w-full justify-between mt-1 ${showValidation && !formData.customerId ? 'border-red-500 bg-red-50/50' : 'border-slate-300'}`}
                                        >
                                            <span className="truncate">
                                                {formData.customerId
                                                    ? customers.find((c) => c.id === formData.customerId)?.name
                                                    : "Selecciona un cliente..."}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                                        <Command>
                                            <CommandInput
                                                placeholder="Buscar por nombre o NIT..."
                                                value={customerSearch}
                                                onValueChange={setCustomerSearch}
                                            />
                                            <CommandList>
                                                <CommandEmpty className="p-2 text-sm text-center">
                                                    <p className="text-slate-500 mb-2">No se encontró el cliente "{customerSearch}".</p>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="w-full"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setOpenCustomerCombobox(false);
                                                            setShowCreateCustomerDialog(true);
                                                        }}
                                                    >
                                                        + Crear cliente "{customerSearch}"
                                                    </Button>
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {customers.filter(c =>
                                                        !customerSearch ||
                                                        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                                        c.documentNumber?.includes(customerSearch)
                                                    ).map((customer) => (
                                                        <CommandItem
                                                            key={customer.id}
                                                            value={customer.name}
                                                            onSelect={() => {
                                                                setFormData({ ...formData, customerId: customer.id });
                                                                setOpenCustomerCombobox(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    formData.customerId === customer.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {customer.name} {customer.documentNumber ? `(${customer.documentNumber})` : ''}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>

                                                {customerSearch && (
                                                    <div className="p-1 border-t">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setOpenCustomerCombobox(false);
                                                                setShowCreateCustomerDialog(true);
                                                            }}
                                                        >
                                                            + Crear cliente "{customerSearch}"
                                                        </Button>
                                                    </div>
                                                )}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                {showValidation && !formData.customerId && (
                                    <p className="text-xs text-red-500 mt-1">Selecciona un cliente para continuar.</p>
                                )}
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
                            <Label htmlFor="notes">Notas adicionales del pedido</Label>
                            <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Notas internas para despacho o producción..."
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-0">
                        <div className="p-6 pb-4 flex justify-between items-center border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-blue-600" />
                                <h2 className="text-xl font-semibold text-slate-800">Productos del Pedido</h2>
                            </div>
                            <Button type="button" onClick={addItem} variant="outline" size="sm">
                                <Plus className="mr-2 h-4 w-4" />
                                Agregar Producto
                            </Button>
                        </div>

                        <div className="flex flex-col">
                            {items.map((item, index) => {

                                return (<div key={index} className={`bg-white border-b border-slate-100 last:border-b-0 p-4 sm:p-5 relative ${activeCatalogComboboxIdx === index ? 'z-50' : 'z-10'}`}>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                        {/* Column 1: Selector */}
                                        <div className="md:col-span-5 relative">
                                            <Label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Producto *</Label>
                                            <div className="relative">
                                                <Input
                                                    type="text"
                                                    placeholder="Buscar por nombre o SKU..."
                                                    value={item.productSearch}
                                                    onChange={(e) => {
                                                        updateItem(index, 'productSearch', e.target.value);
                                                        setActiveCatalogComboboxIdx(index);
                                                        if (!e.target.value) {
                                                            updateItem(index, 'productId', '');
                                                        }
                                                    }}
                                                    onFocus={() => {
                                                        setActiveCatalogComboboxIdx(index);
                                                    }}
                                                    onBlur={() => {
                                                        setTimeout(() => {
                                                            if (activeCatalogComboboxIdx === index) {
                                                                setActiveCatalogComboboxIdx(null);
                                                                if (item.productSearch && !item.productId) {
                                                                    const exactMatch = products.find(m => `${m.sku} ${m.name}`.toLowerCase() === item.productSearch.toLowerCase());
                                                                    if (exactMatch) handleProductChange(index, exactMatch.id);
                                                                } else if (!item.productId) {
                                                                    updateItem(index, 'productSearch', '');
                                                                }
                                                            }
                                                        }, 200);
                                                    }}
                                                    onKeyDown={(e) => handleCatalogInputKeyDown(index, e)}
                                                    className={`w-full ${showValidation && !item.productId ? 'border-red-500 ring-red-500' : ''}`}
                                                />

                                                {activeCatalogComboboxIdx === index && (
                                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                        {getFilteredProducts(item.productSearch).length > 0 ? (
                                                            getFilteredProducts(item.productSearch).map((p, pIndex) => (
                                                                <div
                                                                    key={p.id}
                                                                    className={`px-4 py-2 cursor-pointer text-sm ${catalogHighlightByIndex[index] === pIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        handleProductChange(index, p.id);
                                                                    }}
                                                                    onMouseEnter={() => setCatalogHighlightByIndex(prev => ({ ...prev, [index]: pIndex }))}
                                                                >
                                                                    <div className="font-semibold">{p.sku}</div>
                                                                    <div className="text-slate-600 text-xs truncate">{p.name}</div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="px-4 py-3 text-sm text-slate-500 italic text-center">
                                                                No se encontraron productos
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {showValidation && !item.productId && (
                                                <p className="text-xs text-red-500 mt-1">Selecciona un producto.</p>
                                            )}

                                            {item.productId && getProductById(item.productId)?.variants && getProductById(item.productId)!.variants!.length > 0 && (
                                                <div className="mt-3">
                                                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Variante (Opcional)</Label>
                                                    <select
                                                        className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        value={item.variantId || ''}
                                                        onChange={(e) => {
                                                            const selectedVariantId = e.target.value || undefined;
                                                            updateItem(index, 'variantId', selectedVariantId);
                                                            // Price stays as reference price (max), user can override manually
                                                        }}
                                                    >
                                                        <option value="">(Sin variante)</option>
                                                        {getProductById(item.productId)?.variants?.map((v) => (
                                                            <option key={v.id} value={v.id}>
                                                                {v.name} - {v.sku}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        {/* Column 2: Quantity */}
                                        <div className="md:col-span-3">
                                            <Label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Cantidad</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    value={item.quantity || ''}
                                                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                    min="0"
                                                    step="1"
                                                />
                                                <span className="text-sm text-slate-500 w-16 truncate">Unidades</span>
                                            </div>
                                        </div>

                                        {/* Column 3: Price */}
                                        <div className="md:col-span-3">
                                            <Label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Precio Unitario</Label>
                                            <Input
                                                type="number"
                                                value={item.unitPrice || ''}
                                                onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>

                                        {/* Actions */}
                                        <div className="md:col-span-1 flex items-end justify-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeItem(index)}
                                                className="text-slate-400 hover:text-red-500 hover:bg-red-50/50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="w-full xl:w-80 shrink-0 space-y-6 xl:sticky xl:top-24">
                    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                        <div className="bg-slate-900 px-5 py-4 text-white">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-400" />
                                Resumen del Pedido
                            </h3>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Cantidad de Ítems</span>
                                <span className="font-medium text-slate-900">{items.length}</span>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-base font-bold text-slate-900">Total</span>
                                <span className="text-xl font-black text-blue-700 tracking-tight">
                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(totals.total)}
                                </span>
                            </div>
                        </div>

                        <div className="p-5 bg-slate-50 border-t border-slate-100">
                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-semibold shadow-sm hover:shadow transition-all"
                                disabled={loading}
                            >
                                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                Crear Pedido
                            </Button>
                        </div>
                    </div>
                </div>
            </form>

            <CreateCustomerDialog
                open={showCreateCustomerDialog}
                onOpenChange={setShowCreateCustomerDialog}
                initialSearch={customerSearch}
                onSuccess={(newCustomer) => {
                    // Update form data so that it's selected automatically
                    setFormData(prev => ({ ...prev, customerId: newCustomer.id }));
                    toast({
                        title: 'Cliente creado',
                        description: `Se ha creado el cliente ${newCustomer.name} exitosamente.`
                    });
                }}
            />
        </div>
    );
}
