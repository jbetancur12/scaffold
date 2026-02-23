import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { OperationalConfig } from '@scaffold/types';
import { Save, Calculator, Users, Building } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api-error';
import { useOperationalConfigQuery, useSaveOperationalConfigMutation } from '@/hooks/mrp/useOperationalConfig';

export default function OperationalSettingsPage() {
    const { toast } = useToast();
    const defaultMonthlyProductiveMinutes = Math.round((44 * 52 * 60) / 12); // 11440
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<OperationalConfig>({
        id: '',
        operatorSalary: 2000000,
        operatorLoadFactor: 1.38,
        operatorRealMonthlyMinutes: defaultMonthlyProductiveMinutes,
        rent: 0,
        utilities: 0,
        adminSalaries: 0,
        otherExpenses: 0,
        numberOfOperators: 1,
        modCostPerMinute: 0,
        cifCostPerMinute: 0,
        costPerMinute: 0,
        purchasePaymentMethods: ['Contado', 'Crédito 30 días', 'Transferencia'],
        purchaseWithholdingRules: [
            { key: 'compra', label: 'Compra', rate: 2.5, active: true },
            { key: 'servicio', label: 'Servicio', rate: 4, active: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date()
    });
    const { data: currentConfig, error } = useOperationalConfigQuery();
    const { execute: saveOperationalConfig } = useSaveOperationalConfigMutation();

    useEffect(() => {
        if (!currentConfig) return;
        setConfig(currentConfig);
    }, [currentConfig]);

    useEffect(() => {
        if (!error) return;
        toast({
            title: 'Error',
            description: getErrorMessage(error, 'No se pudo cargar la configuración operativa.'),
            variant: 'destructive',
        });
    }, [error, toast]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const payload: Partial<OperationalConfig> = {
                ...config,
                purchasePaymentMethods: config.purchasePaymentMethods
                    .map((method) => method.trim())
                    .filter((method) => method.length > 0),
                purchaseWithholdingRules: config.purchaseWithholdingRules
                    .map((rule) => ({
                        ...rule,
                        key: rule.key.trim().toLowerCase(),
                        label: rule.label.trim(),
                    }))
                    .filter((rule) => rule.key.length > 0 && rule.label.length > 0),
            };
            if (!payload.purchasePaymentMethods?.length) {
                throw new Error('Debes configurar al menos una forma de pago');
            }
            if (!payload.purchaseWithholdingRules?.length) {
                throw new Error('Debes configurar al menos un tipo de compra para retención');
            }
            const updated = await saveOperationalConfig(payload);
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

    const updatePaymentMethod = (index: number, value: string) => {
        const next = [...config.purchasePaymentMethods];
        next[index] = value;
        setConfig({ ...config, purchasePaymentMethods: next });
    };

    const addPaymentMethod = () => {
        setConfig({
            ...config,
            purchasePaymentMethods: [...config.purchasePaymentMethods, ''],
        });
    };

    const removePaymentMethod = (index: number) => {
        const next = config.purchasePaymentMethods.filter((_, i) => i !== index);
        setConfig({
            ...config,
            purchasePaymentMethods: next.length > 0 ? next : ['Contado'],
        });
    };

    const updateWithholdingRule = (index: number, changes: Partial<OperationalConfig['purchaseWithholdingRules'][number]>) => {
        const next = [...config.purchaseWithholdingRules];
        next[index] = { ...next[index], ...changes };
        setConfig({ ...config, purchaseWithholdingRules: next });
    };

    const addWithholdingRule = () => {
        setConfig({
            ...config,
            purchaseWithholdingRules: [
                ...config.purchaseWithholdingRules,
                { key: '', label: '', rate: 0, active: true },
            ],
        });
    };

    const removeWithholdingRule = (index: number) => {
        const next = config.purchaseWithholdingRules.filter((_, i) => i !== index);
        setConfig({
            ...config,
            purchaseWithholdingRules: next.length > 0 ? next : [{ key: 'compra', label: 'Compra', rate: 2.5, active: true }],
        });
    };

    const totalFactoryMinutes = (config.operatorRealMonthlyMinutes || 0) * (config.numberOfOperators || 0);
    const adminCostPerMinute = totalFactoryMinutes > 0
        ? (config.adminSalaries || 0) / totalFactoryMinutes
        : 0;

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
                                    <Input
                                        id="loadFactor"
                                        type="number"
                                        min={1}
                                        step="0.01"
                                        value={config.operatorLoadFactor}
                                        onChange={(e) => setConfig({ ...config, operatorLoadFactor: Number(e.target.value) || 0 })}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">Ej: 1.52 = salario + 52% de carga prestacional.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="realMinutes">Minutos Reales / Mes</Label>
                                    <Input
                                        id="realMinutes"
                                        type="number"
                                        min={1}
                                        step="1"
                                        value={config.operatorRealMonthlyMinutes}
                                        onChange={(e) => setConfig({ ...config, operatorRealMonthlyMinutes: Number(e.target.value) || 0 })}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">Solo tiempo productivo real (descuenta pausas, reuniones y tiempos muertos).</p>
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
                                Gastos fijos del taller distribuidos en la capacidad instalada.
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
                                    <p className="text-xs text-muted-foreground">
                                        Referencial para PyG. No se incluye en costo por minuto de fabricación.
                                    </p>
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
                                <Input
                                    id="operators"
                                    type="number"
                                    min={1}
                                    step="1"
                                    value={config.numberOfOperators}
                                    onChange={(e) => setConfig({ ...config, numberOfOperators: Number(e.target.value) || 0 })}
                                    required
                                />
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
                                    <p className="text-[10px] text-slate-400 mt-1">Arriendo + Servicios + Otros / (Minutos * Operarios)</p>
                                </div>

                                <div className="bg-slate-900 p-4 rounded-xl shadow-sm text-center">
                                    <p className="text-xs font-medium text-slate-300 uppercase tracking-wider mb-1">Costo Total / Min</p>
                                    <div className="text-3xl font-bold text-white">
                                        {formatCurrency(config.costPerMinute)}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">MOD + CIF</p>
                                </div>
                            </div>

                            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                Si una variante usa <strong>productionMinutes</strong>, el sistema aplica costo automático por minuto
                                (MOD + CIF) y evita sumar <strong>laborCost</strong>/<strong>indirectCost</strong> manual para no duplicar.
                            </div>

                            <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                                <strong>Administración (informativo):</strong> {formatCurrency(adminCostPerMinute)} por minuto
                                en base a nómina administrativa y capacidad mensual. Este valor no se carga al costo unitario de producto.
                            </div>

                            <div className="mt-6 flex justify-end">
                                <Button type="submit" size="lg" disabled={loading}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {loading ? 'Guardando...' : 'Guardar y Recalcular'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-lg">Compras: Formas de Pago y Retención</CardTitle>
                            <CardDescription>
                                Configura aquí las opciones del formulario de orden de compra.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Formas de Pago (select)</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addPaymentMethod}>
                                        Agregar forma de pago
                                    </Button>
                                </div>
                                {config.purchasePaymentMethods.map((method, index) => (
                                    <div key={`pm-${index}`} className="flex gap-2">
                                        <Input
                                            value={method}
                                            onChange={(e) => updatePaymentMethod(index, e.target.value)}
                                            placeholder="Ej: Contado"
                                        />
                                        <Button type="button" variant="outline" onClick={() => removePaymentMethod(index)}>
                                            Quitar
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Reglas de Retención por Tipo de Compra</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addWithholdingRule}>
                                        Agregar tipo
                                    </Button>
                                </div>
                                {config.purchaseWithholdingRules.map((rule, index) => (
                                    <div key={`wr-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center rounded border p-2">
                                        <Input
                                            className="md:col-span-3"
                                            value={rule.key}
                                            onChange={(e) => updateWithholdingRule(index, { key: e.target.value.toLowerCase().trim() })}
                                            placeholder="clave (ej: compra)"
                                        />
                                        <Input
                                            className="md:col-span-4"
                                            value={rule.label}
                                            onChange={(e) => updateWithholdingRule(index, { label: e.target.value })}
                                            placeholder="Etiqueta"
                                        />
                                        <Input
                                            className="md:col-span-2"
                                            type="number"
                                            min={0}
                                            max={100}
                                            step={0.01}
                                            value={rule.rate}
                                            onChange={(e) => updateWithholdingRule(index, { rate: Number(e.target.value) || 0 })}
                                            placeholder="%"
                                        />
                                        <label className="md:col-span-2 text-sm flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={rule.active}
                                                onChange={(e) => updateWithholdingRule(index, { active: e.target.checked })}
                                            />
                                            Activo
                                        </label>
                                        <Button type="button" variant="outline" className="md:col-span-1" onClick={() => removeWithholdingRule(index)}>
                                            Quitar
                                        </Button>
                                    </div>
                                ))}
                                <p className="text-xs text-muted-foreground">
                                    Recomendado: compra 2.5% y servicio 4% calculados sobre subtotal antes de IVA y después de descuento.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </form>
        </div>
    );
}
