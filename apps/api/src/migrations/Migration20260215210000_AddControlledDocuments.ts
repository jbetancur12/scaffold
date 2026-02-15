import { Migration } from '@mikro-orm/migrations';

export class Migration20260215210000_AddControlledDocuments extends Migration {

    override async up(): Promise<void> {
        this.addSql(`create table if not exists "controlled_document" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "code" varchar(255) not null, "title" varchar(255) not null, "process" text check ("process" in ('produccion', 'control_calidad', 'empaque')) not null, "version" int not null default 1, "status" text check ("status" in ('borrador', 'en_revision', 'aprobado', 'obsoleto')) not null default 'borrador', "content" text null, "effective_date" timestamptz null, "expires_at" timestamptz null, "approved_by" varchar(255) null, "approved_at" timestamptz null, constraint "controlled_document_pkey" primary key ("id"));`);
        this.addSql(`do $$ begin if not exists (select 1 from pg_constraint where conname = 'controlled_document_code_version_unique') then alter table "controlled_document" add constraint "controlled_document_code_version_unique" unique ("code", "version"); end if; end $$;`);
        this.addSql(`create index if not exists "controlled_document_process_status_index" on "controlled_document" ("process", "status");`);
    }

    override async down(): Promise<void> {
        this.addSql('drop table if exists "controlled_document" cascade;');
    }

}
