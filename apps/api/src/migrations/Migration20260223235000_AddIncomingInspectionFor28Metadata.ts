import { Migration } from '@mikro-orm/migrations';

export class Migration20260223235000_AddIncomingInspectionFor28Metadata extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "incoming_inspection"
                add column if not exists "invoice_number" varchar(255) null,
                add column if not exists "document_control_code" varchar(255) null,
                add column if not exists "document_control_title" varchar(255) null,
                add column if not exists "document_control_version" int null,
                add column if not exists "document_control_date" timestamptz null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "incoming_inspection"
                drop column if exists "invoice_number",
                drop column if exists "document_control_code",
                drop column if exists "document_control_title",
                drop column if exists "document_control_version",
                drop column if exists "document_control_date";
        `);
    }
}
