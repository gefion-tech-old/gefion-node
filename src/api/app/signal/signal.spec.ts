import { getContainer } from '../../../inversify.config'
import { SIGNAL_SYMBOL, SignalEventMutation } from './signal.types'
import { ISignalService } from './signal.interface'
import {
    SignalDoesNotExist,
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
import { 
    Signal, 
    SignalGraph,
    Guard,
    Filter,
    Validator,
    SignalValidator,
    SignalFilter,
    SignalGuard
} from '../entities/signal.entity'
import { Method } from '../entities/method.entity'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { CreatorType, ResourceType } from '../creator/creator.types'
import { ICreatorService } from '../creator/creator.interface'
import { CREATOR_SYMBOL } from '../creator/creator.types'
import { getCreatorService } from '../creator/__mock/getCreatorService.mock'
import { addTestEntity } from '../../../core/typeorm/utils/test-entities'
import { RevisionNumberError } from '../metadata/metadata.errors'
import { Metadata } from '../entities/metadata.entity'
import { FilterDoesNotExists } from './filter/filter.errors'
import { GuardDoesNotExists } from './guard/guard.errors'
import { ValidatorDoesNotExists } from './validator/validator.errors'

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
        expect(signalService.onMutation(signalMutationFn)).toBeUndefined()

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

        expect(signalMutationFn).toBeCalledTimes(1)
        expect(signalMutationFn).toHaveBeenNthCalledWith(1, expect.objectContaining({
            type: SignalEventMutation.Create,
            signalId: 1
        }))

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
        expect(signalService.onMutation(signalMutationFn)).toBeUndefined()

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
        
        expect(signalMutationFn).toBeCalledTimes(2)
        expect(signalMutationFn).toHaveBeenNthCalledWith(2, expect.objectContaining({
            type: SignalEventMutation.SetCustomMetadata,
            signalId: 1
        }))

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

        const signalMutationFn = jest.fn()
        expect(signalService.onMutation(signalMutationFn)).toBeUndefined()

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

        expect(signalMutationFn).toBeCalledTimes(0)

        container.restore()
    })

    it(`
        Попытка добавить валидатор/охранник/фильтр в несуществующий сигнал завершается ошибкой
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)

        const signalMutationFn = jest.fn()
        expect(signalService.onMutation(signalMutationFn)).toBeUndefined()

        const resource = {
            namespace: 'namespace',
            name: 'name'
        }
        const signal1 = {
            namespace: 'namespace',
            name: 'name'
        }

        await expect(signalService.addValidator(signal1, resource))
            .rejects
            .toBeInstanceOf(SignalDoesNotExist)
        await expect(signalService.addGuard(signal1, resource))
            .rejects
            .toBeInstanceOf(SignalDoesNotExist)
        await expect(signalService.addFilter(signal1, resource))
            .rejects
            .toBeInstanceOf(SignalDoesNotExist)

        expect(signalMutationFn).toBeCalledTimes(0)

        container.restore()
    })

    it(`
        Попытка добавить несуществующий ресурс валидатора/охранника/фильтра в сигнал завершается
        ошибкой
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)

        const signalMutationFn = jest.fn()
        expect(signalService.onMutation(signalMutationFn)).toBeUndefined()

        const resource = {
            namespace: 'namespace',
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

        await expect(signalService.addValidator(signal1, resource))
            .rejects
            .toBeInstanceOf(ValidatorDoesNotExists)
        await expect(signalService.addGuard(signal1, resource))
            .rejects
            .toBeInstanceOf(GuardDoesNotExists)
        await expect(signalService.addFilter(signal1, resource))
            .rejects
            .toBeInstanceOf(FilterDoesNotExists)

        expect(signalMutationFn).toBeCalledTimes(1)

        container.restore()
    })

    it(`
        Попытка повторной привязки валидатора/охранника/фильтра к сигналу приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const guardRepository = connection.getRepository(Guard)
        const filterRepository = connection.getRepository(Filter)
        const validatorRepository = connection.getRepository(Validator)

        const signalMutationFn = jest.fn()
        expect(signalService.onMutation(signalMutationFn)).toBeUndefined()

        const method = {
            namespace: 'namespace',
            type: 'type',
            name: 'name'
        }
        /**
         * Если не указывать метаданные и остальное отдельно, typeorm будет ориентируясь на один объект херачить
         * везде одинаковый идентификатор метаданных
         */
        const getResource = (name: string) => {
            return {
                namespace: 'namespace',
                metadata: {
                    metadata: {
                        custom: name
                    }
                },
                method: method,
                name: name
            }
        }
        const signal1 = {
            namespace: 'namespace',
            name: 'name'
        }
        const defaultMetadata = true


        await methodRepository.save(method)
        
        await signalService.create({
            signal: signal1,
            defaultMetadata: defaultMetadata,
            creator: {
                type: CreatorType.System
            }
        })
        await guardRepository.save(getResource('resource'))
        await filterRepository.save(getResource('resource'))
        await validatorRepository.save(getResource('resource'))

        await expect(signalService.addValidator(signal1, getResource('resource')))
            .resolves
            .toBeUndefined()
        await expect(signalService.addValidator(signal1, getResource('resource')))
            .rejects
            .toBeInstanceOf(ValidatorAlreadyBound)
        await expect(signalService.addGuard(signal1, getResource('resource')))
            .resolves
            .toBeUndefined()
        await expect(signalService.addGuard(signal1, getResource('resource')))
            .rejects
            .toBeInstanceOf(GuardAlreadyBound)
        await expect(signalService.addFilter(signal1, getResource('resource')))
            .resolves
            .toBeUndefined()
        await expect(signalService.addFilter(signal1, getResource('resource')))
            .rejects
            .toBeInstanceOf(FilterAlreadyBound)

        expect(signalMutationFn).toBeCalledTimes(4)
        expect(signalMutationFn).toHaveBeenNthCalledWith(2, expect.objectContaining({
            type: SignalEventMutation.AddValidator,
            signalId: 1,
            validatorId: 1
        }))
        expect(signalMutationFn).toHaveBeenNthCalledWith(3, expect.objectContaining({
            type: SignalEventMutation.AddGuard,
            signalId: 1,
            guardId: 1
        }))
        expect(signalMutationFn).toHaveBeenNthCalledWith(4, expect.objectContaining({
            type: SignalEventMutation.AddFilter,
            signalId: 1,
            filterId: 1
        }))

        container.restore()
    })

    it(`
        Валидатор/охранник/фильтр успешно добавляется в пул валидаторов/охранников/фильтров
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const signalRepository = connection.getRepository(Signal)
        const methodRepository = connection.getRepository(Method)
        const guardRepository = connection.getRepository(Guard)
        const filterRepository = connection.getRepository(Filter)
        const validatorRepository = connection.getRepository(Validator)
        const signalValidatorRepository = connection.getRepository(SignalValidator)
        const signalFilterRepository = connection.getRepository(SignalFilter)
        const signalGuardRepository = connection.getRepository(SignalGuard)
        const metadataRepository = connection.getRepository(Metadata)

        const method = {
            namespace: 'namespace',
            type: 'type',
            name: 'name'
        }

        /**
         * Если не указывать метаданные и остальное отдельно, typeorm будет ориентируясь на один объект херачить
         * везде одинаковый идентификатор метаданных
         */
        const getResource = (name: string) => {
            return {
                namespace: 'namespace',
                metadata: {
                    metadata: {
                        custom: name
                    }
                },
                method: method,
                name: name
            }
        }

        const signal1 = {
            namespace: 'namespace',
            name: 'name'
        }
        const defaultMetadata = true
        
        const signalMutationFn = jest.fn()
        expect(signalService.onMutation(signalMutationFn)).toBeUndefined()
        await expect(methodRepository.count()).resolves.toBe(0)
        await expect(signalRepository.count()).resolves.toBe(0)
        await expect(guardRepository.count()).resolves.toBe(0)
        await expect(filterRepository.count()).resolves.toBe(0)
        await expect(validatorRepository.count()).resolves.toBe(0)
        await expect(signalGuardRepository.count()).resolves.toBe(0)
        await expect(signalFilterRepository.count()).resolves.toBe(0)
        await expect(signalValidatorRepository.count()).resolves.toBe(0)
        await expect(metadataRepository.count()).resolves.toBe(0)

        await methodRepository.save(method)

        await guardRepository.save([getResource('resource1'), getResource('resource2'), getResource('resource3')])
        await filterRepository.save([getResource('resource1'), getResource('resource2'), getResource('resource3')])
        await validatorRepository.save([getResource('resource1'), getResource('resource2'), getResource('resource3')])

        await signalService.create({
            signal: signal1,
            defaultMetadata: defaultMetadata,
            creator: {
                type: CreatorType.System
            }
        })

        await signalService.addValidator(signal1, getResource('resource1')),
        await signalService.addValidator(signal1, getResource('resource2')),
        await signalService.addValidator(signal1, getResource('resource3')),
        await signalService.addGuard(signal1, getResource('resource1')),
        await signalService.addGuard(signal1, getResource('resource2')),
        await signalService.addGuard(signal1, getResource('resource3')),
        await signalService.addFilter(signal1, getResource('resource1')),
        await signalService.addFilter(signal1, getResource('resource2')),
        await signalService.addFilter(signal1, getResource('resource3'))

        const signalEntity = await signalRepository.findOne({
            where: signal1,
            relations: ['signalValidators', 'signalGuards', 'signalFilters']
        })

        if (!signalEntity) {
            throw new Error('Непредвиденная ошибка')
        }

        expect(signalEntity.signalValidators).toHaveLength(3)
        expect(signalEntity.signalGuards).toHaveLength(3)
        expect(signalEntity.signalFilters).toHaveLength(3)

        await expect(methodRepository.count()).resolves.toBe(1)
        await expect(signalRepository.count()).resolves.toBe(1)
        await expect(guardRepository.count()).resolves.toBe(3)
        await expect(filterRepository.count()).resolves.toBe(3)
        await expect(validatorRepository.count()).resolves.toBe(3)
        await expect(signalGuardRepository.count()).resolves.toBe(3)
        await expect(signalFilterRepository.count()).resolves.toBe(3)
        await expect(signalValidatorRepository.count()).resolves.toBe(3)
        await expect(metadataRepository.count()).resolves.toBe(19)

        expect(signalMutationFn).toBeCalledTimes(10)
        expect(signalMutationFn).toHaveBeenNthCalledWith(2, expect.objectContaining({
            type: SignalEventMutation.AddValidator,
            signalId: 1,
            validatorId: 1
        }))
        expect(signalMutationFn).toHaveBeenNthCalledWith(3, expect.objectContaining({
            type: SignalEventMutation.AddValidator,
            signalId: 1,
            validatorId: 2
        }))
        expect(signalMutationFn).toHaveBeenNthCalledWith(4, expect.objectContaining({
            type: SignalEventMutation.AddValidator,
            signalId: 1,
            validatorId: 3
        }))
        expect(signalMutationFn).toHaveBeenNthCalledWith(5, expect.objectContaining({
            type: SignalEventMutation.AddGuard,
            signalId: 1,
            guardId: 1
        }))
        expect(signalMutationFn).toHaveBeenNthCalledWith(6, expect.objectContaining({
            type: SignalEventMutation.AddGuard,
            signalId: 1,
            guardId: 2
        }))
        expect(signalMutationFn).toHaveBeenNthCalledWith(7, expect.objectContaining({
            type: SignalEventMutation.AddGuard,
            signalId: 1,
            guardId: 3
        }))
        expect(signalMutationFn).toHaveBeenNthCalledWith(8, expect.objectContaining({
            type: SignalEventMutation.AddFilter,
            signalId: 1,
            filterId: 1
        }))
        expect(signalMutationFn).toHaveBeenNthCalledWith(9, expect.objectContaining({
            type: SignalEventMutation.AddFilter,
            signalId: 1,
            filterId: 2
        }))
        expect(signalMutationFn).toHaveBeenNthCalledWith(10, expect.objectContaining({
            type: SignalEventMutation.AddFilter,
            signalId: 1,
            filterId: 3
        }))

        container.restore()
    })

    it(`
        Попытка удалить валидатор/охранник/фильтр из несуществующего сигнала приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)

        const signalMutationFn = jest.fn()
        expect(signalService.onMutation(signalMutationFn)).toBeUndefined()

        const resource = {
            namespace: 'namespace',
            name: 'name'
        }
        const signal1 = {
            namespace: 'namespace',
            name: 'name'
        }

        await expect(signalService.removeValidator(signal1, resource))
            .rejects
            .toBeInstanceOf(SignalDoesNotExist)
        await expect(signalService.removeGuard(signal1, resource))
            .rejects
            .toBeInstanceOf(SignalDoesNotExist)
        await expect(signalService.removeFilter(signal1, resource))
            .rejects
            .toBeInstanceOf(SignalDoesNotExist)

        expect(signalMutationFn).toBeCalledTimes(0)

        container.restore()
    })

    it(`
        Попытка удалить несуществующий валидатор/охранник/фильтр из сигнала приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)

        const signalMutationFn = jest.fn()
        expect(signalService.onMutation(signalMutationFn)).toBeUndefined()

        const resource = {
            namespace: 'namespace',
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

        await expect(signalService.removeValidator(signal1, resource))
            .rejects
            .toBeInstanceOf(ValidatorDoesNotExists)
        await expect(signalService.removeGuard(signal1, resource))
            .rejects
            .toBeInstanceOf(GuardDoesNotExists)
        await expect(signalService.removeFilter(signal1, resource))
            .rejects
            .toBeInstanceOf(FilterDoesNotExists)

        expect(signalMutationFn).toBeCalledTimes(1)

        container.restore()
    })

    it(`
        Валидатор/охранник/фильтр полностью и корректно удаляется из сигнала, если к методу не привязано больше 
        ресурсов, в противном случае сигнал отвязывается от метода, а сам метод не удаляется
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const signalRepository = connection.getRepository(Signal)
        const methodRepository = connection.getRepository(Method)
        const guardRepository = connection.getRepository(Guard)
        const filterRepository = connection.getRepository(Filter)
        const validatorRepository = connection.getRepository(Validator)
        const signalValidatorRepository = connection.getRepository(SignalValidator)
        const signalFilterRepository = connection.getRepository(SignalFilter)
        const signalGuardRepository = connection.getRepository(SignalGuard)
        const metadataRepository = connection.getRepository(Metadata)

        const method = {
            namespace: 'namespace',
            type: 'type',
            name: 'name'
        }
        /**
         * Если не указывать метаданные и остальное отдельно, typeorm будет ориентируясь на один объект херачить
         * везде одинаковый идентификатор метаданных
         */
        const getResource = (name: string) => {
            return {
                namespace: 'namespace',
                metadata: {
                    metadata: {
                        custom: name
                    }
                },
                method: method,
                name: name
            }
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
        expect(signalService.onMutation(signalMutationFn)).toBeUndefined()
        await expect(methodRepository.count()).resolves.toBe(0)
        await expect(signalRepository.count()).resolves.toBe(0)
        await expect(guardRepository.count()).resolves.toBe(0)
        await expect(filterRepository.count()).resolves.toBe(0)
        await expect(validatorRepository.count()).resolves.toBe(0)
        await expect(signalGuardRepository.count()).resolves.toBe(0)
        await expect(signalFilterRepository.count()).resolves.toBe(0)
        await expect(signalValidatorRepository.count()).resolves.toBe(0)
        await expect(metadataRepository.count()).resolves.toBe(0)

        await methodRepository.save(method)

        await guardRepository.save([getResource('resource1'), getResource('resource2')])
        await filterRepository.save([getResource('resource1'), getResource('resource2')])
        await validatorRepository.save([getResource('resource1'), getResource('resource2')])

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

        await signalService.addValidator(signal1, getResource('resource1'))
        await signalService.addValidator(signal1, getResource('resource2'))
        await signalService.addValidator(signal2, getResource('resource1'))
        await signalService.addGuard(signal1, getResource('resource1'))
        await signalService.addGuard(signal1, getResource('resource2'))
        await signalService.addGuard(signal2, getResource('resource1'))
        await signalService.addFilter(signal1, getResource('resource1'))
        await signalService.addFilter(signal1, getResource('resource2'))
        await signalService.addFilter(signal2, getResource('resource1'))

        await expect(signalService.removeValidator(signal1, getResource('resource1')))
            .resolves
            .toBeUndefined()
        await expect(signalService.removeValidator(signal1, getResource('resource2')))
            .resolves
            .toBeUndefined()
        await expect(signalService.removeGuard(signal1, getResource('resource1')))
            .resolves
            .toBeUndefined()
        await expect(signalService.removeGuard(signal1, getResource('resource2')))
            .resolves
            .toBeUndefined()
        await expect(signalService.removeFilter(signal1, getResource('resource1')))
            .resolves
            .toBeUndefined()
        await expect(signalService.removeFilter(signal1, getResource('resource2')))
            .resolves
            .toBeUndefined()

        expect((await signalRepository.findOne({
            where: signal1,
            relations: ['signalValidators']
        }))?.signalValidators).toHaveLength(0)
        expect((await signalRepository.findOne({
            where: signal2,
            relations: ['signalValidators']
        }))?.signalValidators).toHaveLength(1)
        expect((await signalRepository.findOne({
            where: signal1,
            relations: ['signalGuards']
        }))?.signalGuards).toHaveLength(0)
        expect((await signalRepository.findOne({
            where: signal2,
            relations: ['signalGuards']
        }))?.signalGuards).toHaveLength(1)
        expect((await signalRepository.findOne({
            where: signal1,
            relations: ['signalFilters']
        }))?.signalFilters).toHaveLength(0)
        expect((await signalRepository.findOne({
            where: signal2,
            relations: ['signalFilters']
        }))?.signalFilters).toHaveLength(1)

        await expect(signalService.removeValidator(signal2, getResource('resource1')))
            .resolves
            .toBeUndefined()
        await expect(signalService.removeGuard(signal2, getResource('resource1')))
            .resolves
            .toBeUndefined()
        await expect(signalService.removeFilter(signal2, getResource('resource1')))
            .resolves
            .toBeUndefined()
        
        expect((await signalRepository.findOne({
            where: signal2,
            relations: ['signalValidators']
        }))?.signalValidators).toHaveLength(0)
        expect((await signalRepository.findOne({
            where: signal2,
            relations: ['signalGuards']
        }))?.signalGuards).toHaveLength(0)
        expect((await signalRepository.findOne({
            where: signal2,
            relations: ['signalFilters']
        }))?.signalFilters).toHaveLength(0)

        await expect(methodRepository.count()).resolves.toBe(1)
        await expect(signalRepository.count()).resolves.toBe(2)
        await expect(guardRepository.count()).resolves.toBe(2)
        await expect(filterRepository.count()).resolves.toBe(2)
        await expect(validatorRepository.count()).resolves.toBe(2)
        await expect(signalGuardRepository.count()).resolves.toBe(0)
        await expect(signalFilterRepository.count()).resolves.toBe(0)
        await expect(signalValidatorRepository.count()).resolves.toBe(0)
        await expect(metadataRepository.count()).resolves.toBe(8)

        expect(signalMutationFn).toBeCalledTimes(20)
        expect(signalMutationFn).nthCalledWith(12, expect.objectContaining({
            type: SignalEventMutation.RemoveValidator,
            signalId: 1,
            validatorId: 1
        }))
        expect(signalMutationFn).nthCalledWith(13, expect.objectContaining({
            type: SignalEventMutation.RemoveValidator,
            signalId: 1,
            validatorId: 2
        }))
        expect(signalMutationFn).nthCalledWith(14, expect.objectContaining({
            type: SignalEventMutation.RemoveGuard,
            signalId: 1,
            guardId: 1
        }))
        expect(signalMutationFn).nthCalledWith(15, expect.objectContaining({
            type: SignalEventMutation.RemoveGuard,
            signalId: 1,
            guardId: 2
        }))
        expect(signalMutationFn).nthCalledWith(16, expect.objectContaining({
            type: SignalEventMutation.RemoveFilter,
            signalId: 1,
            filterId: 1
        }))
        expect(signalMutationFn).nthCalledWith(17, expect.objectContaining({
            type: SignalEventMutation.RemoveFilter,
            signalId: 1,
            filterId: 2
        }))
        expect(signalMutationFn).nthCalledWith(18, expect.objectContaining({
            type: SignalEventMutation.RemoveValidator,
            signalId: 2,
            validatorId: 1
        }))
        expect(signalMutationFn).nthCalledWith(19, expect.objectContaining({
            type: SignalEventMutation.RemoveGuard,
            signalId: 2,
            guardId: 1
        }))
        expect(signalMutationFn).nthCalledWith(20, expect.objectContaining({
            type: SignalEventMutation.RemoveFilter,
            signalId: 2,
            filterId: 1
        }))

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

        const signalMutationFn = jest.fn()
        expect(signalService.onMutation(signalMutationFn)).toBeUndefined()

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

        expect(signalMutationFn).toBeCalledTimes(1)

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

        const signalMutationFn = jest.fn()
        expect(signalService.onMutation(signalMutationFn)).toBeUndefined()
        
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

        expect(signalMutationFn).toBeCalledTimes(3)
        expect(signalMutationFn).nthCalledWith(3, {
            type: SignalEventMutation.Connect,
            signalId: 1,
            intoSignalId: 2
        })

        container.restore()
    })

    it(`
        Сигналы корректно соединяются и отсоединяются. Попытка породить циклические
        сигналы приводит к исключению. Повторная попытка присоединить или отсоединить сигналы ни
        к чему не приводит
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
        expect(signalService.onMutation(signalMutationFn)).toBeUndefined()

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

        /**
         * Холостая попытка соединить уже соединённые сигналы. Нужно для проверки того,
         * что событие не срабатывает для таких случаев
         */
        await expect(signalService.connect(signal1, signal4))
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

        /**
         * Холостая попытка отвязать несоединённые сигналы. Нужно для проверки того,
         * что событие не срабатывает для таких случаев
         */
        await expect(signalService.unconnect(signal1, signal4))
            .resolves
            .toBeUndefined()
        await expect(signalService.unconnect(signal1, signal4))
            .resolves
            .toBeUndefined()

        await expect(signalGraphRepository.find()).resolves.toHaveLength(0)

        expect(signalMutationFn).toBeCalledTimes(17)
        expect(signalMutationFn).nthCalledWith(6, expect.objectContaining({
            type: SignalEventMutation.Connect,
            signalId: 1,
            intoSignalId: 2
        }))
        expect(signalMutationFn).nthCalledWith(7, expect.objectContaining({
            type: SignalEventMutation.Connect,
            signalId: 2,
            intoSignalId: 3
        }))
        expect(signalMutationFn).nthCalledWith(8, expect.objectContaining({
            type: SignalEventMutation.Connect,
            signalId: 3,
            intoSignalId: 4
        }))
        expect(signalMutationFn).nthCalledWith(12, expect.objectContaining({
            type: SignalEventMutation.Unconnect,
            signalId: 1,
            intoSignalId: 2
        }))
        expect(signalMutationFn).nthCalledWith(13, expect.objectContaining({
            type: SignalEventMutation.Unconnect,
            signalId: 2,
            intoSignalId: 3
        }))
        expect(signalMutationFn).nthCalledWith(14, expect.objectContaining({
            type: SignalEventMutation.Unconnect,
            signalId: 3,
            intoSignalId: 4
        }))

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

        const signalMutationFn = jest.fn()
        expect(signalService.onMutation(signalMutationFn)).toBeUndefined()

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

        expect(signalMutationFn).toBeCalledTimes(1)

        container.restore()
    })

    it(`
        Сигнал корректно и полностью удаляется вместе со всеми метаданными, связями и метаданными связей. Попытка
        удалить несуществующий сигнал ни к чему не приводит
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const signalRepository = connection.getRepository(Signal)
        const methodRepository = connection.getRepository(Method)
        const guardRepository = connection.getRepository(Guard)
        const filterRepository = connection.getRepository(Filter)
        const validatorRepository = connection.getRepository(Validator)
        const signalValidatorRepository = connection.getRepository(SignalValidator)
        const signalFilterRepository = connection.getRepository(SignalFilter)
        const signalGuardRepository = connection.getRepository(SignalGuard)
        const metadataRepository = connection.getRepository(Metadata)
        const signalGraphRepository = connection.getRepository(SignalGraph)

        const method = {
            namespace: 'namespace',
            type: 'type',
            name: 'name'
        }
        /**
         * Если не указывать метаданные и остальное отдельно, typeorm будет ориентируясь на один объект херачить
         * везде одинаковый идентификатор метаданных
         */
        const getResource = (name: string) => {
            return {
                namespace: 'namespace',
                metadata: {
                    metadata: {
                        custom: name
                    }
                },
                method: method,
                name: name
            }
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
        expect(signalService.onMutation(signalMutationFn)).toBeUndefined()
        await expect(methodRepository.count()).resolves.toBe(0)
        await expect(signalRepository.count()).resolves.toBe(0)
        await expect(guardRepository.count()).resolves.toBe(0)
        await expect(filterRepository.count()).resolves.toBe(0)
        await expect(validatorRepository.count()).resolves.toBe(0)
        await expect(signalGuardRepository.count()).resolves.toBe(0)
        await expect(signalFilterRepository.count()).resolves.toBe(0)
        await expect(signalValidatorRepository.count()).resolves.toBe(0)
        await expect(metadataRepository.count()).resolves.toBe(0)
        await expect(signalGraphRepository.count()).resolves.toBe(0)

        await methodRepository.save(method)
        await guardRepository.save([getResource('resource1'), getResource('resource2')])
        await filterRepository.save([getResource('resource1'), getResource('resource2')])
        await validatorRepository.save([getResource('resource1'), getResource('resource2')])

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

        await signalService.addValidator(signal1, getResource('resource1'))
        await signalService.addValidator(signal1, getResource('resource2'))
        await signalService.addValidator(signal2, getResource('resource1'))
        await signalService.addGuard(signal1, getResource('resource1'))
        await signalService.addGuard(signal1, getResource('resource2'))
        await signalService.addGuard(signal2, getResource('resource1'))
        await signalService.addFilter(signal1, getResource('resource1'))
        await signalService.addFilter(signal1, getResource('resource2'))
        await signalService.addFilter(signal2, getResource('resource1'))
        await signalService.connect(signal1, signal2)

        await expect(methodRepository.count()).resolves.toBe(1)
        await expect(signalRepository.count()).resolves.toBe(2)
        await expect(guardRepository.count()).resolves.toBe(2)
        await expect(filterRepository.count()).resolves.toBe(2)
        await expect(validatorRepository.count()).resolves.toBe(2)
        await expect(signalGuardRepository.count()).resolves.toBe(3)
        await expect(signalFilterRepository.count()).resolves.toBe(3)
        await expect(signalValidatorRepository.count()).resolves.toBe(3)
        await expect(metadataRepository.count()).resolves.toBe(17)
        await expect(signalGraphRepository.count()).resolves.toBe(1)

        await expect(signalService.remove(signal1)).resolves.toBeUndefined()
        await expect(signalService.remove(signal1)).resolves.toBeUndefined()

        await expect(signalRepository.count()).resolves.toBe(1)
        await expect(signalGuardRepository.count()).resolves.toBe(1)
        await expect(signalFilterRepository.count()).resolves.toBe(1)
        await expect(signalValidatorRepository.count()).resolves.toBe(1)
        await expect(metadataRepository.count()).resolves.toBe(10)
        await expect(signalGraphRepository.count()).resolves.toBe(0)

        await expect(signalService.remove(signal2)).resolves.toBeUndefined()
        await expect(signalService.remove(signal2)).resolves.toBeUndefined()

        await expect(signalRepository.count()).resolves.toBe(0)
        await expect(signalGuardRepository.count()).resolves.toBe(0)
        await expect(signalFilterRepository.count()).resolves.toBe(0)
        await expect(signalValidatorRepository.count()).resolves.toBe(0)
        await expect(metadataRepository.count()).resolves.toBe(6)
        await expect(signalGraphRepository.count()).resolves.toBe(0)

        expect(signalMutationFn).toBeCalledTimes(14)
        expect(signalMutationFn).toHaveBeenNthCalledWith(13, expect.objectContaining({
            type: SignalEventMutation.Remove,
            signalId: 1
        }))
        expect(signalMutationFn).toHaveBeenNthCalledWith(14, expect.objectContaining({
            type: SignalEventMutation.Remove,
            signalId: 2
        }))

        container.restore()
    })

})