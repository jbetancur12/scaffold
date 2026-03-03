import { Migration } from '@mikro-orm/migrations';

export class Migration20260224162000_AddProductionMaterialAllocation extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "production_material_allocation" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "production_order_id" uuid not null,
                "raw_material_id" uuid not null,
                "lot_id" uuid null,
                "quantity_requested" numeric(12,4) null,
                "notes" text null,
                constraint "production_material_allocation_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            do $$ begin
                if exists (
                    select 1 from information_schema.columns
                    where table_name = 'production_material_allocation'
                      and column_name = 'id'
                      and data_type in ('character varying', 'text')
                ) then
                    alter table "production_material_allocation"
                    alter column "id" type uuid using "id"::uuid;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if exists (
                    select 1 from information_schema.columns
                    where table_name = 'production_material_allocation'
                      and column_name = 'production_order_id'
                      and data_type in ('character varying', 'text')
                ) then
                    alter table "production_material_allocation"
                    alter column "production_order_id" type uuid using "production_order_id"::uuid;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if exists (
                    select 1 from information_schema.columns
                    where table_name = 'production_material_allocation'
                      and column_name = 'raw_material_id'
                      and data_type in ('character varying', 'text')
                ) then
                    alter table "production_material_allocation"
                    alter column "raw_material_id" type uuid using "raw_material_id"::uuid;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if exists (
                    select 1 from information_schema.columns
                    where table_name = 'production_material_allocation'
                      and column_name = 'lot_id'
                      and data_type in ('character varying', 'text')
                ) then
                    alter table "production_material_allocation"
                    alter column "lot_id" type uuid using nullif("lot_id", '')::uuid;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'production_material_allocation_production_order_id_foreign') then
                    alter table "production_material_allocation"
                    add constraint "production_material_allocation_production_order_id_foreign"
                    foreign key ("production_order_id") references "production_order" ("id") on update cascade on delete cascade;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'production_material_allocation_raw_material_id_foreign') then
                    alter table "production_material_allocation"
                    add constraint "production_material_allocation_raw_material_id_foreign"
                    foreign key ("raw_material_id") references "raw_material" ("id") on update cascade;
                end if;
            end $$;
        `);
        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'production_material_allocation_lot_id_foreign') then
                    alter table "production_material_allocation"
                    add constraint "production_material_allocation_lot_id_foreign"
                    foreign key ("lot_id") references "raw_material_lot" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql(`
            create unique index if not exists "production_material_allocation_order_material_unique"
            on "production_material_allocation" ("production_order_id", "raw_material_id");
        `);
    }

    override async down(): Promise<void> {
        this.addSql('drop table if exists "production_material_allocation" cascade;');
    }
}
