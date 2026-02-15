import { Migration } from '@mikro-orm/migrations';

export class Migration20260216013000_AddComplianceEvidence extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "quality_risk_control" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "process" text check ("process" in ('produccion', 'control_calidad', 'empaque')) not null,
                "risk" text not null,
                "control" text not null,
                "owner_role" varchar(255) not null,
                "status" text check ("status" in ('activo', 'mitigado', 'obsoleto')) not null default 'activo',
                "evidence_ref" varchar(255) null,
                "created_by" varchar(255) null,
                constraint "quality_risk_control_pkey" primary key ("id")
            );
        `);
        this.addSql(`create index if not exists "quality_risk_control_process_idx" on "quality_risk_control" ("process");`);
        this.addSql(`create index if not exists "quality_risk_control_status_idx" on "quality_risk_control" ("status");`);

        this.addSql(`
            create table if not exists "quality_training_evidence" (
                "id" uuid not null,
                "created_at" timestamptz not null,
                "updated_at" timestamptz not null,
                "deleted_at" timestamptz null,
                "role" varchar(255) not null,
                "person_name" varchar(255) not null,
                "training_topic" varchar(255) not null,
                "completed_at" timestamptz not null,
                "valid_until" timestamptz null,
                "trainer_name" varchar(255) null,
                "evidence_ref" varchar(255) null,
                "created_by" varchar(255) null,
                constraint "quality_training_evidence_pkey" primary key ("id")
            );
        `);
        this.addSql(`create index if not exists "quality_training_evidence_role_idx" on "quality_training_evidence" ("role");`);
        this.addSql(`create index if not exists "quality_training_evidence_completed_at_idx" on "quality_training_evidence" ("completed_at");`);
    }

    override async down(): Promise<void> {
        this.addSql('drop table if exists "quality_training_evidence" cascade;');
        this.addSql('drop table if exists "quality_risk_control" cascade;');
    }
}
