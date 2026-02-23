import { Entity, Enum, Property, Unique } from '@mikro-orm/core';
import {
    ControlledDocument as IControlledDocument,
    DocumentCategory,
    DocumentApprovalMethod,
    DocumentProcess,
    DocumentProcessAreaCode,
    DocumentStatus,
} from '@scaffold/types';
import { BaseEntity } from '../../../shared/entities/base.entity';

@Entity()
@Unique({ properties: ['code', 'version'] })
export class ControlledDocument extends BaseEntity implements IControlledDocument {
    @Property()
    code!: string;

    @Property()
    title!: string;

    @Enum(() => DocumentProcess)
    process!: DocumentProcess;

    @Enum({ items: () => DocumentCategory, nullable: true })
    documentCategory?: DocumentCategory;

    @Enum({ items: () => DocumentProcessAreaCode, nullable: true })
    processAreaCode?: DocumentProcessAreaCode;

    @Property({ default: 1 })
    version: number = 1;

    @Enum(() => DocumentStatus)
    status: DocumentStatus = DocumentStatus.BORRADOR;

    @Property({ nullable: true, type: 'text' })
    content?: string;

    @Property({ nullable: true })
    effectiveDate?: Date;

    @Property({ nullable: true })
    expiresAt?: Date;

    @Property({ nullable: true })
    approvedBy?: string;

    @Property({ nullable: true })
    approvedAt?: Date;

    @Enum({ items: () => DocumentApprovalMethod, nullable: true })
    approvalMethod?: DocumentApprovalMethod;

    @Property({ nullable: true, type: 'text' })
    approvalSignature?: string;

    @Property({ nullable: true })
    sourceFileName?: string;

    @Property({ nullable: true })
    sourceFileMime?: string;

    @Property({ nullable: true, type: 'text' })
    sourceFilePath?: string;
}
