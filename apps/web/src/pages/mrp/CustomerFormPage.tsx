import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, MapPin, FileText, Mail, Phone, User, UserSquare2, FileSignature } from 'lucide-react';
import { CustomerSchema } from '@scaffold/schemas';
import { getErrorMessage } from '@/lib/api-error';
import { useSaveCustomerMutation, useCustomerQuery } from '@/hooks/mrp/useCustomers';
import { useMrpQueryErrorRedirect } from '@/hooks/mrp/useMrpQueryErrorRedirect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CustomerFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        documentType: 'CC',
        documentNumber: '',
        email: '',
        contactName: '',
        phone: '',
        address: '',
        notes: '',
    });

    const { data: customer, loading: loadingCustomer, error: customerError } = useCustomerQuery(isEditing ? id : undefined);
    const { execute: saveCustomer } = useSaveCustomerMutation();

    useEffect(() => {
        if (!customer) return;
        setFormData({
            name: customer.name || '',
            documentType: customer.documentType || 'CC',
            documentNumber: customer.documentNumber || '',
            email: customer.email || '',
            contactName: customer.contactName || '',
            phone: customer.phone || '',
            address: customer.address || '',
            notes: customer.notes || '',
        });
    }, [customer]);

    useMrpQueryErrorRedirect(customerError, 'No se pudo cargar el cliente', '/mrp/customers');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            CustomerSchema.parse(formData);

            await saveCustomer({ id: isEditing ? id : undefined, data: formData });

            toast({
                title: 'Éxito',
                description: isEditing ? 'Cliente actualizado exitosamente' : 'Cliente creado exitosamente',
            });
            navigate(isEditing && id ? `/mrp/customers` : '/mrp/customers');
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
                        onClick={() => navigate('/mrp/customers')}
                        className="h-10 w-10 rounded-xl border-slate-200 hover:bg-slate-100 shrink-0"
                    >
                        <ArrowLeft className="h-4 w-4 text-slate-600" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                                {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
                            </h1>
                            {loadingCustomer && isEditing && (
                                <span className="flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm mt-1">
                            {isEditing ? 'Actualiza la información y datos de contacto del cliente.' : 'Ingresa la información para registrar un nuevo cliente en el sistema.'}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* General Information Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <UserSquare2 className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-800">Información General</h2>
                    </div>

                    <div className="p-5 sm:p-6 grid gap-6 md:grid-cols-2">
                        {/* Company / Person Name */}
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="name" className="text-slate-700 font-medium">Nombre o Razón Social <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                placeholder="Ej: Juan Pérez o Empresa S.A.S."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="docType" className="text-slate-700 font-medium">Tipo de Documento</Label>
                            <Select
                                value={formData.documentType}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, documentType: val }))}
                            >
                                <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors" id="docType">
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CC">Cédula (CC)</SelectItem>
                                    <SelectItem value="NIT">NIT</SelectItem>
                                    <SelectItem value="CE">Cédula Ext. (CE)</SelectItem>
                                    <SelectItem value="PA">Pasaporte</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="docNumber" className="text-slate-700 font-medium">Número de Documento</Label>
                            <div className="relative">
                                <FileSignature className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="docNumber"
                                    value={formData.documentNumber}
                                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                                    className="h-11 pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                    placeholder="Ej: 900.000.000-1"
                                />
                            </div>
                        </div>

                        {/* Contact Person */}
                        <div className="space-y-2">
                            <Label htmlFor="contactName" className="text-slate-700 font-medium">Persona de Contacto</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="contactName"
                                    value={formData.contactName}
                                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                    className="h-11 pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                    placeholder="Ej: María Rodríguez"
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
                                    placeholder="cliente@ejemplo.com"
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
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-800">Ubicación Física</h2>
                    </div>

                    <div className="p-5 sm:p-6 grid gap-6 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="address" className="text-slate-700 font-medium">Dirección de Despacho o Facturación</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                placeholder="Ej: Calle 100 # 10-10, Oficina 201"
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
                                placeholder="Observaciones adicionales, condiciones especiales de factura..."
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
                        onClick={() => navigate('/mrp/customers')}
                        className="h-11 px-6 border-slate-200 hover:bg-slate-100"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white min-w-[150px] shadow-md shadow-blue-600/20 transition-all"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                Guardando...
                            </div>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                {isEditing ? 'Guardar Cambios' : 'Registrar Cliente'}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
