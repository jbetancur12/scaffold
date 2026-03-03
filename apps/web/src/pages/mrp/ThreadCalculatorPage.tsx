import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Save, Scissors, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { mrpApi, ProductThreadProcessRow, ProductThreadProcessesResult } from '@/services/mrpApi';

type MachineKey =
    | 'plana_1'
    | 'plana_2'
    | 'zigzadora'
    | 'fileteadora_3'
    | 'fileteadora_4'
    | 'fileteadora_5'
    | 'flatseamer'
    | 'reboteadora';

type MachineConfig = {
    label: string;
    ratio: number;
    needles: number;
    stitchesPerCm: number;
};

const MACHINE_CONFIG: Record<MachineKey, MachineConfig> = {
    plana_1: { label: 'Plana (1 Aguja - 301)', ratio: 2.8, needles: 1, stitchesPerCm: 4 },
    plana_2: { label: 'Plana (2 Agujas - 301)', ratio: 5.6, needles: 2, stitchesPerCm: 4 },
    zigzadora: { label: 'Zigzadora (304)', ratio: 6.5, needles: 1, stitchesPerCm: 4 },
    fileteadora_3: { label: 'Fileteadora (3 Hilos - 504)', ratio: 12.5, needles: 1, stitchesPerCm: 4 },
    fileteadora_4: { label: 'Fileteadora (4 Hilos - 514)', ratio: 15.5, needles: 2, stitchesPerCm: 4 },
    fileteadora_5: { label: 'Fileteadora (5 Hilos - 516)', ratio: 19.5, needles: 2, stitchesPerCm: 4 },
    flatseamer: { label: 'Flatseamer (607)', ratio: 32, needles: 4, stitchesPerCm: 4 },
    reboteadora: { label: 'Reboteadora / Recubridora', ratio: 14, needles: 2, stitchesPerCm: 4 },
};

type ProcessForm = {
    processName: string;
    machineKey: MachineKey;
    sewnCentimeters: number;
    wastePercent: number;
    needles: number;
    stitchesPerCm: number;
    ratio: number;
    sortOrder: number;
};

const createDefaultForm = (): ProcessForm => ({
    processName: '',
    machineKey: 'fileteadora_3',
    sewnCentimeters: 0,
    wastePercent: 8,
    needles: MACHINE_CONFIG.fileteadora_3.needles,
    stitchesPerCm: MACHINE_CONFIG.fileteadora_3.stitchesPerCm,
    ratio: MACHINE_CONFIG.fileteadora_3.ratio,
    sortOrder: 0,
});

export default function ThreadCalculatorPage() {
    const { toast } = useToast();
    const [products, setProducts] = useState<Array<{ id: string; name: string; sku: string }>>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [result, setResult] = useState<ProductThreadProcessesResult | null>(null);
    const [loadingProcesses, setLoadingProcesses] = useState(false);
    const [form, setForm] = useState<ProcessForm>(createDefaultForm());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const run = async () => {
            try {
                setLoadingProducts(true);
                const data = await mrpApi.getProducts(1, 300, '');
                const rows = data.products.map((row) => ({ id: row.id, name: row.name, sku: row.sku }));
                setProducts(rows);
                if (rows.length > 0) setSelectedProductId((prev) => prev || rows[0].id);
            } catch (error) {
                toast({ title: 'Error', description: getErrorMessage(error, 'No se pudieron cargar los productos'), variant: 'destructive' });
            } finally {
                setLoadingProducts(false);
            }
        };
        run();
    }, [toast]);

    const loadProcesses = async (productId: string) => {
        try {
            setLoadingProcesses(true);
            const data = await mrpApi.listProductThreadProcesses(productId);
            setResult(data);
        } catch (error) {
            setResult(null);
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudieron cargar los procesos'), variant: 'destructive' });
        } finally {
            setLoadingProcesses(false);
        }
    };

    useEffect(() => {
        if (selectedProductId) loadProcesses(selectedProductId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProductId]);

    const selectedProductLabel = useMemo(() => {
        const row = products.find((item) => item.id === selectedProductId);
        return row ? `${row.name} (${row.sku})` : '';
    }, [products, selectedProductId]);

    const onMachineChange = (machineKey: MachineKey) => {
        const cfg = MACHINE_CONFIG[machineKey];
        setForm((prev) => ({
            ...prev,
            machineKey,
            needles: cfg.needles,
            stitchesPerCm: cfg.stitchesPerCm,
            ratio: cfg.ratio,
        }));
    };

    const resetForm = () => {
        setForm(createDefaultForm());
        setEditingId(null);
    };

    const handleSave = async () => {
        if (!selectedProductId) return;
        try {
            setSaving(true);
            const payload = {
                productId: selectedProductId,
                processName: form.processName || undefined,
                machineKey: form.machineKey,
                sewnCentimeters: Number(form.sewnCentimeters),
                wastePercent: Number(form.wastePercent),
                needles: Number(form.needles),
                stitchesPerCm: Number(form.stitchesPerCm),
                ratio: Number(form.ratio),
                sortOrder: Number(form.sortOrder),
            };

            if (editingId) {
                await mrpApi.updateProductThreadProcess(editingId, {
                    processName: payload.processName,
                    machineKey: payload.machineKey,
                    sewnCentimeters: payload.sewnCentimeters,
                    wastePercent: payload.wastePercent,
                    needles: payload.needles,
                    stitchesPerCm: payload.stitchesPerCm,
                    ratio: payload.ratio,
                    sortOrder: payload.sortOrder,
                });
                toast({ title: 'Actualizado', description: 'Proceso actualizado' });
            } else {
                await mrpApi.createProductThreadProcess(payload);
                toast({ title: 'Creado', description: 'Proceso agregado al producto' });
            }
            resetForm();
            await loadProcesses(selectedProductId);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo guardar el proceso'), variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (row: ProductThreadProcessRow) => {
        setEditingId(row.id);
        setForm({
            processName: row.processName || '',
            machineKey: row.machineKey as MachineKey,
            sewnCentimeters: row.sewnCentimeters,
            wastePercent: row.wastePercent,
            needles: row.needles,
            stitchesPerCm: row.stitchesPerCm,
            ratio: row.ratio,
            sortOrder: row.sortOrder,
        });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar este proceso de hilo?')) return;
        try {
            await mrpApi.deleteProductThreadProcess(id);
            if (editingId === id) resetForm();
            if (selectedProductId) await loadProcesses(selectedProductId);
            toast({ title: 'Eliminado', description: 'Proceso eliminado' });
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo eliminar el proceso'), variant: 'destructive' });
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                    <Scissors className="h-7 w-7" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Consumo de Hilo por Producto</h1>
                    <p className="text-sm text-slate-500">Configura procesos por producto (sin variantes), con persistencia y total automático.</p>
                </div>
            </div>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle>Producto</CardTitle>
                </CardHeader>
                <CardContent>
                    <select
                        className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white"
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        disabled={loadingProducts}
                    >
                        {products.map((row) => (
                            <option key={row.id} value={row.id}>{row.name} ({row.sku})</option>
                        ))}
                    </select>
                </CardContent>
            </Card>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle>{editingId ? 'Editar Proceso' : 'Nuevo Proceso'}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5 md:col-span-3">
                        <Label>Nombre del proceso</Label>
                        <Input value={form.processName} onChange={(e) => setForm((p) => ({ ...p, processName: e.target.value }))} placeholder="Ej: Costura lateral cabestrillo" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Máquina</Label>
                        <select className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white" value={form.machineKey} onChange={(e) => onMachineChange(e.target.value as MachineKey)}>
                            {Object.entries(MACHINE_CONFIG).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>cm cosidos por unidad</Label>
                        <Input type="number" min={0} value={form.sewnCentimeters} onChange={(e) => setForm((p) => ({ ...p, sewnCentimeters: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Desperdicio (%)</Label>
                        <Input type="number" min={0} value={form.wastePercent} onChange={(e) => setForm((p) => ({ ...p, wastePercent: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Agujas</Label>
                        <Input type="number" min={1} value={form.needles} onChange={(e) => setForm((p) => ({ ...p, needles: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Puntadas/cm</Label>
                        <Input type="number" min={1} value={form.stitchesPerCm} onChange={(e) => setForm((p) => ({ ...p, stitchesPerCm: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Factor (cm/cm)</Label>
                        <Input type="number" min={0.1} step={0.1} value={form.ratio} onChange={(e) => setForm((p) => ({ ...p, ratio: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Orden</Label>
                        <Input type="number" min={0} value={form.sortOrder} onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))} />
                    </div>
                    <div className="md:col-span-3 flex gap-2">
                        <Button onClick={handleSave} disabled={!selectedProductId || saving}>
                            {editingId ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            {editingId ? 'Guardar cambios' : 'Agregar proceso'}
                        </Button>
                        {editingId && (
                            <Button variant="outline" onClick={resetForm}>Cancelar edición</Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle>Procesos guardados {selectedProductLabel ? `- ${selectedProductLabel}` : ''}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {loadingProcesses && <p className="text-sm text-slate-500">Cargando procesos...</p>}
                    {!loadingProcesses && (!result || result.processes.length === 0) && (
                        <p className="text-sm text-slate-500">No hay procesos guardados para este producto.</p>
                    )}
                    {result?.processes.map((row) => (
                        <div key={row.id} className="rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                            <div>
                                <p className="font-semibold text-slate-900">{row.processName || MACHINE_CONFIG[row.machineKey as MachineKey]?.label || row.machineKey}</p>
                                <p className="text-xs text-slate-500">
                                    {row.sewnCentimeters} cm | factor {row.ratio} | merma {row.wastePercent}% | {row.totalMetersPerUnit} m/u
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleEdit(row)}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(row.id)}><Trash2 className="h-4 w-4 mr-1" />Eliminar</Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card><CardHeader><CardTitle className="text-sm">Base total (m/u)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-slate-900">{(result?.totals.baseMetersPerUnit ?? 0).toFixed(3)}</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Total con merma (m/u)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-700">{(result?.totals.totalMetersPerUnit ?? 0).toFixed(3)}</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Procesos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-slate-900">{result?.processes.length ?? 0}</p></CardContent></Card>
            </div>
        </div>
    );
}
