import { APIPropertyError } from './api-property.errors'
import { EventEmitters, APIPropertyEvent } from './api-property.types'
import { EventEmitter } from 'events'

/**
 * Главный класс api свойства от которого нужно наследоваться для создания
 * нового свойства
 */
export abstract class APIProperty {

    /**
     * Фактическое значение свойства
     */
    private property: Object

    /**
     * Внутрення реализация событий, наследуемый класс не должен погрязнуть
     * в деталях реализации
     */
    private eventEmitter: EventEmitter = new EventEmitter

    /**
     * События api свойства, которые следует вызывать вместо eventEmitter
     * напрямую
     */
    protected events: EventEmitters = {
        link: () => {
            this.eventEmitter.emit(APIPropertyEvent.link)
        },
        unlink: () => {
            this.eventEmitter.emit(APIPropertyEvent.unlink)
        },
        stats: (statsSegment: APIPropertyStats) => {
            this.eventEmitter.emit(APIPropertyEvent.stats, statsSegment)
        },
        error: (error: APIPropertyError) => {
            this.eventEmitter.emit(APIPropertyEvent.error, error)
        }
    }

    /**
     * Получить инициализированное свойство этого класса
     */
    public async getProperty(): Promise<Object> {
        if (!this.property) {
            this.property = await this.init()
        }

        return this.property
    }

    /**
     * Инициализировать необходимое значение свойства. Инициализировано оно
     * будет только один раз для одного экземпляра, так что об этом можно
     * не волноваться при реализации
     */
    abstract init(): Promise<Object>

    /**
     * Сборщик всех оставленных в свойстве внешних ссылок на скрипт. Изо
     * всех сил избегать утечки памяти
     */
    abstract linkCollector(): void

    /**
     * Есть ли в свойстве внешние ссылки
     */
    abstract hasLink(): boolean

    /**
     * Подписаться на генерируемые события свойства 
     */
    on(event: symbol, handler: () => void): void
    on(event: symbol, handler: (error: APIPropertyError) => void): void
    on(event: symbol, handler: (stats: APIPropertyStats) => void): void
    public on(event: symbol, handler: any): void {
        this.eventEmitter.on(event, handler)
    }
}



/**
 * Часть события, экземпляр которой будет передаваться при вызове события
 * `stats` какого-либо api свойства
 */
export class APIPropertyStats {

    public constructor(
        private closure: () => Object
    ) {}

    /**
     * Выполнить сохранённое замыкание и получить часть статистики
     */
    public stats(): Object {
        return this.closure()
    }

}



/**
 * Преобразователь сегментов статистики какого-либо api свойства в единую
 * человекочитаемую статистику
 */
export abstract class APIPropertyStatsReducer {

    public constructor(
        protected propertyStats: APIPropertyStats[]
    ) {}

    /**
     * Получить итоговую человеческую статистику на основе необработанных
     * сегментов статистики
     */
    abstract stats(): Object

}