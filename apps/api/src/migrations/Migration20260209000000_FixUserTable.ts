import { Migration } from '@mikro-orm/migrations';

export class Migration20260209000000_FixUserTable extends Migration {

    override async up(): Promise<void> {
        this.addSql('create table if not exists "user" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "email" varchar(255) not null, "password" varchar(255) not null, "role" text check ("role" in (\'superadmin\', \'admin\', \'user\')) not null default \'user\', constraint "user_pkey" primary key ("id"));');
        this.addSql('alter table "user" add constraint "user_email_unique" unique ("email");');
    }

    override async down(): Promise<void> {
        this.addSql('drop table if exists "user";');
    }

}
