import { useState } from 'react';
import { ForecastGroupBy } from '@scaffold/types';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Loader2, TrendingUp, AlertTriangle, Package, Clock } from 'lucide-react';
import { useProductionForecastQuery } from '@/hooks/mrp/useProductionForecast';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';

const groupOptions: Array<{ value: ForecastGroupBy; label: string }> = [
    { value: 'variant', label: 'Por variante' },
    { value: 'product', label: 'Por producto' },
    { value: 'customer', label: 'Por cliente' },
    { value: 'variant-customer', label: 'Variante por cliente' },
];

export default function ProductionForecastPage() {
    const [groupBy, setGroupBy] = useState<ForecastGroupBy>('variant');
    const [months, setMonths] = useState(6);
    const [minStockDays, setMinStockDays] = useState(15);
    const [safetyStockDays, setSafetyStockDays] = useState(7);

    const { data: forecast, loading, error } = useProductionForecastQuery({
        months,
        groupBy,
        minStockDays,
        safetyStockDays,
    });

    useMrpQueryErrorToast(error, 'No se pudo cargar el pronóstico de producción');

    const urgencyBadge = (urgency: string) => {
        const variants: Record<string, { label: string; className: string }> = {
            critical: { label: 'Crítico', className: 'bg-red-100 text-red-800' },
            high: { label: 'Alto', className: 'bg-orange-100 text-orange-800' },
            medium: { label: 'Medio', className: 'bg-yellow-100 text-yellow-800' },
            low: { label: 'Bajo', className: 'bg-green-100 text-green-800' },
        };
        const config = variants[urgency] || variants.low;
        return <Badge className={config.className}>{config.label}</Badge>;
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Pronóstico de Producción</h1>
                        <p className="text-slate-500">Basado en órdenes de venta de clientes</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <div>
                            <p className="text-sm text-slate-500">Producción sugerida</p>
                            <p className="text-2xl font-bold">{forecast?.summary.totalSuggestedProduction || 0} unidades</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-purple-600" />
                        <div>
                            <p className="text-sm text-slate-500">Tiempo estimado</p>
                            <p className="text-2xl font-bold">{forecast?.summary.totalEstimatedHours?.toFixed(1) || 0} hrs</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <div>
                            <p className="text-sm text-slate-500">Críticos</p>
                            <p className="text-2xl font-bold text-red-600">{forecast?.summary.criticalItems || 0}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-orange-600" />
                        <div>
                            <p className="text-sm text-slate-500">Stock bajo</p>
                            <p className="text-2xl font-bold text-orange-600">{forecast?.summary.lowStockItems || 0}</p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="p-4">
                <div className="flex flex-wrap gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Agrupar por:</label>
                        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as ForecastGroupBy)}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {groupOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Meses históricos:</label>
                        <Input
                            type="number"
                            value={months}
                            onChange={(e) => setMonths(Number(e.target.value))}
                            className="w-20"
                            min={1}
                            max={24}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Días stock mín:</label>
                        <Input
                            type="number"
                            value={minStockDays}
                            onChange={(e) => setMinStockDays(Number(e.target.value))}
                            className="w-20"
                            min={1}
                            max={90}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Días seguridad:</label>
                        <Input
                            type="number"
                            value={safetyStockDays}
                            onChange={(e) => setSafetyStockDays(Number(e.target.value))}
                            className="w-20"
                            min={0}
                            max={30}
                        />
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
                            <TableHead className="py-4 font-semibold text-slate-700">
                                {groupBy === 'variant-customer' ? 'Variante → Cliente' : groupBy === 'customer' ? 'Cliente' : 'Producto/Variante'}
                            </TableHead>
                            <TableHead className="py-4 font-semibold text-slate-700 text-right">Stock actual</TableHead>
                            <TableHead className="py-4 font-semibold text-slate-700 text-right">Vel. mensual</TableHead>
                            <TableHead className="py-4 font-semibold text-slate-700 text-right">Días cobertura</TableHead>
                            <TableHead className="py-4 font-semibold text-slate-700 text-right">Sugerido</TableHead>
                            <TableHead className="py-4 font-semibold text-slate-700 text-right">Horas est.</TableHead>
                            <TableHead className="py-4 font-semibold text-slate-700 text-center">Urgencia</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                        <span className="mt-2">Cargando pronóstico...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : !forecast?.insights.length ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-48 text-center text-slate-500">
                                    No hay datos de ventas para el período seleccionado
                                </TableCell>
                            </TableRow>
                        ) : (
                            forecast.insights.map((item) => (
                                <TableRow key={item.key} className="hover:bg-slate-50/80">
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{item.label}</p>
                                            {item.variantSku && (
                                                <p className="text-sm text-slate-500">{item.variantSku}</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">{item.currentStock}</TableCell>
                                    <TableCell className="text-right">{item.monthlyVelocity.toFixed(1)}</TableCell>
                                    <TableCell className="text-right">
                                        <span className={item.stockCoverDays <= 7 ? 'text-red-600 font-bold' : ''}>
                                            {item.stockCoverDays.toFixed(1)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-blue-600">
                                        {item.suggestedProduction}
                                    </TableCell>
                                    <TableCell className="text-right">{item.estimatedProductionTimeHours.toFixed(1)}</TableCell>
                                    <TableCell className="text-center">{urgencyBadge(item.urgency)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
