import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { formatCurrency } from '@/lib/utils';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { useProductGroupsQuery, useProductsQuery, useSaveProductMutation } from '@/hooks/mrp/useProducts';
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
    manualPrice?: number;
    pvpPrice: number;
    manualPvpPrice: number;
};

type GroupedPriceRows = {
    groupName: string;
    groupSortOrder: number;
    rows: PriceRow[];
};

type PdfColumnKey = 'sku' | 'name' | 'sizes' | 'colors' | 'image' | 'description' | 'subtotal' | 'iva' | 'total';

const DEFAULT_PDF_COLUMNS: Record<PdfColumnKey, boolean> = {
    sku: true,
    name: true,
    sizes: true,
    colors: true,
    image: false,
    description: false,
    subtotal: true,
    iva: true,
    total: true,
};

const PDF_COLUMN_LABELS: Array<{ key: PdfColumnKey; label: string }> = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Producto' },
    { key: 'sizes', label: 'Tallas' },
    { key: 'colors', label: 'Colores' },
    { key: 'image', label: 'Imagen' },
    { key: 'description', label: 'Descripcion' },
    { key: 'subtotal', label: 'Subtotal' },
    { key: 'iva', label: 'IVA' },
    { key: 'total', label: 'Total' },
];

const LIST_LIMIT = 1000;

const calculateManualPvpPrice = (value?: number) => {
    const price = Number(value || 0);
    if (!Number.isFinite(price) || price <= 0) return 0;
    return Number((price / 0.75).toFixed(2));
};

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
            manualPrice: product.manualPrice != null ? Number(product.manualPrice) : undefined,
            pvpPrice: maxPvpPrice,
            manualPvpPrice: calculateManualPvpPrice(product.manualPrice != null ? Number(product.manualPrice) : undefined),
        };
    }).sort((a, b) => {
        const groupCompare = a.groupName.localeCompare(b.groupName);
        if (groupCompare !== 0) return groupCompare;
        return a.productSku.localeCompare(b.productSku);
    });
};

export default function PriceListPage() {
    const { toast } = useToast();
    const saveProductMutation = useSaveProductMutation();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [manualPriceDrafts, setManualPriceDrafts] = useState<Record<string, number | undefined>>({});
    const [savingManualPriceId, setSavingManualPriceId] = useState<string | null>(null);
    const [downloadModalOpen, setDownloadModalOpen] = useState(false);
    const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'csv'>('pdf');
    const [downloadPriceSource, setDownloadPriceSource] = useState<'auto' | 'manual'>('auto');
    const [downloadPdfColumns, setDownloadPdfColumns] = useState<Record<PdfColumnKey, boolean>>(DEFAULT_PDF_COLUMNS);
    const [downloadingFile, setDownloadingFile] = useState(false);
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
    const [snapshotMonth, setSnapshotMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [downloadSnapshotVersion, setDownloadSnapshotVersion] = useState<number | null>(null);
    const [snapshots, setSnapshots] = useState<Array<{ version: number; createdAt: string | Date; priceSource: 'auto' | 'manual' }>>([]);
    const [loadingSnapshots, setLoadingSnapshots] = useState(false);
    const [regeneratingSnapshot, setRegeneratingSnapshot] = useState(false);

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

    useEffect(() => {
        const loadSnapshots = async () => {
            setLoadingSnapshots(true);
            try {
                const rows = await mrpApi.getPriceListSnapshots(snapshotMonth);
                const normalized = rows
                    .map((row) => ({ version: row.version, createdAt: row.createdAt, priceSource: row.priceSource }))
                    .sort((a, b) => {
                        if (a.priceSource !== b.priceSource) return a.priceSource.localeCompare(b.priceSource);
                        return b.version - a.version;
                    });
                setSnapshots(normalized);
                setDownloadSnapshotVersion(null);
            } catch (snapshotError) {
                toast({
                    title: 'Error',
                    description: getErrorMessage(snapshotError, 'No se pudieron cargar las versiones del mes'),
                    variant: 'destructive',
                });
            } finally {
                setLoadingSnapshots(false);
            }
        };
        loadSnapshots();
    }, [snapshotMonth]);

    const rows = useMemo(() => buildRows(productsResponse?.products || []), [productsResponse?.products]);

    useEffect(() => {
        setManualPriceDrafts(
            Object.fromEntries(
                rows.map((row) => [row.productId, row.manualPrice])
            )
        );
    }, [rows]);

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
        const totalManualPrice = filteredRows.reduce((sum, row) => sum + Number(row.manualPrice || 0), 0);
        const totalManualPvpPrice = filteredRows.reduce((sum, row) => sum + Number(row.manualPvpPrice || 0), 0);
        return {
            uniqueProducts,
            variantCount: (productsResponse?.products || []).reduce((sum, product) => sum + (product.variants?.length || 0), 0),
            averageProductionCost: filteredRows.length > 0 ? totalProductionCost / filteredRows.length : 0,
            averageDistributorPrice: filteredRows.length > 0 ? totalDistributorPrice / filteredRows.length : 0,
            averageManualPrice: filteredRows.length > 0 ? totalManualPrice / filteredRows.length : 0,
            averageManualPvpPrice: filteredRows.length > 0 ? totalManualPvpPrice / filteredRows.length : 0,
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

    const handleSaveManualPrice = async (row: PriceRow) => {
        const manualPrice = manualPriceDrafts[row.productId];
        setSavingManualPriceId(row.productId);
        try {
            await saveProductMutation.execute({
                id: row.productId,
                payload: { manualPrice: manualPrice ?? null } as Partial<Product>,
            });
            toast({ title: 'Listo', description: `Precio manual y PVP manual actualizados para ${row.productName}.` });
        } catch (error) {
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo guardar el precio manual'),
                variant: 'destructive',
            });
        } finally {
            setSavingManualPriceId(null);
        }
    };

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

    const openDownloadModal = (format: 'pdf' | 'csv') => {
        setDownloadFormat(format);
        setDownloadPriceSource('auto');
        setDownloadSnapshotVersion(null);
        setDownloadPdfColumns(DEFAULT_PDF_COLUMNS);
        setDownloadModalOpen(true);
    };

    const handleDownload = async () => {
        setDownloadingFile(true);
        try {
            const selectedPdfColumns = PDF_COLUMN_LABELS
                .filter((column) => downloadPdfColumns[column.key])
                .map((column) => column.key);
            const blob = downloadFormat === 'pdf'
                ? await mrpApi.downloadPriceListPdf(snapshotMonth, downloadSnapshotVersion || undefined, downloadPriceSource, selectedPdfColumns)
                : await mrpApi.downloadPriceListCsv(snapshotMonth, downloadSnapshotVersion || undefined, downloadPriceSource);
            const extension = downloadFormat === 'pdf' ? 'pdf' : 'csv';
            downloadBlob(
                blob,
                `lista_precios_${snapshotMonth}_${downloadSnapshotVersion ? `v${downloadSnapshotVersion}` : 'ultima'}-${downloadPriceSource === 'manual' ? 'M' : 'A'}.${extension}`
            );
            setDownloadModalOpen(false);
        } catch (exportError) {
            toast({
                title: 'Error',
                description: getErrorMessage(exportError, `No se pudo exportar la lista en ${downloadFormat.toUpperCase()}`),
                variant: 'destructive',
            });
        } finally {
            setDownloadingFile(false);
        }
    };

    const handleRegenerateSnapshot = async () => {
        setRegeneratingSnapshot(true);
        try {
            await mrpApi.regeneratePriceListSnapshot(snapshotMonth, 'auto');
            await mrpApi.regeneratePriceListSnapshot(snapshotMonth, 'manual');
            const rows = await mrpApi.getPriceListSnapshots(snapshotMonth);
            const normalized = rows
                .map((row) => ({ version: row.version, createdAt: row.createdAt, priceSource: row.priceSource }))
                .sort((a, b) => {
                    if (a.priceSource !== b.priceSource) return a.priceSource.localeCompare(b.priceSource);
                    return b.version - a.version;
                });
            setSnapshots(normalized);
            setDownloadSnapshotVersion(null);
            toast({ title: 'Listo', description: 'Se crearon nuevas versiones A y M del mes.' });
        } catch (snapshotError) {
            toast({
                title: 'Error',
                description: getErrorMessage(snapshotError, 'No se pudo regenerar la lista del mes'),
                variant: 'destructive',
            });
        } finally {
            setRegeneratingSnapshot(false);
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
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                {/* Title block */}
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex h-12 w-12 rounded-2xl border border-emerald-200 bg-emerald-50 items-center justify-center shrink-0">
                        <Package className="h-6 w-6 text-emerald-700" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Lista de Precios</h1>
                        <p className="mt-1 text-sm text-slate-500 max-w-xl">
                            Busca por producto, SKU, talla o color y descarga la lista en CSV compatible con Excel. Cada producto se consolida en una sola fila.
                        </p>
                    </div>
                </div>

                {/* Controls block */}
                <div className="flex flex-col gap-2 shrink-0">
                    {/* Row 1: Snapshot controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 h-9">
                            <label className="text-xs font-medium text-slate-400">Mes</label>
                            <input
                                type="month"
                                className="text-sm text-slate-700 outline-none bg-transparent"
                                value={snapshotMonth}
                                onChange={(e) => setSnapshotMonth(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
                            onClick={handleRegenerateSnapshot}
                            disabled={regeneratingSnapshot}
                        >
                            {regeneratingSnapshot ? 'Regenerando...' : 'Regenerar mes'}
                        </Button>
                    </div>

                    {/* Row 2: Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
                            onClick={openConfigModal}
                            disabled={loadingConfig}
                        >
                            <Settings className="mr-1.5 h-3.5 w-3.5" />
                            Portada PDF
                        </Button>
                        <Button
                            onClick={() => openDownloadModal('pdf')}
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs"
                        >
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                            Descargar PDF
                        </Button>
                        <Button
                            onClick={() => openDownloadModal('csv')}
                            size="sm"
                            className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                        >
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                            Descargar Excel (CSV)
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
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
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Precio manual prom.</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? '-' : formatCurrency(summary.averageManualPrice)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">PVP manual prom.</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? '-' : formatCurrency(summary.averageManualPvpPrice)}</p>
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
                                <TableHead className="text-white font-semibold whitespace-nowrap text-right">Precio automatico</TableHead>
                                <TableHead className="text-white font-semibold whitespace-nowrap text-right">PVP automatico</TableHead>
                                <TableHead className="text-white font-semibold whitespace-nowrap">Precio manual</TableHead>
                                <TableHead className="text-white font-semibold whitespace-nowrap text-right">PVP manual</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-32 text-center text-slate-500">
                                        Cargando lista de precios...
                                    </TableCell>
                                </TableRow>
                            ) : groupedRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-32 text-center text-slate-500">
                                        No hay productos que coincidan con los filtros actuales.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                groupedRows.flatMap((group) => ([
                                    <TableRow key={`group-${group.groupName}`} className="bg-emerald-800 hover:bg-emerald-800">
                                        <TableCell colSpan={11} className="py-2 text-center font-bold uppercase tracking-[0.2em] text-white">
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
                                            <TableCell>
                                                <div className="flex min-w-[220px] items-center gap-2">
                                                    <CurrencyInput
                                                        value={manualPriceDrafts[row.productId]}
                                                        onValueChange={(value) => setManualPriceDrafts((prev) => ({ ...prev, [row.productId]: value }))}
                                                        className="h-9"
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-9 shrink-0"
                                                        onClick={() => handleSaveManualPrice(row)}
                                                        disabled={savingManualPriceId === row.productId}
                                                    >
                                                        {savingManualPriceId === row.productId ? 'Guardando...' : 'Guardar'}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(calculateManualPvpPrice(manualPriceDrafts[row.productId]))}</TableCell>
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

            <Dialog open={downloadModalOpen} onOpenChange={setDownloadModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Descargar Lista</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Formato</Label>
                            <Select value={downloadFormat} onValueChange={(value) => setDownloadFormat(value as 'pdf' | 'csv')}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                    <SelectItem value="csv">CSV</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Fuente de precio</Label>
                            <Select value={downloadPriceSource} onValueChange={(value) => {
                                setDownloadPriceSource(value as 'auto' | 'manual');
                                setDownloadSnapshotVersion(null);
                            }}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">Automático (A)</SelectItem>
                                    <SelectItem value="manual">Manual (M)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Versión snapshot</Label>
                            <Select
                                value={downloadSnapshotVersion ? String(downloadSnapshotVersion) : '__latest__'}
                                onValueChange={(value) => setDownloadSnapshotVersion(value === '__latest__' ? null : Number(value))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Última versión" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__latest__">
                                        Última {downloadPriceSource === 'manual' ? '(M)' : '(A)'}
                                    </SelectItem>
                                    {snapshots
                                        .filter((snap) => snap.priceSource === downloadPriceSource)
                                        .map((snap) => (
                                            <SelectItem key={`${snap.priceSource}-${snap.version}`} value={String(snap.version)}>
                                                {`v${snap.version}-${snap.priceSource === 'manual' ? 'M' : 'A'}`}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">
                                Cada descarga usa un snapshot trazable por mes y fuente: `A` automático, `M` manual.
                            </p>
                        </div>

                        {downloadFormat === 'pdf' && (
                            <div className="space-y-2">
                                <Label>Columnas del PDF</Label>
                                <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3">
                                    {PDF_COLUMN_LABELS.map((column) => (
                                        <label key={column.key} className="flex items-center gap-2 text-sm text-slate-700">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4"
                                                checked={downloadPdfColumns[column.key]}
                                                onChange={(e) => setDownloadPdfColumns((prev) => ({
                                                    ...prev,
                                                    [column.key]: e.target.checked,
                                                }))}
                                            />
                                            <span>{column.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500">
                                    Por defecto, `Imagen` y `Descripcion` vienen deshabilitadas.
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDownloadModalOpen(false)} disabled={downloadingFile}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleDownload}
                            disabled={downloadingFile || loadingSnapshots || (downloadFormat === 'pdf' && !Object.values(downloadPdfColumns).some(Boolean))}
                        >
                            {downloadingFile ? 'Descargando...' : 'Descargar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
