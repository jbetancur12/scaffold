import { Migration } from '@mikro-orm/migrations';

export class Migration20260303014000_RepairOperationalConfigColumns extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "operational_config"
                add column if not exists "purchase_payment_methods" jsonb not null default '["Contado","Crédito 30 días","Transferencia"]',
                add column if not exists "purchase_withholding_rules" jsonb not null default '[{"key":"compra","label":"Compra","rate":2.5,"active":true},{"key":"servicio","label":"Servicio","rate":4,"active":true}]',
                add column if not exists "default_purchase_order_controlled_document_id" varchar(255) null,
                add column if not exists "default_purchase_order_controlled_document_code" varchar(255) null,
                add column if not exists "default_incoming_inspection_controlled_document_code" varchar(255) null,
                add column if not exists "default_packaging_controlled_document_code" varchar(255) null,
                add column if not exists "default_finished_inspection_controlled_document_code" varchar(255) null,
                add column if not exists "default_labeling_controlled_document_code" varchar(255) null,
                add column if not exists "default_batch_release_controlled_document_code" varchar(255) null,
                add column if not exists "purchase_order_prefix" varchar(255) null,
                add column if not exists "purchase_order_sequence" integer not null default 0,
                add column if not exists "sales_order_prefix" varchar(255) null,
                add column if not exists "sales_order_sequence" integer not null default 0,
                add column if not exists "default_sales_order_production_doc_code" varchar(255) null,
                add column if not exists "default_sales_order_billing_doc_code" varchar(255) null,
                add column if not exists "operation_mode" varchar(20) null,
                add column if not exists "uvt_value" integer null;
        `);

        this.addSql(`
            update "operational_config"
            set "operation_mode" = 'lote'
            where "operation_mode" is null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "operational_config"
                drop column if exists "uvt_value",
                drop column if exists "operation_mode",
                drop column if exists "default_sales_order_billing_doc_code",
                drop column if exists "default_sales_order_production_doc_code",
                drop column if exists "sales_order_sequence",
                drop column if exists "sales_order_prefix",
                drop column if exists "purchase_order_sequence",
                drop column if exists "purchase_order_prefix",
                drop column if exists "default_batch_release_controlled_document_code",
                drop column if exists "default_labeling_controlled_document_code",
                drop column if exists "default_finished_inspection_controlled_document_code",
                drop column if exists "default_packaging_controlled_document_code",
                drop column if exists "default_incoming_inspection_controlled_document_code",
                drop column if exists "default_purchase_order_controlled_document_code",
                drop column if exists "default_purchase_order_controlled_document_id",
                drop column if exists "purchase_withholding_rules",
                drop column if exists "purchase_payment_methods";
        `);
    }
}
