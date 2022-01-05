export const USER_SYMBOL = {
    UserEntity: Symbol('UserEntity'),
    RoleEntity: Symbol('RoleEntity'),
    RolePermissionEntity: Symbol('RolePermissionEntity'),
    PermissionEntity: Symbol('PermissionEntity'),
    PermissionService: Symbol('PermissionService'),
    RoleService: Symbol('RoleService'),
    UserService: Symbol('UserService'),
    AuthService: Symbol('AuthService'),
    AuthConfig: Symbol('AuthConfig'),
    RemoteAuthService: Symbol('RemoteAuthService')
}

/**
 * Идентификатор события мутации
 */
export const UserEventMutationName = Symbol('UserMutationEvent')

export enum UserEventMutation {
    /**
     * Событие создания пользователя
     */
    Create = 'Create',
    /**
     * Событие изменения роли пользователя
     */
    SetRole = 'SetRole',
    /**
     * Событие удаления пользователя
     */
    Remove = 'Remove'
}

export interface RoleEventContext {
    type: UserEventMutation.SetRole
    userName: string
    roleName: string | null
}

export interface UserEventContext {
    type: UserEventMutation,
    userName: string
}

export type EventContext = UserEventContext | RoleEventContext