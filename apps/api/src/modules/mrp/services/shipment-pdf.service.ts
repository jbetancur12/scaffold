import fs from 'node:fs';
import path from 'node:path';
import { EntityManager } from '@mikro-orm/core';
import { Shipment } from '../entities/shipment.entity';
import { AppError } from '../../../shared/utils/response';

const template = `
doctype html
html(lang="es")
  head
    meta(charset="UTF-8")
    style.
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #0f172a; }
      .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; margin-top: 12px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 12px; }
      .label { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
      th { text-align: left; padding: 6px 8px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; }
      td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
      .mono { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; font-size: 11px; }
      .footer { margin-top: 10px; font-size: 11px; color: #64748b; }
  body
    .card
      .grid
        div
          div.label Cliente
          div= customerName
        div
          div.label Documento
          div= customerDocument
        div
          div.label Dirección
          div= customerAddress
        div
          div.label Responsable
          div= dispatchedBy
    table
      thead
        tr
          th Producto
          if showVariant
            th Variante
          if showLot
            th Lote
          if showSerial
            th Serial
          th Cantidad
      tbody
        each item in items
          tr
            td= item.productName
            if showVariant
              td= item.variantName
            if showLot
              td.mono= item.lotCode
            if showSerial
              td.mono= item.serialCode
            td= item.quantity
    if notes
      .footer Notas: #{notes}
`;

type PugModule = {
  compile: (tpl: string, options?: { pretty?: boolean }) => (locals: Record<string, unknown>) => string;
};

type PlaywrightModule = {
  chromium: {
    launch: (options?: Record<string, unknown>) => Promise<{
      newPage: () => Promise<{
        setContent: (html: string, options?: { waitUntil?: 'networkidle' | 'load' }) => Promise<void>;
        pdf: (options?: Record<string, unknown>) => Promise<Buffer>;
      }>;
      close: () => Promise<void>;
    }>;
  };
};

export class ShipmentPdfService {
  constructor(private readonly em: EntityManager) {}

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
      return (eval('require') as NodeRequire)('pug') as PugModule;
    } catch {
      throw new AppError('Dependencia "pug" no instalada. Ejecuta: npm install --workspace=api pug @types/pug', 500);
    }
  }

  private loadPlaywright(): PlaywrightModule {
    try {
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

  private formatDate(value?: Date) {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('es-CO');
  }

  async generateShipmentPdf(
    id: string,
    options?: {
      columns?: {
        showVariant?: boolean;
        showLot?: boolean;
        showSerial?: boolean;
      };
    }
  ) {
    const shipmentRepo = this.em.getRepository(Shipment);
    const shipment = await shipmentRepo.findOne(
      { id },
      {
        populate: [
          'customer',
          'items',
          'items.productionBatch',
          'items.productionBatch.variant',
          'items.productionBatch.variant.product',
          'items.productionBatchUnit',
        ],
      }
    );
    if (!shipment) throw new AppError('Despacho no encontrado', 404);

    const compile = this.loadPug().compile(template);
    const logoDataUrl = this.getLogoDataUrl();

    const items = shipment.items.getItems().map((item) => ({
      productName: item.productionBatch?.variant?.product?.name || 'Producto',
      variantName: item.productionBatch?.variant?.name || '-',
      lotCode: item.productionBatch?.code || 'N/A',
      serialCode: item.productionBatchUnit?.serialCode || '-',
      quantity: Number(item.quantity || 0).toLocaleString('es-CO'),
    }));

    const html = compile({
      commercialDocument: shipment.commercialDocument,
      shippedAt: this.formatDate(shipment.shippedAt),
      customerName: shipment.customer?.name || 'N/A',
      customerDocument: [shipment.customer?.documentType, shipment.customer?.documentNumber].filter(Boolean).join(' ') || 'N/A',
      customerAddress: shipment.customer?.address || 'N/A',
      dispatchedBy: shipment.dispatchedBy || 'N/A',
      notes: shipment.notes || '',
      showVariant: options?.columns?.showVariant ?? true,
      showLot: options?.columns?.showLot ?? true,
      showSerial: options?.columns?.showSerial ?? true,
      items,
    });

    const browser = await this.loadPlaywright().chromium.launch({
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
          title: 'Remisión de despacho',
          processLabel: 'Proceso de Gestión Comercial',
          docCode: 'REM-ENV',
          docVersion: 1,
          docDate: this.formatDate(shipment.shippedAt),
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
        fileName: `REMISION-${shipment.commercialDocument}-${shipment.id.slice(0, 8).toUpperCase()}.pdf`,
        buffer,
      };
    } finally {
      await browser.close();
    }
  }
}
