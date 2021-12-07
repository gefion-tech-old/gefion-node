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

    bind<IRoleService>(USER_SYMBOL.RoleService)
        .to(RoleService)

    bind<IUserService>(USER_SYMBOL.UserService)
        .to(UserService)
})