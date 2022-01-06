import { getContainer } from '../../../../inversify.config'
import { IGuardService } from './guard.interface'
import {
    GuardMethodNotDefined,
    GuardAlreadyExists,
    GuardDoesNotExists
} from './guard.errors'
import { SIGNAL_SYMBOL } from '../signal.type'
import { GuardEventMutation } from './guard.types'
import { CreatorType, CREATOR_SYMBOL, ResourceType } from '../../creator/creator.types'
import { ICreatorService } from '../../creator/creator.interface'
import { Method } from '../../entities/method.entity'
import { Connection } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { Metadata } from '../../entities/metadata.entity'
import { Guard } from '../../entities/signal.entity'
import { type } from '../../../../utils/type'
import { RevisionNumberError } from '../../metadata/metadata.errors'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('GuardService в SignalModule', () => {

    it(`
        Попытка создать ресурс охранника с несуществующим методом приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const guardService = container
            .get<IGuardService>(SIGNAL_SYMBOL.GuardService)

        const eventMutationFn = jest.fn()
        guardService.onMutation(eventMutationFn)

        const guard = {
            namespace: 'guard1',
            name: 'guard1'
        }

        const method = {
            namespace: 'method1',
            type: 'method1',
            name: 'method1'
        }

        await expect(guardService.create({
            creator: {
                type: CreatorType.System
            },
            method: method,
            ...guard
        })).rejects.toBeInstanceOf(GuardMethodNotDefined)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })

    it(`
        Ресурс охранника корректно создаётся вместе с метаданными. Попытка создать ресурс
        охранника, который уже существует приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const guardService = container
            .get<IGuardService>(SIGNAL_SYMBOL.GuardService)
        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const metadataRepository = connection.getRepository(Metadata)

        const eventMutationFn = jest.fn()
        guardService.onMutation(eventMutationFn)

        const guard = {
            namespace: 'guard1',
            name: 'guard1'
        }

        const method = {
            namespace: 'method1',
            type: 'method1',
            name: 'method1'
        }
        await methodRepository.save(method)

        await expect(metadataRepository.count()).resolves.toBe(0)
        await expect(guardService.isExists(guard)).resolves.toBe(false)
        await expect(guardService.create({
            ...guard,
            creator: {
                type: CreatorType.System
            },
            method: method
        })).resolves.toBeUndefined()
        await expect(guardService.create({
            ...guard,
            creator: {
                type: CreatorType.System
            },
            method: method
        })).rejects.toBeInstanceOf(GuardAlreadyExists)
        await expect(guardService.isExists(guard)).resolves.toBe(true)
        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect(creatorService.isResourceCreator({
            type: ResourceType.Guard,
            id: 1
        }, {
            type: CreatorType.System
        })).resolves.toBe(true)

        expect(eventMutationFn).toBeCalledTimes(1)
        expect(eventMutationFn).nthCalledWith(1, {
            type: GuardEventMutation.Create,
            guardId: 1
        })

        container.restore()
    })

    it(`
        Попытка привязать метаданные к несуществующему охраннику приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const guardService = container
            .get<IGuardService>(SIGNAL_SYMBOL.GuardService)

        const eventMutationFn = jest.fn()
        guardService.onMutation(eventMutationFn)

        const guard = {
            namespace: 'guard1',
            name: 'guard1'
        }

        await expect(guardService.setMetadata(guard, {
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(GuardDoesNotExists)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })

    it(`
        Метаданные корректно изменяются в охраннике и корректно считываются. Попытка установить
        метаданные некорректно редакции приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const guardService = container
            .get<IGuardService>(SIGNAL_SYMBOL.GuardService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const metadataRepository = connection.getRepository(Metadata)
        const guardRepository = connection.getRepository(Guard)

        const eventMutationFn = jest.fn()
        guardService.onMutation(eventMutationFn)

        const guard = {
            namespace: 'guard1',
            name: 'guard1'
        }
        const method = {
            namespace: 'method1',
            type: 'method1',
            name: 'method1'
        }

        await methodRepository.save(method)
        await guardService.create({
            ...guard,
            creator: {
                type: CreatorType.System
            },
            method: method
        })

        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect(guardRepository.findOne({
            where: guard
        }).then(entity => {
            return type<Guard>(entity).metadata
        })).resolves.toMatchObject({
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })
        await expect(guardService.setMetadata(guard, {
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 0
        })).resolves.toBeUndefined()
        await expect(guardRepository.findOne({
            where: guard
        }).then(entity => {
            return type<Guard>(entity).metadata
        })).resolves.toMatchObject({
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 1
        })
        await expect(guardService.setMetadata(guard, {
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(RevisionNumberError)
        await expect(guardRepository.findOne({
            where: guard
        }).then(entity => {
            return type<Guard>(entity).metadata
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
            type: GuardEventMutation.SetMetadata,
            guardId: 1
        }))

        container.restore()
    })

    it(`
        Ресурс охранника корректно удаляется вместе с метаданными. При удалении будет произведена попытка
        удалить и метод. Попытка удалить несуществующий охранник ни к чему не приведёт
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const guardService = container
            .get<IGuardService>(SIGNAL_SYMBOL.GuardService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const metadataRepository = connection.getRepository(Metadata)
        const guardRepository = connection.getRepository(Guard)

        const eventMutationFn = jest.fn()
        guardService.onMutation(eventMutationFn)

        const guard = {
            namespace: 'guard1',
            name: 'guard1'
        }
        const method = {
            namespace: 'method1',
            type: 'method1',
            name: 'method1'
        }

        await methodRepository.save(method)
        await guardService.create({
            ...guard,
            creator: {
                type: CreatorType.System
            },
            method: method
        })

        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect(methodRepository.count()).resolves.toBe(1)
        await expect(guardRepository.count()).resolves.toBe(1)
        await expect(guardService.isExists(guard)).resolves.toBe(true)

        await expect(guardService.remove(guard)).resolves.toBeUndefined()
        await expect(guardService.remove(guard)).resolves.toBeUndefined()

        await expect(metadataRepository.count()).resolves.toBe(0)
        await expect(methodRepository.count()).resolves.toBe(0)
        await expect(guardRepository.count()).resolves.toBe(0)
        await expect(guardService.isExists(guard)).resolves.toBe(false)

        expect(eventMutationFn).toBeCalledTimes(2)
        expect(eventMutationFn).nthCalledWith(2, expect.objectContaining({
            type: GuardEventMutation.Remove,
            guardId: 1
        }))

        container.restore()
    })

})