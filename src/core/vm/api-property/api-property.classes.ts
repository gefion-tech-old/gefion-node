import { APIPropertyError } from './api-property.errors'
import { 
    EventEmitters, 
    APIPropertyEvent, 
    APIPropertyParamsEvent,
    CallParamsMapObject
} from './api-property.types'
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
    private eventEmitter = new EventEmitter

    /**
     * События api свойства, которые следует вызывать вместо eventEmitter
     * напрямую
     */
    protected events: EventEmitters = {
        unlink: () => {
            this.eventEmitter.emit(APIPropertyEvent.unlink)
        },
        stats: (statsSegment: APIPropertyStatsSegment) => {
            this.eventEmitter.emit(APIPropertyEvent.stats, statsSegment)
        },
        error: (error: APIPropertyError) => {
            this.eventEmitter.emit(APIPropertyEvent.error, error)
        }
    }

    /**
     * Сборщик всех оставленных в свойстве внешних ссылок на скрипт. Изо
     * всех сил избегать утечки памяти. Вызывает событие linkCollector на который могут
     * подписаться все дочерние классы с помощью метода on
     */
    public linkCollector(): void {
        this.eventEmitter.emit(APIPropertyEvent.linkCollector)
    }

    /**
     * Экземпляр класса APIPropertyCallParams через который следует прогонять
     * и использовать абсолютно все передаваемые параметры из пользовательского
     * скрипта.
     * 
     * Со всеми параметрами следует быть осторожным и не оставлять на них долгоживущих
     * ссылок.
     * 
     * Также, в асболютно любой момент все ссылки на параметры через этот экземпляр
     * могут стать недоступными. К этому стоит быть готовым и корректно обрабатывать
     * это поведение
     */
    protected callParams = new APIPropertyCallParams()

    /**
     * Получить инициализированное свойство этого класса
     */
    public async getProperty(scriptId: symbol): Promise<Object> {
        if (!this.property) {
            this.property = await this.init(scriptId)
        }

        return this.property
    }

    /**
     * Инициализировать необходимое значение свойства. Инициализировано оно
     * будет только один раз для одного экземпляра, так что об этом можно
     * не волноваться при реализации
     * 
     * @param scriptId: symbol - Идентификатор скрипта, который инициализирует свойство.
     * Этот идентификатор необязательно явно использовать, более того, лучше этого не делать,
     * возвращать из функции локальные и ни на что не влияющие копии объектов, а не привязываться
     * к идентификатору. Однако, иногда без него не обойтись
     */
    abstract init(scriptId: symbol): Promise<Object>

    /**
     * Есть ли в свойстве внешние ссылки
     * 
     * @param scriptId: symbol - Идентификатор скрипта, которому принадлежит свойство. Может
     * понадобиться на некоторых свойств, но предпочтительно избегать его
     */
    abstract hasLink(scriptId: symbol): boolean

    /**
     * Подписаться на генерируемые события свойства 
     */
    on(event: symbol, handler: () => void): void
    on(event: symbol, handler: (error: APIPropertyError) => void): void
    on(event: symbol, handler: (segment: APIPropertyStatsSegment) => void): void
    public on(event: symbol, handler: any): void {
        this.eventEmitter.on(event, handler)
    }

}


/**
 * Сегмент статистики. Передаётся при вызове события `stats` какого-либо
 * api свойства
 */
export class APIPropertyStatsSegment {

    public constructor(
        private closure: () => any
    ) {}

    /**
     * Получить сырой объект сегмента статистики
     */
    public rawSegment(): any {
        return this.closure()
    }

}



/**
 * Класс статистики свойства. В него передаются сегменты статистики, на основе
 * которых плавно должна генерироваться статистика
 */
export abstract class APIPropertyStats {

    /**
     * Получить итоговую человеческую статистику на основе необработанных
     * сегментов статистики
     */
    abstract stats(): any

    /**
     * Добавить новый сегмент статистики
     */
    abstract addStatsSegment(segment: APIPropertyStatsSegment): void

}



/**
 * Класс, через который следует использовать параметры, которые передаёт
 * пользовательский скрипт. Очень важно использовать именно этот класс
 * для доступа к параметрам, чтобы иметь больший контроль над ссылками
 * на структуры данных пользовательского скрипта.
 * 
 * Использоваться это, в основном, должно в APIProperty классе и во всех
 * его потомках
 */
export class APIPropertyCallParams {

    /**
     * Параметры вызовов api свойства
     */
    private callParams = new Map<symbol, any>()

    /**
     * Генератор событий для события, которое срабатывает, если в результате
     * удаления параметра не осталось ни одного сохранённого параметра
     */
    private eventEmitter = new EventEmitter

    /**
     * Функция для сохранения переданных параметров
     */
     public setCallParams<T>(id: symbol, params: T): void {
        this.callParams.set(id, params)
    }

    /**
     * Функция для получения сохранённых параметров. С полученными
     * параметрами нужно быть аккуратным и не оставлять долгоживущих
     * ссылок на любое из свойств параметра.
     */
    public getCallParams<T>(id: symbol): T | undefined {
        return this.callParams.get(id)
    }

    /**
     * Получить все параметры вместе с ключами
     */
    public getAllCallParams<TValue>(): CallParamsMapObject<TValue>[] {
        const values: CallParamsMapObject<TValue>[] = []
        
        for (const [key, value] of this.callParams.entries()) {
            values.push({
                key,
                value
            })
        }

        return values
    }

    /**
     * Проверить существует ли параметр
     */
    public hasCallParams(id: symbol): boolean {
        return this.callParams.has(id)
    }

    /**
     * Функция для удаления сохранённого параметра. Если все ссылки были удалены,
     * то автоматически запускается функция emitUnlink для генерации события unlink
     */
    public removeCallParams(id: symbol): void {
        this.callParams.delete(id)

        if (!this.isCallParamsExists()) {
            this.eventEmitter.emit(APIPropertyParamsEvent.paramsMissing)
        }
    }

    /**
     * Функция для удаления всех сохранённых параметров. После удаления
     * автоматически запускается функция emitUnlink для генерации события unlink
     */
    public removeAllCallParams(): void {
        this.callParams.clear()
        this.eventEmitter.emit(APIPropertyParamsEvent.paramsMissing)
    }

    /**
     * Узнать есть ли хотя бы один сохранённый параметр. Соответственно, с помощью
     * этого можно узнать есть ли ссылки на пользовательский скрипт
     */
    public isCallParamsExists(): boolean {
        return this.callParams.size > 0
    }

    /**
     * Подписка на события
     */
    public on(event: symbol, handler: () => void): void {
        this.eventEmitter.on(event, handler)
    }

}