import { injectable, inject } from 'inversify'
import { IUserService } from './user.interface'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { Connection } from 'typeorm'
import { User } from '../entities/user.entity'
import { mutationQuery } from '../../../core/typeorm/utils/mutation-query'
import { IRoleService } from './role/role.interface'
import { 
    USER_SYMBOL,
    UserEventMutation,
    UserEventMutationName,
    EventContext
} from './user.types'
import { UserDoesNotExists, UserAlreadyExists } from './user.errors'
import { RoleDoesNotExists } from './role/role.errors'
import { EventEmitter } from 'events'

@injectable()
export class UserService implements IUserService {

    private eventEmitter = new EventEmitter

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        private connection: Promise<Connection>,

        @inject(USER_SYMBOL.RoleService)
        private roleService: IRoleService
    ) {}

    public async create(username: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const userRepository = connection.getRepository(User)

        if (await this.isExists(username)) {
            throw new UserAlreadyExists
        }
        
        await mutationQuery(nestedTransaction, () => {
            return userRepository.save({
                username: username
            })
        })

        const eventContext: EventContext = {
            type: UserEventMutation.Create,
            userName: username
        }
        this.eventEmitter.emit(UserEventMutationName, eventContext)
    }

    public async isExists(username: string): Promise<boolean> {
        const connection = await this.connection
        const userRepository = connection.getRepository(User)

        return await userRepository.count({
            where: {
                username: username
            }
        }) > 0
    }
    
    public async remove(username: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const userRepository = connection.getRepository(User)

        const userEntity = await userRepository.findOne({
            where: {
                username: username
            }
        })

        /**
         * Прекратить выполнение функции, если пользователя не существует для предотвращения
         * срабатывания события
         */
        if (!userEntity) {
            return
        }

        await mutationQuery(nestedTransaction, () => {
            return userRepository.remove(userEntity)
        })

        const eventContext: EventContext = {
            type: UserEventMutation.Remove,
            userName: username
        }
        this.eventEmitter.emit(UserEventMutationName, eventContext)
    }

    public async setRole(username: string, role: string | null, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const userRepository = connection.getRepository(User)

        if (!role) {
            if (!await this.isExists(username)) {
                throw new UserDoesNotExists
            }

            await mutationQuery(nestedTransaction, () => {
                return userRepository.update({
                    username: username
                }, {
                    roleName: null
                })
            })
        } else {
            if (!await this.isExists(username)) {
                throw new UserDoesNotExists
            }

            if (!await this.roleService.isExists(role)) {
                throw new RoleDoesNotExists
            }
    
            await mutationQuery(nestedTransaction, () => {
                return userRepository.update({
                    username: username
                }, {
                    roleName: role
                })
            })
        }

        const eventContext: EventContext = {
            type: UserEventMutation.SetRole,
            userName: username,
            roleName: role
        }
        this.eventEmitter.emit(UserEventMutationName, eventContext)
    }

    public onMutation(handler: (context: EventContext) => void): void {
        this.eventEmitter.on(UserEventMutationName, handler)
    }

}