import { EntityManager } from '@mikro-orm/core';
import { AppError } from '../../../shared/utils/response';
import { SalesOrderService } from './sales-order.service';
import fs from 'node:fs';
import path from 'node:path';

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

// ─── Production template (no prices) ────────────────────────────────────────
const productionTemplate = `
doctype html
html(lang="es")
  head
    meta(charset="UTF-8")
    title= orderNumber + ' - Orden de Producción'
    style.
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; margin: 0; }
      .section { margin-top: 14px; padding: 0 24px; }
      .section h3 { margin: 0 0 8px 0; font-size: 13px; }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .field { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; min-height: 36px; }
      .field.full-width { grid-column: span 2; }
      .field .k { font-size: 10px; text-transform: uppercase; color: #475569; }
      .field .v { font-size: 12px; font-weight: 600; margin-top: 2px; }
      table.items { width: 100%; border-collapse: collapse; margin-top: 6px; }
      table.items th, table.items td { border: 1px solid #0f172a; padding: 6px; font-size: 11px; vertical-align: top; }
      table.items th { background: #f1f5f9; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; }
      .right { text-align: right; }
  body
    .section
      h3 Información General
      .grid-2
        .field
          .k Pedido N°
          .v= orderNumber
        .field
          .k Fecha del Pedido
          .v= orderDate
        .field
          .k Cliente
          .v= customerName
        .field
          .k Identificación
          .v= customerDocument
        .field.full-width
          .k Dirección
          .v= customerAddress
    .section(style='margin-top: 16px;')
      h3 Productos a Producir
      table.items
        thead
          tr
            th(style='width: 20%') Referencia (SKU)
            th(style='width: 40%') Producto
            th(style='width: 20%') Variante
            th(style='width: 20%') Cantidad
        tbody
          each row in items
            tr
              td= row.sku
              td= row.description
              td= row.variant
              td.right= row.quantity
    if notes
      .section(style='margin-top: 14px;')
        h3 Observaciones
        .field
          .v(style='white-space: pre-wrap; font-weight: 400')= notes
`;

// ─── Billing template (with prices) ─────────────────────────────────────────
const billingTemplate = `
doctype html
html(lang="es")
  head
    meta(charset="UTF-8")
    title= orderNumber + ' - Remisión / Factura'
    style.
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; margin: 0; }
      .section { margin-top: 14px; padding: 0 24px; }
      .section h3 { margin: 0 0 8px 0; font-size: 13px; }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .field { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; min-height: 36px; }
      .field.full-width { grid-column: span 2; }
      .field .k { font-size: 10px; text-transform: uppercase; color: #475569; }
      .field .v { font-size: 12px; font-weight: 600; margin-top: 2px; }
      table.items { width: 100%; border-collapse: collapse; margin-top: 6px; }
      table.items th, table.items td { border: 1px solid #0f172a; padding: 6px; font-size: 11px; vertical-align: top; }
      table.items th { background: #f1f5f9; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; }
      .right { text-align: right; }
      .totals { margin-top: 10px; width: 320px; margin-left: auto; border-collapse: collapse; padding-right: 24px; }
      .totals td { border: 1px solid #0f172a; padding: 6px; font-size: 11px; }
      .totals .label { background: #f8fafc; }
      .totals .net { font-size: 13px; font-weight: 700; background: #e2e8f0; }
  body
    .section
      h3 Información General
      .grid-2
        .field
          .k Pedido N°
          .v= orderNumber
        .field
          .k Fecha del Pedido
          .v= orderDate
        .field
          .k Cliente
          .v= customerName
        .field
          .k Identificación
          .v= customerDocument
        .field.full-width
          .k Dirección
          .v= customerAddress
    .section(style='margin-top: 16px;')
      h3 Productos
      table.items
        thead
          tr
            th(style='width: 15%') Referencia (SKU)
            th(style='width: 30%') Producto
            th(style='width: 15%') Variante
            th(style='width: 10%') Cant.
            th(style='width: 15%') Vr. Unit.
            th(style='width: 15%') Total
        tbody
          each row in items
            tr
              td= row.sku
              td= row.description
              td= row.variant
              td.right= row.quantity
              td.right= row.unitPrice
              td.right= row.lineTotal
    table.totals
      tr
        td.label Total
        td.right.net= totalAmount
    if notes
      .section(style='margin-top: 14px;')
        h3 Observaciones
        .field
          .v(style='white-space: pre-wrap; font-weight: 400')= notes
`;

export class SalesOrderPdfService {
  private readonly salesOrderService: SalesOrderService;

  constructor(em: EntityManager) {
    this.salesOrderService = new SalesOrderService(em);
  }

  private formatCurrency(value?: number | null) {
    const numeric = Number(value || 0);
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numeric);
  }

  private formatDate(value?: Date | string | null) {
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

  async generateSalesOrderPdf(
    id: string,
    mode: 'production' | 'billing' = 'billing',
    docOptions?: {
      docCode?: string;
      docTitle?: string;
      docVersion?: number;
      docDate?: string;
    }
  ) {
    const order = await this.salesOrderService.getSalesOrderById(id);
    if (!order) {
      throw new AppError('Pedido no encontrado', 404);
    }

    const pug = this.loadPug();
    const playwright = this.loadPlaywright();
    const template = mode === 'production' ? productionTemplate : billingTemplate;
    const compile = pug.compile(template);
    const logoDataUrl = this.getLogoDataUrl();

    const isProduction = mode === 'production';
    const defaultDocCode = isProduction ? 'GP-FOR-10' : 'GAF-FOR-01';
    const defaultDocTitle = isProduction ? 'Orden de Producción' : 'Remisión de Pedido';

    const docCode = docOptions?.docCode || defaultDocCode;
    const docTitle = docOptions?.docTitle || defaultDocTitle;
    const docVersion = docOptions?.docVersion || 1;
    const processLabel = this.resolveProcessLabelByDocCode(docCode);
    const docDate = docOptions?.docDate || this.formatHeaderDate(order.createdAt);

    const items = order.items
      .getItems()
      .slice()
      .sort((a, b) => {
        const skuA = String((a.variant as any)?.sku || (a.product as any)?.sku || '').trim().toUpperCase();
        const skuB = String((b.variant as any)?.sku || (b.product as any)?.sku || '').trim().toUpperCase();
        return skuA.localeCompare(skuB, 'es', { numeric: true, sensitivity: 'base' });
      })
      .map((item) => ({
        description: (item.product as any)?.name || 'Producto',
        variant: (item.variant as any)?.name || '-',
        sku: (item.variant as any)?.sku || (item.product as any)?.sku || '-',
        quantity: Number(item.quantity || 0).toLocaleString('es-CO'),
        unitPrice: this.formatCurrency(Number(item.unitPrice || 0)),
        lineTotal: this.formatCurrency(Number(item.quantity || 0) * Number(item.unitPrice || 0)),
      }));

    const html = compile({
      orderNumber: order.code,
      orderDate: this.formatDate(order.orderDate),
      customerName: (order.customer as any)?.name || 'N/A',
      customerDocument: [(order.customer as any)?.documentType, (order.customer as any)?.documentNumber].filter(Boolean).join(' ') || 'N/A',
      customerAddress: (order.customer as any)?.address || 'N/A',
      notes: order.notes || '',
      items,
      totalAmount: this.formatCurrency(Number(order.netTotalAmount || order.totalAmount || 0)),
      title: docTitle,
      processLabel,
      docCode,
      docVersion,
      logoDataUrl,
    });

    const browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      const pdfBuffer = await page.pdf({
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
        fileName: `${docCode}-v${docVersion}_${order.code}.pdf`,
        buffer: pdfBuffer,
      };
    } finally {
      await browser.close();
    }
  }
}
