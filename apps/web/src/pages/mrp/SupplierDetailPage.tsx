import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mrpApi } from '@/services/mrpApi';
import { Supplier } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit2, Factory, MapPin, Phone, Mail, Building, CreditCard, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { SupplierMaterialsTab } from './components/SupplierMaterialsTab';

export default function SupplierDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await mrpApi.getSupplier(id);
            setSupplier(data);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudo cargar la información del proveedor',
                variant: 'destructive',
            });
            navigate('/dashboard/mrp/suppliers');
        } finally {
            setLoading(false);
        }
    }, [id, navigate, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!supplier) return null;

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/mrp/suppliers')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                            <Factory className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{supplier.name}</h1>
                            <p className="text-slate-500 text-sm flex items-center gap-2">
                                {supplier.city ? `${supplier.city}, ` : ''}{supplier.department || 'Ubicación no registrada'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => navigate(`/dashboard/mrp/suppliers/${id}/edit`)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Editar Proveedor
                    </Button>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="overview">Información General</TabsTrigger>
                    <TabsTrigger value="materials">Materiales</TabsTrigger>
                    {/* Future: Add 'Purchase History' or 'Supplied Materials' tabs here */}
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {/* Contact & Location */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2 mb-4 flex items-center gap-2">
                                <Building className="h-4 w-4 text-slate-400" />
                                Contacto y Ubicación
                            </h3>

                            <div className="space-y-3">
                                <div>
                                    <span className="text-sm text-slate-500 block">Contacto Principal</span>
                                    <span className="font-medium">{supplier.contactName || '-'}</span>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <span className="text-sm text-slate-500 block flex items-center gap-1">
                                            <Mail className="h-3 w-3" /> Email
                                        </span>
                                        <span className="font-medium">{supplier.email || '-'}</span>
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-sm text-slate-500 block flex items-center gap-1">
                                            <Phone className="h-3 w-3" /> Teléfono
                                        </span>
                                        <span className="font-medium">{supplier.phone || '-'}</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm text-slate-500 block flex items-center gap-1">
                                        <MapPin className="h-3 w-3" /> Dirección
                                    </span>
                                    <span className="font-medium">
                                        {supplier.address || '-'}
                                        {supplier.city && `, ${supplier.city}`}
                                        {supplier.department && ` - ${supplier.department}`}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2 mb-4 flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-slate-400" />
                                Datos Financieros
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <span className="text-sm text-slate-500 block">Datos Bancarios</span>
                                    <p className="font-medium whitespace-pre-wrap text-sm mt-1 bg-slate-50 p-3 rounded-md border border-slate-100">
                                        {supplier.bankDetails || 'No registrados'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm text-slate-500 block">Condiciones Comerciales</span>
                                    <p className="font-medium whitespace-pre-wrap text-sm mt-1 bg-slate-50 p-3 rounded-md border border-slate-100">
                                        {supplier.paymentConditions || 'No registradas'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="font-semibold text-lg border-b pb-2 mb-4 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            Notas Adicionales
                        </h3>
                        <p className="font-medium whitespace-pre-wrap text-sm text-slate-700">
                            {supplier.notes || 'Sin notas adicionales.'}
                        </p>
                    </div>
                </TabsContent>

                <TabsContent value="materials" className="space-y-6">
                    <SupplierMaterialsTab supplierId={id!} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
