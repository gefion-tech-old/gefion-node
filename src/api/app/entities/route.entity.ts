import { injectable } from 'inversify'
import {
    PrimaryGeneratedColumn,
    CreateDateColumn,
    Entity,
    JoinColumn,
    OneToOne,
    Column,
    PrimaryColumn,
    ManyToOne,
    JoinTable,
    ManyToMany,
    Unique
} from 'typeorm'
import { Metadata } from './metadata.entity'
import { RouteMetadata, HttpMethod } from '../route/route.types'
import { MiddlewareGroupMetadata } from '../route/middleware-group/middleware-group.types'
import { Method } from './method.entity'
import { ControllerMetadata } from '../route/controller/controller.types'
import { MiddlewareMetadata } from '../route/middleware/middleware.types'

@injectable()
@Entity()
@Unique(['namespace', 'name'])
@Unique(['method', 'path'])
export class Route {

    @PrimaryGeneratedColumn()
    id: number

    @CreateDateColumn()
    createdAt: Date

    @OneToOne(() => Metadata, {
        onDelete: 'RESTRICT',
        eager: true,
        cascade: ['insert'],
        nullable: false
    })
    @JoinColumn()
    metadata: Metadata<RouteMetadata>

    @Column({
        nullable: false
    })
    namespace: string

    @Column({
        nullable: false
    })
    name: string

    @Column({
        nullable: false
    })
    method: HttpMethod

    @Column({
        nullable: false
    })
    path: string

    /**
     * Флаг указывающий на то, что роут должен проверять csrf токен
     */
    @Column({
        nullable: false
    })
    isCsrf: boolean

    @ManyToMany(() => MiddlewareGroup)
    @JoinTable({
        name: 'route_middleware_group'
    })
    middlewareGroups: MiddlewareGroup[]

    @ManyToMany(() => Middleware)
    @JoinTable({
        name: 'route_middleware'
    })
    middlewares: Middleware[]

    @OneToOne(() => Controller, {
        onDelete: 'RESTRICT',
        nullable: true
    })
    @JoinColumn()
    controller: Controller | null

    @Column({
        nullable: true
    })
    controllerId: number | null

}

@injectable()
@Entity()
@Unique(['namespace', 'name'])
export class Middleware {

    @PrimaryGeneratedColumn()
    id: number

    @CreateDateColumn()
    createdAt: Date

    @Column({
        nullable: false
    })
    namespace: string

    @Column({
        nullable: false
    })
    name: string

    /**
     * Флаг указывающий на то, что все роуты, которым соотвествует промежуточное
     * ПО должны проверять CSRF токен
     */
    @Column({
        nullable: false
    })
    isCsrf: boolean

    @OneToOne(() => Metadata, {
        onDelete: 'RESTRICT',
        eager: true,
        cascade: ['insert'],
        nullable: false
    })
    @JoinColumn()
    metadata: Metadata<MiddlewareMetadata>

    @ManyToOne(() => Method, {
        onDelete: 'RESTRICT',
        nullable: false
    })
    method: Method

}

@injectable()
@Entity()
@Unique(['namespace', 'name'])
export class MiddlewareGroup {

    @PrimaryGeneratedColumn()
    id: number

    @CreateDateColumn()
    createdAt: Date

    @Column({
        nullable: false
    })
    namespace: string

    @Column({
        nullable: false
    })
    name: string

    /**
     * Флаг указывающий на то, что группа промежуточного ПО является глобальной
     * для всех роутов
     */
    @Column({
        nullable: false
    })
    isDefault: boolean

    /**
     * Флаг указывающий на то, что все роуты в данной группе промежуточного ПО должны
     * проверять csrf токен
     */
    @Column({
        nullable: false
    })
    isCsrf: boolean

    @OneToOne(() => Metadata, {
        onDelete: 'RESTRICT',
        eager: true,
        cascade: ['insert'],
        nullable: false
    })
    @JoinColumn()
    metadata: Metadata<MiddlewareGroupMetadata>

    @ManyToMany(() => Middleware)
    @JoinTable({
        name: 'middleware_group_middleware'
    })
    middlewares: Middleware[]

}

@injectable()
@Entity()
@Unique(['namespace', 'name'])
export class Controller {

    @PrimaryGeneratedColumn()
    id: number

    @CreateDateColumn()
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
    metadata: Metadata<ControllerMetadata>

    @ManyToOne(() => Method, {
        onDelete: 'RESTRICT',
        nullable: false
    })
    method: Method

}

@injectable()
@Entity('route_middleware_group')
export class RouteMiddlewareGroup {

    @PrimaryColumn()
    routeId: number

    @PrimaryColumn()
    middlewareGroupId: number

    @ManyToOne(() => Route, {
        onDelete: 'CASCADE'
    })
    @JoinColumn()
    route: Route

    @ManyToOne(() => MiddlewareGroup, {
        onDelete: 'CASCADE'
    })
    @JoinColumn()
    middlewareGroup: MiddlewareGroup

    @Column({
        nullable: true
    })
    serialNumber: number

}

@injectable()
@Entity('route_middleware')
export class RouteMiddleware {

    @PrimaryColumn()
    routeId: number

    @PrimaryColumn()
    middlewareId: number

    @ManyToOne(() => Route, {
        onDelete: 'CASCADE'
    })
    @JoinColumn()
    route: Route

    @ManyToOne(() => Middleware, {
        onDelete: 'CASCADE'
    })
    @JoinColumn()
    middleware: Middleware

    @Column({
        nullable: true
    })
    serialNumber: number

}

@injectable()
@Entity('middleware_group_middleware')
export class MiddlewareGroupMiddleware {

    @PrimaryColumn()
    middlewareId: number

    @PrimaryColumn()
    middlewareGroupId: number

    @ManyToOne(() => Middleware, {
        onDelete: 'CASCADE'
    })
    @JoinColumn()
    middleware: Middleware

    @ManyToOne(() => MiddlewareGroup, {
        onDelete: 'CASCADE'
    })
    @JoinColumn()
    middlewareGroup: MiddlewareGroup

    @Column({
        nullable: true
    })
    serialNumber: number

}