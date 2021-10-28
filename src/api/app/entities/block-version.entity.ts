import { injectable } from 'inversify'
import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    Index, 
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
    id?: number

    @Column({
        nullable: false
    })
    @Index()
    name: string

    @Column({
        nullable: false
    })
    @Index()
    version: string

    @Column({
        nullable: false
    })
    path: string

    @CreateDateColumn({
        nullable: false
    })
    createdAt?: Date

    @UpdateDateColumn({
        nullable: false
    })
    updatedAt?: Date

    @OneToMany(() => BlockInstance, instance => instance.blockVersion, {
        onDelete: 'RESTRICT',

    })
    instances: BlockInstance[]

    // TODO: Добавить список тегов

}