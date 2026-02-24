import { Migration } from '@mikro-orm/migrations';

export class Migration20260224012000_AddIncomingInspectionEvidenceFiles extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "incoming_inspection"
                add column if not exists "certificate_file_name" varchar(255) null,
                add column if not exists "certificate_file_mime" varchar(255) null,
                add column if not exists "certificate_file_path" varchar(500) null,
                add column if not exists "invoice_file_name" varchar(255) null,
                add column if not exists "invoice_file_mime" varchar(255) null,
                add column if not exists "invoice_file_path" varchar(500) null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "incoming_inspection"
                drop column if exists "certificate_file_name",
                drop column if exists "certificate_file_mime",
                drop column if exists "certificate_file_path",
                drop column if exists "invoice_file_name",
                drop column if exists "invoice_file_mime",
                drop column if exists "invoice_file_path";
        `);
    }
}
