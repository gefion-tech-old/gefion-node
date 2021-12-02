export class GraphCacheError extends Error {}

export class SignalUpdateAndSyncError extends GraphCacheError {

    public name = 'SignalUpdateAndSyncError'
    public message = 'Произошла ошибка при обновлении кеша сигнала'

    public constructor(
        public error: any
    ) {
        super()
    }

}