import { Migration } from '@mikro-orm/migrations';

export class Migration20260306110000_AddBomItemUsageNote extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "bomitem" add column "usage_note" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "bomitem" drop column "usage_note";`);
  }

}
