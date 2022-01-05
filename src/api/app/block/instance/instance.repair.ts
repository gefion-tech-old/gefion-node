import { injectable, inject } from 'inversify'
import { RepairJob } from '../../../../core/repair/repair.types'
import { BLOCK_SYMBOL } from '../block.types'
import { IInstanceService } from './instance.interface'
import { Connection, Not, In } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { BlockInstance } from '../../entities/block.entity'

/**
 * Периодически синхронизировать созданные экземпляры версии блока с фактически
 * запущенными экземплярами. Также запускать все созданные экземпляры при запуске
 * самого приложения (за счет того, что починка запускается и при старте).
 * 
 * Игнорировать вид синхронизации когда запущенного локально экземпляра не существует
 * в базе данных. Причины:
 * 1. Операция вычисления удалённых, но запущенных блоков очень дорогая
 * 2. Если взаимодействовать с блоками только через сервисы, то такой ситуации
 * не должно возникать. В противном случае, нужно уделить внимание коду сервисов
 */
@injectable()
export class InstanceRepair implements RepairJob {

    public constructor(
        @inject(BLOCK_SYMBOL.BlockInstanceService)
        private instanceService: IInstanceService,

        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        private connection: Promise<Connection>
    ) {}

    public name(): string {
        return 'BlockModule:InstanceRepair'
    }

    public async test(): Promise<boolean> {
        return true
    }

    public async repair(): Promise<void> {
        const connection = await this.connection
        const instanceRepository = connection.getRepository(BlockInstance)
        const instanceIds = this.instanceService.getAllInstanceId()

        const instances = await instanceRepository.find({
            id: Not(In(instanceIds))
        })

        await Promise.all(instances.map(instance => {
            return this.instanceService.start(instance.id)
        }))
    }

}