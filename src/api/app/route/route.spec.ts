import { getContainer } from '../../../inversify.config'
import {
    Route,
    Middleware,
    MiddlewareGroup,
    RouteMiddleware,
    RouteMiddlewareGroup,
    Controller
} from '../entities/route.entity'
import { Method } from '../entities/method.entity'
import { Metadata } from '../entities/metadata.entity'
import { Connection } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { IRouteService } from './route.interface'
import { ROUTE_SYMBOL, RouteEventMutation } from './route.types'
import { CreatorType, CREATOR_SYMBOL, ResourceType } from '../creator/creator.types'
import { ICreatorService } from '../creator/creator.interface'
import {
    RoutePathAndMethodAlreadyExists,
    RouteDoesNotExists,
    RouteDoesNotHaveMiddlewareGroup,
    RouteDoesNotHaveMiddleware,
    RouteAlreadyExists,
    MiddlewareGroupAlreadyBound,
    MiddlewareAlreadyBound
} from './route.errors'
import { MiddlewareGroupDoesNotExists } from './middleware-group/middleware-group.errors'
import { MiddlewareDoesNotExists } from './middleware/middleware.errors'
import { type } from '../../../utils/type'
import { RevisionNumberError } from '../metadata/metadata.errors'
import { ControllerDoesNotExists } from './controller/controller.errors'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

it(`
    Маршрут корректно создаётся. Попытка создания уже существующего маршрута приводит к
    исключению
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)
    const creatorService = container
        .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
    const connection = await container
        .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
    const metadataRepository = connection.getRepository(Metadata)
    const routeRepository = connection.getRepository(Route)

    const route = {
        namespace: 'route1',
        name: 'route1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)

    const metadataEntityCount = await metadataRepository.count()
    await expect(routeService.isExists(route)).resolves.toBe(false)

    await expect(routeService.create({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/uniq1',
        ...route
    })).resolves.toBeUndefined()
    await expect(routeService.create({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/uniq1',
        ...route
    })).rejects.toBeInstanceOf(RouteAlreadyExists)

    await expect(routeService.isExists(route)).resolves.toBe(true)
    await expect(metadataRepository.count()).resolves.toBe(metadataEntityCount + 1)

    await expect(creatorService.isResourceCreator({
        type: ResourceType.Route,
        id: await routeRepository.findOne({
            where: route
        }).then(routeEntity => {
            return type<Route>(routeEntity).id
        })
    }, {
        type: CreatorType.System
    })).resolves.toBe(true)

    expect(eventMutationFn).toBeCalledTimes(1)
    expect(eventMutationFn).nthCalledWith(1, expect.objectContaining({
        type: RouteEventMutation.Create,
        routeId: 1
    }))

    container.restore()
})

it(`
    Попытка создать маршрут с уникальным именем, но с уже существующей связкой пути и метода
    приводит к исключению
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)

    const route = {
        namespace: 'route1',
        name: 'route1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)

    await expect(routeService.create({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        ...route
    })).resolves.toBeUndefined()

    await expect(routeService.create({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        ...route,
        name: 'route2'
    })).rejects.toBeInstanceOf(RoutePathAndMethodAlreadyExists)

    expect(eventMutationFn).toBeCalledTimes(1)

    container.restore()
})

it(`
    Попытка установить метаданные в несуществующий маршрут приводит к исключению
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)

    const route = {
        namespace: 'route1',
        name: 'route1'
    }

    await expect(routeService.setMetadata(route, {
        metadata: {
            custom: null
        },
        revisionNumber: 0
    })).rejects.toBeInstanceOf(RouteDoesNotExists)

    expect(eventMutationFn).toBeCalledTimes(0)

    container.restore()
})

it(`
    Метаданные корректно устанавливаются в маршрут и читаются из него. Попытка установить 
    метаданные несоответствующей редакции приводит к исключению
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)
    const connection = await container
        .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
    const routeRepository = connection.getRepository(Route)
    const metadataRepository = connection.getRepository(Metadata)

    const route = {
        namespace: 'route1',
        name: 'route1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)

    await expect(routeService.create({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        ...route
    })).resolves.toBeUndefined()
    await expect(metadataRepository.count()).resolves.toBe(1)
    await expect(routeRepository.findOne({
        where: route
    }).then(routeEntity => {
        return type<Route>(routeEntity).metadata
    })).resolves.toMatchObject({
        metadata: {
            custom: null
        },
        revisionNumber: 0
    })
    await expect(routeService.setMetadata(route, {
        metadata: {
            custom: {
                test: 'test'
            }
        },
        revisionNumber: 0
    })).resolves.toBeUndefined()
    await expect(routeRepository.findOne({
        where: route
    }).then(routeEntity => {
        return type<Route>(routeEntity).metadata
    })).resolves.toMatchObject({
        metadata: {
            custom: {
                test: 'test'
            }
        },
        revisionNumber: 1
    })
    await expect(routeService.setMetadata(route, {
        metadata: {
            custom: null
        },
        revisionNumber: 0
    })).rejects.toBeInstanceOf(RevisionNumberError)
    await expect(routeRepository.findOne({
        where: route
    }).then(routeEntity => {
        return type<Route>(routeEntity).metadata
    })).resolves.toMatchObject({
        metadata: {
            custom: {
                test: 'test'
            }
        },
        revisionNumber: 1
    })
    await expect(metadataRepository.count()).resolves.toBe(1)

    expect(eventMutationFn).toBeCalledTimes(2)
    expect(eventMutationFn).nthCalledWith(2, expect.objectContaining({
        type: RouteEventMutation.SetMetadata,
        routeId: 1
    }))

    container.restore()
})

it(`
    Попытка добавить несуществующую группу middleware в существующий маршрут приводит к исключению.
    Также точно и с удалением группы из маршрута
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)

    const route = {
        namespace: 'route1',
        name: 'route1'
    }
    const middlewareGroup = {
        namespace: 'group1',
        name: 'group1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)
    
    await routeService.create({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        ...route
    })

    await expect(routeService.addMiddlewareGroup(route, middlewareGroup)).rejects.toBeInstanceOf(MiddlewareGroupDoesNotExists)
    await expect(routeService.removeMiddlewareGroup(route, middlewareGroup)).rejects.toBeInstanceOf(MiddlewareGroupDoesNotExists)

    expect(eventMutationFn).toBeCalledTimes(1)

    container.restore()
})

it(`
    Попытка добавить существующую группу middleware в несуществующий маршрут приводит к исключению. Также
    точно и с удалением группы из маршрута
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)
    const connection = await container
        .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
    const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)

    const route = {
        namespace: 'route1',
        name: 'route1'
    }
    const middlewareGroup = {
        namespace: 'group1',
        name: 'group1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)

    await middlewareGroupRepository.save({
        isCsrf: false,
        isDefault: false,
        metadata: {
            metadata: {
                custom: null
            }
        },
        ...middlewareGroup
    })

    await expect(routeService.addMiddlewareGroup(route, middlewareGroup)).rejects.toBeInstanceOf(RouteDoesNotExists)
    await expect(routeService.removeMiddlewareGroup(route, middlewareGroup)).rejects.toBeInstanceOf(RouteDoesNotExists)

    expect(eventMutationFn).toBeCalledTimes(0)

    container.restore()
})

it(`
    Новая группа middleware корректно добавляется в маршрут. Попытка добавить уже
    добавленную в маршрут группу приводит к исключению
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)
    const connection = await container
        .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
    const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)
    const routeMiddlewareGroupRepository = connection.getRepository(RouteMiddlewareGroup)

    const route = {
        namespace: 'route1',
        name: 'route1'
    }
    const middlewareGroup = {
        namespace: 'group1',
        name: 'group1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)

    await middlewareGroupRepository.save({
        isCsrf: false,
        isDefault: false,
        metadata: {
            metadata: {
                custom: null
            }
        },
        ...middlewareGroup
    })

    await routeService.create({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        ...route
    })

    await expect(routeMiddlewareGroupRepository.count()).resolves.toBe(0)
    await expect(routeService.addMiddlewareGroup(route, middlewareGroup)).resolves.toBeUndefined()
    await expect(routeService.addMiddlewareGroup(route, middlewareGroup)).rejects.toBeInstanceOf(MiddlewareGroupAlreadyBound)
    await expect(routeMiddlewareGroupRepository.count()).resolves.toBe(1)

    expect(eventMutationFn).toBeCalledTimes(2)
    expect(eventMutationFn).nthCalledWith(2, expect.objectContaining({
        type: RouteEventMutation.AddMiddlewareGroup,
        routeId: 1,
        middlewareGroupId: 1
    }))

    container.restore()
})

it(`
    Удаление группы middleware из машрута происходит корректно. Попытка удалить из машрута
    не добавленную в него группу middleware ни к чему не приводит
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)
    const connection = await container
        .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
    const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)
    const routeMiddlewareGroupRepository = connection.getRepository(RouteMiddlewareGroup)

    const route = {
        namespace: 'route1',
        name: 'route1'
    }
    const middlewareGroup = {
        namespace: 'group1',
        name: 'group1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)

    await middlewareGroupRepository.save({
        isCsrf: false,
        isDefault: false,
        metadata: {
            metadata: {
                custom: null
            }
        },
        ...middlewareGroup
    })

    await routeService.create({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        ...route
    })

    await expect(routeService.addMiddlewareGroup(route, middlewareGroup)).resolves.toBeUndefined()
    await expect(routeMiddlewareGroupRepository.count()).resolves.toBe(1)
    await expect(routeService.removeMiddlewareGroup(route, middlewareGroup)).resolves.toBeUndefined()
    await expect(routeService.removeMiddlewareGroup(route, middlewareGroup)).resolves.toBeUndefined()
    await expect(routeMiddlewareGroupRepository.count()).resolves.toBe(0)

    expect(eventMutationFn).toBeCalledTimes(3)
    expect(eventMutationFn).nthCalledWith(3, expect.objectContaining({
        type: RouteEventMutation.RemoveMiddlewareGroup,
        routeId: 1,
        middlewareGroupId: 1
    }))

    container.restore()
})

describe(`
    Попытка изменить порядковый номер группы middleware в указанном маршруте завершается исключением,
    если:
`, () => {

    beforeAll(async () => {
        const container = await getContainer()
        container.snapshot()

        const routeService = container
            .get<IRouteService>(ROUTE_SYMBOL.RouteService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)

        const route = {
            namespace: 'route1',
            name: 'route1'
        }
        const middlewareGroup = {
            namespace: 'group1',
            name: 'group1'
        }

        await middlewareGroupRepository.save({
            isCsrf: false,
            isDefault: false,
            metadata: {
                metadata: {
                    custom: null
                }
            },
            ...middlewareGroup
        })

        await routeService.create({
            creator: {
                type: CreatorType.System
            },
            method: 'POST',
            path: '/',
            ...route
        })
    })

    afterAll(async () => {
        const container = await getContainer()
        container.restore()
    })

    it(`
        1. Указан несуществующий маршрут
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const routeService = container
            .get<IRouteService>(ROUTE_SYMBOL.RouteService)

        const middlewareGroup = {
            namespace: 'group1',
            name: 'group1'
        }

        const eventMutationFn = jest.fn()
        routeService.onMutation(eventMutationFn)

        await expect(routeService.setMiddlewareGroupSerialNumber({
            namespace: 'empty',
            name: 'empty'
        }, middlewareGroup, 1))
            .rejects
            .toBeInstanceOf(RouteDoesNotExists)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })

    it(`
        2. Указан несуществующая группа middleware
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const routeService = container
            .get<IRouteService>(ROUTE_SYMBOL.RouteService)

        const route = {
            namespace: 'route1',
            name: 'route1'
        }

        const eventMutationFn = jest.fn()
        routeService.onMutation(eventMutationFn)

        await expect(routeService.setMiddlewareGroupSerialNumber(route, {
            namespace: 'empty',
            name: 'empty'
        }, 1)).rejects.toBeInstanceOf(MiddlewareGroupDoesNotExists)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })

    it(`
        3. Указанный маршрут не имеет никаких связей с указанной группой middleware
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const routeService = container
            .get<IRouteService>(ROUTE_SYMBOL.RouteService)

        const route = {
            namespace: 'route1',
            name: 'route1'
        }
        const middlewareGroup = {
            namespace: 'group1',
            name: 'group1'
        }

        const eventMutationFn = jest.fn()
        routeService.onMutation(eventMutationFn)

        await expect(routeService.setMiddlewareGroupSerialNumber(route, middlewareGroup, 1))
            .rejects
            .toBeInstanceOf(RouteDoesNotHaveMiddlewareGroup)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })

})

it(`
    Порядковый номер указанной группы middleware в указанном маршруте корректно изменяется. По умолчанию
    порядковый номер имеет значение null
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)
    const connection = await container
        .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
    const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)
    const routeMiddlewareGroupRepository = connection.getRepository(RouteMiddlewareGroup)

    const route = {
        namespace: 'route1',
        name: 'route1'
    }
    const middlewareGroup = {
        namespace: 'group1',
        name: 'group1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)

    await middlewareGroupRepository.save({
        isCsrf: false,
        isDefault: false,
        metadata: {
            metadata: {
                custom: null
            }
        },
        ...middlewareGroup
    })

    await routeService.create({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        ...route
    })

    await expect(routeService.addMiddlewareGroup(route, middlewareGroup)).resolves.toBeUndefined()
    await expect(routeMiddlewareGroupRepository.findOne({
        where: {
            routeId: 1,
            middlewareGroupId: 1
        }
    })).resolves.toMatchObject({
        serialNumber: null
    })
    await expect(routeService.setMiddlewareGroupSerialNumber(route, middlewareGroup, 1)).resolves.toBeUndefined()
    await expect(routeMiddlewareGroupRepository.findOne({
        where: {
            routeId: 1,
            middlewareGroupId: 1
        }
    })).resolves.toMatchObject({
        serialNumber: 1
    })

    expect(eventMutationFn).toBeCalledTimes(3)
    expect(eventMutationFn).nthCalledWith(3, expect.objectContaining({
        type: RouteEventMutation.SetMiddlewareGroupSerialNumber,
        routeId: 1,
        middlewareGroupId: 1
    }))

    container.restore()
})

it(`
    Попытка добавить несуществующий middleware в существующий маршрут приводит к исключению. Также 
    точно и с удалением middleware из маршрута
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)

    const route = {
        namespace: 'route1',
        name: 'route1'
    }
    const middleware = {
        namespace: 'middleware1',
        name: 'middleware1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)
    
    await routeService.create({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        ...route
    })

    await expect(routeService.addMiddleware(route, middleware)).rejects.toBeInstanceOf(MiddlewareDoesNotExists)
    await expect(routeService.removeMiddleware(route, middleware)).rejects.toBeInstanceOf(MiddlewareDoesNotExists)

    expect(eventMutationFn).toBeCalledTimes(1)

    container.restore()
})

it(`
    Попытка добавить существующий middleware в несуществующий маршрут приводит к исключению. Также
    точно и с удалением middleware из маршрута
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)
    const connection = await container
        .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
    const methodRepository = connection.getRepository(Method)
    const middlewareRepository = connection.getRepository(Middleware)

    const route = {
        namespace: 'route1',
        name: 'route1'
    }
    const middleware = {
        namespace: 'middleware1',
        name: 'middleware1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)

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
        ...middleware
    })

    await expect(routeService.addMiddleware(route, middleware)).rejects.toBeInstanceOf(RouteDoesNotExists)
    await expect(routeService.removeMiddleware(route, middleware)).rejects.toBeInstanceOf(RouteDoesNotExists)

    expect(eventMutationFn).toBeCalledTimes(0)

    container.restore()
})

it(`
    Новый middleware корректно добавляется в маршрут. Попытка добавить уже
    добавленный в маршрут middleware приводит к исключению
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)
    const connection = await container
        .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
    const methodRepository = connection.getRepository(Method)
    const middlewareRepository = connection.getRepository(Middleware)
    const routeMiddlewareRepository = connection.getRepository(RouteMiddleware)

    const route = {
        namespace: 'route1',
        name: 'route1'
    }
    const middleware = {
        namespace: 'middleware1',
        name: 'middleware1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)

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
        ...middleware
    })

    await routeService.create({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        ...route
    })

    await expect(routeMiddlewareRepository.count()).resolves.toBe(0)
    await expect(routeService.addMiddleware(route, middleware)).resolves.toBeUndefined()
    await expect(routeService.addMiddleware(route, middleware)).rejects.toBeInstanceOf(MiddlewareAlreadyBound)
    await expect(routeMiddlewareRepository.count()).resolves.toBe(1)

    expect(eventMutationFn).toBeCalledTimes(2)
    expect(eventMutationFn).nthCalledWith(2, expect.objectContaining({
        type: RouteEventMutation.AddMiddleware,
        routeId: 1,
        middlewareId: 1
    }))

    container.restore()
})

it(`
    Удаление middleware из машрута происходит корректно. Попытка удалить из машрута
    не добавленный в него middleware ни к чему не приводит
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)
    const connection = await container
        .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
    const methodRepository = connection.getRepository(Method)
    const middlewareRepository = connection.getRepository(Middleware)
    const routeMiddlewareRepository = connection.getRepository(RouteMiddleware)

    const route = {
        namespace: 'route1',
        name: 'route1'
    }
    const middleware = {
        namespace: 'middleware1',
        name: 'middleware1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)

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
        ...middleware
    })

    await routeService.create({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        ...route
    })

    await expect(routeService.addMiddleware(route, middleware)).resolves.toBeUndefined()
    await expect(routeMiddlewareRepository.count()).resolves.toBe(1)
    await expect(routeService.removeMiddleware(route, middleware)).resolves.toBeUndefined()
    await expect(routeService.removeMiddleware(route, middleware)).resolves.toBeUndefined()
    await expect(routeMiddlewareRepository.count()).resolves.toBe(0)

    expect(eventMutationFn).toBeCalledTimes(3)
    expect(eventMutationFn).nthCalledWith(3, expect.objectContaining({
        type: RouteEventMutation.RemoveMiddleware,
        routeId: 1,
        middlewareId: 1
    }))

    container.restore()
})

describe(`
    Попытка изменить порядковый номер middleware в указанном маршруте завершается исключением,
    если:
`, () => {

    beforeAll(async () => {
        const container = await getContainer()
        container.snapshot()

        const routeService = container
            .get<IRouteService>(ROUTE_SYMBOL.RouteService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const middlewareRepository = connection.getRepository(Middleware)

        const route = {
            namespace: 'route1',
            name: 'route1'
        }
        const middleware = {
            namespace: 'middleware1',
            name: 'middleware1'
        }

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
            ...middleware
        })
    
        await routeService.create({
            creator: {
                type: CreatorType.System
            },
            method: 'POST',
            path: '/',
            ...route
        })
    })

    afterAll(async () => {
        const container = await getContainer()
        container.restore()
    })

    it(`
        1. Указан несуществующий маршрут
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const routeService = container
            .get<IRouteService>(ROUTE_SYMBOL.RouteService)

        const middleware = {
            namespace: 'middleware1',
            name: 'middleware1'
        }

        const eventMutationFn = jest.fn()
        routeService.onMutation(eventMutationFn)

        await expect(routeService.setMiddlewareSerialNumber({
            namespace: 'empty',
            name: 'empty'
        }, middleware, 1)).rejects.toBeInstanceOf(RouteDoesNotExists)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })

    it(`
        2. Указан несуществующий middleware
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const routeService = container
            .get<IRouteService>(ROUTE_SYMBOL.RouteService)

        const route = {
            namespace: 'route1',
            name: 'route1'
        }

        const eventMutationFn = jest.fn()
        routeService.onMutation(eventMutationFn)

        await expect(routeService.setMiddlewareSerialNumber(route, {
            namespace: 'empty',
            name: 'empty'
        }, 1)).rejects.toBeInstanceOf(MiddlewareDoesNotExists)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })

    it(`
        3. Указанный маршрут не имеет никаких связей с указанным middleware
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const routeService = container
            .get<IRouteService>(ROUTE_SYMBOL.RouteService)

        const route = {
            namespace: 'route1',
            name: 'route1'
        }
        const middleware = {
            namespace: 'middleware1',
            name: 'middleware1'
        }

        const eventMutationFn = jest.fn()
        routeService.onMutation(eventMutationFn)

        await expect(routeService.setMiddlewareSerialNumber(route, middleware, 1))
            .rejects
            .toBeInstanceOf(RouteDoesNotHaveMiddleware)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })

})

it(`
    Порядковый номер указанного middleware в указанном маршруте корректно изменяется. По умолчанию
    порядковый номер имеет значение null
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)
    const connection = await container
        .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
    const routeMiddlewareRepository = connection.getRepository(RouteMiddleware)
    const methodRepository = connection.getRepository(Method)
    const middlewareRepository = connection.getRepository(Middleware)

    const route = {
        namespace: 'route1',
        name: 'route1'
    }
    const middleware = {
        namespace: 'middleware1',
        name: 'middleware1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)

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
        ...middleware
    })

    await routeService.create({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        ...route
    })

    await expect(routeService.addMiddleware(route, middleware)).resolves.toBeUndefined()
    await expect(routeMiddlewareRepository.findOne({
        where: {
            routeId: 1,
            middlewareId: 1
        }
    })).resolves.toMatchObject({
        serialNumber: null
    })
    await expect(routeService.setMiddlewareSerialNumber(route, middleware, 1)).resolves.toBeUndefined()
    await expect(routeMiddlewareRepository.findOne({
        where: {
            routeId: 1,
            middlewareId: 1
        }
    })).resolves.toMatchObject({
        serialNumber: 1
    })

    expect(eventMutationFn).toBeCalledTimes(3)
    expect(eventMutationFn).nthCalledWith(3, expect.objectContaining({
        type: RouteEventMutation.SetMiddlewareSerialNumber,
        routeId: 1,
        middlewareId: 1
    }))

    container.restore()
})

it(`
    Попытка включить/выключить csrf в несуществующем маршурте приводит к исключению
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)

    const route = {
        namespace: 'route1',
        name: 'route1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)

    await expect(routeService.enableCsrf(route)).rejects.toBeInstanceOf(RouteDoesNotExists)
    await expect(routeService.disableCsrf(route)).rejects.toBeInstanceOf(RouteDoesNotExists)

    expect(eventMutationFn).toBeCalledTimes(0)
        
    container.restore()
})

it(`
    Включение/выключение csrf в указанном маршруте происходит корректно. Повторное включение/выключение
    уже включённого/выключенного csrf ни к чему не приводит
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)
    const connection = await container
        .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
    const routeRepository = connection.getRepository(Route)

    const route = {
        namespace: 'route1',
        name: 'route1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)

    await expect(routeService.create({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        ...route
    })).resolves.toBeUndefined()

    await expect(routeRepository.findOne({
        where: route
    })).resolves.toMatchObject({
        isCsrf: false
    })

    await expect(routeService.enableCsrf(route)).resolves.toBeUndefined()
    await expect(routeService.enableCsrf(route)).resolves.toBeUndefined()

    await expect(routeRepository.findOne({
        where: route
    })).resolves.toMatchObject({
        isCsrf: true
    })

    await expect(routeService.disableCsrf(route)).resolves.toBeUndefined()
    await expect(routeService.disableCsrf(route)).resolves.toBeUndefined()

    await expect(routeRepository.findOne({
        where: route
    })).resolves.toMatchObject({
        isCsrf: false
    })

    expect(eventMutationFn).toBeCalledTimes(5)
    const eventContextEnableCsrf = {
        type: RouteEventMutation.EnableCsrf,
        routeId: 1
    }
    expect(eventMutationFn).nthCalledWith(2, expect.objectContaining(eventContextEnableCsrf))
    expect(eventMutationFn).nthCalledWith(3, expect.objectContaining(eventContextEnableCsrf))
    const eventContextDisableCsrf = {
        type: RouteEventMutation.DisableCsrf,
        routeId: 1
    }
    expect(eventMutationFn).nthCalledWith(4, expect.objectContaining(eventContextDisableCsrf))
    expect(eventMutationFn).nthCalledWith(5, expect.objectContaining(eventContextDisableCsrf))

    container.restore()
})

it(`
    Маршрут корректно удаляется вместе с его метаданными. Связи машрута с отдельными middleware и
    группами middleware удаляются автоматически. Попытка удалить несуществующий маршрут 
    ни к чему не приводит
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)
    const connection = await container
        .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
    const methodRepository = connection.getRepository(Method)
    const middlewareRepository = connection.getRepository(Middleware)
    const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)
    const routeMiddlewareRepository = connection.getRepository(RouteMiddleware)
    const routeMiddlewareGroupRepository = connection.getRepository(RouteMiddlewareGroup)
    const metadataRepository = connection.getRepository(Metadata)

    const route = {
        namespace: 'route1',
        name: 'route1'
    }
    const middleware = {
        namespace: 'middleware1',
        name: 'middleware1'
    }
    const middlewareGroup = {
        namespace: 'group1',
        name: 'group1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)

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
        ...middleware
    })
    await middlewareGroupRepository.save({
        isCsrf: false,
        isDefault: false,
        metadata: {
            metadata: {
                custom: null
            }
        },
        ...middlewareGroup
    })
    await routeService.create({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        ...route
    })

    await expect(routeService.addMiddleware(route, middleware)).resolves.toBeUndefined()
    await expect(routeService.addMiddlewareGroup(route, middlewareGroup)).resolves.toBeUndefined()

    await expect(routeMiddlewareRepository.count()).resolves.toBe(1)
    await expect(routeMiddlewareGroupRepository.count()).resolves.toBe(1)
    await expect(metadataRepository.count()).resolves.toBe(3)
    await expect(routeService.isExists(route)).resolves.toBe(true)

    await expect(routeService.remove(route)).resolves.toBeUndefined()
    await expect(routeService.remove(route)).resolves.toBeUndefined()

    await expect(routeMiddlewareRepository.count()).resolves.toBe(0)
    await expect(routeMiddlewareGroupRepository.count()).resolves.toBe(0)
    await expect(metadataRepository.count()).resolves.toBe(2)
    await expect(routeService.isExists(route)).resolves.toBe(false)

    expect(eventMutationFn).toBeCalledTimes(4)
    expect(eventMutationFn).nthCalledWith(4, expect.objectContaining({
        type: RouteEventMutation.Remove,
        routeId: 1
    }))

    container.restore()
})

it(`
    Попытка привязать в несуществующий маршрут существующий контроллер приводит к исключению. То же
    исключение и при попытке отвязать контроллер от несуществующего маршрута
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)
    const connection = await container
        .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
    const controllerRepository = connection.getRepository(Controller)
    const methodRepository = connection.getRepository(Method)

    const controller = {
        namespace: 'controller1',
        name: 'controller1',
        metadata: {
            metadata: {
                custom: null
            }
        },
        method: {
            type: 'method1',
            namespace: 'method1',
            name: 'method1'
        }
    }
    const route = {
        namespace: 'route1',
        name: 'route1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)

    await methodRepository.save(controller.method)
    await controllerRepository.save(controller)

    await expect(routeService.bindController(route, controller)).rejects.toBeInstanceOf(RouteDoesNotExists)
    await expect(routeService.unbindController(route)).rejects.toBeInstanceOf(RouteDoesNotExists)

    expect(eventMutationFn).toBeCalledTimes(0)

    container.restore()
})

it(`
    Попытка привязать в существующий маршрут несуществующий контроллер приводит к исключению
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)

    const controller = {
        namespace: 'controller1',
        name: 'controller1'
    }
    const route = {
        namespace: 'route1',
        name: 'route1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)

    await routeService.create({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        ...route
    })

    await expect(routeService.bindController(route, controller)).rejects.toBeInstanceOf(ControllerDoesNotExists)

    expect(eventMutationFn).toBeCalledTimes(1)

    container.restore()
})

it(`
    Контроллер корректно привязывается к маршруту и отвязывается от него
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)
    const connection = await container
        .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
    const controllerRepository = connection.getRepository(Controller)
    const methodRepository = connection.getRepository(Method)
    const routeRepository = connection.getRepository(Route)

    const controller = {
        namespace: 'controller1',
        name: 'controller1',
        metadata: {
            metadata: {
                custom: null
            }
        },
        method: {
            type: 'method1',
            namespace: 'method1',
            name: 'method1'
        }
    }
    const route = {
        namespace: 'route1',
        name: 'route1'
    }

    const eventMutationFn = jest.fn()
    routeService.onMutation(eventMutationFn)

    await methodRepository.save(controller.method)
    await controllerRepository.save(controller)
    await routeService.create({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        ...route
    })

    await expect(routeRepository.findOne({ where: route, relations: ['controller'] })).resolves.toMatchObject({
        controller: null
    })
    await expect(routeService.bindController(route, controller)).resolves.toBeUndefined()
    await expect(routeRepository.findOne({ where: route, relations: ['controller']})).resolves.toMatchObject({
        controller: {
            namespace: controller.namespace,
            name: controller.name
        }
    })
    await expect(routeService.unbindController(route)).resolves.toBeUndefined()
    await expect(routeRepository.findOne({ where: route, relations: ['controller'] })).resolves.toMatchObject({
        controller: null
    })

    expect(eventMutationFn).toBeCalledTimes(3)
    expect(eventMutationFn).nthCalledWith(2, expect.objectContaining({
        type: RouteEventMutation.BindController,
        routeId: 1,
        controllerId: 1
    }))
    expect(eventMutationFn).nthCalledWith(3, expect.objectContaining({
        type: RouteEventMutation.UnbindController,
        routeId: 1
    }))

    container.restore()
})