import { EntityManager } from '@mikro-orm/core';
import { AppError } from '../../../shared/utils/response';
import { QuotationService } from './quotation.service';
import fs from 'node:fs';
import path from 'node:path';
import { DocumentCategory, DocumentStatus } from '@scaffold/types';
import { ControlledDocument } from '../entities/controlled-document.entity';
import { OperationalConfig } from '../entities/operational-config.entity';

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
    table
      thead
        tr
          th Ítem
          th.right Cantidad
          th.right Vr Unit
          th.right IVA %
          th.right Total
      tbody
        each item in items
          tr
            td
              div= item.label
              if item.meta
                div.muted= item.meta
            td.right= item.quantity
            td.right= item.netUnitPrice
            td.right= item.taxRate
            td.right= item.netSubtotal
    table.totals
      tr
        td Subtotal lista (sin descuento)
        td.right= totals.listSubtotal
      tr
        td Descuento
        td.right= '-' + totals.discount
      tr
        td Subtotal con descuento
        td.right= totals.subtotalWithDiscount
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
        this.em = em;
    }
    private readonly em: EntityManager;

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

    private formatHeaderDate(value?: Date | string | null) {
        if (!value) return 'N/A';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'N/A';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private resolveProcessLabelByDocCode(code?: string | null) {
        const normalizedCode = (code || '').trim().toUpperCase();
        const prefix = normalizedCode.split('-')[0];
        const map: Record<string, string> = {
            GP: 'Proceso de Gestión de Producción',
            GC: 'Proceso de Gestión de Calidad',
            GAF: 'Proceso de Gestión Administrativa y Financiera',
            GTH: 'Proceso de Gestión de Talento Humano',
            GS: 'Proceso de Gestión de Seguridad',
            GM: 'Proceso de Gestión de Mantenimiento',
        };
        return map[prefix] || 'Proceso de Gestión Comercial';
    }

    private escapeHtml(value: string) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private buildHeaderTemplate(data: {
        logoDataUrl?: string;
        title: string;
        processLabel: string;
        docCode: string;
        docVersion: number;
        docDate: string;
    }) {
        const safeTitle = this.escapeHtml(data.title);
        const safeProcessLabel = this.escapeHtml(data.processLabel);
        const safeDocCode = this.escapeHtml(data.docCode);
        const safeDocDate = this.escapeHtml(data.docDate);
        const logoCell = data.logoDataUrl
            ? `<img style="width:100%;max-height:56px;object-fit:contain;display:block;margin:0 auto;" src="${data.logoDataUrl}" alt="COLMOR" />`
            : '<div style="text-align:center;font-weight:700;font-size:16px;">COLMOR</div>';

        return `
            <style>
              html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; }
              .header-wrap { padding: 8px 24px 0 24px; width: 100%; background: #fff; }
              .header-table { width: 100%; border-collapse: collapse; border: 1px solid #0f172a; table-layout: fixed; }
              .header-table td { border: 1px solid #0f172a; padding: 4px 6px; vertical-align: middle; font-size: 11px; }
              .meta { width: 100%; border-collapse: collapse; }
              .meta td { border: 1px solid #0f172a; padding: 4px 6px; font-size: 11px; }
              .doc-title { text-align: center; font-weight: 700; line-height: 1.25; }
              .doc-title .l1 { font-size: 12px; }
              .doc-title .l2 { font-size: 11px; margin-top: 2px; }
              .doc-title .l3 { font-size: 12px; margin-top: 2px; }
            </style>
            <div class="header-wrap">
              <table class="header-table">
                <tr>
                  <td style="width:36%">${logoCell}</td>
                  <td style="width:40%">
                    <div class="doc-title">
                      <div class="l1">COLORTOPEDICAS SAS</div>
                      <div class="l2">${safeProcessLabel}</div>
                      <div class="l3">${safeTitle}</div>
                    </div>
                  </td>
                  <td style="width:24%; padding:0">
                    <table class="meta">
                      <tr><td>Versión</td><td>${data.docVersion}</td></tr>
                      <tr><td>Código</td><td>${safeDocCode}</td></tr>
                      <tr><td>Fecha</td><td>${safeDocDate}</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>
        `;
    }

    private buildFooterTemplate() {
        return `
            <style>
              html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; }
              .footer-wrap { width: 100%; padding: 0 24px 8px 24px; background: #fff; }
              .footer-line { border-top: 1px solid #0f172a; margin-bottom: 6px; }
              .footer-text { text-align: center; font-size: 10px; line-height: 1.2; color: #111827; }
            </style>
            <div class="footer-wrap">
              <div class="footer-line"></div>
              <div class="footer-text">
                <div>Carrera 14 35-27 Guadalupe Dosquebradas - Risaralda</div>
                <div>Contáctenos: 3138124282 colortopedicassas@gmail.com</div>
                <div>www.colortopedicas.com</div>
              </div>
            </div>
        `;
    }

    private getLogoDataUrl(): string | undefined {
        const candidates = [
            path.resolve(__dirname, '../../../assets/colmor-logo.jpg'),
            path.resolve(process.cwd(), 'logo.jpg'),
            path.resolve(process.cwd(), 'logo-c.jpg'),
            path.resolve(process.cwd(), '..', 'logo.jpg'),
            path.resolve(process.cwd(), '..', 'logo-c.jpg'),
            path.resolve(process.cwd(), 'src/assets/colmor-logo.jpg'),
            path.resolve(process.cwd(), 'apps/api/src/assets/colmor-logo.jpg'),
            path.resolve(process.cwd(), 'apps/web/src/assets/logo.jpg'),
            path.resolve(process.cwd(), '..', 'apps/web/src/assets/logo.jpg'),
        ];
        for (const filePath of candidates) {
            if (!fs.existsSync(filePath)) continue;
            const mime = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
            const base64 = fs.readFileSync(filePath).toString('base64');
            return `data:${mime};base64,${base64}`;
        }
        return undefined;
    }

    private async findActiveForDocumentByCode(code: string) {
        return this.em.findOne(ControlledDocument, {
            code,
            documentCategory: DocumentCategory.FOR,
            status: DocumentStatus.APROBADO,
        }, {
            orderBy: [{ version: 'DESC' }, { approvedAt: 'DESC' }],
        });
    }

    private async resolveDocMeta(
        quotationDate: Date,
        docOptions?: {
            docCode?: string;
            docTitle?: string;
            docVersion?: number;
            docDate?: string;
        }
    ) {
        const [config] = await this.em.find(OperationalConfig, {}, { orderBy: { createdAt: 'DESC' }, limit: 1 });
        const configuredCode = config?.defaultSalesOrderBillingDocCode?.trim();
        const requestedCode = docOptions?.docCode?.trim();
        const defaultFallbackCode = 'GAF-FOR-01';
        const docCode = requestedCode || configuredCode || defaultFallbackCode;

        const controlledDoc = await this.findActiveForDocumentByCode(docCode);
        const docTitle = docOptions?.docTitle
            || controlledDoc?.title
            || 'Cotización Comercial';
        const docVersion = docOptions?.docVersion
            || Number(controlledDoc?.version || 1);
        const docDate = docOptions?.docDate
            || this.formatHeaderDate(controlledDoc?.effectiveDate || controlledDoc?.approvedAt || quotationDate);
        const processLabel = this.resolveProcessLabelByDocCode(docCode);

        return { docCode, docTitle, docVersion, docDate, processLabel };
    }

    async generateQuotationPdf(
        id: string,
        docOptions?: {
            docCode?: string;
            docTitle?: string;
            docVersion?: number;
            docDate?: string;
        }
    ) {
        const quotation = await this.quotationService.getById(id);
        const pug = this.loadPug();
        const playwright = this.loadPlaywright();
        const compile = pug.compile(template);
        const logoDataUrl = this.getLogoDataUrl();
        const { docCode, docTitle, docVersion, docDate, processLabel } = await this.resolveDocMeta(quotation.quotationDate, docOptions);

        const items = quotation.items.getItems().map((item) => ({
            label: item.isCatalogItem
                ? `${item.product?.name || 'Producto'}${item.variant ? ` - ${item.variant.name}` : ''}`
                : item.customDescription || 'Ítem libre',
            meta: (() => {
                const discountPercent = Number(item.discountPercent || 0);
                const finalUnitPrice = Number(item.unitPrice || 0);
                const listUnitPrice = (discountPercent <= 0 || discountPercent >= 100 || finalUnitPrice <= 0)
                    ? finalUnitPrice
                    : finalUnitPrice / (1 - (discountPercent / 100));
                if (discountPercent <= 0) return '';
                return `Lista: ${this.formatCurrency(listUnitPrice)} | Desc: ${discountPercent.toFixed(2)}%`;
            })(),
            quantity: Number(item.quantity || 0),
            netUnitPrice: this.formatCurrency(Number(item.unitPrice || 0)),
            taxRate: `${Number(item.taxRate || 0).toFixed(2)}%`,
            netSubtotal: this.formatCurrency(Number(item.netSubtotal || 0)),
        }));

        const listSubtotal = quotation.items.getItems().reduce((acc, item) => {
            const discountPercent = Number(item.discountPercent || 0);
            const finalUnitPrice = Number(item.unitPrice || 0);
            const qty = Number(item.quantity || 0);
            const listUnitPrice = (discountPercent <= 0 || discountPercent >= 100 || finalUnitPrice <= 0)
                ? finalUnitPrice
                : finalUnitPrice / (1 - (discountPercent / 100));
            return acc + (listUnitPrice * qty);
        }, 0);
        const subtotalWithDiscount = Number(quotation.subtotalBase || 0);
        const discount = Math.max(0, listSubtotal - subtotalWithDiscount);

        const html = compile({
            quotation,
            quotationDate: this.formatDate(quotation.quotationDate),
            validUntil: this.formatDate(quotation.validUntil),
            items,
            totals: {
                listSubtotal: this.formatCurrency(listSubtotal),
                discount: this.formatCurrency(discount),
                subtotalWithDiscount: this.formatCurrency(subtotalWithDiscount),
                tax: this.formatCurrency(Number(quotation.taxTotal || 0)),
                total: this.formatCurrency(Number(quotation.netTotalAmount || 0)),
            },
            docCode,
            docTitle,
            docVersion,
            processLabel,
            logoDataUrl,
        });

        const browser = await playwright.chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle' });
            const buffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                displayHeaderFooter: true,
                headerTemplate: this.buildHeaderTemplate({
                    logoDataUrl,
                    title: docTitle,
                    processLabel,
                    docCode,
                    docVersion,
                    docDate,
                }),
                footerTemplate: this.buildFooterTemplate(),
                margin: {
                    top: '140px',
                    bottom: '70px',
                    left: '24px',
                    right: '24px',
                },
            });
            return {
                fileName: `${docCode}-v${docVersion}_${quotation.code}.pdf`,
                buffer,
            };
        } finally {
            await browser.close();
        }
    }
}
