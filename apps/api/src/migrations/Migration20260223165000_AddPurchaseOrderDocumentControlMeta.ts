import { Migration } from '@mikro-orm/migrations';

export class Migration20260223165000_AddPurchaseOrderDocumentControlMeta extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "purchase_order"
                add column if not exists "controlled_document_id" uuid null,
                add column if not exists "document_control_code" varchar(255) null,
                add column if not exists "document_control_title" varchar(255) null,
                add column if not exists "document_control_version" int null,
                add column if not exists "document_control_date" timestamptz null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "purchase_order"
                drop column if exists "controlled_document_id",
                drop column if exists "document_control_code",
                drop column if exists "document_control_title",
                drop column if exists "document_control_version",
                drop column if exists "document_control_date";
        `);
    }
}
