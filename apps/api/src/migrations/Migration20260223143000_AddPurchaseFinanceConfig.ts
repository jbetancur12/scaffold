import { Migration } from '@mikro-orm/migrations';

export class Migration20260223143000_AddPurchaseFinanceConfig extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "operational_config"
                add column if not exists "purchase_payment_methods" jsonb not null default '["Contado","Crédito 30 días","Transferencia"]',
                add column if not exists "purchase_withholding_rules" jsonb not null default '[{"key":"compra","label":"Compra","rate":2.5,"active":true},{"key":"servicio","label":"Servicio","rate":4,"active":true}]';
        `);

        this.addSql(`
            alter table if exists "purchase_order"
                add column if not exists "purchase_type" varchar(255) null,
                add column if not exists "payment_method" varchar(255) null,
                add column if not exists "currency" varchar(16) null,
                add column if not exists "withholding_rate" numeric(6,2) not null default 0,
                add column if not exists "withholding_amount" numeric(10,2) not null default 0,
                add column if not exists "discount_amount" numeric(10,2) not null default 0,
                add column if not exists "other_charges_amount" numeric(10,2) not null default 0,
                add column if not exists "net_total_amount" numeric(10,2) not null default 0;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "purchase_order"
                drop column if exists "purchase_type",
                drop column if exists "payment_method",
                drop column if exists "currency",
                drop column if exists "withholding_rate",
                drop column if exists "withholding_amount",
                drop column if exists "discount_amount",
                drop column if exists "other_charges_amount",
                drop column if exists "net_total_amount";
        `);

        this.addSql(`
            alter table if exists "operational_config"
                drop column if exists "purchase_payment_methods",
                drop column if exists "purchase_withholding_rules";
        `);
    }
}
