import { useState, useEffect, useCallback } from 'react';
import { mrpApi } from '@/services/mrpApi';
import { RawMaterial } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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

interface Material {
    rawMaterial: RawMaterial;
    lastPurchasePrice: number;
    lastPurchaseDate: string;
}

interface SupplierMaterialsTabProps {
    supplierId: string;
}

export function SupplierMaterialsTab({ supplierId }: SupplierMaterialsTabProps) {
    const { toast } = useToast();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Add Material State
    const [allMaterials, setAllMaterials] = useState<RawMaterial[]>([]);
    const [selectedMaterial, setSelectedMaterial] = useState<string>('');
    const [price, setPrice] = useState<string>('');
    const [adding, setAdding] = useState(false);

    const loadMaterials = useCallback(async () => {
        try {
            setLoading(true);
            const data = await mrpApi.getSupplierMaterials(supplierId);
            setMaterials(data);
        } catch (error) {
            console.error('Failed to load supplier materials', error);
        } finally {
            setLoading(false);
        }
    }, [supplierId]);

    const loadAllMaterials = useCallback(async () => {
        try {
            const data = await mrpApi.getRawMaterials(1, 1000); // Load all for dropdown
            setAllMaterials(data.materials);
        } catch (error) {
            console.error('Failed to load raw materials list', error);
        }
    }, []);

    useEffect(() => {
        loadMaterials();
    }, [loadMaterials]);

    // Load dropdown options when dialog opens
    useEffect(() => {
        if (isAddOpen && allMaterials.length === 0) {
            loadAllMaterials();
        }
    }, [isAddOpen, allMaterials.length, loadAllMaterials]);

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
            setAdding(true);
            await mrpApi.addSupplierMaterial(supplierId, {
                rawMaterialId: selectedMaterial,
                price: parseFloat(price?.toString() || '0') || 0
            });

            toast({
                title: "Éxito",
                description: "Material vinculado correctamente",
            });

            setIsAddOpen(false);
            setSelectedMaterial('');
            setPrice('');
            loadMaterials();
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo vincular el material",
                variant: "destructive"
            });
        } finally {
            setAdding(false);
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
                        </tr>
                    </thead>
                    <tbody>
                        {materials.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-4 text-center text-muted-foreground">
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
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
