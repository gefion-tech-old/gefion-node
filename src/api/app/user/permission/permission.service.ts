import { injectable, inject } from 'inversify'
import { IPermissionService } from './permission.interface'
import { Permission } from '../../entities/user.entity'
import { Connection } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { mutationQuery } from '../../../../core/typeorm/utils/mutation-query'
import { 
    PermissionMetadata, 
    CreatePermission,
    EventContext,
    PermissionEventMutation,
    PermissionEventMutationName
} from './permission.types'
import { SnapshotMetadata } from '../../metadata/metadata.types'
import { PermissionDoesNotExist, PermissionAlreadyExists } from './permission.errors'
import { MetadataRepository } from '../../metadata/repositories/metadata.repository'
import { getCustomRepository } from '../../../../core/typeorm/utils/custom-repository'
import { transaction } from '../../../../core/typeorm/utils/transaction'
import { Metadata } from '../../entities/metadata.entity'
import { ResourceType, CREATOR_SYMBOL } from '../../creator/creator.types'
import { ICreatorService } from '../../creator/creator.interface'
import { EventEmitter } from 'events'

@injectable()
export class PermissionService implements IPermissionService {

    private eventEmitter = new EventEmitter

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        private connection: Promise<Connection>,

        @inject(CREATOR_SYMBOL.CreatorService)
        private creatorService: ICreatorService
    ) {}

    public async create(options: CreatePermission, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const permissionRepository = connection.getRepository(Permission)

        if (await this.isExists(options.name)) {
            throw new PermissionAlreadyExists
        }

        /**
         * Оборачиваю запрос в транзакцию в том числе из-за каскадного сохранения
         * метаданных
         */
        await transaction(nestedTransaction, connection, async () => {
            const permissionEntity = await mutationQuery(true, () => {
                return permissionRepository.save({
                    name: options.name,
                    metadata: {
                        metadata: {
                            custom: null
                        }
                    }
                })
            })

            await this.creatorService.bind({
                type: ResourceType.Permission,
                id: permissionEntity.id
            }, options.creator, true)
        })

        const eventContext: EventContext = {
            type: PermissionEventMutation.Create,
            permissionName: options.name
        }
        this.eventEmitter.emit(PermissionEventMutationName, eventContext)
    }

    public async remove(permission: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const permissionRepository = connection.getRepository(Permission)
        const metadataRepository = connection.getRepository(Metadata)

        const permissionEntity = await permissionRepository.findOne({
            where: {
                name: permission
            }
        })

        if (!permissionEntity) {
            return
        }

        await transaction(nestedTransaction, connection, async () => {
            await mutationQuery(true, () => {
                return permissionRepository.remove(permissionEntity)
            })

            await mutationQuery(true, () => {
                return metadataRepository.remove(permissionEntity.metadata)
            })
        })

        const eventContext: EventContext = {
            type: PermissionEventMutation.Remove,
            permissionName: permissionEntity.name
        }
        this.eventEmitter.emit(PermissionEventMutationName, eventContext)
    }
    
    public async isExists(permission: string): Promise<boolean> {
        const connection = await this.connection
        const permissionRepository = connection.getRepository(Permission)
        
        return await permissionRepository.count({
            name: permission
        }) > 0
    }

    public async setMetadata(permission: string, snapshotMetadata: SnapshotMetadata<PermissionMetadata>, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const permissionRepository = connection.getRepository(Permission)
        const metadataRepository = getCustomRepository(connection, MetadataRepository)

        const permissionEntity = await permissionRepository.findOne({
            where: {
                name: permission
            }
        })

        if (!permissionEntity) {
            throw new PermissionDoesNotExist
        }

        permissionEntity.metadata.metadata.custom = snapshotMetadata.metadata.custom
        await metadataRepository.update(permissionEntity.metadata.id, {
            metadata: permissionEntity.metadata.metadata,
            revisionNumber: snapshotMetadata.revisionNumber
        }, nestedTransaction)

        const eventContext: EventContext = {
            type: PermissionEventMutation.SetMetadata,
            permissionName: permissionEntity.name
        }
        this.eventEmitter.emit(PermissionEventMutationName, eventContext)
    }

    public onMutation(handler: (context: EventContext) => void): void {
        this.eventEmitter.on(PermissionEventMutationName, handler)
    }

}