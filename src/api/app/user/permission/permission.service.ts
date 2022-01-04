import { injectable, inject } from 'inversify'
import { IPermissionService } from './permission.interface'
import { Permission } from '../../entities/user.entity'
import { Connection, Repository } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { mutationQuery } from '../../../../core/typeorm/utils/mutation-query'
import { PermissionMetadata, CreatePermission } from './permission.types'
import { SnapshotMetadata } from '../../metadata/metadata.types'
import { PermissionDoesNotExist, PermissionAlreadyExists } from './permission.errors'
import { MetadataRepository } from '../../metadata/repositories/metadata.repository'
import { getCustomRepository } from '../../../../core/typeorm/utils/custom-repository'
import { transaction } from '../../../../core/typeorm/utils/transaction'
import { Metadata } from '../../entities/metadata.entity'
import { ResourceType, CREATOR_SYMBOL } from '../../creator/creator.types'
import { ICreatorService } from '../../creator/creator.interface'

@injectable()
export class PermissionService implements IPermissionService {

    private connection: Promise<Connection>
    private permissionRepository: Promise<Repository<Permission>>

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        connection: Promise<Connection>,

        @inject(CREATOR_SYMBOL.CreatorService)
        private creatorService: ICreatorService
    ) {
        this.connection = connection
        this.permissionRepository = connection
            .then(connection => {
                return connection.getRepository(Permission)
            })
    }

    public async create(options: CreatePermission, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const permissionRepository = await this.permissionRepository

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
    }

    public async remove(permission: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const permissionRepository = await this.permissionRepository
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
    }
    
    public async isExists(permission: string): Promise<boolean> {
        const permissionRepository = await this.permissionRepository
        return await permissionRepository.count({
            name: permission
        }) > 0
    }

    public async setMetadata(permission: string, snapshotMetadata: SnapshotMetadata<PermissionMetadata>, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const metadataRepository = getCustomRepository(connection, MetadataRepository)
        const permissionRepository = await this.permissionRepository

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
    }

}