import { injectable, inject } from 'inversify'
import { IStoreService } from './store.interface'
import { TYPEORM_SYMBOL } from '../../typeorm/typeorm.types'
import { Connection } from 'typeorm'
import { RPCInfo } from '../entities/rpc-info.entity'
import { StoreInfo, SyncOperation } from './store.types'
import uniqid from 'uniqid'
import { IFastifyService } from '../../fastify/fastify.interface'
import { FASTIFY_SYMBOL } from '../../fastify/fastify.types'
import { AddressInfo } from 'net'
import { IAtomicService } from '../../atomic/atomic.interface'
import { ATOMIC_SYMBOL } from '../../atomic/atomic.types'
import { mutationQuery } from '../../typeorm/utils/mutation-query'

@injectable()
export class StoreService implements IStoreService {

    private appId: string | undefined
    private ports: number[] | undefined

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        private connection: Promise<Connection>,

        @inject(FASTIFY_SYMBOL.FastifyService)
        private fastifyService: IFastifyService,

        @inject(ATOMIC_SYMBOL.AtomicService)
        private atomicService: IAtomicService
    ) {}

    public async getAppId(): Promise<string> {
        if (this.appId) {
            return this.appId
        }

        const storeInfo = await this.sync()

        return storeInfo.appId
    }

    public async getPorts(): Promise<number[]> {
        if (this.ports) {
            return this.ports
        }

        const storeInfo = await this.sync()

        return storeInfo.ports
    }

    public async sync(): Promise<StoreInfo> {
        const connection = await this.connection
        const rpcInfoRepository = connection.getRepository(RPCInfo)
        
        /**
         * Поставить блокировку на синхронизацию, так как это должна быть
         * атомарная операция. В противном случае, возможны непредвиденные 
         * ситуации
         */
        await this.atomicService.lock(SyncOperation, {
            retries: 10,
            randomize: true,
            minTimeout: 50,
            maxTimeout: 1000
        })

        const [appId, ports] = await (async (): Promise<[string, number[]]> => {
            try {
                /**
                 * Получить текущий идентификатор приложения. При необходимости создать
                 * и сохранить его.
                 */
                const appId = await (async (): Promise<string> => {
                    const rpcInfo = await rpcInfoRepository.findOne({
                        where: {
                            key: 'appId'
                        }
                    })
        
                    if (rpcInfo) {
                        return rpcInfo.value
                    }
        
                    const appId = (await mutationQuery(false, () => {
                        return rpcInfoRepository.save({
                            key: 'appId',
                            value: uniqid()
                        })
                    })).value
        
                    return appId
                })()
        
                /**
                 * Получить текущий список портов всех экземпляров приложения. Если в списке
                 * нет порта текущего экземпляра, то сохранить его. Вернуть порты без порта текущего
                 * экземпляра
                 */
                const ports = await (async (): Promise<number[]> => {
                    /**
                     * Получить порт текущего экземпляра
                     */
                    const currentPort = await (async (): Promise<number> => {
                        const fastifyInstance = await this.fastifyService.fastify()
                        return (fastifyInstance.server.address() as AddressInfo).port
                    })()
        
                    /**
                     * Сохранить порт текущего экземпляра, если его еще нет
                     */
                    if (!await rpcInfoRepository.findOne({
                        where: {
                            key: 'port',
                            value: String(currentPort)
                        }
                    })) {
                        await mutationQuery(false, () => {
                            return rpcInfoRepository.save({
                                key: 'port',
                                value: String(currentPort)
                            })
                        })
                    }
        
                    /**
                     * Получить список портов без текущего порта
                     */
                    const ports = (await rpcInfoRepository.find({
                        where: {
                            key: 'port'
                        }
                    })).map(info => {
                        return Number(info.value)
                    }).filter(port => {
                        return port !== currentPort
                    })
        
                    return ports
                })()

                return [appId, ports]
            } finally {
                /**
                 * Убрать блокировку синхронизации
                 */
                await this.atomicService.unlock(SyncOperation)
            }
        })()

        /**
         * Сохранить полученные значения
         */
        {
            this.appId = appId
            this.ports = ports
        }

        return {
            appId: this.appId,
            ports: this.ports
        }
    }

    public async removePort(port: number): Promise<void> {
        const connection = await this.connection
        const rpcInfoRepository = connection.getRepository(RPCInfo)

        /**
         * Удалить указанный порт из базы данных
         */
        await mutationQuery(false, () => {
            return rpcInfoRepository.delete({
                key: 'port',
                value: String(port)
            })
        })

        /**
         * Удалить указанный порт из локального списка портов
         */
        {
            const ports = await this.getPorts()
            this.ports = ports.filter(instancePort => {
                return instancePort !== port
            })
        }
    }

}