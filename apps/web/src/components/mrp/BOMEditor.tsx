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
import { Trash2, Plus, Edit2, Save, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { BOMItemSchema } from '@scaffold/schemas';
import { getErrorMessage } from '@/lib/api-error';
import FabricationCalculator from './FabricationCalculator';
import FabricationLayoutPreview from './FabricationLayoutPreview';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from '@/components/ui/dialog';

interface BOMEditorProps {
    variant: ProductVariant;
    materials: RawMaterial[];
}

interface BOMItemDraft {
    materialId: string;
    quantity: string;
    usageNote: string;
    fabricationParams?: {
        rollWidth: number;
        pieceWidth: number;
        pieceLength: number;
        orientation: 'normal' | 'rotated';
    };
}

export default function BOMEditor({ variant, materials }: BOMEditorProps) {
    const { toast } = useToast();
    const [bomItems, setBomItems] = useState<BOMItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Edit state
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState<BOMItemDraft | null>(null);

    // New item form state
    const [newItem, setNewItem] = useState<BOMItemDraft>({
        materialId: '',
        quantity: '',
        usageNote: '',
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
                quantity: quantity,
                usageNote: newItem.usageNote.trim() || undefined,
                fabricationParams: newItem.fabricationParams || undefined
            };

            // Validate
            BOMItemSchema.parse(payload);

            setLoading(true);

            if (editingItemId) {
                await mrpApi.updateBOMItem(editingItemId, payload);
                toast({ title: 'Material actualizado' });
            } else {
                await mrpApi.addBOMItem(payload);
                toast({ title: 'Material agregado' });
            }

            setNewItem({ materialId: '', quantity: '', usageNote: '' });
            setEditingItemId(null);
            loadBOM(); // Reload to refresh list and costs if backend updates them
        } catch (error: unknown) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'Error al guardar material'),
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateItem = async () => {
        if (!editingItemId || !editDraft) return;

        try {
            const quantity = parseFloat(editDraft.quantity);
            const payload = {
                variantId: variant.id,
                rawMaterialId: editDraft.materialId,
                quantity,
                usageNote: editDraft.usageNote.trim() || undefined,
                fabricationParams: editDraft.fabricationParams || undefined,
            };

            BOMItemSchema.parse(payload);

            setLoading(true);
            await mrpApi.updateBOMItem(editingItemId, payload);
            toast({ title: 'Material actualizado' });

            setEditingItemId(null);
            setEditDraft(null);
            loadBOM();
        } catch (error: unknown) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'Error al actualizar material'),
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEditItem = (item: BOMItem) => {
        setEditingItemId(item.id);
        setEditDraft({
            materialId: item.rawMaterialId,
            quantity: item.quantity.toString(),
            usageNote: item.usageNote || '',
            fabricationParams: item.fabricationParams
        });
    };

    const handleCancelEdit = () => {
        setEditingItemId(null);
        setEditDraft(null);
    };

    const handleDeleteItem = async (id: string) => {
        try {
            if (!confirm('¿Estás seguro de eliminar este material?')) return;
            setLoading(true);
            await mrpApi.deleteBOMItem(id);
            toast({ title: 'Material eliminado' });
            if (editingItemId === id) handleCancelEdit();
            loadBOM();
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo eliminar'), variant: 'destructive' });
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

    type BomItemWithMaterial = BOMItem & { rawMaterial?: RawMaterial };

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
                            <TableHead className="w-[160px]">Cantidad</TableHead>
                            <TableHead className="w-[80px]">Unidad</TableHead>
                            <TableHead className="w-[100px] text-right">Costo Unit</TableHead>
                            <TableHead className="w-[100px] text-right">Subtotal</TableHead>
                            <TableHead className="w-[80px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bomItems.map((item) => {
                            // Backend populate might send rawMaterial object. If not, fallback to find in list.
                            const itemWithMaterial = item as BomItemWithMaterial;
                            const material = itemWithMaterial.rawMaterial || materials.find(m => m.id === item.rawMaterialId);
                            const unitCost = (material?.averageCost && material.averageCost > 0) ? material.averageCost : (material?.cost || 0);
                            const subtotal = item.quantity * unitCost;

                            const isEditing = editingItemId === item.id;
                            const draftMaterialId = editDraft?.materialId || item.rawMaterialId;
                            const draftUnitCost = getMaterialCost(draftMaterialId);
                            const draftSubtotal = draftUnitCost * (parseFloat(editDraft?.quantity || '0') || 0);

                            return (
                                <TableRow key={item.id} className={isEditing ? 'bg-blue-50/50' : ''}>
                                    <TableCell>
                                        {isEditing && editDraft ? (
                                            <div className="space-y-2">
                                                <Select
                                                    value={editDraft.materialId}
                                                    onValueChange={(val) => setEditDraft({ ...editDraft, materialId: val })}
                                                >
                                                    <SelectTrigger className="w-full h-9 bg-white">
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
                                                <Input
                                                    value={editDraft.usageNote}
                                                    onChange={e => setEditDraft({ ...editDraft, usageNote: e.target.value })}
                                                    placeholder="Opcional: para qué es este material"
                                                    maxLength={160}
                                                    className="h-9 bg-white"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex flex-col">
                                                <span>{material?.name || item.rawMaterialId}</span>
                                                {item.usageNote && (
                                                    <span className="mt-1 inline-flex w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                                        Para: {item.usageNote}
                                                    </span>
                                                )}
                                                {item.fabricationParams && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-slate-500">
                                                            {item.fabricationParams.orientation === 'rotated' ? 'Rotada' : 'Normal'}
                                                            ({item.fabricationParams.pieceWidth}x{item.fabricationParams.pieceLength}cm)
                                                            {item.fabricationParams.quantityPerUnit && item.fabricationParams.quantityPerUnit > 1
                                                                ? ` x ${item.fabricationParams.quantityPerUnit} pz`
                                                                : ''}
                                                        </span>
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button size="sm" variant="outline" className="h-5 text-[10px] px-2">
                                                                    Ver Trazada
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[720px]">
                                                                <DialogHeader>
                                                                    <DialogTitle>Trazada de Fabricación</DialogTitle>
                                                                    <DialogDescription>
                                                                        Visualización de cómo se cortan las piezas en el rollo.
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <FabricationLayoutPreview
                                                                    calculationType={item.fabricationParams.calculationType}
                                                                    rollWidth={item.fabricationParams.rollWidth}
                                                                    pieceWidth={item.fabricationParams.pieceWidth}
                                                                    pieceLength={item.fabricationParams.pieceLength}
                                                                    orientation={item.fabricationParams.orientation}
                                                                />
                                                                <div className="text-xs text-slate-500 mt-2 text-center">
                                                                    Ancho del Rollo: {item.fabricationParams.rollWidth}cm
                                                                    {item.fabricationParams.quantityPerUnit && item.fabricationParams.quantityPerUnit > 1 && (
                                                                        <div className="font-semibold text-emerald-600">
                                                                            Calculado para {item.fabricationParams.quantityPerUnit} piezas por unidad.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {isEditing && editDraft ? (
                                            <div className="flex gap-2 items-center">
                                                <Input
                                                    type="number"
                                                    value={editDraft.quantity}
                                                    onChange={e => setEditDraft({ ...editDraft, quantity: e.target.value })}
                                                    placeholder="0.00"
                                                    min="0"
                                                    step="0.0001"
                                                    className="h-9 bg-white"
                                                />
                                                <FabricationCalculator
                                                    onCalculate={(qty, params) => setEditDraft({ ...editDraft, quantity: qty.toString(), fabricationParams: params })}
                                                />
                                            </div>
                                        ) : item.quantity}
                                    </TableCell>
                                    <TableCell>{isEditing && editDraft ? getMaterialUnit(editDraft.materialId) : material?.unit || '-'}</TableCell>
                                    <TableCell className="text-right">{isEditing && editDraft ? `$${draftUnitCost.toFixed(2)}` : `$${unitCost.toFixed(2)}`}</TableCell>
                                    <TableCell className="text-right font-medium">{isEditing && editDraft ? `$${draftSubtotal.toFixed(2)}` : `$${subtotal.toFixed(2)}`}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            {isEditing ? (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={handleCancelEdit}
                                                        className="text-slate-400 hover:text-slate-700 h-8 w-8 p-0"
                                                        title="Cancelar"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={handleUpdateItem}
                                                        disabled={loading || !editDraft?.materialId || !editDraft?.quantity}
                                                        className="h-8 w-8 p-0 bg-primary hover:bg-primary/90"
                                                        title="Actualizar"
                                                    >
                                                        <Save className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button variant="ghost" size="sm" onClick={() => handleEditItem(item)} className="text-slate-400 hover:text-primary h-8 w-8 p-0">
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)} className="text-slate-400 hover:text-red-700 h-8 w-8 p-0">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {/* New/Edit Item Row */}
                        <TableRow className="bg-slate-50 border-t-2 border-slate-100">
                            <TableCell>
                                <div className="space-y-2">
                                    <Select
                                        value={newItem.materialId}
                                        onValueChange={(val) => setNewItem({ ...newItem, materialId: val })}
                                        disabled={!!editingItemId} // Disable material change during edit for simplicity, or allow if desired
                                    >
                                        <SelectTrigger className="w-full h-9">
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
                                    <Input
                                        value={newItem.usageNote}
                                        onChange={e => setNewItem({ ...newItem, usageNote: e.target.value })}
                                        placeholder="Opcional: para qué es este material"
                                        maxLength={160}
                                        className="h-9"
                                    />
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        type="number"
                                        value={newItem.quantity}
                                        onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.0001"
                                        className="h-9"
                                    />
                                    <FabricationCalculator
                                        onCalculate={(qty, params) => setNewItem({ ...newItem, quantity: qty.toString(), fabricationParams: params })}
                                    />
                                </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                                {newItem.materialId ? getMaterialUnit(newItem.materialId) : '-'}
                            </TableCell>
                            <TableCell className="text-right text-xs text-slate-500">
                                {newItem.materialId ? `$${getMaterialCost(newItem.materialId).toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                {newItem.materialId && newItem.quantity
                                    ? `$${(getMaterialCost(newItem.materialId) * (parseFloat(newItem.quantity) || 0)).toFixed(2)}`
                                    : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                    {editingItemId && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleCancelEdit}
                                            className="h-8 w-8 p-0 text-slate-400"
                                            title="Cancelar"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        onClick={handleAddItem}
                                        disabled={loading || !newItem.materialId || !newItem.quantity}
                                        className="h-8 w-8 p-0 bg-primary hover:bg-primary/90"
                                        title={editingItemId ? 'Actualizar' : 'Agregar'}
                                    >
                                        {editingItemId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
