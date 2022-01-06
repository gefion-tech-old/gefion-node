import { getContainer } from '../../../../inversify.config'
import { Controller } from '../../entities/route.entity'
import { 
    Connection,
    Entity,
    PrimaryGeneratedColumn,
    OneToOne,
    JoinColumn
} from 'typeorm'
import { IControllerService } from './controller.interface'
import { ROUTE_SYMBOL } from '../route.types'
import {
    ControllerDoesNotExists,
    ControllerMethodNotDefined,
    ControllerAlreadyExists,
    ControllerUsedError
} from './controller.errors'
import { CreatorType, CREATOR_SYMBOL, ResourceType } from '../../creator/creator.types'
import { Method } from '../../entities/method.entity'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { ICreatorService } from '../../creator/creator.interface'
import { Metadata } from '../../entities/metadata.entity'
import { RevisionNumberError } from '../../metadata/metadata.errors'
import { addTestEntity } from '../../../../core/typeorm/utils/test-entities'
import { ControllerEventMutation } from './controller.types'

/**
 * Добавление тестовой сущности
 * -----
 */
 @Entity()
 class Test {
 
    @PrimaryGeneratedColumn()
    id: number

    @OneToOne(() => Controller, {
        nullable: false
    })
    @JoinColumn()
    controller: Controller
 
 }
 addTestEntity(Test)
 /**
  * -----
  */

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('ControllerService в RouteModule', () => {

    it(`
        Попытка создать контроллер с несуществующим методом приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const controllerService = container
            .get<IControllerService>(ROUTE_SYMBOL.ControllerService)

        const controller = {
            name: 'controller1',
            namespace: 'controller1'
        }

        const eventMutationFn = jest.fn()
        controllerService.onMutation(eventMutationFn)

        await expect(controllerService.create({
            creator: {
                type: CreatorType.System
            },
            method: {
                name: 'method1',
                type: 'type1',
                namespace: 'namespace1'
            },
            ...controller
        })).rejects.toBeInstanceOf(ControllerMethodNotDefined)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })

    it(`
        Контроллер корректно создаётся. Попытка создания уже созданного контроллера
        приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const controllerService = container
            .get<IControllerService>(ROUTE_SYMBOL.ControllerService)
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
        const controller = {
            namespace: 'controller1',
            name: 'controller1'
        }

        const eventMutationFn = jest.fn()
        controllerService.onMutation(eventMutationFn)

        await expect(controllerService.isExists(controller)).resolves.toBe(false)
        await expect(controllerService.create({
            creator: {
                type: CreatorType.System
            },
            method: methodEntity,
            ...controller
        })).resolves.toBeUndefined()
        await expect(controllerService.create({
            creator: {
                type: CreatorType.System
            },
            method: methodEntity,
            ...controller
        })).rejects.toBeInstanceOf(ControllerAlreadyExists)
        await expect(controllerService.isExists(controller)).resolves.toBe(true)
        await expect(creatorService.isResourceCreator({
            type: ResourceType.Controller,
            id: 1
        }, {
            type: CreatorType.System
        })).resolves.toBe(true)

        expect(eventMutationFn).toBeCalledTimes(1)
        expect(eventMutationFn).nthCalledWith(1, {
            type: ControllerEventMutation.Create,
            controllerId: 1
        })

        container.restore()
    })

    it(`
        Попытка удалить контроллер к которому привязаны какие-либо внешние ресурсы приводит
        к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const controllerService = container
            .get<IControllerService>(ROUTE_SYMBOL.ControllerService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const testRepository = connection.getRepository(Test)

        const methodEntity = await methodRepository.save({
            name: 'name1',
            type: 'type1',
            namespace: 'namespace1'
        })
        const controller = {
            name: 'controller1',
            namespace: 'controller1'
        }

        const eventMutationFn = jest.fn()
        controllerService.onMutation(eventMutationFn)

        await controllerService.create({
            creator: {
                type: CreatorType.System
            },
            method: methodEntity,
            ...controller
        })
        await testRepository.save({
            controller: { id: 1 }
        })

        await expect(controllerService.remove(controller)).rejects.toBeInstanceOf(ControllerUsedError)

        expect(eventMutationFn).toBeCalledTimes(1)

        container.restore()
    })

    it(`
        Контроллер корректно удаляется вместе с метаданными. Попытка удалить несуществующий 
        контроллер ни к чему не приводит. Вместе с контроллером удаляется и его метод, если он
        больше ни к чему не привязан
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const controllerService = container
            .get<IControllerService>(ROUTE_SYMBOL.ControllerService)
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
        const controller = {
            name: 'controller1',
            namespace: 'controller1'
        }

        const eventMutationFn = jest.fn()
        controllerService.onMutation(eventMutationFn)

        await controllerService.create({
            creator: {
                type: CreatorType.System
            },
            method: methodEntity,
            ...controller
        })
        
        await expect(controllerService.isExists(controller)).resolves.toBe(true)
        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect(methodRepository.count()).resolves.toBe(1)
        await expect(creatorService.isResourceCreator({
            type: ResourceType.Controller,
            id: 1
        }, {
            type: CreatorType.System
        })).resolves.toBe(true)

        await expect(controllerService.remove(controller)).resolves.toBeUndefined()
        await expect(controllerService.remove(controller)).resolves.toBeUndefined()
        
        await expect(controllerService.isExists(controller)).resolves.toBe(false)
        await expect(metadataRepository.count()).resolves.toBe(0)
        await expect(methodRepository.count()).resolves.toBe(0)
        await expect(creatorService.isResourceCreator({
            type: ResourceType.Controller,
            id: 1
        }, {
            type: CreatorType.System
        })).resolves.toBe(false)

        expect(eventMutationFn).toBeCalledTimes(2)
        expect(eventMutationFn).nthCalledWith(2, {
            type: ControllerEventMutation.Remove,
            controllerId: 1
        })

        container.restore()
    })

    it(`
        Попытка установить метаданные в несуществующий контроллер приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const controllerService = container
            .get<IControllerService>(ROUTE_SYMBOL.ControllerService)

        const controller = {
            name: 'controller1',
            namespace: 'controller1'
        }

        const eventMutationFn = jest.fn()
        controllerService.onMutation(eventMutationFn)

        await expect(controllerService.setMetadata(controller, {
            metadata: {
                custom: true
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(ControllerDoesNotExists)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })

    it(`
        Метаданные корректно устанавливаются в контроллер и читаются из него. Попытка установить 
        метаданные несоответствующей редакции приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const controllerService = container
            .get<IControllerService>(ROUTE_SYMBOL.ControllerService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const metadataRepository = connection.getRepository(Metadata)
        const controllerRepository = connection.getRepository(Controller)
        const methodRepository = connection.getRepository(Method)

        const methodEntity = await methodRepository.save({
            name: 'name1',
            type: 'type1',
            namespace: 'namespace1'
        })

        const controller = {
            name: 'controller1',
            namespace: 'controller1'
        }

        const eventMutationFn = jest.fn()
        controllerService.onMutation(eventMutationFn)

        await expect(controllerService.create({
            creator: {
                type: CreatorType.System
            },
            method: methodEntity,
            ...controller
        })).resolves.toBeUndefined()
        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect((async () => {
            const controllerEntity = await controllerRepository.findOne({
                where: controller
            })
            return controllerEntity?.metadata
        })()).resolves.toMatchObject({
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })
        await expect(controllerService.setMetadata(controller, {
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 0
        })).resolves.toBeUndefined()
        await expect((async () => {
            const controllerEntity = await controllerRepository.findOne({
                where: controller
            })
            return controllerEntity?.metadata
        })()).resolves.toMatchObject({
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 1
        })
        await expect(controllerService.setMetadata(controller, {
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(RevisionNumberError)
        await expect((async () => {
            const controllerEntity = await controllerRepository.findOne({
                where: controller
            })
            return controllerEntity?.metadata
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
            type: ControllerEventMutation.SetMetadata,
            controllerId: 1
        })

        container.restore()
    })

})