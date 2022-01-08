import { injectable } from 'inversify'
import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column,
    Unique,
    ManyToOne,
    JoinColumn,
    PrimaryColumn,
    Index,
    CreateDateColumn,
    OneToOne,
    OneToMany
} from 'typeorm'
import { Method } from './method.entity'
import { 
    SignalMetadata,
    SignalFilterMetadata,
    SignalGuardMetadata,
    SignalValidatorMetadata
} from '../signal/signal.types'
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

    @OneToMany(() => SignalValidator, signalValidator => signalValidator.signal)
    signalValidators: SignalValidator[]

    @OneToMany(() => SignalGuard, signalGuard => signalGuard.signal)
    signalGuards: SignalGuard[]

    @OneToMany(() => SignalFilter, signalFilter => signalFilter.signal)
    signalFilters: SignalFilter[]

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
@Entity('signal_validator')
@Unique(['signalId', 'validatorId'])
export class SignalValidator {

    @PrimaryGeneratedColumn()
    id: number

    @Column({
        nullable: false
    })
    signalId: number
    
    @Column({
        nullable: false
    })
    validatorId: number

    @ManyToOne(() => Signal, {
        onDelete: 'CASCADE'
    })
    @JoinColumn()
    signal: Signal

    @ManyToOne(() => Validator, {
        onDelete: 'CASCADE'
    })
    @JoinColumn()
    validator: Validator

    @OneToOne(() => Metadata, {
        onDelete: 'RESTRICT',
        eager: true,
        cascade: ['insert'],
        nullable: false
    })
    @JoinColumn()
    metadata: Metadata<SignalValidatorMetadata>

}

@injectable()
@Entity('signal_guard')
@Unique(['signalId', 'guardId'])
export class SignalGuard {

    @PrimaryGeneratedColumn()
    id: number

    @Column({
        nullable: false
    })
    signalId: number

    @Column({
        nullable: false
    })
    guardId: number

    @ManyToOne(() => Signal, {
        onDelete: 'CASCADE'
    })
    @JoinColumn()
    signal: Signal

    @ManyToOne(() => Guard, {
        onDelete: 'CASCADE'
    })
    @JoinColumn()
    guard: Guard

    @OneToOne(() => Metadata, {
        onDelete: 'RESTRICT',
        eager: true,
        cascade: ['insert'],
        nullable: false
    })
    @JoinColumn()
    metadata: Metadata<SignalGuardMetadata>

}

@injectable()
@Entity('signal_filter')
@Unique(['signalId', 'filterId'])
export class SignalFilter {

    @PrimaryGeneratedColumn()
    id: number

    @Column({
        nullable: false
    })
    signalId: number

    @Column({
        nullable: false
    })
    filterId: number

    @ManyToOne(() => Signal, {
        onDelete: 'CASCADE'
    })
    @JoinColumn()
    signal: Signal

    @ManyToOne(() => Filter, {
        onDelete: 'CASCADE'
    })
    @JoinColumn()
    filter: Filter

    @OneToOne(() => Metadata, {
        onDelete: 'RESTRICT',
        eager: true,
        cascade: ['insert'],
        nullable: false
    })
    @JoinColumn()
    metadata: Metadata<SignalFilterMetadata>

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