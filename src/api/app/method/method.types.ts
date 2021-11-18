import { BindableCreator } from '../creator/creator.types'
import { ScriptID } from '../../../core/vm/vm.types'

export const METHOD_SYMBOL = {
    MethodEntity: Symbol('MethodEntity'),
    MethodService: Symbol('MethodService'),
    MethodIsAvailableRPC: Symbol('MethodIsAvailableRPC')
}

export type MethodId = number

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
     * Создатель метода
     */
    readonly creator: BindableCreator
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

export interface MethodHandlerBase {
    /**
     * Сама функция обработчика
     */
    (...args: any[]): any
}

export interface MethodHandler extends MethodHandlerBase {
    /**
     * Идентификатор скрипта обработчика
     */
    scriptId: ScriptID
}

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