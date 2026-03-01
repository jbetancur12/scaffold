import { Migration } from '@mikro-orm/migrations';

export class Migration20260224162000_AddProductionMaterialAllocation extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "production_material_allocation" (
                "id" varchar(255) not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "production_order_id" varchar(255) not null,
                "raw_material_id" varchar(255) not null,
                "lot_id" varchar(255) null,
                "quantity_requested" numeric(12,4) null,
                "notes" text null,
                constraint "production_material_allocation_pkey" primary key ("id")
            );
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

