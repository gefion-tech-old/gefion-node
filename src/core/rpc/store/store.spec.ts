import { getContainer } from '../../../inversify.config'
import { IStoreService } from './store.interface'
import { RPC_SYMBOL } from '../rpc.types'
import { FASTIFY_SYMBOL } from '../../fastify/fastify.types'
import { IFastifyService } from '../../fastify/fastify.interface'
import { TYPEORM_SYMBOL } from '../../typeorm/typeorm.types'
import { AddressInfo } from 'net'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('StoreService в RPCModule', () => {

    it(`
        Попытка получить идентификатор приложения и порты его реплик без предварительной инициализации
        в конечном счете приводит к тому, что синхронизация корректно запускается сама. Параллельные запуски
        синхронизации не конфликтуют друг с другом благодаря модулю atomic
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        /**
         * Инициализирую базу данных, которая будет использоваться
         */
        container.get(TYPEORM_SYMBOL.TypeOrmConnectionApp)

        const services: {
            rpc: IStoreService
            fastify: IFastifyService
        }[] = []

        for (let i = 0; i < 3; i++) {
            container.snapshot()

            services.push({
                rpc: container
                    .get<IStoreService>(RPC_SYMBOL.RPCStoreService),
                fastify: container
                    .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
            })
            
            container.restore()
        }
        
        const appIds = await Promise.all(services.map(service => {
            return service.rpc.getAppId()
        }))
        
        for (const appId of appIds) {
            expect(appIds[0]).toBe(appId)
        }

        const listsPorts = await Promise.all(services.map(service => {
            return service.rpc.getPorts()
        }))

        for (const listPorts of listsPorts) {
            for (const port of listPorts) {
                expect(typeof port).toBe('number')
            }
        }

        /**
         * За исключением первого сервиса, который гарантировано берёт первую блокируовку, 
         * невозможно предугадать какой сервис получил блокировку вторым
         */
        for (let i = 0; i < listsPorts.length; i++) {
            const listPorts = listsPorts[i]
            
            if (i === 0) {
                expect(listPorts).toHaveLength(0)
                continue
            }

            expect(listPorts.length).toBeGreaterThan(0)
        }

        for (const service of services) {
            const fastifyInstance = await service.fastify.fastify()
            fastifyInstance.close()
        }

        container.restore()
    })    
    
    it(`
        Синхронизация работает корректно и после её запуска возвращаются правильные порты и идентификатор
        приложения.
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        /**
         * Инициализирую базу данных, которая будет использоваться
         */
        container.get(TYPEORM_SYMBOL.TypeOrmConnectionApp)

        const services: {
            rpc: IStoreService
            fastify: IFastifyService
        }[] = []

        for (let i = 0; i < 3; i++) {
            container.snapshot()

            services.push({
                rpc: container
                    .get<IStoreService>(RPC_SYMBOL.RPCStoreService),
                fastify: container
                    .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
            })
            
            container.restore()
        }

        let listSyncInfo = await Promise.all(services.map(service => {
            return service.rpc.sync()
        }))

        /**
         * За исключением первого сервиса, который гарантировано берёт первую блокируовку, 
         * невозможно предугадать какой сервис получил блокировку вторым
         */
        for (let i = 0; i < listSyncInfo.length; i++) {
            const syncInfo = listSyncInfo[i]
            const firstSyncInfo = listSyncInfo[0]

            if (i === 0) {
                expect(syncInfo.ports).toHaveLength(0)
                continue
            }

            expect(firstSyncInfo.appId).toBe(syncInfo.appId)
            expect(syncInfo.ports.length).toBeGreaterThan(0)
        }

        listSyncInfo = await Promise.all(services.map(service => {
            return service.rpc.sync()
        }))

        /**
         * Все экземпляры должны синхронизироваться, так как это уже
         * не инициализационный запуск
         */
        for (let i = 0; i < listSyncInfo.length; i++) {
            const syncInfo = listSyncInfo[i]
            const firstSyncInfo = listSyncInfo[0]

            expect(firstSyncInfo.appId).toBe(syncInfo.appId)
            expect(syncInfo.ports.length).toBe(2)
        }

        for (const service of services) {
            const fastifyInstance = await service.fastify.fastify()
            fastifyInstance.close()
        }

        container.restore()
    })

    it(`
        Указанный порт успешно удаляется. Защиты от параллельного удаления портов нет никакой, это абсолютно
        нормальная ситуация
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        /**
         * Инициализирую базу данных, которая будет использоваться
         */
        container.get(TYPEORM_SYMBOL.TypeOrmConnectionApp)

        const services: {
            rpc: IStoreService
            fastify: IFastifyService
        }[] = []

        for (let i = 0; i < 3; i++) {
            container.snapshot()

            services.push({
                rpc: container
                    .get<IStoreService>(RPC_SYMBOL.RPCStoreService),
                fastify: container
                    .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
            })
            
            container.restore()
        }

        /**
         * Начальная инициализация
         */
        await Promise.all(services.map(service => {
            return service.rpc.sync()
        }))

        /**
         * Последующая синхронизация
         */
        await Promise.all(services.map(service => {
            return service.rpc.sync()
        }))

        /**
         * Получить порты и убидиться
         */
        const listsPorts = await Promise.all(services.map(service => {
            return service.rpc.getPorts()
        }))

        /**
         * Убедиться, что все порты синхронизировались
         */
        for (const listPorts of listsPorts) {
            expect(listPorts).toHaveLength(2)
        }

        /**
         * Удалить все порты
         */
        {
            for (const port of listsPorts[0]) {
                await services[0].rpc.removePort(port)
            }

            const fastifyInstance = await services[0].fastify.fastify()
            const port = (fastifyInstance.server.address() as AddressInfo).port
            await services[0].rpc.removePort(port)
        }

        /**
         * Синхронизировать информацию в новом сервисе. Причина: повторная синхронизация
         * после удаления портов на все тех же экземплярах приведет к новому созданию этих
         * портов
         */
        const newServices = [services[0]]
        await Promise.all(newServices.map(service => {
            return service.rpc.sync()
        }))

        /**
         * Получить новый список портов
         */
        const newListsPorts = await Promise.all(newServices.map(service => {
            return service.rpc.getPorts()
        }))
        
        /**
         * Убедиться, что все порты удалены
         */
        for (const listPorts of newListsPorts) {
            expect(listPorts).toHaveLength(0)
        }

        for (const service of services) {
            const fastifyInstance = await service.fastify.fastify()
            fastifyInstance.close()
        }

        container.restore()
    })

})