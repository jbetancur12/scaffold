import { Migration } from '@mikro-orm/migrations';

export class Migration20260215232000_AddRecallManagement extends Migration {

    override async up(): Promise<void> {
        this.addSql(`create table if not exists "recall_case" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "code" varchar(255) not null, "title" varchar(255) not null, "reason" text not null, "scope_type" text check ("scope_type" in ('lote', 'serial')) not null, "lot_code" varchar(255) null, "serial_code" varchar(255) null, "affected_quantity" int not null, "retrieved_quantity" int not null default 0, "coverage_percent" numeric(5,2) not null default 0, "status" text check ("status" in ('abierto', 'en_ejecucion', 'cerrado')) not null default 'abierto', "is_mock" boolean not null default false, "target_response_minutes" int null, "actual_response_minutes" int null, "started_at" timestamptz not null, "ended_at" timestamptz null, "closure_evidence" text null, "created_by" varchar(255) null, constraint "recall_case_pkey" primary key ("id"));`);
        this.addSql(`do $$ begin if not exists (select 1 from pg_constraint where conname = 'recall_case_code_unique') then alter table "recall_case" add constraint "recall_case_code_unique" unique ("code"); end if; end $$;`);
        this.addSql(`create index if not exists "recall_case_status_index" on "recall_case" ("status");`);
        this.addSql(`create index if not exists "recall_case_scope_type_index" on "recall_case" ("scope_type");`);

        this.addSql(`create table if not exists "recall_notification" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "recall_case_id" uuid not null, "recipient_name" varchar(255) not null, "recipient_contact" varchar(255) not null, "channel" text check ("channel" in ('email', 'telefono', 'whatsapp', 'otro')) not null, "status" text check ("status" in ('pendiente', 'enviada', 'confirmada', 'fallida')) not null default 'pendiente', "sent_at" timestamptz null, "acknowledged_at" timestamptz null, "evidence_notes" text null, "created_by" varchar(255) null, constraint "recall_notification_pkey" primary key ("id"));`);
        this.addSql(`do $$ begin if not exists (select 1 from pg_constraint where conname = 'recall_notification_recall_case_id_foreign') then alter table "recall_notification" add constraint "recall_notification_recall_case_id_foreign" foreign key ("recall_case_id") references "recall_case" ("id") on update cascade; end if; end $$;`);
        this.addSql(`create index if not exists "recall_notification_status_index" on "recall_notification" ("status");`);
    }

    override async down(): Promise<void> {
        this.addSql('drop table if exists "recall_notification" cascade;');
        this.addSql('drop table if exists "recall_case" cascade;');
    }

}
