import { injectable } from 'inversify'
import { 
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    Check,
    Column,
    Unique
} from 'typeorm'
import { BlockInstance } from './block.entity'
import { Method } from './method.entity'
import { Signal } from './signal.entity'
import { Role, Permission } from './user.entity'
import { Controller, Middleware, MiddlewareGroup, Route } from './route.entity'

@injectable()
@Entity()
@Check(`
    (system <> FALSE OR blockInstanceId <> NULL)
    AND
    (
        methodId <> NULL 
        OR signalId <> NULL 
        OR roleId <> NULL 
        OR permissionId <> NULL 
        OR controllerId <> NULL
        OR middlewareId <> NULL
        OR middlewareGroupId <> NULL
        OR routeId <> NULL
    )
`)
@Unique(['method'])
@Unique(['signal'])
@Unique(['role'])
@Unique(['permission'])
@Unique(['controller'])
@Unique(['middleware'])
@Unique(['middlewareGroup'])
@Unique(['route'])
export class Creator {

    @PrimaryGeneratedColumn()
    id: number

    /**
     * Поля создателей
     */

    @Column({
        default: false
    })
    system: boolean

    @ManyToOne(() => BlockInstance, {
        onDelete: 'RESTRICT'
    })
    blockInstance: BlockInstance

    /**
     * Поля ресурсов
     */
    
    @ManyToOne(() => Method, {
        onDelete: 'CASCADE'
    })
    method: Method
    
    @Column({
        nullable: true
    })
    methodId: number

    @ManyToOne(() => Signal, {
        onDelete: 'CASCADE'
    })
    signal: Signal

    @Column({
        nullable: true
    })
    signalId: number

    @ManyToOne(() => Role, {
        onDelete: 'CASCADE'
    })
    role: Role

    @Column({
        nullable: true
    })
    roleId: number

    @ManyToOne(() => Permission, {
        onDelete: 'CASCADE'
    })
    permission: Permission

    @Column({
        nullable: true
    })
    permissionId: number

    @ManyToOne(() => Controller, {
        onDelete: 'CASCADE'
    })
    controller: Controller

    @Column({
        nullable: true
    })
    controllerId: number

    @ManyToOne(() => Middleware, {
        onDelete: 'CASCADE'
    })
    middleware: Middleware

    @Column({
        nullable: true
    })
    middlewareId: number

    @ManyToOne(() => MiddlewareGroup, {
        onDelete: 'CASCADE'
    })
    middlewareGroup: MiddlewareGroup

    @Column({
        nullable: true
    })
    middlewareGroupId: number

    @ManyToOne(() => Route, {
        onDelete: 'CASCADE'
    })
    route: Route

    @Column({
        nullable: true
    })
    routeId: number

}