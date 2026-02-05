import { Entity, Property, Unique, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../../shared/entities/base.entity';
import { User as IUser, UserRole } from '@scaffold/types';

@Entity()
export class User extends BaseEntity implements IUser {
    @Property()
    @Unique()
    email!: string;

    @Property({ hidden: true })
    password!: string;

    @Enum(() => UserRole)
    role: UserRole = UserRole.USER;
}
