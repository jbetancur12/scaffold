import { useMemo, useState } from 'react';
import { ProductGroup } from '@scaffold/types';
import { Layers, Plus, Pencil, Trash2, ArrowLeft, FolderTree } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getErrorMessage } from '@/lib/api-error';
import { useDeleteProductGroupMutation, useProductGroupsQuery, useSaveProductGroupMutation } from '@/hooks/mrp/useProducts';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';

interface GroupFormState {
    name: string;
    slug: string;
    description: string;
    parentId: string;
    sortOrder: string;
    active: boolean;
}

const emptyForm: GroupFormState = {
    name: '',
    slug: '',
    description: '',
    parentId: '',
    sortOrder: '0',
    active: true,
};

export default function ProductGroupListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { data: groups, loading, error } = useProductGroupsQuery(false);
    const { execute: saveGroup } = useSaveProductGroupMutation();
    const { execute: deleteGroup } = useDeleteProductGroupMutation();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<ProductGroup | null>(null);
    const [form, setForm] = useState<GroupFormState>(emptyForm);
    const [saving, setSaving] = useState(false);

    useMrpQueryErrorToast(error, 'No se pudieron cargar los grupos');

    const topLevelGroups = useMemo(
        () => (groups ?? []).filter((group) => !group.parentId),
        [groups]
    );

    const childGroups = useMemo(
        () => (groups ?? []).filter((group) => group.parentId),
        [groups]
    );

    const openCreate = () => {
        setEditingGroup(null);
        setForm(emptyForm);
        setDialogOpen(true);
    };

    const openEdit = (group: ProductGroup) => {
        setEditingGroup(group);
        setForm({
            name: group.name,
            slug: group.slug,
            description: group.description || '',
            parentId: group.parentId || '',
            sortOrder: String(group.sortOrder ?? 0),
            active: group.active,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await saveGroup({
                id: editingGroup?.id,
                payload: {
                    name: form.name.trim(),
                    slug: form.slug.trim() || undefined,
                    description: form.description.trim() || undefined,
                    parentId: form.parentId || undefined,
                    sortOrder: Number(form.sortOrder || 0),
                    active: form.active,
                },
            });
            toast({
                title: editingGroup ? 'Grupo actualizado' : 'Grupo creado',
                description: editingGroup ? 'Se guardaron los cambios del grupo.' : 'El grupo quedó disponible para clasificar productos.',
            });
            setDialogOpen(false);
            setEditingGroup(null);
            setForm(emptyForm);
        } catch (saveError) {
            toast({
                title: 'Error',
                description: getErrorMessage(saveError, 'No se pudo guardar el grupo'),
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (group: ProductGroup) => {
        if (!confirm(`¿Eliminar el grupo "${group.name}"?`)) return;
        try {
            await deleteGroup(group.id);
            toast({
                title: 'Grupo eliminado',
                description: 'El grupo fue eliminado correctamente.',
            });
        } catch (deleteError) {
            toast({
                title: 'Error',
                description: getErrorMessage(deleteError, 'No se pudo eliminar el grupo'),
                variant: 'destructive',
            });
        }
    };

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate('/mrp/products')}
                            className="h-10 w-10 rounded-xl border-slate-200 hover:bg-slate-100 shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4 text-slate-600" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl shadow-sm">
                                    <FolderTree className="h-6 w-6" />
                                </div>
                                <div>
                                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Grupos de Producto</h1>
                                    <p className="text-slate-500 text-sm mt-1 max-w-2xl">
                                        Define grupos y subgrupos para clasificar el catálogo, filtrar productos y preparar futuras listas de precios.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <Button onClick={openCreate} className="h-11 px-6 bg-fuchsia-600 hover:bg-fuchsia-700 text-white">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Grupo
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                        <p className="text-sm text-slate-500">Total grupos</p>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{loading ? '-' : groups?.length || 0}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                        <p className="text-sm text-slate-500">Principales</p>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{loading ? '-' : topLevelGroups.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                        <p className="text-sm text-slate-500">Subgrupos</p>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{loading ? '-' : childGroups.length}</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">Estructura actual</h2>
                            <p className="text-sm text-slate-500">Usa grupos principales y subgrupos opcionales de segundo nivel.</p>
                        </div>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            Anatomía / Comercial
                        </Badge>
                    </div>

                    <div className="p-5 space-y-4">
                        {loading ? (
                            <div className="py-16 text-center text-slate-500">Cargando grupos...</div>
                        ) : !groups || groups.length === 0 ? (
                            <div className="py-16 text-center space-y-3">
                                <Layers className="h-10 w-10 text-slate-300 mx-auto" />
                                <p className="text-slate-900 font-medium">Aún no hay grupos definidos</p>
                                <p className="text-sm text-slate-500">Crea grupos como Espalda, Tórax, Cuello o Pierna para organizar el catálogo.</p>
                                <Button variant="outline" onClick={openCreate} className="border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-50">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Crear primer grupo
                                </Button>
                            </div>
                        ) : (
                            topLevelGroups.map((group) => {
                                const children = childGroups.filter((child) => child.parentId === group.id);
                                return (
                                    <div key={group.id} className="rounded-2xl border border-slate-200 overflow-hidden">
                                        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-lg font-semibold text-slate-900">{group.name}</h3>
                                                    {!group.active && <Badge variant="outline" className="border-slate-200 text-slate-500 bg-slate-50">Inactivo</Badge>}
                                                    <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50">
                                                        Orden {group.sortOrder}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                                                    <span className="font-mono">{group.slug}</span>
                                                    {group.description && <span>{group.description}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(group)} className="text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(group)} className="text-slate-500 hover:text-red-700 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {children.length > 0 && (
                                            <div className="border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5 grid gap-3">
                                                {children.map((child) => (
                                                    <div key={child.id} className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="font-medium text-slate-900">{child.name}</p>
                                                                {!child.active && <Badge variant="outline" className="border-slate-200 text-slate-500 bg-slate-50">Inactivo</Badge>}
                                                            </div>
                                                            <p className="text-xs text-slate-500 mt-1">
                                                                {child.slug}{child.description ? ` · ${child.description}` : ''}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button variant="ghost" size="icon" onClick={() => openEdit(child)} className="text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(child)} className="text-slate-500 hover:text-red-700 hover:bg-red-50">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingGroup ? 'Editar grupo' : 'Nuevo grupo de producto'}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="group-name">Nombre</Label>
                            <Input
                                id="group-name"
                                value={form.name}
                                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="Ej. Espalda"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="group-slug">Slug opcional</Label>
                            <Input
                                id="group-slug"
                                value={form.slug}
                                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                                placeholder="espalda"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="group-sort">Orden</Label>
                            <Input
                                id="group-sort"
                                type="number"
                                min={0}
                                value={form.sortOrder}
                                onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Grupo padre</Label>
                            <Select
                                value={form.parentId || '__none__'}
                                onValueChange={(value) => setForm((prev) => ({ ...prev, parentId: value === '__none__' ? '' : value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sin grupo padre" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">Sin grupo padre</SelectItem>
                                    {(groups ?? [])
                                        .filter((group) => group.id !== editingGroup?.id && !group.parentId)
                                        .map((group) => (
                                            <SelectItem key={group.id} value={group.id}>
                                                {group.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Estado</Label>
                            <Select
                                value={form.active ? 'active' : 'inactive'}
                                onValueChange={(value) => setForm((prev) => ({ ...prev, active: value === 'active' }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Activo</SelectItem>
                                    <SelectItem value="inactive">Inactivo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="group-description">Descripción</Label>
                            <Textarea
                                id="group-description"
                                value={form.description}
                                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                                placeholder="Uso comercial o anatómico del grupo"
                                className="min-h-[110px]"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving || !form.name.trim()}
                            className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                        >
                            {saving ? 'Guardando...' : editingGroup ? 'Guardar cambios' : 'Crear grupo'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
