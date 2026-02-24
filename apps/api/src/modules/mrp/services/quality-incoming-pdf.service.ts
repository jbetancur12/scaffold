import { EntityManager, EntityRepository } from '@mikro-orm/core';
import fs from 'node:fs';
import path from 'node:path';
import { AppError } from '../../../shared/utils/response';
import { IncomingInspection } from '../entities/incoming-inspection.entity';

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

const incomingInspectionPdfTemplate = `
doctype html
html(lang="es")
  head
    meta(charset="UTF-8")
    meta(name="viewport" content="width=device-width, initial-scale=1.0")
    title= docCode + ' - ' + title
    style.
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; margin: 0; }
      .section { margin-top: 12px; }
      .section h3 { margin: 0 0 8px 0; font-size: 13px; }
      .field { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; min-height: 34px; }
      .field .k { font-size: 10px; text-transform: uppercase; color: #475569; }
      .field .v { font-size: 12px; font-weight: 600; margin-top: 2px; }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      table.form28 { width: 100%; border-collapse: collapse; margin-top: 6px; }
      table.form28 th, table.form28 td { border: 1px solid #0f172a; padding: 6px; font-size: 11px; vertical-align: middle; }
      table.form28 th { background: #dbeafe; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; }
  body
    .section
      h3 RECEPCIÓN MATERIA PRIMA
      table.form28
        thead
          tr
            th(style='width:14%') Materia Prima
            th(style='width:16%') Descripción
            th(style='width:10%') Lote
            th(style='width:14%') Proveedor
            th(style='width:10%') Factura N°
            th(style='width:8%') Unidades
            th(style='width:9%') Cantidad
            th(style='width:10%') Fecha Entrada
            th(style='width:9%') Firma Responsable
        tbody
          tr
            td= rawMaterialName
            td= rawMaterialDescription
            td= supplierLotCode
            td= supplierName
            td= invoiceNumber
            td= unit
            td= quantityReceived
            td= receivedAt
            td= responsibleSignature
    .section
      h3 Resultado de Inspección
      .grid-2
        .field
          .k Resultado
          .v= inspectionResult
        .field
          .k Estado
          .v= status
        .field
          .k Certificado / CoA
          .v= certificateRef
        .field
          .k Archivo certificado
          .v= certificateFileAttached
        .field
          .k Archivo factura
          .v= invoiceFileAttached
        .field
          .k Costo unitario aceptado
          .v= acceptedUnitCost
    if notes
      .section
        h3 Observaciones
        .field
          .v(style='white-space: pre-wrap; font-weight: 400')= notes
`;

export class QualityIncomingPdfService {
    private readonly incomingRepo: EntityRepository<IncomingInspection>;

    constructor(em: EntityManager) {
        this.incomingRepo = em.getRepository(IncomingInspection);
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

    private formatCurrency(value?: number | null) {
        const numeric = Number(value || 0);
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 4,
        }).format(numeric);
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

    async generateIncomingInspectionPdf(id: string) {
        const inspection = await this.incomingRepo.findOne(
            { id },
            {
                populate: ['rawMaterial', 'purchaseOrder', 'purchaseOrder.supplier'],
            }
        );
        if (!inspection) throw new AppError('Inspección de recepción no encontrada', 404);

        const pug = this.loadPug();
        const playwright = this.loadPlaywright();
        const compile = pug.compile(incomingInspectionPdfTemplate);
        const logoDataUrl = this.getLogoDataUrl();

        const docCode = inspection.documentControlCode || 'GC-FOR-28';
        const docVersion = inspection.documentControlVersion || 1;
        const docDate = this.formatHeaderDate(inspection.documentControlDate || inspection.createdAt);
        const processLabel = this.resolveProcessLabelByDocCode(docCode);
        const title = inspection.documentControlTitle || 'Recepción de Materias Primas';

        const html = compile({
            title,
            docCode,
            docVersion,
            docDate,
            rawMaterialName: inspection.rawMaterial?.name || 'N/A',
            rawMaterialDescription: inspection.rawMaterial?.sku || inspection.rawMaterial?.name || 'N/A',
            supplierLotCode: inspection.supplierLotCode || 'N/A',
            supplierName: inspection.purchaseOrder?.supplier?.name || 'N/A',
            invoiceNumber: inspection.invoiceNumber || 'N/A',
            unit: inspection.rawMaterial?.unit || 'N/A',
            quantityReceived: Number(inspection.quantityReceived || 0).toLocaleString('es-CO'),
            receivedAt: this.formatDate(inspection.createdAt),
            responsibleSignature: inspection.releasedBy || inspection.inspectedBy || 'N/A',
            inspectionResult: inspection.inspectionResult || 'N/A',
            status: inspection.status || 'N/A',
            certificateRef: inspection.certificateRef || 'N/A',
            certificateFileAttached: inspection.certificateFileName ? `Adjunto: ${inspection.certificateFileName}` : 'Sin adjunto',
            invoiceFileAttached: inspection.invoiceFileName ? `Adjunto: ${inspection.invoiceFileName}` : 'Sin adjunto',
            acceptedUnitCost: inspection.acceptedUnitCost ? this.formatCurrency(Number(inspection.acceptedUnitCost)) : 'N/A',
            notes: inspection.notes || '',
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
                fileName: `${docCode}-${inspection.id.slice(0, 8).toUpperCase()}-v${docVersion}.pdf`,
                buffer: pdfBuffer,
            };
        } finally {
            await browser.close();
        }
    }
}
