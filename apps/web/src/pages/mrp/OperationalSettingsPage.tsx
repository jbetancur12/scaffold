import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { mrpApi } from '@/services/mrpApi';
import { OperationalConfig } from '@scaffold/types';
import { Save, Calculator, Clock, Users, Building, Percent } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api-error';

export default function OperationalSettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<OperationalConfig>({
        id: '',
        operatorSalary: 0,
        operatorLoadFactor: 1.38,
        operatorRealMonthlyMinutes: 11520,
        rent: 0,
        utilities: 0,
        adminSalaries: 0,
        otherExpenses: 0,
        numberOfOperators: 1,
        modCostPerMinute: 0,
        cifCostPerMinute: 0,
        costPerMinute: 0,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    const loadConfig = useCallback(async () => {
        try {
            setLoading(true);
            const data = await mrpApi.getOperationalConfig();
            setConfig(data);
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo cargar la configuración operativa.'),
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const updated = await mrpApi.updateOperationalConfig(config);
            setConfig(updated);
            toast({
                title: 'Configuración actualizada',
                description: `Nuevo costo por minuto: ${formatCurrency(updated.costPerMinute)}`,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo guardar la configuración.'),
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-6 max-w-4xl space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Configuración Operativa</h1>
                    <p className="text-muted-foreground mt-2">
                        Define los costos de Mano de Obra Directa (MOD) y Costos Indirectos de Fabricación (CIF).
                    </p>
                </div>
            </div>

            <form onSubmit={handleSave}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* MOD Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-600" />
                                Mano de Obra Directa (MOD)
                            </CardTitle>
                            <CardDescription>
                                Configuración de costos salariales y tiempo productivo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="operatorSalary">Salario Operario (Base)</Label>
                                <div className="relative">
                                    <CurrencyInput
                                        id="operatorSalary"
                                        className="pl-8"
                                        value={config.operatorSalary}
                                        onValueChange={(val) => setConfig({ ...config, operatorSalary: val || 0 })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="loadFactor">Factor Prestacional</Label>
                                    <div className="relative">
                                        <Percent className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <CurrencyInput
                                            id="loadFactor"
                                            prefix=""
                                            className="pl-8"
                                            value={config.operatorLoadFactor}
                                            onValueChange={(val) => setConfig({ ...config, operatorLoadFactor: val || 0 })}
                                            required
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Ej: 1.38 para 38%</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="realMinutes">Minutos Reales / Mes</Label>
                                    <div className="relative">
                                        <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <CurrencyInput
                                            id="realMinutes"
                                            prefix=""
                                            className="pl-8"
                                            value={config.operatorRealMonthlyMinutes}
                                            onValueChange={(val) => setConfig({ ...config, operatorRealMonthlyMinutes: val || 0 })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* CIF Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Building className="h-5 w-5 text-orange-600" />
                                Costos Indirectos (CIF)
                            </CardTitle>
                            <CardDescription>
                                Gastos fijos distribuidos en la capacidad instalada.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="rent">Arriendo</Label>
                                    <div className="relative">
                                        <CurrencyInput
                                            id="rent"
                                            className="pl-8"
                                            value={config.rent}
                                            onValueChange={(val) => setConfig({ ...config, rent: val || 0 })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="utilities">Servicios</Label>
                                    <div className="relative">
                                        <CurrencyInput
                                            id="utilities"
                                            className="pl-8"
                                            value={config.utilities}
                                            onValueChange={(val) => setConfig({ ...config, utilities: val || 0 })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="adminSalaries">Nómina Admin</Label>
                                    <div className="relative">
                                        <CurrencyInput
                                            id="adminSalaries"
                                            className="pl-8"
                                            value={config.adminSalaries}
                                            onValueChange={(val) => setConfig({ ...config, adminSalaries: val || 0 })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="otherExpenses">Otros Gastos</Label>
                                    <div className="relative">
                                        <CurrencyInput
                                            id="otherExpenses"
                                            className="pl-8"
                                            value={config.otherExpenses}
                                            onValueChange={(val) => setConfig({ ...config, otherExpenses: val || 0 })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                <Label htmlFor="operators">Número de Operarios</Label>
                                <div className="relative">
                                    <Users className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <CurrencyInput
                                        id="operators"
                                        prefix=""
                                        className="pl-8"
                                        value={config.numberOfOperators}
                                        onValueChange={(val) => setConfig({ ...config, numberOfOperators: val || 0 })}
                                        required
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Base para distribuir el CIF.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Result Section (Full Width) */}
                    <Card className="lg:col-span-2 bg-slate-50 border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Calculator className="h-5 w-5 text-green-600" />
                                Desglose de Costo por Minuto
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Costo MOD / Min</p>
                                    <div className="text-2xl font-bold text-blue-600">
                                        {formatCurrency(config.modCostPerMinute)}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">Salario Real / Minutos Productivos</p>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Costo CIF / Min</p>
                                    <div className="text-2xl font-bold text-orange-600">
                                        {formatCurrency(config.cifCostPerMinute)}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">Total Gastos / (Minutos * Operarios)</p>
                                </div>

                                <div className="bg-slate-900 p-4 rounded-xl shadow-sm text-center">
                                    <p className="text-xs font-medium text-slate-300 uppercase tracking-wider mb-1">Costo Total / Min</p>
                                    <div className="text-3xl font-bold text-white">
                                        {formatCurrency(config.costPerMinute)}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">MOD + CIF</p>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <Button type="submit" size="lg" disabled={loading}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {loading ? 'Guardando...' : 'Guardar y Recalcular'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </form>
        </div>
    );
}
