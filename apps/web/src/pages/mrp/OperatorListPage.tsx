import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Users, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { mrpApi } from '@/services/mrpApi';
import type { Operator } from '@scaffold/types';

export default function OperatorListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [operators, setOperators] = useState<Operator[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showInactive, setShowInactive] = useState(false);

    const load = async () => {
        try {
            setLoading(true);
            const result = await mrpApi.getOperators(1, 50, search || undefined, showInactive ? undefined : true);
            setOperators(result.data);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'Failed to load operators'), variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [search, showInactive]);

    const handleToggleActive = async (op: Operator) => {
        try {
            await mrpApi.updateOperator(op.id, { active: !op.active });
            toast({ title: op.active ? 'Operador desactivado' : 'Operador activado' });
            load();
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'Failed to load operators'), variant: 'destructive' });
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="h-6 w-6 text-indigo-600" />
                        Operadores
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Gestiona los operadores de producción</p>
                </div>
                <Button onClick={() => navigate('/mrp/operators/new')}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Nuevo Operador
                </Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar operador..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                            className="rounded border-slate-300"
                        />
                        Mostrar inactivos
                    </label>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-500">Cargando...</div>
                ) : operators.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p>No hay operadores registrados</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nombre</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Código</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {operators.map((op) => (
                                <tr key={op.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-900">{op.name}</td>
                                    <td className="px-4 py-3 text-slate-600 text-sm">{op.code || '—'}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant={op.active ? 'default' : 'secondary'} className={op.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500'}>
                                            {op.active ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => navigate(`/mrp/operators/${op.id}`)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleToggleActive(op)}>
                                                {op.active ? <Trash2 className="h-4 w-4 text-red-500" /> : <Users className="h-4 w-4 text-emerald-500" />}
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
