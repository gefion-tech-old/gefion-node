import { APIPropertyStats, APIPropertyStatsReducer, APIProperty } from './api-property.classes'

export interface IAPIPropertyFactory {

    /**
     * Название api свойства
     */
    name(): Promise<string>

    /**
     * Должно ли свойство быть доступно глобально без всякого пространства
     * имён
     */
    isGlobal(): Promise<boolean>

    /**
     * Правильным способом трактовать переданные сегменты статистики. Вернуть
     * экземпляр APIPropertyStatsReducer
     */
    statsReducer(statsSegments: APIPropertyStats[]): Promise<APIPropertyStatsReducer>

    /**
     * Создать новый экземпляр APIProperty
     */
    apiProperty(): Promise<APIProperty>

}