import { getContainer } from '../../../inversify.config'
import {
    Route,
    Middleware,
    MiddlewareGroup,
    RouteMiddleware,
    RouteMiddlewareGroup
} from '../entities/route.entity'
import { Method } from '../entities/method.entity'
import { Metadata } from '../entities/metadata.entity'
import { Connection } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { IRouteService } from './route.interface'
import { ROUTE_SYMBOL } from './route.types'
import { CreatorType, CREATOR_SYMBOL, ResourceType } from '../creator/creator.types'
import { ICreatorService } from '../creator/creator.interface'
import {
    RoutePathAndMethodAlreadyExists,
    RouteDoesNotExists,
    RouteDoesNotHaveMiddlewareGroup,
    RouteDoesNotHaveMiddleware
} from './route.errors'
import { MiddlewareGroupDoesNotExists } from './middleware-group/middleware-group.errors'
import { MiddlewareDoesNotExists } from './middleware/middleware.errors'
import { type } from '../../../utils/type'
import { RevisionNumberError } from '../metadata/metadata.errors'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

it(`
    Маршрут корректно создаётся. Попытка создания уже существующего маршрута ни к чему
    не приводит
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

    const metadataEntityCount = await metadataRepository.count()

    await expect(routeService.isExists('uniq1')).resolves.toBe(false)

    await expect(routeService.createIfNotExists({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        name: 'uniq1',
        path: '/uniq1'
    })).resolves.toBeUndefined()
    await expect(routeService.createIfNotExists({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        name: 'uniq1',
        path: '/uniq1'
    })).resolves.toBeUndefined()

    await expect(routeService.isExists('uniq1')).resolves.toBe(true)
    await expect(metadataRepository.count()).resolves.toBe(metadataEntityCount + 1)

    await expect(creatorService.isResourceCreator({
        type: ResourceType.Route,
        id: await routeRepository.findOne({
            where: {
                name: 'uniq1'
            }
        }).then(routeEntity => {
            return type<Route>(routeEntity).id
        })
    }, {
        type: CreatorType.System
    })).resolves.toBe(true)

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

    await expect(routeService.createIfNotExists({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        name: 'route1'
    })).resolves.toBeUndefined()

    await expect(routeService.createIfNotExists({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        name: 'uniq1'
    })).rejects.toBeInstanceOf(RoutePathAndMethodAlreadyExists)

    container.restore()
})

it(`
    Попытка установить метаданные в несуществующий маршрут приводит к исключению
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)

    await expect(routeService.setMetadata('uniq1', {
        metadata: {
            custom: null
        },
        revisionNumber: 0
    })).rejects.toBeInstanceOf(RouteDoesNotExists)

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

    await expect(routeService.createIfNotExists({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        name: 'route1'
    })).resolves.toBeUndefined()
    await expect(metadataRepository.count()).resolves.toBe(1)
    await expect(routeRepository.findOne({
        where: {
            name: 'route1'
        }
    }).then(routeEntity => {
        return type<Route>(routeEntity).metadata
    })).resolves.toMatchObject({
        metadata: {
            custom: null
        },
        revisionNumber: 0
    })
    await expect(routeService.setMetadata('route1', {
        metadata: {
            custom: {
                test: 'test'
            }
        },
        revisionNumber: 0
    })).resolves.toBeUndefined()
    await expect(routeRepository.findOne({
        where: {
            name: 'route1'
        }
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
    await expect(routeService.setMetadata('route1', {
        metadata: {
            custom: null
        },
        revisionNumber: 0
    })).rejects.toBeInstanceOf(RevisionNumberError)
    await expect(routeRepository.findOne({
        where: {
            name: 'route1'
        }
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
    
    await routeService.createIfNotExists({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        name: 'route1'
    })

    await expect(routeService.addMiddlewareGroup('route1', 'empty')).rejects.toBeInstanceOf(MiddlewareGroupDoesNotExists)
    await expect(routeService.removeMiddlewareGroup('route1', 'empty')).rejects.toBeInstanceOf(MiddlewareGroupDoesNotExists)

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

    await middlewareGroupRepository.save({
        isCsrf: false,
        isDefault: false,
        metadata: {
            metadata: {
                custom: null
            }
        },
        name: 'group1'
    })

    await expect(routeService.addMiddlewareGroup('empty', 'group1')).rejects.toBeInstanceOf(RouteDoesNotExists)
    await expect(routeService.removeMiddlewareGroup('empty', 'group1')).rejects.toBeInstanceOf(RouteDoesNotExists)

    container.restore()
})

it(`
    Новая группа middleware корректно добавляется в маршрут. Попытка добавить уже
    добавленную в маршрут группу ни к чему не приводит
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)
    const connection = await container
        .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
    const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)
    const routeMiddlewareGroupRepository = connection.getRepository(RouteMiddlewareGroup)

    await middlewareGroupRepository.save({
        isCsrf: false,
        isDefault: false,
        metadata: {
            metadata: {
                custom: null
            }
        },
        name: 'group1'
    })

    await routeService.createIfNotExists({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        name: 'route1'
    })

    await expect(routeMiddlewareGroupRepository.count()).resolves.toBe(0)
    await expect(routeService.addMiddlewareGroup('route1', 'group1')).resolves.toBeUndefined()
    await expect(routeService.addMiddlewareGroup('route1', 'group1')).resolves.toBeUndefined()
    await expect(routeMiddlewareGroupRepository.count()).resolves.toBe(1)

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

    await middlewareGroupRepository.save({
        isCsrf: false,
        isDefault: false,
        metadata: {
            metadata: {
                custom: null
            }
        },
        name: 'group1'
    })

    await routeService.createIfNotExists({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        name: 'route1'
    })

    await expect(routeService.addMiddlewareGroup('route1', 'group1')).resolves.toBeUndefined()
    await expect(routeMiddlewareGroupRepository.count()).resolves.toBe(1)
    await expect(routeService.removeMiddlewareGroup('route1', 'group1')).resolves.toBeUndefined()
    await expect(routeService.removeMiddlewareGroup('route1', 'group1')).resolves.toBeUndefined()
    await expect(routeMiddlewareGroupRepository.count()).resolves.toBe(0)

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

        await middlewareGroupRepository.save({
            isCsrf: false,
            isDefault: false,
            metadata: {
                metadata: {
                    custom: null
                }
            },
            name: 'group1'
        })

        await routeService.createIfNotExists({
            creator: {
                type: CreatorType.System
            },
            method: 'POST',
            path: '/',
            name: 'route1'
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

        await expect(routeService.setMiddlewareGroupSerialNumber('empty', 'group1', 1))
            .rejects
            .toBeInstanceOf(RouteDoesNotExists)

        container.restore()
    })

    it(`
        2. Указан несуществующая группа middleware
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const routeService = container
            .get<IRouteService>(ROUTE_SYMBOL.RouteService)

        await expect(routeService.setMiddlewareGroupSerialNumber('route1', 'empty', 1))
            .rejects
            .toBeInstanceOf(MiddlewareGroupDoesNotExists)

        container.restore()
    })

    it(`
        3. Указанный маршрут не имеет никаких связей с указанной группой middleware
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const routeService = container
            .get<IRouteService>(ROUTE_SYMBOL.RouteService)

        await expect(routeService.setMiddlewareGroupSerialNumber('route1', 'group1', 1))
            .rejects
            .toBeInstanceOf(RouteDoesNotHaveMiddlewareGroup)

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

    await middlewareGroupRepository.save({
        isCsrf: false,
        isDefault: false,
        metadata: {
            metadata: {
                custom: null
            }
        },
        name: 'group1'
    })

    await routeService.createIfNotExists({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        name: 'route1'
    })

    await expect(routeService.addMiddlewareGroup('route1', 'group1')).resolves.toBeUndefined()
    await expect(routeMiddlewareGroupRepository.findOne({
        where: {
            routeId: 1,
            middlewareGroupId: 1
        }
    })).resolves.toMatchObject({
        serialNumber: null
    })
    await expect(routeService.setMiddlewareGroupSerialNumber('route1', 'group1', 1)).resolves.toBeUndefined()
    await expect(routeMiddlewareGroupRepository.findOne({
        where: {
            routeId: 1,
            middlewareGroupId: 1
        }
    })).resolves.toMatchObject({
        serialNumber: 1
    })

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
    
    await routeService.createIfNotExists({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        name: 'route1'
    })

    await expect(routeService.addMiddleware('route1', 'empty')).rejects.toBeInstanceOf(MiddlewareDoesNotExists)
    await expect(routeService.removeMiddleware('route1', 'empty')).rejects.toBeInstanceOf(MiddlewareDoesNotExists)

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

    await expect(routeService.addMiddleware('empty', 'middleware1')).rejects.toBeInstanceOf(RouteDoesNotExists)
    await expect(routeService.removeMiddleware('empty', 'middleware1')).rejects.toBeInstanceOf(RouteDoesNotExists)

    container.restore()
})

it(`
    Новый middleware корректно добавляется в маршрут. Попытка добавить уже
    добавленный в маршрут middleware ни к чему не приводит
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

    await routeService.createIfNotExists({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        name: 'route1'
    })

    await expect(routeMiddlewareRepository.count()).resolves.toBe(0)
    await expect(routeService.addMiddleware('route1', 'middleware1')).resolves.toBeUndefined()
    await expect(routeService.addMiddleware('route1', 'middleware1')).resolves.toBeUndefined()
    await expect(routeMiddlewareRepository.count()).resolves.toBe(1)

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

    await routeService.createIfNotExists({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        name: 'route1'
    })

    await expect(routeService.addMiddleware('route1', 'middleware1')).resolves.toBeUndefined()
    await expect(routeMiddlewareRepository.count()).resolves.toBe(1)
    await expect(routeService.removeMiddleware('route1', 'middleware1')).resolves.toBeUndefined()
    await expect(routeService.removeMiddleware('route1', 'middleware1')).resolves.toBeUndefined()
    await expect(routeMiddlewareRepository.count()).resolves.toBe(0)

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
    
        await routeService.createIfNotExists({
            creator: {
                type: CreatorType.System
            },
            method: 'POST',
            path: '/',
            name: 'route1'
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

        await expect(routeService.setMiddlewareSerialNumber('empty', 'middleware1', 1))
            .rejects
            .toBeInstanceOf(RouteDoesNotExists)

        container.restore()
    })

    it(`
        2. Указан несуществующий middleware
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const routeService = container
            .get<IRouteService>(ROUTE_SYMBOL.RouteService)

        await expect(routeService.setMiddlewareSerialNumber('route1', 'empty', 1))
            .rejects
            .toBeInstanceOf(MiddlewareDoesNotExists)

        container.restore()
    })

    it(`
        3. Указанный маршрут не имеет никаких связей с указанным middleware
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const routeService = container
            .get<IRouteService>(ROUTE_SYMBOL.RouteService)

        await expect(routeService.setMiddlewareSerialNumber('route1', 'middleware1', 1))
            .rejects
            .toBeInstanceOf(RouteDoesNotHaveMiddleware)

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

    await routeService.createIfNotExists({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        name: 'route1'
    })

    await expect(routeService.addMiddleware('route1', 'middleware1')).resolves.toBeUndefined()
    await expect(routeMiddlewareRepository.findOne({
        where: {
            routeId: 1,
            middlewareId: 1
        }
    })).resolves.toMatchObject({
        serialNumber: null
    })
    await expect(routeService.setMiddlewareSerialNumber('route1', 'middleware1', 1)).resolves.toBeUndefined()
    await expect(routeMiddlewareRepository.findOne({
        where: {
            routeId: 1,
            middlewareId: 1
        }
    })).resolves.toMatchObject({
        serialNumber: 1
    })

    container.restore()
})

it(`
    Попытка включить/выключить csrf в несуществующем маршурте приводит к исключению
`, async () => {
    const container = await getContainer()
    container.snapshot()

    const routeService = container
        .get<IRouteService>(ROUTE_SYMBOL.RouteService)

    await expect(routeService.enableCsrf('route1')).rejects.toBeInstanceOf(RouteDoesNotExists)
    await expect(routeService.disableCsrf('route1')).rejects.toBeInstanceOf(RouteDoesNotExists)
        
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

    await expect(routeService.createIfNotExists({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        name: 'route1'
    })).resolves.toBeUndefined()

    await expect(routeRepository.findOne({
        where: {
            name: 'route1'
        }
    })).resolves.toMatchObject({
        isCsrf: false
    })

    await expect(routeService.enableCsrf('route1')).resolves.toBeUndefined()
    await expect(routeService.enableCsrf('route1')).resolves.toBeUndefined()

    await expect(routeRepository.findOne({
        where: {
            name: 'route1'
        }
    })).resolves.toMatchObject({
        isCsrf: true
    })

    await expect(routeService.disableCsrf('route1')).resolves.toBeUndefined()
    await expect(routeService.disableCsrf('route1')).resolves.toBeUndefined()

    await expect(routeRepository.findOne({
        where: {
            name: 'route1'
        }
    })).resolves.toMatchObject({
        isCsrf: false
    })

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
    await middlewareGroupRepository.save({
        isCsrf: false,
        isDefault: false,
        metadata: {
            metadata: {
                custom: null
            }
        },
        name: 'group1'
    })
    await routeService.createIfNotExists({
        creator: {
            type: CreatorType.System
        },
        method: 'POST',
        path: '/',
        name: 'route1'
    })

    await expect(routeService.addMiddleware('route1', 'middleware1')).resolves.toBeUndefined()
    await expect(routeService.addMiddlewareGroup('route1', 'group1')).resolves.toBeUndefined()

    await expect(routeMiddlewareRepository.count()).resolves.toBe(1)
    await expect(routeMiddlewareGroupRepository.count()).resolves.toBe(1)
    await expect(metadataRepository.count()).resolves.toBe(3)
    await expect(routeService.isExists('route1')).resolves.toBe(true)

    await expect(routeService.remove('route1')).resolves.toBeUndefined()
    await expect(routeService.remove('route1')).resolves.toBeUndefined()

    await expect(routeMiddlewareRepository.count()).resolves.toBe(0)
    await expect(routeMiddlewareGroupRepository.count()).resolves.toBe(0)
    await expect(metadataRepository.count()).resolves.toBe(2)
    await expect(routeService.isExists('route1')).resolves.toBe(false)

    container.restore()
})