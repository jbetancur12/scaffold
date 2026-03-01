import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { ControlledDocument, DocumentCategory, DocumentProcess, DocumentStatus, OperationalConfig } from '@scaffold/types';
import { Save, Calculator, Users, Building, ShoppingBag, FileText } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api-error';
import { useOperationalConfigQuery, useSaveOperationalConfigMutation } from '@/hooks/mrp/useOperationalConfig';
import { useControlledDocumentsQuery } from '@/hooks/mrp/useQuality';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';

export default function OperationalSettingsPage() {
    const { toast } = useToast();
    const defaultMonthlyProductiveMinutes = Math.round((44 * 52 * 60) / 12); // 11440

    // Track loading states independently
    const [loadingCosts, setLoadingCosts] = useState(false);
    const [loadingPurchases, setLoadingPurchases] = useState(false);
    const [loadingDocs, setLoadingDocs] = useState(false);

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
        defaultPurchaseOrderControlledDocumentId: '',
        defaultPurchaseOrderControlledDocumentCode: '',
        purchaseWithholdingRules: [
            { key: 'compra', label: 'Compra', rate: 2.5, active: true, baseUvtLimit: 0 },
            { key: 'servicio', label: 'Servicio', rate: 4, active: true, baseUvtLimit: 0 },
        ],
        uvtValue: 47065,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    const { data: currentConfig, error } = useOperationalConfigQuery();
    const { data: controlledDocuments, error: controlledDocumentsError } = useControlledDocumentsQuery({
        process: DocumentProcess.PRODUCCION,
        documentCategory: DocumentCategory.FOR,
        status: DocumentStatus.APROBADO,
    });
    const { execute: saveOperationalConfig } = useSaveOperationalConfigMutation();
    useMrpQueryErrorToast(controlledDocumentsError, 'No se pudieron cargar documentos de control para OC');

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

    const handleSaveCosts = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoadingCosts(true);
            const payload: Partial<OperationalConfig> = {
                operatorSalary: config.operatorSalary,
                operatorLoadFactor: config.operatorLoadFactor,
                operatorRealMonthlyMinutes: config.operatorRealMonthlyMinutes,
                rent: config.rent,
                utilities: config.utilities,
                adminSalaries: config.adminSalaries,
                otherExpenses: config.otherExpenses,
                numberOfOperators: config.numberOfOperators,
            };
            const updated = await saveOperationalConfig(payload);
            setConfig(updated);
            toast({
                title: 'Costos actualizados',
                description: `Nuevo costo por minuto: ${formatCurrency(updated.costPerMinute)}`,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudieron guardar los costos operativos.'),
                variant: 'destructive',
            });
        } finally {
            setLoadingCosts(false);
        }
    };

    const handleSavePurchases = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoadingPurchases(true);
            const methods = config.purchasePaymentMethods
                .map((method) => method.trim())
                .filter((method) => method.length > 0);

            const rules = config.purchaseWithholdingRules
                .map((rule) => ({
                    ...rule,
                    key: rule.key.trim().toLowerCase(),
                    label: rule.label.trim(),
                }))
                .filter((rule) => rule.key.length > 0 && rule.label.length > 0);

            if (!methods.length) {
                throw new Error('Debes configurar al menos una forma de pago');
            }
            if (!rules.length) {
                throw new Error('Debes configurar al menos un tipo de compra para retención');
            }

            const payload: Partial<OperationalConfig> = {
                purchasePaymentMethods: methods,
                purchaseWithholdingRules: rules,
                uvtValue: config.uvtValue,
            };
            const updated = await saveOperationalConfig(payload);
            setConfig(updated);
            toast({
                title: 'Configuración de compras actualizada',
                description: 'Las reglas de compras y retenciones se han guardado.',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo guardar la configuración de compras.'),
                variant: 'destructive',
            });
        } finally {
            setLoadingPurchases(false);
        }
    };

    const handleSaveDocuments = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoadingDocs(true);
            const payload: Partial<OperationalConfig> = {
                defaultPurchaseOrderControlledDocumentCode: config.defaultPurchaseOrderControlledDocumentCode || undefined,
            };
            const updated = await saveOperationalConfig(payload);
            setConfig(updated);
            toast({
                title: 'Documentos actualizados',
                description: 'El documento por defecto ha sido guardado.',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo guardar la configuración de documentos.'),
                variant: 'destructive',
            });
        } finally {
            setLoadingDocs(false);
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
                { key: '', label: '', rate: 0, active: true, baseUvtLimit: 0 },
            ],
        });
    };

    const removeWithholdingRule = (index: number) => {
        const next = config.purchaseWithholdingRules.filter((_, i) => i !== index);
        setConfig({
            ...config,
            purchaseWithholdingRules: next.length > 0 ? next : [{ key: 'compra', label: 'Compra', rate: 2.5, active: true, baseUvtLimit: 0 }],
        });
    };

    const totalFactoryMinutes = (config.operatorRealMonthlyMinutes || 0) * (config.numberOfOperators || 0);
    const adminCostPerMinute = totalFactoryMinutes > 0
        ? (config.adminSalaries || 0) / totalFactoryMinutes
        : 0;
    const latestDocByCode = (controlledDocuments ?? []).reduce<Record<string, ControlledDocument>>((acc, doc) => {
        const current = acc[doc.code];
        if (!current || doc.version > current.version) acc[doc.code] = doc;
        return acc;
    }, {});
    const documentCodeOptions = Object.values(latestDocByCode).sort((a, b) => a.code.localeCompare(b.code));

    return (
        <div className="container mx-auto py-6 max-w-5xl space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Configuración Operativa</h1>
                    <p className="text-muted-foreground mt-2">
                        Administra parámetros financieros, de compras y documentales para la operación.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="costs" className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:w-auto h-auto p-1 mb-8">
                    <TabsTrigger value="costs" className="flex items-center gap-2 py-3 px-6 rounded-md">
                        <Calculator className="h-4 w-4" />
                        <span className="hidden sm:inline">Costos MOD / CIF</span>
                        <span className="sm:hidden">Costos</span>
                    </TabsTrigger>
                    <TabsTrigger value="purchases" className="flex items-center gap-2 py-3 px-6 rounded-md">
                        <ShoppingBag className="h-4 w-4" />
                        <span className="hidden sm:inline">Compras y Retenciones</span>
                        <span className="sm:hidden">Compras</span>
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex items-center gap-2 py-3 px-6 rounded-md">
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">Documentos Globales</span>
                        <span className="sm:hidden">Documentos</span>
                    </TabsTrigger>
                </TabsList>

                {/* --- TAB: COSTOS --- */}
                <TabsContent value="costs">
                    <form onSubmit={handleSaveCosts}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* MOD Section */}
                            <Card className="border-slate-200">
                                <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Users className="h-5 w-5 text-blue-600" />
                                        Mano de Obra Directa (MOD)
                                    </CardTitle>
                                    <CardDescription>
                                        Configuración de costos salariales y tiempo productivo unitario.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="operatorSalary">Salario Operario Promedio Base</Label>
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
                                            <p className="text-xs text-muted-foreground">Ej: 1.52 = salario + 52% carga</p>
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
                                            <p className="text-xs text-muted-foreground">Solo tiempo productivo.</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* CIF Section */}
                            <Card className="border-slate-200">
                                <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Building className="h-5 w-5 text-orange-600" />
                                        Costos Indirectos (CIF)
                                    </CardTitle>
                                    <CardDescription>
                                        Gastos fijos de planta a distribuir en la capacidad de operarios.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="rent">Arriendo de Planta</Label>
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
                                            <Label htmlFor="utilities">Servicios Públicos</Label>
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
                                            <p className="text-[10px] text-muted-foreground leading-tight">
                                                (Referencial, no entra a CIF de producto)
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="otherExpenses">Otros Gastos CIF</Label>
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

                                    <div className="pt-3 border-t border-slate-100 mt-2">
                                        <div className="space-y-2 w-1/2">
                                            <Label htmlFor="operators">Nº de Operarios Fijos</Label>
                                            <Input
                                                id="operators"
                                                type="number"
                                                min={1}
                                                step="1"
                                                value={config.numberOfOperators}
                                                onChange={(e) => setConfig({ ...config, numberOfOperators: Number(e.target.value) || 0 })}
                                                required
                                            />
                                            <p className="text-[10px] text-muted-foreground leading-tight">Base para diluir el CIF Mensual.</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Result Section (Full Width) */}
                            <Card className="lg:col-span-2 shadow-sm border-blue-100">
                                <CardHeader className="bg-blue-50/50 pb-4 border-b border-blue-100/50">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                                            <Calculator className="h-5 w-5 text-blue-600" />
                                            Costo Global por Minuto (Actual / Proyectado)
                                        </CardTitle>
                                        <Button type="submit" size="default" disabled={loadingCosts} className="bg-blue-600 hover:bg-blue-700">
                                            <Save className="mr-2 h-4 w-4" />
                                            {loadingCosts ? 'Guardando...' : 'Guardar y Recalcular Costos'}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
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

                                        <div className="bg-slate-900 justify-center flex flex-col p-4 rounded-xl shadow-sm text-center">
                                            <p className="text-xs font-medium text-slate-300 uppercase tracking-wider mb-1">Costo Total / Min</p>
                                            <div className="text-3xl font-bold text-white">
                                                {formatCurrency(config.costPerMinute)}
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">MOD + CIF</p>
                                        </div>
                                    </div>

                                    <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                        Si una variante de producto usa <strong>productionMinutes</strong>, el sistema aplica costo automático por minuto
                                        (MOD + CIF) y evita sumar laborCost/indirectCost estáticos para no duplicar.
                                    </div>

                                    <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                                        <strong>Costo Administrativo (informativo):</strong> {formatCurrency(adminCostPerMinute)} por minuto
                                        en base a nómina administrativa y tiempo total. (No aplicable a costo de manufactura de producto).
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </form>
                </TabsContent>

                {/* --- TAB: COMPRAS Y RETENCIONES --- */}
                <TabsContent value="purchases">
                    <form onSubmit={handleSavePurchases}>
                        <Card className="border-slate-200">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl pb-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <ShoppingBag className="h-5 w-5 text-green-600" />
                                            Parámetros de Compras
                                        </CardTitle>
                                        <CardDescription>
                                            Formas de pago aceptadas, umbrales de UVT y porcentajes de retención.
                                        </CardDescription>
                                    </div>
                                    <Button type="submit" size="default" disabled={loadingPurchases} className="bg-green-600 hover:bg-green-700">
                                        <Save className="mr-2 h-4 w-4" />
                                        {loadingPurchases ? 'Guardando...' : 'Guardar Compras'}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-8 pt-6">
                                {/* UVT Configuration */}
                                <div className="w-full md:w-1/3 space-y-2">
                                    <Label htmlFor="uvtValue" className="font-semibold text-slate-800 text-base">Valor Global del UVT ($)</Label>
                                    <div className="relative pt-1">
                                        <CurrencyInput
                                            id="uvtValue"
                                            className="pl-8 text-lg font-bold border-green-200 focus-visible:ring-green-500"
                                            value={config.uvtValue || 0}
                                            onValueChange={(val) => setConfig({ ...config, uvtValue: val || 0 })}
                                        />
                                    </div>
                                    <p className="text-sm text-muted-foreground">Valor legal del UVT usado para calcular umbrales de exención en retenciones.</p>
                                </div>

                                <hr className="border-slate-100" />

                                {/* Payment Methods */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-base font-semibold text-slate-800">Formas de Pago</Label>
                                            <p className="text-sm text-muted-foreground">Opciones a mostrar en listas desplegables (órdenes). </p>
                                        </div>
                                        <Button type="button" variant="outline" size="sm" onClick={addPaymentMethod} className="border-dashed">
                                            + Agregar Forma de Pago
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {config.purchasePaymentMethods.map((method, index) => (
                                            <div key={`pm-${index}`} className="flex gap-2">
                                                <Input
                                                    value={method}
                                                    onChange={(e) => updatePaymentMethod(index, e.target.value)}
                                                    placeholder="Ej: Contado"
                                                    className="bg-slate-50"
                                                />
                                                <Button type="button" variant="ghost" onClick={() => removePaymentMethod(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                    Quitar
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <hr className="border-slate-100" />

                                {/* Withholding Rules */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-base font-semibold text-slate-800">Reglas de Retención de Compras</Label>
                                            <p className="text-sm text-muted-foreground">Aplicables a Subtotal (antes de IVA, después de descuentos).</p>
                                        </div>
                                        <Button type="button" variant="outline" size="sm" onClick={addWithholdingRule} className="border-dashed">
                                            + Agregar Regla
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        {config.purchaseWithholdingRules.map((rule, index) => (
                                            <div key={`wr-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center rounded-lg border border-slate-200 bg-slate-50 p-3">
                                                <div className="md:col-span-2 space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase">Clave Única</Label>
                                                    <Input
                                                        value={rule.key}
                                                        onChange={(e) => updateWithholdingRule(index, { key: e.target.value.toLowerCase().trim() })}
                                                        placeholder="ej: compra"
                                                        className="bg-white"
                                                    />
                                                </div>
                                                <div className="md:col-span-3 space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase">Etiqueta</Label>
                                                    <Input
                                                        value={rule.label}
                                                        onChange={(e) => updateWithholdingRule(index, { label: e.target.value })}
                                                        placeholder="Ej: Compras Generales"
                                                        className="bg-white"
                                                    />
                                                </div>
                                                <div className="md:col-span-2 space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase">% Retención</Label>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            step={0.01}
                                                            value={rule.rate}
                                                            onChange={(e) => updateWithholdingRule(index, { rate: Number(e.target.value) || 0 })}
                                                            className="bg-white pr-6 text-right"
                                                        />
                                                        <span className="absolute right-2 top-2 text-slate-400">%</span>
                                                    </div>
                                                </div>
                                                <div className="md:col-span-2 space-y-1">
                                                    <Label className="text-xs text-slate-500 uppercase">Límite Base UVT</Label>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            step={1}
                                                            value={rule.baseUvtLimit || ''}
                                                            onChange={(e) => updateWithholdingRule(index, { baseUvtLimit: Number(e.target.value) || 0 })}
                                                            placeholder="0 = Asumir base $0"
                                                            className="bg-white pr-10 text-right"
                                                        />
                                                        <span className="absolute right-2 top-2 text-slate-400 text-xs mt-1">UVT</span>
                                                    </div>
                                                </div>
                                                <div className="md:col-span-2 flex flex-col justify-end h-full py-2">
                                                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={rule.active}
                                                            onChange={(e) => updateWithholdingRule(index, { active: e.target.checked })}
                                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 w-4 h-4 cursor-pointer"
                                                        />
                                                        <span className={rule.active ? "text-slate-800 font-medium" : "text-slate-400"}>Automático</span>
                                                    </label>
                                                </div>
                                                <div className="md:col-span-1 flex flex-col justify-end h-full py-1">
                                                    <Button type="button" variant="ghost" className="w-full text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeWithholdingRule(index)}>
                                                        X
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="rounded-md bg-slate-100 p-3 mt-4 text-xs text-slate-600">
                                        <p><strong>Claves sugeridas:</strong> "compra" (recomendado 2.5%, base 27 UVT) y "servicio" (recomendado 4%, base 4 UVT).</p>
                                        <p className="mt-1">Si la opción "Automático" está activa, la retención se calculará sola en cada Orden de Compra si el Subtotal supera la base.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                </TabsContent>

                {/* --- TAB: DOCUMENTOS GLOBALES --- */}
                <TabsContent value="documents">
                    <form onSubmit={handleSaveDocuments}>
                        <Card className="border-slate-200">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl pb-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-indigo-600" />
                                            Formatos Documentales
                                        </CardTitle>
                                        <CardDescription>
                                            Documentos controlados de calidad asignados por defecto al imprimir órdenes.
                                        </CardDescription>
                                    </div>
                                    <Button type="submit" size="default" disabled={loadingDocs} className="bg-indigo-600 hover:bg-indigo-700">
                                        <Save className="mr-2 h-4 w-4" />
                                        {loadingDocs ? 'Guardando...' : 'Guardar Documentos'}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4 max-w-xl">
                                    <div className="space-y-2">
                                        <Label htmlFor="defaultPurchaseOrderControlledDocumentCode" className="text-base font-semibold">
                                            Orden de Compra
                                        </Label>
                                        <p className="text-sm text-muted-foreground pb-2">
                                            Código del formato (Proceso Producción / Categoría FOR) a usar en el encabezado de las OC impresas.
                                        </p>
                                        <select
                                            id="defaultPurchaseOrderControlledDocumentCode"
                                            className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                            value={config.defaultPurchaseOrderControlledDocumentCode || ''}
                                            onChange={(e) =>
                                                setConfig({
                                                    ...config,
                                                    defaultPurchaseOrderControlledDocumentCode: e.target.value || undefined,
                                                })
                                            }
                                        >
                                            <option value="">Automático (último formato aprobado en FOR Producción)</option>
                                            {documentCodeOptions.map((doc) => (
                                                <option key={doc.code} value={doc.code}>
                                                    {doc.code} (v{doc.version}) - {doc.title}
                                                </option>
                                            ))}
                                        </select>
                                        {(controlledDocuments?.length || 0) === 0 ? (
                                            <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded">
                                                No hay formatos aprobados disponibles. El menú mostrará un encabezado genérico hasta que se apruebe uno.
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                </TabsContent>
            </Tabs>
        </div>
    );
}
