import { Migration } from '@mikro-orm/migrations';

export class Migration20260215200000_AddQualityCompliance extends Migration {

    override async up(): Promise<void> {
        this.addSql(`create table if not exists "non_conformity" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "title" varchar(255) not null, "description" text not null, "severity" text check ("severity" in ('baja', 'media', 'alta', 'critica')) not null default 'media', "status" text check ("status" in ('abierta', 'en_analisis', 'en_correccion', 'cerrada')) not null default 'abierta', "source" varchar(255) not null default 'produccion', "production_order_id" uuid null, "production_batch_id" uuid null, "production_batch_unit_id" uuid null, "root_cause" text null, "corrective_action" text null, "created_by" varchar(255) null, constraint "non_conformity_pkey" primary key ("id"));`);
        this.addSql(`do $$ begin if not exists (select 1 from pg_constraint where conname = 'non_conformity_production_order_id_foreign') then alter table "non_conformity" add constraint "non_conformity_production_order_id_foreign" foreign key ("production_order_id") references "production_order" ("id") on update cascade on delete set null; end if; end $$;`);
        this.addSql(`do $$ begin if not exists (select 1 from pg_constraint where conname = 'non_conformity_production_batch_id_foreign') then alter table "non_conformity" add constraint "non_conformity_production_batch_id_foreign" foreign key ("production_batch_id") references "production_batch" ("id") on update cascade on delete set null; end if; end $$;`);
        this.addSql(`do $$ begin if not exists (select 1 from pg_constraint where conname = 'non_conformity_production_batch_unit_id_foreign') then alter table "non_conformity" add constraint "non_conformity_production_batch_unit_id_foreign" foreign key ("production_batch_unit_id") references "production_batch_unit" ("id") on update cascade on delete set null; end if; end $$;`);

        this.addSql(`create table if not exists "capa_action" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "non_conformity_id" uuid not null, "action_plan" text not null, "owner" varchar(255) null, "due_date" timestamptz null, "verification_notes" text null, "status" text check ("status" in ('abierta', 'en_progreso', 'verificacion', 'cerrada')) not null default 'abierta', constraint "capa_action_pkey" primary key ("id"));`);
        this.addSql(`do $$ begin if not exists (select 1 from pg_constraint where conname = 'capa_action_non_conformity_id_foreign') then alter table "capa_action" add constraint "capa_action_non_conformity_id_foreign" foreign key ("non_conformity_id") references "non_conformity" ("id") on update cascade; end if; end $$;`);

        this.addSql(`create table if not exists "quality_audit_event" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "entity_type" varchar(255) not null, "entity_id" varchar(255) not null, "action" varchar(255) not null, "actor" varchar(255) null, "notes" text null, "metadata" jsonb null, constraint "quality_audit_event_pkey" primary key ("id"));`);
    }

    override async down(): Promise<void> {
        this.addSql('drop table if exists "quality_audit_event" cascade;');
        this.addSql('drop table if exists "capa_action" cascade;');
        this.addSql('drop table if exists "non_conformity" cascade;');
    }

}
