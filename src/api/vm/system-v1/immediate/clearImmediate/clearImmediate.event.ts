import { EventEmitter } from 'events'
import { ClearImmediateEventInfo } from './clearImmediate.types'

class ClearImmediateEvent {

    /**
     * Из-за того, что на событие будут подписки с большого количество
     * скриптов, нужно убрать ограничение на количество обработчиков
     */
    private eventEmitter = new EventEmitter().setMaxListeners(0)
    
    /**
     * Этот класс существует только ради одного события
     */
    private eventName = Symbol('ClearImmediate')

    on(handler: (info: ClearImmediateEventInfo) => void): void {
        this.eventEmitter.on(this.eventName, handler)
    }

    emit(info: ClearImmediateEventInfo): void {
        this.eventEmitter.emit(this.eventName, info)
    }

}

export const clearImmediateEvent = new ClearImmediateEvent