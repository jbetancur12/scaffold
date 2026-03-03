import { useMemo, useState } from 'react';
import { Scissors } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    defaultNeedles: number;
    defaultStitchesPerCm: number;
    threads: number;
    notes: string;
};

const MACHINE_CONFIG: Record<MachineKey, MachineConfig> = {
    plana_1: { label: 'Plana (1 Aguja - 301)', ratio: 2.8, defaultNeedles: 1, defaultStitchesPerCm: 4, threads: 2, notes: 'Puntada cerrada estándar.' },
    plana_2: { label: 'Plana (2 Agujas - 301)', ratio: 5.6, defaultNeedles: 2, defaultStitchesPerCm: 4, threads: 4, notes: 'Doble pespunte paralelo.' },
    zigzadora: { label: 'Zigzadora (304)', ratio: 6.5, defaultNeedles: 1, defaultStitchesPerCm: 4, threads: 2, notes: 'Unión de materiales elásticos.' },
    fileteadora_3: { label: 'Fileteadora (3 Hilos - 504)', ratio: 12.5, defaultNeedles: 1, defaultStitchesPerCm: 4, threads: 3, notes: '1 aguja + 2 loopers.' },
    fileteadora_4: { label: 'Fileteadora (4 Hilos - 514)', ratio: 15.5, defaultNeedles: 2, defaultStitchesPerCm: 4, threads: 4, notes: '2 agujas + 2 loopers.' },
    fileteadora_5: { label: 'Fileteadora (5 Hilos - 516)', ratio: 19.5, defaultNeedles: 2, defaultStitchesPerCm: 4, threads: 5, notes: 'Puntada de seguridad.' },
    flatseamer: { label: 'Flatseamer (607)', ratio: 32, defaultNeedles: 4, defaultStitchesPerCm: 4, threads: 6, notes: '4 agujas + looper + recubridor.' },
    reboteadora: { label: 'Reboteadora / Recubridora', ratio: 14, defaultNeedles: 2, defaultStitchesPerCm: 4, threads: 3, notes: 'Ribeteado/recubrimiento.' },
};

export default function ThreadCalculatorPage() {
    const [machine, setMachine] = useState<MachineKey>('plana_1');
    const [sewnCentimeters, setSewnCentimeters] = useState(0);
    const [wastePercent, setWastePercent] = useState(8);
    const [coneLengthMeters, setConeLengthMeters] = useState(5000);
    const [allowEditFactor, setAllowEditFactor] = useState(false);
    const [customRatio, setCustomRatio] = useState<number | null>(null);
    const [customNeedles, setCustomNeedles] = useState<number | null>(null);
    const [customStitchesPerCm, setCustomStitchesPerCm] = useState<number | null>(null);

    const totals = useMemo(() => {
        const config = MACHINE_CONFIG[machine];
        const needles = allowEditFactor ? Number(customNeedles ?? config.defaultNeedles) : config.defaultNeedles;
        const stitchesPerCm = allowEditFactor ? Number(customStitchesPerCm ?? config.defaultStitchesPerCm) : config.defaultStitchesPerCm;
        const manualRatio = allowEditFactor && customRatio !== null ? Number(customRatio || 0) : null;
        const autoRatio = config.ratio
            * (needles / config.defaultNeedles)
            * (stitchesPerCm / config.defaultStitchesPerCm);
        const ratio = manualRatio ?? autoRatio;
        const perUnitMeters = (Number(sewnCentimeters || 0) * ratio) / 100;
        const perUnitWithWaste = perUnitMeters * (1 + (Number(wastePercent || 0) / 100));
        const perDozen = perUnitWithWaste * 12;
        const conesPerUnit = coneLengthMeters > 0 ? (perUnitWithWaste / coneLengthMeters) : 0;
        const conesPerDozen = coneLengthMeters > 0 ? (perDozen / coneLengthMeters) : 0;

        return {
            needles,
            stitchesPerCm,
            ratio,
            perUnitMeters,
            perUnitWithWaste,
            perDozen,
            conesPerUnit,
            conesPerDozen,
        };
    }, [allowEditFactor, coneLengthMeters, customNeedles, customRatio, customStitchesPerCm, machine, sewnCentimeters, wastePercent]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                    <Scissors className="h-7 w-7" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Calculadora Básica de Hilo</h1>
                    <p className="text-sm text-slate-500">Selecciona una máquina, ingresa cm cosidos y obtén consumo estimado por unidad.</p>
                </div>
            </div>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle>Entrada del Cálculo</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <Label>Máquina</Label>
                        <select
                            className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm bg-white"
                            value={machine}
                            onChange={(e) => {
                                const selected = e.target.value as MachineKey;
                                setMachine(selected);
                                setCustomRatio(null);
                                setCustomNeedles(null);
                                setCustomStitchesPerCm(null);
                            }}
                        >
                            <option value="plana_1">Plana (1 Aguja - 301)</option>
                            <option value="plana_2">Plana (2 Agujas - 301)</option>
                            <option value="zigzadora">Zigzadora</option>
                            <option value="fileteadora_3">Fileteadora (3 Hilos - 504)</option>
                            <option value="fileteadora_4">Fileteadora (4 Hilos - 514)</option>
                            <option value="fileteadora_5">Fileteadora (5 Hilos - 516)</option>
                            <option value="flatseamer">Flatseamer (607)</option>
                            <option value="reboteadora">Reboteadora / Recubridora</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Centímetros cosidos por unidad</Label>
                        <Input
                            type="number"
                            min={0}
                            value={sewnCentimeters}
                            onChange={(e) => setSewnCentimeters(Number(e.target.value))}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Desperdicio (%)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={wastePercent}
                            onChange={(e) => setWastePercent(Number(e.target.value))}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Metros por cono</Label>
                        <Input
                            type="number"
                            min={1}
                            value={coneLengthMeters}
                            onChange={(e) => setConeLengthMeters(Number(e.target.value))}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle>Parámetros de la Máquina Seleccionada</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label>Agujas (referencial)</Label>
                            <Input
                                type="number"
                                min={1}
                                value={allowEditFactor ? (customNeedles ?? MACHINE_CONFIG[machine].defaultNeedles) : MACHINE_CONFIG[machine].defaultNeedles}
                                onChange={(e) => setCustomNeedles(Number(e.target.value))}
                                disabled={!allowEditFactor}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Hilos (referencial)</Label>
                            <Input value={MACHINE_CONFIG[machine].threads} disabled />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Puntadas/cm (referencial)</Label>
                            <Input
                                type="number"
                                min={1}
                                value={allowEditFactor ? (customStitchesPerCm ?? MACHINE_CONFIG[machine].defaultStitchesPerCm) : MACHINE_CONFIG[machine].defaultStitchesPerCm}
                                onChange={(e) => setCustomStitchesPerCm(Number(e.target.value))}
                                disabled={!allowEditFactor}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Factor de hilo (cm/cm)</Label>
                            <Input
                                type="number"
                                min={0.1}
                                step={0.1}
                                value={allowEditFactor ? (customRatio ?? totals.ratio) : totals.ratio}
                                onChange={(e) => setCustomRatio(Number(e.target.value))}
                                disabled={!allowEditFactor}
                            />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={allowEditFactor}
                            onChange={(e) => {
                                setAllowEditFactor(e.target.checked);
                                if (!e.target.checked) {
                                    setCustomRatio(null);
                                    setCustomNeedles(null);
                                    setCustomStitchesPerCm(null);
                                }
                            }}
                        />
                        Permitir editar parámetros (agujas, puntadas/cm y factor manual)
                    </label>
                    <p className="text-xs text-slate-500">{MACHINE_CONFIG[machine].notes}</p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card><CardHeader><CardTitle className="text-sm">Factor usado</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-slate-900">{totals.ratio.toFixed(2)}</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">m por unidad (base)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-slate-900">{totals.perUnitMeters.toFixed(3)}</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">m por unidad (con desperdicio)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-700">{totals.perUnitWithWaste.toFixed(3)}</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">conos por docena</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-slate-900">{totals.conesPerDozen.toFixed(4)}</p></CardContent></Card>
            </div>

            <p className="text-xs text-slate-500">
                Recomendación: dejar los parámetros bloqueados por defecto y habilitar edición solo para calibrar con datos reales de taller.
            </p>
        </div>
    );
}
