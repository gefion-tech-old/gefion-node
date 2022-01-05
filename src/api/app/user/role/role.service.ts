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
import { Connection } from 'typeorm'
import { SqliteErrorCode, isErrorCode } from '../../../../core/typeorm/utils/error-code'
import { Metadata } from '../../entities/metadata.entity'
import { SnapshotMetadata } from '../../metadata/metadata.types'
import { 
    RoleMetadata, 
    RolePermissionMetadata, 
    CreateRole,
    EventContext,
    RoleEventMutation,
    RoleEventMutationName
} from './role.types'
import { MetadataRepository } from '../../metadata/repositories/metadata.repository'
import { 
    RoleDoesNotExists, 
    RoleDoesNotHavePermission, 
    RoleAlreadyExists,
    PermissionAlreadyBound
} from './role.errors'
import { getCustomRepository } from '../../../../core/typeorm/utils/custom-repository'
import { PermissionDoesNotExist } from '../permission/permission.errors'
import { CREATOR_SYMBOL, ResourceType } from '../../creator/creator.types'
import { ICreatorService } from '../../creator/creator.interface'
import { EventEmitter } from 'events'

@injectable()
export class RoleService implements IRoleService {

    private eventEmitter = new EventEmitter

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        private connection: Promise<Connection>,

        @inject(USER_SYMBOL.PermissionService)
        private permissionService: IPermissionService,

        @inject(CREATOR_SYMBOL.CreatorService)
        private creatorService: ICreatorService
    ) {}

    public async create(options: CreateRole, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const roleRepository = connection.getRepository(Role)

        if (await this.isExists(options.name)) {
            throw new RoleAlreadyExists
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

        const eventContext: EventContext = {
            type: RoleEventMutation.Create,
            roleName: options.name
        }
        this.eventEmitter.emit(RoleEventMutationName, eventContext)
    }

    public async remove(role: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const roleRepository = connection.getRepository(Role)
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

        const eventContext: EventContext = {
            type: RoleEventMutation.Remove,
            roleName: role
        }
        this.eventEmitter.emit(RoleEventMutationName, eventContext)
    }

    public async isExists(role: string): Promise<boolean> {
        const connection = await this.connection
        const roleRepository = connection.getRepository(Role)

        return await roleRepository.count({
            where: {
                name: role
            }
        }) > 0
    }

    public async setMetadata(role: string, snapshotMetadata: SnapshotMetadata<RoleMetadata>, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const roleRepository = connection.getRepository(Role)
        const metadataRepository = getCustomRepository(connection, MetadataRepository)
        
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

        const eventContext: EventContext = {
            type: RoleEventMutation.SetMetadata,
            roleName: role
        }
        this.eventEmitter.emit(RoleEventMutationName, eventContext)
    }

    public async addPermission(role: string, permission: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const rolePermissionRepository = connection.getRepository(RolePermission)

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
            if (isErrorCode(error, SqliteErrorCode.SQLITE_CONSTRAINT_UNIQUE)) {
                throw new PermissionAlreadyBound
            }

            throw error
        }

        const eventContext: EventContext = {
            type: RoleEventMutation.AddPermission,
            roleName: role,
            permissionName: permission
        }
        this.eventEmitter.emit(RoleEventMutationName, eventContext)
    }

    public async removePermission(role: string, permission: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const rolePermissionRepository = connection.getRepository(RolePermission)
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
            } else if (!await this.permissionService.isExists(permission)) {
                throw new PermissionDoesNotExist
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

        const eventContext: EventContext = {
            type: RoleEventMutation.RemovePermission,
            roleName: role,
            permissionName: permission
        }
        this.eventEmitter.emit(RoleEventMutationName, eventContext)
    }

    public async isExistsPermission(role: string, permission: string): Promise<boolean> {
        const connection = await this.connection
        const rolePermissionRepository = connection.getRepository(RolePermission)

        return await rolePermissionRepository.count({
            where: {
                roleName: role,
                permissionName: permission
            }
        }) > 0
    }

    public async setRolePermissionMetadata(
        role: string, 
        permission: string, 
        snapshotMetadata: SnapshotMetadata<RolePermissionMetadata>, 
        nestedTransaction = false
    ): Promise<void> {
        const connection = await this.connection
        const rolePermissionRepository = connection.getRepository(RolePermission)
        const metadataRepository = getCustomRepository(connection, MetadataRepository)

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

        const eventContext: EventContext = {
            type: RoleEventMutation.SetRolePermissionMetadata,
            roleName: role,
            permissionName: permission
        }
        this.eventEmitter.emit(RoleEventMutationName, eventContext)
    }

    public onMutation(handler: (context: EventContext) => void): void {
        this.eventEmitter.on(RoleEventMutationName, handler)
    }

}