import { Migration } from '@mikro-orm/migrations';

export class Migration20260303030000_AddProductThreadProcesses extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "product_thread_process" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "product_id" uuid not null,
                "process_name" varchar(255) null,
                "machine_key" varchar(64) not null,
                "sewn_centimeters" numeric(10,2) not null,
                "waste_percent" numeric(5,2) not null default 8,
                "cone_length_meters" numeric(10,2) not null default 5000,
                "needles" integer not null,
                "stitches_per_cm" numeric(6,2) not null,
                "ratio" numeric(10,4) not null,
                "sort_order" integer not null default 0,
                constraint "product_thread_process_pkey" primary key ("id")
            );
        `);

        this.addSql(`
            create index if not exists "product_thread_process_product_id_idx"
            on "product_thread_process" ("product_id");
        `);

        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'product_thread_process_product_id_foreign') then
                    alter table "product_thread_process"
                    add constraint "product_thread_process_product_id_foreign"
                    foreign key ("product_id") references "product" ("id") on update cascade on delete cascade;
                end if;
            end $$;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "product_thread_process" cascade;`);
    }
}
