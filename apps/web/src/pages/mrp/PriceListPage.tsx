import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { formatCurrency } from '@/lib/utils';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { useProductGroupsQuery, useProductsQuery } from '@/hooks/mrp/useProducts';
import { mrpApi } from '@/services/mrpApi';
import { Download, Package, Search } from 'lucide-react';
import { Product } from '@scaffold/types';

type PriceRow = {
    productId: string;
    productSku: string;
    productName: string;
    groupName: string;
    sizes: string;
    colors: string;
    productionCost: number;
    costPlus40: number;
    distributorPrice: number;
    pvpPrice: number;
};

type GroupedPriceRows = {
    groupName: string;
    rows: PriceRow[];
};

const EXPORT_LIMIT = 5000;
const LIST_LIMIT = 1000;

const csvCell = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const buildRows = (products: Product[]): PriceRow[] => {
    return (products || []).map((product) => {
        const variants = product.variants || [];
        const uniqueSizes = Array.from(
            new Set(
                variants
                    .map((variant) => variant.size || variant.sizeCode || '')
                    .filter((value) => value.trim().length > 0)
            )
        );
        const uniqueColors = Array.from(
            new Set(
                variants
                    .map((variant) => variant.color || variant.colorCode || '')
                    .filter((value) => value.trim().length > 0)
            )
        );

        const maxCost = variants.reduce((max, variant) => Math.max(max, Number(variant.cost || 0)), 0);
        const maxDistributorPrice = variants.reduce((max, variant) => Math.max(max, Number(variant.price || 0)), 0);
        const maxPvpPrice = variants.reduce((max, variant) => Math.max(max, Number(variant.pvpPrice || 0)), 0);

        return {
            productId: product.id,
            productSku: product.sku,
            productName: product.name,
            groupName: product.category?.name || 'Sin grupo',
            sizes: uniqueSizes.join(', '),
            colors: uniqueColors.join(', '),
            productionCost: maxCost,
            costPlus40: maxCost * 1.4,
            distributorPrice: maxDistributorPrice,
            pvpPrice: maxPvpPrice,
        };
    }).sort((a, b) => {
        const groupCompare = a.groupName.localeCompare(b.groupName);
        if (groupCompare !== 0) return groupCompare;
        return a.productSku.localeCompare(b.productSku);
    });
};

export default function PriceListPage() {
    const { toast } = useToast();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [categoryId, setCategoryId] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: productsResponse, loading, error } = useProductsQuery(1, LIST_LIMIT, debouncedSearch, categoryId);
    const { data: productGroups } = useProductGroupsQuery(true);
    useMrpQueryErrorToast(error, 'No se pudo cargar la lista de precios');

    const rows = useMemo(() => buildRows(productsResponse?.products || []), [productsResponse?.products]);

    const filteredRows = useMemo(() => {
        const normalized = debouncedSearch.toLowerCase();
        if (!normalized) return rows;
        return rows.filter((row) =>
            row.productSku.toLowerCase().includes(normalized) ||
            row.productName.toLowerCase().includes(normalized) ||
            row.groupName.toLowerCase().includes(normalized) ||
            row.sizes.toLowerCase().includes(normalized) ||
            row.colors.toLowerCase().includes(normalized)
        );
    }, [debouncedSearch, rows]);

    const summary = useMemo(() => {
        const totalProductionCost = filteredRows.reduce((sum, row) => sum + row.productionCost, 0);
        const totalDistributorPrice = filteredRows.reduce((sum, row) => sum + row.distributorPrice, 0);
        const uniqueProducts = new Set(filteredRows.map((row) => row.productId)).size;
        return {
            uniqueProducts,
            variantCount: (productsResponse?.products || []).reduce((sum, product) => sum + (product.variants?.length || 0), 0),
            averageProductionCost: filteredRows.length > 0 ? totalProductionCost / filteredRows.length : 0,
            averageDistributorPrice: filteredRows.length > 0 ? totalDistributorPrice / filteredRows.length : 0,
        };
    }, [filteredRows, productsResponse?.products]);

    const groupedRows = useMemo<GroupedPriceRows[]>(() => {
        const map = new Map<string, PriceRow[]>();
        for (const row of filteredRows) {
            const current = map.get(row.groupName) || [];
            current.push(row);
            map.set(row.groupName, current);
        }

        return Array.from(map.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([groupName, rows]) => ({
                groupName,
                rows: rows.sort((a, b) => a.productSku.localeCompare(b.productSku)),
            }));
    }, [filteredRows]);

    const handleExport = async () => {
        try {
            const { products } = await mrpApi.getProducts(1, EXPORT_LIMIT, debouncedSearch, categoryId);
            const exportRows = buildRows(products);
            const csvRows = [
                ['CODIGO', 'ARTICULO', 'GRUPO', 'TALLAS', 'COLORES', 'COSTO PRODUCCION', 'COSTO + 40%', 'PRECIO DISTRIBUIDOR', 'PVP SUGERIDO'],
            ];

            const groupedExportRows = exportRows.reduce<Map<string, PriceRow[]>>((acc, row) => {
                const current = acc.get(row.groupName) || [];
                current.push(row);
                acc.set(row.groupName, current);
                return acc;
            }, new Map());

            Array.from(groupedExportRows.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .forEach(([groupName, rows]) => {
                    csvRows.push(['', '', groupName.toUpperCase(), '', '', '', '', '', '']);
                    rows
                        .sort((a, b) => a.productSku.localeCompare(b.productSku))
                        .forEach((row) => {
                            csvRows.push([
                                row.productSku,
                                row.productName,
                                row.groupName,
                                row.sizes,
                                row.colors,
                                row.productionCost.toFixed(2),
                                row.costPlus40.toFixed(2),
                                row.distributorPrice.toFixed(2),
                                row.pvpPrice.toFixed(2),
                            ]);
                        });
                });

            const csvContent = `\ufeff${csvRows.map((row) => row.map(csvCell).join(',')).join('\n')}`;
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `lista_precios_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (exportError) {
            toast({
                title: 'Error',
                description: getErrorMessage(exportError, 'No se pudo exportar la lista de precios'),
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="flex items-start gap-4">
                    <div className="hidden sm:flex h-14 w-14 rounded-2xl border border-emerald-200 bg-emerald-50 items-center justify-center">
                        <Package className="h-7 w-7 text-emerald-700" />
                    </div>
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Lista de Precios</h1>
                        <p className="mt-1 text-slate-500 max-w-2xl">
                            Busca por producto, SKU, talla o color y descarga la lista en CSV compatible con Excel. Cada producto se consolida en una sola fila.
                        </p>
                    </div>
                </div>
                <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-5">
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Excel (CSV)
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Productos</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? '-' : summary.uniqueProducts}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Variantes listadas</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? '-' : summary.variantCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Costo prom.</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? '-' : formatCurrency(summary.averageProductionCost)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Precio distribuidor prom.</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? '-' : formatCurrency(summary.averageDistributorPrice)}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/60">
                    <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
                        <div className="flex flex-col md:flex-row gap-3 w-full">
                            <div className="relative w-full md:max-w-lg">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar por código, producto, talla o color..."
                                    className="pl-9 h-10 border-slate-200 bg-white"
                                />
                            </div>
                            <Select value={categoryId || '__all__'} onValueChange={(value) => setCategoryId(value === '__all__' ? '' : value)}>
                                <SelectTrigger className="w-full md:w-[280px] h-10 border-slate-200 bg-white">
                                    <SelectValue placeholder="Todos los grupos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">Todos los grupos</SelectItem>
                                    {(productGroups ?? []).map((group) => (
                                        <SelectItem key={group.id} value={group.id}>
                                            {group.parent ? `${group.parent.name} / ${group.name}` : group.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-sm text-slate-500">{loading ? 'Cargando...' : `${filteredRows.length} productos en ${groupedRows.length} grupos`}</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-emerald-700 hover:bg-emerald-700">
                                <TableHead className="text-white font-semibold whitespace-nowrap">Codigo</TableHead>
                                <TableHead className="text-white font-semibold whitespace-nowrap">Articulo</TableHead>
                                <TableHead className="text-white font-semibold whitespace-nowrap">Grupo</TableHead>
                                <TableHead className="text-white font-semibold whitespace-nowrap">Tallas</TableHead>
                                <TableHead className="text-white font-semibold whitespace-nowrap">Colores</TableHead>
                                <TableHead className="text-white font-semibold whitespace-nowrap text-right">Costo produccion</TableHead>
                                <TableHead className="text-white font-semibold whitespace-nowrap text-right">Costo + 40%</TableHead>
                                <TableHead className="text-white font-semibold whitespace-nowrap text-right">Precio distribuidor</TableHead>
                                <TableHead className="text-white font-semibold whitespace-nowrap text-right">PVP sugerido</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                                        Cargando lista de precios...
                                    </TableCell>
                                </TableRow>
                            ) : groupedRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                                        No hay productos que coincidan con los filtros actuales.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                groupedRows.flatMap((group) => ([
                                    <TableRow key={`group-${group.groupName}`} className="bg-emerald-800 hover:bg-emerald-800">
                                        <TableCell colSpan={9} className="py-2 text-center font-bold uppercase tracking-[0.2em] text-white">
                                            {group.groupName}
                                        </TableCell>
                                    </TableRow>,
                                    ...group.rows.map((row) => (
                                        <TableRow key={row.productId} className="hover:bg-emerald-50/30">
                                            <TableCell className="font-medium text-slate-900">{row.productSku}</TableCell>
                                            <TableCell className="min-w-[280px]">{row.productName}</TableCell>
                                            <TableCell>{row.groupName}</TableCell>
                                            <TableCell className="max-w-[220px] whitespace-normal">{row.sizes || 'N/A'}</TableCell>
                                            <TableCell className="max-w-[220px] whitespace-normal">{row.colors || 'N/A'}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(row.productionCost)}</TableCell>
                                            <TableCell className="text-right font-semibold text-slate-900">{formatCurrency(row.costPlus40)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(row.distributorPrice)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(row.pvpPrice)}</TableCell>
                                        </TableRow>
                                    )),
                                ]))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
