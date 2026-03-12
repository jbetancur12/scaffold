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
import { Download, Package, Search, Settings, Plus, Trash2 } from 'lucide-react';
import { Product } from '@scaffold/types';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type PriceRow = {
    productId: string;
    productSku: string;
    productName: string;
    groupId: string;
    groupName: string;
    groupSortOrder: number;
    sizes: string;
    colors: string;
    productionCost: number;
    costPlus40: number;
    distributorPrice: number;
    pvpPrice: number;
};

type GroupedPriceRows = {
    groupName: string;
    groupSortOrder: number;
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
            groupId: product.category?.id || 'none',
            groupName: product.category?.name || 'Sin grupo',
            groupSortOrder: Number(product.category?.sortOrder ?? 9999),
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
    const [configOpen, setConfigOpen] = useState(false);
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);
    const [priceListConfig, setPriceListConfig] = useState<{
        showCover: boolean;
        orientation: 'landscape' | 'portrait';
        headerTitle: string;
        headerSubtitle: string;
        introText: string;
        sections: Array<{ title: string; body: string }>;
    } | null>(null);
    const [configForm, setConfigForm] = useState({
        showCover: true,
        orientation: 'landscape' as 'landscape' | 'portrait',
        headerTitle: '',
        headerSubtitle: '',
        introText: '',
        sections: [] as Array<{ title: string; body: string }>,
    });

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: productsResponse, loading, error } = useProductsQuery(1, LIST_LIMIT, debouncedSearch, categoryId);
    const { data: productGroups } = useProductGroupsQuery(true);
    useMrpQueryErrorToast(error, 'No se pudo cargar la lista de precios');

    useEffect(() => {
        const loadConfig = async () => {
            setLoadingConfig(true);
            try {
                const config = await mrpApi.getPriceListConfig();
                const normalized: {
                    showCover: boolean;
                    orientation: 'landscape' | 'portrait';
                    headerTitle: string;
                    headerSubtitle: string;
                    introText: string;
                    sections: Array<{ title: string; body: string }>;
                } = {
                    showCover: config.showCover ?? true,
                    orientation: config.orientation === 'portrait' ? 'portrait' : 'landscape',
                    headerTitle: config.headerTitle || '',
                    headerSubtitle: config.headerSubtitle || '',
                    introText: config.introText || '',
                    sections: Array.isArray(config.sections) ? config.sections : [],
                };
                setPriceListConfig(normalized);
                setConfigForm(normalized);
            } catch (configError) {
                toast({
                    title: 'Error',
                    description: getErrorMessage(configError, 'No se pudo cargar la portada del PDF'),
                    variant: 'destructive',
                });
            } finally {
                setLoadingConfig(false);
            }
        };
        loadConfig();
    }, []);

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
        const map = new Map<string, { groupName: string; groupSortOrder: number; rows: PriceRow[] }>();
        for (const row of filteredRows) {
            const current = map.get(row.groupName) || { groupName: row.groupName, groupSortOrder: row.groupSortOrder, rows: [] };
            current.groupSortOrder = Math.min(current.groupSortOrder, row.groupSortOrder);
            current.rows.push(row);
            map.set(row.groupName, current);
        }

        return Array.from(map.values())
            .sort((a, b) => {
                const normalize = (value: string) => value.trim().toLowerCase();
                const aKey = normalize(a.groupName);
                const bKey = normalize(b.groupName);
                const aIsOther = aKey === 'otros' || aKey === 'sin grupo';
                const bIsOther = bKey === 'otros' || bKey === 'sin grupo';
                if (aIsOther && !bIsOther) return 1;
                if (bIsOther && !aIsOther) return -1;
                if (a.groupSortOrder !== b.groupSortOrder) return a.groupSortOrder - b.groupSortOrder;
                return a.groupName.localeCompare(b.groupName);
            })
            .map((group) => ({
                groupName: group.groupName,
                groupSortOrder: group.groupSortOrder,
                rows: group.rows.sort((a, b) => a.productSku.localeCompare(b.productSku)),
            }));
    }, [filteredRows]);

    const downloadBlob = (blob: Blob, fileName: string) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const handleExport = async () => {
        try {
            const { products } = await mrpApi.getProducts(1, EXPORT_LIMIT, debouncedSearch, categoryId);
            const exportRows = buildRows(products);
            const csvRows = [
                ['CODIGO', 'ARTICULO', 'GRUPO', 'TALLAS', 'COLORES', 'COSTO PRODUCCION', 'COSTO + 40%', 'PRECIO DISTRIBUIDOR', 'PVP SUGERIDO'],
            ];

            const groupedExportRows = exportRows.reduce<Map<string, { groupName: string; groupSortOrder: number; rows: PriceRow[] }>>((acc, row) => {
                const current = acc.get(row.groupName) || { groupName: row.groupName, groupSortOrder: row.groupSortOrder, rows: [] };
                current.groupSortOrder = Math.min(current.groupSortOrder, row.groupSortOrder);
                current.rows.push(row);
                acc.set(row.groupName, current);
                return acc;
            }, new Map());

            Array.from(groupedExportRows.values())
                .sort((a, b) => {
                    const normalize = (value: string) => value.trim().toLowerCase();
                    const aKey = normalize(a.groupName);
                    const bKey = normalize(b.groupName);
                    const aIsOther = aKey === 'otros' || aKey === 'sin grupo';
                    const bIsOther = bKey === 'otros' || bKey === 'sin grupo';
                    if (aIsOther && !bIsOther) return 1;
                    if (bIsOther && !aIsOther) return -1;
                    if (a.groupSortOrder !== b.groupSortOrder) return a.groupSortOrder - b.groupSortOrder;
                    return a.groupName.localeCompare(b.groupName);
                })
                .forEach((group) => {
                    csvRows.push(['', '', group.groupName.toUpperCase(), '', '', '', '', '', '']);
                    group.rows
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

    const handleExportPdf = async () => {
        try {
            const blob = await mrpApi.downloadProductCatalogPdf(debouncedSearch, categoryId);
            downloadBlob(blob, `catalogo_precios_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (exportError) {
            toast({
                title: 'Error',
                description: getErrorMessage(exportError, 'No se pudo exportar el catálogo PDF'),
                variant: 'destructive',
            });
        }
    };

    const openConfigModal = () => {
        if (priceListConfig) {
            setConfigForm(priceListConfig);
        }
        setConfigOpen(true);
    };

    const handleSaveConfig = async () => {
        setSavingConfig(true);
        try {
            const trimmed = {
                showCover: configForm.showCover,
                orientation: configForm.orientation,
                headerTitle: configForm.headerTitle.trim(),
                headerSubtitle: configForm.headerSubtitle.trim(),
                introText: configForm.introText.trim(),
                sections: configForm.sections.map((section) => ({
                    title: section.title.trim(),
                    body: section.body.trim(),
                })).filter((section) => section.title.length > 0 && section.body.length > 0),
            };
            const saved = await mrpApi.updatePriceListConfig(trimmed);
            const normalized: {
                showCover: boolean;
                orientation: 'landscape' | 'portrait';
                headerTitle: string;
                headerSubtitle: string;
                introText: string;
                sections: Array<{ title: string; body: string }>;
            } = {
                showCover: saved.showCover ?? true,
                orientation: saved.orientation === 'portrait' ? 'portrait' : 'landscape',
                headerTitle: saved.headerTitle || '',
                headerSubtitle: saved.headerSubtitle || '',
                introText: saved.introText || '',
                sections: Array.isArray(saved.sections) ? saved.sections : [],
            };
            setPriceListConfig(normalized);
            setConfigForm(normalized);
            setConfigOpen(false);
            toast({ title: 'Listo', description: 'Portada actualizada correctamente.' });
        } catch (configError) {
            toast({
                title: 'Error',
                description: getErrorMessage(configError, 'No se pudo guardar la portada'),
                variant: 'destructive',
            });
        } finally {
            setSavingConfig(false);
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
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        className="h-11 px-4 border-slate-200 text-slate-700 hover:bg-slate-50"
                        onClick={openConfigModal}
                        disabled={loadingConfig}
                    >
                        <Settings className="mr-2 h-4 w-4" />
                        Portada PDF
                    </Button>
                    <Button onClick={handleExportPdf} variant="outline" className="h-11 px-5 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                        <Download className="mr-2 h-4 w-4" />
                        Descargar PDF
                    </Button>
                    <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-5">
                        <Download className="mr-2 h-4 w-4" />
                        Descargar Excel (CSV)
                    </Button>
                </div>
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

            <Dialog open={configOpen} onOpenChange={setConfigOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden p-0">
                    <DialogHeader>
                        <DialogTitle>Portada de Políticas Comerciales</DialogTitle>
                    </DialogHeader>
                    <div className="px-6 pb-6 pt-2 max-h-[calc(85vh-120px)] overflow-y-auto space-y-5">
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">Mostrar portada</p>
                                <p className="text-xs text-slate-500">Incluye una primera hoja con políticas comerciales.</p>
                            </div>
                            <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={configForm.showCover}
                                onChange={(e) => setConfigForm((prev) => ({ ...prev, showCover: e.target.checked }))}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Título principal</Label>
                                <Input
                                    value={configForm.headerTitle}
                                    onChange={(e) => setConfigForm((prev) => ({ ...prev, headerTitle: e.target.value }))}
                                    placeholder="POLÍTICAS COMERCIALES"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Subtítulo</Label>
                                <Input
                                    value={configForm.headerSubtitle}
                                    onChange={(e) => setConfigForm((prev) => ({ ...prev, headerSubtitle: e.target.value }))}
                                    placeholder="DATASAVE MEDICAL SAS 2026"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Orientación del PDF</Label>
                                <select
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
                                    value={configForm.orientation}
                                    onChange={(e) => setConfigForm((prev) => ({ ...prev, orientation: e.target.value as 'landscape' | 'portrait' }))}
                                >
                                    <option value="landscape">Horizontal (Landscape)</option>
                                    <option value="portrait">Vertical (Portrait)</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Introducción</Label>
                            <Textarea
                                rows={3}
                                value={configForm.introText}
                                onChange={(e) => setConfigForm((prev) => ({ ...prev, introText: e.target.value }))}
                                placeholder="Texto introductorio para distribuidores..."
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-800">Secciones</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-8 px-3"
                                    onClick={() => setConfigForm((prev) => ({
                                        ...prev,
                                        sections: [...prev.sections, { title: '', body: '' }],
                                    }))}
                                >
                                    <Plus className="mr-1 h-4 w-4" />
                                    Agregar
                                </Button>
                            </div>
                            {configForm.sections.length === 0 && (
                                <p className="text-xs text-slate-500">No hay secciones agregadas.</p>
                            )}
                            {configForm.sections.map((section, index) => (
                                <div key={`section-${index}`} className="rounded-xl border border-slate-200 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-slate-500">Sección {index + 1}</p>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                                            onClick={() => setConfigForm((prev) => ({
                                                ...prev,
                                                sections: prev.sections.filter((_, idx) => idx !== index),
                                            }))}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Título</Label>
                                        <Input
                                            value={section.title}
                                            onChange={(e) => setConfigForm((prev) => ({
                                                ...prev,
                                                sections: prev.sections.map((item, idx) => idx === index ? { ...item, title: e.target.value } : item),
                                            }))}
                                            placeholder="GARANTÍA DE LOS EQUIPOS MÉDICOS"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Contenido</Label>
                                        <Textarea
                                            rows={4}
                                            value={section.body}
                                            onChange={(e) => setConfigForm((prev) => ({
                                                ...prev,
                                                sections: prev.sections.map((item, idx) => idx === index ? { ...item, body: e.target.value } : item),
                                            }))}
                                            placeholder="Describe la política..."
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter className="px-6 pb-6 pt-3 border-t border-slate-200 bg-white">
                        <Button variant="outline" onClick={() => setConfigOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveConfig} disabled={savingConfig}>
                            {savingConfig ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
