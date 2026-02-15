import { Migration } from '@mikro-orm/migrations';

export class Migration20260215220000_AddTechnovigilanceCases extends Migration {

    override async up(): Promise<void> {
        this.addSql(`create table if not exists "technovigilance_case" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "title" varchar(255) not null, "description" text not null, "type" text check ("type" in ('queja', 'evento_adverso')) not null default 'queja', "severity" text check ("severity" in ('leve', 'moderada', 'severa', 'critica')) not null default 'moderada', "causality" text check ("causality" in ('no_relacionado', 'posible', 'probable', 'confirmado')) null, "status" text check ("status" in ('abierto', 'en_investigacion', 'reportado', 'cerrado')) not null default 'abierto', "reported_to_invima" boolean not null default false, "reported_at" timestamptz null, "investigation_summary" text null, "resolution" text null, "production_order_id" uuid null, "production_batch_id" uuid null, "production_batch_unit_id" uuid null, "lot_code" varchar(255) null, "serial_code" varchar(255) null, "created_by" varchar(255) null, constraint "technovigilance_case_pkey" primary key ("id"));`);
        this.addSql(`do $$ begin if not exists (select 1 from pg_constraint where conname = 'technovigilance_case_production_order_id_foreign') then alter table "technovigilance_case" add constraint "technovigilance_case_production_order_id_foreign" foreign key ("production_order_id") references "production_order" ("id") on update cascade on delete set null; end if; end $$;`);
        this.addSql(`do $$ begin if not exists (select 1 from pg_constraint where conname = 'technovigilance_case_production_batch_id_foreign') then alter table "technovigilance_case" add constraint "technovigilance_case_production_batch_id_foreign" foreign key ("production_batch_id") references "production_batch" ("id") on update cascade on delete set null; end if; end $$;`);
        this.addSql(`do $$ begin if not exists (select 1 from pg_constraint where conname = 'technovigilance_case_production_batch_unit_id_foreign') then alter table "technovigilance_case" add constraint "technovigilance_case_production_batch_unit_id_foreign" foreign key ("production_batch_unit_id") references "production_batch_unit" ("id") on update cascade on delete set null; end if; end $$;`);
        this.addSql(`create index if not exists "technovigilance_case_status_index" on "technovigilance_case" ("status");`);
        this.addSql(`create index if not exists "technovigilance_case_type_index" on "technovigilance_case" ("type");`);
    }

    override async down(): Promise<void> {
        this.addSql('drop table if exists "technovigilance_case" cascade;');
    }

}
