import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Calculator } from 'lucide-react';

interface FabricationCalculatorProps {
    onCalculate: (quantity: number) => void;
}

export default function FabricationCalculator({ onCalculate }: FabricationCalculatorProps) {
    const [open, setOpen] = useState(false);
    const [rollWidth, setRollWidth] = useState<number>(150); // cm
    const [pieceWidth, setPieceWidth] = useState<number>(0); // cm
    const [pieceLength, setPieceLength] = useState<number>(0); // cm

    const [bestOption, setBestOption] = useState<'normal' | 'rotated' | null>(null);
    const [normalResult, setNormalResult] = useState<{
        piecesPerWidth: number;
        rowsPerMeter: number;
        totalPiecesPerMeter: number;
        consumptionPerUnit: number;
    } | null>(null);
    const [rotatedResult, setRotatedResult] = useState<{
        piecesPerWidth: number;
        rowsPerMeter: number;
        totalPiecesPerMeter: number;
        consumptionPerUnit: number;
    } | null>(null);

    const calculate = (rWidth: number, pWidth: number, pLength: number) => {
        if (rWidth <= 0 || pWidth <= 0 || pLength <= 0) return null;

        const piecesPerWidth = Math.floor(rWidth / pWidth);
        const rowsPerMeter = Math.floor(100 / pLength);
        const totalPiecesPerMeter = piecesPerWidth * rowsPerMeter;

        if (totalPiecesPerMeter <= 0) return null;

        return {
            piecesPerWidth,
            rowsPerMeter,
            totalPiecesPerMeter,
            consumptionPerUnit: 1 / totalPiecesPerMeter
        };
    };

    useEffect(() => {
        const normal = calculate(rollWidth, pieceWidth, pieceLength);
        const rotated = calculate(rollWidth, pieceLength, pieceWidth);

        setNormalResult(normal);
        setRotatedResult(rotated);

        if (normal && rotated) {
            if (rotated.totalPiecesPerMeter > normal.totalPiecesPerMeter) {
                setBestOption('rotated');
            } else {
                setBestOption('normal');
            }
        } else if (normal) {
            setBestOption('normal');
        } else if (rotated) {
            setBestOption('rotated');
        } else {
            setBestOption(null);
        }

    }, [rollWidth, pieceWidth, pieceLength]);

    const handleApply = () => {
        const target = bestOption === 'rotated' ? rotatedResult : normalResult;
        if (target) {
            onCalculate(Number(target.consumptionPerUnit.toFixed(4)));
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9" title="Calculadora de Trazada">
                    <Calculator className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Calculadora de Trazada (Textil)</DialogTitle>
                    <DialogDescription>
                        Compara la eficiencia rotando la pieza para encontrar el menor consumo.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="rollWidth" className="text-right col-span-2">
                            Ancho del Rollo (cm)
                        </Label>
                        <Input
                            id="rollWidth"
                            type="number"
                            value={rollWidth}
                            onChange={(e) => setRollWidth(Number(e.target.value))}
                            className="col-span-2"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="pieceWidth" className="text-right col-span-2">
                            Ancho de la Pieza (cm)
                        </Label>
                        <Input
                            id="pieceWidth"
                            type="number"
                            value={pieceWidth}
                            onChange={(e) => setPieceWidth(Number(e.target.value))}
                            className="col-span-2"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="pieceLength" className="text-right col-span-2">
                            Largo de la Pieza (cm)
                        </Label>
                        <Input
                            id="pieceLength"
                            type="number"
                            value={pieceLength}
                            onChange={(e) => setPieceLength(Number(e.target.value))}
                            className="col-span-2"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                        {/* Normal Option */}
                        <div
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${bestOption === 'normal'
                                    ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500'
                                    : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
                                }`}
                            onClick={() => setBestOption('normal')}
                        >
                            <div className="font-semibold text-sm mb-2 text-center">Posición Normal</div>
                            {normalResult ? (
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span>A lo ancho:</span>
                                        <strong>{normalResult.piecesPerWidth}</strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Filas/metro:</span>
                                        <strong>{normalResult.rowsPerMeter}</strong>
                                    </div>
                                    <div className="flex justify-between border-t pt-1 mt-1">
                                        <span>Total/m:</span>
                                        <strong>{normalResult.totalPiecesPerMeter}</strong>
                                    </div>
                                    <div className="text-center font-bold text-lg text-slate-700 mt-2">
                                        {normalResult.consumptionPerUnit.toFixed(4)} m
                                    </div>
                                </div>
                            ) : <div className="text-center text-xs text-slate-400">-</div>}
                        </div>

                        {/* Rotated Option */}
                        <div
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${bestOption === 'rotated'
                                    ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500'
                                    : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
                                }`}
                            onClick={() => setBestOption('rotated')}
                        >
                            <div className="font-semibold text-sm mb-2 text-center">Posición Rotada (90°)</div>
                            {rotatedResult ? (
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span>A lo ancho:</span>
                                        <strong>{rotatedResult.piecesPerWidth}</strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Filas/metro:</span>
                                        <strong>{rotatedResult.rowsPerMeter}</strong>
                                    </div>
                                    <div className="flex justify-between border-t pt-1 mt-1">
                                        <span>Total/m:</span>
                                        <strong>{rotatedResult.totalPiecesPerMeter}</strong>
                                    </div>
                                    <div className="text-center font-bold text-lg text-slate-700 mt-2">
                                        {rotatedResult.consumptionPerUnit.toFixed(4)} m
                                    </div>
                                </div>
                            ) : <div className="text-center text-xs text-slate-400">-</div>}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" onClick={handleApply} disabled={!bestOption}>
                        Aplicar {bestOption === 'rotated' ? 'Rotada' : 'Normal'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
