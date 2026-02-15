import { Migration } from '@mikro-orm/migrations';

export class Migration20260215230000_AddTechnovigilanceInvimaReporting extends Migration {

    override async up(): Promise<void> {
        this.addSql(`alter table "technovigilance_case" add column if not exists "invima_report_number" varchar(255) null;`);
        this.addSql(`alter table "technovigilance_case" add column if not exists "invima_report_channel" text check ("invima_report_channel" in ('invima_portal', 'email_oficial', 'otro')) null;`);
        this.addSql(`alter table "technovigilance_case" add column if not exists "invima_report_payload_ref" text null;`);
        this.addSql(`alter table "technovigilance_case" add column if not exists "invima_ack_at" timestamptz null;`);
        this.addSql(`alter table "technovigilance_case" add column if not exists "reported_by" varchar(255) null;`);
        this.addSql(`create index if not exists "technovigilance_case_invima_report_number_index" on "technovigilance_case" ("invima_report_number");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "technovigilance_case_invima_report_number_index";`);
        this.addSql(`alter table "technovigilance_case" drop column if exists "reported_by";`);
        this.addSql(`alter table "technovigilance_case" drop column if exists "invima_ack_at";`);
        this.addSql(`alter table "technovigilance_case" drop column if exists "invima_report_payload_ref";`);
        this.addSql(`alter table "technovigilance_case" drop column if exists "invima_report_channel";`);
        this.addSql(`alter table "technovigilance_case" drop column if exists "invima_report_number";`);
    }

}
