import { EntityManager, EntityRepository } from '@mikro-orm/core';
import fs from 'node:fs';
import path from 'node:path';
import { AppError } from '../../../shared/utils/response';
import { ProductionBatch } from '../entities/production-batch.entity';

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

const packagingFormPdfTemplate = `
doctype html
html(lang="es")
  head
    meta(charset="UTF-8")
    meta(name="viewport" content="width=device-width, initial-scale=1.0")
    title= docCode + ' - Registro de Empaque'
    style.
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; margin: 0; }
      .section { margin-top: 12px; }
      .section h3 { margin: 0 0 8px 0; font-size: 13px; }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .field { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; min-height: 34px; }
      .field .k { font-size: 10px; text-transform: uppercase; color: #475569; }
      .field .v { font-size: 12px; font-weight: 600; margin-top: 2px; }
      table.chk { width: 100%; border-collapse: collapse; margin-top: 6px; }
      table.chk th, table.chk td { border: 1px solid #0f172a; padding: 6px; font-size: 11px; }
      table.chk th { background: #dbeafe; text-transform: uppercase; font-size: 10px; }
      .yes { color: #065f46; font-weight: 700; }
      .no { color: #991b1b; font-weight: 700; }
  body
    .section
      h3 DATOS GENERALES
      .grid-2
        .field
          .k Orden de producción
          .v= productionOrderCode
        .field
          .k Lote
          .v= batchCode
        .field
          .k Producto
          .v= productName
        .field
          .k Variante
          .v= variantName
        .field
          .k Operario
          .v= operatorName
        .field
          .k Verificador
          .v= verifierName
        .field
          .k Cantidad a empacar
          .v= quantityToPack
        .field
          .k Cantidad empacada
          .v= quantityPacked
        .field
          .k Etiqueta de lote
          .v= lotLabel
        .field
          .k Registro inventario
          .v= inventoryRecorded
    .section
      h3 CHECKLIST PREVIO
      table.chk
        thead
          tr
            th Criterio
            th Cumple
        tbody
          tr
            td Ficha técnica disponible
            td(class=hasTechnicalSheetClass)= hasTechnicalSheet
          tr
            td Etiquetas disponibles
            td(class=hasLabelsClass)= hasLabels
          tr
            td Material de empaque disponible
            td(class=hasPackagingMaterialClass)= hasPackagingMaterial
          tr
            td Herramientas listas
            td(class=hasToolsClass)= hasTools
    if observations
      .section
        h3 Observaciones
        .field
          .v(style='white-space: pre-wrap; font-weight: 400')= observations
    if nonConformity
      .section
        h3 No conformidad / Acciones
        .grid-2
          .field
            .k No conformidad
            .v(style='white-space: pre-wrap; font-weight: 400')= nonConformity
          .field
            .k Acción correctiva
            .v(style='white-space: pre-wrap; font-weight: 400')= correctiveAction
          .field
            .k Acción preventiva
            .v(style='white-space: pre-wrap; font-weight: 400')= preventiveAction
          .field
            .k Diligenciado por
            .v= formFilledBy
`;

export class PackagingFormPdfService {
    private readonly batchRepo: EntityRepository<ProductionBatch>;

    constructor(em: EntityManager) {
        this.batchRepo = em.getRepository(ProductionBatch);
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
                      <div class="l1">SAS COLMOR</div>
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
                <div>Calle 35 13-46 Guadalupe Dosquebradas - Risaralda</div>
                <div>Contáctenos: 3113441682 - 3425070 comercial@metromedicslab.com.co</div>
                <div>www.metromedics.co</div>
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

    async generatePackagingFormPdf(batchId: string) {
        const batch = await this.batchRepo.findOne(
            { id: batchId },
            { populate: ['productionOrder', 'variant', 'variant.product'] }
        );
        if (!batch) throw new AppError('Lote no encontrado', 404);
        if (!batch.packagingFormCompleted || !batch.packagingFormData) {
            throw new AppError('El lote no tiene FOR de empaque diligenciado', 400);
        }

        const form = batch.packagingFormData as Record<string, unknown>;
        const docCode = batch.packagingFormDocumentCode || 'GP-FOR-EMPAQUE';
        const docVersion = batch.packagingFormDocumentVersion || 1;
        const docDate = this.formatDate(batch.packagingFormDocumentDate || batch.createdAt);
        const title = batch.packagingFormDocumentTitle || 'Registro de Empaque y Acondicionamiento';
        const processLabel = this.resolveProcessLabelByDocCode(docCode);

        const asYesNo = (value: unknown) => (value ? 'SI' : 'NO');
        const asClass = (value: unknown) => (value ? 'yes' : 'no');

        const pug = this.loadPug();
        const playwright = this.loadPlaywright();
        const compile = pug.compile(packagingFormPdfTemplate);
        const logoDataUrl = this.getLogoDataUrl();
        const html = compile({
            docCode,
            productionOrderCode: batch.productionOrder.code,
            batchCode: batch.code,
            productName: batch.variant?.product?.name || 'N/A',
            variantName: batch.variant?.name || 'N/A',
            operatorName: String(form.operatorName || 'N/A'),
            verifierName: String(form.verifierName || 'N/A'),
            quantityToPack: Number(form.quantityToPack || 0).toLocaleString('es-CO'),
            quantityPacked: Number(form.quantityPacked || 0).toLocaleString('es-CO'),
            lotLabel: String(form.lotLabel || 'N/A'),
            inventoryRecorded: asYesNo(form.inventoryRecorded),
            hasTechnicalSheet: asYesNo(form.hasTechnicalSheet),
            hasTechnicalSheetClass: asClass(form.hasTechnicalSheet),
            hasLabels: asYesNo(form.hasLabels),
            hasLabelsClass: asClass(form.hasLabels),
            hasPackagingMaterial: asYesNo(form.hasPackagingMaterial),
            hasPackagingMaterialClass: asClass(form.hasPackagingMaterial),
            hasTools: asYesNo(form.hasTools),
            hasToolsClass: asClass(form.hasTools),
            observations: String(form.observations || ''),
            nonConformity: String(form.nonConformity || ''),
            correctiveAction: String(form.correctiveAction || ''),
            preventiveAction: String(form.preventiveAction || ''),
            formFilledBy: batch.packagingFormFilledBy || 'N/A',
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
                    title,
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
                fileName: `${docCode}-${batch.code}-v${docVersion}.pdf`,
                buffer: pdfBuffer,
            };
        } finally {
            await browser.close();
        }
    }
}
