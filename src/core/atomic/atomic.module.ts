import { AsyncContainerModule, interfaces } from 'inversify'
import { TYPEORM_SYMBOL } from '../typeorm/typeorm.types'
import { EntitySchema } from 'typeorm'
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
        .whenTargetNamed(ATOMIC_SYMBOL.LockCollectorRepair)
    
    bind<ILockCollectorService>(ATOMIC_SYMBOL.LockCollectorService)
        .to(LockCollectorService)
    
    bind<IAtomicService>(ATOMIC_SYMBOL.AtomicService)
        .to(AtomicService)

    // Сущности
    bind<EntitySchema<Atomic>>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Atomic)
        .whenTargetNamed(ATOMIC_SYMBOL.AtomicEntity)
})