import { injectable } from 'inversify'
import { 
    Entity, 
    PrimaryGeneratedColumn, 
    CreateDateColumn,
    ManyToOne
} from 'typeorm'
import { BlockVersion } from './block-version.entity'

@injectable()
@Entity()
export class BlockInstance {

    @PrimaryGeneratedColumn()
    id: number

    @CreateDateColumn({
        nullable: false
    })
    createdAt: Date

    @ManyToOne(() => BlockVersion, version => version.instances, {
        nullable: false
    })
    blockVersion: BlockVersion

}