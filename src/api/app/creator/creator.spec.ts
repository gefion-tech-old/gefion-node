import { getContainer } from '../../../inversify.config'
import { 
    CREATOR_SYMBOL, 
    ResourceType,
    CreatorType
} from './creator.types'
import { ICreatorService } from './creator.interface'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { Connection } from 'typeorm'
import { Method } from '../entities/method.entity'
import { BlockInstance } from '../entities/block-instance.entity'
import { BlockVersion } from '../entities/block-version.entity'
import { Creator } from '../entities/creator.entity'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('CreatorService в CreatorModule', () => {

    it(`
        Методы корректно привязываются к экземпляру блока. Нельзя удалить
        экземпляр блока с привязанным методом, но можно удалить метод.
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const versionRepository = connection.getRepository(BlockVersion)
        const instanceRepository = connection.getRepository(BlockInstance)
        const creatorRepository = connection.getRepository(Creator)

        const versionEntity = await versionRepository.save({
            name: 'name',
            path: 'path',
            version: 'version' 
        })
        const instanceEntity = await instanceRepository.save({
            blockVersion: versionEntity
        })
        const methodEntity = await methodRepository.save({
            name: 'name',
            namespace: 'namespace',
            type: 'type'
        })

        await expect(creatorService.bind({
            type: ResourceType.Method,
            id: methodEntity.id
        }, {
            type: CreatorType.BlockInstance,
            id: instanceEntity.id
        })).resolves.toBeUndefined()
        await expect(creatorRepository.find())
            .resolves
            .toHaveLength(1)
        await expect(instanceRepository.delete(instanceEntity))
            .rejects
            .toThrow()
        await expect(methodRepository.delete(methodEntity))
            .resolves
            .toBeDefined()
        await expect(creatorRepository.find())
            .resolves
            .toHaveLength(0)

        container.restore()
    })

    it(`
        Методы корректно привязываются к системе. Привязка удаляется вместе
        с удалением метода
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const creatorRepository = connection.getRepository(Creator)

        const methodEntity = await methodRepository.save({
            name: 'name',
            namespace: 'namespace',
            type: 'type'
        })

        await expect(creatorService.bind({
            type: ResourceType.Method,
            id: methodEntity.id
        }, {
            type: CreatorType.System
        })).resolves.toBeUndefined()
        await expect(creatorRepository.find())
            .resolves
            .toHaveLength(1)
        await expect(methodRepository.delete(methodEntity))
            .resolves
            .toBeDefined()
        await expect(creatorRepository.find())
            .resolves
            .toHaveLength(0)

        container.restore()
    })

})