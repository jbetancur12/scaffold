import { useState, useEffect } from 'react';

import { mrpApi } from '@/services/mrpApi';
import { InventoryItem, ProductVariant, RawMaterial, Warehouse, Product } from '@scaffold/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package } from 'lucide-react';
import { format } from 'date-fns';

interface PopulatedInventoryItem extends InventoryItem {
    variant?: ProductVariant & { product?: Product };
    rawMaterial?: RawMaterial;
    warehouse?: Warehouse;
}

export default function InventoryDashboardPage() {
    // const navigate = useNavigate();
    const [inventory, setInventory] = useState<PopulatedInventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadInventory();
    }, []);

    const loadInventory = async () => {
        try {
            setLoading(true);
            const data = await mrpApi.getInventory(1, 100); // Fetch mostly all for now
            setInventory(data.items as PopulatedInventoryItem[]);
        } catch (err) {
            console.error(err);
            setError('Error al cargar el inventario');
        } finally {
            setLoading(false);
        }
    };

    const getItemName = (item: PopulatedInventoryItem) => {
        if (item.variant) {
            return `${item.variant.product?.name || 'Producto'} - ${item.variant.sku}`;
        }
        if (item.rawMaterial) {
            return item.rawMaterial.name;
        }
        return 'N/A';
    };

    const getItemType = (item: PopulatedInventoryItem) => {
        if (item.variant) return <Badge variant="default">Producto Final</Badge>;
        if (item.rawMaterial) return <Badge variant="secondary">Materia Prima</Badge>;
        return <Badge variant="outline">Desconocido</Badge>;
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Inventario
                    </h1>
                    <p className="text-slate-500">
                        Gestión de Stock: Materias Primas y Productos Terminados por Almacén.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                <div className="p-4 text-red-500 bg-red-50 rounded-md">
                    {error}
                </div>
            ) : (
                <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ítem</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Almacén</TableHead>
                                <TableHead className="text-right">Cantidad</TableHead>
                                <TableHead>Última Actualización</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inventory.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No hay ítems en inventario.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                inventory.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4 text-slate-400" />
                                                {getItemName(item)}
                                            </div>
                                        </TableCell>
                                        <TableCell>{getItemType(item)}</TableCell>
                                        <TableCell>{item.warehouse?.name || '---'}</TableCell>
                                        <TableCell className="text-right font-bold text-lg text-slate-700">
                                            {item.quantity}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {item.updatedAt ? format(new Date(item.updatedAt), 'dd/MM/yyyy HH:mm') : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
