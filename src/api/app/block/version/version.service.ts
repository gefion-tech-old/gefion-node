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

    public async associate(options: AssociateOptions): Promise<void> {
        const versionRepository = await this.versionRepository

        try {
            await versionRepository.save({
                name: options.name,
                version: options.version,
                path: options.path
            })
        } catch(error) {
            if ((error as any)?.driverError?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new BlockVersionAlreadyExists()
            }

            throw error
        }
    }

    public async unassociate(options: UnAssociateOptions): Promise<void> {
        const versionRepository = await this.versionRepository

        const block = await versionRepository.findOne({
            name: options.name,
            version: options.version
        })

        if (!block) {
            return
        }

        try {
            await versionRepository.remove(block)
        } catch(error) {
            if ((error as any)?.driverError?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
                throw new BlockVersionInUse()
            }

            throw error
        }
    }

}