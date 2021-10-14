import { injectable } from 'inversify'
import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    Index, 
    Unique, 
    CreateDateColumn 
} from 'typeorm'

@injectable()
@Entity()
@Unique(['name', 'version'])
export class Block {

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

}