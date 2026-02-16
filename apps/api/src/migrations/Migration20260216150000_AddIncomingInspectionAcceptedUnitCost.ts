import { Migration } from '@mikro-orm/migrations';

export class Migration20260216150000_AddIncomingInspectionAcceptedUnitCost extends Migration {
    override async up(): Promise<void> {
        this.addSql('alter table if exists "incoming_inspection" add column if not exists "accepted_unit_cost" numeric(12,4) null;');
    }

    override async down(): Promise<void> {
        this.addSql('alter table if exists "incoming_inspection" drop column if exists "accepted_unit_cost";');
    }
}
