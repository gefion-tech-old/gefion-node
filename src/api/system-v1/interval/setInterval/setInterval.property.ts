import {
    APIProperty
} from '../../../../core/vm/api-property/api-property.classes'
import { APIPropertyError } from '../../../../core/vm/api-property/api-property.errors'
import { SetIntervalName } from './setInterval.types'
import { SystemV1Name } from '../../system-v1.modules'
import { HandlerIsNotFunction, MissingIDOfIntervals } from './setInterval.errors'
import {
    APIPropertyEvent,
    APIPropertyParamsEvent,
} from '../../../../core/vm/api-property/api-property.types'
import { clearIntervalEvent } from '../clearInterval/clearInterval.event'
import { ClearIntervalEventInfo } from '../clearInterval/clearInterval.types'
import { getLoggerErrorFormat } from '../../../../utils/error-format'
import { getAppLogger } from '../../../../utils/logger'
import {
    SetIntervalErrorStatsSegment,
    SetIntervalAddActiveIntervalsStatsSegment,
    SetIntervalRemoveActiveIntervalsStatsSegment
} from './setInterval.classes'

/**
 * Естественное освобождение ссылок будет происходить из свойства
 * clearInterval
 */
export class SetIntervalAPIProperty extends APIProperty {

    /**
     * Функция для полного удаления интервала. Включая оставленные на него ссылки
     */
    private fullClearInterval(intervalId: symbol): void {
        const nodeJSInterval = this.callParams
            .getCallParams<NodeJS.Timer>(intervalId)


        if (!nodeJSInterval) {
            getAppLogger().error(getLoggerErrorFormat(new MissingIDOfIntervals), 'MissingIDOfIntervals')
            return
        }

        clearInterval(nodeJSInterval)
        this.callParams.removeCallParams(intervalId)

        /**
         * Генерация события статистики
         */
        this.events.stats(new SetIntervalRemoveActiveIntervalsStatsSegment)
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
                .getAllCallParams<NodeJS.Timer>()
                .forEach(nodeJSInterval => {
                    this.fullClearInterval(nodeJSInterval.key)
                })
        })

        /**
         * Реагирую на событие из свойства clearInterval. Очищаю интервал и отвязываю ссылки.
         * Само свойство clearInterval этого не делает
         */
        clearIntervalEvent.on((info: ClearIntervalEventInfo) => {
            if (info.scriptId === scriptId) {
                this.fullClearInterval(info.intervalId)
            }
        })

        /**
         * Генерация события статистики
         */
        this.on(APIPropertyEvent.error, () => {
            this.events.stats(new SetIntervalErrorStatsSegment)
        })

        return (handler: TimerHandler, ...params: any[]): symbol => {
            if (typeof handler !== 'function') {
                throw new HandlerIsNotFunction
            }

            /**
             * Генерирую номинальный идентификатор интервала для виртуальной
             * машины. Не даю доступ коду виртуальной машины к внутренним объектам
             * интервала от греха подальше
             */
            const intervalId = Symbol('IntervalID')

            /**
             * Определить свою функцию обработчик, которая будет обёртывать пользовательскую
             * функцию
             */
            const __handler = (...args: any[]): void => {
                try {
                    handler(...args)
                } catch(error: any) {
                    this.events.error(new APIPropertyError({
                        name: SetIntervalName,
                        version: SystemV1Name
                    }, error))
                }
            }

            /**
             * Регистрирую интервал и сохраняю его в параметры
             */
            {
                const nodeJSInterval = setInterval(__handler, ...params)
                this.callParams.setCallParams<NodeJS.Timer>(intervalId, nodeJSInterval)
            }

            /**
             * Генерация события статистики
             */
            this.events.stats(new SetIntervalAddActiveIntervalsStatsSegment)

            return intervalId
        }
    }

    public hasLink(): boolean {
        return this.callParams.isCallParamsExists()
    }

}