import { APIPropertyStats } from './api-property.classes'
import { ApiPropertyError } from './api-property.errors'

export interface IAPIPropertyConstructable {
    new(): IAPIProperty
}

export interface IAPIProperty {

    /**
     * Название api свойства
     */
    name(): Promise<string>

    /**
     * Получить необходимое свойство
     */
    property(): Promise<Object>

    /**
     * Сборщик всех оставленных в свойствах внешних ссылок на скрипт. Изо
     * всех сил избегать утечки памяти
     */
    linkCollector(): Promise<void>

    /**
     * В свойстве есть внешние ссылки
     */
    hasLink(): boolean

    /**
     * Должно ли свойство быть доступно глобально без всякого пространства
     * имён
     */
    isGlobal(): Promise<boolean>

    /**
     * Подписаться на события свойства 
     */
    on(event: symbol, handler: () => void): void
    on(event: symbol, handler: (error: ApiPropertyError) => void): void
    on(event: symbol, handler: (stats: APIPropertyStats) => void): void

}