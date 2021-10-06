import { EventEmitter } from 'events'
import { ClearIntervalEventInfo } from './clearInterval.types'

class ClearIntervalEvent {

    /**
     * Из-за того, что на событие будут подписки с большого количество
     * скриптов, нужно убрать ограничение на количество обработчиков
     */
    private eventEmitter = new EventEmitter().setMaxListeners(0)
    
    /**
     * Этот класс существует только ради одного события
     */
    private eventName = Symbol('ClearInterval')

    on(handler: (info: ClearIntervalEventInfo) => void): void {
        this.eventEmitter.on(this.eventName, handler)
    }

    emit(info: ClearIntervalEventInfo): void {
        this.eventEmitter.emit(this.eventName, info)
    }

}

export const clearIntervalEvent = new ClearIntervalEvent