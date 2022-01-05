import { getContainer } from '../../../inversify.config'
import { USER_SYMBOL, UserEventMutation } from './user.types'
import { IUserService } from './user.interface'
import { IRoleService } from './role/role.interface'
import { RoleDoesNotExists } from './role/role.errors'
import { UserDoesNotExists, UserAlreadyExists } from './user.errors'
import { CreatorType } from '../creator/creator.types'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { Connection } from 'typeorm'
import { User } from '../entities/user.entity'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('UserService в UserModule', () => {

    it(`
        Пользователь корректно создаётся. Попытка создать уже существующего пользователя 
        приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const userService = container
            .get<IUserService>(USER_SYMBOL.UserService)

        const eventMutationFn = jest.fn()
        userService.onMutation(eventMutationFn)

        await expect(userService.isExists('username1')).resolves.toBe(false)
        await expect(userService.create('username1')).resolves.toBeUndefined()
        await expect(userService.create('username1')).rejects.toBeInstanceOf(UserAlreadyExists)
        await expect(userService.isExists('username1')).resolves.toBe(true)

        expect(eventMutationFn).toBeCalledTimes(1)
        expect(eventMutationFn).nthCalledWith(1, expect.objectContaining({
            type: UserEventMutation.Create,
            userName: 'username1'
        }))

        container.restore()
    })
    
    it(`
        Пользователь корректно удаляется. Попытка удалить несуществующего пользователя 
        ни к чему не приведёт
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const userService = container
            .get<IUserService>(USER_SYMBOL.UserService)
        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)

        const eventMutationFn = jest.fn()
        userService.onMutation(eventMutationFn)

        await roleService.create({
            name: 'role1',
            creator: {
                type: CreatorType.System
            }
        })
        
        await expect(userService.create('username1')).resolves.toBeUndefined()
        await expect(userService.setRole('username1', 'role1')).resolves.toBeUndefined()
        await expect(userService.isExists('username1')).resolves.toBe(true)
        await expect(userService.remove('username1')).resolves.toBeUndefined()
        await expect(userService.remove('username1')).resolves.toBeUndefined()
        await expect(userService.isExists('username1')).resolves.toBe(false)

        expect(eventMutationFn).toBeCalledTimes(3)
        expect(eventMutationFn).nthCalledWith(3, expect.objectContaining({
            type: UserEventMutation.Remove,
            userName: 'username1'
        }))

        container.restore()
    })
    
    it(`
        Попытка привязать несуществующего пользователя к какой-либо роли завершается
        исключением
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const userService = container
            .get<IUserService>(USER_SYMBOL.UserService)

        const eventMutationFn = jest.fn()
        userService.onMutation(eventMutationFn)

        await expect(userService.setRole('username1', 'role1')).rejects.toBeInstanceOf(UserDoesNotExists)

        expect(eventMutationFn).toBeCalledTimes(0)

        container.restore()
    })
    
    it(`
        Попытка привязать пользователя к несуществующей роли завершается исключением
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const userService = container
            .get<IUserService>(USER_SYMBOL.UserService)

        const eventMutationFn = jest.fn()
        userService.onMutation(eventMutationFn)

        await userService.create('username1')

        await expect(userService.setRole('username1', 'role1')).rejects.toBeInstanceOf(RoleDoesNotExists)

        expect(eventMutationFn).toBeCalledTimes(1)

        container.restore()
    })
    
    it(`
        Указанная роль корректно привязывается к пользователю. Установка вместо роли пользователя null 
        корректно отвязывает от пользователя какие-либо роли
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const roleService = container
            .get<IRoleService>(USER_SYMBOL.RoleService)
        const userService = container
            .get<IUserService>(USER_SYMBOL.UserService)
        const connection = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        const userRepository = connection.getRepository(User)

        const eventMutationFn = jest.fn()
        userService.onMutation(eventMutationFn)

        await expect(userRepository.count()).resolves.toBe(0)

        await roleService.create({
            name: 'role1',
            creator: {
                type: CreatorType.System
            }
        })
        await userService.create('username1')

        await expect(userRepository.findOne({
            where: {
                username: 'username1'
            }
        })).resolves.toMatchObject({
            roleName: null
        })
        await expect(userService.setRole('username1', 'role1')).resolves.toBeUndefined()
        await expect(userRepository.findOne({
            where: {
                username: 'username1'
            }
        })).resolves.toMatchObject({
            roleName: 'role1'
        })
        await expect(userService.setRole('username1', null)).resolves.toBeUndefined()
        await expect(userRepository.findOne({
            where: {
                username: 'username1'
            }
        })).resolves.toMatchObject({
            roleName: null
        })

        expect(eventMutationFn).toBeCalledTimes(3)
        expect(eventMutationFn).nthCalledWith(2, expect.objectContaining({
            type: UserEventMutation.SetRole,
            userName: 'username1',
            roleName: 'role1'
        }))
        expect(eventMutationFn).nthCalledWith(3, expect.objectContaining({
            type: UserEventMutation.SetRole,
            userName: 'username1',
            roleName: null
        }))

        container.restore()
    })

})
