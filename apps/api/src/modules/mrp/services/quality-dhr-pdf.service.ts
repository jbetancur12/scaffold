import { BatchDhrExpedient } from '@scaffold/types';
import { AppError } from '../../../shared/utils/response';

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

const dhrPdfTemplate = `
doctype html
html(lang='es')
  head
    meta(charset='UTF-8')
    meta(name='viewport' content='width=device-width, initial-scale=1.0')
    title= 'DHR ' + batchCode
    style.
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; font-size: 11px; }
      .page { padding: 16px 20px 20px 20px; }
      .head { display: grid; grid-template-columns: 1.3fr 1fr; gap: 10px; margin-bottom: 12px; }
      .box { border: 1px solid #0f172a; border-radius: 4px; padding: 8px; }
      .k { font-size: 9px; text-transform: uppercase; color: #475569; margin-bottom: 2px; }
      .v { font-size: 11px; font-weight: 700; }
      .title { font-size: 15px; font-weight: 700; margin: 0 0 2px 0; }
      .subtitle { margin: 0; font-size: 11px; color: #334155; }
      .section-title { margin: 14px 0 6px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td { border: 1px solid #0f172a; padding: 5px; vertical-align: top; }
      th { background: #e2e8f0; font-size: 10px; text-transform: uppercase; }
      td { font-size: 10px; }
      .muted { color: #64748b; }
      .nowrap { white-space: nowrap; }
  body
    .page
      .head
        .box
          p.title Expediente DHR por Lote
          p.subtitle= 'Lote: ' + batchCode + ' · OP: ' + productionOrderCode
          p.subtitle= 'Producto: ' + productName + ' · Variante: ' + variantName
          p.subtitle= 'Generado: ' + generatedAt + ' · Responsable: ' + generatedBy
        .box
          .k Estado lote
          .v= batchStatus
          .k(style='margin-top:6px') QC / Empaque
          .v= qcStatus + ' / ' + packagingStatus
          .k(style='margin-top:6px') Cantidades
          .v= 'Plan: ' + plannedQty + ' · Producido: ' + producedQty

      h3.section-title Materiales requeridos (BOM)
      table
        thead
          tr
            th(style='width:24%') Materia prima
            th(style='width:14%') SKU
            th(style='width:12%') Cant. plan
            th(style='width:16%') Últ. inspección
            th(style='width:14%') OC
            th(style='width:20%') Proveedor/Lote
        tbody
          if materials.length === 0
            tr
              td(colspan='6' class='muted') Sin materiales relacionados.
          else
            each m in materials
              tr
                td= m.rawMaterialName
                td= m.rawMaterialSku
                td.nowrap= m.plannedQuantity
                td.nowrap= m.inspectionDate || '-'
                td= m.purchaseOrderCode || '-'
                td= m.supplierInfo || '-'

      h3.section-title Movimientos kardex (consumo / devolución)
      table
        thead
          tr
            th(style='width:10%') Fecha
            th(style='width:18%') Materia prima
            th(style='width:11%') Tipo
            th(style='width:10%') Cantidad
            th(style='width:10%') Saldo lote
            th(style='width:13%') Lote MP
            th(style='width:12%') Bodega
            th(style='width:16%') Referencia
        tbody
          if movements.length === 0
            tr
              td(colspan='8' class='muted') Sin movimientos kardex vinculados a esta OP.
          else
            each mv in movements
              tr
                td.nowrap= mv.occurredAt
                td= mv.rawMaterialName
                td= mv.movementType
                td.nowrap= mv.quantity
                td.nowrap= mv.balanceAfter
                td= mv.supplierLotCode || '-'
                td= mv.warehouseName || '-'
                td= mv.referenceLabel

      h3.section-title Hitos de calidad
      table
        thead
          tr
            th(style='width:16%') Ítem
            th(style='width:20%') Documento
            th(style='width:8%') Versión
            th(style='width:10%') Fecha
            th(style='width:12%') Estado
            th(style='width:34%') Nota
        tbody
          each q in qualitySteps
            tr
              td= q.step
              td= q.code
              td.nowrap= q.version
              td.nowrap= q.date
              td= q.status
              td= q.note
`;

export class QualityDhrPdfService {
    private loadPug(): PugModule {
        try {
            // eslint-disable-next-line @typescript-eslint/no-implied-eval
            return (eval('require') as NodeRequire)('pug') as PugModule;
        } catch {
            throw new AppError('Dependencia "pug" no instalada. Ejecuta: npm install --workspace=api pug', 500);
        }
    }

    private async loadPlaywright(): Promise<PlaywrightModule> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-implied-eval
            return (eval('require') as NodeRequire)('playwright') as PlaywrightModule;
        } catch {
            throw new AppError('Dependencia "playwright" no instalada. Ejecuta: npm install --workspace=api playwright', 500);
        }
    }

    private formatDate(value?: string | Date | null) {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    }

    private formatNumber(value: number) {
        return Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 4 });
    }

    async generateBatchDhrPdf(data: BatchDhrExpedient) {
        const pug = this.loadPug();
        const playwright = await this.loadPlaywright();
        const compile = pug.compile(dhrPdfTemplate, { pretty: false });

        const qualitySteps = [
            {
                step: 'FOR Empaque',
                code: data.batchRelease?.documentControlCode || '-',
                version: data.batchRelease?.documentControlVersion ? `v${data.batchRelease.documentControlVersion}` : '-',
                date: this.formatDate(data.batchRelease?.documentControlDate),
                status: data.productionBatch.packagingStatus,
                note: data.batchRelease?.checklistNotes || '-',
            },
            {
                step: 'Etiquetado',
                code: data.regulatoryLabels[0]?.documentControlCode || '-',
                version: data.regulatoryLabels[0]?.documentControlVersion ? `v${data.regulatoryLabels[0].documentControlVersion}` : '-',
                date: this.formatDate(data.regulatoryLabels[0]?.documentControlDate),
                status: data.regulatoryLabels[0]?.status || '-',
                note: data.regulatoryLabels[0]?.internalCode || data.regulatoryLabels[0]?.codingValue || '-',
            },
            {
                step: 'Liberación QA',
                code: data.batchRelease?.documentControlCode || '-',
                version: data.batchRelease?.documentControlVersion ? `v${data.batchRelease.documentControlVersion}` : '-',
                date: this.formatDate(data.batchRelease?.documentControlDate),
                status: data.batchRelease?.status || '-',
                note: data.batchRelease?.signedBy || '-',
            },
        ];

        const html = compile({
            batchCode: data.productionBatch.code,
            productionOrderCode: data.productionBatch.productionOrder?.code || '-',
            productName: data.productionBatch.variant?.product?.name || '-',
            variantName: data.productionBatch.variant?.name || '-',
            generatedAt: this.formatDate(data.generatedAt),
            generatedBy: data.generatedBy || 'sistema',
            batchStatus: data.productionBatch.status,
            qcStatus: data.productionBatch.qcStatus,
            packagingStatus: data.productionBatch.packagingStatus,
            plannedQty: this.formatNumber(data.productionBatch.plannedQty),
            producedQty: this.formatNumber(data.productionBatch.producedQty),
            materials: data.materials.map((m) => ({
                rawMaterialName: m.rawMaterialName,
                rawMaterialSku: m.rawMaterialSku,
                plannedQuantity: this.formatNumber(m.plannedQuantity),
                inspectionDate: this.formatDate(m.latestInspection?.inspectedAt),
                purchaseOrderCode: m.latestInspection?.purchaseOrderCode || '-',
                supplierInfo: [m.latestInspection?.supplierName, m.latestInspection?.supplierLotCode].filter(Boolean).join(' · '),
            })),
            movements: data.materialMovements.map((mv) => ({
                ...mv,
                occurredAt: this.formatDate(mv.occurredAt),
                quantity: this.formatNumber(mv.quantity),
                balanceAfter: this.formatNumber(mv.balanceAfter),
                referenceLabel: [mv.referenceType, mv.referenceId].filter(Boolean).join(' / '),
            })),
            qualitySteps,
        });

        const browser = await playwright.chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
        });
        try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle' });
            const buffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '10mm', right: '10mm', bottom: '12mm', left: '10mm' },
            });
            const now = new Date().toISOString().replace(/[:]/g, '-');
            return {
                buffer,
                fileName: `DHR-${data.productionBatch.code}-${now}.pdf`,
            };
        } finally {
            await browser.close();
        }
    }
}
