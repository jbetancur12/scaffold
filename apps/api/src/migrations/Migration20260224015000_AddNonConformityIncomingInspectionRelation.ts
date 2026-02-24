import { Migration } from '@mikro-orm/migrations';

export class Migration20260224015000_AddNonConformityIncomingInspectionRelation extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table if exists "non_conformity"
                add column if not exists "incoming_inspection_id" uuid null;
        `);

        this.addSql(`
            create index if not exists "non_conformity_incoming_inspection_id_index"
            on "non_conformity" ("incoming_inspection_id");
        `);

        this.addSql(`
            do $$ begin
              if not exists (select 1 from pg_constraint where conname = 'non_conformity_incoming_inspection_id_foreign') then
                alter table "non_conformity"
                  add constraint "non_conformity_incoming_inspection_id_foreign"
                  foreign key ("incoming_inspection_id")
                  references "incoming_inspection" ("id")
                  on update cascade
                  on delete set null;
              end if;
            end $$;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table if exists "non_conformity"
                drop constraint if exists "non_conformity_incoming_inspection_id_foreign";
        `);

        this.addSql(`
            drop index if exists "non_conformity_incoming_inspection_id_index";
        `);

        this.addSql(`
            alter table if exists "non_conformity"
                drop column if exists "incoming_inspection_id";
        `);
    }
}
