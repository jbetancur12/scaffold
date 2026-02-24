import { Migration } from '@mikro-orm/migrations';

export class Migration20260224100000_AddProductionBatchPackagingForm extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "production_batch"
                add column if not exists "packaging_form_data" jsonb null,
                add column if not exists "packaging_form_completed" boolean not null default false,
                add column if not exists "packaging_form_filled_by" varchar(255) null,
                add column if not exists "packaging_form_filled_at" timestamptz null,
                add column if not exists "packaging_form_document_id" varchar(255) null,
                add column if not exists "packaging_form_document_code" varchar(255) null,
                add column if not exists "packaging_form_document_title" varchar(255) null,
                add column if not exists "packaging_form_document_version" int null,
                add column if not exists "packaging_form_document_date" timestamptz null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "production_batch"
                drop column if exists "packaging_form_data",
                drop column if exists "packaging_form_completed",
                drop column if exists "packaging_form_filled_by",
                drop column if exists "packaging_form_filled_at",
                drop column if exists "packaging_form_document_id",
                drop column if exists "packaging_form_document_code",
                drop column if exists "packaging_form_document_title",
                drop column if exists "packaging_form_document_version",
                drop column if exists "packaging_form_document_date";
        `);
    }
}
