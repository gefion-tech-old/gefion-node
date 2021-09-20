import { 
    APIPropertyStatsSegment
} from './api-property.classes'
import { APIPropertyError } from './api-property.errors'

/**
 * События, генерируемые в реализация APIProperty класса
 */
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
     * Передача экземпляра класса APIPropertyStatsSegment когда свойство посчитает нужным
     * что-то зафиксировать. Трактовать один или несколько экземпляров APIPropertyStats
     * должен исключительно реализованный специально для свойства экземпляр класса
     * APIPropertyStats
     */
    stats: Symbol('stats'),

    /**
     * Во время выполнения свойства произошла ошибка, которая, как предполагается,
     * должна всплыть и быть видна пользователю. Самый яркий пример - это перехват
     * ошибок в промисах и функциях вне одного цикла событий
     */
    error: Symbol('error'),

    /**
     * Событие запуска сборщика мусора. В большей степени оно необходимо для того,
     * чтобы внутренняя реализация свойства из обрабтчиков этого события освобождало
     * в различных контекстах ссылки
     */
    linkCollector: Symbol('linkCollector')
}

/**
 * События, генерируемые в классе APIPropertyCallParams. Необходимы для внутренней
 * реализации
 */
export const APIPropertyParamsEvent = {
    
    /**
     * В экземпляре класса в результате удаления параметра больше нет ни одного
     * сохранённого параметра
     */
    paramsMissing: Symbol('paramsMissing')

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
    stats: (statsSegment: APIPropertyStatsSegment) => void

    /**
     * Генератор события error
     */
    error: (error: APIPropertyError) => void
}

export type TargetApiProperty = {
    name: string
    version: string
}