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
     * Получить итоговую человеческую статистику на основе необработанного
     * массива частей статистики
     */
    abstract stats(): Object

}

