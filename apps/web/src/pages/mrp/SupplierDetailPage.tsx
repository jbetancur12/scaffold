import { useNavigate, useParams } from 'react-router-dom';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit2, Factory, MapPin, Phone, Mail, Building, CreditCard, FileText } from 'lucide-react';
import { SupplierMaterialsTab } from './components/SupplierMaterialsTab';
import { useSupplierQuery } from '@/hooks/mrp/useSuppliers';
import { useMrpQueryErrorRedirect } from '@/hooks/mrp/useMrpQueryErrorRedirect';
import { useToast } from '@/components/ui/use-toast';
import { mrpApi } from '@/services/mrpApi';
import { getErrorMessage } from '@/lib/api-error';
import { mrpQueryKeys } from '@/hooks/mrpQueryKeys';
import { invalidateMrpQuery } from '@/hooks/useMrpQuery';

export default function SupplierDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: supplier, loading, error } = useSupplierQuery(id);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    useMrpQueryErrorRedirect(error, 'No se pudo cargar la información del proveedor', '/mrp/suppliers');

    const handleRutUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast({ title: 'Error', description: 'El archivo debe ser PDF o imagen (JPEG, PNG, WebP)', variant: 'destructive' });
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast({ title: 'Error', description: 'El archivo no debe superar 10 MB', variant: 'destructive' });
            return;
        }

        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const base64Data = base64.split(',')[1] || base64;
            await mrpApi.uploadSupplierRut(id!, { fileName: file.name, mimeType: file.type, base64Data });
            invalidateMrpQuery(mrpQueryKeys.supplier(id!));
            toast({ title: 'Éxito', description: 'Archivo RUT cargado correctamente' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo cargar el archivo'), variant: 'destructive' });
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDownloadRut = async () => {
        try {
            const blob = await mrpApi.downloadSupplierRut(id!);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = supplier?.rutFileName || 'RUT';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo descargar el archivo'), variant: 'destructive' });
        }
    };

    const handleDeleteRut = async () => {
        if (!confirm('¿Está seguro de eliminar el archivo RUT?')) return;
        try {
            await mrpApi.deleteSupplierRut(id!);
            invalidateMrpQuery(mrpQueryKeys.supplier(id!));
            toast({ title: 'Éxito', description: 'Archivo RUT eliminado correctamente' });
        } catch (err) {
            toast({ title: 'Error', description: getErrorMessage(err, 'No se pudo eliminar el archivo'), variant: 'destructive' });
        }
    };

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
                    <Button variant="ghost" size="icon" onClick={() => navigate('/mrp/suppliers')}>
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
                    <Button onClick={() => navigate(`/mrp/suppliers/${id}/edit`)}>
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

                        {/* Datos Financieros - NOW WITH RETENTIONS */}
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
                                <div>
                                    <span className="text-sm text-slate-500 block mb-2">Retenciones Activas</span>
                                    <div className="flex flex-wrap gap-2">
                                        {supplier.retentionAtSource ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                                                Retención en la Fuente
                                            </span>
                                        ) : null}
                                        {supplier.retentionIva ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-medium">
                                                Retención IVA
                                            </span>
                                        ) : null}
                                        {!supplier.retentionAtSource && !supplier.retentionIva ? (
                                            <span className="text-xs text-slate-400">Ninguna retención activa</span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RUT File */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="font-semibold text-lg border-b pb-2 mb-4 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            Documento RUT
                        </h3>
                        {supplier.rutFilePath ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-md border border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-slate-500" />
                                        <span className="text-sm font-medium">{supplier.rutFileName || 'RUT'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDownloadRut()}
                                        >
                                            Descargar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteRut()}
                                        >
                                            Eliminar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-sm text-slate-500 mb-3">No hay un archivo RUT cargado</p>
                                <Button onClick={() => fileInputRef.current?.click()}>
                                    Subir RUT
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    className="hidden"
                                    onChange={handleRutUpload}
                                />
                            </div>
                        )}
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
