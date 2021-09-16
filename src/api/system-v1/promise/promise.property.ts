import { 
    TargetAPIProperty
} from './promise.types'
import { APIProperty } from '../../../core/vm/api-property/api-property.classes'
import { VMPromise } from './promise.classes'
import { 
    APIPropertyEvent, 
    APIPropertyParamsEvent,
} from '../../../core/vm/api-property/api-property.types'
import { APIPropertyError } from '../../../core/vm/api-property/api-property.errors'

/**
 * Цель: перехватывать все неперехваченные ошибки в промисах и
 * особождать ссылки на пользовательский код в случае, если был
 * запущен сборщик ссылок.
 * 
 * Сборщик ссылок здесь нужен для того, чтобы предотвратить ситуацию, когда
 * до запуска функции, переданной в промис, запускается сборщик мусора и освобождает
 * все ссылки. Но на следующий тик событий запускается пользовательская функция из
 * промиса и массово генерирует новые ссылки на скрипт, которые уже не будут
 * никак отслеживаться.
 * 
 * Примечания по ошибкам. Так как перехват ошибок довольно проблематично сделать
 * на скорую руку таким образом, чтобы позже не обнаруживалось большое количество
 * багов и подводных камней, то перехват ошибок будет происходить на уровне
 * процесса с помощью стандартного события `unhandledRejection`. Все промисы, унаследованные от VMPromise
 * будут проигнорированы в главном обработчике для логирования. Вместо логирования у каждого
 * такого промиса из обработчика события будет запускаться собственная функция callUnhandledRejection.
 */
export class PromiseAPIProperty extends APIProperty {

    public async init(): Promise<any> {
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
            this.callParams.removeAllCallParams()
        })
        
        /**
         * Генерация нового безопасного экземпляра Promise для песочницы
         * виртуальной машины
         */
        const promise = ((): PromiseConstructor => {
            const callParams = this.callParams
            const events = this.events
    
            class VMPropertyPromise<T> extends VMPromise<T> {

                /**
                 * Обработчик неперехваченного исключения, которое произошло в текущем
                 * промисе
                 */
                public callUnhandledRejection(reason: any) {
                    events.error(new APIPropertyError(TargetAPIProperty, reason))
                }

                public then<TResult1 = T, TResult2 = never>(
                    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
                    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
                ): Promise<TResult1 | TResult2> {
                    /**
                     * Сохранить параметры
                     */
                    const thenOnFulfilledId = Symbol('thenParamsId')
                    const thenOnRejectedId = Symbol('thenRejectedId')

                    if (typeof onfulfilled === 'function') {
                        callParams.setCallParams<typeof onfulfilled>(thenOnFulfilledId, onfulfilled)
                    }

                    if (typeof onrejected === 'function') {
                        callParams.setCallParams<typeof onrejected>(thenOnRejectedId, onrejected)
                    }

                    /**
                     * Определить свою функцию для обработки успешного выполнения промиса
                     */
                    const __onfulfilled: typeof onfulfilled = (value) => {
                        /**
                         * Проверить, что параметр еще существует и ссылки не были почищены.
                         * Если параметра нет, то ничего не делать
                         */
                        if (!callParams.hasCallParams(thenOnFulfilledId)) {
                            /**
                             * Удаляю второй обработчик, ибо он не сработает
                             */
                            callParams.removeCallParams(thenOnRejectedId)
                            return (undefined as any)
                        }

                        const func = callParams
                            .getCallParams<typeof onfulfilled>(thenOnFulfilledId)

                        try {
                            /**
                             * Явно уведомлять пользователя об ошибке в параметре
                             */
                            return (func as any)(value)
                        } catch(error) {
                            throw error
                        } finally {
                            /**
                             * Удаляю оба обработчика, ибо второй не сработает
                             */
                            callParams.removeCallParams(thenOnFulfilledId)
                            callParams.removeCallParams(thenOnRejectedId)
                        }
                    }

                    /**
                     * Определить свою функцию для обработки ошибки
                     */
                    const __onrejected: typeof onrejected = (reason) => {
                        /**
                         * Проверить, что параметр еще существует и ссылки не были почищены.
                         * Если параметра нет, то ничего не делать
                         */
                        if (!callParams.hasCallParams(thenOnRejectedId)) {
                            /**
                             * Удаляю второй обработчик, ибо он не сработает
                             */
                            callParams.removeCallParams(thenOnFulfilledId)
                            return (undefined as any)
                        }

                        const func = callParams
                            .getCallParams<typeof onrejected>(thenOnRejectedId)

                        try {
                            /**
                             * Явно уведомлять пользователя об ошибке в параметре
                             */
                            return (func as any)(reason)
                        } catch(error) {
                            throw error
                        } finally {
                            /**
                             * Удаляю оба обработчика, ибо второй не сработает
                             */
                            callParams.removeCallParams(thenOnRejectedId)
                            callParams.removeCallParams(thenOnFulfilledId)
                        }
                    }

                    return super.then(__onfulfilled, __onrejected)
                }
    
            }
            
            return VMPropertyPromise
        })()
        
        return promise
    }

    public hasLink(): boolean {
        return this.callParams.isCallParamsExists()
    }

}