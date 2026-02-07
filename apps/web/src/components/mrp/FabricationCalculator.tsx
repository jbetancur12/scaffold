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
import FabricationLayoutPreview from './FabricationLayoutPreview';

interface FabricationParams {
    calculationType?: 'area' | 'linear';
    quantityPerUnit?: number;
    rollWidth: number;
    pieceWidth: number;
    pieceLength: number;
    orientation: 'normal' | 'rotated';
}

interface FabricationCalculatorProps {
    onCalculate: (quantity: number, params: FabricationParams) => void;
}

export default function FabricationCalculator({ onCalculate }: FabricationCalculatorProps) {
    const [open, setOpen] = useState(false);
    const [calcType, setCalcType] = useState<'area' | 'linear'>('area');

    // Inputs
    const [quantityPerUnit, setQuantityPerUnit] = useState<number>(1); // Pieces per unit of product
    const [rollWidth, setRollWidth] = useState<number>(150); // cm (Roll Width OR Material Length)
    const [pieceWidth, setPieceWidth] = useState<number>(0); // cm
    const [pieceLength, setPieceLength] = useState<number>(0); // cm (Piece Length OR Cut Length)

    // Area Results
    const [bestOption, setBestOption] = useState<'normal' | 'rotated' | null>(null);
    const [normalResult, setNormalResult] = useState<{
        piecesPerWidth: number;
        rowsPerMeter: number;
        totalPiecesPerMeter: number;
        consumptionPerUnit: number;
        efficiency: number;
        unitAnalysis: {
            wasteWidthPerRow: number;
            distributedWasteX: number;
            effectiveWidth: number;
            standardConsumptionPerPiece: number;
        };
    } | null>(null);
    const [rotatedResult, setRotatedResult] = useState<{
        piecesPerWidth: number;
        rowsPerMeter: number;
        totalPiecesPerMeter: number;
        consumptionPerUnit: number;
        efficiency: number;
        unitAnalysis: {
            wasteWidthPerRow: number;
            distributedWasteX: number;
            effectiveWidth: number;
            standardConsumptionPerPiece: number;
        };
    } | null>(null);

    // Linear Results
    const [linearResult, setLinearResult] = useState<{
        pieces: number;
        waste: number;
        consumption: number;
    } | null>(null);

    const calculateArea = (rWidth: number, pWidth: number, pLength: number, qty: number) => {
        if (rWidth <= 0 || pWidth <= 0 || pLength <= 0) return null;

        const piecesPerWidth = Math.floor(rWidth / pWidth); // Pieces per row
        if (piecesPerWidth <= 0) return null;

        const totalRows = Math.ceil(qty / piecesPerWidth); // Total rows needed
        const totalConsumption = (totalRows * pLength) / 100; // cm -> meters

        // For density visualization (preview)
        const rowsPerMeter = Math.floor(100 / pLength);
        const totalPiecesPerMeter = piecesPerWidth * rowsPerMeter;

        // Legacy Efficiency calculation (Batch Efficiency - penalized by empty slots in last row)
        // const usedArea = qty * pWidth * pLength;
        // const totalArea = (totalConsumption * 100) * rWidth;
        // const efficiency = totalArea > 0 ? (usedArea / totalArea) * 100 : 0;

        // New Efficiency Calculation (Layout/Width Efficiency)
        // This reflects how well the pieces fit across the roll width, regardless of batch quantity (vertical rows).
        // This aligns with "Standard Cost" logic where remnants are considered usable inventory, not waste.
        const usedWidthPerRow = piecesPerWidth * pWidth;
        const efficiency = rWidth > 0 ? (usedWidthPerRow / rWidth) * 100 : 0;


        // Unit Analysis (Standard/Theoretical)
        // User logic: Distributed Waste = (RollWidth - (PiecesPerRow * PieceWidth)) / PiecesPerRow
        // Effective Width = PieceWidth + DistributedWaste
        // This is mathematically equivalent to RollWidth / PiecesPerRow

        const wasteWidthPerRow = rWidth - (piecesPerWidth * pWidth);
        const distributedWasteX = Number((wasteWidthPerRow / piecesPerWidth).toFixed(2));
        const effectiveWidth = pWidth + distributedWasteX;

        // Standard Consumption per Piece (assuming full rows)
        // Length / PiecesPerRow
        const standardConsumptionPerPiece = pLength / piecesPerWidth / 100;

        return {
            piecesPerWidth,
            rowsPerMeter,
            totalPiecesPerMeter,
            consumptionPerUnit: totalConsumption,
            efficiency,
            unitAnalysis: {
                wasteWidthPerRow,
                distributedWasteX,
                effectiveWidth,
                standardConsumptionPerPiece
            }
        };
    };

    useEffect(() => {
        if (calcType === 'area') {
            const normal = calculateArea(rollWidth, pieceWidth, pieceLength, quantityPerUnit);
            const rotated = calculateArea(rollWidth, pieceLength, pieceWidth, quantityPerUnit);
            setNormalResult(normal);
            setRotatedResult(rotated);

            if (normal && rotated) {
                // Prefer better efficiency, then lower consumption
                if (rotated.consumptionPerUnit < normal.consumptionPerUnit) {
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
        } else {
            // Linear Logic
            // rollWidth = Material Total Length
            // pieceLength = Cut Length
            if (rollWidth > 0 && pieceLength > 0 && pieceLength <= rollWidth) {
                const pieces = Math.floor(rollWidth / pieceLength);
                if (pieces > 0) {
                    setLinearResult({
                        pieces,
                        waste: rollWidth - (pieces * pieceLength),
                        consumption: (rollWidth / 100 / pieces) * quantityPerUnit // Material length in meters / pieces per bar * quantity
                    });
                } else {
                    setLinearResult(null);
                }
            } else {
                setLinearResult(null);
            }
        }
    }, [calcType, rollWidth, pieceWidth, pieceLength, quantityPerUnit]);

    const handleApply = () => {
        if (calcType === 'linear' && linearResult) {
            onCalculate(Number(linearResult.consumption.toFixed(4)), {
                calculationType: 'linear',
                quantityPerUnit,
                rollWidth, // Material Total Length
                pieceWidth: 0,
                pieceLength, // Cut Length
                orientation: 'normal'
            });
            setOpen(false);
        } else if (calcType === 'area') {
            const target = bestOption === 'rotated' ? rotatedResult : normalResult;
            if (target && bestOption) {
                // User requirement: Apply the Standard Unit Consumption * Quantity Per Unit
                // If the product takes 10 pieces, the BOM quantity should be the total for 10 pieces.
                const totalStandardConsumption = target.unitAnalysis.standardConsumptionPerPiece * quantityPerUnit;
                onCalculate(Number(totalStandardConsumption.toFixed(4)), {
                    calculationType: 'area',
                    quantityPerUnit,
                    rollWidth,
                    pieceWidth,
                    pieceLength,
                    orientation: bestOption
                });
                setOpen(false);
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9" title="Calculadora de Trazada">
                    <Calculator className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Calculadora de Material</DialogTitle>
                    <DialogDescription>
                        Calcula consumo para Telas (Área) o Varillas/Perfiles (Lineal).
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2 mb-4 border-b pb-2">
                    <Button
                        variant={calcType === 'area' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setCalcType('area')}
                    >
                        Área / Tela
                    </Button>
                    <Button
                        variant={calcType === 'linear' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setCalcType('linear')}
                    >
                        Lineal / Varilla
                    </Button>
                </div>

                <div className="grid gap-4 py-2">
                    <div className="grid grid-cols-4 items-center gap-4 bg-amber-50 p-2 rounded border border-amber-200">
                        <Label htmlFor="quantityPerUnit" className="text-right col-span-2 font-bold text-amber-800">
                            Piezas por Unidad de Producto
                        </Label>
                        <Input
                            id="quantityPerUnit"
                            type="number"
                            min="1"
                            value={quantityPerUnit}
                            onChange={(e) => setQuantityPerUnit(Math.max(1, Number(e.target.value)))}
                            className="col-span-2 border-amber-300 ring-offset-amber-50 focus-visible:ring-amber-500"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="rollWidth" className="text-right col-span-2">
                            {calcType === 'area' ? 'Ancho del Rollo (cm)' : 'Largo de Barra/Material (cm)'}
                        </Label>
                        <Input
                            id="rollWidth"
                            type="number"
                            value={rollWidth}
                            onChange={(e) => setRollWidth(Number(e.target.value))}
                            className="col-span-2"
                        />
                    </div>

                    {calcType === 'area' && (
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
                    )}

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="pieceLength" className="text-right col-span-2">
                            {calcType === 'area' ? 'Largo de la Pieza (cm)' : 'Largo de Corte (cm)'}
                        </Label>
                        <Input
                            id="pieceLength"
                            type="number"
                            value={pieceLength}
                            onChange={(e) => setPieceLength(Number(e.target.value))}
                            className="col-span-2"
                        />
                    </div>

                    {calcType === 'area' ? (
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${bestOption === 'normal'
                                    ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500'
                                    : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
                                    }`}
                                onClick={() => setBestOption('normal')}
                            >
                                <div className="font-semibold text-sm mb-2 text-center flex justify-between items-center">
                                    <span>Posición Normal</span>
                                    {normalResult && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${normalResult.efficiency === 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {normalResult.efficiency.toFixed(0)}% Efic.
                                        </span>
                                    )}
                                </div>
                                {normalResult ? (
                                    <div className="space-y-1 text-xs">
                                        <div className="text-center font-bold text-lg text-slate-700 mt-2">
                                            {normalResult.consumptionPerUnit.toFixed(4)} m
                                        </div>
                                        <div className="text-center text-[10px] text-slate-500 mb-2">
                                            Total para {quantityPerUnit} piezas
                                            {normalResult.efficiency < 100 && (
                                                <span className="block text-red-400 font-medium">
                                                    {(100 - normalResult.efficiency).toFixed(1)}% Desperdicio
                                                </span>
                                            )}
                                        </div>

                                        <div className="bg-white p-2 rounded border border-slate-100 mb-2 text-[10px] text-slate-600">
                                            <div className="flex justify-between">
                                                <span>Piezas por fila:</span>
                                                <span className="font-semibold">{normalResult.piecesPerWidth}</span>
                                            </div>
                                            <div className="flex justify-between text-amber-600">
                                                <span>Desperdicio fila:</span>
                                                <span>{normalResult.unitAnalysis.wasteWidthPerRow} cm</span>
                                            </div>
                                            <div className="flex justify-between border-t pt-1 mt-1">
                                                <span>Distribuido/pieza:</span>
                                                <span>+{normalResult.unitAnalysis.distributedWasteX} cm</span>
                                            </div>
                                            <div className="flex justify-between font-medium text-emerald-700">
                                                <span>Consumo/pieza (Std):</span>
                                                <span>{normalResult.unitAnalysis.standardConsumptionPerPiece.toFixed(4)} m</span>
                                            </div>
                                        </div>

                                        <FabricationLayoutPreview
                                            rollWidth={rollWidth}
                                            pieceWidth={pieceWidth}
                                            pieceLength={pieceLength}
                                            orientation="normal"
                                            result={normalResult}
                                        />
                                    </div>
                                ) : <div className="text-center text-xs text-slate-400">-</div>}
                            </div>

                            <div
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${bestOption === 'rotated'
                                    ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500'
                                    : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
                                    }`}
                                onClick={() => setBestOption('rotated')}
                            >
                                <div className="font-semibold text-sm mb-2 text-center flex justify-between items-center">
                                    <span>Posición Rotada (90°)</span>
                                    {rotatedResult && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${rotatedResult.efficiency === 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {rotatedResult.efficiency.toFixed(0)}% Efic.
                                        </span>
                                    )}
                                </div>
                                {rotatedResult ? (
                                    <div className="space-y-1 text-xs">
                                        <div className="text-center font-bold text-lg text-slate-700 mt-2">
                                            {rotatedResult.consumptionPerUnit.toFixed(4)} m
                                        </div>
                                        <div className="text-center text-[10px] text-slate-500 mb-2">
                                            Total para {quantityPerUnit} piezas
                                            {rotatedResult.efficiency < 100 && (
                                                <span className="block text-red-400 font-medium">
                                                    {(100 - rotatedResult.efficiency).toFixed(1)}% Desperdicio
                                                </span>
                                            )}
                                        </div>

                                        <div className="bg-white p-2 rounded border border-slate-100 mb-2 text-[10px] text-slate-600">
                                            <div className="flex justify-between">
                                                <span>Piezas por fila:</span>
                                                <span className="font-semibold">{rotatedResult.piecesPerWidth}</span>
                                            </div>
                                            <div className="flex justify-between text-amber-600">
                                                <span>Desperdicio fila:</span>
                                                <span>{rotatedResult.unitAnalysis.wasteWidthPerRow} cm</span>
                                            </div>
                                            <div className="flex justify-between border-t pt-1 mt-1">
                                                <span>Distribuido/pieza:</span>
                                                <span>+{rotatedResult.unitAnalysis.distributedWasteX} cm</span>
                                            </div>
                                            <div className="flex justify-between font-medium text-emerald-700">
                                                <span>Consumo/pieza (Std):</span>
                                                <span>{rotatedResult.unitAnalysis.standardConsumptionPerPiece.toFixed(4)} m</span>
                                            </div>
                                        </div>

                                        <FabricationLayoutPreview
                                            rollWidth={rollWidth}
                                            pieceWidth={pieceLength}
                                            pieceLength={pieceWidth}
                                            orientation="rotated"
                                            result={rotatedResult}
                                        />
                                    </div>
                                ) : <div className="text-center text-xs text-slate-400">-</div>}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-2 p-4 bg-slate-50 rounded border">
                            {linearResult ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                                        <span className="text-sm font-medium">Piezas por Barra:</span>
                                        <span className="text-xl font-bold text-indigo-600">{linearResult.pieces}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm text-slate-600">
                                        <span>Desperdicio:</span>
                                        <span>{linearResult.waste.toFixed(2)} cm</span>
                                    </div>
                                    <div className="text-center pt-2 border-t">
                                        <div className="text-xs text-slate-500 mb-1">Consumo Total ({quantityPerUnit} piezas)</div>
                                        <div className="text-2xl font-bold text-emerald-600">
                                            {linearResult.consumption.toFixed(4)}
                                        </div>
                                    </div>
                                    <FabricationLayoutPreview
                                        calculationType="linear"
                                        rollWidth={rollWidth}
                                        pieceWidth={0}
                                        pieceLength={pieceLength}
                                        orientation="normal"
                                    />
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 py-8">
                                    Ingrese dimensiones válidas.
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" onClick={handleApply} disabled={calcType === 'area' ? !bestOption : !linearResult}>
                        Aplicar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
