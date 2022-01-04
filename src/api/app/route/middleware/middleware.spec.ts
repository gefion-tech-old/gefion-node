import { getContainer } from '../../../../inversify.config'
import { IMiddlewareService } from './middleware.interface'
import { ROUTE_SYMBOL } from '../route.types'
import {
    MiddlewareMethodNotDefined,
    MiddlewareDoesNotExists,
    MiddlewareAlreadyExists
} from './middleware.errors'
import { CreatorType, CREATOR_SYMBOL, ResourceType } from '../../creator/creator.types'
import { ICreatorService } from '../../creator/creator.interface'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { Connection } from 'typeorm'
import { Method } from '../../entities/method.entity'
import { Metadata } from '../../entities/metadata.entity'
import { Middleware } from '../../entities/route.entity'
import { RevisionNumberError } from '../../metadata/metadata.errors'
import { MiddlewareEventMutation } from './middleware.types'

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

        const middleware = {
            namespace: 'middleware1',
            name: 'middleware1'
        }

        const eventMutationFn = jest.fn()
        middlewareService.onMutation(eventMutationFn)
        
        await expect(middlewareService.create({
            creator: {
                type: CreatorType.System
            },
            method: {
                name: 'name1',
                namespace: 'namespace1',
                type: 'type1'
            },
            ...middleware
        })).rejects.toBeInstanceOf(MiddlewareMethodNotDefined)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })
    
    it(`
        Middleware корректно создаётся. Попытка создания уже созданного middleware
        приводит к исключению
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

        const middleware = {
            namespace: 'middleware1',
            name: 'middleware1'
        }

        const eventMutationFn = jest.fn()
        middlewareService.onMutation(eventMutationFn)

        await expect(middlewareService.isExists(middleware)).resolves.toBe(false)
        await expect(middlewareService.create({
            creator: {
                type: CreatorType.System
            },
            method: methodEntity,
            ...middleware
        })).resolves.toBeUndefined()
        await expect(middlewareService.create({
            creator: {
                type: CreatorType.System
            },
            method: methodEntity,
            ...middleware
        })).rejects.toBeInstanceOf(MiddlewareAlreadyExists)
        await expect(middlewareService.isExists(middleware)).resolves.toBe(true)
        await expect(creatorService.isResourceCreator({
            type: ResourceType.Middleware,
            id: 1
        }, {
            type: CreatorType.System
        })).resolves.toBe(true)

        expect(eventMutationFn).toBeCalledTimes(1)
        expect(eventMutationFn).nthCalledWith(1, {
            type: MiddlewareEventMutation.Create,
            middlewareId: 1
        })

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
        const middleware = {
            namespace: 'middleware1',
            name: 'middleware1'
        }

        const eventMutationFn = jest.fn()
        middlewareService.onMutation(eventMutationFn)

        await middlewareService.create({
            creator: {
                type: CreatorType.System
            },
            method: methodEntity,
            ...middleware
        })

        await expect(middlewareService.isExists(middleware)).resolves.toBe(true)
        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect(methodRepository.count()).resolves.toBe(1)
        await expect(creatorService.isResourceCreator({
            type: ResourceType.Middleware,
            id: 1
        }, {
            type: CreatorType.System
        })).resolves.toBe(true)

        await expect(middlewareService.remove(middleware)).resolves.toBeUndefined()
        await expect(middlewareService.remove(middleware)).resolves.toBeUndefined()
        
        await expect(middlewareService.isExists(middleware)).resolves.toBe(false)
        await expect(metadataRepository.count()).resolves.toBe(0)
        await expect(methodRepository.count()).resolves.toBe(0)
        await expect(creatorService.isResourceCreator({
            type: ResourceType.Middleware,
            id: 1
        }, {
            type: CreatorType.System
        })).resolves.toBe(false)

        expect(eventMutationFn).toBeCalledTimes(2)
        expect(eventMutationFn).nthCalledWith(2, {
            type: MiddlewareEventMutation.Remove,
            middlewareId: 1
        })

        container.restore()
    })
    
    it(`
        Попытка установить метаданные в несуществующий middleware приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareService = container
            .get<IMiddlewareService>(ROUTE_SYMBOL.MiddlewareService)

        const middleware = {
            namespace: 'middleware1',
            name: 'middleware1'
        }

        const eventMutationFn = jest.fn()
        middlewareService.onMutation(eventMutationFn)

        await expect(middlewareService.setMetadata(middleware, {
            metadata: {
                custom: true
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(MiddlewareDoesNotExists)

        expect(eventMutationFn).toBeCalledTimes(0)

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

        const middleware = {
            namespace: 'middleware1',
            name: 'middleware1'
        }

        const eventMutationFn = jest.fn()
        middlewareService.onMutation(eventMutationFn)

        await expect(middlewareService.create({
            creator: {
                type: CreatorType.System
            },
            method: methodEntity,
            ...middleware
        })).resolves.toBeUndefined()
        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect((async () => {
            const middlewareEntity = await middlewareRepository.findOne({
                where: middleware
            })
            return middlewareEntity?.metadata
        })()).resolves.toMatchObject({
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })
        await expect(middlewareService.setMetadata(middleware, {
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 0
        })).resolves.toBeUndefined()
        await expect((async () => {
            const middlewareEntity = await middlewareRepository.findOne({
                where: middleware
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
        await expect(middlewareService.setMetadata(middleware, {
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(RevisionNumberError)
        await expect((async () => {
            const middlewareEntity = await middlewareRepository.findOne({
                where: middleware
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

        expect(eventMutationFn).toBeCalledTimes(2)
        expect(eventMutationFn).nthCalledWith(2, {
            type: MiddlewareEventMutation.SetMetadata,
            middlewareId: 1
        })

        container.restore()
    })
    
    it(`
        Попытка включить/выключить csrf в несуществующем middleware приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareService = container
            .get<IMiddlewareService>(ROUTE_SYMBOL.MiddlewareService)

        const middleware = {
            namespace: 'middleware1',
            name: 'middleware1'
        }

        const eventMutationFn = jest.fn()
        middlewareService.onMutation(eventMutationFn)

        await expect(middlewareService.enableCsrf(middleware)).rejects.toBeInstanceOf(MiddlewareDoesNotExists)
        await expect(middlewareService.disableCsrf(middleware)).rejects.toBeInstanceOf(MiddlewareDoesNotExists)

        expect(eventMutationFn).toBeCalledTimes(0)
            
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

        const middleware = {
            namespace: 'middleware1',
            name: 'middleware1'
        }

        const eventMutationFn = jest.fn()
        middlewareService.onMutation(eventMutationFn)

        await expect(middlewareService.create({
            creator: {
                type: CreatorType.System
            },
            method: methodEntity,
            ...middleware
        })).resolves.toBeUndefined()

        await expect(middlewareRepository.findOne({
            where: middleware
        })).resolves.toMatchObject({
            isCsrf: false
        })

        await expect(middlewareService.enableCsrf(middleware)).resolves.toBeUndefined()
        await expect(middlewareService.enableCsrf(middleware)).resolves.toBeUndefined()

        await expect(middlewareRepository.findOne({
            where: middleware
        })).resolves.toMatchObject({
            isCsrf: true
        })

        await expect(middlewareService.disableCsrf(middleware)).resolves.toBeUndefined()
        await expect(middlewareService.disableCsrf(middleware)).resolves.toBeUndefined()

        await expect(middlewareRepository.findOne({
            where: middleware
        })).resolves.toMatchObject({
            isCsrf: false
        })

        expect(eventMutationFn).toBeCalledTimes(5)
        const eventContextEnableCsrf = {
            type: MiddlewareEventMutation.EnableCsrf,
            middlewareId: 1
        }
        expect(eventMutationFn).nthCalledWith(2, eventContextEnableCsrf)
        expect(eventMutationFn).nthCalledWith(3, eventContextEnableCsrf)
        const eventContextDisableCsrf = {
            type: MiddlewareEventMutation.DisableCsrf,
            middlewareId: 1
        }
        expect(eventMutationFn).nthCalledWith(4, eventContextDisableCsrf)
        expect(eventMutationFn).nthCalledWith(5, eventContextDisableCsrf)

        container.restore()
    })

})