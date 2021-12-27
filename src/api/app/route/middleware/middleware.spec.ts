import { getContainer } from '../../../../inversify.config'
import { IMiddlewareService } from './middleware.interface'
import { ROUTE_SYMBOL } from '../route.types'
import {
    MiddlewareMethodNotDefined,
    MiddlewareDoesNotExists
} from './middleware.errors'
import { CreatorType, CREATOR_SYMBOL, ResourceType } from '../../creator/creator.types'
import { ICreatorService } from '../../creator/creator.interface'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { Connection } from 'typeorm'
import { Method } from '../../entities/method.entity'
import { Metadata } from '../../entities/metadata.entity'
import { Middleware } from '../../entities/route.entity'
import { RevisionNumberError } from '../../metadata/metadata.errors'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('MiddlewareService в RouteModule', () => {

    it(`
        Попытка создать middleware с несуществующим методом приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareService = container
            .get<IMiddlewareService>(ROUTE_SYMBOL.MiddlewareService)
        
        await expect(middlewareService.createIfNotExists({
            creator: {
                type: CreatorType.System
            },
            method: {
                name: 'name1',
                namespace: 'namespace1',
                type: 'type1'
            },
            name: 'middleware1'
        })).rejects.toBeInstanceOf(MiddlewareMethodNotDefined)

        container.restore()
    })
    
    it(`
        Middleware корректно создаётся. Попытка создания уже созданного middleware
        ни к чему не приводит
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareService = container
            .get<IMiddlewareService>(ROUTE_SYMBOL.MiddlewareService)
        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)

        const methodEntity = await methodRepository.save({
            name: 'name1',
            type: 'type1',
            namespace: 'namespace1'
        })

        await expect(middlewareService.isExists('middleware1')).resolves.toBe(false)
        await expect(middlewareService.createIfNotExists({
            creator: {
                type: CreatorType.System
            },
            method: methodEntity,
            name: 'middleware1'
        })).resolves.toBeUndefined()
        await expect(middlewareService.createIfNotExists({
            creator: {
                type: CreatorType.System
            },
            method: methodEntity,
            name: 'middleware1'
        })).resolves.toBeUndefined()
        await expect(middlewareService.isExists('middleware1')).resolves.toBe(true)
        await expect(creatorService.isResourceCreator({
            type: ResourceType.Middleware,
            id: 1
        }, {
            type: CreatorType.System
        })).resolves.toBe(true)

        container.restore()
    })
    
    it(`
        Middleware корректно удаляется вместе с метаданными. Попытка удалить несуществующий 
        middleware ни к чему не приводит. Вместе с middleware удаляется и его метод, если он
        больше ни к чему не привязан
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareService = container
            .get<IMiddlewareService>(ROUTE_SYMBOL.MiddlewareService)
        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const metadataRepository = connection.getRepository(Metadata)

        const methodEntity = await methodRepository.save({
            name: 'name1',
            type: 'type1',
            namespace: 'namespace1'
        })
        await middlewareService.createIfNotExists({
            creator: {
                type: CreatorType.System
            },
            method: methodEntity,
            name: 'middleware1'
        })

        await expect(middlewareService.isExists('middleware1')).resolves.toBe(true)
        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect(methodRepository.count()).resolves.toBe(1)
        await expect(creatorService.isResourceCreator({
            type: ResourceType.Middleware,
            id: 1
        }, {
            type: CreatorType.System
        })).resolves.toBe(true)

        await expect(middlewareService.remove('middleware1')).resolves.toBeUndefined()
        await expect(middlewareService.remove('middleware1')).resolves.toBeUndefined()
        
        await expect(middlewareService.isExists('middleware1')).resolves.toBe(false)
        await expect(metadataRepository.count()).resolves.toBe(0)
        await expect(methodRepository.count()).resolves.toBe(0)
        await expect(creatorService.isResourceCreator({
            type: ResourceType.Middleware,
            id: 1
        }, {
            type: CreatorType.System
        })).resolves.toBe(false)

        container.restore()
    })
    
    it(`
        Попытка установить метаданные в несуществующий middleware приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareService = container
            .get<IMiddlewareService>(ROUTE_SYMBOL.MiddlewareService)

        await expect(middlewareService.setMetadata('middleware1', {
            metadata: {
                custom: true
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(MiddlewareDoesNotExists)

        container.restore()
    })
    
    it(`
        Метаданные корректно устанавливаются в middleware и читаются из него. Попытка установить 
        метаданные несоответствующей редакции приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareService = container
            .get<IMiddlewareService>(ROUTE_SYMBOL.MiddlewareService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const middlewareRepository = connection.getRepository(Middleware)
        const metadataRepository = connection.getRepository(Metadata)
        const methodRepository = connection.getRepository(Method)

        const methodEntity = await methodRepository.save({
            name: 'name1',
            type: 'type1',
            namespace: 'namespace1'
        })

        await expect(middlewareService.createIfNotExists({
            creator: {
                type: CreatorType.System
            },
            method: methodEntity,
            name: 'middleware1'
        })).resolves.toBeUndefined()
        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect((async () => {
            const middlewareEntity = await middlewareRepository.findOne({
                where: {
                    name: 'middleware1'
                }
            })
            return middlewareEntity?.metadata
        })()).resolves.toMatchObject({
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })
        await expect(middlewareService.setMetadata('middleware1', {
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 0
        })).resolves.toBeUndefined()
        await expect((async () => {
            const middlewareEntity = await middlewareRepository.findOne({
                where: {
                    name: 'middleware1'
                }
            })
            return middlewareEntity?.metadata
        })()).resolves.toMatchObject({
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 1
        })
        await expect(middlewareService.setMetadata('middleware1', {
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(RevisionNumberError)
        await expect((async () => {
            const middlewareEntity = await middlewareRepository.findOne({
                where: {
                    name: 'middleware1'
                }
            })
            return middlewareEntity?.metadata
        })()).resolves.toMatchObject({
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 1
        })
        await expect(metadataRepository.count()).resolves.toBe(1)

        container.restore()
    })
    
    it(`
        Попытка включить/выключить csrf в несуществующем middleware приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareService = container
            .get<IMiddlewareService>(ROUTE_SYMBOL.MiddlewareService)

        await expect(middlewareService.enableCsrf('middleware1')).rejects.toBeInstanceOf(MiddlewareDoesNotExists)
        await expect(middlewareService.disableCsrf('middleware1')).rejects.toBeInstanceOf(MiddlewareDoesNotExists)
            
        container.restore()
    })
    
    it(`
        Включение/выключение csrf в указанном middleware происходит корректно. Повторное включение/выключение
        уже включённого/выключенного csrf ни к чему не приводит
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareService = container
            .get<IMiddlewareService>(ROUTE_SYMBOL.MiddlewareService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const middlewareRepository = connection.getRepository(Middleware)
        const methodRepository = connection.getRepository(Method)

        const methodEntity = await methodRepository.save({
            name: 'name1',
            type: 'type1',
            namespace: 'namespace1'
        })

        await expect(middlewareService.createIfNotExists({
            creator: {
                type: CreatorType.System
            },
            method: methodEntity,
            name: 'middleware1'
        })).resolves.toBeUndefined()

        await expect(middlewareRepository.findOne({
            where: {
                name: 'middleware1'
            }
        })).resolves.toMatchObject({
            isCsrf: false
        })

        await expect(middlewareService.enableCsrf('middleware1')).resolves.toBeUndefined()
        await expect(middlewareService.enableCsrf('middleware1')).resolves.toBeUndefined()

        await expect(middlewareRepository.findOne({
            where: {
                name: 'middleware1'
            }
        })).resolves.toMatchObject({
            isCsrf: true
        })

        await expect(middlewareService.disableCsrf('middleware1')).resolves.toBeUndefined()
        await expect(middlewareService.disableCsrf('middleware1')).resolves.toBeUndefined()

        await expect(middlewareRepository.findOne({
            where: {
                name: 'middleware1'
            }
        })).resolves.toMatchObject({
            isCsrf: false
        })

        container.restore()
    })

})