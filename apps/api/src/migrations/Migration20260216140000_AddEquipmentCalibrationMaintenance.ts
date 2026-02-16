import { Migration } from '@mikro-orm/migrations';

export class Migration20260216140000_AddEquipmentCalibrationMaintenance extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "equipment" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "code" varchar(255) not null,
                "name" varchar(255) not null,
                "area" varchar(255) null,
                "is_critical" boolean not null default false,
                "status" text check ("status" in ('activo', 'inactivo')) not null default 'activo',
                "calibration_frequency_days" int null,
                "maintenance_frequency_days" int null,
                "last_calibration_at" timestamptz null,
                "next_calibration_due_at" timestamptz null,
                "last_maintenance_at" timestamptz null,
                "next_maintenance_due_at" timestamptz null,
                "notes" text null,
                constraint "equipment_pkey" primary key ("id")
            );
        `);
        this.addSql('create unique index if not exists "equipment_code_unique" on "equipment" ("code");');
        this.addSql('create index if not exists "equipment_status_idx" on "equipment" ("status");');
        this.addSql('create index if not exists "equipment_critical_idx" on "equipment" ("is_critical");');

        this.addSql(`
            create table if not exists "equipment_calibration" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "equipment_id" uuid not null,
                "executed_at" timestamptz not null,
                "due_at" timestamptz null,
                "result" text check ("result" in ('aprobada', 'rechazada')) not null default 'aprobada',
                "certificate_ref" varchar(255) null,
                "evidence_ref" varchar(255) null,
                "performed_by" varchar(255) null,
                "notes" text null,
                constraint "equipment_calibration_pkey" primary key ("id")
            );
        `);
        this.addSql('create index if not exists "equipment_calibration_equipment_idx" on "equipment_calibration" ("equipment_id");');
        this.addSql('create index if not exists "equipment_calibration_due_idx" on "equipment_calibration" ("due_at");');

        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'equipment_calibration_equipment_id_foreign') then
                    alter table "equipment_calibration"
                    add constraint "equipment_calibration_equipment_id_foreign"
                    foreign key ("equipment_id") references "equipment" ("id") on update cascade on delete cascade;
                end if;
            end $$;
        `);

        this.addSql(`
            create table if not exists "equipment_maintenance" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "equipment_id" uuid not null,
                "executed_at" timestamptz not null,
                "due_at" timestamptz null,
                "type" text check ("type" in ('preventivo', 'correctivo')) not null default 'preventivo',
                "result" text check ("result" in ('completado', 'con_observaciones', 'fallido')) not null default 'completado',
                "evidence_ref" varchar(255) null,
                "performed_by" varchar(255) null,
                "notes" text null,
                constraint "equipment_maintenance_pkey" primary key ("id")
            );
        `);
        this.addSql('create index if not exists "equipment_maintenance_equipment_idx" on "equipment_maintenance" ("equipment_id");');
        this.addSql('create index if not exists "equipment_maintenance_due_idx" on "equipment_maintenance" ("due_at");');

        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'equipment_maintenance_equipment_id_foreign') then
                    alter table "equipment_maintenance"
                    add constraint "equipment_maintenance_equipment_id_foreign"
                    foreign key ("equipment_id") references "equipment" ("id") on update cascade on delete cascade;
                end if;
            end $$;
        `);

        this.addSql(`
            create table if not exists "batch_equipment_usage" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "production_batch_id" uuid not null,
                "equipment_id" uuid not null,
                "used_at" timestamptz not null,
                "used_by" varchar(255) null,
                "notes" text null,
                constraint "batch_equipment_usage_pkey" primary key ("id")
            );
        `);
        this.addSql('create index if not exists "batch_equipment_usage_batch_idx" on "batch_equipment_usage" ("production_batch_id");');
        this.addSql('create index if not exists "batch_equipment_usage_equipment_idx" on "batch_equipment_usage" ("equipment_id");');

        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'batch_equipment_usage_production_batch_id_foreign') then
                    alter table "batch_equipment_usage"
                    add constraint "batch_equipment_usage_production_batch_id_foreign"
                    foreign key ("production_batch_id") references "production_batch" ("id") on update cascade on delete cascade;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'batch_equipment_usage_equipment_id_foreign') then
                    alter table "batch_equipment_usage"
                    add constraint "batch_equipment_usage_equipment_id_foreign"
                    foreign key ("equipment_id") references "equipment" ("id") on update cascade on delete restrict;
                end if;
            end $$;
        `);
    }

    override async down(): Promise<void> {
        this.addSql('drop table if exists "batch_equipment_usage" cascade;');
        this.addSql('drop table if exists "equipment_maintenance" cascade;');
        this.addSql('drop table if exists "equipment_calibration" cascade;');
        this.addSql('drop table if exists "equipment" cascade;');
    }
}
