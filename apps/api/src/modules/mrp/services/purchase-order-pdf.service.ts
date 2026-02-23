import { EntityManager } from '@mikro-orm/core';
import { AppError } from '../../../shared/utils/response';
import { PurchaseOrderService } from './purchase-order.service';

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

const purchaseOrderPdfTemplate = `
doctype html
html(lang="es")
  head
    meta(charset="UTF-8")
    meta(name="viewport" content="width=device-width, initial-scale=1.0")
    title= orderNumber + ' - ' + title
    style.
      @page { size: A4; margin: 110px 24px 80px 24px; }
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; margin: 0; }
      .doc-header { position: fixed; top: -95px; left: 0; right: 0; border: 1px solid #0f172a; padding: 10px 12px; }
      .doc-header-grid { display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 10px; align-items: center; }
      .company { font-weight: 700; font-size: 11px; line-height: 1.3; }
      .title { text-align: center; font-size: 17px; font-weight: 700; }
      .meta { border: 1px solid #0f172a; width: 100%; border-collapse: collapse; }
      .meta td { border: 1px solid #0f172a; padding: 4px 6px; font-size: 11px; }
      .section { margin-top: 14px; }
      .section h3 { margin: 0 0 8px 0; font-size: 13px; }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .field { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; min-height: 36px; }
      .field .k { font-size: 10px; text-transform: uppercase; color: #475569; }
      .field .v { font-size: 12px; font-weight: 600; margin-top: 2px; }
      table.items { width: 100%; border-collapse: collapse; margin-top: 6px; }
      table.items th, table.items td { border: 1px solid #0f172a; padding: 6px; font-size: 11px; vertical-align: top; }
      table.items th { background: #f1f5f9; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; }
      .right { text-align: right; }
      .totals { margin-top: 10px; width: 320px; margin-left: auto; border-collapse: collapse; }
      .totals td { border: 1px solid #0f172a; padding: 6px; font-size: 11px; }
      .totals .label { background: #f8fafc; }
      .totals .net { font-size: 13px; font-weight: 700; background: #e2e8f0; }
      .doc-footer { position: fixed; bottom: -64px; left: 0; right: 0; border-top: 1px solid #0f172a; padding-top: 6px; font-size: 10px; color: #475569; }
      .footer-grid { display: flex; justify-content: space-between; gap: 10px; }
  body
    .doc-header
      .doc-header-grid
        .company
          div COLOMBIA MEDICAS Y ORTOPEDICAS SAS COLMOR
          div NIT 900.712.025-4
        .title
          div= title
        table.meta
          tr
            td Código
            td= docCode
          tr
            td Versión
            td= docVersion
          tr
            td Fecha
            td= docDate
    .section
      h3 Información General
      .grid-2
        .field
          .k Orden N°
          .v= orderNumber
        .field
          .k Fecha de Orden
          .v= orderDate
        .field
          .k Proveedor
          .v= supplierName
        .field
          .k Fecha esperada
          .v= expectedDeliveryDate
        .field
          .k Tipo de compra
          .v= purchaseType
        .field
          .k Forma de pago
          .v= paymentMethod
    .section
      h3 Ítems
      table.items
        thead
          tr
            th(style='width: 34%') Descripción
            th(style='width: 14%') Referencia
            th(style='width: 10%') Unidad
            th(style='width: 10%') Cantidad
            th(style='width: 14%') Vr. Unitario
            th(style='width: 18%') Total
        tbody
          each row in items
            tr
              td= row.description
              td= row.reference
              td= row.unit
              td.right= row.quantity
              td.right= row.unitPrice
              td.right
                div= row.lineTotal
                if row.taxAmount && row.taxAmount !== '$ 0'
                  div(style='font-size:10px;color:#64748b') IVA: #{row.taxAmount}
    table.totals
      tr
        td.label Subtotal base
        td.right= subtotalBase
      tr
        td.label IVA total
        td.right= taxTotal
      tr
        td.label Descuento
        td.right= discountAmount
      tr
        td.label Retención
        td.right= withholdingAmount
      tr
        td.label Otros cargos
        td.right= otherChargesAmount
      tr
        td.net Total neto
        td.net.right= netTotalAmount
    if notes
      .section
        h3 Observaciones
        .field
          .v(style='white-space: pre-wrap; font-weight: 400')= notes
    .doc-footer
      .footer-grid
        span Documento generado por plataforma MRP COLMOR
        span= generatedAt
`;

export class PurchaseOrderPdfService {
    private readonly purchaseOrderService: PurchaseOrderService;

    constructor(em: EntityManager) {
        this.purchaseOrderService = new PurchaseOrderService(em);
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

    async generatePurchaseOrderPdf(id: string) {
        const order = await this.purchaseOrderService.getPurchaseOrder(id);
        if (!order) {
            throw new AppError('Orden de compra no encontrada', 404);
        }

        const pug = this.loadPug();
        const playwright = this.loadPlaywright();
        const compile = pug.compile(purchaseOrderPdfTemplate);
        const html = compile({
            title: order.documentControlTitle || 'Orden de Compra',
            docCode: order.documentControlCode || 'GP-FOR-04',
            docVersion: order.documentControlVersion || 1,
            docDate: this.formatDate(order.documentControlDate || order.createdAt),
            orderNumber: `OC-${order.id.slice(0, 8).toUpperCase()}`,
            orderDate: this.formatDate(order.orderDate),
            supplierName: order.supplier?.name || 'N/A',
            expectedDeliveryDate: this.formatDate(order.expectedDeliveryDate),
            purchaseType: order.purchaseType || 'N/A',
            paymentMethod: order.paymentMethod || 'N/A',
            notes: order.notes || '',
            items: (order.items ?? []).map((item) => ({
                description: item.rawMaterial?.name || item.customDescription || 'Ítem libre',
                reference: item.rawMaterial?.sku || '-',
                unit: item.rawMaterial?.unit || item.customUnit || '',
                quantity: Number(item.quantity || 0).toLocaleString('es-CO'),
                unitPrice: this.formatCurrency(Number(item.unitPrice || 0)),
                lineTotal: this.formatCurrency(Number(item.subtotal || 0)),
                taxAmount: this.formatCurrency(Number(item.taxAmount || 0)),
            })),
            subtotalBase: this.formatCurrency(Number(order.subtotalBase || 0)),
            taxTotal: this.formatCurrency(Number(order.taxTotal || 0)),
            discountAmount: this.formatCurrency(Number(order.discountAmount || 0)),
            withholdingAmount: this.formatCurrency(Number(order.withholdingAmount || 0)),
            otherChargesAmount: this.formatCurrency(Number(order.otherChargesAmount || 0)),
            netTotalAmount: this.formatCurrency(Number(order.netTotalAmount || order.totalAmount || 0)),
            generatedAt: new Date().toLocaleString('es-CO'),
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
                preferCSSPageSize: true,
            });
            return {
                fileName: `${order.documentControlCode || 'OC'}-${order.id.slice(0, 8).toUpperCase()}-v${order.documentControlVersion || 1}.pdf`,
                buffer: pdfBuffer,
            };
        } finally {
            await browser.close();
        }
    }
}
