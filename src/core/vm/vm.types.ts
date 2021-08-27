import { 
    APIVersionConstructable, 
    TargetApiProperty, 
    APIVersion 
} from './api-property/api-property.types'
import { EventEmitter } from 'events'

export const VM_SYMBOL = {
    VMService: Symbol('VMService'),
    VMConfig: Symbol('VMConfig'),
    APIPropertyV1: Symbol('APIPropertyV1')
}

export const ScriptEvent = {
    /**
     * Скрипт завершил свою работу (неизвестно с ошибкой или нет). Запускается 
     * событие перед событием error, если скрипт завершился в результате ошибки. 
     * Может произвольно завершиться после того, как все api свойства освободят 
     * ссылки на структуры пользовательского скрипта
     */
    stop: Symbol('stop'),

    /**
     * Скрипт завершил свою работу в результате ошибки, которая передаётся в
     * событие.
     */
    error: Symbol('error'),

    /**
     * В скрипте или в каком либо из свойств сработало какое-либо событие.
     * Даёт знать о том, что в целом что-то произошло
     */
    activity: Symbol('activity')
}

export type ScriptRun = {
    /**
     * Путь к файлу, который должен быть запущен
     */
    readonly path: string

    /**
     * Номинальное название скрипта, чтобы его мог идентифицировать пользователь.
     * Путь для этого не подходит. Возможно, зачастую это будет путь к git
     * репозиторию
     */
    readonly name: string

    /**
     * Путь к каталогу файлы внутри которого могут быть импортированы
     * в запущенном скрипте
     */
    readonly rootDir: string

    /**
     * Список названий зарегистрированных глобальных свойств, которые
     * должны быть доступны в запущенном скрипте
     */
    readonly apiProperties: string[]
}

export type ScriptInfo = {
    /**
     * Параметры с которыми был запущен скрипт
     */
    params: ScriptRun

    /**
     * Дата запуска скрипта
     */
    dateStart: Date

    /**
     * Дата завершения работы скрипта
     */
    dateEnd?: Date

    /**
     * Ошибка, с которой завершился скрипт
     */
    error?: Error
}

export type ScriptActivityInfo = {
    /**
     * Событие, которое спровоцировало активность
     */
    event: Symbol

    /**
     * Если событие произошло в api свойстве, то указать его название и версию
     */
    apiProperty?: TargetApiProperty

    /**
     * Параметры, которые были пареданы в сработанное событие
     */
    params?: Object
}

export type ScriptID = Symbol

export type VMConfig = {
    /**
     * Максимальное количество остановленных скриптов информация о которых
     * будет продолжать храниться в памяти до явного удаления. По достижении
     * лимита будут удаляться самые старые скрипты.
     */
    maxStoppedScripts: number

    /**
     * Максимальное количество сегментов статистики по одному api свойству. По достижении
     * лимита наиболее старые сегменты затираются
     */
    maxStatsSegments: number

    /**
     *  Пространство имён для api свойств
     */
    namespace: string

    /**
     * Все api свойства всех версий. Очень важен порядок массива. Вначале должны
     * обязательно быть самые ранние версии. Это связано с тем, что глобальные api
     * свойства перезатираются по циклу более новыми api свойствами
     */
    apiVersions: APIVersionConstructable[]
}

export type ScriptMetadata = {
    apiVersions: APIVersion[]
    info: ScriptInfo,
    eventEmitter: EventEmitter
}