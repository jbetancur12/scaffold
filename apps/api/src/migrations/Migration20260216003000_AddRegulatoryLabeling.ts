import { Migration } from '@mikro-orm/migrations';

export class Migration20260216003000_AddRegulatoryLabeling extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "regulatory_label" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "production_batch_id" uuid not null,
                "production_batch_unit_id" uuid null,
                "scope_type" text check ("scope_type" in ('lote', 'serial')) not null,
                "status" text check ("status" in ('borrador', 'validada', 'bloqueada')) not null default 'borrador',
                "device_type" text check ("device_type" in ('clase_i', 'clase_iia', 'clase_iib', 'clase_iii')) not null,
                "coding_standard" text check ("coding_standard" in ('gs1', 'hibcc', 'interno')) not null,
                "product_name" varchar(255) not null,
                "manufacturer_name" varchar(255) not null,
                "invima_registration" varchar(255) not null,
                "lot_code" varchar(255) not null,
                "serial_code" varchar(255) null,
                "manufacture_date" timestamptz not null,
                "expiration_date" timestamptz null,
                "gtin" varchar(255) null,
                "udi_di" varchar(255) null,
                "udi_pi" varchar(255) null,
                "internal_code" varchar(255) null,
                "coding_value" text null,
                "validation_errors" jsonb null,
                "created_by" varchar(255) null,
                constraint "regulatory_label_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'regulatory_label_production_batch_id_foreign') then
                    alter table "regulatory_label"
                    add constraint "regulatory_label_production_batch_id_foreign"
                    foreign key ("production_batch_id") references "production_batch" ("id") on update cascade;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'regulatory_label_production_batch_unit_id_foreign') then
                    alter table "regulatory_label"
                    add constraint "regulatory_label_production_batch_unit_id_foreign"
                    foreign key ("production_batch_unit_id") references "production_batch_unit" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`create index if not exists "regulatory_label_batch_idx" on "regulatory_label" ("production_batch_id");`);
        this.addSql(`create index if not exists "regulatory_label_status_idx" on "regulatory_label" ("status");`);
        this.addSql(`
            create unique index if not exists "regulatory_label_unique_lote"
            on "regulatory_label" ("production_batch_id", "scope_type")
            where "production_batch_unit_id" is null and "scope_type" = 'lote';
        `);
        this.addSql(`
            create unique index if not exists "regulatory_label_unique_serial"
            on "regulatory_label" ("production_batch_unit_id")
            where "production_batch_unit_id" is not null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql('drop table if exists "regulatory_label" cascade;');
    }
}
