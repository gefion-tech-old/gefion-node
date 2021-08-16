import { AsyncContainerModule, interfaces } from 'inversify'
import { TYPEORM_SYMBOL } from '../../dep/typeorm/typeorm.types'
import { EntitySchema, Repository, Connection } from 'typeorm'
import { Atomic } from './entities/atomic.entity'
import { ATOMIC_SYMBOL, AtomicConfig } from './atomic.types'
import { IAtomicService } from './atomic.interface'
import { AtomicService } from './atomic.service'
import { getAtomicConfig } from './atomic.config'
import { ILockCollectorService } from './lock-collector/lock-collector.interface'
import { LockCollectorService } from './lock-collector/lock-collector.service'
import { REPAIR_TYPES, RepairJob } from '../repair/repair.types'
import { LockCollectorRepair } from './lock-collector/lock-collector.repair'

export const AtomicModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Promise<AtomicConfig>>(ATOMIC_SYMBOL.AtomicConfig)
        .toDynamicValue(getAtomicConfig)
        .inSingletonScope()

    bind<RepairJob>(REPAIR_TYPES.RepairJob)
        .to(LockCollectorRepair)
    
    bind<ILockCollectorService>(ATOMIC_SYMBOL.LockCollectorService)
        .to(LockCollectorService)
    
    bind<IAtomicService>(ATOMIC_SYMBOL.AtomicService)
        .to(AtomicService)

    // Сущности
    bind<EntitySchema<Atomic>>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Atomic)
        .whenTargetNamed(ATOMIC_SYMBOL.AtomicEntity)

    // Репозитории
    bind<Promise<Repository<Atomic>>>(TYPEORM_SYMBOL.TypeOrmAppRepository)
        .toDynamicValue(async (context: interfaces.Context): Promise<Repository<Atomic>> => {
            const container = context.container
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const atomicEntity = container
                .getNamed<EntitySchema<Atomic>>(
                    TYPEORM_SYMBOL.TypeOrmAppEntity, ATOMIC_SYMBOL.AtomicEntity
                )
            const repository = connection.getRepository<Atomic>(atomicEntity)
            return repository
        })
        .whenTargetNamed(ATOMIC_SYMBOL.AtomicRepository)
})