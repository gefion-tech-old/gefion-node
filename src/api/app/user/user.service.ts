import { injectable, inject } from 'inversify'
import { IUserService } from './user.interface'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { Connection, Repository } from 'typeorm'
import { User } from '../entities/user.entity'
import { mutationQuery } from '../../../core/typeorm/utils/mutation-query'
import { SqliteErrorCode, isErrorCode } from '../../../core/typeorm/utils/error-code'
import { IRoleService } from './role/role.interface'
import { USER_SYMBOL } from './user.types'
import { UserDoesNotExists } from './user.errors'
import { RoleDoesNotExists } from './role/role.errors'

@injectable()
export class UserService implements IUserService {

    private userRepository: Promise<Repository<User>>

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        connection: Promise<Connection>,

        @inject(USER_SYMBOL.RoleService)
        private roleService: IRoleService
    ) {
        this.userRepository = connection
            .then(connection => {
                return connection.getRepository(User)
            })
    }

    public async create(username: string, nestedTransaction = false): Promise<void> {
        const userRepository = await this.userRepository

        try {
            await mutationQuery(nestedTransaction, () => {
                return userRepository.save({
                    username: username
                })
            })
        } catch (error) {
            block: {
                if (isErrorCode(error, SqliteErrorCode.SQLITE_CONSTRAINT_UNIQUE)) {
                    break block
                }
    
                throw error
            }
        }
    }

    public async isExists(username: string): Promise<boolean> {
        const userRepository = await this.userRepository
        return await userRepository.count({
            where: {
                username: username
            }
        }) > 0
    }
    
    public async remove(username: string, nestedTransaction = false): Promise<void> {
        const userRepository = await this.userRepository

        await mutationQuery(nestedTransaction, () => {
            return userRepository.delete({
                username: username
            })
        })
    }

    public async setRole(username: string, role: string | null, nestedTransaction = false): Promise<void> {
        const userRepository = await this.userRepository

        const userEntity = await userRepository.findOne({
            where: {
                username: username
            }
        })

        if (!userEntity) {
            throw new UserDoesNotExists
        }

        if (!role) {
            userEntity.roleName = null
            await mutationQuery(nestedTransaction, () => {
                return userRepository.save(userEntity)
            })
            return
        }

        if (!await this.roleService.isExists(role)) {
            throw new RoleDoesNotExists
        }

        userEntity.roleName = role
        await mutationQuery(nestedTransaction, () => {
            return userRepository.save(userEntity)
        })
    }

    public async getRole(username: string): Promise<string | null | undefined> {
        const userRepository = await this.userRepository

        const userEntity = await userRepository.findOne({
            where: {
                username: username
            }
        })

        if (!userEntity) {
            return undefined
        }

        return userEntity.roleName
    }

}