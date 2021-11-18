import { injectable } from 'inversify'
import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column,
    Unique, 
    CreateDateColumn,
    OneToMany
} from 'typeorm'
import { BlockInstance } from './block-instance.entity'

@injectable()
@Entity()
@Unique(['name', 'version'])
export class BlockVersion {

    @PrimaryGeneratedColumn()
    id: number

    @Column({
        nullable: false
    })
    name: string

    @Column({
        nullable: false
    })
    version: string

    @Column({
        nullable: false
    })
    path: string

    @CreateDateColumn({
        nullable: false
    })
    createdAt: Date

    @OneToMany(() => BlockInstance, instance => instance.blockVersion)
    instances: BlockInstance[]

}