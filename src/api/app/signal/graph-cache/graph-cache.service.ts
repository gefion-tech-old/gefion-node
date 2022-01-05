import { injectable, inject } from 'inversify'
import { Signal, SignalGraph } from '../../entities/signal.entity'
import { IGraphCacheService } from './graph-cache.interface'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { Connection } from 'typeorm'
import { 
    SignalCache,
    SignalEdgesCache,
    SignalOppositeEdgesCache,
    RPCMethodGraphCache,
    UpdateCacheOperation
} from './graph-cache.types'
import { IAtomicService } from '../../../../core/atomic/atomic.interface'
import { ATOMIC_SYMBOL } from '../../../../core/atomic/atomic.types'
import { RPC_SYMBOL } from '../../../../core/rpc/rpc.types'
import { IRPCService } from '../../../../core/rpc/rpc.interface'

@injectable()
export class GraphCacheService implements IGraphCacheService {

    private signalCache: SignalCache = new Map
    private signalEdgesCache: SignalEdgesCache = new Map
    private signalOppositeEdgesCache: SignalOppositeEdgesCache = new Map

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        private connection: Promise<Connection>,

        @inject(ATOMIC_SYMBOL.AtomicService)
        private atomicService: IAtomicService,

        @inject(RPC_SYMBOL.RPCService)
        private rpcService: IRPCService
    ) {}

    public async signalDirection(signalId: number, callback: (signal: Signal) => Promise<boolean>): Promise<boolean> {
        const executedSignals = new Set

        if (!this.signalCache.get(signalId)) {
            return false
        }

        const direction = async (id: number) => {
            const signal = this.signalCache.get(id)
            const edges = this.signalEdgesCache.get(id)

            if (!signal) {
                return
            }

            if (executedSignals.has(id)) {
                return
            }

            executedSignals.add(id)
            if (await callback(signal) && edges) {
                for (let id of edges) {
                    await direction(id)
                }
            }
        }

        await direction(signalId)
        return true
    }

    public async updateSignal(signalId: number): Promise<void> {
        const connection = await this.connection
        const signalRepository = connection.getRepository(Signal)
        const signalGraphRepository = connection.getRepository(SignalGraph)

        /**
         * Получить экземпляр сигнала из базы данных со всеми связями для кеша
         */
        const signalEntity = await signalRepository.findOne({
            where: {
                id: signalId
            },
            relations: ['validators', 'guards', 'filters']
        })

        /**
         * Получить экземпляры 'рёбер', которые как-либо ссылаются на целевой сигнал.
         * Если сигнала не существует, то принудительно вернуть пустой массив без запроса
         * в БД, так как sqlite гарантирует, что результат все равно был бы таким 
         */
        const signalGraphEntities = !signalEntity ? [] : await signalGraphRepository.find({
            where: [
                { outSignal: signalEntity },
                { inSignal: signalEntity }
            ]
        })

        /**
         * Удалить все упоминания о сигнале в кеше, если сигнала больше не существует
         */
        if (!signalEntity) {
            const edges = this.signalEdgesCache.get(signalId)
            const oppositeEdges = this.signalOppositeEdgesCache.get(signalId)

            /**
             * Удалить все неявные ссылки на сигнал в сигналах, на которые сылается удаляемый
             * сигнал
             */
            if (edges) {
                edges.forEach((id) => {
                    const oppositeEdges = this.signalOppositeEdgesCache.get(id)
                    if (oppositeEdges) {
                        this.signalOppositeEdgesCache.set(id, oppositeEdges.filter((id) => {
                            return id !== signalId
                        }))
                    }
                })
            }

            /**
             * Удалить все неявные ссылки на сигнал в сигналах, которые ссылаются на удаляемый 
             * сигнал
             */
            if (oppositeEdges) {
                oppositeEdges.forEach((id) => {
                    const edges = this.signalEdgesCache.get(id)
                    if (edges) {
                        this.signalEdgesCache.set(id, edges.filter((id) => {
                            return id !== signalId
                        }))
                    }
                })
            }
            
            this.signalCache.delete(signalId)
            this.signalEdgesCache.delete(signalId)
            this.signalOppositeEdgesCache.delete(signalId)
        }

        /**
         * Если сигнал существует, то добавить его в кэш и добавить все явные и неявные 
         * ссылки на него. Полностью пересобрать кэш сигнала, если он уже есть в кэше
         */
        if (signalEntity) {
            /**
             * Генерирую кэш новых рёбер на основе данных полученных из БД
             */
            const edges = signalGraphEntities.filter((signalGraphEntitie) => {
                return signalGraphEntitie.outSignalId === signalId
            }).map((signalGraphEntitie) => {
                return signalGraphEntitie.inSignalId
            })
            const oppositeEdges = signalGraphEntities.filter((signalGraphEntity) => {
                return signalGraphEntity.inSignalId === signalId
            }).map((signalGraphEntity) => {
                return signalGraphEntity.outSignalId
            })

            /**
             * Добавляю неявные ссылки в сигналы, на которые ссылается текущий сигнал
             */
            edges.forEach((id) => {
                const currentOppositeEdges = this.signalOppositeEdgesCache.get(id)
                if (currentOppositeEdges) {
                    this.signalOppositeEdgesCache.set(id, (
                        currentOppositeEdges.includes(signalId)
                        ? currentOppositeEdges
                        : (currentOppositeEdges.push(signalId), currentOppositeEdges)
                    ))
                } else {
                    this.signalOppositeEdgesCache.set(id, [signalId])
                }
            })

            /**
             * Добавляю неявные ссылки в сигналы, которые ссылаются на текущий сигнал
             */
            oppositeEdges.forEach((id) => {
                const currentEdges = this.signalEdgesCache.get(id)
                if (currentEdges) {
                    this.signalEdgesCache.set(id, (
                        currentEdges.includes(signalId)
                        ? currentEdges
                        : (currentEdges.push(signalId), currentEdges)
                    ))
                }
            })

            this.signalCache.set(signalId, signalEntity)
            this.signalEdgesCache.set(signalId, edges)
            this.signalOppositeEdgesCache.set(signalId, oppositeEdges)
        }
    }

    public async updateSignals(): Promise<void> {
        const connection = await this.connection
        const signalRepository = connection.getRepository(Signal)
        const signalGraphRepository = connection.getRepository(SignalGraph)

        /**
         * Получить массив всех сущностей сигналов с заполненными отношениями
         */
        const signalEntities = await signalRepository.find({
            relations: ['validators', 'guards', 'filters']
        })

        /**
         * Получить все экземпляры рёбер сигналов
         */
        const signalGraphEntities = await signalGraphRepository.find()

        /**
         * Очищаю весь старый кеш, если такой был
         */
        this.signalCache.clear()
        this.signalEdgesCache.clear()
        this.signalOppositeEdgesCache.clear()

        /**
         * Добавить в кэш все сущности сигналов
         */
        signalEntities.forEach(signalEntity => {
            this.signalCache.set(signalEntity.id, signalEntity)
        })

        /**
         * Добавить в кэш все рёбра сигналов
         */
        signalGraphEntities.forEach(signalGraphEntity => {
            /**
             * Обновление кэша рёбер с обычным направлением
             */
            const currentEdges = this.signalEdgesCache.get(signalGraphEntity.outSignalId)
            this.signalEdgesCache.set(signalGraphEntity.outSignalId, (
                currentEdges
                ? (currentEdges.push(signalGraphEntity.inSignalId), currentEdges)
                : [signalGraphEntity.inSignalId]
            ))

            /**
             * Обновление кэша рёбер с обратным направлением
             */
            const currentOppositeEdges = this.signalOppositeEdgesCache.get(signalGraphEntity.inSignalId)
            this.signalOppositeEdgesCache.set(signalGraphEntity.inSignalId, (
                currentOppositeEdges
                ? (currentOppositeEdges.push(signalGraphEntity.outSignalId), currentOppositeEdges)
                : [signalGraphEntity.outSignalId]
            ))
        })
    }

    public async updateSignalAndSync(signalId: number): Promise<void> {
        /**
         * Ставлю атомарную блокировку на обновление кеша
         */
        await this.atomicService.lock(UpdateCacheOperation, {
            retries: 10,
            randomize: true,
            minTimeout: 50,
            maxTimeout: 1000
        })

        try {
            /**
             * Обновляю кэш на всех экземплярах приложения за исключением текущего
             */
            await this.rpcService.call(
                RPCMethodGraphCache.updateSignal, [signalId]
            )
    
            /**
             * Обновляю кэш на текущем экземпляре приложения
             */
            await this.updateSignal(signalId)
        } finally {
            /**
             * Снимаю атомарную блокировку на обновление кэша
             */
            await this.atomicService.unlock(UpdateCacheOperation)
        }
    }

    public async updateSignalsAndSync(): Promise<void> {
        /**
         * Ставлю атомарную блокировку на обновление кэша
         */
        await this.atomicService.lock(UpdateCacheOperation, {
            retries: 10,
            randomize: true,
            minTimeout: 50,
            maxTimeout: 1000
        })

        try {
            /**
             * Обновляю кэш на всех экземплярах приложения за исключением текущего
             */
            await this.rpcService.call(
                RPCMethodGraphCache.updateSignals, []
            )
    
            /**
             * Обновляю кэш на текущем экземпляре приложения
             */
            await this.updateSignals()
        } finally {
            /**
             * Снимаю атомарную блокировку на обновление кэша
             */
            await this.atomicService.unlock(UpdateCacheOperation)
        }
    }

}