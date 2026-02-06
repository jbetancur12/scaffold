import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mrpApi } from '../../services/mrpApi';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Supplier {
    id: string;
    name: string;
}

interface RawMaterial {
    id: string;
    name: string;
    sku: string;
    unit: string;
    cost: number;
}

interface OrderItem {
    rawMaterialId: string;
    quantity: number;
    unitPrice: number;
}

export default function PurchaseOrderFormPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);

    const [formData, setFormData] = useState({
        supplierId: '',
        expectedDeliveryDate: '',
        notes: '',
    });

    const [items, setItems] = useState<OrderItem[]>([
        { rawMaterialId: '', quantity: 0, unitPrice: 0 }
    ]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [suppliersRes, materialsRes] = await Promise.all([
                mrpApi.getSuppliers(1, 100),
                mrpApi.getRawMaterials(1, 100),
            ]);
            setSuppliers(suppliersRes.suppliers);
            setRawMaterials(materialsRes.materials);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudieron cargar los datos',
                variant: 'destructive',
            });
        }
    };

    const addItem = () => {
        setItems([...items, { rawMaterialId: '', quantity: 0, unitPrice: 0 }]);
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

    const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
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
            await mrpApi.createPurchaseOrder({
                ...formData,
                items,
            });
            toast({
                title: 'Éxito',
                description: 'Orden de compra creada exitosamente',
            });
            navigate('/dashboard/mrp/purchase-orders');
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudo crear la orden de compra',
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
                    onClick={() => navigate('/dashboard/mrp/purchase-orders')}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
                <h1 className="text-3xl font-bold">Nueva Orden de Compra</h1>
                <p className="text-slate-600">Crea una nueva orden de compra de materias primas.</p>
            </div>

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

                    <div className="space-y-4">
                        {items.map((item, index) => {
                            const material = getMaterialById(item.rawMaterialId);
                            const subtotal = item.quantity * item.unitPrice;

                            return (
                                <div key={index} className="border border-slate-200 rounded-lg p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                        <div className="md:col-span-2">
                                            <Label>Materia Prima *</Label>
                                            <select
                                                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={item.rawMaterialId}
                                                onChange={(e) => updateItem(index, 'rawMaterialId', e.target.value)}
                                                required
                                            >
                                                <option value="">Selecciona una materia prima</option>
                                                {rawMaterials.map((material) => (
                                                    <option key={material.id} value={material.id}>
                                                        {material.name} ({material.sku})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <Label>Cantidad *</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                value={item.quantity || ''}
                                                onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                placeholder="0.00"
                                                required
                                            />
                                            {material && (
                                                <span className="text-xs text-slate-500">{material.unit}</span>
                                            )}
                                        </div>

                                        <div>
                                            <Label>Precio Unitario *</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                value={item.unitPrice || ''}
                                                onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>

                                        <div className="flex items-end gap-2">
                                            <div className="flex-1">
                                                <Label>Subtotal</Label>
                                                <div className="mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium">
                                                    ${subtotal.toFixed(2)}
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeItem(index)}
                                                className="text-red-600 hover:text-red-700"
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
                        <div className="text-right">
                            <div className="text-sm text-slate-600">Total</div>
                            <div className="text-2xl font-bold">${calculateTotal().toFixed(2)}</div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/dashboard/mrp/purchase-orders')}
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
