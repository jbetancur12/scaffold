import fs from 'node:fs';
import path from 'node:path';
import { AppError } from '../../../shared/utils/response';

const template = `
doctype html
html(lang="es")
  head
    meta(charset="UTF-8")
    style.
      @page { size: 5.5in 4.25in; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; background: #fff; }
      .page {
        position: relative;
        width: 5.5in;
        height: 4.25in;
        padding: 0.28in 0.38in 0.55in 0.38in;
        overflow: hidden;
      }
      .logo { width: 155px; margin-bottom: 7px; display: block; }
      .sender { font-size: 10.5px; line-height: 1.4; text-transform: uppercase; font-weight: 600; }
      .sender strong { font-weight: 800; }
      .recipient {
        position: absolute;
        right: 0.38in;
        bottom: 0.62in;
        text-align: left;
        max-width: 3.5in;
      }
      .recipient .title {
        font-size: 17px;
        font-family: Georgia, "Times New Roman", serif;
        font-style: italic;
        margin-bottom: 4px;
        font-weight: normal;
      }
      .recipient .line {
        font-size: 18px;
        font-weight: 900;
        text-transform: uppercase;
        display: block;
        margin: 1px 0;
        letter-spacing: 0.01em;
      }
      .recipient .line.medium { font-size: 16px; }
      .recipient .line.small { font-size: 15px; }
      .recipient .line.underline { text-decoration: underline; }
      .stripes {
        position: absolute;
        left: 0; right: 0;
        bottom: 0.38in;
        height: 7px;
        display: flex;
        flex-direction: column;
      }
      .stripe { flex: 1; }
      .stripe.red    { background: #cc1a1a; }
      .stripe.yellow { background: #f5c518; }
      .stripe.blue   { background: #1a46cc; }
      .footer {
        position: absolute;
        left: 0; right: 0;
        bottom: 0.05in;
        padding: 0 0.38in;
        font-size: 8px;
        color: #1e3a8a;
        text-align: center;
        line-height: 1.4;
      }
  body
    .page
      if logoDataUrl
        img.logo(src=logoDataUrl alt="Logo")
      .sender
        | Rte.&nbsp;
        strong= senderName
        if senderNit
          |  #{senderNit}
      if senderAddress
        .sender= senderAddress
      if senderPhones
        .sender= senderPhones
      if senderCity
        .sender= senderCity

      .recipient
        div.title Señores
        if recipientName
          div.line= recipientName
        if recipientContact
          div.line.medium= recipientContact
        if recipientAddress
          div.line.medium= recipientAddress
        if recipientPhones
          div.line.medium= recipientPhones
        if recipientCity
          div.line.small= recipientCity

      .stripes
        .stripe.red
        .stripe.yellow
        .stripe.blue

      if footerLine || footerEmail
        .footer
          if footerLine
            div= footerLine
          if footerEmail
            div= footerEmail
`;

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

export class CustomerShippingLabelPdfService {
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

    async generateLabel(payload: {
        senderName: string;
        senderDocument?: string;
        senderAddress?: string;
        senderPhone?: string;
        senderMobile?: string;
        senderCity?: string;
        recipientName: string;
        recipientContact?: string;
        recipientAddress?: string;
        recipientPhone?: string;
        recipientMobile?: string;
        recipientCity?: string;
        recipientDepartment?: string;
        footerLine?: string;
        footerEmail?: string;
    }) {
        const pug = this.loadPug();
        const playwright = this.loadPlaywright();
        const compile = pug.compile(template);

        const senderNit = payload.senderDocument ? `Nit. ${payload.senderDocument}` : undefined;
        const senderPhones = [
            payload.senderPhone ? `TEL ${payload.senderPhone}` : undefined,
            payload.senderMobile ? `CEL ${payload.senderMobile}` : undefined,
        ].filter(Boolean).join(' - ');

        const recipientPhones = [
            payload.recipientPhone ? `TEL ${payload.recipientPhone}` : undefined,
            payload.recipientMobile ? `CEL ${payload.recipientMobile}` : undefined,
        ].filter(Boolean).join(" - ");

        const recipientCity = [payload.recipientCity, payload.recipientDepartment]
            .filter(Boolean)
            .join(' - ');

        const html = compile({
            logoDataUrl: this.getLogoDataUrl(),
            senderName: payload.senderName,
            senderNit,
            senderAddress: payload.senderAddress,
            senderPhones: senderPhones || undefined,
            senderCity: payload.senderCity,
            recipientName: payload.recipientName,
            recipientContact: payload.recipientContact,
            recipientAddress: payload.recipientAddress,
            recipientPhones: recipientPhones || undefined,
            recipientCity: recipientCity || undefined,
            footerLine: payload.footerLine,
            footerEmail: payload.footerEmail,
        });

        const browser = await playwright.chromium.launch();
        try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle' });
            const buffer = await page.pdf({
                width: '5.5in',
                height: '4.25in',       // Media hoja carta (8.5in / 2)
                printBackground: true,
                margin: { top: '0in', bottom: '0in', left: '0in', right: '0in' },
            });
            const safeName = payload.recipientName
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 60)
                .toUpperCase();
            const fileName = `ROTULO-${safeName || 'ENVIO'}.pdf`;
            return { fileName, buffer };
        } finally {
            await browser.close();
        }
    }
}