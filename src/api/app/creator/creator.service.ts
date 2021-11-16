import { injectable, inject } from 'inversify'
import { 
    BindableCreator, 
    BindableResource, 
    CreatorType,
    ResourceType
} from './creator.types'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { ICreatorService } from './creator.interface'
import { Connection, Repository } from 'typeorm'
import { Creator } from '../entities/creator.entity'

@injectable()
export class CreatorService implements ICreatorService {

    private creatorRepository: Promise<Repository<Creator>>

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        connection: Promise<Connection> 
    ) {
        this.creatorRepository = connection
            .then(connection => {
                return connection.getRepository(Creator)
            })
    }

    public async bind(resource: BindableResource, creator: BindableCreator): Promise<void> {
        const creatorRepository = await this.creatorRepository
        const creatorEntity = creatorRepository.create()
        
        switch (resource.type) {
            case ResourceType.Method:
                creatorEntity.method = { id: resource.id } as any
                break
        }

        switch (creator.type) {
            case CreatorType.System:
                creatorEntity.system = true
                break
            case CreatorType.BlockInstance:
                creatorEntity.blockInstance = { id: creator.id } as any
                break
        }

        await creatorRepository.save(creatorEntity)
    }

}