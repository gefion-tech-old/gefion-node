export const METHOD_SYMBOL = {
    MethodEntity: Symbol('MethodEntity'),
    MethodService: Symbol('MethodService'),
    MethodIsAvailableRPC: Symbol('MethodIsAvailableRPC')
}

export interface Method {
    /**
     * Название метода
     */
    readonly name: string
    /**
     * Тип метода
     */
    readonly type: string
    /**
     * Пространство имён метода
     */
    readonly namespace: string
}

export interface MethodOptions extends Method {
    /**
     * Обработчик метода
     */
    readonly handler: MethodHandler
}

export interface CallOptions extends Method {
    /**
     * Аргументы, передаваемые методу
     */
    readonly args: any[]
}

export type MethodHandler = (...args: any[]) => any

/**
 * Порядок таков:
 * 1. Пространство имён
 * 2. Тип метода
 * 2. Название метода
 */
export type Namespaces = Map<string, Map<string, Map<string, MethodHandler>>>

export const RPCMethodsMethodService = {
    isAvailable: 'MethodModule:MethodService:isAvailable'
}