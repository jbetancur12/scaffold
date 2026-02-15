import { Migration } from '@mikro-orm/migrations';

export class Migration20260216120000_AddChangeControl extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "change_control" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "code" varchar(255) not null,
                "title" varchar(255) not null,
                "description" text not null,
                "type" text check ("type" in ('material', 'proceso', 'documento', 'parametro')) not null,
                "impact_level" text check ("impact_level" in ('bajo', 'medio', 'alto', 'critico')) not null default 'medio',
                "status" text check ("status" in ('borrador', 'en_evaluacion', 'aprobado', 'rechazado', 'implementado', 'cancelado')) not null default 'borrador',
                "evaluation_summary" text null,
                "requested_by" varchar(255) null,
                "effective_date" timestamptz null,
                "linked_document_id" uuid null,
                "affected_production_order_id" uuid null,
                "affected_production_batch_id" uuid null,
                "before_change_batch_code" varchar(255) null,
                "after_change_batch_code" varchar(255) null,
                constraint "change_control_pkey" primary key ("id")
            );
        `);
        this.addSql('create unique index if not exists "change_control_code_unique" on "change_control" ("code");');
        this.addSql('create index if not exists "change_control_status_idx" on "change_control" ("status");');

        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'change_control_linked_document_id_foreign') then
                    alter table "change_control"
                    add constraint "change_control_linked_document_id_foreign"
                    foreign key ("linked_document_id") references "controlled_document" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'change_control_affected_production_order_id_foreign') then
                    alter table "change_control"
                    add constraint "change_control_affected_production_order_id_foreign"
                    foreign key ("affected_production_order_id") references "production_order" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'change_control_affected_production_batch_id_foreign') then
                    alter table "change_control"
                    add constraint "change_control_affected_production_batch_id_foreign"
                    foreign key ("affected_production_batch_id") references "production_batch" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);

        this.addSql(`
            create table if not exists "change_control_approval" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "change_control_id" uuid not null,
                "role" varchar(255) not null,
                "approver" varchar(255) null,
                "decision" text check ("decision" in ('pendiente', 'aprobado', 'rechazado')) not null default 'pendiente',
                "decision_notes" text null,
                "decided_at" timestamptz null,
                constraint "change_control_approval_pkey" primary key ("id")
            );
        `);
        this.addSql('create index if not exists "change_control_approval_change_idx" on "change_control_approval" ("change_control_id");');
        this.addSql('create index if not exists "change_control_approval_decision_idx" on "change_control_approval" ("decision");');
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'change_control_approval_change_control_id_foreign') then
                    alter table "change_control_approval"
                    add constraint "change_control_approval_change_control_id_foreign"
                    foreign key ("change_control_id") references "change_control" ("id") on update cascade on delete cascade;
                end if;
            end $$;
        `);
    }

    override async down(): Promise<void> {
        this.addSql('drop table if exists "change_control_approval" cascade;');
        this.addSql('drop table if exists "change_control" cascade;');
    }
}
