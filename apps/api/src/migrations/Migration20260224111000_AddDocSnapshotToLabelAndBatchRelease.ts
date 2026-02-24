import { Migration } from '@mikro-orm/migrations';

export class Migration20260224111000_AddDocSnapshotToLabelAndBatchRelease extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "regulatory_label"
                add column if not exists "document_control_id" varchar(255) null,
                add column if not exists "document_control_code" varchar(255) null,
                add column if not exists "document_control_title" varchar(255) null,
                add column if not exists "document_control_version" int null,
                add column if not exists "document_control_date" timestamptz null;
        `);
        this.addSql(`
            alter table if exists "batch_release"
                add column if not exists "document_control_id" varchar(255) null,
                add column if not exists "document_control_code" varchar(255) null,
                add column if not exists "document_control_title" varchar(255) null,
                add column if not exists "document_control_version" int null,
                add column if not exists "document_control_date" timestamptz null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "regulatory_label"
                drop column if exists "document_control_id",
                drop column if exists "document_control_code",
                drop column if exists "document_control_title",
                drop column if exists "document_control_version",
                drop column if exists "document_control_date";
        `);
        this.addSql(`
            alter table if exists "batch_release"
                drop column if exists "document_control_id",
                drop column if exists "document_control_code",
                drop column if exists "document_control_title",
                drop column if exists "document_control_version",
                drop column if exists "document_control_date";
        `);
    }
}
