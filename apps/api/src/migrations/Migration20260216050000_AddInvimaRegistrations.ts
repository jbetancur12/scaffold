import { Migration } from '@mikro-orm/migrations';

export class Migration20260216050000_AddInvimaRegistrations extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "invima_registration" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "code" varchar(255) not null,
                "holder_name" varchar(255) not null,
                "manufacturer_name" varchar(255) null,
                "valid_from" timestamptz null,
                "valid_until" timestamptz null,
                "status" text check ("status" in ('activo', 'inactivo', 'suspendido')) not null default 'activo',
                "notes" text null,
                constraint "invima_registration_pkey" primary key ("id")
            );
        `);
        this.addSql('create unique index if not exists "invima_registration_code_unique" on "invima_registration" ("code");');
        this.addSql('create index if not exists "invima_registration_status_idx" on "invima_registration" ("status");');

        this.addSql('alter table "product" add column if not exists "requires_invima" boolean not null default false;');
        this.addSql('alter table "product" add column if not exists "product_reference" varchar(255) null;');
        this.addSql('alter table "product" add column if not exists "invima_registration_id" uuid null;');

        this.addSql(`
            do $$ begin
                if not exists (select 1 from pg_constraint where conname = 'product_invima_registration_id_foreign') then
                    alter table "product"
                    add constraint "product_invima_registration_id_foreign"
                    foreign key ("invima_registration_id") references "invima_registration" ("id") on update cascade on delete set null;
                end if;
            end $$;
        `);
        this.addSql('create index if not exists "product_invima_registration_idx" on "product" ("invima_registration_id");');
    }

    override async down(): Promise<void> {
        this.addSql('alter table "product" drop constraint if exists "product_invima_registration_id_foreign";');
        this.addSql('drop index if exists "product_invima_registration_idx";');
        this.addSql('alter table "product" drop column if exists "invima_registration_id";');
        this.addSql('alter table "product" drop column if exists "product_reference";');
        this.addSql('alter table "product" drop column if exists "requires_invima";');
        this.addSql('drop table if exists "invima_registration" cascade;');
    }
}
