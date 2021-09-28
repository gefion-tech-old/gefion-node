import {
    APIProperty
} from '../../../../core/vm/api-property/api-property.classes'
import { APIPropertyError } from '../../../../core/vm/api-property/api-property.errors'
import { SetImmediateName } from './setImmediate.types'
import { SystemV1Name } from '../../system-v1.modules'
import { HandlerIsNotFunction, MissingIDOfImmediates } from './setImmediate.errors'
import {
    APIPropertyEvent,
    APIPropertyParamsEvent,
} from '../../../../core/vm/api-property/api-property.types'
import { clearImmediateEvent } from '../clearImmediate/clearImmediate.event'
import { ClearImmediateEventInfo } from '../clearImmediate/clearImmediate.types'
import { getLoggerErrorFormat } from '../../../../utils/error-format'
import { getAppLogger } from '../../../../utils/logger'
import {
    SetImmediateErrorStatsSegment,
    SetImmediateAddActiveImmediatesStatsSegment,
    SetImmediateRemoveActiveImmediatesStatsSegment
} from './setImmediate.classes'

/**
 * Естественное освобождение ссылок будет происходить из свойства
 * clearImmediate
 */
export class SetImmediateAPIProperty extends APIProperty {

    /**
     * Функция для полного удаления immediate. Включая оставленные на него ссылки
     */
    private fullClearImmediate(immediateId: symbol): void {
        const nodeJSImmediate = this.callParams
            .getCallParams<NodeJS.Immediate>(immediateId)

        if (!nodeJSImmediate) {
            getAppLogger().error(getLoggerErrorFormat(new MissingIDOfImmediates), 'MissingIDOfImmediates')
            return
        }

        clearImmediate(nodeJSImmediate)
        this.callParams.removeCallParams(immediateId)

        /**
         * Генерация события статистики
         */
        this.events.stats(new SetImmediateRemoveActiveImmediatesStatsSegment)
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
                .getAllCallParams<NodeJS.Immediate>()
                .forEach(nodeJSImmediate => {
                    this.fullClearImmediate(nodeJSImmediate.key)
                })
        })

        /**
         * Реагирую на событие из свойства clearImmediate. Очищаю immediate и отвязываю ссылки.
         * Само свойство clearImmediate этого не делает
         */
        clearImmediateEvent.on((info: ClearImmediateEventInfo) => {
            if (info.scriptId === scriptId) {
                this.fullClearImmediate(info.immediateId)
            }
        })

        /**
         * Генерация события статистики
         */
        this.on(APIPropertyEvent.error, () => {
            this.events.stats(new SetImmediateErrorStatsSegment)
        })
        
        return (handler: TimerHandler, ...params: any[]): symbol => {
            if (typeof handler !== 'function') {
                throw new HandlerIsNotFunction
            }

            /**
             * Генерирую номинальный идентификатор immediate для виртуальной
             * машины. Не даю доступ коду виртуальной машины к внутренним объектам
             * immediate от греха подальше
             */
            const immediateId = Symbol('ImmediateID')

            /**
             * Определить свою функцию обработчик, которая будет обёртывать пользовательскую
             * функцию
             */
            const __handler = (...args: any[]): void => {
                try {
                    handler(...args)
                } catch(error: any) {
                    this.events.error(new APIPropertyError({
                        name: SetImmediateName,
                        version: SystemV1Name
                    }, error))
                } finally {
                    /**
                     * Удаляю сохранённый в параметрах immediate
                     */
                    this.callParams.removeCallParams(immediateId)

                    /**
                     * Генерация события статистики
                     */
                    this.events.stats(new SetImmediateRemoveActiveImmediatesStatsSegment)
                }
            }

            /**
             * Регистрирую immediate и сохраняю его в параметры
             */
            {
                const nodeJSImmediate = setImmediate(__handler, ...params)
                this.callParams.setCallParams<NodeJS.Immediate>(immediateId, nodeJSImmediate)
            }

            /**
             * Генерация события статистики
             */
            this.events.stats(new SetImmediateAddActiveImmediatesStatsSegment)

            return immediateId
        }
    }

    public hasLink(): boolean {
        return this.callParams.isCallParamsExists()
    }

}