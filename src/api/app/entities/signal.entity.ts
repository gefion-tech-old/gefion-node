import { injectable } from 'inversify'
import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column,
    ManyToMany,
    Unique,
    JoinTable,
    ManyToOne,
    JoinColumn,
    PrimaryColumn,
    Index,
    CreateDateColumn,
    OneToOne
} from 'typeorm'
import { Method } from './method.entity'
import { SignalMetadata } from '../signal/signal.type'
import { Metadata } from './metadata.entity'

@injectable()
@Entity()
@Unique(['namespace', 'name'])
export class Signal {

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
    name: string

    @OneToOne(() => Metadata, {
        onDelete: 'RESTRICT',
        eager: true,
        cascade: ['insert']
    })
    @JoinColumn()
    metadata: Metadata<SignalMetadata>

    @ManyToMany(() => Method)
    @JoinTable({
        name: 'signal_validator_method'
    })
    validators: Method[]

    @ManyToMany(() => Method)
    @JoinTable({
        name: 'signal_guard_method'
    })
    guards: Method[]

    @ManyToMany(() => Method)
    @JoinTable({
        name: 'signal_filter_method'
    })
    filters: Method[]

}

@injectable()
@Entity('signal_validator_method')
export class SignalValidatorMethod {

    @PrimaryColumn()
    signalId: number
    
    @PrimaryColumn()
    methodId: number

    @ManyToOne(() => Signal, {
        onDelete: 'CASCADE'
    })
    @JoinColumn()
    signal: Signal

    @ManyToOne(() => Method, {
        onDelete: 'RESTRICT'
    })
    @JoinColumn()
    method: Method

}

@injectable()
@Entity('signal_guard_method')
export class SignalGuardMethod {

    @PrimaryColumn()
    signalId: number

    @PrimaryColumn()
    methodId: number

    @ManyToOne(() => Signal, {
        onDelete: 'CASCADE'
    })
    @JoinColumn()
    signal: Signal

    @ManyToOne(() => Method, {
        onDelete: 'RESTRICT'
    })
    @JoinColumn()
    method: Method

}

@injectable()
@Entity('signal_filter_method')
export class SignalFilterMethod {

    @PrimaryColumn()
    signalId: number

    @PrimaryColumn()
    methodId: number

    @ManyToOne(() => Signal, {
        onDelete: 'CASCADE'
    })
    @JoinColumn()
    signal: Signal

    @ManyToOne(() => Method, {
        onDelete: 'RESTRICT'
    })
    @JoinColumn()
    method: Method

}

@injectable()
@Entity('signal_graph')
export class SignalGraph {

    @PrimaryColumn()
    outSignalId: number

    @PrimaryColumn()
    inSignalId: number

    @ManyToOne(() => Signal, {
        onDelete: 'CASCADE',
        nullable: false
    })
    @Index()
    outSignal: Signal

    @ManyToOne(() => Signal, {
       onDelete: 'CASCADE',
       nullable: false 
    })
    @Index()
    inSignal: Signal

}