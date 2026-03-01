import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, Building2, MapPin, Receipt, FileText, Mail, Phone, User } from 'lucide-react';
import { SupplierSchema } from '@scaffold/schemas';
import { getErrorMessage } from '@/lib/api-error';
import { useSaveSupplierMutation, useSupplierQuery } from '@/hooks/mrp/useSuppliers';
import { useMrpQueryErrorRedirect } from '@/hooks/mrp/useMrpQueryErrorRedirect';

export default function SupplierFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        contactName: '',
        phone: '',
        address: '',
        city: '',
        department: '',
        bankDetails: '',
        paymentConditions: '',
        notes: '',
    });
    const { data: supplier, loading: loadingSupplier, error: supplierError } = useSupplierQuery(isEditing ? id : undefined);
    const { execute: saveSupplier } = useSaveSupplierMutation();

    useEffect(() => {
        if (!supplier) return;
        setFormData({
            name: supplier.name || '',
            email: supplier.email || '',
            contactName: supplier.contactName || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
            city: supplier.city || '',
            department: supplier.department || '',
            bankDetails: supplier.bankDetails || '',
            paymentConditions: supplier.paymentConditions || '',
            notes: supplier.notes || '',
        });
    }, [supplier]);

    useMrpQueryErrorRedirect(supplierError, 'No se pudo cargar el proveedor', '/mrp/suppliers');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            SupplierSchema.parse(formData);

            await saveSupplier({ id: isEditing ? id : undefined, payload: formData });

            toast({
                title: 'Éxito',
                description: isEditing ? 'Proveedor actualizado exitosamente' : 'Proveedor creado exitosamente',
            });
            navigate(isEditing && id ? `/mrp/suppliers/${id}` : '/mrp/suppliers');
        } catch (error: unknown) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'Error al guardar'),
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate('/mrp/suppliers')}
                        className="h-10 w-10 rounded-xl border-slate-200 hover:bg-slate-100 shrink-0"
                    >
                        <ArrowLeft className="h-4 w-4 text-slate-600" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                                {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                            </h1>
                            {loadingSupplier && isEditing && (
                                <span className="flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-violet-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm mt-1">
                            {isEditing ? 'Actualiza la información comercial y de contacto.' : 'Ingresa la información para registrar un nuevo socio comercial.'}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* General Information Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-800">Información General</h2>
                    </div>

                    <div className="p-5 sm:p-6 grid gap-6 md:grid-cols-2">
                        {/* Company Name */}
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="name" className="text-slate-700 font-medium">Nombre de la Empresa o Razón Social <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                placeholder="Ej: Proveedora Industrial S.A."
                            />
                        </div>

                        {/* Contact Person */}
                        <div className="space-y-2">
                            <Label htmlFor="contactName" className="text-slate-700 font-medium">Contacto Principal</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="contactName"
                                    value={formData.contactName}
                                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                    className="h-11 pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                    placeholder="Nombre del asesor o vendedor"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-700 font-medium">Email Comercial</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="h-11 pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                    placeholder="ventas@ejemplo.com"
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-slate-700 font-medium">Teléfono</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="h-11 pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                    placeholder="+57 300 000 0000"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Location Information Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-800">Ubicación y Logística</h2>
                    </div>

                    <div className="p-5 sm:p-6 grid gap-6 md:grid-cols-3">
                        <div className="space-y-2 md:col-span-3">
                            <Label htmlFor="address" className="text-slate-700 font-medium">Dirección Física</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                placeholder="Calle, Avenida, Zona Industrial..."
                            />
                        </div>

                        <div className="space-y-2 md:col-span-1">
                            <Label htmlFor="city" className="text-slate-700 font-medium">Ciudad</Label>
                            <Input
                                id="city"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                placeholder="Ej: Bogotá"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="department" className="text-slate-700 font-medium">Departamento / Estado / País</Label>
                            <Input
                                id="department"
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                placeholder="Ej: Cundinamarca, Colombia"
                            />
                        </div>
                    </div>
                </div>

                {/* Financial and Conditions Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <Receipt className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-800">Condiciones Comerciales y Financieras</h2>
                    </div>

                    <div className="p-5 sm:p-6 grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="paymentConditions" className="text-slate-700 font-medium">Términos de Pago y Comercio</Label>
                            <Textarea
                                id="paymentConditions"
                                placeholder="Plazos de pago (ej. 30, 60 días), descuentos por pronto pago, incoterms, fletes..."
                                value={formData.paymentConditions}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, paymentConditions: e.target.value })}
                                className="min-h-[120px] bg-slate-50 border-slate-200 focus:bg-white transition-colors resize-y"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bankDetails" className="text-slate-700 font-medium">Datos Bancarios para Pagos</Label>
                            <Textarea
                                id="bankDetails"
                                placeholder="Banco, Tipo de Cuenta, Número, Titular de la cuenta, NIT..."
                                value={formData.bankDetails}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, bankDetails: e.target.value })}
                                className="min-h-[120px] bg-slate-50 border-slate-200 focus:bg-white transition-colors resize-y"
                            />
                        </div>
                    </div>
                </div>

                {/* Notes Container */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                            <FileText className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-800">Notas Internas</h2>
                    </div>

                    <div className="p-5 sm:p-6">
                        <div className="space-y-2">
                            <Textarea
                                id="notes"
                                placeholder="Mínimos de compra, tiempos de entrega habituales, observaciones de calidad, etc..."
                                value={formData.notes}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, notes: e.target.value })}
                                className="min-h-[100px] bg-slate-50 border-slate-200 focus:bg-white transition-colors resize-y"
                            />
                        </div>
                    </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="flex items-center justify-end gap-3 pt-6 pb-2 border-t border-slate-200 mt-8 sticky bottom-4 bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/mrp/suppliers')}
                        className="h-11 px-6 border-slate-200 hover:bg-slate-100"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="h-11 px-8 bg-violet-600 hover:bg-violet-700 text-white min-w-[150px] shadow-md shadow-violet-600/20 transition-all"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                Guardando...
                            </div>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                {isEditing ? 'Guardar Cambios' : 'Registrar Proveedor'}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
