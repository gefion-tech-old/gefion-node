import { AsyncContainerModule, interfaces } from 'inversify'
import { USER_SYMBOL } from './user.types'
import { 
    Permission,
    Role,
    RolePermission,
    User
} from '../entities/user.entity'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { IPermissionService } from './permission/permission.interface'
import { PermissionService } from './permission/permission.service'
import { IRoleService } from './role/role.interface'
import { RoleService } from './role/role.service'
import { IUserService } from './user.interface'
import { UserService } from './user.service'
import { IAuthService } from './auth/auth.interface'
import { AuthConfig } from './auth/auth.types'
import { getAuthConfig } from './auth/auth.config'
import { IRemoteAuthService } from './auth/remote-auth/remote-auth.interface'
import { AuthService } from './auth/auth.service'
import { getAuthHttpPlugin } from './auth/auth.http'
import { FASTIFY_SYMBOL } from '../../../core/fastify/fastify.types'
import { FastifyPluginAsync } from 'fastify'

export const UserModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Permission)
        .whenTargetNamed(USER_SYMBOL.PermissionEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Role)
        .whenTargetNamed(USER_SYMBOL.RoleEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(RolePermission)
        .whenTargetNamed(USER_SYMBOL.RolePermissionEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(User)
        .whenTargetNamed(USER_SYMBOL.UserEntity)

    bind<IPermissionService>(USER_SYMBOL.PermissionService)
        .to(PermissionService)
        .inSingletonScope()

    bind<IRoleService>(USER_SYMBOL.RoleService)
        .to(RoleService)
        .inSingletonScope()

    bind<IUserService>(USER_SYMBOL.UserService)
        .to(UserService)
        .inSingletonScope()

    bind<Promise<FastifyPluginAsync>>(FASTIFY_SYMBOL.FastifyPlugin)
        .toDynamicValue(getAuthHttpPlugin)

    bind<Promise<AuthConfig>>(USER_SYMBOL.AuthConfig)
        .toDynamicValue(getAuthConfig)
        .inSingletonScope()

    bind<IAuthService>(USER_SYMBOL.AuthService)
        .to(AuthService)

    bind<IRemoteAuthService>(USER_SYMBOL.RemoteAuthService)
        .toDynamicValue(() => {
            throw new Error('ДОБАВИТЬ СЕРВИС УДАЛЁННОЙ АУТЕНТИФИКАЦИИ ПОСЛЕ НАПИСАНИЯ ЦЕНТРАЛЬНОГО МИКРОСЕРВИСА ДЛЯ АУТЕНТИФИКАЦИИ')
        })
})