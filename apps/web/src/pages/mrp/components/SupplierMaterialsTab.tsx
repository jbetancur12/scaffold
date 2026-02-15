import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api-error';
import { useRawMaterialsQuery } from '@/hooks/mrp/useRawMaterials';
import { useLinkSupplierMaterialMutation, useSupplierMaterialsQuery, useUnlinkSupplierMaterialMutation } from '@/hooks/mrp/useSuppliers';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';

interface SupplierMaterialsTabProps {
    supplierId: string;
}

export function SupplierMaterialsTab({ supplierId }: SupplierMaterialsTabProps) {
    const { toast } = useToast();
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Add Material State
    const [selectedMaterial, setSelectedMaterial] = useState<string>('');
    const [price, setPrice] = useState<string>('');
    const { data: supplierMaterialsData, loading, error } = useSupplierMaterialsQuery(supplierId);
    const { materials: allMaterials, error: rawMaterialsError } = useRawMaterialsQuery(1, 1000, '');
    const { execute: linkSupplierMaterial, loading: adding } = useLinkSupplierMaterialMutation();
    const { execute: unlinkSupplierMaterial } = useUnlinkSupplierMaterialMutation();
    const materials = supplierMaterialsData ?? [];

    useMrpQueryErrorToast(error, 'No se pudieron cargar los materiales del proveedor');
    useMrpQueryErrorToast(rawMaterialsError, 'No se pudo cargar la lista de materias primas');

    const handleAddMaterial = async () => {
        if (!selectedMaterial) {
            toast({
                title: "Error",
                description: "Debe seleccionar un material",
                variant: "destructive"
            });
            return;
        }

        try {
            await linkSupplierMaterial({
                supplierId,
                rawMaterialId: selectedMaterial,
                price: parseFloat(price?.toString() || '0') || 0,
            });

            toast({
                title: "Éxito",
                description: "Material vinculado correctamente",
            });

            setIsAddOpen(false);
            setSelectedMaterial('');
            setPrice('');
        } catch (error) {
            toast({
                title: "Error",
                description: getErrorMessage(error, 'No se pudo vincular el material'),
                variant: "destructive"
            });
        }
    };

    const handleRemoveMaterial = async (materialId: string) => {
        if (!confirm('¿Está seguro de que desea desvincular este material del proveedor?')) {
            return;
        }

        try {
            await unlinkSupplierMaterial({ supplierId, materialId });
            toast({
                title: "Éxito",
                description: "Material desvinculado correctamente",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: getErrorMessage(error, 'No se pudo desvincular el material'),
                variant: "destructive"
            });
        }
    };

    if (loading) {
        return <div className="p-4 text-center">Cargando materiales...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Materiales Suministrados</h3>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Vincular Material
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Vincular Material al Proveedor</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Material</Label>
                                <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar material..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allMaterials.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.sku} - {m.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>
                                    Precio de Compra (Último/Acordado)
                                    {selectedMaterial && allMaterials.find(m => m.id === selectedMaterial)?.unit &&
                                        <span className="text-muted-foreground font-normal ml-1">
                                            (por {allMaterials.find(m => m.id === selectedMaterial)?.unit})
                                        </span>
                                    }
                                </Label>
                                <CurrencyInput
                                    id="price"
                                    value={price}
                                    onValueChange={(val) => setPrice(val?.toString() || '')}
                                    placeholder="0,00"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                            <Button onClick={handleAddMaterial} disabled={adding}>
                                {adding ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/50">
                            <th className="h-12 px-4 text-left font-medium text-muted-foreground">SKU</th>
                            <th className="h-12 px-4 text-left font-medium text-muted-foreground">Material</th>
                            <th className="h-12 px-4 text-right font-medium text-muted-foreground">Último Precio</th>
                            <th className="h-12 px-4 text-right font-medium text-muted-foreground">Fecha Últ. Compra</th>
                            <th className="h-12 px-4 text-right font-medium text-muted-foreground">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {materials.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                    No hay materiales registrados para este proveedor.
                                </td>
                            </tr>
                        ) : (
                            materials.map((item, i) => (
                                <tr key={i} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <td className="p-4 font-medium">{item.rawMaterial.sku}</td>
                                    <td className="p-4">{item.rawMaterial.name}</td>
                                    <td className="p-4 text-right">
                                        {formatCurrency(item.lastPurchasePrice)}
                                    </td>
                                    <td className="p-4 text-right">
                                        {new Date(item.lastPurchaseDate).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-muted-foreground hover:text-red-600 h-8 w-8 p-0"
                                            onClick={() => handleRemoveMaterial(item.rawMaterial.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
