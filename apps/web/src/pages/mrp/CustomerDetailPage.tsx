import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, MapPin, Phone, User, Edit2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { useCustomerQuery } from '@/hooks/mrp/useCustomers';
import { useMrpQueryErrorRedirect } from '@/hooks/mrp/useMrpQueryErrorRedirect';
import { mrpApi } from '@/services/mrpApi';

export default function CustomerDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const { data: customer, loading, error } = useCustomerQuery(id);
    useMrpQueryErrorRedirect(error, 'No se pudo cargar el cliente', '/mrp/customers');

    const senderDefaults = useMemo(() => ({
        senderName: 'Colortopedicas SAS',
        senderDocument: '901954653',
        senderAddress: 'Cra 14 No 35-27',
        senderCity: 'Dosquebradas',
        senderMobile: '31381242',
        senderPhone: '',
        footerLine: 'Cra 14 No 35-27 Dosquebradas - Risaralda Tel. 31381242',
        footerEmail: '',
    }), []);

    const [labelForm, setLabelForm] = useState({
        ...senderDefaults,
        recipientName: '',
        recipientContact: '',
        recipientAddress: '',
        recipientPhone: '',
        recipientCity: '',
        recipientDepartment: '',
        footerLine: senderDefaults.footerLine,
        footerEmail: senderDefaults.footerEmail,
    });
    const [generatingPdf, setGeneratingPdf] = useState(false);

    useEffect(() => {
        if (!customer) return;
        setLabelForm((prev) => ({
            ...prev,
            recipientName: prev.recipientName || customer.name || '',
            recipientContact: prev.recipientContact || customer.contactName || '',
            recipientAddress: prev.recipientAddress || customer.address || '',
            recipientPhone: prev.recipientPhone || customer.phone || '',
            recipientCity: prev.recipientCity || '',
            recipientDepartment: prev.recipientDepartment || '',
        }));
    }, [customer]);

    const handleGeneratePdf = async () => {
        if (!id) return;
        try {
            setGeneratingPdf(true);
            const blob = await mrpApi.downloadCustomerShippingLabel(id, {
                senderName: labelForm.senderName,
                senderDocument: labelForm.senderDocument || undefined,
                senderAddress: labelForm.senderAddress || undefined,
                senderPhone: labelForm.senderPhone || undefined,
                senderMobile: labelForm.senderMobile || undefined,
                senderCity: labelForm.senderCity || undefined,
                recipientName: labelForm.recipientName,
                recipientContact: labelForm.recipientContact || undefined,
                recipientAddress: labelForm.recipientAddress || undefined,
                recipientPhone: labelForm.recipientPhone || undefined,
                recipientCity: labelForm.recipientCity || undefined,
                recipientDepartment: labelForm.recipientDepartment || undefined,
                footerLine: labelForm.footerLine || undefined,
                footerEmail: labelForm.footerEmail || undefined,
                actor: 'sistema-web',
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `rotulo-${labelForm.recipientName || 'envio'}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo generar el rótulo'),
                variant: 'destructive',
            });
        } finally {
            setGeneratingPdf(false);
        }
    };

    if (loading || !customer) {
        return (
            <div className="p-6">
                <div className="flex items-center gap-3 text-slate-500">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span>Cargando cliente...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
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
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Detalle de Cliente</h1>
                        <p className="text-slate-500 text-sm mt-1">Consulta la información y genera rótulos de envío.</p>
                    </div>
                </div>
                <Button variant="outline" onClick={() => navigate(`/mrp/customers/${customer.id}/edit`)} className="h-10">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <User className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-800">Información del Cliente</h2>
                    </div>
                    <div className="p-5 sm:p-6 space-y-4">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">Nombre</p>
                            <p className="text-slate-900 font-semibold text-lg">{customer.name}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-400">Documento</p>
                                <p className="text-slate-700">{[customer.documentType, customer.documentNumber].filter(Boolean).join(' ') || 'Sin definir'}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-400">Contacto</p>
                                <p className="text-slate-700">{customer.contactName || 'Sin contacto'}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-400">Teléfono</p>
                                <p className="text-slate-700">{customer.phone || 'Sin teléfono'}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
                                <p className="text-slate-700">{customer.email || 'Sin email'}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">Dirección</p>
                            <p className="text-slate-700">{customer.address || 'Sin dirección'}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <FileText className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-800">Rótulo de Envío</h2>
                    </div>
                    <div className="p-5 sm:p-6 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="senderName">Remitente</Label>
                                <Input
                                    id="senderName"
                                    value={labelForm.senderName}
                                    onChange={(e) => setLabelForm({ ...labelForm, senderName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="senderDocument">Documento</Label>
                                <Input
                                    id="senderDocument"
                                    value={labelForm.senderDocument}
                                    onChange={(e) => setLabelForm({ ...labelForm, senderDocument: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="senderAddress">Dirección</Label>
                                <Input
                                    id="senderAddress"
                                    value={labelForm.senderAddress}
                                    onChange={(e) => setLabelForm({ ...labelForm, senderAddress: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="senderCity">Ciudad</Label>
                                <Input
                                    id="senderCity"
                                    value={labelForm.senderCity}
                                    onChange={(e) => setLabelForm({ ...labelForm, senderCity: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="senderPhone">Teléfono</Label>
                                <Input
                                    id="senderPhone"
                                    value={labelForm.senderPhone}
                                    onChange={(e) => setLabelForm({ ...labelForm, senderPhone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="senderMobile">Celular</Label>
                                <Input
                                    id="senderMobile"
                                    value={labelForm.senderMobile}
                                    onChange={(e) => setLabelForm({ ...labelForm, senderMobile: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-4 space-y-3">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <MapPin className="h-4 w-4" />
                                Destinatario
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Empresa</Label>
                                    <Input
                                        value={labelForm.recipientName}
                                        onChange={(e) => setLabelForm({ ...labelForm, recipientName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Contacto</Label>
                                    <Input
                                        value={labelForm.recipientContact}
                                        onChange={(e) => setLabelForm({ ...labelForm, recipientContact: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Dirección</Label>
                                    <Input
                                        value={labelForm.recipientAddress}
                                        onChange={(e) => setLabelForm({ ...labelForm, recipientAddress: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Teléfono</Label>
                                    <Input
                                        value={labelForm.recipientPhone}
                                        onChange={(e) => setLabelForm({ ...labelForm, recipientPhone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Ciudad</Label>
                                    <Input
                                        value={labelForm.recipientCity}
                                        onChange={(e) => setLabelForm({ ...labelForm, recipientCity: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Departamento</Label>
                                    <Input
                                        value={labelForm.recipientDepartment}
                                        onChange={(e) => setLabelForm({ ...labelForm, recipientDepartment: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5" />
                                Vista previa en PDF tamaño media carta.
                            </div>
                            <Button onClick={handleGeneratePdf} disabled={generatingPdf} className="bg-slate-900 text-white hover:bg-slate-800">
                                <Download className="h-4 w-4 mr-2" />
                                {generatingPdf ? 'Generando...' : 'Generar PDF'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
