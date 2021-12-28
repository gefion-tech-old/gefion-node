import { getContainer } from '../../../../inversify.config'
import { IMiddlewareGroupService } from './middleware-group.interface'
import { ROUTE_SYMBOL } from '../route.types'
import { Metadata } from '../../entities/metadata.entity'
import { ICreatorService } from '../../creator/creator.interface'
import { CREATOR_SYMBOL, CreatorType, ResourceType } from '../../creator/creator.types'
import { Connection } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import {
    MiddlewareGroupDoesNotExists,
} from './middleware-group.errors'
import { RevisionNumberError } from '../../metadata/metadata.errors'
import { MiddlewareGroup, Middleware, MiddlewareGroupMiddleware } from '../../entities/route.entity'
import { Method } from '../../entities/method.entity'
import { MiddlewareDoesNotExists } from '../middleware/middleware.errors'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('MiddlewareGroup в RouteModule', () => {

    it(`
        Группа middleware корректно создаётся. Попытка создания уже созданной группы
        ни к чему не приводит
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareGroupService = container
            .get<IMiddlewareGroupService>(ROUTE_SYMBOL.MiddlewareGroupService)
        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const metadataRepository = connection.getRepository(Metadata)

        await expect(middlewareGroupService.isExists('group1')).resolves.toBe(false)
        await expect(metadataRepository.count()).resolves.toBe(0)

        await expect(middlewareGroupService.createIfNotExists({
            isDefault: false,
            creator: {
                type: CreatorType.System
            },
            name: 'group1'
        })).resolves.toBeUndefined()
        await expect(middlewareGroupService.createIfNotExists({
            isDefault: false,
            creator: {
                type: CreatorType.System
            },
            name: 'group1'
        })).resolves.toBeUndefined()

        await expect(middlewareGroupService.isExists('group1')).resolves.toBe(true)
        await expect(metadataRepository.count()).resolves.toBe(1)
        
        await expect(creatorService.isResourceCreator({
            type: ResourceType.MiddlewareGroup,
            id: 1
        }, {
            type: CreatorType.System
        })).resolves.toBe(true)

        container.restore()
    })

    it(`
        Попытка установить метаданные в несуществующую группу middleware приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareGroupService = container
            .get<IMiddlewareGroupService>(ROUTE_SYMBOL.MiddlewareGroupService)

        await expect(middlewareGroupService.setMetadata('group1', {
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(MiddlewareGroupDoesNotExists)

        container.restore()
    })

    it(`
        Метаданные корректно устанавливаются в группу middleware и читаются из неё. Попытка установить 
        метаданные несоответствующей редакции приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareGroupService = container
            .get<IMiddlewareGroupService>(ROUTE_SYMBOL.MiddlewareGroupService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)
        const metadataRepository = connection.getRepository(Metadata)

        await expect(middlewareGroupService.createIfNotExists({
            creator: {
                type: CreatorType.System
            },
            name: 'group1',
            isDefault: false
        })).resolves.toBeUndefined()
        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect((async () => {
            const middlewareGroupEntity = await middlewareGroupRepository.findOne({
                where: {
                    name: 'group1'
                }
            })
            return middlewareGroupEntity?.metadata
        })()).resolves.toMatchObject({
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })
        await expect(middlewareGroupService.setMetadata('group1', {
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 0
        })).resolves.toBeUndefined()
        await expect((async () => {
            const middlewareGroupEntity = await middlewareGroupRepository.findOne({
                where: {
                    name: 'group1'
                }
            })
            return middlewareGroupEntity?.metadata
        })()).resolves.toMatchObject({
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 1
        })
        await expect(middlewareGroupService.setMetadata('group1', {
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(RevisionNumberError)
        await expect((async () => {
            const middlewareGroupEntity = await middlewareGroupRepository.findOne({
                where: {
                    name: 'group1'
                }
            })
            return middlewareGroupEntity?.metadata
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
        Попытка добавить middleware в несуществующую группу middleware приводит к исключению. Также точно
        и с удалением middleware из группы
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareGroupService = container
            .get<IMiddlewareGroupService>(ROUTE_SYMBOL.MiddlewareGroupService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const middlewareRepository = connection.getRepository(Middleware)

        const methodEntity = await methodRepository.save({
            name: 'name1',
            namespace: 'namespace1',
            type: 'type1'
        })
        await middlewareRepository.save({
            isCsrf: false,
            metadata: {
                metadata: {
                    custom: null
                }
            },
            method: methodEntity,
            name: 'middleware1'
        })

        await expect(middlewareGroupService.addMiddleware('group1', 'middleware1')).rejects.toBeInstanceOf(MiddlewareGroupDoesNotExists)
        await expect(middlewareGroupService.removeMiddleware('group1', 'middleware1')).rejects.toBeInstanceOf(MiddlewareGroupDoesNotExists)

        container.restore()
    })

    it(`
        Попытка добавить несуществующий middleware в группу middleware приводит к исключению. Также точно
        и с удалением middleware из группы
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareGroupService = container
            .get<IMiddlewareGroupService>(ROUTE_SYMBOL.MiddlewareGroupService)

        await middlewareGroupService.createIfNotExists({
            creator: {
                type: CreatorType.System
            },
            isDefault: false,
            name: 'group1'
        })

        await expect(middlewareGroupService.addMiddleware('group1', 'middleware1')).rejects.toBeInstanceOf(MiddlewareDoesNotExists)
        await expect(middlewareGroupService.removeMiddleware('group1', 'middleware1')).rejects.toBeInstanceOf(MiddlewareDoesNotExists)

        container.restore()
    })

    it(`
        Новый middleware корректно добавляется в группу middleware. Попытка добавить уже
        состоящий в группе middleware ни к чему не приводит
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareGroupService = container
            .get<IMiddlewareGroupService>(ROUTE_SYMBOL.MiddlewareGroupService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const middlewareRepository = connection.getRepository(Middleware)
        const middlewareGroupMiddlewareRepository = connection.getRepository(MiddlewareGroupMiddleware)

        const methodEntity = await methodRepository.save({
            name: 'name1',
            namespace: 'namespace1',
            type: 'type1'
        })
        await middlewareRepository.save({
            isCsrf: false,
            metadata: {
                metadata: {
                    custom: null
                }
            },
            method: methodEntity,
            name: 'middleware1'
        })
        await middlewareGroupService.createIfNotExists({
            creator: {
                type: CreatorType.System
            },
            isDefault: false,
            name: 'group1'
        })

        await expect(middlewareGroupMiddlewareRepository.count()).resolves.toBe(0)
        await expect(middlewareGroupService.addMiddleware('group1', 'middleware1')).resolves.toBeUndefined()
        await expect(middlewareGroupService.addMiddleware('group1', 'middleware1')).resolves.toBeUndefined()
        await expect(middlewareGroupMiddlewareRepository.count()).resolves.toBe(1)

        container.restore()
    })

    it(`
        Удаление middleware из группы middleware происходит корректно. Попытка удалить из группы
        не состоящий в ней middleware ни к чему не приводит
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareGroupService = container
            .get<IMiddlewareGroupService>(ROUTE_SYMBOL.MiddlewareGroupService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const middlewareRepository = connection.getRepository(Middleware)
        const middlewareGroupMiddlewareRepository = connection.getRepository(MiddlewareGroupMiddleware)

        const methodEntity = await methodRepository.save({
            name: 'name1',
            namespace: 'namespace1',
            type: 'type1'
        })
        await middlewareRepository.save({
            isCsrf: false,
            metadata: {
                metadata: {
                    custom: null
                }
            },
            method: methodEntity,
            name: 'middleware1'
        })
        await middlewareGroupService.createIfNotExists({
            creator: {
                type: CreatorType.System
            },
            isDefault: false,
            name: 'group1'
        })

        await expect(middlewareGroupService.addMiddleware('group1', 'middleware1')).resolves.toBeUndefined()
        await expect(middlewareGroupMiddlewareRepository.count()).resolves.toBe(1)
        await expect(middlewareGroupService.removeMiddleware('group1', 'middleware1')).resolves.toBeUndefined()
        await expect(middlewareGroupService.removeMiddleware('group1', 'middleware1')).resolves.toBeUndefined()
        await expect(middlewareGroupMiddlewareRepository.count()).resolves.toBe(0)

        container.restore()
    })

    it(`
        Группа middleware корректно удаляется вместе с её метаданными. Связи группы с отдельными middleware 
        удаляются автоматически. Попытка удалить несуществующую группу ни к чему не приводит
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareGroupService = container
            .get<IMiddlewareGroupService>(ROUTE_SYMBOL.MiddlewareGroupService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const middlewareRepository = connection.getRepository(Middleware)
        const middlewareGroupMiddlewareRepository = connection.getRepository(MiddlewareGroupMiddleware)
        const metadataRepository = connection.getRepository(Metadata)

        const methodEntity = await methodRepository.save({
            name: 'name1',
            namespace: 'namespace1',
            type: 'type1'
        })
        await middlewareRepository.save({
            isCsrf: false,
            metadata: {
                metadata: {
                    custom: null
                }
            },
            method: methodEntity,
            name: 'middleware1'
        })
        await middlewareGroupService.createIfNotExists({
            creator: {
                type: CreatorType.System
            },
            isDefault: false,
            name: 'group1'
        })

        await expect(middlewareGroupService.addMiddleware('group1', 'middleware1')).resolves.toBeUndefined()

        await expect(middlewareGroupMiddlewareRepository.count()).resolves.toBe(1)
        await expect(metadataRepository.count()).resolves.toBe(2)
        await expect(middlewareGroupService.isExists('group1')).resolves.toBe(true)

        await expect(middlewareGroupService.remove('group1')).resolves.toBeUndefined()
        await expect(middlewareGroupService.remove('group1')).resolves.toBeUndefined()

        await expect(middlewareGroupMiddlewareRepository.count()).resolves.toBe(0)
        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect(middlewareGroupService.isExists('group1')).resolves.toBe(false)

        container.restore()
    })

    it(`
        Попытка включить/выключить csrf в несуществующей группе middleware приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareGroupService = container
            .get<IMiddlewareGroupService>(ROUTE_SYMBOL.MiddlewareGroupService)

        await expect(middlewareGroupService.enableCsrf('group1')).rejects.toBeInstanceOf(MiddlewareGroupDoesNotExists)
        await expect(middlewareGroupService.disableCsrf('group1')).rejects.toBeInstanceOf(MiddlewareGroupDoesNotExists)
            
        container.restore()
    })

    it(`
        Включение/выключение csrf в указанной группе middleware происходит корректно. Повторное включение/выключение
        уже включённого/выключенного csrf ни к чему не приводит
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareGroupService = container
            .get<IMiddlewareGroupService>(ROUTE_SYMBOL.MiddlewareGroupService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)

        await expect(middlewareGroupService.createIfNotExists({
            creator: {
                type: CreatorType.System
            },
            isDefault: false,
            name: 'group1'
        })).resolves.toBeUndefined()

        await expect(middlewareGroupRepository.findOne({
            where: {
                name: 'group1'
            }
        })).resolves.toMatchObject({
            isCsrf: false
        })

        await expect(middlewareGroupService.enableCsrf('group1')).resolves.toBeUndefined()
        await expect(middlewareGroupService.enableCsrf('group1')).resolves.toBeUndefined()

        await expect(middlewareGroupRepository.findOne({
            where: {
                name: 'group1'
            }
        })).resolves.toMatchObject({
            isCsrf: true
        })

        await expect(middlewareGroupService.disableCsrf('group1')).resolves.toBeUndefined()
        await expect(middlewareGroupService.disableCsrf('group1')).resolves.toBeUndefined()

        await expect(middlewareGroupRepository.findOne({
            where: {
                name: 'group1'
            }
        })).resolves.toMatchObject({
            isCsrf: false
        })

        container.restore()
    })

})