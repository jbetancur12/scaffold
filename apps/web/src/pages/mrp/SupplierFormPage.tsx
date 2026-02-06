import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mrpApi } from '@/services/mrpApi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
import { z } from 'zod';

const supplierSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido'),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    contactName: z.string().optional(),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
});

export default function SupplierFormPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    // Assuming create only for now as edit needs ID fetching which is similar to Product
    // I can add edit support later or if user requests.

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        contactName: '',
        phoneNumber: '',
        address: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            supplierSchema.parse(formData);

            await mrpApi.createSupplier(formData);

            toast({
                title: 'Éxito',
                description: 'Proveedor creado exitosamente',
            });
            navigate('/dashboard/mrp/suppliers');
        } catch (error: unknown) {
            let message = 'Error al guardar';
            if (error instanceof z.ZodError) {
                message = error.errors[0].message;
            }
            toast({
                title: 'Error',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 max-w-4xl mx-auto">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/mrp/suppliers')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Nuevo Proveedor
                        </h1>
                        <p className="text-slate-500">
                            Ingresa la información del proveedor.
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
                                <Label htmlFor="phoneNumber">Teléfono</Label>
                                <Input
                                    id="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">Dirección</Label>
                                <Input
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => navigate('/dashboard/mrp/suppliers')}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading} className="min-w-[150px]">
                            {loading ? 'Guardando...' : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Crear Proveedor
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
