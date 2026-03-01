import { EntityManager, EntityRepository } from '@mikro-orm/core';
import fs from 'node:fs';
import path from 'node:path';
import { AppError } from '../../../shared/utils/response';
import { RegulatoryLabel } from '../entities/regulatory-label.entity';
import { RegulatoryLabelScopeType } from '@scaffold/types';

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

const labelPdfTemplate = `
doctype html
html(lang="es")
  head
    meta(charset="UTF-8")
    style.
      body { font-family: Arial, sans-serif; font-size: 12px; color: #0f172a; margin: 0; }
      .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .f { border:1px solid #cbd5e1; border-radius:6px; padding:6px 8px; }
      .k { font-size:10px; text-transform:uppercase; color:#475569; }
      .v { font-size:12px; font-weight:600; margin-top:2px; }
  body
    .grid
      .f
        .k Lote
        .v= lotCode
      .f
        .k Producto
        .v= productName
      .f
        .k Fabricante
        .v= manufacturerName
      .f
        .k Registro INVIMA
        .v= invimaRegistration
      .f
        .k Fecha fabricación
        .v= manufactureDate
      .f
        .k Fecha vencimiento
        .v= expirationDate
      .f
        .k Estándar
        .v= codingStandard
      .f
        .k Estado etiqueta
        .v= status
    .f(style="margin-top:8px;")
      .k Código de etiquetado generado
      .v= codingValue
`;

export class QualityLabelingPdfService {
  private readonly regulatoryLabelRepo: EntityRepository<RegulatoryLabel>;

  constructor(em: EntityManager) {
    this.regulatoryLabelRepo = em.getRepository(RegulatoryLabel);
  }

  private formatDate(value?: Date | string | null) {
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
    return map[prefix] || 'Proceso de Gestión de Calidad';
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
      path.resolve(process.cwd(), 'src/assets/colmor-logo.jpg'),
      path.resolve(process.cwd(), 'apps/api/src/assets/colmor-logo.jpg'),
      path.resolve(process.cwd(), 'logo.jpg'),
      path.resolve(process.cwd(), '..', 'logo.jpg'),
    ];
    for (const filePath of candidates) {
      if (!fs.existsSync(filePath)) continue;
      const mime = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
      const base64 = fs.readFileSync(filePath).toString('base64');
      return `data:${mime};base64,${base64}`;
    }
    return undefined;
  }

  private loadPug(): PugModule {
    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      return (eval('require') as NodeRequire)('pug') as PugModule;
    } catch {
      throw new AppError('Dependencia "pug" no instalada', 500);
    }
  }

  private loadPlaywright(): PlaywrightModule {
    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      return (eval('require') as NodeRequire)('playwright') as PlaywrightModule;
    } catch {
      throw new AppError('Dependencia "playwright" no instalada', 500);
    }
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

  async generateLabelPdf(productionBatchId: string) {
    const label = await this.regulatoryLabelRepo.findOne(
      { productionBatch: productionBatchId, scopeType: RegulatoryLabelScopeType.LOTE },
      { populate: ['productionBatch'] }
    );
    if (!label) throw new AppError('No existe etiqueta de lote para este batch', 404);

    const docCode = label.documentControlCode || 'FOR-ETQ';
    const docVersion = label.documentControlVersion || 1;
    const docDate = this.formatDate(label.documentControlDate || label.updatedAt);
    const title = label.documentControlTitle || 'Registro de Verificación de Etiquetado por Lote';
    const processLabel = this.resolveProcessLabelByDocCode(docCode);

    const pug = this.loadPug();
    const playwright = this.loadPlaywright();
    const compile = pug.compile(labelPdfTemplate);
    const logoDataUrl = this.getLogoDataUrl();
    const html = compile({
      lotCode: label.lotCode,
      productName: label.productName,
      manufacturerName: label.manufacturerName,
      invimaRegistration: label.invimaRegistration,
      manufactureDate: this.formatDate(label.manufactureDate),
      expirationDate: this.formatDate(label.expirationDate),
      codingStandard: label.codingStandard,
      status: label.status,
      codingValue: label.codingValue || 'N/A',
    });

    const browser = await playwright.chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      const buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: this.buildHeaderTemplate({ logoDataUrl, title, processLabel, docCode, docVersion, docDate }),
        footerTemplate: this.buildFooterTemplate(),
        margin: { top: '140px', bottom: '62px', left: '24px', right: '24px' },
      });
      return {
        fileName: `${docCode}-${label.productionBatch.code}-v${docVersion}.pdf`,
        buffer,
      };
    } finally {
      await browser.close();
    }
  }
}
