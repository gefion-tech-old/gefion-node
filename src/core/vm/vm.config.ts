import { interfaces } from 'inversify'
import { VMConfig, VM_SYMBOL } from './vm.types'
import { IAPIPropertyFactory } from './api-property/api-property.interface'

export async function getVMConfig(context: interfaces.Context): Promise<VMConfig> {
    const container = context.container

    let apiPropertyFactoryV1: IAPIPropertyFactory[] = []
    try {
        apiPropertyFactoryV1 = container
            .getAll<IAPIPropertyFactory>(VM_SYMBOL.APIPropertyFactoryV1)
    } catch {}

    return {
        maxStatsSegments: 1000,
        maxStoppedScripts: 30,
        maxScriptErrors: 30,
        namespace: 'gefion',
        api: [
            {
                version: 'v1',
                properties: apiPropertyFactoryV1
            }
        ]
    }
}