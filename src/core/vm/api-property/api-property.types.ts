import { IAPIPropertyConstructable, IAPIProperty } from './api-property.interface'

export const APIPropertyEvent = {
    /**
     * Пользовательский скрипт оставил в методах свойства ссылки на себя
     */
    link: Symbol('link'),

    /**
     * Ссылки на пользовательский скрипт были полностью очищены со свойства
     */
    unlink: Symbol('unlink'),

    /**
     * Передача экземпляра класса APIPropertyStats когда свойство посчитает нужным
     * что-то зафиксировать. Трактовать один или несколько экземпляров APIPropertyStats
     * должен исключительно реализованный специально для свойство экземпляр класса
     * APIPropertyStatsReducer
     */
    stats: Symbol('stats'),

    /**
     * Во время выполнения свойства произошла ошибка, которая, как предполагается,
     * должна всплыть и быть видна пользователю. Самый яркий пример - это перехват
     * ошибок в промисах и функциях вне одного цикла событий
     */
    error: Symbol('error')
}

export type APIVersionConstructable = {
    version: string
    properties: IAPIPropertyConstructable[]
}

export type APIVersion = {
    version: string
    properties: IAPIProperty[]
}

export type TargetApiProperty = {
    name: string
    version: string
}

export type APIProperties = {
    [apiProperty: string]: Object
}

export type VersionedAPIProperties = {
    [version: string]: APIProperties
}

export type APINamespacedProperties = {
    [namespace: string]: VersionedAPIProperties
}

export type VersionedAPIPropertiesStats = VersionedAPIProperties