import { getContainer } from '../../../../inversify.config'
import { IFilterService } from './filter.interface'
import {
    FilterMethodNotDefined,
    FilterAlreadyExists,
    FilterDoesNotExists
} from './filter.errors'
import { SIGNAL_SYMBOL } from '../signal.types'
import { FilterEventMutation } from './filter.types'
import { CreatorType, CREATOR_SYMBOL, ResourceType } from '../../creator/creator.types'
import { ICreatorService } from '../../creator/creator.interface'
import { Method } from '../../entities/method.entity'
import { Connection } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { Metadata } from '../../entities/metadata.entity'
import { Filter } from '../../entities/signal.entity'
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

describe('FilterService в SignalModule', () => {

    it(`
        Попытка создать ресурс фильтра с несуществующим методом приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const filterService = container
            .get<IFilterService>(SIGNAL_SYMBOL.FilterService)

        const eventMutationFn = jest.fn()
        filterService.onMutation(eventMutationFn)

        const filter = {
            namespace: 'filter1',
            name: 'filter1'
        }

        const method = {
            namespace: 'method1',
            type: 'method1',
            name: 'method1'
        }

        await expect(filterService.create({
            creator: {
                type: CreatorType.System
            },
            method: method,
            ...filter
        })).rejects.toBeInstanceOf(FilterMethodNotDefined)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })

    it(`
        Ресурс фильтра корректно создаётся вместе с метаданными. Попытка создать ресурс
        фильтра, который уже существует приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const filterService = container
            .get<IFilterService>(SIGNAL_SYMBOL.FilterService)
        const creatorService = container
            .get<ICreatorService>(CREATOR_SYMBOL.CreatorService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const metadataRepository = connection.getRepository(Metadata)

        const eventMutationFn = jest.fn()
        filterService.onMutation(eventMutationFn)

        const filter = {
            namespace: 'filter1',
            name: 'filter1'
        }

        const method = {
            namespace: 'method1',
            type: 'method1',
            name: 'method1'
        }
        await methodRepository.save(method)

        await expect(metadataRepository.count()).resolves.toBe(0)
        await expect(filterService.isExists(filter)).resolves.toBe(false)
        await expect(filterService.create({
            ...filter,
            creator: {
                type: CreatorType.System
            },
            method: method
        })).resolves.toBeUndefined()
        await expect(filterService.create({
            ...filter,
            creator: {
                type: CreatorType.System
            },
            method: method
        })).rejects.toBeInstanceOf(FilterAlreadyExists)
        await expect(filterService.isExists(filter)).resolves.toBe(true)
        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect(creatorService.isResourceCreator({
            type: ResourceType.Filter,
            id: 1
        }, {
            type: CreatorType.System
        })).resolves.toBe(true)

        expect(eventMutationFn).toBeCalledTimes(1)
        expect(eventMutationFn).nthCalledWith(1, {
            type: FilterEventMutation.Create,
            filterId: 1
        })

        container.restore()
    })

    it(`
        Попытка привязать метаданные к несуществующему фильтру приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const filterService = container
            .get<IFilterService>(SIGNAL_SYMBOL.FilterService)

        const eventMutationFn = jest.fn()
        filterService.onMutation(eventMutationFn)

        const filter = {
            namespace: 'filter1',
            name: 'filter1'
        }

        await expect(filterService.setMetadata(filter, {
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(FilterDoesNotExists)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })

    it(`
        Метаданные корректно изменяются в фильтре и корректно считываются. Попытка установить
        метаданные некорректной редакции приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const filterService = container
            .get<IFilterService>(SIGNAL_SYMBOL.FilterService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const metadataRepository = connection.getRepository(Metadata)
        const filterRepository = connection.getRepository(Filter)

        const eventMutationFn = jest.fn()
        filterService.onMutation(eventMutationFn)

        const filter = {
            namespace: 'filter1',
            name: 'filter1'
        }
        const method = {
            namespace: 'method1',
            type: 'method1',
            name: 'method1'
        }

        await methodRepository.save(method)
        await filterService.create({
            ...filter,
            creator: {
                type: CreatorType.System
            },
            method: method
        })

        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect(filterRepository.findOne({
            where: filter
        }).then(entity => {
            return type<Filter>(entity).metadata
        })).resolves.toMatchObject({
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })
        await expect(filterService.setMetadata(filter, {
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 0
        })).resolves.toBeUndefined()
        await expect(filterRepository.findOne({
            where: filter
        }).then(entity => {
            return type<Filter>(entity).metadata
        })).resolves.toMatchObject({
            metadata: {
                custom: {
                    test: 'test'
                }
            },
            revisionNumber: 1
        })
        await expect(filterService.setMetadata(filter, {
            metadata: {
                custom: null
            },
            revisionNumber: 0
        })).rejects.toBeInstanceOf(RevisionNumberError)
        await expect(filterRepository.findOne({
            where: filter
        }).then(entity => {
            return type<Filter>(entity).metadata
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
            type: FilterEventMutation.SetMetadata,
            filterId: 1
        }))

        container.restore()
    })

    it(`
        Ресурс фильтра корректно удаляется вместе с метаданными. При удалении будет произведена попытка
        удалить и метод. Попытка удалить несуществующий фильтр ни к чему не приведёт
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const filterService = container
            .get<IFilterService>(SIGNAL_SYMBOL.FilterService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const methodRepository = connection.getRepository(Method)
        const metadataRepository = connection.getRepository(Metadata)
        const filterRepository = connection.getRepository(Filter)

        const eventMutationFn = jest.fn()
        filterService.onMutation(eventMutationFn)

        const filter = {
            namespace: 'filter1',
            name: 'filter1'
        }
        const method = {
            namespace: 'method1',
            type: 'method1',
            name: 'method1'
        }

        await methodRepository.save(method)
        await filterService.create({
            ...filter,
            creator: {
                type: CreatorType.System
            },
            method: method
        })

        await expect(metadataRepository.count()).resolves.toBe(1)
        await expect(methodRepository.count()).resolves.toBe(1)
        await expect(filterRepository.count()).resolves.toBe(1)
        await expect(filterService.isExists(filter)).resolves.toBe(true)

        await expect(filterService.remove(filter)).resolves.toBeUndefined()
        await expect(filterService.remove(filter)).resolves.toBeUndefined()

        await expect(metadataRepository.count()).resolves.toBe(0)
        await expect(methodRepository.count()).resolves.toBe(0)
        await expect(filterRepository.count()).resolves.toBe(0)
        await expect(filterService.isExists(filter)).resolves.toBe(false)

        expect(eventMutationFn).toBeCalledTimes(2)
        expect(eventMutationFn).nthCalledWith(2, expect.objectContaining({
            type: FilterEventMutation.Remove,
            filterId: 1
        }))

        container.restore()
    })

})