import { injectable } from 'inversify'
import { 
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    Check,
    Column,
    Unique
} from 'typeorm'
import { BlockInstance } from './block-instance.entity'
import { Method } from './method.entity'

@injectable()
@Entity()
@Check(`
    (system <> FALSE OR blockInstanceId <> NULL)
    AND
    (methodId <> NULL)
`)
@Unique(['method'])
export class Creator {

    @PrimaryGeneratedColumn()
    id: number

    /**
     * Поля создателей
     */

    @Column({
        default: false
    })
    system: boolean

    @ManyToOne(() => BlockInstance, {
        onDelete: 'RESTRICT'
    })
    blockInstance: BlockInstance

    /**
     * Поля ресурсов
     */
    
    @ManyToOne(() => Method, {
        onDelete: 'CASCADE'
    })
    method: Method

}