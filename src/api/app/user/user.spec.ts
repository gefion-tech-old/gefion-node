import { getContainer } from '../../../inversify.config'
import { USER_SYMBOL } from './user.types'
import { IUserService } from './user.interface'
import { IRoleService } from './role/role.interface'
import { RoleDoesNotExists } from './role/role.errors'
import { UserDoesNotExists } from './user.errors'

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
        ни к чему не приводит
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const userService = container
            .get<IUserService>(USER_SYMBOL.UserService)

        await expect(userService.isExists('username1')).resolves.toBe(false)
        await expect(userService.create('username1')).resolves.toBeUndefined()
        await expect(userService.create('username1')).resolves.toBeUndefined()
        await expect(userService.isExists('username1')).resolves.toBe(true)

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

        await roleService.create('role1')
        
        await expect(userService.create('username1')).resolves.toBeUndefined()
        await expect(userService.setRole('username1', 'role1')).resolves.toBeUndefined()
        await expect(userService.isExists('username1')).resolves.toBe(true)
        await expect(userService.remove('username1')).resolves.toBeUndefined()
        await expect(userService.remove('username1')).resolves.toBeUndefined()
        await expect(userService.isExists('username1')).resolves.toBe(false)

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

        await expect(userService.setRole('username1', 'role1')).rejects.toBeInstanceOf(UserDoesNotExists)

        container.restore()
    })
    
    it(`
        Попытка привязать пользователя к несуществующей роли завершается исключением
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const userService = container
            .get<IUserService>(USER_SYMBOL.UserService)

        await userService.create('username1')

        await expect(userService.setRole('username1', 'role1')).rejects.toBeInstanceOf(RoleDoesNotExists)

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

        await expect(userService.getRole('username1')).resolves.toBeUndefined()

        await roleService.create('role1')
        await userService.create('username1')

        await expect(userService.getRole('username1')).resolves.toBeNull()
        await expect(userService.setRole('username1', 'role1')).resolves.toBeUndefined()
        await expect(userService.getRole('username1')).resolves.toBe('role1')
        await expect(userService.setRole('username1', null)).resolves.toBeUndefined()
        await expect(userService.getRole('username1')).resolves.toBeNull()

        container.restore()
    })

})
