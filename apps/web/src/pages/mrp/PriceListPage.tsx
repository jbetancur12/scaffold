import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { cn, formatCurrency } from '@/lib/utils';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { useProductGroupsQuery, useProductsQuery } from '@/hooks/mrp/useProducts';
import { mrpApi } from '@/services/mrpApi';
import { Download, Package, Search, Columns, FileText, Plus, Trash2, Layers, TrendingDown, TrendingUp, Tag, ShoppingCart, AlertTriangle, Save, Info } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';

type PriceRow = {
    productId: string;
    productSku: string;
    productName: string;
    showInCatalogPdf: boolean;
    groupId: string;
    groupName: string;
    groupSortOrder: number;
    sizes: string;
    colors: string;
    productionCost: number;
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

type TableColumnKey =
    | 'pdfVisibility'
    | 'group'
    | 'sizes'
    | 'colors'
    | 'productionCost'
    | 'distributorPrice'
    | 'pvpPrice'
    | 'manualPrice'
    | 'manualPvpPrice';

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

const DEFAULT_TABLE_COLUMNS: Record<TableColumnKey, boolean> = {
    pdfVisibility: true,
    group: true,
    sizes: true,
    colors: true,
    productionCost: true,
    distributorPrice: true,
    pvpPrice: true,
    manualPrice: true,
    manualPvpPrice: true,
};

const TABLE_COLUMN_LABELS: Array<{ key: TableColumnKey; label: string }> = [
    { key: 'pdfVisibility', label: 'PDF' },
    { key: 'group', label: 'Grupo' },
    { key: 'sizes', label: 'Tallas' },
    { key: 'colors', label: 'Colores' },
    { key: 'productionCost', label: 'Costo produccion' },
    { key: 'distributorPrice', label: 'Precio automatico' },
    { key: 'pvpPrice', label: 'PVP automatico' },
    { key: 'manualPrice', label: 'Precio manual' },
    { key: 'manualPvpPrice', label: 'PVP manual' },
];

const LIST_LIMIT = 1000;
const SIZE_ORDER: Record<string, number> = {
    xxxs: 0,
    xxs: 1,
    xs: 2,
    s: 3,
    m: 4,
    l: 5,
    xl: 6,
    xxl: 7,
    xxxl: 8,
    unica: 9,
    u: 9,
    one_size: 9,
    onesize: 9,
};

const areManualPriceValuesEqual = (left?: number, right?: number) => {
    if (left == null && right == null) return true;
    if (left == null || right == null) return false;
    return Number(left) === Number(right);
};

const hasPendingManualPriceChange = (row: PriceRow, draftValue?: number) => !areManualPriceValuesEqual(draftValue, row.manualPrice);

const normalizeSizeLabel = (value: string) => value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/\./g, '_');

const getSizeSortKey = (value: string) => {
    const normalized = normalizeSizeLabel(value);
    const tokens = normalized
        .split(/[\/,-]+/)
        .map((token) => token.trim())
        .filter(Boolean);
    const ranks = tokens
        .map((token) => SIZE_ORDER[token])
        .filter((rank): rank is number => rank != null);

    if (ranks.length === 0) {
        return {
            primary: Number.MAX_SAFE_INTEGER,
            secondary: Number.MAX_SAFE_INTEGER,
            tokenCount: tokens.length || 1,
            normalized,
        };
    }

    return {
        primary: Math.min(...ranks),
        secondary: Math.max(...ranks),
        tokenCount: tokens.length,
        normalized,
    };
};

const sortSizeLabels = (sizes: string[]) => (
    [...sizes].sort((left, right) => {
        const leftKey = getSizeSortKey(left);
        const rightKey = getSizeSortKey(right);

        if (leftKey.primary !== rightKey.primary) return leftKey.primary - rightKey.primary;
        if (leftKey.secondary !== rightKey.secondary) return leftKey.secondary - rightKey.secondary;
        if (leftKey.tokenCount !== rightKey.tokenCount) return leftKey.tokenCount - rightKey.tokenCount;
        return leftKey.normalized.localeCompare(rightKey.normalized);
    })
);

const calculateManualPvpPrice = (value?: number) => {
    const price = Number(value || 0);
    if (!Number.isFinite(price) || price <= 0) return 0;
    return Number((price / 0.75).toFixed(2));
};

const calculateMarginPercent = (cost?: number, price?: number) => {
    const normalizedCost = Number(cost || 0);
    const normalizedPrice = Number(price || 0);
    if (!Number.isFinite(normalizedCost) || !Number.isFinite(normalizedPrice) || normalizedCost <= 0 || normalizedPrice <= 0) {
        return null;
    }
    return ((normalizedPrice - normalizedCost) / normalizedPrice) * 100;
};

const getManualPriceAlert = (cost?: number, price?: number) => {
    if (price == null) return null;

    const marginPercent = calculateMarginPercent(cost, price);
    if (marginPercent == null) return null;

    const minPriceFor20Margin = Number(cost || 0) / (1 - 0.2);
    const minPriceFor30Margin = Number(cost || 0) / (1 - 0.3);
    const minPriceFor40Margin = Number(cost || 0) / (1 - 0.4);

    if (marginPercent < 20) {
        return {
            tone: 'danger' as const,
            marginPercent,
            referencePrice: minPriceFor20Margin,
            message: `Margen estimado ${marginPercent.toFixed(1)}%. Está por debajo de 20%.`,
        };
    }

    if (marginPercent < 30) {
        return {
            tone: 'warning' as const,
            marginPercent,
            referencePrice: minPriceFor30Margin,
            message: `Margen estimado ${marginPercent.toFixed(1)}%. Está entre 20% y 30%.`,
        };
    }

    if (marginPercent < 40) {
        return {
            tone: 'caution' as const,
            marginPercent,
            referencePrice: minPriceFor40Margin,
            message: `Margen estimado ${marginPercent.toFixed(1)}%. Está entre 30% y 40%.`,
        };
    }

    return null;
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
            showInCatalogPdf: product.showInCatalogPdf !== false,
            groupId: product.category?.id || 'none',
            groupName: product.category?.name || 'Sin grupo',
            groupSortOrder: Number(product.category?.sortOrder ?? 9999),
            sizes: sortSizeLabels(uniqueSizes).join(', '),
            colors: uniqueColors.join(', '),
            productionCost: maxCost,
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
    const tableScrollbarRef = useRef<HTMLDivElement | null>(null);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [catalogPdfVisibilityOverrides, setCatalogPdfVisibilityOverrides] = useState<Record<string, boolean>>({});
    const [manualPriceDrafts, setManualPriceDrafts] = useState<Record<string, number | undefined>>({});
    const [savedManualPriceOverrides, setSavedManualPriceOverrides] = useState<Record<string, number | null>>({});
    const [savingCatalogPdfVisibilityId, setSavingCatalogPdfVisibilityId] = useState<string | null>(null);
    const [savingManualPriceId, setSavingManualPriceId] = useState<string | null>(null);
    const [savingAllManualPrices, setSavingAllManualPrices] = useState(false);
    const [columnsModalOpen, setColumnsModalOpen] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<Record<TableColumnKey, boolean>>(DEFAULT_TABLE_COLUMNS);
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
    const [tableScrollMetrics, setTableScrollMetrics] = useState({ scrollWidth: 0, clientWidth: 0, scrollLeft: 0 });

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

    const baseRows = useMemo(() => buildRows(productsResponse?.products || []), [productsResponse?.products]);

    useEffect(() => {
        setCatalogPdfVisibilityOverrides((currentOverrides) => {
            const nextOverrides: Record<string, boolean> = {};

            for (const row of baseRows) {
                if (!Object.prototype.hasOwnProperty.call(currentOverrides, row.productId)) continue;
                if (currentOverrides[row.productId] !== row.showInCatalogPdf) {
                    nextOverrides[row.productId] = currentOverrides[row.productId];
                }
            }

            return nextOverrides;
        });
    }, [baseRows]);

    useEffect(() => {
        setSavedManualPriceOverrides((currentOverrides) => {
            const nextOverrides: Record<string, number | null> = {};

            for (const row of baseRows) {
                if (!Object.prototype.hasOwnProperty.call(currentOverrides, row.productId)) continue;

                const overrideValue = currentOverrides[row.productId];
                const normalizedOverride = overrideValue ?? undefined;
                if (!areManualPriceValuesEqual(normalizedOverride, row.manualPrice)) {
                    nextOverrides[row.productId] = overrideValue;
                }
            }

            return nextOverrides;
        });
    }, [baseRows]);

    const rows = useMemo(
        () => baseRows.map((row) => {
            const nextRow = { ...row };

            if (Object.prototype.hasOwnProperty.call(catalogPdfVisibilityOverrides, row.productId)) {
                nextRow.showInCatalogPdf = catalogPdfVisibilityOverrides[row.productId];
            }

            if (Object.prototype.hasOwnProperty.call(savedManualPriceOverrides, row.productId)) {
                const overrideValue = savedManualPriceOverrides[row.productId] ?? undefined;
                nextRow.manualPrice = overrideValue;
                nextRow.manualPvpPrice = calculateManualPvpPrice(overrideValue);
            }

            return nextRow;
        }),
        [baseRows, catalogPdfVisibilityOverrides, savedManualPriceOverrides]
    );

    useEffect(() => {
        setManualPriceDrafts((currentDrafts) => {
            const nextDrafts: Record<string, number | undefined> = {};

            for (const row of rows) {
                const hasCurrentDraft = Object.prototype.hasOwnProperty.call(currentDrafts, row.productId);
                const currentDraft = currentDrafts[row.productId];
                const hasPendingChanges = hasCurrentDraft && !areManualPriceValuesEqual(currentDraft, row.manualPrice);

                nextDrafts[row.productId] = hasPendingChanges ? currentDraft : row.manualPrice;
            }

            return nextDrafts;
        });
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

    const pendingManualPriceRows = useMemo(
        () => rows.filter((row) => hasPendingManualPriceChange(row, manualPriceDrafts[row.productId])),
        [rows, manualPriceDrafts]
    );

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

    const maxHorizontalScroll = Math.max(0, tableScrollMetrics.scrollWidth - tableScrollMetrics.clientWidth);

    useEffect(() => {
        const tableScrollbar = tableScrollbarRef.current;
        if (!tableScrollbar) return;

        const updateMetrics = () => {
            setTableScrollMetrics({
                scrollWidth: tableScrollbar.scrollWidth,
                clientWidth: tableScrollbar.clientWidth,
                scrollLeft: tableScrollbar.scrollLeft,
            });
        };

        updateMetrics();
        tableScrollbar.addEventListener('scroll', updateMetrics);

        const observer = new ResizeObserver(() => updateMetrics());
        observer.observe(tableScrollbar);
        const tableElement = tableScrollbar.querySelector('table');
        if (tableElement) {
            observer.observe(tableElement);
        }
        window.addEventListener('resize', updateMetrics);

        return () => {
            tableScrollbar.removeEventListener('scroll', updateMetrics);
            observer.disconnect();
            window.removeEventListener('resize', updateMetrics);
        };
    }, [loading, visibleColumns, filteredRows.length, productsResponse?.products?.length]);

    const visibleColumnCount = 2 + Object.values(visibleColumns).filter(Boolean).length;

    const handleSaveManualPrice = async (row: PriceRow) => {
        const manualPrice = manualPriceDrafts[row.productId];
        setSavingManualPriceId(row.productId);
        try {
            await mrpApi.updateProduct(row.productId, {
                manualPrice: manualPrice ?? null,
            } as Partial<Product>);
            setSavedManualPriceOverrides((prev) => ({
                ...prev,
                [row.productId]: manualPrice ?? null,
            }));
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

    const handleToggleCatalogPdfVisibility = async (row: PriceRow, checked: boolean) => {
        setSavingCatalogPdfVisibilityId(row.productId);
        setCatalogPdfVisibilityOverrides((prev) => ({
            ...prev,
            [row.productId]: checked,
        }));

        try {
            await mrpApi.updateProduct(row.productId, {
                showInCatalogPdf: checked,
            } as Partial<Product>);

            let snapshotSyncError: unknown = null;
            try {
                await mrpApi.regeneratePriceListSnapshot(snapshotMonth, 'auto');
                await mrpApi.regeneratePriceListSnapshot(snapshotMonth, 'manual');
            } catch (snapshotError) {
                snapshotSyncError = snapshotError;
            }

            toast({
                title: snapshotSyncError ? 'Guardado con aviso' : 'Listo',
                description: snapshotSyncError
                    ? getErrorMessage(snapshotSyncError, 'El producto se actualizó, pero no se pudo refrescar el PDF del mes automáticamente.')
                    : checked
                        ? `${row.productName} aparecerá en el PDF.`
                        : `${row.productName} ya no aparecerá en el PDF.`,
                variant: snapshotSyncError ? 'destructive' : undefined,
            });
        } catch (error) {
            setCatalogPdfVisibilityOverrides((prev) => ({
                ...prev,
                [row.productId]: row.showInCatalogPdf,
            }));
            toast({
                title: 'Error',
                description: getErrorMessage(error, 'No se pudo actualizar la visibilidad del PDF'),
                variant: 'destructive',
            });
        } finally {
            setSavingCatalogPdfVisibilityId(null);
        }
    };

    const handleSaveAllManualPrices = async () => {
        if (pendingManualPriceRows.length === 0) {
            toast({ title: 'Sin cambios', description: 'No hay precios manuales pendientes por guardar.' });
            return;
        }

        setSavingAllManualPrices(true);
        const savedProductIds: string[] = [];
        const savedManualPrices: Record<string, number | null> = {};
        const failedProductNames: string[] = [];

        try {
            for (const row of pendingManualPriceRows) {
                try {
                    const manualPrice = manualPriceDrafts[row.productId];
                    await mrpApi.updateProduct(row.productId, {
                        manualPrice: manualPrice ?? null,
                    } as Partial<Product>);
                    savedProductIds.push(row.productId);
                    savedManualPrices[row.productId] = manualPrice ?? null;
                } catch {
                    failedProductNames.push(row.productName);
                }
            }

            if (savedProductIds.length > 0) {
                setSavedManualPriceOverrides((prev) => ({
                    ...prev,
                    ...savedManualPrices,
                }));
            }

            if (failedProductNames.length === 0) {
                toast({
                    title: 'Listo',
                    description: `Se guardaron ${savedProductIds.length} precios manuales.`,
                });
                return;
            }

            const failedPreview = failedProductNames.slice(0, 3).join(', ');
            toast({
                title: savedProductIds.length > 0 ? 'Guardado parcial' : 'Error',
                description: savedProductIds.length > 0
                    ? `Se guardaron ${savedProductIds.length} precios. Faltaron ${failedProductNames.length}: ${failedPreview}${failedProductNames.length > 3 ? '...' : ''}.`
                    : `No se pudo guardar ningún precio. Revisa: ${failedPreview}${failedProductNames.length > 3 ? '...' : ''}.`,
                variant: 'destructive',
            });
        } finally {
            setSavingAllManualPrices(false);
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
                            onClick={() => setColumnsModalOpen(true)}
                        >
                            <Columns className="mr-1.5 h-3.5 w-3.5" />
                            Columnas
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
                            onClick={openConfigModal}
                            disabled={loadingConfig}
                        >
                            <FileText className="mr-1.5 h-3.5 w-3.5" />
                            Portada PDF
                        </Button>
                        <Button
                            onClick={handleSaveAllManualPrices}
                            size="sm"
                            className="h-9 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs"
                            disabled={savingAllManualPrices || pendingManualPriceRows.length === 0}
                        >
                            <Save className="mr-1.5 h-3.5 w-3.5" />
                            {savingAllManualPrices
                                ? `Guardando ${pendingManualPriceRows.length}...`
                                : `Guardar cambios (${pendingManualPriceRows.length})`}
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
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-7 w-7 rounded-lg bg-emerald-50 items-center justify-center shrink-0">
                            <Package className="h-3.5 w-3.5 text-emerald-600" />
                        </div>
                        <p className="text-xs font-medium text-slate-500">Productos</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{loading ? '-' : summary.uniqueProducts}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-7 w-7 rounded-lg bg-blue-50 items-center justify-center shrink-0">
                            <Layers className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <p className="text-xs font-medium text-slate-500">Variantes listadas</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{loading ? '-' : summary.variantCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-7 w-7 rounded-lg bg-orange-50 items-center justify-center shrink-0">
                            <TrendingDown className="h-3.5 w-3.5 text-orange-500" />
                        </div>
                        <p className="text-xs font-medium text-slate-500">Costo prom.</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{loading ? '-' : formatCurrency(summary.averageProductionCost)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-7 w-7 rounded-lg bg-violet-50 items-center justify-center shrink-0">
                            <TrendingUp className="h-3.5 w-3.5 text-violet-600" />
                        </div>
                        <p className="text-xs font-medium text-slate-500">Precio distribuidor prom.</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{loading ? '-' : formatCurrency(summary.averageDistributorPrice)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-7 w-7 rounded-lg bg-slate-100 items-center justify-center shrink-0">
                            <Tag className="h-3.5 w-3.5 text-slate-600" />
                        </div>
                        <p className="text-xs font-medium text-slate-500">Precio manual prom.</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{loading ? '-' : formatCurrency(summary.averageManualPrice)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-7 w-7 rounded-lg bg-pink-50 items-center justify-center shrink-0">
                            <ShoppingCart className="h-3.5 w-3.5 text-pink-500" />
                        </div>
                        <p className="text-xs font-medium text-slate-500">PVP manual prom.</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{loading ? '-' : formatCurrency(summary.averageManualPvpPrice)}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
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
                            <div className="flex flex-col items-start gap-1 text-sm">
                                <p className="text-slate-500">{loading ? 'Cargando...' : `${filteredRows.length} productos en ${groupedRows.length} grupos`}</p>
                                {!loading && (
                                    <p
                                        className={cn(
                                            'text-xs',
                                            pendingManualPriceRows.length > 0 ? 'text-amber-600' : 'text-emerald-600',
                                        )}
                                    >
                                        {pendingManualPriceRows.length > 0
                                            ? `${pendingManualPriceRows.length} cambio(s) sin guardar`
                                            : 'Sin cambios pendientes'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div
                        className={cn(
                            'border-b border-slate-100 bg-white/90 px-5 py-2',
                            maxHorizontalScroll <= 0 && 'hidden',
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <p className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                Desplazar columnas
                            </p>
                            <input
                                type="range"
                                min={0}
                                max={maxHorizontalScroll}
                                value={Math.min(tableScrollMetrics.scrollLeft, maxHorizontalScroll)}
                                onChange={(e) => {
                                    const nextValue = Number(e.target.value);
                                    if (!tableScrollbarRef.current) return;
                                    tableScrollbarRef.current.scrollLeft = nextValue;
                                    setTableScrollMetrics((prev) => ({ ...prev, scrollLeft: nextValue }));
                                }}
                                className="h-2 flex-1 accent-emerald-600 cursor-pointer"
                            />
                            <p className="shrink-0 text-[11px] font-medium text-slate-400">
                                {Math.round((Math.min(tableScrollMetrics.scrollLeft, maxHorizontalScroll) / Math.max(1, maxHorizontalScroll)) * 100)}%
                            </p>
                        </div>
                    </div>
                </div>

                <div ref={tableScrollbarRef} className="overflow-x-auto">
                    <table className="min-w-full w-max caption-bottom text-sm">
                        <TableHeader>
                            <TableRow className="bg-emerald-700 hover:bg-emerald-700">
                                <TableHead className="whitespace-nowrap bg-emerald-700 text-white font-semibold">Codigo</TableHead>
                                <TableHead className="whitespace-nowrap bg-emerald-700 text-white font-semibold">Articulo</TableHead>
                                {visibleColumns.pdfVisibility && <TableHead className="whitespace-nowrap bg-emerald-700 text-white font-semibold text-center">PDF</TableHead>}
                                {visibleColumns.group && <TableHead className="whitespace-nowrap bg-emerald-700 text-white font-semibold">Grupo</TableHead>}
                                {visibleColumns.sizes && <TableHead className="whitespace-nowrap bg-emerald-700 text-white font-semibold">Tallas</TableHead>}
                                {visibleColumns.colors && <TableHead className="whitespace-nowrap bg-emerald-700 text-white font-semibold">Colores</TableHead>}
                                {visibleColumns.productionCost && <TableHead className="whitespace-nowrap bg-emerald-700 text-white font-semibold text-right">Costo produccion</TableHead>}
                                {visibleColumns.distributorPrice && <TableHead className="whitespace-nowrap bg-emerald-700 text-white font-semibold text-right">Precio automatico</TableHead>}
                                {visibleColumns.pvpPrice && <TableHead className="whitespace-nowrap bg-emerald-700 text-white font-semibold text-right">PVP automatico</TableHead>}
                                {visibleColumns.manualPrice && <TableHead className="whitespace-nowrap bg-emerald-700 text-white font-semibold">Precio manual</TableHead>}
                                {visibleColumns.manualPvpPrice && <TableHead className="whitespace-nowrap bg-emerald-700 text-white font-semibold text-right">PVP manual</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={visibleColumnCount} className="h-32 text-center text-slate-500">
                                        Cargando lista de precios...
                                    </TableCell>
                                </TableRow>
                            ) : groupedRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={visibleColumnCount} className="h-32 text-center text-slate-500">
                                        No hay productos que coincidan con los filtros actuales.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                groupedRows.flatMap((group) => ([
                                    <TableRow key={`group-${group.groupName}`} className="bg-emerald-800 hover:bg-emerald-800">
                                        <TableCell colSpan={visibleColumnCount} className="py-2 text-center font-bold uppercase tracking-[0.2em] text-white">
                                            {group.groupName}
                                        </TableCell>
                                    </TableRow>,
                                    ...group.rows.map((row) => (
                                        (() => {
                                            const manualPriceAlert = getManualPriceAlert(row.productionCost, manualPriceDrafts[row.productId]);
                                            const automaticMarginPercent = calculateMarginPercent(row.productionCost, row.distributorPrice);
                                            const automaticPriceAlert = getManualPriceAlert(row.productionCost, row.distributorPrice);
                                            const hasPendingManualPrice = hasPendingManualPriceChange(row, manualPriceDrafts[row.productId]);
                                            const isSavingManualPrice = savingManualPriceId === row.productId || (savingAllManualPrices && hasPendingManualPrice);
                                            const pdfVisibilityInputId = `pdf-visible-${row.productId}`;

                                            return (
                                                <TableRow
                                                    key={row.productId}
                                                    className={cn(
                                                        'transition-colors',
                                                        isSavingManualPrice && 'bg-blue-50/70 hover:bg-blue-100/70',
                                                        !isSavingManualPrice && hasPendingManualPrice && 'bg-amber-50/70 hover:bg-amber-100/70',
                                                        !isSavingManualPrice && !hasPendingManualPrice && 'hover:bg-emerald-50/30',
                                                    )}
                                                >
                                                    <TableCell className="font-medium text-slate-900">{row.productSku}</TableCell>
                                                    <TableCell className="min-w-[280px]">{row.productName}</TableCell>
                                                    {visibleColumns.pdfVisibility && (
                                                        <TableCell className="text-center">
                                                            <label
                                                                htmlFor={pdfVisibilityInputId}
                                                                className={cn(
                                                                    'flex min-w-[120px] items-center justify-center gap-2',
                                                                    savingCatalogPdfVisibilityId === row.productId || savingAllManualPrices
                                                                        ? 'cursor-not-allowed'
                                                                        : 'cursor-pointer',
                                                                )}
                                                            >
                                                                <Checkbox
                                                                    id={pdfVisibilityInputId}
                                                                    checked={row.showInCatalogPdf}
                                                                    disabled={savingCatalogPdfVisibilityId === row.productId || savingAllManualPrices}
                                                                    onCheckedChange={(checked) => handleToggleCatalogPdfVisibility(row, checked === true)}
                                                                />
                                                                <span
                                                                    className={cn(
                                                                        'text-xs font-medium',
                                                                        savingCatalogPdfVisibilityId === row.productId && 'text-blue-600',
                                                                        savingCatalogPdfVisibilityId !== row.productId && row.showInCatalogPdf && 'text-emerald-700',
                                                                        savingCatalogPdfVisibilityId !== row.productId && !row.showInCatalogPdf && 'text-slate-400',
                                                                    )}
                                                                >
                                                                    {savingCatalogPdfVisibilityId === row.productId
                                                                        ? 'Actualizando...'
                                                                        : row.showInCatalogPdf
                                                                            ? 'Visible'
                                                                            : 'Oculto'}
                                                                </span>
                                                            </label>
                                                        </TableCell>
                                                    )}
                                                    {visibleColumns.group && <TableCell>{row.groupName}</TableCell>}
                                                    {visibleColumns.sizes && <TableCell className="max-w-[220px] whitespace-normal">{row.sizes || 'N/A'}</TableCell>}
                                                    {visibleColumns.colors && <TableCell className="max-w-[220px] whitespace-normal">{row.colors || 'N/A'}</TableCell>}
                                                    {visibleColumns.productionCost && <TableCell className="text-right">{formatCurrency(row.productionCost)}</TableCell>}
                                                    {visibleColumns.distributorPrice && (
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <span>{formatCurrency(row.distributorPrice)}</span>
                                                                {automaticMarginPercent != null && (
                                                                    <div className="relative group">
                                                                        <div
                                                                            className={cn(
                                                                                'flex h-4 w-4 items-center justify-center rounded-full cursor-help',
                                                                                automaticPriceAlert?.tone === 'danger' && 'text-red-600',
                                                                                automaticPriceAlert?.tone === 'warning' && 'text-orange-600',
                                                                                automaticPriceAlert?.tone === 'caution' && 'text-yellow-600',
                                                                                !automaticPriceAlert && 'text-slate-400',
                                                                            )}
                                                                        >
                                                                            <Info className="h-3.5 w-3.5" />
                                                                        </div>
                                                                        <div
                                                                            className={cn(
                                                                                'pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-64 rounded-md border bg-white p-2.5 text-left text-[11px] leading-tight shadow-lg group-hover:block',
                                                                                automaticPriceAlert?.tone === 'danger' && 'border-red-200 text-red-700',
                                                                                automaticPriceAlert?.tone === 'warning' && 'border-orange-200 text-orange-700',
                                                                                automaticPriceAlert?.tone === 'caution' && 'border-yellow-200 text-yellow-700',
                                                                                !automaticPriceAlert && 'border-slate-200 text-slate-600',
                                                                            )}
                                                                        >
                                                                            {automaticPriceAlert ? (
                                                                                <>
                                                                                    {automaticPriceAlert.message} Referencia: {formatCurrency(automaticPriceAlert.referencePrice)}.
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    Margen estimado: {automaticMarginPercent.toFixed(1)}%.
                                                                                    <br />
                                                                                    Costo base: {formatCurrency(row.productionCost)}.
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    )}
                                                    {visibleColumns.pvpPrice && <TableCell className="text-right">{formatCurrency(row.pvpPrice)}</TableCell>}
                                                    {visibleColumns.manualPrice && (
                                                        <TableCell>
                                                            <div className="min-w-[180px] space-y-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="relative w-[150px] shrink-0">
                                                                        <CurrencyInput
                                                                            value={manualPriceDrafts[row.productId]}
                                                                            onValueChange={(value) => setManualPriceDrafts((prev) => ({ ...prev, [row.productId]: value }))}
                                                                            disabled={savingAllManualPrices}
                                                                            className={cn(
                                                                                'h-9',
                                                                                manualPriceAlert && 'pr-10',
                                                                                manualPriceAlert?.tone === 'danger' && 'border-red-300 bg-red-50/60 focus-visible:ring-red-400',
                                                                                manualPriceAlert?.tone === 'warning' && 'border-orange-300 bg-orange-50/60 focus-visible:ring-orange-400',
                                                                                manualPriceAlert?.tone === 'caution' && 'border-yellow-300 bg-yellow-50/60 focus-visible:ring-yellow-400',
                                                                            )}
                                                                        />
                                                                        {manualPriceAlert && (
                                                                            <div className="absolute inset-y-0 right-2 flex items-center group">
                                                                                <div
                                                                                    className={cn(
                                                                                        'flex h-5 w-5 items-center justify-center rounded-full cursor-help',
                                                                                        manualPriceAlert.tone === 'danger' && 'text-red-600',
                                                                                        manualPriceAlert.tone === 'warning' && 'text-orange-600',
                                                                                        manualPriceAlert.tone === 'caution' && 'text-yellow-600',
                                                                                    )}
                                                                                >
                                                                                    <AlertTriangle className="h-4 w-4" />
                                                                                </div>
                                                                                <div
                                                                                    className={cn(
                                                                                        'pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-64 rounded-md border bg-white p-2.5 text-[11px] leading-tight shadow-lg group-hover:block',
                                                                                        manualPriceAlert.tone === 'danger' && 'border-red-200 text-red-700',
                                                                                        manualPriceAlert.tone === 'warning' && 'border-orange-200 text-orange-700',
                                                                                        manualPriceAlert.tone === 'caution' && 'border-yellow-200 text-yellow-700',
                                                                                    )}
                                                                                >
                                                                                    {manualPriceAlert.message} Referencia: {formatCurrency(manualPriceAlert.referencePrice)}.
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-10 w-10 shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                                        onClick={() => handleSaveManualPrice(row)}
                                                                        disabled={savingAllManualPrices || savingManualPriceId === row.productId}
                                                                        title={savingAllManualPrices ? 'Guardado masivo en curso' : savingManualPriceId === row.productId ? 'Guardando...' : 'Guardar precio manual'}
                                                                    >
                                                                        <Save className={cn('h-[22px] w-[22px]', isSavingManualPrice && 'animate-pulse')} />
                                                                    </Button>
                                                                </div>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={cn(
                                                                        'w-fit text-[10px] uppercase tracking-wide',
                                                                        isSavingManualPrice && 'border-blue-200 bg-blue-50 text-blue-700',
                                                                        !isSavingManualPrice && hasPendingManualPrice && 'border-amber-200 bg-amber-50 text-amber-700',
                                                                        !isSavingManualPrice && !hasPendingManualPrice && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                                                                    )}
                                                                >
                                                                    {isSavingManualPrice ? 'Guardando' : hasPendingManualPrice ? 'Pendiente' : 'Guardado'}
                                                                </Badge>
                                                            </div>
                                                        </TableCell>
                                                    )}
                                                    {visibleColumns.manualPvpPrice && (
                                                        <TableCell className="text-right">{formatCurrency(calculateManualPvpPrice(manualPriceDrafts[row.productId]))}</TableCell>
                                                    )}
                                                </TableRow>
                                            );
                                        })()
                                    )),
                                ]))
                            )}
                        </TableBody>
                    </table>
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
                            <Checkbox
                                checked={configForm.showCover}
                                onCheckedChange={(checked) => setConfigForm((prev) => ({ ...prev, showCover: checked === true }))}
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
                                <Select value={configForm.orientation} onValueChange={(value) => setConfigForm((prev) => ({ ...prev, orientation: value as 'landscape' | 'portrait' }))}>
                                    <SelectTrigger className="h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="landscape">Horizontal (Landscape)</SelectItem>
                                        <SelectItem value="portrait">Vertical (Portrait)</SelectItem>
                                    </SelectContent>
                                </Select>
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

            <Dialog open={columnsModalOpen} onOpenChange={setColumnsModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Columnas de la Tabla</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500">
                            Por defecto la tabla inicia compacta. Activa solo las columnas que necesites ver.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3">
                            {TABLE_COLUMN_LABELS.map((column) => (
                                <label key={column.key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <Checkbox
                                        checked={visibleColumns[column.key]}
                                        onCheckedChange={(checked) => setVisibleColumns((prev) => ({
                                            ...prev,
                                            [column.key]: checked === true,
                                        }))}
                                    />
                                    <span>{column.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setVisibleColumns(DEFAULT_TABLE_COLUMNS)}
                        >
                            Restaurar por defecto
                        </Button>
                        <Button onClick={() => setColumnsModalOpen(false)}>
                            Listo
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
                                Cada descarga usa un snapshot trazable por mes y fuente: A (automático) o M (manual).
                            </p>
                        </div>

                        {downloadFormat === 'pdf' && (
                            <div className="space-y-2">
                                <Label>Columnas del PDF</Label>
                                <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3">
                                    {PDF_COLUMN_LABELS.map((column) => (
                                        <label key={column.key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                            <Checkbox
                                                checked={downloadPdfColumns[column.key]}
                                                onCheckedChange={(checked) => setDownloadPdfColumns((prev) => ({
                                                    ...prev,
                                                    [column.key]: checked === true,
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
