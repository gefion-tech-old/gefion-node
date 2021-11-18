import { BindableCreator } from '../creator/creator.types'
import { ScriptID } from '../../../core/vm/vm.types'

export const METHOD_SYMBOL = {
    MethodEntity: Symbol('MethodEntity'),
    MethodService: Symbol('MethodService'),
    MethodIsAvailableRPC: Symbol('MethodIsAvailableRPC'),
    IssueService: Symbol('IssueService')
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
    /**
     * Идентификатор скрипта обработчика
     */
    readonly scriptId: ScriptID
}

export interface CallOptions extends Method {
    /**
     * Аргументы, передаваемые методу
     */
    readonly args: any[]
}

export interface MethodHandler {
    /**
     * Сама функция обработчика
     */
    (...args: any[]): any
}

export interface MethodData {
    /**
     * Обработчик метода
     */
    handler: MethodHandler
    /**
     * Идентификатор скрипта в котором запущен обработчик метода
     */
    scriptId: ScriptID
}

/**
 * Порядок таков:
 * 1. Пространство имён
 * 2. Тип метода
 * 2. Название метода
 */
export type Namespaces = Map<string, Types>
export type Types = Map<string, MethodDataList>
export type MethodDataList = Map<string, MethodData>

export const RPCMethodsMethodService = {
    isAvailable: 'MethodModule:MethodService:isAvailable'
}