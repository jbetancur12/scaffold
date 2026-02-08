import { Migration } from '@mikro-orm/migrations';

export class Migration20260207014804_AddFabricationParams extends Migration {

  override async up(): Promise<void> {
    // this.addSql(`alter table "bomitem" add column "fabrication_params" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "bomitem" drop column "fabrication_params";`);
  }

}
