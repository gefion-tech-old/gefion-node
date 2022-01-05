import { UserError } from '../user.errors'

export class RoleError extends UserError {}

export class RoleAlreadyExists extends RoleError {

    public name = 'RoleAlreadyExists'
    public message = 'Указанная роль уже существует'

}

export class RoleDoesNotExists extends RoleError {

    public name = 'RoleDoesNotExists'
    public message = 'Указанной роли не существует'

}

export class RoleDoesNotHavePermission extends RoleError {

    public name = 'RoleDoesNotHavePermission'
    public message = 'Указанная роль не имеет указанного разрешения'

}

export class PermissionAlreadyBound extends RoleError {

    public name = 'PermissionAlreadyBound'
    public message = 'Указанная роль уже привязана к указанному полномочию'

}