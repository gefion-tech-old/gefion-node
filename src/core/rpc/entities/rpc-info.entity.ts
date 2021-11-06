import { injectable } from 'inversify'
import { Entity, PrimaryColumn, Column } from 'typeorm'

@injectable()
@Entity()
export class RPCInfo {

    @PrimaryColumn()
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