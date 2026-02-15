import { Migration } from '@mikro-orm/migrations';

export class Migration20260216030000_AddBatchRelease extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "batch_release" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "production_batch_id" uuid not null,
                "status" text check ("status" in ('pendiente_liberacion', 'liberado_qa', 'rechazado')) not null default 'pendiente_liberacion',
                "qc_approved" boolean not null default false,
                "labeling_validated" boolean not null default false,
                "documents_current" boolean not null default false,
                "evidences_complete" boolean not null default false,
                "checklist_notes" text null,
                "rejected_reason" text null,
                "signed_by" varchar(255) null,
                "approval_method" text check ("approval_method" in ('firma_manual', 'firma_digital')) null,
                "approval_signature" varchar(255) null,
                "signed_at" timestamptz null,
                "reviewed_by" varchar(255) null,
                constraint "batch_release_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'batch_release_production_batch_id_foreign') then
                    alter table "batch_release"
                    add constraint "batch_release_production_batch_id_foreign"
                    foreign key ("production_batch_id") references "production_batch" ("id") on update cascade;
                end if;
            end $$;
        `);
        this.addSql(`
            create unique index if not exists "batch_release_production_batch_unique"
            on "batch_release" ("production_batch_id");
        `);
        this.addSql(`create index if not exists "batch_release_status_idx" on "batch_release" ("status");`);
    }

    override async down(): Promise<void> {
        this.addSql('drop table if exists "batch_release" cascade;');
    }
}
