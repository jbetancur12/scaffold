import { EntityManager } from '@mikro-orm/core';
import { AppError } from '../../../shared/utils/response';
import { QuotationService } from './quotation.service';

type PugModule = {
    compile: (template: string, options?: { pretty?: boolean }) => (locals: Record<string, unknown>) => string;
};

type PlaywrightModule = {
    chromium: {
        launch: (options?: Record<string, unknown>) => Promise<{
            newPage: () => Promise<{
                setContent: (html: string, options?: Record<string, unknown>) => Promise<void>;
                pdf: (options?: Record<string, unknown>) => Promise<Buffer>;
            }>;
            close: () => Promise<void>;
        }>;
    };
};

const template = `
doctype html
html(lang="es")
  head
    meta(charset="UTF-8")
    title= quotation.code
    style.
      body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; margin: 0; padding: 24px; }
      h1 { margin: 0 0 8px 0; font-size: 20px; }
      .muted { color: #475569; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
      .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 14px; }
      th, td { border: 1px solid #334155; padding: 6px; font-size: 11px; }
      th { background: #f1f5f9; text-align: left; }
      .right { text-align: right; }
      .totals { margin-top: 14px; width: 340px; margin-left: auto; border-collapse: collapse; }
      .totals td { border: 1px solid #334155; padding: 6px; }
  body
    h1 Cotización #{quotation.code}
    .muted Fecha: #{quotationDate} | Vigencia: #{validUntil}
    .grid
      .card
        strong Cliente
        div= quotation.customer.name
        if quotation.customer.documentNumber
          div= quotation.customer.documentNumber
      .card
        strong Estado
        div= quotation.status
    table
      thead
        tr
          th Ítem
          th.right Cantidad
          th.right Aprobado
          th.right Vr Unit
          th.right Desc %
          th.right IVA %
          th.right Total
      tbody
        each item in items
          tr
            td= item.label
            td.right= item.quantity
            td.right= item.approvedQuantity
            td.right= item.unitPrice
            td.right= item.discountPercent
            td.right= item.taxRate
            td.right= item.netSubtotal
    table.totals
      tr
        td Subtotal
        td.right= totals.subtotal
      tr
        td IVA
        td.right= totals.tax
      tr
        td Total
        td.right= totals.total
    if quotation.notes
      .card(style="margin-top:14px;")
        strong Observaciones
        div(style="white-space: pre-wrap")= quotation.notes
`;

export class QuotationPdfService {
    private readonly quotationService: QuotationService;

    constructor(em: EntityManager) {
        this.quotationService = new QuotationService(em);
    }

    private loadPug(): PugModule {
        try {
            // eslint-disable-next-line @typescript-eslint/no-implied-eval
            return (eval('require') as NodeRequire)('pug') as PugModule;
        } catch {
            throw new AppError('Dependencia "pug" no instalada. Ejecuta: npm install --workspace=api pug', 500);
        }
    }

    private loadPlaywright(): PlaywrightModule {
        try {
            // eslint-disable-next-line @typescript-eslint/no-implied-eval
            return (eval('require') as NodeRequire)('playwright') as PlaywrightModule;
        } catch {
            throw new AppError('Dependencia "playwright" no instalada. Ejecuta: npm install --workspace=api playwright', 500);
        }
    }

    private formatCurrency(value: number) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(Number(value || 0));
    }

    private formatDate(value?: Date) {
        if (!value) return 'N/A';
        return new Date(value).toLocaleDateString('es-CO');
    }

    async generateQuotationPdf(id: string) {
        const quotation = await this.quotationService.getById(id);
        const pug = this.loadPug();
        const playwright = this.loadPlaywright();
        const compile = pug.compile(template);

        const items = quotation.items.getItems().map((item) => ({
            label: item.isCatalogItem
                ? `${item.product?.name || 'Producto'}${item.variant ? ` - ${item.variant.name}` : ''}`
                : item.customDescription || 'Ítem libre',
            quantity: Number(item.quantity || 0),
            approvedQuantity: Number(item.approvedQuantity || 0),
            unitPrice: this.formatCurrency(Number(item.unitPrice || 0)),
            discountPercent: `${Number(item.discountPercent || 0).toFixed(2)}%`,
            taxRate: `${Number(item.taxRate || 0).toFixed(2)}%`,
            netSubtotal: this.formatCurrency(Number(item.netSubtotal || 0)),
        }));

        const html = compile({
            quotation,
            quotationDate: this.formatDate(quotation.quotationDate),
            validUntil: this.formatDate(quotation.validUntil),
            items,
            totals: {
                subtotal: this.formatCurrency(Number(quotation.subtotalBase || 0)),
                tax: this.formatCurrency(Number(quotation.taxTotal || 0)),
                total: this.formatCurrency(Number(quotation.netTotalAmount || 0)),
            },
        });

        const browser = await playwright.chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'domcontentloaded' });
            const buffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '18mm', bottom: '16mm', left: '10mm', right: '10mm' } });
            return {
                fileName: `${quotation.code}.pdf`,
                buffer,
            };
        } finally {
            await browser.close();
        }
    }
}
