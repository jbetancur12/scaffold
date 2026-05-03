import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { mrpApi } from '@/services/mrpApi';
import type { Operator, ProductionOrder, ProductionOrderItem } from '@scaffold/types';

export default function ProductionEntryFormPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
    const [operatorId, setOperatorId] = useState('');
    const [notes, setNotes] = useState('');
    const [operators, setOperators] = useState<Operator[]>([]);
    const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
    const [quantities, setQuantities] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [opResult, ordersResult] = await Promise.all([
                    mrpApi.getOperators(1, 100, undefined, true),
                    mrpApi.getProductionOrders(1, 50),
                ]);
                setOperators(opResult.data.filter((o) => o.active));
                setProductionOrders(ordersResult.orders.filter((o) => o.status === 'planned'));
            } catch (error) {
                toast({ title: 'Error', description: getErrorMessage(error, 'Failed to save production entry'), variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSelectOrder = async (orderId: string) => {
        if (!orderId) {
            setSelectedOrder(null);
            setQuantities({});
            return;
        }
        try {
            const order = await mrpApi.getProductionOrder(orderId);
            setSelectedOrder(order);
            const init: Record<string, string> = {};
            for (const item of order.items ?? []) {
                init[item.id] = '';
            }
            setQuantities(init);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'Failed to save production entry'), variant: 'destructive' });
        }
    };

    const updateQuantity = (itemId: string, value: string) => {
        setQuantities((prev) => ({ ...prev, [itemId]: value }));
    };

    const handleSave = async () => {
        if (!selectedOrder) {
            toast({ title: 'Error', description: 'Selecciona una orden de producción', variant: 'destructive' });
            return;
        }
        if (!operatorId) {
            toast({ title: 'Error', description: 'Selecciona un operador', variant: 'destructive' });
            return;
        }
        const items = (selectedOrder.items ?? [])
            .filter((item) => quantities[item.id] && Number(quantities[item.id]) > 0)
            .map((item) => ({
                productionOrderItemId: item.id,
                quantity: Number(quantities[item.id]),
            }));
        if (items.length === 0) {
            toast({ title: 'Error', description: 'Ingresa al menos una cantidad', variant: 'destructive' });
            return;
        }
        try {
            setSaving(true);
            await mrpApi.createProductionEntry({
                entryDate,
                operatorId,
                items,
                notes: notes.trim() || undefined,
            });
            toast({ title: 'Registros de producción creados' });
            navigate('/mrp/production-entries');
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'Failed to save production entry'), variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-500">Cargando...</div>;

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="sm" onClick={() => navigate('/mrp/production-entries')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold text-slate-900">Registro de Producción Diaria</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-sm font-medium">Fecha *</Label>
                        <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
                    </div>
                    <div>
                        <Label className="text-sm font-medium">Operador *</Label>
                        <select
                            className="w-full h-10 border border-slate-300 rounded-md px-3 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            value={operatorId}
                            onChange={(e) => setOperatorId(e.target.value)}
                        >
                            <option value="">Seleccionar...</option>
                            {operators.map((op) => (
                                <option key={op.id} value={op.id}>
                                    {op.code ? `${op.code} - ${op.name}` : op.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <Label className="text-sm font-medium">Orden de Producción *</Label>
                    <select
                        className="w-full h-10 border border-slate-300 rounded-md px-3 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 mt-1"
                        value={selectedOrder?.id ?? ''}
                        onChange={(e) => handleSelectOrder(e.target.value)}
                    >
                        <option value="">Seleccionar orden...</option>
                        {productionOrders.map((order) => (
                            <option key={order.id} value={order.id}>
                                {order.code} - {order.status}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedOrder && selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div>
                        <Label className="text-sm font-medium">Cantidades producidas</Label>
                        <div className="mt-2 space-y-2">
                            {selectedOrder.items.map((item: ProductionOrderItem) => {
                                const remaining = Math.floor(Number(item.quantity) - Number(item.producedQuantity));
                                const value = quantities[item.id] ?? '';
                                const excess = Number(value) > remaining;
                                const isComplete = remaining <= 0;
                                return (
                                    <div key={item.id} className={`flex items-center gap-3 p-3 border rounded-md ${isComplete ? 'border-green-200 bg-green-50/50' : 'border-slate-200'}`}>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm truncate ${isComplete ? 'font-medium text-green-700 line-through' : 'font-medium text-slate-900'}`}>
                                                {(item.variant as any)?.product?.name ?? ''} {(item.variant as any)?.name ?? ''}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {isComplete
                                                    ? '✓ Completado'
                                                    : `Pendiente: ${remaining} / Total: ${Math.floor(Number(item.quantity))}`
                                                }
                                            </div>
                                        </div>
                                        <Input
                                            type="number"
                                            min={1}
                                            step={1}
                                            placeholder="Cant."
                                            className={`w-28 h-10 text-sm ${isComplete ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed' : excess ? 'border-red-400 focus:ring-red-500' : 'border-slate-300'}`}
                                            value={value}
                                            onChange={(e) => updateQuantity(item.id, e.target.value)}
                                            disabled={isComplete}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div>
                    <Label className="text-sm font-medium">Notas (opcional)</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones del día..." rows={2} />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                    <Button variant="outline" onClick={() => navigate('/mrp/production-entries')}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                        Guardar
                    </Button>
                </div>
            </div>
        </div>
    );
}
