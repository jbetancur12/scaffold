import { Migration } from '@mikro-orm/migrations';

export class Migration20260216100000_AddDeviationAndOos extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "process_deviation" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "code" varchar(255) not null,
                "title" varchar(255) not null,
                "description" text not null,
                "classification" varchar(255) not null default 'general',
                "status" text check ("status" in ('abierta', 'en_contencion', 'en_investigacion', 'cerrada')) not null default 'abierta',
                "containment_action" text null,
                "investigation_summary" text null,
                "closure_evidence" text null,
                "production_order_id" uuid null,
                "production_batch_id" uuid null,
                "production_batch_unit_id" uuid null,
                "capa_action_id" uuid null,
                "opened_by" varchar(255) null,
                "closed_by" varchar(255) null,
                "closed_at" timestamptz null,
                constraint "process_deviation_pkey" primary key ("id")
            );
        `);
        this.addSql('create unique index if not exists "process_deviation_code_unique" on "process_deviation" ("code");');
        this.addSql('create index if not exists "process_deviation_status_idx" on "process_deviation" ("status");');
        this.addSql('create index if not exists "process_deviation_batch_idx" on "process_deviation" ("production_batch_id");');

        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'process_deviation_production_order_id_foreign') then
                    alter table "process_deviation"
                    add constraint "process_deviation_production_order_id_foreign"
                    foreign key ("production_order_id") references "production_order" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'process_deviation_production_batch_id_foreign') then
                    alter table "process_deviation"
                    add constraint "process_deviation_production_batch_id_foreign"
                    foreign key ("production_batch_id") references "production_batch" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'process_deviation_production_batch_unit_id_foreign') then
                    alter table "process_deviation"
                    add constraint "process_deviation_production_batch_unit_id_foreign"
                    foreign key ("production_batch_unit_id") references "production_batch_unit" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'process_deviation_capa_action_id_foreign') then
                    alter table "process_deviation"
                    add constraint "process_deviation_capa_action_id_foreign"
                    foreign key ("capa_action_id") references "capa_action" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);

        this.addSql(`
            create table if not exists "oos_case" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "code" varchar(255) not null,
                "test_name" varchar(255) not null,
                "result_value" varchar(255) not null,
                "specification" varchar(255) not null,
                "status" text check ("status" in ('abierto', 'en_investigacion', 'dispuesto', 'cerrado')) not null default 'abierto',
                "investigation_summary" text null,
                "disposition" text check ("disposition" in ('reprocesar', 'descartar', 'uso_condicional', 'liberar')) null,
                "decision_notes" text null,
                "production_order_id" uuid null,
                "production_batch_id" uuid null,
                "production_batch_unit_id" uuid null,
                "capa_action_id" uuid null,
                "blocked_at" timestamptz not null,
                "released_at" timestamptz null,
                "opened_by" varchar(255) null,
                "closed_by" varchar(255) null,
                constraint "oos_case_pkey" primary key ("id")
            );
        `);
        this.addSql('create unique index if not exists "oos_case_code_unique" on "oos_case" ("code");');
        this.addSql('create index if not exists "oos_case_status_idx" on "oos_case" ("status");');
        this.addSql('create index if not exists "oos_case_batch_idx" on "oos_case" ("production_batch_id");');

        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'oos_case_production_order_id_foreign') then
                    alter table "oos_case"
                    add constraint "oos_case_production_order_id_foreign"
                    foreign key ("production_order_id") references "production_order" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'oos_case_production_batch_id_foreign') then
                    alter table "oos_case"
                    add constraint "oos_case_production_batch_id_foreign"
                    foreign key ("production_batch_id") references "production_batch" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'oos_case_production_batch_unit_id_foreign') then
                    alter table "oos_case"
                    add constraint "oos_case_production_batch_unit_id_foreign"
                    foreign key ("production_batch_unit_id") references "production_batch_unit" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'oos_case_capa_action_id_foreign') then
                    alter table "oos_case"
                    add constraint "oos_case_capa_action_id_foreign"
                    foreign key ("capa_action_id") references "capa_action" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
    }

    override async down(): Promise<void> {
        this.addSql('drop table if exists "oos_case" cascade;');
        this.addSql('drop table if exists "process_deviation" cascade;');
    }
}
