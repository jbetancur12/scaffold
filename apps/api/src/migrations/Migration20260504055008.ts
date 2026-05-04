import { Migration } from '@mikro-orm/migrations';

export class Migration20260504055008 extends Migration {

    override async up(): Promise<void> {
        this.addSql(`alter table "supplier" add column "rut_file_name" varchar(255) default null`);
        this.addSql(`alter table "supplier" add column "rut_file_mime" varchar(255) default null`);
        this.addSql(`alter table "supplier" add column "rut_file_path" varchar(500) default null`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "supplier" drop column "rut_file_name"`);
        this.addSql(`alter table "supplier" drop column "rut_file_mime"`);
        this.addSql(`alter table "supplier" drop column "rut_file_path"`);
    }

}
