import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MaterialSuppliersTable } from '@/components/mrp/MaterialSuppliersTable';
import { ArrowLeft, Edit2, Package } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api-error';
import { useRawMaterialQuery, useRawMaterialSuppliersQuery } from '@/hooks/mrp/useRawMaterials';

export default function RawMaterialDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const { data: material, loading, error } = useRawMaterialQuery(id);
    const { data: suppliersData } = useRawMaterialSuppliersQuery(id);
    const suppliers = suppliersData ?? [];

    useEffect(() => {
        if (!error) return;
        toast({
            title: 'Error',
            description: getErrorMessage(error, 'No se pudo cargar la información del material'),
            variant: 'destructive',
        });
        navigate('/mrp/raw-materials');
    }, [error, navigate, toast]);

    if (error) return null;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!material) return null;

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/mrp/raw-materials')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                            <Package className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{material.name}</h1>
                            <p className="text-slate-500 text-sm flex items-center gap-2">
                                SKU: <span className="font-mono font-medium text-slate-700">{material.sku}</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => navigate(`/mrp/raw-materials/${id}/edit`)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Editar Material
                    </Button>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="overview">Información General</TabsTrigger>
                    <TabsTrigger value="suppliers">Historial de Proveedores</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Basic Info Card */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2 mb-4">Detalles del Insumo</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-sm text-slate-500 block">Unidad de Medida</span>
                                    <span className="font-medium capitalize">{material.unit}</span>
                                </div>
                                <div>
                                    <span className="text-sm text-slate-500 block">Costo Estándar (Referencia)</span>
                                    <span className="font-medium text-slate-900">{formatCurrency(material.cost)}</span>
                                </div>
                                <div>
                                    <span className="text-sm text-slate-500 block">Costo Promedio (Real)</span>
                                    <span className="font-bold text-primary text-lg">
                                        {material.averageCost ? formatCurrency(material.averageCost) : '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-sm text-slate-500 block">Última Compra</span>
                                    <span className="font-medium">
                                        {material.lastPurchaseDate ? new Date(material.lastPurchaseDate).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats or Additional Info could go here */}
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 border-dashed flex items-center justify-center text-slate-400 text-sm">
                            Información adicional de inventario próximamente...
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="suppliers">
                    <MaterialSuppliersTable suppliers={suppliers} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
