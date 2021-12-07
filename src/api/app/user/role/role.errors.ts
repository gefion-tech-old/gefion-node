export class RoleError extends Error {}

export class RoleDoesNotExists extends RoleError {

    public name = 'RoleDoesNotExists'
    public message = 'Указанной роли не существует'

}

export class RoleDoesNotHavePermission extends RoleError {

    public name = 'RoleDoesNotHavePermission'
    public message = 'Указанная роль не имеет указанного разрешения'

}