import fs from 'node:fs';
import path from 'node:path';
import { EntityManager } from '@mikro-orm/core';
import { AppError } from '../../../shared/utils/response';
import { PurchaseRequisitionService } from './purchase-requisition.service';

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
    meta(name="viewport" content="width=device-width, initial-scale=1.0")
    title= code + ' - Requisición de Compra'
    style.
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; margin: 0; padding: 0; }
      .page { padding: 10px 0 0 0; }
      .meta-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; margin-top: 8px; }
      .meta-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; min-height: 40px; }
      .meta-k { font-size: 10px; text-transform: uppercase; color: #475569; }
      .meta-v { font-size: 12px; font-weight: 700; margin-top: 2px; }
      .notes { margin-top: 10px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; white-space: pre-wrap; }
      table.items { width: 100%; border-collapse: collapse; margin-top: 12px; }
      table.items th, table.items td { border: 1px solid #0f172a; padding: 6px; font-size: 11px; vertical-align: top; }
      table.items th { background: #f1f5f9; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; text-align: left; }
      .right { text-align: right; }
      .center { text-align: center; }
      .summary { margin-top: 10px; border-collapse: collapse; width: 240px; margin-left: auto; }
      .summary td { border: 1px solid #0f172a; padding: 6px; font-size: 11px; }
      .summary .label { background: #f8fafc; }
      .summary .value { font-weight: 700; text-align: right; }
  body
    .page
      .meta-grid
        .meta-card
          .meta-k Requisición
          .meta-v= code
        .meta-card
          .meta-k Fecha
          .meta-v= createdAt
        .meta-card
          .meta-k Solicitante
          .meta-v= requestedBy
        .meta-card
          .meta-k Estado
          .meta-v= status
        .meta-card
          .meta-k Necesario para
          .meta-v= neededBy
        .meta-card
          .meta-k OP Asociadas
          .meta-v= productionOrderCode
      if notes
        .notes= notes
      table.items
        thead
          tr
            th(style='width: 30%') Materia Prima
            th(style='width: 16%') SKU
            th(style='width: 10%') Unidad
            th(style='width: 10%') Cantidad
            th(style='width: 20%') Proveedor Sugerido
            th(style='width: 18%') Origen OP
            th(style='width: 12%') Notas
        tbody
          each item in items
            tr
              td= item.materialName
              td= item.materialSku
              td.center= item.unit
              td.right= item.quantity
              td= item.suggestedSupplier
              td= item.sourceProductionOrders
              td= item.notes
      table.summary
        tr
          td.label Total Ítems
          td.value= totalItems
        tr
          td.label Total Cantidad
          td.value= totalQuantity
`;

export class PurchaseRequisitionPdfService {
  private readonly purchaseRequisitionService: PurchaseRequisitionService;

  constructor(em: EntityManager) {
    this.purchaseRequisitionService = new PurchaseRequisitionService(em);
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

  private formatDate(value?: Date | string | null) {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('es-CO');
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

  private getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      APROBADA: 'Aprobada',
      CONVERTIDA: 'Convertida',
      CANCELADA: 'Cancelada',
    };
    return labels[status] || status;
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
    return map[prefix] || 'Proceso de Gestión de Producción';
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  async generatePurchaseRequisitionPdf(id: string) {
    const row = await this.purchaseRequisitionService.getById(id);
    if (!row) {
      throw new AppError('Requisición no encontrada', 404);
    }

    const pug = this.loadPug();
    const playwright = this.loadPlaywright();
    const compile = pug.compile(template);
    const logoDataUrl = this.getLogoDataUrl();
    const docCode = 'GAF-FOR-03';
    const docTitle = 'Requisición de Compra';
    const processLabel = this.resolveProcessLabelByDocCode(docCode);
    const docDate = this.formatHeaderDate(row.createdAt);

    const totalQuantity = (row.items?.getItems() ?? []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const code = `REQ-${row.id.slice(0, 8).toUpperCase()}`;
    const productionOrderIds = row.productionOrderIds?.length
      ? row.productionOrderIds
      : (row.productionOrderId ? [row.productionOrderId] : []);
    const html = compile({
      code,
      createdAt: this.formatDate(row.createdAt),
      requestedBy: row.requestedBy || 'N/A',
      status: this.getStatusLabel(String(row.status || '')),
      neededBy: this.formatDate(row.neededBy),
      productionOrderCode: productionOrderIds.length > 0
        ? productionOrderIds.map((productionOrderId) => `OP-${productionOrderId.slice(0, 8).toUpperCase()}`).join(', ')
        : 'Manual',
      notes: row.notes || '',
      totalItems: String(row.items?.count() || 0),
      totalQuantity: Number(totalQuantity).toLocaleString('es-CO'),
      items: (row.items?.getItems() ?? []).map((item) => ({
        materialName: item.rawMaterial?.name || 'N/A',
        materialSku: item.rawMaterial?.sku || '-',
        unit: item.rawMaterial?.unit || '-',
        quantity: Number(item.quantity || 0).toLocaleString('es-CO'),
        suggestedSupplier: item.suggestedSupplier?.name || 'Sin sugerencia',
        sourceProductionOrders: item.sourceProductionOrders?.length
          ? item.sourceProductionOrders
            .map((source) => `${source.productionOrderCode || `OP-${source.productionOrderId.slice(0, 8).toUpperCase()}`}: ${Number(source.quantity).toLocaleString('es-CO')}`)
            .join(', ')
          : '-',
        notes: item.notes || '',
      })),
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
          docVersion: 1,
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
        fileName: `${docCode}-v1_${code}.pdf`,
        buffer,
      };
    } finally {
      await browser.close();
    }
  }
}
