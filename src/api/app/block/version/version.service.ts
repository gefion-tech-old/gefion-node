import { injectable, inject } from 'inversify'
import { IVersionService } from './version.interface'
import {
    AssociateOptions,
    UnAssociateOptions
} from './version.types'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { BlockVersion } from '../../entities/block.entity'
import { Connection } from 'typeorm'
import { BlockVersionInUse, BlockVersionAlreadyExists } from './version.errors'
import { isErrorCode, SqliteErrorCode } from '../../../../core/typeorm/utils/error-code'
import { mutationQuery } from '../../../../core/typeorm/utils/mutation-query'

@injectable()
export class VersionService implements IVersionService {

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        private connection: Promise<Connection>
    ) {}

    public async associate(options: AssociateOptions, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const versionRepository = connection.getRepository(BlockVersion)

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
        const connection = await this.connection
        const versionRepository = connection.getRepository(BlockVersion)

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