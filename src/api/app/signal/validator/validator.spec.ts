import { getContainer } from '../../../../inversify.config'
import { IValidatorService } from './validator.interface'
import {
    ValidatorMethodNotDefined,
    ValidatorAlreadyExists,
    ValidatorDoesNotExists
} from './validator.errors'
import { SIGNAL_SYMBOL } from '../signal.types'
import { ValidatorEventMutation } from './validator.types'
import { CreatorType, CREATOR_SYMBOL, ResourceType } from '../../creator/creator.types'
import { ICreatorService } from '../../creator/creator.interface'
import { Method } from '../../entities/method.entity'
import { Connection } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { Metadata } from '../../entities/metadata.entity'
import { Validator } from '../../entities/signal.entity'
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

describe('ValidatorService в SignalModule', () => {

    it(`
        Попытка создать ресурс валидатора с несуществующим методом приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const validatorService = container
            .get<IValidatorService>(SIGNAL_SYMBOL.ValidatorService)

        const eventMutationFn = jest.fn()
        validatorService.onMutation(eventMutationFn)

        const validator = {
            namespace: 'validator1',
            name: 'validator1'
        }

        const method = {
            namespace: 'method1',
            type: 'method1',
            name: 'method1'
        }

        await expect(validatorService.create({
            creator: {
                type: CreatorType.System
            },
            method: method,
            ...validator
        })).rejects.toBeInstanceOf(ValidatorMethodNotDefined)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })

    it(`
        Ресурс валидатора корректно создаётся вместе с метаданными. Попытка создать ресурс
        валидатора, который уже существует приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const validatorService = container
            .get<IValidatorService>(SIGNAL_SYMBOL.ValidatorService)
        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const metadataRepository = connection.getRepository(Metadata)

        const eventMutationFn = jest.fn()
        validatorService.onMutation(eventMutationFn)

        const validator = {
            namespace: 'validator1',
            name: 'validator1'
        }

        const method = {
            namespace: 'method1',
            type: 'method1',
            name: 'method1'
        }
        await methodRepository.save(method)

        await expect(metadataRepository.count()).resolves.toBe(0)
        await expect(validatorService.isExists(validator)).resolves.toBe(false)
        await expect(validatorService.create({
            ...validator,
            creator: {
                type: CreatorType.System
            },
            method: method
        })).resolves.toBeUndefined()
        await expect(validatorService.create({
            ...validator,
            creator: {
                type: CreatorType.System
            },
            method: method
        })).rejects.toBeInstanceOf(ValidatorAlreadyExists)
        await expect(validatorService.isExists(validator)).resolves.toBe(true)
        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect(creatorService.isResourceCreator({
            type: ResourceType.Validator,
            id: 1
        }, {
            type: CreatorType.System
        })).resolves.toBe(true)

        expect(eventMutationFn).toBeCalledTimes(1)
        expect(eventMutationFn).nthCalledWith(1, {
            type: ValidatorEventMutation.Create,
            validatorId: 1
        })

        container.restore()
    })

    it(`
        Попытка привязать метаданные к несуществующему валидатору приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const validatorService = container
            .get<IValidatorService>(SIGNAL_SYMBOL.ValidatorService)

        const eventMutationFn = jest.fn()
        validatorService.onMutation(eventMutationFn)

        const validator = {
            namespace: 'validator1',
            name: 'validator1'
        }

        await expect(validatorService.setMetadata(validator, {
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(ValidatorDoesNotExists)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })

    it(`
        Метаданные корректно изменяются в валидаторе и корректно считываются. Попытка установить
        метаданные некорректной редакции приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const validatorService = container
            .get<IValidatorService>(SIGNAL_SYMBOL.ValidatorService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const metadataRepository = connection.getRepository(Metadata)
        const validatorRepository = connection.getRepository(Validator)

        const eventMutationFn = jest.fn()
        validatorService.onMutation(eventMutationFn)

        const validator = {
            namespace: 'validator1',
            name: 'validator1'
        }
        const method = {
            namespace: 'method1',
            type: 'method1',
            name: 'method1'
        }

        await methodRepository.save(method)
        await validatorService.create({
            ...validator,
            creator: {
                type: CreatorType.System
            },
            method: method
        })

        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect(validatorRepository.findOne({
            where: validator
        }).then(entity => {
            return type<Validator>(entity).metadata
        })).resolves.toMatchObject({
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })
        await expect(validatorService.setMetadata(validator, {
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 0
        })).resolves.toBeUndefined()
        await expect(validatorRepository.findOne({
            where: validator
        }).then(entity => {
            return type<Validator>(entity).metadata
        })).resolves.toMatchObject({
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 1
        })
        await expect(validatorService.setMetadata(validator, {
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(RevisionNumberError)
        await expect(validatorRepository.findOne({
            where: validator
        }).then(entity => {
            return type<Validator>(entity).metadata
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
            type: ValidatorEventMutation.SetMetadata,
            validatorId: 1
        }))

        container.restore()
    })

    it(`
        Ресурс валидатора корректно удаляется вместе с метаданными. При удалении будет произведена попытка
        удалить и метод. Попытка удалить несуществующий валидатор ни к чему не приведёт
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const validatorService = container
            .get<IValidatorService>(SIGNAL_SYMBOL.ValidatorService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const metadataRepository = connection.getRepository(Metadata)
        const validatorRepository = connection.getRepository(Validator)

        const eventMutationFn = jest.fn()
        validatorService.onMutation(eventMutationFn)

        const validator = {
            namespace: 'validator1',
            name: 'validator1'
        }
        const method = {
            namespace: 'method1',
            type: 'method1',
            name: 'method1'
        }

        await methodRepository.save(method)
        await validatorService.create({
            ...validator,
            creator: {
                type: CreatorType.System
            },
            method: method
        })

        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect(methodRepository.count()).resolves.toBe(1)
        await expect(validatorRepository.count()).resolves.toBe(1)
        await expect(validatorService.isExists(validator)).resolves.toBe(true)

        await expect(validatorService.remove(validator)).resolves.toBeUndefined()
        await expect(validatorService.remove(validator)).resolves.toBeUndefined()

        await expect(metadataRepository.count()).resolves.toBe(0)
        await expect(methodRepository.count()).resolves.toBe(0)
        await expect(validatorRepository.count()).resolves.toBe(0)
        await expect(validatorService.isExists(validator)).resolves.toBe(false)

        expect(eventMutationFn).toBeCalledTimes(2)
        expect(eventMutationFn).nthCalledWith(2, expect.objectContaining({
            type: ValidatorEventMutation.Remove,
            validatorId: 1
        }))

        container.restore()
    })

})