import { AsyncContainerModule, interfaces } from 'inversify'
import { ASYNC_RETRY_SYMBOL } from './async-retry.types'
import asyncRetry from 'async-retry'

export const AsyncRetryModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<typeof asyncRetry>(ASYNC_RETRY_SYMBOL.AsyncRetry)
        .toConstantValue(asyncRetry)
})