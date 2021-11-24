import { injectable, inject } from 'inversify'
import { IVersionService } from './version.interface'
import {
    AssociateOptions,
    UnAssociateOptions
} from './version.types'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { BlockVersion } from '../../entities/block-version.entity'
import { Repository, Connection } from 'typeorm'
import { BlockVersionInUse, BlockVersionAlreadyExists } from './version.errors'
import { isErrorCode, SqliteErrorCode } from '../../../../core/typeorm/utils/error-code'
import { mutationQuery } from '../../../../core/typeorm/utils/mutation-query'

@injectable()
export class VersionService implements IVersionService {

    private versionRepository: Promise<Repository<BlockVersion>>

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        connection: Promise<Connection>
    ) {
        this.versionRepository = connection
            .then(connection => {
                return connection.getRepository(BlockVersion)
            })
    }

    public async associate(options: AssociateOptions, nestedTransaction = false): Promise<void> {
        const versionRepository = await this.versionRepository

        try {
            await mutationQuery(nestedTransaction, () => {
                return versionRepository.save({
                    name: options.name,
                    version: options.version,
                    path: options.path
                })
            })
        } catch(error) {
            if (isErrorCode(error, SqliteErrorCode.SQLITE_CONSTRAINT_UNIQUE)) {
                throw new BlockVersionAlreadyExists()
            }

            throw error
        }
    }

    public async unassociate(options: UnAssociateOptions, nestedTransaction = false): Promise<void> {
        const versionRepository = await this.versionRepository

        const block = await versionRepository.findOne({
            name: options.name,
            version: options.version
        })

        if (!block) {
            return
        }

        try {
            await mutationQuery(nestedTransaction, () => {
                return versionRepository.remove(block)
            })
        } catch(error) {
            if (isErrorCode(error, [
                SqliteErrorCode.SQLITE_CONSTRAINT_FOREIGNKEY,
                SqliteErrorCode.SQLITE_CONSTRAINT_TRIGGER
            ])) {
                throw new BlockVersionInUse()
            }

            throw error
        }
    }

}