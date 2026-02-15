import { Migration } from '@mikro-orm/migrations';

export class Migration20260216090000_AddDmrTemplateAndBatchDhr extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "dmr_template" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "product_id" uuid null,
                "process" text check ("process" in ('produccion', 'control_calidad', 'empaque')) not null,
                "code" varchar(255) not null,
                "title" varchar(255) not null,
                "version" int not null default 1,
                "sections" jsonb not null,
                "required_evidence" jsonb not null,
                "is_active" boolean not null default true,
                "created_by" varchar(255) null,
                "approved_by" varchar(255) null,
                "approved_at" timestamptz null,
                constraint "dmr_template_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'dmr_template_product_id_foreign') then
                    alter table "dmr_template"
                    add constraint "dmr_template_product_id_foreign"
                    foreign key ("product_id") references "product" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql('create index if not exists "dmr_template_product_idx" on "dmr_template" ("product_id");');
        this.addSql('create index if not exists "dmr_template_process_idx" on "dmr_template" ("process");');
        this.addSql('create unique index if not exists "dmr_template_code_version_unique" on "dmr_template" ("code", "version");');
        this.addSql('create unique index if not exists "dmr_template_product_process_version_unique" on "dmr_template" ("product_id", "process", "version");');
    }

    override async down(): Promise<void> {
        this.addSql('drop table if exists "dmr_template" cascade;');
    }
}
