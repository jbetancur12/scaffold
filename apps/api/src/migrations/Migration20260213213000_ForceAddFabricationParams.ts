import { Migration } from '@mikro-orm/migrations';

export class Migration20260213213000_ForceAddFabricationParams extends Migration {

    override async up(): Promise<void> {
        this.addSql('ALTER TABLE "bomitem" ADD COLUMN IF NOT EXISTS "fabrication_params" jsonb NULL;');
    }

    override async down(): Promise<void> {
        this.addSql('ALTER TABLE "bomitem" DROP COLUMN IF EXISTS "fabrication_params";');
    }

}
