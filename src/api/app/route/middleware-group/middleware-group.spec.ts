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
    MiddlewareGroupDoesNotHaveMiddleware,
    MiddlewareGroupAlreadyExists,
    MiddlewareAlreadyBound
} from './middleware-group.errors'
import { RevisionNumberError } from '../../metadata/metadata.errors'
import { 
    MiddlewareGroup, 
    Middleware, 
    MiddlewareGroupMiddleware 
} from '../../entities/route.entity'
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
        приводит к исключению
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

        const middlewareGroup = {
            namespace: 'group1',
            name: 'group1'
        }

        await expect(middlewareGroupService.isExists(middlewareGroup)).resolves.toBe(false)
        await expect(metadataRepository.count()).resolves.toBe(0)

        await expect(middlewareGroupService.create({
            isDefault: false,
            creator: {
                type: CreatorType.System
            },
            ...middlewareGroup
        })).resolves.toBeUndefined()
        await expect(middlewareGroupService.create({
            isDefault: false,
            creator: {
                type: CreatorType.System
            },
            ...middlewareGroup
        })).rejects.toBeInstanceOf(MiddlewareGroupAlreadyExists)

        await expect(middlewareGroupService.isExists(middlewareGroup)).resolves.toBe(true)
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

        const middlewareGroup = {
            namespace: 'group1',
            name: 'group1'
        }

        await expect(middlewareGroupService.setMetadata(middlewareGroup, {
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

        const middlewareGroup = {
            namespace: 'group1',
            name: 'group1'
        }

        await expect(middlewareGroupService.create({
            creator: {
                type: CreatorType.System
            },
            isDefault: false,
            ...middlewareGroup
        })).resolves.toBeUndefined()
        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect((async () => {
            const middlewareGroupEntity = await middlewareGroupRepository.findOne({
                where: middlewareGroup
            })
            return middlewareGroupEntity?.metadata
        })()).resolves.toMatchObject({
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })
        await expect(middlewareGroupService.setMetadata(middlewareGroup, {
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 0
        })).resolves.toBeUndefined()
        await expect((async () => {
            const middlewareGroupEntity = await middlewareGroupRepository.findOne({
                where: middlewareGroup
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
        await expect(middlewareGroupService.setMetadata(middlewareGroup, {
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(RevisionNumberError)
        await expect((async () => {
            const middlewareGroupEntity = await middlewareGroupRepository.findOne({
                where: middlewareGroup
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

        const middlewareGroup = {
            namespace: 'group1',
            name: 'group1'
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

        await expect(middlewareGroupService.addMiddleware(middlewareGroup, middleware)).rejects.toBeInstanceOf(MiddlewareGroupDoesNotExists)
        await expect(middlewareGroupService.removeMiddleware(middlewareGroup, middleware)).rejects.toBeInstanceOf(MiddlewareGroupDoesNotExists)

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

        const middlewareGroup = {
            namespace: 'group1',
            name: 'group1'
        }
        const middleware = {
            namespace: 'middleware1',
            name: 'middleware1'
        }

        await middlewareGroupService.create({
            creator: {
                type: CreatorType.System
            },
            isDefault: false,
            ...middlewareGroup
        })

        await expect(middlewareGroupService.addMiddleware(middlewareGroup, middleware)).rejects.toBeInstanceOf(MiddlewareDoesNotExists)
        await expect(middlewareGroupService.removeMiddleware(middlewareGroup, middleware)).rejects.toBeInstanceOf(MiddlewareDoesNotExists)

        container.restore()
    })

    it(`
        Новый middleware корректно добавляется в группу middleware. Попытка добавить уже
        состоящий в группе middleware приводит к исключению
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

        const middlewareGroup = {
            namespace: 'group1',
            name: 'group1'
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
        await middlewareGroupService.create({
            creator: {
                type: CreatorType.System
            },
            isDefault: false,
            ...middlewareGroup
        })

        await expect(middlewareGroupMiddlewareRepository.count()).resolves.toBe(0)
        await expect(middlewareGroupService.addMiddleware(middlewareGroup, middleware)).resolves.toBeUndefined()
        await expect(middlewareGroupService.addMiddleware(middlewareGroup, middleware)).rejects.toBeInstanceOf(MiddlewareAlreadyBound)
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

        const middlewareGroup = {
            namespace: 'group1',
            name: 'group1'
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
        await middlewareGroupService.create({
            creator: {
                type: CreatorType.System
            },
            isDefault: false,
            ...middlewareGroup
        })

        await expect(middlewareGroupService.addMiddleware(middlewareGroup, middleware)).resolves.toBeUndefined()
        await expect(middlewareGroupMiddlewareRepository.count()).resolves.toBe(1)
        await expect(middlewareGroupService.removeMiddleware(middlewareGroup, middleware)).resolves.toBeUndefined()
        await expect(middlewareGroupService.removeMiddleware(middlewareGroup, middleware)).resolves.toBeUndefined()
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

        const middlewareGroup = {
            namespace: 'group1',
            name: 'group1'
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
        await middlewareGroupService.create({
            creator: {
                type: CreatorType.System
            },
            isDefault: false,
            ...middlewareGroup
        })

        await expect(middlewareGroupService.addMiddleware(middlewareGroup, middleware)).resolves.toBeUndefined()

        await expect(middlewareGroupMiddlewareRepository.count()).resolves.toBe(1)
        await expect(metadataRepository.count()).resolves.toBe(2)
        await expect(middlewareGroupService.isExists(middlewareGroup)).resolves.toBe(true)

        await expect(middlewareGroupService.remove(middlewareGroup)).resolves.toBeUndefined()
        await expect(middlewareGroupService.remove(middlewareGroup)).resolves.toBeUndefined()

        await expect(middlewareGroupMiddlewareRepository.count()).resolves.toBe(0)
        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect(middlewareGroupService.isExists(middlewareGroup)).resolves.toBe(false)

        container.restore()
    })

    it(`
        Попытка включить/выключить csrf в несуществующей группе middleware приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const middlewareGroupService = container
            .get<IMiddlewareGroupService>(ROUTE_SYMBOL.MiddlewareGroupService)

        const middlewareGroup = {
            namespace: 'group1',
            name: 'group1'
        }

        await expect(middlewareGroupService.enableCsrf(middlewareGroup)).rejects.toBeInstanceOf(MiddlewareGroupDoesNotExists)
        await expect(middlewareGroupService.disableCsrf(middlewareGroup)).rejects.toBeInstanceOf(MiddlewareGroupDoesNotExists)
            
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

        const middlewareGroup = {
            namespace: 'group1',
            name: 'group1'
        }

        await expect(middlewareGroupService.create({
            creator: {
                type: CreatorType.System
            },
            isDefault: false,
            ...middlewareGroup
        })).resolves.toBeUndefined()

        await expect(middlewareGroupRepository.findOne({
            where: middlewareGroup
        })).resolves.toMatchObject({
            isCsrf: false
        })

        await expect(middlewareGroupService.enableCsrf(middlewareGroup)).resolves.toBeUndefined()
        await expect(middlewareGroupService.enableCsrf(middlewareGroup)).resolves.toBeUndefined()

        await expect(middlewareGroupRepository.findOne({
            where: middlewareGroup
        })).resolves.toMatchObject({
            isCsrf: true
        })

        await expect(middlewareGroupService.disableCsrf(middlewareGroup)).resolves.toBeUndefined()
        await expect(middlewareGroupService.disableCsrf(middlewareGroup)).resolves.toBeUndefined()

        await expect(middlewareGroupRepository.findOne({
            where: middlewareGroup
        })).resolves.toMatchObject({
            isCsrf: false
        })

        container.restore()
    })

    describe(`
        Попытка изменить порядковый номер middleware в указанной группе middleware завершается исключением,
        если:
    `, () => {

        beforeAll(async () => {
            const container = await getContainer()
            container.snapshot()

            const middlewareGroupService = container
                .get<IMiddlewareGroupService>(ROUTE_SYMBOL.MiddlewareGroupService)
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const methodRepository = connection.getRepository(Method)
            const middlewareRepository = connection.getRepository(Middleware)

            const middlewareGroup = {
                namespace: 'group1',
                name: 'group1'
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
            await middlewareGroupService.create({
                creator: {
                    type: CreatorType.System
                },
                isDefault: false,
                ...middlewareGroup
            })
        })

        afterAll(async () => {
            const container = await getContainer()
            container.restore()
        })

        it(`
            1. Указана несуществующая группа middleware
        `, async () => {
            const container = await getContainer()
        
            const middlewareGroupService = container
                .get<IMiddlewareGroupService>(ROUTE_SYMBOL.MiddlewareGroupService)

            const middleware = {
                namespace: 'middleware1',
                name: 'middleware1'
            }
            
            await expect(middlewareGroupService.setMiddlewareSerialNumber({
                namespace: 'incorrect',
                name: 'incorrect'
            }, middleware, 1))
                .rejects
                .toBeInstanceOf(MiddlewareGroupDoesNotExists)
        })

        it(`
            2. Указан несуществующий middleware
        `, async () => {
            const container = await getContainer()
        
            const middlewareGroupService = container
                .get<IMiddlewareGroupService>(ROUTE_SYMBOL.MiddlewareGroupService)

            const middlewareGroup = {
                namespace: 'group1',
                name: 'group1'
            }
            
            await expect(middlewareGroupService.setMiddlewareSerialNumber(middlewareGroup, {
                namespace: 'incorrect',
                name: 'incorrect'
            }, 1))
                .rejects
                .toBeInstanceOf(MiddlewareDoesNotExists)
        })

        it(`
            3. Указанная группа middleware не имеет никаких связей с указанным middleware
        `, async () => {
            const container = await getContainer()
        
            const middlewareGroupService = container
                .get<IMiddlewareGroupService>(ROUTE_SYMBOL.MiddlewareGroupService)

            const middlewareGroup = {
                namespace: 'group1',
                name: 'group1'
            }
            const middleware = {
                namespace: 'middleware1',
                name: 'middleware1'
            }

            await expect(middlewareGroupService.setMiddlewareSerialNumber(middlewareGroup, middleware, 1))
                .rejects
                .toBeInstanceOf(MiddlewareGroupDoesNotHaveMiddleware)
        })

    })

    it(`
        Порядковый номер указанного middleware в указанной группе middleware корректно изменяется. По умолчанию
        порядковый номер имеет значение null
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

        const middlewareGroup = {
            namespace: 'group1',
            name: 'group1'
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
        await middlewareGroupService.create({
            creator: {
                type: CreatorType.System
            },
            isDefault: false,
            ...middlewareGroup
        })

        
        await expect(middlewareGroupService.addMiddleware(middlewareGroup, middleware)).resolves.toBeUndefined()
        await expect(middlewareGroupMiddlewareRepository.findOne({
            where: {
                middlewareGroupId: 1,
                middlewareId: 1
            }
        })).resolves.toMatchObject({
            serialNumber: null
        })
        await expect(middlewareGroupService.setMiddlewareSerialNumber(middlewareGroup, middleware, 1)).resolves.toBeUndefined()
        await expect(middlewareGroupMiddlewareRepository.findOne({
            where: {
                middlewareGroupId: 1,
                middlewareId: 1
            }
        })).resolves.toMatchObject({
            serialNumber: 1
        })

        container.restore()
    })

})