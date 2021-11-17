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
import { ResourceAlreadyHasCreator } from './creator.errors'
import { 
    InvalidTransactionObject, 
    EntityManagerWithoutTransaction 
} from '../../../core/typeorm/typeorm.errors'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('CreatorService в CreatorModule', () => {

    describe('Методы в качестве ресурсов', () => {

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
    
        it(`
            Экземпляр блока, к которому привязан метод корректно можно получить
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

            await creatorService.bind({
                type: ResourceType.Method,
                id: methodEntity.id
            }, {
                type: CreatorType.BlockInstance,
                id: instanceEntity.id
            })

            await expect(creatorService.getCreator({
                type: ResourceType.Method,
                id: methodEntity.id
            })).resolves.toBeInstanceOf(BlockInstance)

            container.restore()
        })
    
        it(`
            Систему, к которой привязан метод корректно можно получить 
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const creatorService = container
                .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const methodRepository = connection.getRepository(Method)

            const methodEntity = await methodRepository.save({
                name: 'name',
                namespace: 'namespace',
                type: 'type'
            })

            await creatorService.bind({
                type: ResourceType.Method,
                id: methodEntity.id
            }, {
                type: CreatorType.System
            })

            await expect(creatorService.getCreator({
                type: ResourceType.Method,
                id: methodEntity.id
            })).resolves.toBe(CreatorType.System)

            container.restore()
        })

    })

    it(`
        Попытка привязать создателя к ресурсу у которого уже есть создатель выбрасывает
        исключение
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)

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
        await expect(creatorService.bind({
            type: ResourceType.Method,
            id: methodEntity.id
        }, {
            type: CreatorType.System
        })).rejects.toBeInstanceOf(ResourceAlreadyHasCreator)

        container.restore()
    })

    it(`
        Попытка получить создателя ресурса, к которому не привязано ни одного создателя
        возвращает undefined
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)

        await expect(creatorService.getCreator({
            type: ResourceType.Method,
            id: 1
        })).resolves.toBeUndefined()

        container.restore()
    })

    it(`
        Попытка передать некорректный или неактивный менеджер транзакции при привязке создателя
        завершается исключением
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)

        await expect(creatorService.bind({
            type: ResourceType.Method,
            id: 1
        }, {
            type: CreatorType.System
        }, {} as any)).rejects.toBeInstanceOf(InvalidTransactionObject)

        await expect(creatorService.bind({
            type: ResourceType.Method,
            id: 1
        }, {
            type: CreatorType.System
        }, connection.manager)).rejects.toBeInstanceOf(EntityManagerWithoutTransaction)

        container.restore()
    })

    it(`
        Привязка создателя ресурса происходит корректно с помощью внешнего менеджера транзакции
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

        await connection.transaction(async transactionEntityManager => {
            await expect(creatorService.bind({
                type: ResourceType.Method,
                id: methodEntity.id
            }, {
                type: CreatorType.System
            }, transactionEntityManager)).resolves.toBeUndefined()
        })
        
        await expect(creatorRepository.find()).resolves.toHaveLength(1)

        container.restore()
    })

})