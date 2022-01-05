import { injectable } from 'inversify'
import { 
    Entity, 
    PrimaryGeneratedColumn, 
    CreateDateColumn,
    ManyToOne,
    Column,
    OneToMany,
    Unique
} from 'typeorm'

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