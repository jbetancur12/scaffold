import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, FlaskConical, Plus, Trash2, ArrowLeft, Calculator, Package2, AlertTriangle } from 'lucide-react';
import type { Product, ProductVariant } from '@scaffold/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ProductionRequirementsTable } from '@/components/mrp/ProductionRequirementsTable';
import { useToast } from '@/components/ui/use-toast';
import { useProductsQuery } from '@/hooks/mrp/useProducts';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { useSimulateProductionRequirementsMutation } from '@/hooks/mrp/useProductionOrders';
import { getErrorMessage } from '@/lib/api-error';
import type { MaterialRequirement } from '@/services/mrpApi';

interface SimulationRow {
    id: string;
    productId: string;
    variantId: string;
    quantity: number;
}

const createEmptyRow = (): SimulationRow => ({
    id: crypto.randomUUID(),
    productId: '',
    variantId: '',
    quantity: 1,
});

export default function ProductionRequirementsSimulatorPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [rows, setRows] = useState<SimulationRow[]>([createEmptyRow()]);
    const [requirements, setRequirements] = useState<MaterialRequirement[]>([]);

    const { data: productsResponse, error: productsError, loading: loadingProducts } = useProductsQuery(1, 1000);
    const { execute: simulateRequirements, loading: simulating } = useSimulateProductionRequirementsMutation();

    useMrpQueryErrorToast(productsError, 'No se pudieron cargar los productos');

    const products = productsResponse?.products ?? [];

    const productsById = useMemo(() => {
        return new Map(products.map((product) => [product.id, product]));
    }, [products]);

    const totals = useMemo(() => {
        const totalRequired = requirements.reduce((acc, row) => acc + Number(row.required || 0), 0);
        const totalMissing = requirements.reduce((acc, row) => acc + Math.max(0, Number(row.required || 0) - Number(row.available || 0)), 0);
        return {
            materials: requirements.length,
            totalRequired,
            totalMissing,
        };
    }, [requirements]);

    const getVariantsForProduct = (productId: string): ProductVariant[] => {
        return productsById.get(productId)?.variants || [];
    };

    const updateRow = (rowId: string, field: keyof SimulationRow, value: string | number) => {
        setRows((current) =>
            current.map((row) => {
                if (row.id !== rowId) return row;
                const next = { ...row, [field]: value };
                if (field === 'productId') {
                    next.variantId = '';
                }
                return next;
            })
        );
    };

    const removeRow = (rowId: string) => {
        setRows((current) => (current.length === 1 ? current : current.filter((row) => row.id !== rowId)));
    };

    const selectedRows = rows.filter((row) => row.variantId && Number(row.quantity) > 0);

    const handleSimulate = async () => {
        if (selectedRows.length === 0) {
            toast({
                title: 'Faltan datos',
                description: 'Agrega al menos una variante con cantidad mayor a 0.',
                variant: 'destructive',
            });
            return;
        }

        try {
            const result = await simulateRequirements({
                items: selectedRows.map((row) => ({
                    variantId: row.variantId,
                    quantity: Number(row.quantity),
                })),
            });
            setRequirements(result);
            toast({
                title: 'Simulación lista',
                description: 'Se calculó el aprovisionamiento sin crear una orden de producción.',
            });
        } catch (error) {
            toast({
                title: 'Error al simular',
                description: getErrorMessage(error, 'No se pudo calcular la simulación'),
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-slate-50">
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <div>
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/mrp/production-orders')}
                        className="mb-4 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a Producción
                    </Button>
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                        <div className="flex items-start gap-4">
                            <div className="rounded-2xl bg-cyan-50 p-3 ring-1 ring-cyan-100 shadow-sm">
                                <FlaskConical className="h-7 w-7 text-cyan-700" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                                    Simulador de Aprovisionamiento
                                </h1>
                                <p className="mt-1 text-sm text-slate-500 md:text-base">
                                    Prueba qué materias primas se requieren para fabricar una combinación de variantes, sin crear una OP.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handleSimulate}
                            disabled={simulating || loadingProducts}
                            className="h-11 rounded-xl bg-cyan-700 px-5 font-medium text-white hover:bg-cyan-800"
                        >
                            <Calculator className="mr-2 h-4 w-4" />
                            {simulating ? 'Calculando...' : 'Simular'}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardDescription>Filas cargadas</CardDescription>
                            <CardTitle className="text-3xl text-slate-900">{selectedRows.length}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardDescription>Materiales afectados</CardDescription>
                            <CardTitle className="text-3xl text-slate-900">{totals.materials}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardDescription>Faltante total</CardDescription>
                            <CardTitle className="text-3xl text-slate-900">{totals.totalMissing.toFixed(2)}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <CardTitle className="text-xl text-slate-900">Escenario de Producción</CardTitle>
                                <CardDescription>
                                    Agrega una o varias variantes, define la cantidad y ejecuta la prueba.
                                </CardDescription>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRows((current) => [...current, createEmptyRow()])}
                                className="rounded-xl"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Agregar fila
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {rows.map((row, index) => {
                            const product = productsById.get(row.productId) as Product | undefined;
                            const variants = getVariantsForProduct(row.productId);
                            return (
                                <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-800">
                                                Escenario {index + 1}
                                            </Badge>
                                            {product ? (
                                                <span className="text-sm text-slate-500">{product.name}</span>
                                            ) : null}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeRow(row.id)}
                                            className="text-slate-500 hover:text-red-600"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="grid gap-4 lg:grid-cols-[1.2fr_1.2fr_180px]">
                                        <div className="space-y-2">
                                            <Label>Producto</Label>
                                            <select
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={row.productId}
                                                onChange={(event) => updateRow(row.id, 'productId', event.target.value)}
                                            >
                                                <option value="">Selecciona un producto</option>
                                                {products.map((item) => (
                                                    <option key={item.id} value={item.id}>
                                                        {item.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Variante</Label>
                                            <select
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={row.variantId}
                                                onChange={(event) => updateRow(row.id, 'variantId', event.target.value)}
                                                disabled={!row.productId}
                                            >
                                                <option value="">Selecciona una variante</option>
                                                {variants.map((variant) => (
                                                    <option key={variant.id} value={variant.id}>
                                                        {variant.name} {variant.sku ? `(${variant.sku})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Cantidad</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                step={1}
                                                value={row.quantity}
                                                onChange={(event) => updateRow(row.id, 'quantity', Number(event.target.value))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <p>
                                    Esta prueba no crea orden de producción, no reserva lotes y no mueve inventario. Solo valida el cálculo actual de BOM, trazada y disponibilidad.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <CardTitle className="text-xl text-slate-900">Resultado de Aprovisionamiento</CardTitle>
                                <CardDescription>
                                    Se usa la misma lógica de requerimientos que ves dentro de una OP real.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Package2 className="h-4 w-4" />
                                Total requerido: {totals.totalRequired.toFixed(2)}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {requirements.length > 0 ? (
                            <ProductionRequirementsTable requirements={requirements} />
                        ) : (
                            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                                <Factory className="mb-3 h-8 w-8 text-slate-300" />
                                <p className="text-sm font-medium text-slate-700">Todavía no hay simulación calculada</p>
                                <p className="mt-1 max-w-xl text-sm text-slate-500">
                                    Configura un escenario arriba y pulsa <span className="font-medium text-slate-700">Simular</span> para validar materiales antes de crear una OP.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
