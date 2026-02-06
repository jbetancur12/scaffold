import { useState, useEffect, useCallback } from 'react';
import { mrpApi } from '@/services/mrpApi';
import { BOMItem, RawMaterial, ProductVariant } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { z } from 'zod';

interface BOMEditorProps {
    variant: ProductVariant;
    materials: RawMaterial[];
}

const bomItemSchema = z.object({
    variantId: z.string(),
    rawMaterialId: z.string().min(1, 'Selecciona un material'),
    quantity: z.number().min(0.0001, 'Cantidad requerida'),
});

export default function BOMEditor({ variant, materials }: BOMEditorProps) {
    const { toast } = useToast();
    const [bomItems, setBomItems] = useState<BOMItem[]>([]);
    const [loading, setLoading] = useState(false);

    // New item form state
    const [newItem, setNewItem] = useState({
        materialId: '',
        quantity: '',
    });

    const loadBOM = useCallback(async () => {
        try {
            setLoading(true);
            const items = await mrpApi.getBOM(variant.id);
            setBomItems(items);
        } catch (error) {
            console.error('Error loading BOM', error);
        } finally {
            setLoading(false);
        }
    }, [variant.id]);

    useEffect(() => {
        loadBOM();
    }, [loadBOM]);

    const handleAddItem = async () => {
        try {
            const quantity = parseFloat(newItem.quantity);
            const payload = {
                variantId: variant.id,
                rawMaterialId: newItem.materialId,
                quantity: quantity
            };

            // Validate
            bomItemSchema.parse(payload);

            setLoading(true);
            await mrpApi.addBOMItem(payload);

            toast({ title: 'Material agregado' });
            setNewItem({ materialId: '', quantity: '' });
            loadBOM(); // Reload to refresh list and costs if backend updates them
        } catch (error: unknown) {
            let message = 'Error al agregar material';
            if (error instanceof z.ZodError) {
                message = error.errors[0].message;
            }
            toast({
                title: 'Error',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteItem = async (id: string) => {
        try {
            if (!confirm('¿Estás seguro de eliminar este material?')) return;
            setLoading(true);
            await mrpApi.deleteBOMItem(id);
            toast({ title: 'Material eliminado' });
            loadBOM();
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    // Helper to find material name by ID for display if relation not populated deep enough or just for safety
    const getMaterialUnit = (id: string) => materials.find(m => m.id === id)?.unit || '-';
    const getMaterialCost = (id: string) => {
        const m = materials.find(m => m.id === id);
        return (m?.averageCost && m.averageCost > 0) ? m.averageCost : (m?.cost || 0);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-slate-700">Variant: <span className="text-slate-900 font-bold">{variant.name} ({variant.sku})</span></div>
                {/* Could show total cost here */}
            </div>

            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead className="w-[100px]">Cantidad</TableHead>
                            <TableHead className="w-[80px]">Unidad</TableHead>
                            <TableHead className="w-[100px] text-right">Costo Unit</TableHead>
                            <TableHead className="w-[100px] text-right">Subtotal</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bomItems.map((item) => {
                            // Backend populate might send rawMaterial object. If not, fallback to find in list.
                            // ... (retaining prior context if needed, but here simple replace)
                            // @ts-expect-error rawMaterial might not be in the type definition yet
                            const material = item.rawMaterial || materials.find(m => m.id === item.rawMaterialId);
                            const unitCost = (material?.averageCost && material.averageCost > 0) ? material.averageCost : (material?.cost || 0);
                            const subtotal = item.quantity * unitCost;

                            return (
                                <TableRow key={item.id}>
                                    <TableCell>{material?.name || item.rawMaterialId}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>{material?.unit || '-'}</TableCell>
                                    <TableCell className="text-right">${unitCost.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-medium">${subtotal.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:text-red-700 h-8 w-8 p-0">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {/* New Item Row */}
                        <TableRow className="bg-slate-50">
                            <TableCell>
                                <Select
                                    value={newItem.materialId}
                                    onValueChange={(val) => setNewItem({ ...newItem, materialId: val })}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Seleccionar Material" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {materials.map(m => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.name} ({m.sku}) - ${(m.averageCost && m.averageCost > 0 ? m.averageCost : m.cost).toFixed(2)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="number"
                                    value={newItem.quantity}
                                    onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    className="h-9"
                                />
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                                {newItem.materialId ? getMaterialUnit(newItem.materialId) : '-'}
                            </TableCell>
                            <TableCell className="text-right text-xs text-slate-500">
                                {newItem.materialId ? `$${getMaterialCost(newItem.materialId)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                -
                            </TableCell>
                            <TableCell>
                                <Button
                                    size="sm"
                                    onClick={handleAddItem}
                                    disabled={loading || !newItem.materialId || !newItem.quantity}
                                    className="h-8 w-8 p-0"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
