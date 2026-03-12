import { EntityManager, FilterQuery } from '@mikro-orm/core';
import fs from 'node:fs';
import path from 'node:path';
import { Product } from '../entities/product.entity';
import { ProductImage } from '../entities/product-image.entity';
import { ObjectStorageService } from '../../../shared/services/object-storage.service';
import { AppError } from '../../../shared/utils/response';
import { ProductTaxStatus } from '@scaffold/types';
import { PriceListConfigService } from './price-list-config.service';

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

const productCatalogPdfTemplate = `
doctype html
html(lang="es")
  head
    meta(charset="UTF-8")
    meta(name="viewport" content="width=device-width, initial-scale=1.0")
    title= title
    style.
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #0f172a; font-size: 11px; margin: 0; }
      .cover { padding: 32px 36px 12px; }
      .cover-title { font-size: 20px; font-weight: 800; background: #93b0df; color: #0f172a; padding: 8px 12px; display: inline-block; }
      .cover-subtitle { margin-top: 6px; font-size: 16px; font-weight: 700; }
      .cover-body { margin-top: 18px; column-count: 2; column-gap: 28px; }
      .cover-intro { margin-bottom: 14px; }
      .policy { break-inside: avoid; margin-bottom: 12px; }
      .policy-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #1d4ed8; background: #dbeafe; padding: 4px 6px; display: inline-block; margin-bottom: 6px; }
      .page-break { page-break-after: always; }
      .header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 12px; border-bottom: 2px solid #e2e8f0; }
      .title { font-size: 18px; font-weight: 700; letter-spacing: .2px; }
      .subtitle { font-size: 11px; color: #64748b; margin-top: 4px; }
      .logo { height: 48px; max-width: 180px; object-fit: contain; }
      .group { margin: 18px 24px 0; page-break-inside: avoid; }
      .group-title { font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; background: #f1f5f9; padding: 6px 8px; border: 1px solid #e2e8f0; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td { border: 1px solid #e2e8f0; padding: 6px; vertical-align: top; }
      th { background: #f8fafc; text-transform: uppercase; font-size: 9px; letter-spacing: .05em; color: #475569; }
      .col-sku { width: 9%; }
      .col-name { width: 16%; }
      .col-image { width: 12%; }
      .col-desc { width: 30%; }
      .col-subtotal { width: 10%; }
      .col-iva { width: 11%; }
      .col-total { width: 10%; }
      .thumb { width: 64px; height: 64px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff; display: block; margin: 0 auto; }
      .thumb-placeholder { width: 64px; height: 64px; border: 1px dashed #cbd5e1; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #94a3b8; margin: 0 auto; }
      .muted { color: #64748b; font-size: 10px; }
      .right { text-align: right; }
      .nowrap { white-space: nowrap; }
  body
    if cover
      .cover
        if cover.logoDataUrl
          img.logo(src=cover.logoDataUrl)
        .cover-title= cover.headerTitle
        if cover.headerSubtitle
          .cover-subtitle= cover.headerSubtitle
        .cover-body
          if cover.introText
            .cover-intro= cover.introText
          each section in cover.sections
            .policy
              .policy-title= section.title
              div= section.body
      .page-break
    .header
      if logoDataUrl
        img.logo(src=logoDataUrl)
      else
        div(style='font-weight:700;font-size:16px') Portafolio
      div
        div.title= title
        div.subtitle= subtitle
    each group in groups
      .group
        .group-title= group.name
        table
          thead
            tr
              th.col-sku SKU
              th.col-name Producto
              th.col-image Imagen
              th.col-desc Descripción
              th.col-subtotal Subtotal
              th.col-iva IVA
              th.col-total Total
          tbody
            each row in group.rows
              tr
                td.col-sku
                  div= row.sku
                td.col-name
                  div(style='font-weight:600')= row.name
                td.col-image
                  if row.imageUrl
                    img.thumb(src=row.imageUrl)
                  else
                    .thumb-placeholder Sin imagen
                td.col-desc
                  div= row.description
                td.col-subtotal.right
                  div.nowrap= row.subtotal
                td.col-iva.right
                  div.nowrap= row.ivaLabel
                td.col-total.right
                  div.nowrap(style='font-weight:600')= row.total
`;

type CatalogRow = {
  sku: string;
  name: string;
  description: string;
  imageUrl?: string;
  subtotal: string;
  ivaLabel: string;
  total: string;
};

type CatalogGroup = {
  name: string;
  sortOrder: number;
  rows: CatalogRow[];
};

export class ProductCatalogPdfService {
  private readonly storageService: ObjectStorageService;
  private readonly configService: PriceListConfigService;

  constructor(private readonly em: EntityManager) {
    this.storageService = new ObjectStorageService();
    this.configService = new PriceListConfigService(em);
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

  private formatCurrency(value?: number | null) {
    const numeric = Number(value || 0);
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numeric);
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

  private async resolveImageUrl(images: ProductImage[]): Promise<string | undefined> {
    if (!images || images.length === 0) return undefined;
    const sorted = [...images].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    const selected = sorted[0];
    try {
      const buffer = await this.storageService.readObject(selected.filePath);
      const mime = selected.fileMime || 'image/jpeg';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch {
      return undefined;
    }
  }

  private pickPricingVariant(product: Product) {
    const variants = product.variants?.getItems?.() ?? [];
    if (!variants || variants.length === 0) return null;
    return [...variants].sort((a, b) => Number(b.price || 0) - Number(a.price || 0))[0];
  }

  async generateProductCatalogPdf(input: { search?: string; categoryId?: string }) {
    const filters: FilterQuery<Product> = {
      showInCatalogPdf: true,
    };
    const search = input.search?.trim();
    if (search) {
      filters.$or = [
        { name: { $ilike: `%${search}%` } },
        { sku: { $ilike: `%${search}%` } },
        { productReference: { $ilike: `%${search}%` } },
      ];
    }
    if (input.categoryId) {
      filters.category = input.categoryId;
    }

    const productRepo = this.em.getRepository(Product);
    const products = await productRepo.find(filters, {
      orderBy: { name: 'ASC' },
      populate: ['variants', 'category', 'images'],
    });

    const grouped = new Map<string, { sortOrder: number; rows: CatalogRow[] }>();
    for (const product of products) {
      const groupName = product.category?.name || 'Sin grupo';
      const sortOrder = Number(product.category?.sortOrder ?? 9999);
      const variant = this.pickPricingVariant(product);
      const price = Number(variant?.price || 0);
      const taxRate = variant && variant.taxStatus === ProductTaxStatus.GRAVADO ? Number(variant.taxRate || 0) : 0;
      const taxAmount = price * (taxRate / 100);
      const total = price + taxAmount;
      const ivaLabel = variant
        ? (variant.taxStatus === ProductTaxStatus.GRAVADO
            ? `${taxRate}%`
            : (variant.taxStatus === ProductTaxStatus.EXENTO ? 'Exento' : 'Excluido'))
        : 'Excluido';
      const images = product.images?.getItems?.() ?? [];
      const imageUrl = await this.resolveImageUrl(images);

      const row: CatalogRow = {
        sku: product.sku,
        name: product.name,
        description: product.description || 'Sin descripción',
        imageUrl,
        subtotal: this.formatCurrency(price),
        ivaLabel,
        total: this.formatCurrency(total),
      };

      const current = grouped.get(groupName) || { sortOrder, rows: [] };
      current.rows.push(row);
      grouped.set(groupName, current);
    }

    const groups: CatalogGroup[] = Array.from(grouped.entries())
      .sort(([aName, aData], [bName, bData]) => {
        const normalize = (value: string) => value.trim().toLowerCase();
        const aKey = normalize(aName);
        const bKey = normalize(bName);
        const aIsOther = aKey === 'otros' || aKey === 'sin grupo';
        const bIsOther = bKey === 'otros' || bKey === 'sin grupo';
        if (aIsOther && !bIsOther) return 1;
        if (bIsOther && !aIsOther) return -1;
        if (aData.sortOrder !== bData.sortOrder) return aData.sortOrder - bData.sortOrder;
        return aName.localeCompare(bName);
      })
      .map(([name, data]) => ({
        name,
        sortOrder: data.sortOrder,
        rows: data.rows.sort((a, b) => a.sku.localeCompare(b.sku)),
      }));

    const config = await this.configService.getConfig();
    const cover = config.showCover && (config.headerTitle || config.headerSubtitle || config.introText || (config.sections?.length || 0) > 0)
      ? {
        headerTitle: config.headerTitle || 'POLÍTICAS COMERCIALES',
        headerSubtitle: config.headerSubtitle || '',
        introText: config.introText || '',
        sections: (config.sections || []).map((section) => ({
          title: section.title,
          body: section.body,
        })),
        logoDataUrl: this.getLogoDataUrl(),
      }
      : undefined;

    const pug = this.loadPug();
    const playwright = this.loadPlaywright();
    const compile = pug.compile(productCatalogPdfTemplate);
    const logoDataUrl = this.getLogoDataUrl();
    const now = new Date();
    const html = compile({
      title: 'Catálogo de Precios',
      subtitle: `Generado el ${now.toLocaleDateString('es-CO')}`,
      logoDataUrl,
      cover,
      groups,
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
        landscape: true,
        printBackground: true,
        margin: {
          top: '20px',
          bottom: '24px',
          left: '16px',
          right: '16px',
        },
      });
      return {
        fileName: `catalogo_precios_${now.toISOString().slice(0, 10)}.pdf`,
        buffer: pdfBuffer,
      };
    } finally {
      await browser.close();
    }
  }
}
