import {
    APIProperty
} from '../../../../../core/vm/api-property/api-property.classes'
import { APIPropertyError } from '../../../../../core/vm/api-property/api-property.errors'
import { SetTimeoutName } from './setTimeout.types'
import { SystemV1Name } from '../../system-v1.modules'
import { HandlerIsNotFunction, MissingIDOfTimeouts } from './setTimeout.errors'
import {
    APIPropertyEvent,
    APIPropertyParamsEvent,
} from '../../../../../core/vm/api-property/api-property.types'
import { clearTimeoutEvent } from '../clearTimeout/clearTimeout.event'
import { ClearTimeoutEventInfo } from '../clearTimeout/clearTimeout.types'
import { getLoggerErrorFormat } from '../../../../../utils/error-format'
import { getAppLogger } from '../../../../../utils/logger'
import {
    SetTimeoutErrorStatsSegment,
    SetTimeoutAddActiveTimersStatsSegment,
    SetTimeoutRemoveActiveTimersStatsSegment
} from './setTimeout.classes'

/**
 * Естественное освобождение ссылок будет происходить из свойства
 * clearTimeout
 */
export class SetTimeoutAPIProperty extends APIProperty {

    /**
     * Функция для полного удаления тайм-аута. Включая оставленные на него ссылки
     */
    private fullClearTimeout(timeoutId: symbol): void {
        const nodeJSTimeout = this.callParams
            .getCallParams<NodeJS.Timeout>(timeoutId)

        if (!nodeJSTimeout) {
            getAppLogger().error(getLoggerErrorFormat(new MissingIDOfTimeouts), 'MissingIDOfTimeouts')
            return
        }

        clearTimeout(nodeJSTimeout)
        this.callParams.removeCallParams(timeoutId)

        /**
         * Генерация события статистики
         */
        this.events.stats(new SetTimeoutRemoveActiveTimersStatsSegment)
    }

    public async init(scriptId: symbol): Promise<any> {
        /**
         * Генерирование событие unlink, если каким-либо образом были
         * удалены все параметры в callParams свойстве
         */
        this.callParams.on(APIPropertyParamsEvent.paramsMissing, () => {
            this.events.unlink()
        })

        /**
         * Насильственное освобождение всех ссылок на пользовательский скрипт
         */
        this.on(APIPropertyEvent.linkCollector, () => {
            this.callParams
                .getAllCallParams<NodeJS.Timeout>()
                .forEach(nodeJSTimeout => {
                    this.fullClearTimeout(nodeJSTimeout.key)
                })
        })

        /**
         * Реагирую на событие из свойства clearTimeout. Очищаю тайм-аут и отвязываю ссылки.
         * Само свойство clearTimeout этого не делает
         */
        clearTimeoutEvent.on((info: ClearTimeoutEventInfo) => {
            if (info.scriptId === scriptId) {
                this.fullClearTimeout(info.timeoutId)
            }
        })

        /**
         * Генерация события статистики
         */
        this.on(APIPropertyEvent.error, () => {
            this.events.stats(new SetTimeoutErrorStatsSegment)
        })

        return (handler: TimerHandler, ...params: any[]): symbol => {
            if (typeof handler !== 'function') {
                throw new HandlerIsNotFunction
            }

            /**
             * Генерирую номинальный идентификатор тайм-аута для виртуальной
             * машины. Не даю доступ коду виртуальной машины к внутренним объектам
             * тайм-аута от греха подальше
             */
            const timeoutId = Symbol('TimeoutID')

            /**
             * Определить свою функцию обработчик, которая будет обёртывать пользовательскую
             * функцию
             */
            const __handler = (...args: any[]): void => {
                try {
                    handler(...args)
                } catch(error) {
                    this.events.error(new APIPropertyError({
                        name: SetTimeoutName,
                        version: SystemV1Name
                    }, error))
                } finally {
                    /**
                     * Удаляю сохранённый в параметрах тайм-аут
                     */
                    this.callParams.removeCallParams(timeoutId)

                    /**
                     * Генерация события статистики
                     */
                    this.events.stats(new SetTimeoutRemoveActiveTimersStatsSegment)
                }
            }

            /**
             * Регистрирую тайм-аут и сохраняю его в параметры
             */
            {
                const nodeJSTimeout = setTimeout(__handler, ...params)
                this.callParams.setCallParams<NodeJS.Timeout>(timeoutId, nodeJSTimeout)
            }

            /**
             * Генерация события статистики
             */
            this.events.stats(new SetTimeoutAddActiveTimersStatsSegment)

            return timeoutId
        }
    }

    public hasLink(): boolean {
        return this.callParams.isCallParamsExists()
    }

}