import { injectable, inject } from 'inversify'
import { IRoleService } from './role.interface'
import { USER_SYMBOL } from '../user.types'
import {
    Role,
    RolePermission
} from '../../entities/user.entity'
import { IPermissionService } from '../permission/permission.interface'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { transaction } from '../../../../core/typeorm/utils/transaction'
import { mutationQuery } from '../../../../core/typeorm/utils/mutation-query'
import { Connection, Repository } from 'typeorm'
import { SqliteErrorCode, isErrorCode } from '../../../../core/typeorm/utils/error-code'
import { Metadata } from '../../entities/metadata.entity'
import { SnapshotMetadata } from '../../metadata/metadata.types'
import { RoleMetadata, RolePermissionMetadata, CreateRole } from './role.types'
import { MetadataRepository } from '../../metadata/repositories/metadata.repository'
import { RoleDoesNotExists, RoleDoesNotHavePermission } from './role.errors'
import { getCustomRepository } from '../../../../core/typeorm/utils/custom-repository'
import { PermissionDoesNotExist } from '../permission/permission.errors'
import { CREATOR_SYMBOL, ResourceType } from '../../creator/creator.types'
import { ICreatorService } from '../../creator/creator.interface'

@injectable()
export class RoleService implements IRoleService {

    private connection: Promise<Connection>
    private roleRepository: Promise<Repository<Role>>
    private rolePermissionRepository: Promise<Repository<RolePermission>>

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        connection: Promise<Connection>,

        @inject(USER_SYMBOL.PermissionService)
        private permissionService: IPermissionService,

        @inject(CREATOR_SYMBOL.CreatorService)
        private creatorService: ICreatorService
    ) {
        this.connection = connection
        this.roleRepository = connection
            .then(connection => {
                return connection.getRepository(Role)
            })
        this.rolePermissionRepository = connection
            .then(connection => {
                return connection.getRepository(RolePermission)
            })
    }

    public async create(options: CreateRole, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const roleRepository = await this.roleRepository

        if (await this.isExists(options.name)) {
            return
        }

        /**
         * Оборачиваю запрос в транзакцию в том числе из-за каскадного сохранения
         * метаданных
         */
        await transaction(nestedTransaction, connection, async () => {
            const roleEntity = await mutationQuery(true, () => {
                return roleRepository.save({
                    name: options.name,
                    metadata: {
                        metadata: {
                            custom: null
                        }
                    }
                })
            })

            await this.creatorService.bind({
                type: ResourceType.Role,
                id: roleEntity.id
            }, options.creator, true)
        })
    }

    public async remove(role: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const roleRepository = await this.roleRepository
        const metadataRepository = connection.getRepository(Metadata)

        const roleEntity = await roleRepository.findOne({
            where: {
                name: role
            }
        })

        if (!roleEntity) {
            return
        }

        await transaction(nestedTransaction, connection, async () => {
            await mutationQuery(true, () => {
                return roleRepository.remove(roleEntity)
            })

            await mutationQuery(true, () => {
                return metadataRepository.remove(roleEntity.metadata)
            })
        })
    }

    public async isExists(role: string): Promise<boolean> {
        const roleRepository = await this.roleRepository
        return await roleRepository.count({
            where: {
                name: role
            }
        }) > 0
    }

    public async getMetadata(role: string): Promise<SnapshotMetadata<RoleMetadata> | undefined> {
        const roleRepository = await this.roleRepository

        const roleEntity = await roleRepository.findOne({
            where: {
                name: role
            }
        })

        if (!roleEntity) {
            return
        }

        return {
            metadata: roleEntity.metadata.metadata,
            revisionNumber: roleEntity.metadata.revisionNumber
        }
    }

    public async setMetadata(role: string, snapshotMetadata: SnapshotMetadata<RoleMetadata>, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const metadataRepository = getCustomRepository(connection, MetadataRepository)
        const roleRepository = await this.roleRepository
        
        const roleEntity = await roleRepository.findOne({
            where: {
                name: role
            }
        })

        if (!roleEntity) {
            throw new RoleDoesNotExists
        }

        roleEntity.metadata.metadata.custom = snapshotMetadata.metadata.custom
        await metadataRepository.update(roleEntity.metadata.id, {
            metadata: roleEntity.metadata.metadata,
            revisionNumber: snapshotMetadata.revisionNumber
        }, nestedTransaction)
    }

    public async addPermission(role: string, permission: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const rolePermissionRepository = await this.rolePermissionRepository

        if (!await this.isExists(role)) {
            throw new RoleDoesNotExists
        }

        if (!await this.permissionService.isExists(permission)) {
            throw new PermissionDoesNotExist
        }

        try {
            /**
             * Оборачивать запрос в транзакцию из-за каскадных запросов метаданных
             */
            await transaction(nestedTransaction, connection, async () => {
                await mutationQuery(true, () => {
                    return rolePermissionRepository.save({
                        role: { name: role },
                        permission: { name: permission },
                        metadata: {
                            metadata: {
                                custom: null
                            }
                        }
                    })
                })
            })
        } catch (error) {
            block: {
                if (isErrorCode(error, SqliteErrorCode.SQLITE_CONSTRAINT_UNIQUE)) {
                    break block
                }

                throw error
            }
        }
    }

    public async removePermission(role: string, permission: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const rolePermissionRepository = await this.rolePermissionRepository
        const metadataRepository = connection.getRepository(Metadata)

        const rolePermissionEntity = await rolePermissionRepository.findOne({
            where: {
                roleName: role,
                permissionName: permission
            }
        })

        if (!rolePermissionEntity) {
            if (!await this.isExists(role)) {
                throw new RoleDoesNotExists
            } else {
                return
            }
        }

        await transaction(nestedTransaction, connection, async () => {
            await mutationQuery(true, () => {
                return rolePermissionRepository.remove(rolePermissionEntity)
            })

            await mutationQuery(true, () => {
                return metadataRepository.remove(rolePermissionEntity.metadata)
            })
        })
    }

    public async isExistsPermission(role: string, permission: string): Promise<boolean> {
        const rolePermissionRepository = await this.rolePermissionRepository
        return await rolePermissionRepository.count({
            where: {
                roleName: role,
                permissionName: permission
            }
        }) > 0
    }

    public async getRolePermissionMetadata(role: string, permission: string): Promise<SnapshotMetadata<RolePermissionMetadata> | undefined> {
        const rolePermissionRepository = await this.rolePermissionRepository

        const rolePermissionEntity = await rolePermissionRepository.findOne({
            where: {
                roleName: role,
                permissionName: permission
            }
        })

        if (!rolePermissionEntity) {
            return
        }

        return {
            metadata: rolePermissionEntity.metadata.metadata,
            revisionNumber: rolePermissionEntity.metadata.revisionNumber
        }
    }

    public async setRolePermissionMetadata(
        role: string, 
        permission: string, 
        snapshotMetadata: SnapshotMetadata<RolePermissionMetadata>, 
        nestedTransaction = false
    ): Promise<void> {
        const connection = await this.connection
        const metadataRepository = getCustomRepository(connection, MetadataRepository)
        const rolePermissionRepository = await this.rolePermissionRepository

        const rolePermissionEntity = await rolePermissionRepository.findOne({
            where: {
                roleName: role,
                permissionName: permission
            }
        })

        if (!rolePermissionEntity) {
            if (!await this.isExists(role)) {
                throw new RoleDoesNotExists
            } else if (!await this.permissionService.isExists(permission)) {
                throw new PermissionDoesNotExist
            } else {
                throw new RoleDoesNotHavePermission
            }
        }

        rolePermissionEntity.metadata.metadata.custom = snapshotMetadata.metadata.custom
        await metadataRepository.update(rolePermissionEntity.metadata.id, {
            metadata: rolePermissionEntity.metadata.metadata,
            revisionNumber: snapshotMetadata.revisionNumber
        }, nestedTransaction)
    }

}