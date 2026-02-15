import { Migration } from '@mikro-orm/migrations';

export class Migration20260215190000_AddProductionBatches extends Migration {

    override async up(): Promise<void> {
        this.addSql(`create table if not exists "production_batch" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "production_order_id" uuid not null, "variant_id" uuid not null, "code" varchar(255) not null, "planned_qty" int not null, "produced_qty" int not null default 0, "qc_status" text check ("qc_status" in ('pending', 'passed', 'failed')) not null default 'pending', "packaging_status" text check ("packaging_status" in ('pending', 'packed')) not null default 'pending', "status" text check ("status" in ('in_progress', 'qc_pending', 'qc_passed', 'packing', 'ready')) not null default 'in_progress', "notes" varchar(255) null, constraint "production_batch_pkey" primary key ("id"));`);
        this.addSql(`do $$ begin if not exists (select 1 from pg_constraint where conname = 'production_batch_code_unique') then alter table "production_batch" add constraint "production_batch_code_unique" unique ("code"); end if; end $$;`);

        this.addSql(`create table if not exists "production_batch_unit" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "batch_id" uuid not null, "serial_code" varchar(255) not null, "qc_passed" boolean not null default false, "packaged" boolean not null default false, "rejected" boolean not null default false, constraint "production_batch_unit_pkey" primary key ("id"));`);
        this.addSql(`do $$ begin if not exists (select 1 from pg_constraint where conname = 'production_batch_unit_batch_id_serial_code_unique') then alter table "production_batch_unit" add constraint "production_batch_unit_batch_id_serial_code_unique" unique ("batch_id", "serial_code"); end if; end $$;`);

        this.addSql(`do $$ begin if not exists (select 1 from pg_constraint where conname = 'production_batch_production_order_id_foreign') then alter table "production_batch" add constraint "production_batch_production_order_id_foreign" foreign key ("production_order_id") references "production_order" ("id") on update cascade; end if; end $$;`);
        this.addSql(`do $$ begin if not exists (select 1 from pg_constraint where conname = 'production_batch_variant_id_foreign') then alter table "production_batch" add constraint "production_batch_variant_id_foreign" foreign key ("variant_id") references "product_variant" ("id") on update cascade; end if; end $$;`);

        this.addSql(`do $$ begin if not exists (select 1 from pg_constraint where conname = 'production_batch_unit_batch_id_foreign') then alter table "production_batch_unit" add constraint "production_batch_unit_batch_id_foreign" foreign key ("batch_id") references "production_batch" ("id") on update cascade; end if; end $$;`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "production_batch_unit" drop constraint if exists "production_batch_unit_batch_id_foreign";`);

        this.addSql(`alter table "production_batch" drop constraint if exists "production_batch_production_order_id_foreign";`);
        this.addSql(`alter table "production_batch" drop constraint if exists "production_batch_variant_id_foreign";`);

        this.addSql(`drop table if exists "production_batch_unit" cascade;`);
        this.addSql(`drop table if exists "production_batch" cascade;`);
    }

}
