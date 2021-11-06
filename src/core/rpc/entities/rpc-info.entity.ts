import { injectable } from 'inversify'
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@injectable()
@Entity()
export class RPCInfo {

    @PrimaryGeneratedColumn()
    id: number

    @Column({
        nullable: false
    })
    key: string

    @Column({
        nullable: false
    })
    value: string

}