import { injectable, inject } from 'inversify'
import { IPermissionService } from './permission.interface'
import { Permission } from '../../entities/user.entity'
import { Connection, Repository } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { SqliteErrorCode, isErrorCode } from '../../../../core/typeorm/utils/error-code'
import { mutationQuery } from '../../../../core/typeorm/utils/mutation-query'
import { PermissionMetadata } from './permission.types'
import { SnapshotMetadata } from '../../metadata/metadata.types'
import { PermissionDoesNotExist } from './permission.errors'
import { MetadataRepository } from '../../metadata/repositories/metadata.repository'
import { getCustomRepository } from '../../../../core/typeorm/utils/custom-repository'
import { transaction } from '../../../../core/typeorm/utils/transaction'
import { Metadata } from '../../entities/metadata.entity'

@injectable()
export class PermissionService implements IPermissionService {

    private connection: Promise<Connection>
    private permissionRepository: Promise<Repository<Permission>>

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        connection: Promise<Connection>
    ) {
        this.connection = connection
        this.permissionRepository = connection
            .then(connection => {
                return connection.getRepository(Permission)
            })
    }

    public async create(permission: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const permissionRepository = await this.permissionRepository

        try {
            /**
             * Оборачиваю запрос в транзакцию из-за каскадного сохранения
             * метаданных
             */
            await transaction(nestedTransaction, connection, async () => {
                await mutationQuery(true, () => {
                    return permissionRepository.save({
                        name: permission,
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

    public async getMetadata(permission: string): Promise<SnapshotMetadata<PermissionMetadata> | undefined> {
        const permissionRepository = await this.permissionRepository

        const permissionEntity = await permissionRepository.findOne({
            where: {
                name: permission
            }
        })

        if (!permissionEntity) {
            return
        }

        return {
            metadata: permissionEntity.metadata.metadata,
            revisionNumber: permissionEntity.metadata.revisionNumber
        }
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