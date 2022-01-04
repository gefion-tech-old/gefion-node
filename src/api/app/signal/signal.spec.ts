import { getContainer } from '../../../inversify.config'
import { SIGNAL_SYMBOL, SignalEventMutation, EventContext } from './signal.type'
import { ISignalService } from './signal.interface'
import { METHOD_SYMBOL } from '../method/method.types'
import { IMethodService } from '../method/method.interface'
import {
    SignalDoesNotExist,
    SignalMethodNotDefined,
    ValidatorAlreadyBound,
    GuardAlreadyBound,
    FilterAlreadyBound,
    OutputSignalDoesNotExist,
    InputSignalDoesNotExist,
    CyclicSignalsNotAllowed,
    SignalUsedError,
    SignalAlreadyExists
} from './signal.errors'
import { Connection, Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm'
import { Signal, SignalGraph } from '../entities/signal.entity'
import { Method } from '../entities/method.entity'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { VM_SYMBOL } from '../../../core/vm/vm.types'
import { getVMService } from '../../../core/vm/__mock/VMService.mock'
import { CreatorType, ResourceType } from '../creator/creator.types'
import { ICreatorService } from '../creator/creator.interface'
import { CREATOR_SYMBOL } from '../creator/creator.types'
import { getCreatorService } from '../creator/__mock/getCreatorService.mock'
import { addTestEntity } from '../../../core/typeorm/utils/test-entities'
import { RevisionNumberError } from '../metadata/metadata.errors'
import { Metadata } from '../entities/metadata.entity'

/**
 * Добавление тестовой сущности
 * -----
 */
@Entity()
class SignalResource {

    @PrimaryGeneratedColumn()
    id: number

    @OneToOne(() => Signal, {
        nullable: false
    })
    @JoinColumn()
    signal: Signal

}
addTestEntity(SignalResource)
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

describe('SignalService в SignalModule', () => {

    it(`
        Сигнал корректно создаётся и к нему привязывается создатель. Попытка создания уже созданного
        сигнала приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()
        
        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)
        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const signalRepository = connection.getRepository(Signal)

        const signal1 = {
            namespace: 'namespace',
            name: 'name'
        }
        const metadata = true

        await expect(signalService.isExists(signal1))
            .resolves
            .toBe(false)

        await expect((async () => {
            const signalEntity = await signalRepository.findOne({
                where: signal1
            })
            return signalEntity?.metadata
        })()).resolves.toBeUndefined()            

        const signalMutationFn = jest.fn()
        expect(signalService.onSignalMutation(signalMutationFn)).toBeUndefined()

        await expect(signalService.create({
            signal: signal1,
            defaultMetadata: metadata,
            creator: {
                type: CreatorType.System
            }
        })).resolves.toBeUndefined()
        await expect(signalService.create({
            signal: signal1,
            defaultMetadata: undefined,
            creator: {
                type: CreatorType.System
            }
        })).rejects.toBeInstanceOf(SignalAlreadyExists)
        
        const eventContext: EventContext = {
            type: SignalEventMutation.Create,
            signalId: await signalService.getSignalId(signal1) as number
        }
        expect(signalMutationFn).toHaveBeenNthCalledWith(1, expect.objectContaining(eventContext))
        expect(signalMutationFn).toBeCalledTimes(1)

        await expect(signalService.isExists(signal1))
            .resolves
            .toBe(true)

        await expect(signalService.getSignalId(signal1))
            .resolves
            .toBe(1)
        
        await expect((async () => {
            const signalEntity = await signalRepository.findOne({
                where: signal1
            })
            return signalEntity?.metadata
        })()).resolves.toMatchObject({
            metadata: {
                default: metadata
            },
            revisionNumber: 0
        })

        const signalId = await signalService.getSignalId(signal1)

        if (!signalId) {
            throw new Error('Этой ошибки быть не должно')
        }

        await expect(creatorService.isResourceCreator({
            type: ResourceType.Signal,
            id: signalId
        }, {
            type: CreatorType.System
        })).resolves.toBe(true)

        container.restore()
    })

    it(`
        Кастомные метаданные сигнала успешно сохраняются. Попытка установить 
        метаданные несоответствующей редакции приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const metadataRepository = connection.getRepository(Metadata)
        const signalRepository = connection.getRepository(Signal)

        const signal1 = {
            namespace: 'namespace',
            name: 'name'
        }
        const defaultMetadata = true
        const customMetadata = {
            value: true
        }

        const signalMutationFn = jest.fn()
        expect(signalService.onSignalMutation(signalMutationFn)).toBeUndefined()

        await signalService.create({
            signal: signal1,
            defaultMetadata: defaultMetadata,
            creator: {
                type: CreatorType.System
            }
        })
        await expect(metadataRepository.count()).resolves.toBe(1)

        await expect((async () => {
            const signalEntity = await signalRepository.findOne({
                where: signal1
            })
            return signalEntity?.metadata
        })()).resolves.toMatchObject({
                metadata: {
                    default: defaultMetadata
                },
                revisionNumber: 0
            })
        await expect(signalService.setCustomMetadata(signal1, {
            metadata: {
                custom: customMetadata,
                default: defaultMetadata
            },
            revisionNumber: 0
        })).resolves.toBeUndefined()
        await expect((async () => {
            const signalEntity = await signalRepository.findOne({
                where: signal1
            })
            return signalEntity?.metadata
        })()).resolves.toMatchObject({
            metadata: {
                default: defaultMetadata,
                custom: customMetadata
            },
            revisionNumber: 1
        })
        await expect(signalService.setCustomMetadata(signal1, {
            metadata: {
                custom: customMetadata,
                default: defaultMetadata
            },
            revisionNumber: 2
        })).rejects.toBeInstanceOf(RevisionNumberError)

        const eventContext: EventContext = {
            type: SignalEventMutation.SetCustomMetadata,
            signalId: await signalService.getSignalId(signal1) as number
        }
        expect(signalMutationFn).toHaveBeenNthCalledWith(2, expect.objectContaining(eventContext))
        expect(signalMutationFn).toBeCalledTimes(2)

        container.restore()
    })

    it(`
        Попытка привязать кастомные метаданные к несуществующему сигналу завершается
        ошибкой
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)

        const customMetadata = {
            value: true
        }

        await expect(signalService.setCustomMetadata({
            namespace: 'namespace',
            name: 'name'
        }, {
            metadata: {
                custom: customMetadata,
                default: null
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(SignalDoesNotExist)

        container.restore()
    })

    it(`
        Попытка добавить валидатор/охранник/фильтр в несуществующий сигнал завершается ошибкой
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(VM_SYMBOL.VMService)
            .to(getVMService({
                error: () => {},
                info: () => ({} as any),
                on: () => {},
                remove: () => {},
                run: async () => Symbol('name'),
                stats: async () => [],
                listScripts: () => []
            }))
            .inSingletonScope()

        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)
        const methodService = container
            .get<IMethodService>(METHOD_SYMBOL.MethodService)

        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name'
        }
        const signal1 = {
            namespace: 'namespace',
            name: 'name'
        }

        await methodService.method({
            ...method1,
            handler: () => {},
            scriptId: Symbol('name'),
            creator: {
                type: CreatorType.System
            }
        })

        await expect(signalService.addValidator(signal1, method1))
            .rejects
            .toBeInstanceOf(SignalDoesNotExist)
        await expect(signalService.addGuard(signal1, method1))
            .rejects
            .toBeInstanceOf(SignalDoesNotExist)
        await expect(signalService.addFilter(signal1, method1))
            .rejects
            .toBeInstanceOf(SignalDoesNotExist)

        container.restore()
    })

    it(`
        Попытка добавить несуществующий метод валидатора/охранника/фильтра в сигнал завершается
        ошибкой
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)

        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name'
        }
        const signal1 = {
            namespace: 'namespace',
            name: 'name'
        }
        const defaultMetadata = null

        await signalService.create({
            signal: signal1,
            defaultMetadata: defaultMetadata,
            creator: {
                type: CreatorType.System
            }
        })

        await expect(signalService.addValidator(signal1, method1))
            .rejects
            .toBeInstanceOf(SignalMethodNotDefined)
        await expect(signalService.addGuard(signal1, method1))
            .rejects
            .toBeInstanceOf(SignalMethodNotDefined)
        await expect(signalService.addFilter(signal1, method1))
            .rejects
            .toBeInstanceOf(SignalMethodNotDefined)

        container.restore()
    })

    it(`
        Попытка повторной привязки валидатора/охранника/фильтра к методу приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(VM_SYMBOL.VMService)
            .to(getVMService({
                error: () => {},
                info: () => ({} as any),
                on: () => {},
                remove: () => {},
                run: async () => Symbol('name'),
                stats: async () => [],
                listScripts: () => []
            }))
            .inSingletonScope()

        const methodService = container
            .get<IMethodService>(METHOD_SYMBOL.MethodService)
        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)

        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name'
        }

        await methodService.method({
            ...method1,
            handler: () => {},
            scriptId: Symbol('name'),
            creator: {
                type: CreatorType.System
            }
        })

        const signal1 = {
            namespace: 'namespace',
            name: 'name'
        }
        const defaultMetadata = true
        
        await signalService.create({
            signal: signal1,
            defaultMetadata: defaultMetadata,
            creator: {
                type: CreatorType.System
            }
        })

        await expect(signalService.addValidator(signal1, method1))
            .resolves
            .toBeUndefined()
        await expect(signalService.addValidator(signal1, method1))
            .rejects
            .toBeInstanceOf(ValidatorAlreadyBound)
        await expect(signalService.addGuard(signal1, method1))
            .resolves
            .toBeUndefined()
        await expect(signalService.addGuard(signal1, method1))
            .rejects
            .toBeInstanceOf(GuardAlreadyBound)
        await expect(signalService.addFilter(signal1, method1))
            .resolves
            .toBeUndefined()
        await expect(signalService.addFilter(signal1, method1))
            .rejects
            .toBeInstanceOf(FilterAlreadyBound)

        container.restore()
    })

    it(`
        Валидатор/охранник/фильтр успешно добавляется в пул валидаторов/охранников/фильтров
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(VM_SYMBOL.VMService)
            .to(getVMService({
                error: () => {},
                info: () => ({} as any),
                on: () => {},
                remove: () => {},
                run: async () => Symbol('name'),
                stats: async () => [],
                listScripts: () => []
            }))
            .inSingletonScope()

        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)
        const methodService = container
            .get<IMethodService>(METHOD_SYMBOL.MethodService)
        const signalRepository = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            .then(connection => {
                return connection.getRepository(Signal)
            })

        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name'
        }
        const method2 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name2'
        }
        const method3 = {
            namespace: 'namespace2',
            type: 'type',
            name: 'name2'
        }

        await methodService.method({
            ...method1,
            handler: () => {},
            scriptId: Symbol('name'),
            creator: {
                type: CreatorType.System
            }
        })
        await methodService.method({
            ...method2,
            handler: () => {},
            scriptId: Symbol('name'),
            creator: {
                type: CreatorType.System
            }
        })
        await methodService.method({
            ...method3,
            handler: () => {},
            scriptId: Symbol('name'),
            creator: {
                type: CreatorType.System
            }
        })

        const signal1 = {
            namespace: 'namespace',
            name: 'name'
        }
        const defaultMetadata = true
        
        const signalMutationFn = jest.fn()
        expect(signalService.onSignalMutation(signalMutationFn)).toBeUndefined()

        await signalService.create({
            signal: signal1,
            defaultMetadata: defaultMetadata,
            creator: {
                type: CreatorType.System
            }
        })

        await Promise.all([
            signalService.addValidator(signal1, method1),
            signalService.addValidator(signal1, method2),
            signalService.addValidator(signal1, method3),
            signalService.addGuard(signal1, method1),
            signalService.addGuard(signal1, method2),
            signalService.addGuard(signal1, method3),
            signalService.addFilter(signal1, method1),
            signalService.addFilter(signal1, method2),
            signalService.addFilter(signal1, method3)
        ])

        const signalEntity = await signalRepository.findOne({
            where: signal1,
            relations: ['validators', 'guards', 'filters']
        })

        if (!signalEntity) {
            throw new Error('Непредвиденная ошибка')
        }

        expect(signalEntity.validators).toHaveLength(3)
        expect(signalEntity.guards).toHaveLength(3)
        expect(signalEntity.filters).toHaveLength(3)

        const eventContext1: EventContext = {
            type: SignalEventMutation.AddValidator,
            signalId: await signalService.getSignalId(signal1) as number
        }
        const eventContext2: EventContext = {
            type: SignalEventMutation.AddGuard,
            signalId: await signalService.getSignalId(signal1) as number
        }
        const eventContext3: EventContext = {
            type: SignalEventMutation.AddFilter,
            signalId: await signalService.getSignalId(signal1) as number
        }
        expect(signalMutationFn).toHaveBeenNthCalledWith(2, expect.objectContaining(eventContext1))
        expect(signalMutationFn).toHaveBeenNthCalledWith(5, expect.objectContaining(eventContext2))
        expect(signalMutationFn).toHaveBeenNthCalledWith(8, expect.objectContaining(eventContext3))
        expect(signalMutationFn).toBeCalledTimes(10)

        container.restore()
    })

    it(`
        Попытка удалить валидатор/охранник/фильтр из несуществующего сигнала приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(VM_SYMBOL.VMService)
            .to(getVMService({
                error: () => {},
                info: () => ({} as any),
                on: () => {},
                remove: () => {},
                run: async () => Symbol('name'),
                stats: async () => [],
                listScripts: () => []
            }))
            .inSingletonScope()

        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)
        const methodService = container
            .get<IMethodService>(METHOD_SYMBOL.MethodService)

        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name'
        }
        const signal1 = {
            namespace: 'namespace',
            name: 'name'
        }

        await methodService.method({
            ...method1,
            handler: () => {},
            scriptId: Symbol('name'),
            creator: {
                type: CreatorType.System
            }
        })

        await expect(signalService.removeValidator(signal1, method1))
            .rejects
            .toBeInstanceOf(SignalDoesNotExist)
        await expect(signalService.removeGuard(signal1, method1))
            .rejects
            .toBeInstanceOf(SignalDoesNotExist)
        await expect(signalService.removeFilter(signal1, method1))
            .rejects
            .toBeInstanceOf(SignalDoesNotExist)

        container.restore()
    })

    it(`
        Попытка удалить несуществующий валидатор/охранник/фильтр приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)

        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name'
        }
        const signal1 = {
            namespace: 'namespace',
            name: 'name'
        }
        const defaultMetadata = null

        await signalService.create({
            signal: signal1,
            defaultMetadata: defaultMetadata,
            creator: {
                type: CreatorType.System
            }
        })

        await expect(signalService.removeValidator(signal1, method1))
            .rejects
            .toBeInstanceOf(SignalMethodNotDefined)
        await expect(signalService.removeGuard(signal1, method1))
            .rejects
            .toBeInstanceOf(SignalMethodNotDefined)
        await expect(signalService.removeFilter(signal1, method1))
            .rejects
            .toBeInstanceOf(SignalMethodNotDefined)

        container.restore()
    })

    it(`
        Валидатор/охранник/фильтр полностью и корректно удаляется из сигнала, если к методу не привязано больше 
        ресурсов, в противном случае сигнал отвязывается от метода, а сам метод не удаляется
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(VM_SYMBOL.VMService)
            .to(getVMService({
                error: () => {},
                info: () => ({} as any),
                on: () => {},
                remove: () => {},
                run: async () => Symbol('name'),
                stats: async () => [],
                listScripts: () => []
            }))
            .inSingletonScope()

        const methodService = container
            .get<IMethodService>(METHOD_SYMBOL.MethodService)
        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)
        const signalRepository = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            .then(connection => {
                return connection.getRepository(Signal)
            })

        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name'
        }
        const method2 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name2'
        }
        const signal1 = {
            namespace: 'namespace',
            name: 'name1'
        }
        const signal2 = {
            namespace: 'namespace',
            name: 'name2'
        }
        const defaultMetadata = null

        const signalMutationFn = jest.fn()
        expect(signalService.onSignalMutation(signalMutationFn)).toBeUndefined()

        await signalService.create({
            signal: signal1,
            defaultMetadata: defaultMetadata,
            creator: {
                type: CreatorType.System
            }
        })
        await signalService.create({
            signal: signal2,
            defaultMetadata: defaultMetadata,
            creator: {
                type: CreatorType.System
            }
        })
        await methodService.method({
            ...method1,
            handler: () => {},
            scriptId: Symbol('name'),
            creator: {
                type: CreatorType.System
            }
        })
        await methodService.method({
            ...method2,
            handler: () => {},
            scriptId: Symbol('name'),
            creator: {
                type: CreatorType.System
            }
        })
        await signalService.addValidator(signal1, method1)
        await signalService.addValidator(signal1, method2)
        await signalService.addValidator(signal2, method1)
        await signalService.addGuard(signal1, method1)
        await signalService.addGuard(signal1, method2)
        await signalService.addGuard(signal2, method1)
        await signalService.addFilter(signal1, method1)
        await signalService.addFilter(signal1, method2)
        await signalService.addFilter(signal2, method1)

        await expect(signalService.removeValidator(signal1, method1))
            .resolves
            .toBeUndefined()
        await expect(signalService.removeValidator(signal1, method2))
            .resolves
            .toBeUndefined()
        await expect(signalService.removeGuard(signal1, method1))
            .resolves
            .toBeUndefined()
        await expect(signalService.removeGuard(signal1, method2))
            .resolves
            .toBeUndefined()
        await expect(signalService.removeFilter(signal1, method1))
            .resolves
            .toBeUndefined()
        await expect(signalService.removeFilter(signal1, method2))
            .resolves
            .toBeUndefined()

        expect((await signalRepository.findOne({
            where: signal1,
            relations: ['validators']
        }))?.validators).toHaveLength(0)
        expect((await signalRepository.findOne({
            where: signal2,
            relations: ['validators']
        }))?.validators).toHaveLength(1)
        expect((await signalRepository.findOne({
            where: signal1,
            relations: ['guards']
        }))?.guards).toHaveLength(0)
        expect((await signalRepository.findOne({
            where: signal2,
            relations: ['guards']
        }))?.guards).toHaveLength(1)
        expect((await signalRepository.findOne({
            where: signal1,
            relations: ['filters']
        }))?.filters).toHaveLength(0)
        expect((await signalRepository.findOne({
            where: signal2,
            relations: ['filters']
        }))?.filters).toHaveLength(1)

        expect(methodService.isAvailable(method1)).toBe(true)
        expect(methodService.isAvailable(method2)).toBe(false)

        await expect(signalService.removeValidator(signal2, method1))
            .resolves
            .toBeUndefined()
        await expect(signalService.removeGuard(signal2, method1))
            .resolves
            .toBeUndefined()
        await expect(signalService.removeFilter(signal2, method1))
            .resolves
            .toBeUndefined()
        
        expect((await signalRepository.findOne({
            where: signal2,
            relations: ['validators']
        }))?.validators).toHaveLength(0)
        expect((await signalRepository.findOne({
            where: signal2,
            relations: ['guards']
        }))?.guards).toHaveLength(0)
        expect((await signalRepository.findOne({
            where: signal2,
            relations: ['filters']
        }))?.filters).toHaveLength(0)

        expect(methodService.isAvailable(method1)).toBe(false)

        const eventContext1: EventContext = {
            type: SignalEventMutation.RemoveValidator,
            signalId: await signalService.getSignalId(signal1) as number
        }
        const eventContext2: EventContext = {
            type: SignalEventMutation.RemoveGuard,
            signalId: await signalService.getSignalId(signal1) as number
        }
        const eventContext3: EventContext = {
            type: SignalEventMutation.RemoveFilter,
            signalId: await signalService.getSignalId(signal1) as number
        }
        expect(signalMutationFn).toHaveBeenNthCalledWith(12, expect.objectContaining(eventContext1))
        expect(signalMutationFn).toHaveBeenNthCalledWith(14, expect.objectContaining(eventContext2))
        expect(signalMutationFn).toHaveBeenNthCalledWith(16, expect.objectContaining(eventContext3))
        expect(signalMutationFn).toBeCalledTimes(20)

        container.restore()
    })

    it(`
        Попытка соединить или отсоединить несуществующие сигналы завершается исключением
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(CREATOR_SYMBOL.CreatorService)
            .to(getCreatorService({
                bind: async () => {},
                getCreator: async () => undefined,
                isResourceCreator: async () => false
            }))
            .inSingletonScope()

        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)

        const signal1 = {
            namespace: 'namespace',
            name: 'name1'
        }
        const signal2 = {
            namespace: 'namespace',
            name: 'name2'
        }
        const defaultMetadata = null

        await signalService.create({
            signal: signal1,
            defaultMetadata: defaultMetadata,
            creator: {
                type: CreatorType.System
            }
        })

        await expect(signalService.connect(signal2, signal1))
            .rejects
            .toBeInstanceOf(OutputSignalDoesNotExist)
        await expect(signalService.connect(signal1, signal2))
            .rejects
            .toBeInstanceOf(InputSignalDoesNotExist)
        await expect(signalService.unconnect(signal2, signal1))
            .rejects
            .toBeInstanceOf(OutputSignalDoesNotExist)
        await expect(signalService.unconnect(signal1, signal2))
            .rejects
            .toBeInstanceOf(InputSignalDoesNotExist)

        container.restore()
    })

    it(`
        Попытка соединить уже соединённые сигналы ничем не завершается
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(CREATOR_SYMBOL.CreatorService)
            .to(getCreatorService({
                bind: async () => {},
                getCreator: async () => undefined,
                isResourceCreator: async () => false
            }))
            .inSingletonScope()

        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)
        
        const signal1 = {
            namespace: 'namespace',
            name: 'name1'
        }
        const signal2 = {
            namespace: 'namespace',
            name: 'name2'
        }
        const defaultMetadata = null
        
        await Promise.all([
            signalService.create({
                signal: signal1,
                defaultMetadata: defaultMetadata,
                creator: {
                    type: CreatorType.System
                }
            }),
            signalService.create({
                signal: signal2,
                defaultMetadata: defaultMetadata,
                creator: {
                    type: CreatorType.System
                }
            })
        ])

        await expect(signalService.connect(signal1, signal2))
            .resolves
            .toBeUndefined()
        await expect(signalService.connect(signal1, signal2))
            .resolves
            .toBeUndefined()

        container.restore()
    })

    it(`
        Сигналы корректно соединяются и отсоединяются. Попытка породить циклические
        сигналы приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(CREATOR_SYMBOL.CreatorService)
            .to(getCreatorService({
                bind: async () => {},
                getCreator: async () => undefined,
                isResourceCreator: async () => false
            }))
            .inSingletonScope()

        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)
        const signalGraphRepository = connection.getRepository(SignalGraph)
        
        const signal1 = {
            namespace: 'namespace',
            name: 'name1'
        }
        const signal2 = {
            namespace: 'namespace',
            name: 'name2'
        }
        const signal3 = {
            namespace: 'namespace',
            name: 'name3'
        }
        const signal4 = {
            namespace: 'namespace',
            name: 'name4'
        }
        const signal5 = {
            namespace: 'namespace',
            name: 'name5'
        }
        const defaultMetadata = null

        const signalMutationFn = jest.fn()
        expect(signalService.onSignalMutation(signalMutationFn)).toBeUndefined()

        await Promise.all([
            signalService.create({
                signal: signal1,
                defaultMetadata: defaultMetadata,
                creator: {
                    type: CreatorType.System
                }
            }),
            signalService.create({
                signal: signal2,
                defaultMetadata: defaultMetadata,
                creator: {
                    type: CreatorType.System
                }
            }),
            signalService.create({
                signal: signal3,
                defaultMetadata: defaultMetadata,
                creator: {
                    type: CreatorType.System
                }
            }),
            signalService.create({
                signal: signal4,
                defaultMetadata: defaultMetadata,
                creator: {
                    type: CreatorType.System
                }
            }),
            signalService.create({
                signal: signal5,
                defaultMetadata: defaultMetadata,
                creator: {
                    type: CreatorType.System
                }
            })
        ])

        await expect(signalService.connect(signal1, signal2))
            .resolves
            .toBeUndefined()
        await expect(signalService.connect(signal2, signal3))
            .resolves
            .toBeUndefined()
        await expect(signalService.connect(signal3, signal4))
            .resolves
            .toBeUndefined()
        await expect(signalService.connect(signal4, signal5))
            .resolves
            .toBeUndefined()
        await expect(signalService.connect(signal5, signal3))
            .rejects
            .toBeInstanceOf(CyclicSignalsNotAllowed)
        await expect(signalService.connect(signal5, signal5))
            .rejects
            .toBeInstanceOf(CyclicSignalsNotAllowed)
        await expect(signalService.connect(signal1, signal3))
            .resolves
            .toBeUndefined()
        await expect(signalService.connect(signal1, signal4))
            .resolves
            .toBeUndefined()

        const [signal1Id, signal2Id, signal3Id, signal4Id, signal5Id] = await Promise.all([
            signalService.getSignalId(signal1),
            signalService.getSignalId(signal2),
            signalService.getSignalId(signal3),
            signalService.getSignalId(signal4),
            signalService.getSignalId(signal5)
        ])
        void [signal3Id, signal4Id, signal5Id]
        const signals = await signalGraphRepository.find()

        expect(signals).toEqual(
            expect.arrayContaining([
                { outSignalId: signal1Id, inSignalId: signal2Id },
                { outSignalId: signal2Id, inSignalId: signal3Id },
                { outSignalId: signal3Id, inSignalId: signal4Id },
                { outSignalId: signal4Id, inSignalId: signal5Id },
                { outSignalId: signal1Id, inSignalId: signal3Id },
                { outSignalId: signal1Id, inSignalId: signal4Id }
            ])
        )

        await expect(signalService.unconnect(signal1, signal2))
            .resolves
            .toBeUndefined()
        await expect(signalService.unconnect(signal2, signal3))
            .resolves
            .toBeUndefined()
        await expect(signalService.unconnect(signal3, signal4))
            .resolves
            .toBeUndefined()
        await expect(signalService.unconnect(signal4, signal5))
            .resolves
            .toBeUndefined()
        await expect(signalService.unconnect(signal1, signal3))
            .resolves
            .toBeUndefined()
        await expect(signalService.unconnect(signal1, signal4))
            .resolves
            .toBeUndefined()

        await expect(signalGraphRepository.find()).resolves.toHaveLength(0)

        const eventContext1: EventContext = {
            type: SignalEventMutation.Connect,
            signalId: await signalService.getSignalId(signal1) as number
        }
        const eventContext2: EventContext = {
            type: SignalEventMutation.Unconnect,
            signalId: await signalService.getSignalId(signal1) as number
        }
        expect(signalMutationFn).toHaveBeenNthCalledWith(6, expect.objectContaining(eventContext1))
        expect(signalMutationFn).toHaveBeenNthCalledWith(12, expect.objectContaining(eventContext2))
        expect(signalMutationFn).toBeCalledTimes(17)

        container.restore()
    })

    it(`
        Попытка удалить сигнал к которому привязаны важные ресурсы приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const signalResourceRepository = connection.getRepository(SignalResource)
        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)

        const signal1 = {
            namespace: 'namespace',
            name: 'name1'
        }
        const defaultMetadata = null

        await signalService.create({
            signal: signal1,
            defaultMetadata: defaultMetadata,
            creator: {
                type: CreatorType.System
            }
        })

        const signal1Id = await signalService.getSignalId(signal1) as number

        await signalResourceRepository.save({
            signal: { id: signal1Id } as Signal
        })

        await expect(signalService.remove(signal1)).rejects.toBeInstanceOf(SignalUsedError)

        container.restore()
    })

    it(`
        Сигнал корректно и полностью удаляется. При удалении сигнал пытается полностью удалить привязанные
        к нему методы. В противном случае, методы только отвязываются
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(VM_SYMBOL.VMService)
            .to(getVMService({
                error: () => {},
                info: () => ({} as any),
                on: () => {},
                remove: () => {},
                run: async () => Symbol('name'),
                stats: async () => [],
                listScripts: () => []
            }))
            .inSingletonScope()

        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)
        const methodService = container
            .get<IMethodService>(METHOD_SYMBOL.MethodService)
        const methodRepository = connection.getRepository(Method)
        const signalGraphRepository = connection.getRepository(SignalGraph)
        const signalRepository = connection.getRepository(Signal)
        const metadataRepository = connection.getRepository(Metadata)

        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name'
        }
        const method2 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name2'
        }
        const signal1 = {
            namespace: 'namespace',
            name: 'name1'
        }
        const signal2 = {
            namespace: 'namespace',
            name: 'name2'
        }
        const defaultMetadata = null

        const signalMutationFn = jest.fn()
        expect(signalService.onSignalMutation(signalMutationFn)).toBeUndefined()

        await signalService.create({
            signal: signal1,
            defaultMetadata: defaultMetadata,
            creator: {
                type: CreatorType.System
            }
        })
        await signalService.create({
            signal: signal2,
            defaultMetadata: defaultMetadata,
            creator: {
                type: CreatorType.System
            }
        })
        await methodService.method({
            ...method1,
            handler: () => {},
            scriptId: Symbol('name'),
            creator: {
                type: CreatorType.System
            }
        })
        await methodService.method({
            ...method2,
            handler: () => {},
            scriptId: Symbol('name'),
            creator: {
                type: CreatorType.System
            }
        })
        await signalService.addValidator(signal1, method1)
        await signalService.addValidator(signal1, method2)
        await signalService.addValidator(signal2, method1)
        await signalService.addGuard(signal1, method1)
        await signalService.addGuard(signal1, method2)
        await signalService.addGuard(signal2, method1)
        await signalService.addFilter(signal1, method1)
        await signalService.addFilter(signal1, method2)
        await signalService.addFilter(signal2, method1)
        await signalService.connect(signal1, signal2)

        await expect(metadataRepository.count()).resolves.toBe(2)
        await expect(signalService.remove(signal1)).resolves.toBeUndefined()
        await expect(signalGraphRepository.find()).resolves.toHaveLength(0)
        await expect(metadataRepository.find()).resolves.toHaveLength(1)
        await expect(signalService.remove(signal2)).resolves.toBeUndefined()
        await expect(metadataRepository.find()).resolves.toHaveLength(0)
        await expect(methodRepository.find()).resolves.toHaveLength(0)
        await expect(signalRepository.find()).resolves.toHaveLength(0)

        const eventContext: EventContext = {
            type: SignalEventMutation.Remove,
            signalId: await signalService.getSignalId(signal1) as number
        }
        expect(signalMutationFn).toHaveBeenNthCalledWith(13, expect.objectContaining(eventContext))
        expect(signalMutationFn).toBeCalledTimes(14)

        container.restore()
    })

})