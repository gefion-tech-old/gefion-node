import { injectable } from 'inversify'
import { 
    Unique,
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn
} from 'typeorm'

@injectable()
@Entity()
@Unique(['namespace', 'type', 'name'])
export class Method {

    @PrimaryGeneratedColumn()
    id: number

    @CreateDateColumn({
        nullable: false
    })
    createdAt: Date

    @Column({
        nullable: false
    })
    namespace: string

    @Column({
        nullable: false
    })
    type: string

    @Column({
        nullable: false
    })
    name: string

}