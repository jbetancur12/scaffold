import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
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
        <div className="space-y-8 max-w-4xl mx-auto">
            {loadingSupplier && isEditing ? (
                <div className="text-sm text-slate-500">Cargando proveedor...</div>
            ) : null}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/mrp/suppliers')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                    </h1>
                    <p className="text-slate-500">
                        {isEditing ? 'Actualiza la información del proveedor.' : 'Ingresa la información del proveedor.'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre de la Empresa</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="contactName">Nombre de Contacto</Label>
                            <Input
                                id="contactName"
                                value={formData.contactName}
                                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="address">Dirección</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="city">Ciudad</Label>
                            <Input
                                id="city"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="department">Departamento/Estado</Label>
                            <Input
                                id="department"
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bankDetails">Datos Bancarios</Label>
                        <Textarea
                            id="bankDetails"
                            placeholder="Banco, Tipo de Cuenta, Número, Titular..."
                            value={formData.bankDetails}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, bankDetails: e.target.value })}
                            className="min-h-[80px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="paymentConditions">Condiciones de Pago / Comerciales</Label>
                        <Textarea
                            id="paymentConditions"
                            placeholder="Plazo de pago, descuentos, incoterms, fletes..."
                            value={formData.paymentConditions}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, paymentConditions: e.target.value })}
                            className="min-h-[80px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notas Adicionales</Label>
                        <Textarea
                            id="notes"
                            placeholder="Mínimos de compra, tiempos de entrega, observaciones..."
                            value={formData.notes}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, notes: e.target.value })}
                            className="min-h-[80px]"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate('/mrp/suppliers')}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading} className="min-w-[150px]">
                        {loading ? 'Guardando...' : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                {isEditing ? 'Actualizar Proveedor' : 'Crear Proveedor'}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
