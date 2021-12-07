import { SignalError } from '../signal.errors'

export class GraphCacheError extends SignalError {}

export class SignalUpdateAndSyncError extends GraphCacheError {

    public name = 'SignalUpdateAndSyncError'
    public message = 'Произошла ошибка при обновлении кеша сигнала'

    public constructor(
        public error: any
    ) {
        super()
    }

}