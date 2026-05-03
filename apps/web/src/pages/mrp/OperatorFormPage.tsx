import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { mrpApi } from '@/services/mrpApi';

export default function OperatorFormPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast } = useToast();
    const isEditMode = Boolean(id);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(isEditMode);

    useEffect(() => {
        if (!isEditMode) return;
        const load = async () => {
            try {
                const op = await mrpApi.getOperator(id!);
                setName(op.name);
                setCode(op.code || '');
            } catch (error) {
                toast({ title: 'Error', description: getErrorMessage(error, 'Failed to save operator'), variant: 'destructive' });
                navigate('/mrp/operators');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, isEditMode]);

    const handleSave = async () => {
        if (!name.trim()) {
            toast({ title: 'Error', description: 'El nombre es requerido', variant: 'destructive' });
            return;
        }
        try {
            setSaving(true);
            const data = { name: name.trim(), code: code.trim() || undefined };
            if (isEditMode) {
                await mrpApi.updateOperator(id!, data);
                toast({ title: 'Operador actualizado' });
            } else {
                await mrpApi.createOperator(data);
                toast({ title: 'Operador creado' });
            }
            navigate('/mrp/operators');
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'Failed to save operator'), variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-500">Cargando...</div>;

    return (
        <div className="p-6 max-w-xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="sm" onClick={() => navigate('/mrp/operators')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold text-slate-900">{isEditMode ? 'Editar Operador' : 'Nuevo Operador'}</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                <div>
                    <Label className="text-sm font-medium">Nombre *</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Juan Pérez" />
                </div>
                <div>
                    <Label className="text-sm font-medium">Código (opcional)</Label>
                    <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ej: OP-001" />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => navigate('/mrp/operators')}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                        {isEditMode ? 'Guardar' : 'Crear'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
