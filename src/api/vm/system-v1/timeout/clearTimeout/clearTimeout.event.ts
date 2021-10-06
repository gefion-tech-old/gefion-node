import { EventEmitter } from 'events'
import { ClearTimeoutEventInfo } from './clearTimeout.types'

class ClearTimeoutEvent {

    /**
     * Из-за того, что на событие будут подписки с большого количество
     * скриптов, нужно убрать ограничение на количество обработчиков
     */
    private eventEmitter = new EventEmitter().setMaxListeners(0)
    
    /**
     * Этот класс существует только ради одного события
     */
    private eventName = Symbol('ClearTimeout')

    on(handler: (info: ClearTimeoutEventInfo) => void): void {
        this.eventEmitter.on(this.eventName, handler)
    }

    emit(info: ClearTimeoutEventInfo): void {
        this.eventEmitter.emit(this.eventName, info)
    }

}

export const clearTimeoutEvent = new ClearTimeoutEvent