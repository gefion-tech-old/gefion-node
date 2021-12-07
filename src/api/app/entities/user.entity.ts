import { injectable } from 'inversify'
import { 
    Entity, 
    CreateDateColumn,
    JoinColumn,
    ManyToOne,
    OneToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    Column,
    Unique
} from 'typeorm'
import { Metadata } from './metadata.entity'
import { RoleMetadata, RolePermissionMetadata } from '../user/role/role.types'
import { PermissionMetadata } from '../user/permission/permission.types'

@injectable()
@Entity()
@Unique(['username'])
export class User {

    @PrimaryGeneratedColumn()
    id: number

    @Column({
        nullable: false
    })
    username: string

    @CreateDateColumn()
    createdAt: Date

    @Column({
        nullable: true
    })
    roleName: string | null

    @ManyToOne(() => Role, {
        onDelete: 'SET NULL',
        nullable: true
    })
    @JoinColumn({
        name: 'roleName',
        referencedColumnName: 'name'
    })
    role: Role | null

}

@injectable()
@Entity()
@Unique(['name'])
export class Role {

    @PrimaryGeneratedColumn()
    id: number

    @Column({
        nullable: false
    })
    name: string

    @CreateDateColumn()
    createdAt: Date
    
    @OneToOne(() => Metadata, {
        onDelete: 'RESTRICT',
        eager: true,
        cascade: ['insert'],
        nullable: false
    })
    @JoinColumn()
    metadata: Metadata<RoleMetadata>

    @OneToMany(() => RolePermission, rolePermission => rolePermission.role)
    rolesPermissions: RolePermission[]

}

@injectable()
@Entity()
@Unique(['name'])
export class Permission {

    @PrimaryGeneratedColumn()
    id: number

    @Column({
        nullable: false
    })
    name: string

    @OneToOne(() => Metadata, {
        onDelete: 'RESTRICT',
        eager: true,
        cascade: ['insert'],
        nullable: false
    })
    @JoinColumn()
    metadata: Metadata<PermissionMetadata>

    @OneToMany(() => RolePermission, rolePermission => rolePermission.permission)
    rolesPermissions: RolePermission[]

}

@injectable()
@Entity('role_permission')
@Unique(['roleName', 'permissionName'])
export class RolePermission {

    @PrimaryGeneratedColumn()
    id: number

    @Column({
        nullable: false
    })
    roleName: string
    
    @Column({
        nullable: false
    })
    permissionName: string

    @ManyToOne(() => Role, role => role.rolesPermissions, {
        onDelete: 'CASCADE'
    })
    @JoinColumn({
        name: 'roleName',
        referencedColumnName: 'name'
    })
    role: Role

    @ManyToOne(() => Permission, permission => permission.rolesPermissions, {
        onDelete: 'CASCADE'
    })
    @JoinColumn({
        name: 'permissionName',
        referencedColumnName: 'name'
    })
    permission: Permission

    @CreateDateColumn()
    createdAt: Date

    @OneToOne(() => Metadata, {
        onDelete: 'RESTRICT',
        eager: true,
        cascade: ['insert'],
        nullable: false
    })
    @JoinColumn()
    metadata: Metadata<RolePermissionMetadata>

}