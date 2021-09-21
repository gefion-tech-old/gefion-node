import {  
    APIPropertyStats, 
    APIProperty 
} from './api-property.classes'

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
     * Вернуть экземпляр класса статистики.
     */
    stats(): Promise<APIPropertyStats>

    /**
     * Создать новый экземпляр APIProperty
     */
    apiProperty(): Promise<APIProperty>

}