import { interfaces } from 'inversify'
import { InitConfig, InitRunner, INIT_SYMBOL } from './init.types'

export async function getInitConfig(context: interfaces.Context): Promise<InitConfig> {
    const container = context.container

    let runners: InitRunner[] = []
    try {
        runners = container
            .getAll<InitRunner>(INIT_SYMBOL.InitRunner)
    } catch {}
    
    return {
        runners: runners
    }
}