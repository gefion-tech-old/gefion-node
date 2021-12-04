import { injectable } from 'inversify'
import {
    Entity,
    PrimaryGeneratedColumn,
    Column
} from 'typeorm'

@injectable()
@Entity()
export class Metadata<T extends Object> {

    @PrimaryGeneratedColumn()
    id: number

    @Column({
        type: 'simple-json',
        nullable: false
    })
    metadata: T

    @Column({
        default: 0
    })
    revisionNumber: number

}