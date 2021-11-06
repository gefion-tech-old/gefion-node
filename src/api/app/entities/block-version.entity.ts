import { injectable } from 'inversify'
import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column,
    Unique, 
    CreateDateColumn,
    UpdateDateColumn,
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

    @UpdateDateColumn({
        nullable: false
    })
    updatedAt: Date

    @OneToMany(() => BlockInstance, instance => instance.blockVersion)
    instances: BlockInstance[]

    // TODO: Добавить список тегов 

}