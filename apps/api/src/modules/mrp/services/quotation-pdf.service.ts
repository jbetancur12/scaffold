import { EntityManager } from '@mikro-orm/core';
import { AppError } from '../../../shared/utils/response';
import { QuotationService } from './quotation.service';
import fs from 'node:fs';
import path from 'node:path';
import { DocumentCategory, DocumentStatus, ProductTaxStatus, QuotationItemLineType } from '@scaffold/types';
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
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; font-size: 11px; margin: 0; padding: 12px 24px; line-height: 1.3; }
      h1 { margin: 0 0 4px 0; font-size: 18px; color: #0f172a; font-weight: 700; letter-spacing: -0.5px; }
      .muted { color: #64748b; font-size: 10px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
      .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; background-color: #f8fafc; }
      .card-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 2px; }
      .card-content { font-size: 12px; color: #0f172a; font-weight: 600; }
      
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { padding: 4px 6px; font-size: 10px; border-bottom: 1px solid #e2e8f0; }
      th { background: #f8fafc; text-align: left; font-weight: 600; color: #475569; text-transform: uppercase; border-top: 1px solid #e2e8f0; }
      tr:last-child td { border-bottom: 1px solid #e2e8f0; }
      .right { text-align: right; }
      
      .totals { margin-top: 12px; width: 260px; margin-left: auto; border: none; }
      .totals td { padding: 4px 6px; font-size: 11px; border-bottom: 1px solid #f1f5f9; color: #334155; }
      .totals tr:last-child td { border-bottom: none; font-weight: 700; font-size: 13px; color: #0f172a; border-top: 2px solid #e2e8f0; padding-top: 6px; }
      .tax-legend { margin-top: 8px; font-size: 9px; color: #64748b; text-align: right; }
      
      .notes-card { margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; padding: 14px 18px; break-inside: avoid; page-break-inside: avoid; }
      .notes-title { margin: 0 0 10px 0; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #334155; }
      .notes-chip { display: inline-block; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #0f4c81; background: #e8f2fb; border: 1px solid #bfdbfe; border-radius: 999px; padding: 2px 8px; margin-bottom: 10px; }
      .notes-intro { margin: 0 0 10px 0; font-size: 11px; color: #334155; }
      .notes-section { padding: 9px 0; border-top: 1px dashed #cbd5e1; margin-top: 0; break-inside: avoid; page-break-inside: avoid; }
      .notes-section:first-of-type { margin-top: 2px; padding-top: 9px; }
      .notes-section:last-of-type { padding-bottom: 0; }
      .notes-section-title { display: flex; align-items: center; gap: 10px; margin: 0 0 4px 0; font-size: 11px; color: #1e293b; font-weight: 700; line-height: 1.35; }
      .notes-index { display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; flex-shrink: 0; border-radius: 50%; background: #e2e8f0; color: #475569; font-size: 10px; font-weight: 700; }
      .notes-paragraph { margin: 0 0 3px 28px; color: #334155; font-size: 11px; line-height: 1.4; }
      .notes-bullets { margin: 0 0 3px 28px; padding: 0 0 0 16px; color: #334155; font-size: 11px; line-height: 1.4; }
      .notes-bullets li { margin: 0 0 3px 0; padding-left: 2px; }
      .notes-bullets li::marker { color: #64748b; font-size: 10px; }
      .detail-notes { margin-top: 12px; padding-top: 10px; border-top: 1px dashed #cbd5e1; }
      .detail-note-list { margin: 0; padding: 0; list-style: none; }
      .detail-note-list li { margin: 0 0 4px 0; color: #334155; font-size: 11px; line-height: 1.45; white-space: pre-wrap; }
  body
    h1 Cotización #{quotation.code}
    .muted Fecha: #{quotationDate} | Vigencia: #{validUntil}
    .grid
      .card
        .card-title Cliente
        .card-content= quotation.customer.name
        if quotation.customer.documentNumber
          .muted(style="margin-top: 2px;") NIT/CC: #{quotation.customer.documentNumber}
    table
      thead
        tr
          th Ítem
          th.right Cantidad
          th.right Vr Unit
          th.right IVA
          th.right Total
      tbody
        each item in items
          tr
            td
              div(style="font-weight: 500; color: #0f172a; font-size: 12px;")= item.label
              if item.itemNotes
                div(style="font-size: 10px; color: #475569; margin-top: 2px; font-style: italic;")= item.itemNotes
              if item.meta
                div.muted(style="margin-top: 2px;")= item.meta
            td.right= item.quantity
            td.right= item.netUnitPrice
            td.right= item.taxRate
            td.right= item.netSubtotal
    if taxLegend
      .tax-legend= taxLegend
    table.totals
      tr
        td Subtotal base
        td.right= totals.listSubtotal
      if totals.discount !== '$ 0'
        tr
          td Descuento
          td.right(style="color: #059669")= '-' + totals.discount
      tr
        td Subtotal neto
        td.right= totals.subtotalWithDiscount
      tr
        td IVA Total
        td.right= totals.tax
      tr
        td Total Pagar
        td.right= totals.total
    if quotationNotes.hasContent
      .notes-card
        h2.notes-title Observaciones Adicionales
        if quotationNotes.heading
          .notes-chip= quotationNotes.heading
        if quotationNotes.structured
          each introLine in quotationNotes.introLines
            p.notes-intro= introLine
          each section in quotationNotes.sections
            .notes-section
              p.notes-section-title
                span.notes-index= section.index
                span= section.title
              each paragraph in section.paragraphs
                p.notes-paragraph= paragraph
              if section.bullets.length > 0
                ul.notes-bullets
                  each bullet in section.bullets
                    li= bullet
        else
          div(style="white-space: pre-wrap; font-size: 11px; color: #334155; margin-top: 4px; line-height: 1.4;")= quotation.notes
        if detailNotes.length > 0
          .detail-notes
            h2.notes-title(style="margin-bottom: 6px;") Notas de detalle
            ul.detail-note-list
              each detailNote in detailNotes
                li= '- ' + detailNote
    else if detailNotes.length > 0
      .notes-card
        h2.notes-title Notas de detalle
        ul.detail-note-list
          each detailNote in detailNotes
            li= '- ' + detailNote
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

    private formatCompactTaxLabel(params: {
        isCatalogItem: boolean;
        taxRate: number;
        variantTaxStatus?: ProductTaxStatus;
    }) {
        if (params.isCatalogItem) {
            if (params.variantTaxStatus === ProductTaxStatus.EXCLUIDO) return 'EXC';
            if (params.variantTaxStatus === ProductTaxStatus.EXENTO) return 'EXE';
            if (params.variantTaxStatus === ProductTaxStatus.GRAVADO) {
                const rate = Number(params.taxRate || 0);
                return `G${Number.isInteger(rate) ? rate.toFixed(0) : rate.toFixed(2)}`;
            }
        }
        const rate = Number(params.taxRate || 0);
        return `${rate.toFixed(2)}%`;
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

    private parseQuotationNotes(notes?: string) {
        const raw = (notes || '').trim();
        if (!raw) {
            return {
                hasContent: false,
                structured: false,
                heading: '',
                introLines: [] as string[],
                sections: [] as Array<{ index: number; title: string; paragraphs: string[]; bullets: string[] }>,
            };
        }

        const lines = raw
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        if (lines.length === 0) {
            return {
                hasContent: false,
                structured: false,
                heading: '',
                introLines: [] as string[],
                sections: [] as Array<{ index: number; title: string; paragraphs: string[]; bullets: string[] }>,
            };
        }

        let cursor = 0;
        let heading = '';
        if (lines[0].toUpperCase().startsWith('CONDICIONES COMERCIALES')) {
            heading = lines[0];
            cursor = 1;
        }

        const introLines: string[] = [];
        const sections: Array<{ index: number; title: string; paragraphs: string[]; bullets: string[] }> = [];
        let currentSection: { index: number; title: string; paragraphs: string[]; bullets: string[] } | null = null;

        for (let i = cursor; i < lines.length; i += 1) {
            const line = lines[i];
            const numberedMatch = line.match(/^(\d+)\.\s*(.+)$/);
            if (numberedMatch) {
                if (currentSection) sections.push(currentSection);
                currentSection = {
                    index: Number(numberedMatch[1]) || (sections.length + 1),
                    title: numberedMatch[2].trim(),
                    paragraphs: [],
                    bullets: [],
                };
                continue;
            }

            if (line.startsWith('-')) {
                const bullet = line.replace(/^-+\s*/, '').trim();
                if (currentSection) {
                    currentSection.bullets.push(bullet || line);
                } else {
                    introLines.push(line);
                }
                continue;
            }

            if (currentSection) {
                currentSection.paragraphs.push(line);
            } else {
                introLines.push(line);
            }
        }

        if (currentSection) sections.push(currentSection);

        return {
            hasContent: true,
            structured: sections.length > 0,
            heading,
            introLines,
            sections,
        };
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

        const detailNotes = quotation.items.getItems()
            .filter((item) => item.lineType === QuotationItemLineType.NOTE)
            .map((item) => item.noteText || item.customDescription || '')
            .filter((note) => note.trim().length > 0);

        const items = quotation.items.getItems()
            .filter((item) => item.lineType !== QuotationItemLineType.NOTE)
            .map((item) => ({
                lineType: QuotationItemLineType.ITEM,
                label: item.isCatalogItem
                    ? `${item.product?.name || 'Producto'}${item.variant ? ` - ${item.variant.name}` : ''}`
                    : item.customDescription || 'Ítem libre',
                itemNotes: item.itemNotes || '',
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
                taxRate: this.formatCompactTaxLabel({
                    isCatalogItem: item.isCatalogItem,
                    taxRate: Number(item.taxRate || 0),
                    variantTaxStatus: item.variant?.taxStatus,
                }),
                netSubtotal: this.formatCurrency(Number(item.netSubtotal || 0)),
            }));

        const listSubtotal = quotation.items.getItems().reduce((acc, item) => {
            if (item.lineType === QuotationItemLineType.NOTE) return acc;
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
            detailNotes,
            taxLegend: 'G: Gravado | EXE: Exento | EXC: Excluido',
            quotationNotes: this.parseQuotationNotes(quotation.notes),
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
