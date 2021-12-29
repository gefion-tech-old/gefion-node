export const CREATOR_SYMBOL = {
    CreatorEntity: Symbol('CreatorEntity'),
    CreatorService: Symbol('CreatorService')
}

export enum ResourceType {
    Method = 'Method',
    Signal = 'Signal',
    Role = 'Role',
    Permission = 'Permission',
    Controller = 'Controller',
    Middleware = 'Middleware',
    MiddlewareGroup = 'MiddlewareGroup',
    Route = 'Route'
}

export enum CreatorType {
    System = 'System',
    BlockInstance = 'BlockInstance'
}

export interface BindableResource {
    /**
     * Идентификатор ресурса
     */
    id: number
    /**
     * Тип ресурса
     */
    type: ResourceType
}

export interface SystemCreator {
    /**
     * Тип ресурса
     */
    type: CreatorType.System
}

export interface BlockInstanceCreator {
    /**
     * Тип ресурса
     */
    type: CreatorType.BlockInstance
    /**
     * Идентификатор ресурса
     */
    id: number
}

export type BindableCreator = SystemCreator | BlockInstanceCreator