import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';
import { mrpApi } from '@/services/mrpApi';
import { useOperationalConfigQuery } from '@/hooks/mrp/useOperationalConfig';
import { useMrpQueryErrorToast } from '@/hooks/mrp/useMrpQueryErrorToast';
import { calculateShippingSplit } from '@/utils/shipping';
import { ArrowLeft, Plus, Users, Package, ChevronsUpDown, Check, Loader2, FileText, ShieldCheck, ChevronDown, ChevronRight, StickyNote } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { ProductTaxStatus, QuotationItemLineType, QuotationTermsTemplate } from '@scaffold/types';

type ItemForm = {
    lineType: QuotationItemLineType;
    isCatalogItem: boolean;
    productSearch: string;
    productId?: string;
    variantId?: string;
    customDescription?: string;
    customSku?: string;
    noteText?: string;
    quantity: number;
    approvedQuantity: number;
    unitPrice: number;
    discountPercent: number;
    taxRate: number;
};

type ProductOption = {
    id: string;
    name: string;
    sku: string;
    reference?: string;
    variants?: Array<{
        id: string;
        name: string;
        price: number;
        cost: number;
        targetMargin: number;
        taxStatus: ProductTaxStatus;
        taxRate: number;
    }>;
};

const createItem = (): ItemForm => ({
    lineType: QuotationItemLineType.ITEM,
    isCatalogItem: true,
    productSearch: '',
    productId: undefined,
    variantId: undefined,
    customDescription: '',
    customSku: '',
    noteText: '',
    quantity: 1,
    approvedQuantity: 1,
    unitPrice: 0,
    discountPercent: 0,
    taxRate: 0,
});

const createNoteItem = (): ItemForm => ({
    lineType: QuotationItemLineType.NOTE,
    isCatalogItem: false,
    productSearch: '',
    productId: undefined,
    variantId: undefined,
    customDescription: '',
    customSku: '',
    noteText: '',
    quantity: 0,
    approvedQuantity: 0,
    unitPrice: 0,
    discountPercent: 0,
    taxRate: 0,
});

const COMMERCIAL_TERMS_HEADING_PREFIX = 'CONDICIONES COMERCIALES - ';

type CommercialSections = {
    validity: boolean;
    payment: boolean;
    production: boolean;
    warranty: boolean;
    cancellations: boolean;
    legal: boolean;
};

type CommercialTermsForm = QuotationTermsTemplate;

const defaultCommercialTerms: CommercialTermsForm = {
    manualText: '',
    enabled: true,
    companyName: 'Fabricacion Ortopedicos Pereira',
    validityDays: 30,
    advancePaymentPercent: 50,
    deliveryPaymentPercent: 50,
    habitualClientTermLabel: 'Neto 15/30 dias',
    lateFeePercent: 1.5,
    ivaPercent: 19,
    includeDianRetention: true,
    productionMinDays: 7,
    productionMaxDays: 15,
    materialConstraintLabel: 'cuerina, neopreno, barras plasticas/metalicas',
    highVolumeThresholdUnits: 100,
    highVolumeExtraDays: 5,
    shippingMinDays: 2,
    shippingMaxDays: 5,
    shippingCarrierLabel: 'Servientrega',
    customerPaysFreight: true,
    transitRiskBuyer: true,
    warrantyMonths: 6,
    restockPercent: 10,
    sections: {
        validity: true,
        payment: true,
        production: true,
        warranty: true,
        cancellations: true,
        legal: true,
    },
};

const mergeCommercialTermsTemplate = (template?: Partial<CommercialTermsForm> | null): CommercialTermsForm => ({
    ...defaultCommercialTerms,
    ...(template || {}),
    sections: {
        ...defaultCommercialTerms.sections,
        ...(template?.sections || {}),
    },
});

const DAY_MS = 24 * 60 * 60 * 1000;

const parseInputDate = (value: string) => {
    if (!value) return null;
    const [y, m, d] = value.split('-').map((row) => Number(row));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
};

const formatInputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getTodayAtMidnight = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const validityDaysFromDate = (validUntil: string) => {
    const target = parseInputDate(validUntil);
    if (!target) return 0;
    const today = getTodayAtMidnight();
    const diff = Math.round((target.getTime() - today.getTime()) / DAY_MS);
    return Math.max(0, diff);
};

const validUntilFromDays = (days: number) => {
    const safeDays = Math.max(0, Number(days || 0));
    const date = getTodayAtMidnight();
    date.setDate(date.getDate() + safeDays);
    return formatInputDate(date);
};

const splitCustomNotes = (raw?: string) => {
    const content = (raw || '').trim();
    if (!content) return '';
    const sectionStart = content.indexOf(COMMERCIAL_TERMS_HEADING_PREFIX);
    if (sectionStart < 0) return content;
    return content.slice(0, sectionStart).trim();
};

const extractCommercialTermsBlock = (raw?: string) => {
    const content = (raw || '').trim();
    if (!content) return '';
    const sectionStart = content.indexOf(COMMERCIAL_TERMS_HEADING_PREFIX);
    if (sectionStart < 0) return '';
    return content.slice(sectionStart).trim();
};

const buildCommercialTermsText = (terms: CommercialTermsForm) => {
    if (!terms.enabled) return '';
    const lines: string[] = [`${COMMERCIAL_TERMS_HEADING_PREFIX}${terms.companyName}`, ''];
    let sectionNumber = 1;

    if (terms.sections.validity) {
        lines.push(
            `${sectionNumber}. VIGENCIA: ${terms.validityDays} dias desde emision. Precios sujetos a cambios por materiales o variacion USD/COP.`,
            '',
        );
        sectionNumber += 1;
    }

    if (terms.sections.payment) {
        lines.push(`${sectionNumber}. PAGO:`);
        lines.push(`- ${terms.advancePaymentPercent}% anticipo al aprobar (transferencia/PSE).`);
        lines.push(`- ${terms.deliveryPaymentPercent}% contra entrega.`);
        lines.push(`- Clientes habituales: ${terms.habitualClientTermLabel}.`);
        lines.push(`- Mora: ${terms.lateFeePercent}% mensual. IVA ${terms.ivaPercent}%.`);
        if (terms.includeDianRetention) {
            lines.push('- Retencion DIAN aplica cuando corresponda.');
        }
        lines.push('');
        sectionNumber += 1;
    }

    if (terms.sections.production) {
        lines.push(`${sectionNumber}. PRODUCCION Y ENTREGA (Made to Order):`);
        lines.push(`- Tiempo estimado: ${terms.productionMinDays}-${terms.productionMaxDays} dias habiles desde anticipo.`);
        lines.push(`- Sujeto a disponibilidad de materiales (${terms.materialConstraintLabel}).`);
        lines.push(`- Pedidos mayores a ${terms.highVolumeThresholdUnits} uds: +${terms.highVolumeExtraDays} dias habiles.`);
        lines.push('- Actualizaciones por WhatsApp/plataforma.');
        lines.push(
            `- Envio nacional: +${terms.shippingMinDays}-${terms.shippingMaxDays} dias (${terms.shippingCarrierLabel}).`,
        );
        lines.push(`- Flete: ${terms.customerPaysFreight ? 'cliente asume costo' : 'empresa asume costo'}.`);
        lines.push(`- Riesgo en transito: ${terms.transitRiskBuyer ? 'comprador' : 'vendedor'}.`);
        lines.push('');
        sectionNumber += 1;
    }

    if (terms.sections.warranty) {
        lines.push(
            `${sectionNumber}. GARANTIAS: ${terms.warrantyMonths} meses por defectos de fabrica. No aplica por mal uso. Devoluciones con autorizacion previa (${terms.restockPercent}% restock).`,
            '',
        );
        sectionNumber += 1;
    }

    if (terms.sections.cancellations) {
        lines.push(
            `${sectionNumber}. CAMBIOS/CANCELACIONES: deben solicitarse por escrito. El anticipo no es reembolsable si la produccion ya inicio.`,
            '',
        );
        sectionNumber += 1;
    }

    if (terms.sections.legal) {
        lines.push(
            `${sectionNumber}. GENERAL: fuerza mayor exime responsabilidades. Aceptacion por firma digital/plataforma. Legislacion aplicable en Colombia (DIAN/Ley 1480).`,
            '',
        );
    }

    return lines.join('\n').trim();
};

const composeQuotationNotes = (
    freeNotes: string,
    terms: CommercialTermsForm,
    options?: { manualTermsEnabled?: boolean; manualTermsText?: string }
) => {
    const notesText = freeNotes.trim();
    const manualTermsText = (options?.manualTermsText || '').trim();
    const termsText = options?.manualTermsEnabled && manualTermsText
        ? manualTermsText
        : buildCommercialTermsText(terms);
    if (notesText && termsText) return `${notesText}\n\n${termsText}`;
    return notesText || termsText || '';
};

export default function QuotationFormPage() {
    const { id } = useParams();
    const isEditMode = Boolean(id);
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    // Select options
    const [customers, setCustomers] = useState<Array<{
        id: string;
        name: string;
        documentNumber?: string;
        quotationTermsTemplate?: QuotationTermsTemplate | null;
    }>>([]);
    const [products, setProducts] = useState<ProductOption[]>([]);

    // Data Form
    const [customerId, setCustomerId] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [notes, setNotes] = useState('');
    const [commercialTerms, setCommercialTerms] = useState<CommercialTermsForm>(defaultCommercialTerms);
    const [commercialTermsExpanded, setCommercialTermsExpanded] = useState(false);
    const [templateHydrated, setTemplateHydrated] = useState(false);
    const [saveAsCustomerTemplate, setSaveAsCustomerTemplate] = useState(false);
    const [manualTermsEnabled, setManualTermsEnabled] = useState(false);
    const [manualTermsText, setManualTermsText] = useState('');
    const [syncValidityWithDate, setSyncValidityWithDate] = useState(true);
    const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
    const [shippingAmount, setShippingAmount] = useState(0);
    const [items, setItems] = useState<ItemForm[]>([createItem()]);

    // UI state
    const [showValidation, setShowValidation] = useState(false);
    const [openCustomerCombobox, setOpenCustomerCombobox] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [activeCatalogComboboxIdx, setActiveCatalogComboboxIdx] = useState<number | null>(null);
    const [catalogHighlightByIndex, setCatalogHighlightByIndex] = useState<Record<number, number>>({});

    const [focusedDiscountIndex, setFocusedDiscountIndex] = useState<number | null>(null);
    const { data: operationalConfig, error: operationalConfigError } = useOperationalConfigQuery();
    useMrpQueryErrorToast(operationalConfigError, 'No se pudo cargar configuración de envíos');

    const getGlobalTermsTemplate = () =>
        mergeCommercialTermsTemplate(operationalConfig?.quotationTermsTemplate || defaultCommercialTerms);

    const applyTemplateForCustomer = (selectedCustomerId: string) => {
        const globalTemplate = getGlobalTermsTemplate();
        const customer = customers.find((row) => row.id === selectedCustomerId);
        const customerTemplate = customer?.quotationTermsTemplate
            ? mergeCommercialTermsTemplate(customer.quotationTermsTemplate)
            : null;
        const selectedTemplate = customerTemplate || globalTemplate;
        setCommercialTerms(selectedTemplate);
        if (selectedTemplate.manualText?.trim()) {
            setManualTermsEnabled(true);
            setManualTermsText(selectedTemplate.manualText.trim());
        } else {
            setManualTermsEnabled(false);
            setManualTermsText('');
        }
    };

    useEffect(() => {
        if (templateHydrated) return;
        if (!operationalConfig?.quotationTermsTemplate) {
            setTemplateHydrated(true);
            return;
        }
        setCommercialTerms(mergeCommercialTermsTemplate(operationalConfig.quotationTermsTemplate));
        setTemplateHydrated(true);
    }, [operationalConfig?.quotationTermsTemplate, templateHydrated]);

    useEffect(() => {
        const load = async () => {
            try {
                setPageLoading(true);
                const [customersData, productsData] = await Promise.all([
                    mrpApi.listCustomers(''),
                    mrpApi.getProducts(1, 300, ''), // In a real app we'd paginate/search backend
                ]);
                setCustomers(customersData.map((c) => ({
                    id: c.id,
                    name: c.name,
                    documentNumber: c.documentNumber,
                    quotationTermsTemplate: c.quotationTermsTemplate,
                })));
                const productRows = await Promise.all(productsData.products.map(async (p) => {
                    // This is inefficient but matching legacy behavior
                    const full = await mrpApi.getProduct(p.id);
                    return {
                        id: full.id,
                        name: full.name,
                        sku: full.sku,
                        reference: (full as any).productReference || '',
                        variants: full.variants?.map((v) => ({
                            id: v.id,
                            name: v.name,
                            price: Number(v.price || 0),
                            cost: Number(v.cost || 0),
                            targetMargin: Number(v.targetMargin ?? 0.4),
                            taxStatus: v.taxStatus ?? ProductTaxStatus.EXCLUIDO,
                            taxRate: Number(v.taxRate || 0),
                        })) || [],
                    };
                }));
                setProducts(productRows);

                if (isEditMode && id) {
                    const q = await mrpApi.getQuotation(id);
                    const currentNotes = q.notes || '';
                    setCustomerId((q as any).customerId || (q as any).customer?.id || '');
                    setValidUntil(q.validUntil ? new Date(q.validUntil as string).toISOString().slice(0, 10) : '');
                    setNotes(splitCustomNotes(currentNotes));
                    const termsBlock = extractCommercialTermsBlock(currentNotes);
                    if (termsBlock) {
                        setManualTermsEnabled(true);
                        setManualTermsText(termsBlock);
                    }
                    setGlobalDiscountPercent(Number((q as any).globalDiscountPercent || 0));
                    setItems((q.items || []).map((it: any) => {
                        if (it.lineType === QuotationItemLineType.NOTE) {
                            return {
                                ...createNoteItem(),
                                noteText: it.noteText || it.customDescription || '',
                            };
                        }
                        const netUnitPrice = Number(it.unitPrice || 0);
                        const discountPercent = Number(it.discountPercent || 0);
                        const listUnitPrice = discountPercent > 0 && discountPercent < 100
                            ? netUnitPrice / (1 - (discountPercent / 100))
                            : netUnitPrice;
                        return {
                            lineType: QuotationItemLineType.ITEM,
                            isCatalogItem: it.isCatalogItem !== false,
                            productSearch: it.isCatalogItem ? (it.product?.sku ? `${it.product.sku} ${it.product?.name}` : '') : '',
                            productId: it.productId || it.product?.id,
                            variantId: it.variantId || it.variant?.id,
                            customDescription: it.customDescription || '',
                            customSku: it.customSku || '',
                            noteText: '',
                            quantity: Number(it.quantity || 0),
                            approvedQuantity: Number(it.approvedQuantity ?? it.quantity ?? 0),
                            unitPrice: Number.isFinite(listUnitPrice) ? Number(listUnitPrice.toFixed(4)) : 0,
                            discountPercent,
                            taxRate: Number(it.taxRate || 0),
                        };
                    }));
                }
            } catch (error) {
                toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo cargar formulario'), variant: 'destructive' });
            } finally {
                setPageLoading(false);
            }
        };
        load();
    }, [id, isEditMode, toast]);

    const addItem = () => setItems((prev) => [...prev, createItem()]);
    const addNoteLine = () => setItems((prev) => [...prev, createNoteItem()]);

    const addVariantForItem = (index: number) => {
        const source = items[index];
        if (!source || source.lineType === QuotationItemLineType.NOTE || !source.isCatalogItem || !source.productId) {
            toast({
                title: 'Selecciona producto',
                description: 'Primero selecciona un producto del catálogo para agregar otra variante.',
                variant: 'destructive',
            });
            return;
        }

        const product = products.find((p) => p.id === source.productId);
        const productVariants = product?.variants || [];
        if (productVariants.length === 0) {
            toast({
                title: 'Sin variantes',
                description: 'Este producto no tiene variantes configuradas.',
                variant: 'destructive',
            });
            return;
        }

        const usedVariantIds = new Set(
            items
                .filter((item) => item.isCatalogItem && item.productId === source.productId && item.variantId)
                .map((item) => item.variantId as string)
        );
        const nextVariant = productVariants.find((variant) => !usedVariantIds.has(variant.id));
        const suggestedVariantId = nextVariant?.id;
        const suggestedUnitPrice = nextVariant?.price ?? source.unitPrice;
        const suggestedTax = resolveCatalogTax(source.productId, suggestedVariantId);

        const clonedLine: ItemForm = {
            lineType: QuotationItemLineType.ITEM,
            isCatalogItem: true,
            productSearch: source.productSearch,
            productId: source.productId,
            variantId: suggestedVariantId,
            customDescription: '',
            customSku: '',
            noteText: '',
            quantity: 1,
            approvedQuantity: 1,
            unitPrice: suggestedUnitPrice,
            discountPercent: globalDiscountPercent > 0 ? 0 : Number(source.discountPercent || 0),
            taxRate: suggestedTax.taxRate,
        };

        setItems((prev) => [
            ...prev.slice(0, index + 1),
            clonedLine,
            ...prev.slice(index + 1),
        ]);
    };

    const removeItem = (idx: number) => {
        if (items.length === 1) {
            toast({ title: 'Error', description: 'Debe haber al menos un ítem', variant: 'destructive' });
            return;
        }
        setItems((prev) => prev.filter((_, i) => i !== idx));
    };

    const patchItem = (idx: number, patch: Partial<ItemForm>) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
    const hasPerItemDiscount = useMemo(
        () => items.some((it) => it.lineType === QuotationItemLineType.ITEM && Number(it.discountPercent || 0) > 0),
        [items]
    );

    const updateGlobalDiscount = (value: number) => {
        const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
        const limited = globalDiscountLimit === null ? safe : Math.min(safe, globalDiscountLimit);
        setGlobalDiscountPercent(limited);
        if (limited > 0) {
            setItems((prev) => prev.map((it) => ({ ...it, discountPercent: 0 })));
        }
    };

    const resolveCatalogUnitPrice = (productId?: string, variantId?: string): number => {
        if (!productId) return 0;
        const product = products.find((p) => p.id === productId);
        if (!product) return 0;
        if (variantId) {
            const variant = product.variants?.find((v) => v.id === variantId);
            return Number(variant?.price || 0);
        }
        const firstVariantPrice = Number(product.variants?.[0]?.price || 0);
        return firstVariantPrice;
    };

    const resolveCatalogTax = (productId?: string, variantId?: string) => {
        if (!productId) return { taxStatus: ProductTaxStatus.EXCLUIDO, taxRate: 0 };
        const product = products.find((p) => p.id === productId);
        if (!product) return { taxStatus: ProductTaxStatus.EXCLUIDO, taxRate: 0 };
        const variant = variantId
            ? product.variants?.find((v) => v.id === variantId)
            : product.variants?.[0];
        if (!variant) return { taxStatus: ProductTaxStatus.EXCLUIDO, taxRate: 0 };
        if (variant.taxStatus !== ProductTaxStatus.GRAVADO) {
            return { taxStatus: variant.taxStatus, taxRate: 0 };
        }
        return { taxStatus: variant.taxStatus, taxRate: Number(variant.taxRate || 0) };
    };

    const getTaxStatusLabel = (status: ProductTaxStatus) => {
        switch (status) {
            case ProductTaxStatus.GRAVADO:
                return 'Gravado';
            case ProductTaxStatus.EXENTO:
                return 'Exento';
            case ProductTaxStatus.EXCLUIDO:
            default:
                return 'Excluido';
        }
    };

    const resolveDiscountLimit = (item: ItemForm) => {
        if (!item.isCatalogItem || !item.productId) return null;
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const variant = item.variantId
            ? product.variants?.find((v) => v.id === item.variantId)
            : product.variants?.[0];
        if (!variant) return null;

        const listPrice = Number(item.unitPrice || 0);
        if (listPrice <= 0) return null;

        const minAllowedMargin = Math.max(0, Number(variant.targetMargin || 0.4) - 0.1);
        const minAllowedPrice = minAllowedMargin >= 1
            ? Number.POSITIVE_INFINITY
            : Number(variant.cost || 0) / (1 - minAllowedMargin);

        const maxDiscountPercent = Math.max(0, (1 - (minAllowedPrice / listPrice)) * 100);
        const maxDiscountValue = Math.max(0, listPrice - minAllowedPrice);
        return {
            maxDiscountPercent: Number.isFinite(maxDiscountPercent) ? maxDiscountPercent : 0,
            maxDiscountValue: Number.isFinite(maxDiscountValue) ? maxDiscountValue : 0,
            minAllowedMarginPercent: minAllowedMargin * 100,
        };
    };

    const globalDiscountLimit = useMemo(() => {
        const limits = items
            .filter((it) => it.lineType === QuotationItemLineType.ITEM)
            .map((it) => resolveDiscountLimit(it)?.maxDiscountPercent)
            .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
        if (limits.length === 0) return null;
        return Math.max(0, Math.min(...limits));
    }, [items, products]);

    const totalsPreview = useMemo(() => {
        const summary = items.reduce((acc, it) => {
            if (it.lineType === QuotationItemLineType.NOTE) return acc;
            const qty = Number(it.quantity || 0);
            const listUnit = Number(it.unitPrice || 0);
            const listSubtotal = listUnit * qty;
            const effectiveDiscount = globalDiscountPercent > 0 ? globalDiscountPercent : Number(it.discountPercent || 0);
            const netUnit = listUnit * (1 - effectiveDiscount / 100);
            const discountedSubtotal = netUnit * qty;
            const tax = discountedSubtotal * (Number(it.taxRate || 0) / 100);
            return {
                listSubtotal: acc.listSubtotal + listSubtotal,
                discountedSubtotal: acc.discountedSubtotal + discountedSubtotal,
                taxTotal: acc.taxTotal + tax,
            };
        }, { listSubtotal: 0, discountedSubtotal: 0, taxTotal: 0 });

        return {
            listSubtotal: summary.listSubtotal,
            discountAmount: summary.listSubtotal - summary.discountedSubtotal,
            discountedSubtotal: summary.discountedSubtotal,
            taxTotal: summary.taxTotal,
            total: summary.discountedSubtotal + summary.taxTotal,
        };
    }, [globalDiscountPercent, items]);

    const shippingSplit = useMemo(() => {
        const orderThreshold = Number(operationalConfig?.shippingOrderCoverageThreshold || 0);
        const fullLimit = Number(operationalConfig?.shippingCoverageLimitFull || 0);
        const sharedLimit = Number(operationalConfig?.shippingCoverageLimitShared || 0);
        return calculateShippingSplit(totalsPreview.total, shippingAmount, orderThreshold, fullLimit, sharedLimit);
    }, [
        shippingAmount,
        totalsPreview.total,
        operationalConfig?.shippingOrderCoverageThreshold,
        operationalConfig?.shippingCoverageLimitFull,
        operationalConfig?.shippingCoverageLimitShared,
    ]);

    const getFilteredProducts = (search: string) => {
        const normalized = search.trim().toLowerCase();
        const source = products;
        if (!normalized) return source.slice(0, 50);
        return source
            .filter((product) =>
                product.name.toLowerCase().includes(normalized) ||
                product.sku.toLowerCase().includes(normalized) ||
                (product.reference || '').toLowerCase().includes(normalized)
            )
            .slice(0, 100);
    };

    const handleProductChange = (index: number, productId: string) => {
        const selectedProduct = products.find(p => p.id === productId);
        const tax = resolveCatalogTax(productId, undefined);
        patchItem(index, {
            productId,
            variantId: undefined,
            productSearch: selectedProduct ? `${selectedProduct.sku} ${selectedProduct.name}` : '',
            unitPrice: resolveCatalogUnitPrice(productId, undefined),
            taxRate: tax.taxRate,
        });
    };

    const handleCatalogInputKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
        const list = getFilteredProducts(items[index]?.productSearch || '');
        if (list.length === 0) return;
        const current = catalogHighlightByIndex[index] ?? 0;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveCatalogComboboxIdx(index);
            setCatalogHighlightByIndex((prev) => ({
                ...prev,
                [index]: Math.min(current + 1, list.length - 1),
            }));
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveCatalogComboboxIdx(index);
            setCatalogHighlightByIndex((prev) => ({
                ...prev,
                [index]: Math.max(current - 1, 0),
            }));
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            const selected = list[current] || list[0];
            if (selected) {
                handleProductChange(index, selected.id);
                setActiveCatalogComboboxIdx(null);
            }
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            setActiveCatalogComboboxIdx(null);
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowValidation(true);

        if (!customerId) {
            toast({
                title: 'Dato requerido',
                description: 'Selecciona un cliente.',
                variant: 'destructive',
            });
            return;
        }

        if (!items.some((row) => row.lineType === QuotationItemLineType.ITEM)) {
            toast({
                title: 'Dato requerido',
                description: 'Agrega al menos un ítem cobrable además de las notas.',
                variant: 'destructive',
            });
            return;
        }

        for (let i = 0; i < items.length; i += 1) {
            const row = items[i];
            if (row.lineType === QuotationItemLineType.NOTE) {
                if (!(row.noteText || '').trim()) {
                    toast({
                        title: 'Dato requerido',
                        description: `Línea ${i + 1}: escribe el texto de la nota.`,
                        variant: 'destructive',
                    });
                    return;
                }
                continue;
            }
            if (row.isCatalogItem && !row.productId) {
                toast({
                    title: 'Dato requerido',
                    description: `Ítem ${i + 1}: selecciona un producto o cambia el tipo a Libre.`,
                    variant: 'destructive',
                });
                return;
            }
            if (!row.isCatalogItem && !(row.customDescription || '').trim()) {
                toast({
                    title: 'Dato requerido',
                    description: `Ítem ${i + 1}: ingresa una descripción para el ítem libre.`,
                    variant: 'destructive',
                });
                return;
            }
            if (row.quantity <= 0) {
                toast({
                    title: 'Error cant.',
                    description: `Ítem ${i + 1}: la cantidad debe ser mayor a 0.`,
                    variant: 'destructive',
                });
                return;
            }
        }

        try {
            setLoading(true);
            const payload = {
                customerId,
                validUntil: validUntil || undefined,
                notes: composeQuotationNotes(notes, commercialTerms, {
                    manualTermsEnabled,
                    manualTermsText,
                }),
                globalDiscountPercent: Number(globalDiscountPercent || 0),
                items: items.map((it) => {
                    if (it.lineType === QuotationItemLineType.NOTE) {
                        return {
                            lineType: 'note' as const,
                            noteText: it.noteText?.trim() || '',
                            quantity: 0,
                            approvedQuantity: 0,
                            unitPrice: 0,
                            discountPercent: 0,
                            taxRate: 0,
                        };
                    }
                    if (it.isCatalogItem) {
                        return {
                            lineType: 'item' as const,
                            isCatalogItem: true as const,
                            productId: it.productId!,
                            variantId: it.variantId || undefined,
                            quantity: Number(it.quantity),
                            approvedQuantity: Number(it.approvedQuantity),
                            unitPrice: Number(it.unitPrice),
                            discountPercent: Number(it.discountPercent),
                            taxRate: Number(it.taxRate),
                        };
                    }
                    return {
                        lineType: 'item' as const,
                        isCatalogItem: false as const,
                        customDescription: it.customDescription || 'Ítem libre',
                        customSku: it.customSku || undefined,
                        quantity: Number(it.quantity),
                        approvedQuantity: Number(it.approvedQuantity),
                        unitPrice: Number(it.unitPrice),
                        discountPercent: Number(it.discountPercent),
                        taxRate: Number(it.taxRate),
                    };
                }),
            };

            const row = isEditMode && id
                ? await mrpApi.updateQuotation(id, payload)
                : await mrpApi.createQuotation(payload);

            if (saveAsCustomerTemplate && customerId) {
                const customerTemplatePayload: QuotationTermsTemplate = {
                    ...commercialTerms,
                    manualText: manualTermsEnabled ? (manualTermsText.trim() || undefined) : '',
                };
                await mrpApi.updateCustomer(customerId, {
                    quotationTermsTemplate: customerTemplatePayload,
                });
            }

            toast({ title: 'Éxito', description: isEditMode ? 'Cotización actualizada' : 'Cotización creada correctamente' });
            navigate(`/mrp/quotations/${row.id}`);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo guardar la cotización'), variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="p-6 flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate(isEditMode && id ? `/mrp/quotations/${id}` : '/mrp/quotations')}
                    className="mb-4 text-slate-500"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{isEditMode ? 'Editar Cotización' : 'Nueva Cotización'}</h1>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                    {isEditMode ? 'Actualiza los datos de la propuesta.' : 'Crea una nueva propuesta comercial para tu cliente.'}
                </p>
            </div>

            <form onSubmit={onSubmit} className="flex flex-col xl:flex-row gap-6 items-start">
                <div className="flex-1 space-y-6 w-full min-w-0">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Users className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-lg font-semibold text-slate-800">Cliente y Encabezado</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Cliente *</Label>
                                <Popover open={openCustomerCombobox} onOpenChange={setOpenCustomerCombobox}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCustomerCombobox}
                                            className={`w-full justify-between h-10 font-normal ${showValidation && !customerId ? 'border-red-500 bg-red-50/50' : 'border-slate-300'}`}
                                        >
                                            <span className="truncate text-slate-700">
                                                {customerId
                                                    ? customers.find((c) => c.id === customerId)?.name
                                                    : "Selecciona un cliente..."}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                                        <Command>
                                            <CommandInput
                                                placeholder="Buscar por nombre o NIT..."
                                                value={customerSearch}
                                                onValueChange={setCustomerSearch}
                                            />
                                            <CommandList>
                                                <CommandEmpty className="p-2 text-sm text-center text-slate-500">
                                                    No se encontró el cliente.
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {customers.filter(c =>
                                                        !customerSearch ||
                                                        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                                        c.documentNumber?.includes(customerSearch)
                                                    ).map((customer) => (
                                                        <CommandItem
                                                            key={customer.id}
                                                            value={customer.name}
                                                            onSelect={() => {
                                                                setCustomerId(customer.id);
                                                                applyTemplateForCustomer(customer.id);
                                                                setOpenCustomerCombobox(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    customerId === customer.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {customer.name} {customer.documentNumber ? `(${customer.documentNumber})` : ''}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                {showValidation && !customerId && (
                                    <p className="text-xs text-red-500 mt-1">Selecciona un cliente.</p>
                                )}
                            </div>

                            <div>
                                <Label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Válida hasta</Label>
                                <Input
                                    type="date"
                                    value={validUntil}
                                    onChange={(e) => {
                                        const nextDate = e.target.value;
                                        setValidUntil(nextDate);
                                        if (syncValidityWithDate && nextDate) {
                                            const days = Math.max(1, validityDaysFromDate(nextDate));
                                            setCommercialTerms((prev) => ({ ...prev, validityDays: days }));
                                        }
                                    }}
                                    className="h-10 border-slate-300"
                                />
                                <label className="inline-flex items-center gap-2 mt-1.5 text-[11px] text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={syncValidityWithDate}
                                        onChange={(e) => setSyncValidityWithDate(e.target.checked)}
                                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Sincronizar con “Vigencia (días)”
                                </label>
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Notas adicionales</Label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Notas internas o comentarios extra de la cotizacion..."
                                rows={2}
                                className="border-slate-300 resize-none"
                            />
                        </div>

                        <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-cyan-50 p-4 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCommercialTermsExpanded((prev) => !prev)}
                                    className="flex items-center gap-2 text-left"
                                >
                                    {commercialTermsExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-indigo-600" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-indigo-600" />
                                    )}
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-700">Terminos Comerciales</p>
                                        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mt-1">
                                            <ShieldCheck className="h-4 w-4 text-indigo-600" />
                                            Bloque legal/comercial para cliente
                                        </h3>
                                    </div>
                                </button>
                                <div className="flex items-center gap-3">
                                    <label className="inline-flex items-center gap-2 text-xs text-slate-700 font-medium">
                                        <input
                                            type="checkbox"
                                            checked={commercialTerms.enabled}
                                            onChange={(e) => setCommercialTerms((prev) => ({ ...prev, enabled: e.target.checked }))}
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        Incluir
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setCommercialTermsExpanded((prev) => !prev)}
                                        className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700"
                                    >
                                        {commercialTermsExpanded ? 'Ocultar' : 'Editar'}
                                    </button>
                                </div>
                            </div>

                            {commercialTerms.enabled && !commercialTermsExpanded && (
                                <p className="text-xs text-slate-600">
                                    Usando plantilla de <span className="font-semibold">{commercialTerms.companyName}</span>. Abre la sección para ajustar términos puntuales.
                                </p>
                            )}

                            {customerId && (
                                <label className="inline-flex items-center gap-2 text-xs text-slate-700 font-medium rounded-md bg-white/70 border border-indigo-100 px-2.5 py-2">
                                    <input
                                        type="checkbox"
                                        checked={saveAsCustomerTemplate}
                                        onChange={(e) => setSaveAsCustomerTemplate(e.target.checked)}
                                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Guardar esta configuración como plantilla de este cliente
                                </label>
                            )}

                            {commercialTerms.enabled && commercialTermsExpanded && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="md:col-span-2">
                                            <Label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">Nombre empresa</Label>
                                            <Input
                                                value={commercialTerms.companyName}
                                                onChange={(e) => setCommercialTerms((prev) => ({ ...prev, companyName: e.target.value }))}
                                                className="h-9 border-indigo-200 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">Vigencia (dias)</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={commercialTerms.validityDays}
                                                onChange={(e) => {
                                                    const days = Math.max(1, Number(e.target.value) || 1);
                                                    setCommercialTerms((prev) => ({ ...prev, validityDays: days }));
                                                    if (syncValidityWithDate) {
                                                        setValidUntil(validUntilFromDays(days));
                                                    }
                                                }}
                                                className="h-9 border-indigo-200 bg-white"
                                            />
                                            {syncValidityWithDate && (
                                                <p className="text-[10px] text-slate-500 mt-1">
                                                    Fecha sugerida: {validUntilFromDays(commercialTerms.validityDays)}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                        {([
                                            ['validity', 'Vigencia'],
                                            ['payment', 'Pago'],
                                            ['production', 'Produccion/Entrega'],
                                            ['warranty', 'Garantias'],
                                            ['cancellations', 'Cambios/Cancelaciones'],
                                            ['legal', 'General legal'],
                                        ] as Array<[keyof CommercialSections, string]>).map(([key, label]) => (
                                            <label key={key} className="inline-flex items-center gap-2 rounded-md border border-indigo-100 bg-white px-2.5 py-2 text-slate-700">
                                                <input
                                                    type="checkbox"
                                                    checked={commercialTerms.sections[key]}
                                                    onChange={(e) =>
                                                        setCommercialTerms((prev) => ({
                                                            ...prev,
                                                            sections: { ...prev.sections, [key]: e.target.checked },
                                                        }))
                                                    }
                                                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span>{label}</span>
                                            </label>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <div>
                                            <Label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">Anticipo %</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={commercialTerms.advancePaymentPercent}
                                                onChange={(e) => setCommercialTerms((prev) => ({ ...prev, advancePaymentPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                                                className="h-9 border-indigo-200 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">Contra entrega %</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={commercialTerms.deliveryPaymentPercent}
                                                onChange={(e) => setCommercialTerms((prev) => ({ ...prev, deliveryPaymentPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                                                className="h-9 border-indigo-200 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">Prod. Min dias</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={commercialTerms.productionMinDays}
                                                onChange={(e) => setCommercialTerms((prev) => ({ ...prev, productionMinDays: Number(e.target.value) || 1 }))}
                                                className="h-9 border-indigo-200 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">Prod. Max dias</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={commercialTerms.productionMaxDays}
                                                onChange={(e) => setCommercialTerms((prev) => ({ ...prev, productionMaxDays: Number(e.target.value) || 1 }))}
                                                className="h-9 border-indigo-200 bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <div className="md:col-span-2">
                                            <Label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">Condición cliente habitual</Label>
                                            <Input
                                                value={commercialTerms.habitualClientTermLabel}
                                                onChange={(e) => setCommercialTerms((prev) => ({ ...prev, habitualClientTermLabel: e.target.value }))}
                                                className="h-9 border-indigo-200 bg-white"
                                                placeholder="Ej: Neto 15/30 dias"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">Mora % mensual</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                step={0.1}
                                                value={commercialTerms.lateFeePercent}
                                                onChange={(e) => setCommercialTerms((prev) => ({ ...prev, lateFeePercent: Number(e.target.value) || 0 }))}
                                                className="h-9 border-indigo-200 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">IVA %</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={commercialTerms.ivaPercent}
                                                onChange={(e) => setCommercialTerms((prev) => ({ ...prev, ivaPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                                                className="h-9 border-indigo-200 bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                        <label className="inline-flex items-center gap-2 rounded-md border border-indigo-100 bg-white px-2.5 py-2 text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={commercialTerms.includeDianRetention}
                                                onChange={(e) => setCommercialTerms((prev) => ({ ...prev, includeDianRetention: e.target.checked }))}
                                                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span>Incluir línea de retención DIAN</span>
                                        </label>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <Label className="text-[11px] font-semibold uppercase text-slate-500 mb-0">Vista previa</Label>
                                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="inline-flex items-center gap-2 text-xs text-slate-700 font-medium rounded-md border border-indigo-100 bg-white px-2.5 py-1.5">
                                                <input
                                                    type="checkbox"
                                                    checked={manualTermsEnabled}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setManualTermsEnabled(checked);
                                                        if (checked && !manualTermsText.trim()) {
                                                            setManualTermsText(buildCommercialTermsText(commercialTerms));
                                                        }
                                                    }}
                                                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                Editar texto final manualmente
                                            </label>
                                            {manualTermsEnabled && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setManualTermsText(buildCommercialTermsText(commercialTerms))}
                                                    className="h-7 text-[11px]"
                                                >
                                                    Regenerar desde inputs
                                                </Button>
                                            )}
                                        </div>
                                        <Textarea
                                            value={manualTermsEnabled ? manualTermsText : buildCommercialTermsText(commercialTerms)}
                                            onChange={(e) => manualTermsEnabled && setManualTermsText(e.target.value)}
                                            readOnly={!manualTermsEnabled}
                                            rows={8}
                                            className={`border-indigo-200 bg-white text-[12px] leading-relaxed resize-y ${manualTermsEnabled ? '' : 'opacity-95'}`}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div>
                            <Label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Descuento Global (%)</Label>
                            <Input
                                type="number"
                                min={0}
                                max={globalDiscountLimit ?? undefined}
                                step={0.01}
                                value={globalDiscountPercent || ''}
                                onChange={(e) => updateGlobalDiscount(Number(e.target.value))}
                                disabled={hasPerItemDiscount && globalDiscountPercent <= 0}
                                className="h-10 md:w-1/2 border-slate-300"
                                placeholder="Ej: 5.0"
                            />
                            {globalDiscountPercent > 0 && (
                                <p className="text-xs text-slate-600 mt-1.5">
                                    Con descuento global, el subtotal neto queda en {totalsPreview.discountedSubtotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} (ahorras {totalsPreview.discountAmount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}). Bloquea descuentos individuales.
                                </p>
                            )}
                            {globalDiscountLimit !== null && (
                                <p className="text-xs text-amber-700 mt-1">
                                    Máximo descuento global permitido según costo/margen de ítems: {globalDiscountLimit.toFixed(2)}%.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-0 overflow-visible z-10">
                        <div className="p-6 pb-4 flex justify-between items-center border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-indigo-600" />
                                <h2 className="text-lg font-semibold text-slate-800">Ítems Cotizados</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button type="button" onClick={addNoteLine} variant="outline" size="sm" className="h-8">
                                    <StickyNote className="mr-2 h-4 w-4" />
                                    Agregar Nota
                                </Button>
                                <Button type="button" onClick={addItem} variant="outline" size="sm" className="h-8">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Agregar Ítem
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            {items.map((it, idx) => {
                                if (it.lineType === QuotationItemLineType.NOTE) {
                                    return (
                                        <div key={idx} className="bg-amber-50/40 border-b border-slate-100 last:border-0 p-5 relative">
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-center gap-2">
                                                    <StickyNote className="h-4 w-4 text-amber-600" />
                                                    <p className="text-xs font-bold text-amber-700 uppercase">Nota {idx + 1}</p>
                                                </div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">Eliminar</Button>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">Texto libre *</Label>
                                                <Textarea
                                                    value={it.noteText || ''}
                                                    onChange={(e) => patchItem(idx, { noteText: e.target.value })}
                                                    placeholder="Ej: Incluye instalación, capacitación inicial y empaque personalizado."
                                                    rows={3}
                                                    className={`border-slate-300 resize-y bg-white ${showValidation && !(it.noteText || '').trim() ? 'border-red-500' : ''}`}
                                                />
                                                <p className="text-[11px] text-slate-500">
                                                    Esta línea se verá en el PDF como nota de detalle y no afecta cantidades, precios ni impuestos.
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }

                                const variants = products.find((p) => p.id === it.productId)?.variants || [];
                                const effectiveDiscount = globalDiscountPercent > 0 ? Number(globalDiscountPercent || 0) : Number(it.discountPercent || 0);
                                const unitListPrice = Number(it.unitPrice || 0);
                                const unitNetPrice = unitListPrice * (1 - (effectiveDiscount / 100));

                                return (
                                    <div key={idx} className={`bg-white border-b border-slate-100 last:border-0 p-5 relative ${activeCatalogComboboxIdx === idx ? 'z-50' : 'z-10'}`}>
                                        <div className="flex justify-between items-center mb-4">
                                            <p className="text-xs font-bold text-slate-500 uppercase">Ítem {idx + 1}</p>
                                            <div className="flex items-center gap-1">
                                                {it.isCatalogItem && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => addVariantForItem(idx)}
                                                        title="Agregar variante del mismo producto"
                                                        className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                    >
                                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                                        Variante
                                                    </Button>
                                                )}
                                                <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">Eliminar</Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                            <div className="md:col-span-2">
                                                <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">Tipo</Label>
                                                <select
                                                    className="w-full h-10 border border-slate-300 rounded-md px-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                    value={it.isCatalogItem ? 'catalog' : 'custom'}
                                                    onChange={(e) => patchItem(idx, {
                                                        isCatalogItem: e.target.value === 'catalog',
                                                        productId: undefined,
                                                        variantId: undefined,
                                                        productSearch: '',
                                                        customDescription: '',
                                                        customSku: '',
                                                    })}
                                                >
                                                    <option value="catalog">Catálogo</option>
                                                    <option value="custom">Libre</option>
                                                </select>
                                            </div>

                                            <div className="md:col-span-4 relative">
                                                {it.isCatalogItem ? (
                                                    <>
                                                        <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">Producto *</Label>
                                                        <Input
                                                            type="text"
                                                            placeholder="Buscar por nombre o SKU..."
                                                            value={it.productSearch}
                                                            onChange={(e) => {
                                                                patchItem(idx, { productSearch: e.target.value });
                                                                setActiveCatalogComboboxIdx(idx);
                                                                if (!e.target.value) patchItem(idx, { productId: '' });
                                                            }}
                                                            onFocus={() => setActiveCatalogComboboxIdx(idx)}
                                                            onBlur={() => {
                                                                setTimeout(() => {
                                                                    if (activeCatalogComboboxIdx === idx) {
                                                                        setActiveCatalogComboboxIdx(null);
                                                                    }
                                                                }, 200);
                                                            }}
                                                            onKeyDown={(e) => handleCatalogInputKeyDown(idx, e)}
                                                            className={`w-full h-10 border-slate-300 ${showValidation && !it.productId ? 'border-red-500 ring-red-500' : ''}`}
                                                        />
                                                        {activeCatalogComboboxIdx === idx && (
                                                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto top-[60px]">
                                                                {getFilteredProducts(it.productSearch).length > 0 ? (
                                                                    getFilteredProducts(it.productSearch).map((p, pIndex) => (
                                                                        <div
                                                                            key={p.id}
                                                                            className={`px-4 py-2 cursor-pointer text-sm ${catalogHighlightByIndex[idx] === pIndex ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'}`}
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                handleProductChange(idx, p.id);
                                                                            }}
                                                                            onMouseEnter={() => setCatalogHighlightByIndex(prev => ({ ...prev, [idx]: pIndex }))}
                                                                        >
                                                                            <div className="font-semibold text-slate-800">{p.sku}</div>
                                                                            <div className="text-slate-600 text-xs truncate">{p.name}</div>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="px-4 py-3 text-sm text-slate-500 italic text-center">Sin resultados</div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {showValidation && !it.productId && (
                                                            <p className="text-[10px] text-red-500 mt-1">requerido.</p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">Descripción *</Label>
                                                        <Input
                                                            value={it.customDescription || ''}
                                                            onChange={(e) => patchItem(idx, { customDescription: e.target.value })}
                                                            placeholder="Descripción del ítem"
                                                            className={`h-10 border-slate-300 ${showValidation && !it.customDescription?.trim() ? 'border-red-500' : ''}`}
                                                        />
                                                    </>
                                                )}
                                            </div>

                                            <div className="md:col-span-2">
                                                {it.isCatalogItem ? (
                                                    <>
                                                        <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">Variante</Label>
                                                        <select
                                                            className="w-full h-10 border border-slate-300 rounded-md px-2 text-sm focus:ring-1 focus:ring-indigo-500"
                                                            value={it.variantId || ''}
                                                            onChange={(e) => {
                                                                const variantId = e.target.value || undefined;
                                                                const tax = resolveCatalogTax(it.productId, variantId);
                                                                patchItem(idx, {
                                                                    variantId,
                                                                    unitPrice: resolveCatalogUnitPrice(it.productId, variantId),
                                                                    taxRate: tax.taxRate,
                                                                });
                                                            }}
                                                        >
                                                            <option value="">N/A</option>
                                                            {variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                                                        </select>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">SKU/Ref</Label>
                                                        <Input
                                                            value={it.customSku || ''}
                                                            onChange={(e) => patchItem(idx, { customSku: e.target.value })}
                                                            placeholder="Opcional"
                                                            className="h-10 border-slate-300"
                                                        />
                                                    </>
                                                )}
                                            </div>

                                            <div className="md:col-span-2">
                                                <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">Cantidad</Label>
                                                <Input
                                                    type="number"
                                                    min={0.001}
                                                    step={0.001}
                                                    value={it.quantity || ''}
                                                    onChange={(e) => patchItem(idx, { quantity: Number(e.target.value) })}
                                                    className="h-10 border-slate-300"
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">Vr. Unit.</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step={0.01}
                                                    value={it.unitPrice || ''}
                                                    onChange={(e) => patchItem(idx, { unitPrice: Number(e.target.value) })}
                                                    className="h-10 border-slate-300"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-3 pl-0 md:pl-[58%]">
                                            <div className="md:col-span-6">
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-[11px] font-semibold text-slate-500 w-16 mb-0 block">Desc %</Label>
                                                    <div className="flex-1 space-y-1">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            step={0.1}
                                                            value={it.discountPercent || ''}
                                                            onFocus={() => setFocusedDiscountIndex(idx)}
                                                            onBlur={() => setFocusedDiscountIndex((current) => (current === idx ? null : current))}
                                                            onChange={(e) => patchItem(idx, { discountPercent: Number(e.target.value) })}
                                                            disabled={globalDiscountPercent > 0}
                                                            className="h-8 border-slate-300 text-sm py-1"
                                                        />
                                                    </div>
                                                </div>
                                                {focusedDiscountIndex === idx && (() => {
                                                    const limit = resolveDiscountLimit(it);
                                                    if (!limit) return null;
                                                    return (
                                                        <p className="text-[10px] text-amber-600 mt-1 leading-tight ml-16 pl-2 border-l border-amber-200">
                                                            Máx: {limit.maxDiscountPercent.toFixed(1)}% <br />(margen mín: {limit.minAllowedMarginPercent.toFixed(1)}%)
                                                        </p>
                                                    );
                                                })()}
                                            </div>

                                            <div className="md:col-span-6">
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-[11px] font-semibold text-slate-500 w-12 mb-0 block">IVA %</Label>
                                                    <div className="flex-1 flex gap-2">
                                                        {it.isCatalogItem ? (
                                                            <div className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 flex items-center justify-between">
                                                                <span>
                                                                    {getTaxStatusLabel(resolveCatalogTax(it.productId, it.variantId).taxStatus)}
                                                                </span>
                                                                <span className="font-semibold">
                                                                    {Number(it.taxRate || 0).toFixed(2)}%
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    value={it.taxRate || ''}
                                                                    onChange={(e) => patchItem(idx, { taxRate: Number(e.target.value) })}
                                                                    className="h-8 border-slate-300 text-sm py-1"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => patchItem(idx, { taxRate: Number(it.taxRate) === 19 ? 0 : 19 })}
                                                                    className={`h-8 px-2 rounded-md border text-xs font-medium shrink-0 transition-colors ${Number(it.taxRate) === 19
                                                                            ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                                                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                                                        }`}
                                                                >
                                                                    19%
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {effectiveDiscount > 0 && unitNetPrice !== unitListPrice && (
                                            <div className="text-[11px] text-slate-500 text-right mt-2 pr-2">
                                                Neto unitario: {unitNetPrice.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="w-full xl:w-96 shrink-0 space-y-6">
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 sticky top-6">
                        <h3 className="font-bold text-slate-800 text-lg mb-4 border-b border-slate-200 pb-2">Resumen Cotización</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center text-slate-600">
                                <span>Subtotal base</span>
                                <span>{totalsPreview.listSubtotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</span>
                            </div>

                            {totalsPreview.discountAmount > 0 && (
                                <div className="flex justify-between items-center text-emerald-600">
                                    <span>Descuento total</span>
                                    <span>-{totalsPreview.discountAmount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-slate-600">
                                <span>Subtotal neto</span>
                                <span>{totalsPreview.discountedSubtotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</span>
                            </div>

                            <div className="flex justify-between items-center text-slate-600">
                                <span>Impuestos</span>
                                <span>{totalsPreview.taxTotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</span>
                            </div>

                            <div className="border-t border-slate-200 pt-3 mt-3 flex justify-between items-center">
                                <span className="font-bold text-slate-800 text-base">Total a Pagar</span>
                                <span className="font-black text-indigo-700 text-xl">{totalsPreview.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</span>
                            </div>
                        </div>

                        <div className="mt-6 rounded-lg border border-cyan-200 bg-cyan-50/50 p-4 space-y-3">
                            <p className="text-[11px] font-bold text-cyan-800 uppercase tracking-widest">Simulador de Envío</p>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-cyan-900 font-medium font-semibold">Costo Real Flete</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step={1000}
                                    value={shippingAmount || ''}
                                    onChange={(e) => setShippingAmount(Number(e.target.value) || 0)}
                                    className="h-9 border-cyan-200 bg-white"
                                    placeholder="Ej: 15000"
                                />
                            </div>

                            {shippingAmount > 0 ? (
                                <div className="space-y-1.5 pt-2 border-t border-cyan-200 text-xs">
                                    <div className="flex justify-between text-cyan-900">
                                        <span>Asume Empresa:</span>
                                        <span className="font-semibold">{shippingSplit.wePay.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</span>
                                    </div>
                                    <div className="flex justify-between text-cyan-800">
                                        <span>Cobrar a Cliente:</span>
                                        <span className="font-bold">{shippingSplit.clientPays.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</span>
                                    </div>
                                    {!shippingSplit.policyApplies && (
                                        <p className="text-[10px] text-amber-700 leading-tight mt-1 bg-amber-50 p-1 rounded">Monto de cotización no supera el tope base ({Number(operationalConfig?.shippingOrderCoverageThreshold || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}). Cliente asume 100%.</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-[10px] text-cyan-700 leading-tight">Agrega un costo de envío para simular quién asume el pago basado en políticas (Tope Base {Number(operationalConfig?.shippingOrderCoverageThreshold || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}).</p>
                            )}
                        </div>

                        <div className="mt-6 space-y-3">
                            <Button type="submit" disabled={loading} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-base shadow-sm">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isEditMode ? 'Actualizar Cotización' : 'Crear Cotización'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => navigate('/mrp/quotations')} className="w-full h-11 border-slate-300">
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
