import { APIPropertyStats } from './api-property.classes'
import { APIPropertyError } from './api-property.errors'

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

export type EventEmitters = {
    /**
     * Генератор события link
     */
    link: () => void

    /**
     * Генератор события unlink
     */
    unlink: () => void

    /**
     * Генератор события stats
     */
    stats: (stats: APIPropertyStats) => void

    /**
     * Генератор события error
     */
    error: (error: APIPropertyError) => void
}

export type TargetApiProperty = {
    name: string
    version: string
}