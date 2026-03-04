import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Save, Scissors, Trash2, Check, ChevronsUpDown, Loader2, Calculator, Shirt, BarChart3, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { mrpApi, ProductThreadProcessRow, ProductThreadProcessesResult } from '@/services/mrpApi';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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

    // Combobox state
    const [openProductCombobox, setOpenProductCombobox] = useState(false);
    const [productSearch, setProductSearch] = useState('');
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
        if (selectedProductId) {
            loadProcesses(selectedProductId);
            resetForm();
        } else {
            setResult(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProductId]);

    const selectedProduct = useMemo(() => {
        return products.find((item) => item.id === selectedProductId);
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
        const nextOrder = result?.processes ? result.processes.length * 10 : 0;
        setForm({ ...createDefaultForm(), sortOrder: nextOrder });
        setEditingId(null);
    };

    const handleSave = async () => {
        if (!selectedProductId) return;

        if (form.sewnCentimeters <= 0) {
            toast({ title: 'Error', description: 'Los cm cosidos deben ser mayores a cero', variant: 'destructive' });
            return;
        }

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
                toast({ title: 'Actualizado', description: 'Proceso de costura guardado existosamente.' });
            } else {
                await mrpApi.createProductThreadProcess(payload);
                toast({ title: 'Agregado', description: 'Proceso de costura agregado al producto.' });
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

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar de forma permanente este proceso de hilo?')) return;
        try {
            await mrpApi.deleteProductThreadProcess(id);
            if (editingId === id) resetForm();
            if (selectedProductId) await loadProcesses(selectedProductId);
            toast({ title: 'Eliminado', description: 'Proceso de costura descartado.' });
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo eliminar el proceso'), variant: 'destructive' });
        }
    };

    if (loadingProducts) {
        return (
            <div className="p-6 flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                        <Calculator className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Consumo de Hilo por Producto</h1>
                        <p className="text-sm text-slate-500">Calculadora técnica de costuras y consumos lineales</p>
                    </div>
                </div>

                <div className="w-full md:w-96">
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Producto a calcular</Label>
                    <Popover open={openProductCombobox} onOpenChange={setOpenProductCombobox}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openProductCombobox}
                                className={cn("w-full justify-between h-11 bg-white border-slate-300 font-medium text-slate-700", !selectedProductId && "text-slate-400")}
                            >
                                <span className="truncate flex items-center gap-2">
                                    <Shirt className="h-4 w-4 shrink-0 opacity-50" />
                                    {selectedProduct ? `${selectedProduct.sku} - ${selectedProduct.name}` : "Selecciona un producto..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[380px] p-0" align="end">
                            <Command>
                                <CommandInput
                                    placeholder="Buscar por SKU o nombre..."
                                    value={productSearch}
                                    onValueChange={setProductSearch}
                                />
                                <CommandList>
                                    <CommandEmpty className="p-3 text-sm text-center text-slate-500">No se encontró el producto.</CommandEmpty>
                                    <CommandGroup>
                                        {products.filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase())).map((product) => (
                                            <CommandItem
                                                key={product.id}
                                                value={product.name}
                                                onSelect={() => {
                                                    setSelectedProductId(product.id);
                                                    setOpenProductCombobox(false);
                                                }}
                                                className="cursor-pointer py-2 px-3"
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4 text-indigo-600",
                                                        selectedProductId === product.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900">{product.sku}</span>
                                                    <span className="text-xs text-slate-500">{product.name}</span>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {selectedProductId ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Left Column: Form */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-6">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                    {editingId ? <Pencil className="h-4 w-4 text-indigo-600" /> : <Plus className="h-4 w-4 text-indigo-600" />}
                                    <h2 className="text-lg font-semibold text-slate-800">{editingId ? 'Editar Proceso' : 'Añadir Proceso'}</h2>
                                </div>
                                {editingId && (
                                    <Button variant="ghost" size="sm" onClick={resetForm} className="h-7 text-xs text-slate-500 mt-0.5">Cancelar</Button>
                                )}
                            </div>

                            <div className="p-6 space-y-5">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Nombre Operación</Label>
                                        <Input
                                            value={form.processName}
                                            onChange={(e) => setForm((p) => ({ ...p, processName: e.target.value }))}
                                            placeholder="Ej: Ensamblar lateral derecho"
                                            className="h-10 border-slate-300 bg-white placeholder:text-slate-400 font-medium"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Máquina</Label>
                                            <select
                                                className="w-full h-10 border border-slate-300 rounded-md px-3 text-sm bg-white font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                value={form.machineKey}
                                                onChange={(e) => onMachineChange(e.target.value as MachineKey)}
                                            >
                                                {Object.entries(MACHINE_CONFIG).map(([key, cfg]) => (
                                                    <option key={key} value={key}>{cfg.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">CM Cosidos *</Label>
                                            <Input type="number" min={0} value={form.sewnCentimeters || ''} onChange={(e) => setForm((p) => ({ ...p, sewnCentimeters: Number(e.target.value) }))} className="h-10 border-indigo-200 bg-indigo-50/30" placeholder="0" />
                                        </div>
                                    </div>
                                </div>

                                {/* Engineering Specs */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                                    <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><Scissors className="h-3.5 w-3.5 text-slate-400" /> Especificaciones Técnicas</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-[10px] uppercase text-slate-500">Agujas</Label>
                                            <Input type="number" min={1} value={form.needles} onChange={(e) => setForm((p) => ({ ...p, needles: Number(e.target.value) }))} className="h-8 text-sm mt-1" />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] uppercase text-slate-500">Puntadas/cm</Label>
                                            <Input type="number" min={1} value={form.stitchesPerCm} onChange={(e) => setForm((p) => ({ ...p, stitchesPerCm: Number(e.target.value) }))} className="h-8 text-sm mt-1" />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] uppercase text-slate-500">Factor / Ratio</Label>
                                            <Input type="number" min={0.1} step={0.1} value={form.ratio} onChange={(e) => setForm((p) => ({ ...p, ratio: Number(e.target.value) }))} className="h-8 text-sm mt-1" />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] uppercase text-slate-500">Merma (%)</Label>
                                            <Input type="number" min={0} value={form.wastePercent} onChange={(e) => setForm((p) => ({ ...p, wastePercent: Number(e.target.value) }))} className="h-8 text-sm mt-1" />
                                        </div>
                                    </div>
                                </div>

                                <Button onClick={handleSave} disabled={saving} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 shadow-sm mt-2">
                                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : (editingId ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />)}
                                    {editingId ? 'Guardar Cambios' : 'Añadir Proceso a Producto'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: List & Totals */}
                    <div className="lg:col-span-7 flex flex-col gap-6">

                        {/* Totals Banner */}
                        <div className="bg-slate-900 rounded-xl p-6 shadow-md text-white flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
                            <div className="absolute opacity-5 -right-6 -bottom-6 pointer-events-none">
                                <Calculator className="w-48 h-48" />
                            </div>

                            <div className="flex-1 relative z-10">
                                <h3 className="text-slate-400 text-sm font-medium mb-1">Consumo Total Estimado</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white tracking-tight">
                                        {(result?.totals.totalMetersPerUnit ?? 0).toFixed(2)}
                                    </span>
                                    <span className="text-slate-400 font-medium">Metros / Unidad</span>
                                </div>
                            </div>

                            <div className="flex gap-4 sm:gap-8 w-full sm:w-auto relative z-10 bg-slate-800/50 p-4 rounded-lg">
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Base Teórica</p>
                                    <p className="text-xl font-bold text-slate-200">{(result?.totals.baseMetersPerUnit ?? 0).toFixed(2)}m</p>
                                </div>
                                <div className="w-px bg-slate-700"></div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Procesos</p>
                                    <p className="text-xl font-bold text-slate-200">{result?.processes.length ?? 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Processes List */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                                <h3 className="text-base font-semibold text-slate-800">Operaciones Guardadas</h3>
                            </div>

                            <div className="p-0">
                                {loadingProcesses && (
                                    <div className="py-12 flex justify-center text-slate-400">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                )}

                                {!loadingProcesses && (!result || result.processes.length === 0) && (
                                    <div className="py-16 px-6 text-center flex flex-col items-center">
                                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                                            <BarChart3 className="h-8 w-8" />
                                        </div>
                                        <p className="text-slate-600 font-medium text-lg">No hay procesos registrados</p>
                                        <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">Utiliza el formulario de la izquierda para agregar la primera operación de costura de este producto.</p>
                                    </div>
                                )}

                                {!loadingProcesses && result && result.processes.length > 0 && (
                                    <div className="divide-y divide-slate-100">
                                        {result.processes.map((row) => (
                                            <div key={row.id} className="p-4 sm:px-6 hover:bg-slate-50/80 transition-colors group">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1.5 mt-1 sm:mt-0">
                                                            <h4 className="font-semibold text-slate-900 truncate">
                                                                {row.processName || MACHINE_CONFIG[row.machineKey as MachineKey]?.label || row.machineKey}
                                                            </h4>
                                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 shrink-0 border-0">
                                                                {MACHINE_CONFIG[row.machineKey as MachineKey]?.label.split('(')[0].trim() || row.machineKey}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[13px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                                                            <span className="flex items-center gap-1"><span className="font-medium text-slate-700">{row.sewnCentimeters}</span> cm cosidos</span>
                                                            <span className="text-slate-300">•</span>
                                                            <span>FR: {row.ratio}</span>
                                                            <span className="text-slate-300">•</span>
                                                            <span>Merma: {row.wastePercent}%</span>
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center sm:flex-col sm:items-end sm:justify-center justify-between gap-4 sm:gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-6">
                                                        <div className="text-right">
                                                            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-semibold mb-0.5 mt-1 sm:mt-0">Consumo</span>
                                                            <p className="text-lg font-bold text-indigo-700 leading-none">{row.totalMetersPerUnit.toFixed(2)}<span className="text-sm font-medium text-indigo-400 ml-1">m</span></p>
                                                        </div>

                                                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => handleEdit(row)} title="Editar">
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(row.id)} title="Eliminar">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            ) : (
                <div className="mt-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 flex flex-col items-center justify-center text-center">
                    <AlertCircle className="h-10 w-10 text-slate-300 mb-4" />
                    <h2 className="text-lg font-semibold text-slate-700 mb-2">Ningún Producto Seleccionado</h2>
                    <p className="text-slate-500 max-w-sm">Busca y selecciona un producto en el menú superior para calcular y guardar el consumo de hilos para sus procesos de producción.</p>
                </div>
            )}
        </div>
    );
}
