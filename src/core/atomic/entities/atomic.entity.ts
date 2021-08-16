import { injectable } from 'inversify'
import { Entity, PrimaryColumn, CreateDateColumn } from 'typeorm'

@injectable()
@Entity()
export class Atomic {

    @PrimaryColumn({
        nullable: false,
        unique: true
    })
    operation: string

    @CreateDateColumn({
        nullable: false
    })
    createdAt?: Date

}