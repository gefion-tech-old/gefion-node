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
import { GuardMetadata } from '../signal/guard/guard.types'
import { FilterMetadata } from '../signal/filter/filter.types'
import { ValidatorMetadata } from '../signal/validator/validator.types'

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
        cascade: ['insert'],
        nullable: false
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
@Entity()
@Unique(['namespace', 'name'])
export class Guard {

    @PrimaryGeneratedColumn()
    id: number

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
        cascade: ['insert'],
        nullable: false
    })
    @JoinColumn()
    metadata: Metadata<GuardMetadata>

    @ManyToOne(() => Method, {
        onDelete: 'RESTRICT',
        nullable: false
    })
    method: Method

}

@injectable()
@Entity()
@Unique(['namespace', 'name'])
export class Filter {

    @PrimaryGeneratedColumn()
    id: number

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
        cascade: ['insert'],
        nullable: false
    })
    @JoinColumn()
    metadata: Metadata<FilterMetadata>

    @ManyToOne(() => Method, {
        onDelete: 'RESTRICT',
        nullable: false
    })
    method: Method

}

@injectable()
@Entity()
@Unique(['namespace', 'name'])
export class Validator {

    @PrimaryGeneratedColumn()
    id: number

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
        cascade: ['insert'],
        nullable: false
    })
    @JoinColumn()
    metadata: Metadata<ValidatorMetadata>

    @ManyToOne(() => Method, {
        onDelete: 'RESTRICT',
        nullable: false
    })
    method: Method

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