import { Migration } from '@mikro-orm/migrations';

export class Migration20260215231000_AddDocumentApprovalSignature extends Migration {

    override async up(): Promise<void> {
        this.addSql(`alter table "controlled_document" add column if not exists "approval_method" text check ("approval_method" in ('firma_manual', 'firma_digital')) null;`);
        this.addSql(`alter table "controlled_document" add column if not exists "approval_signature" text null;`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "controlled_document" drop column if exists "approval_signature";`);
        this.addSql(`alter table "controlled_document" drop column if exists "approval_method";`);
    }

}
