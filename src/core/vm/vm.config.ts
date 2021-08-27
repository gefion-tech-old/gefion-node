import { interfaces } from 'inversify'
import { VMConfig, VM_SYMBOL } from './vm.types'
import { IAPIPropertyConstructable } from './api-property/api-property.interface'

export async function getVMConfig(context: interfaces.Context): Promise<VMConfig> {
    const container = context.container

    let apiPropertiesV1: IAPIPropertyConstructable[] = []
    try {
        apiPropertiesV1 = container
            .getAll<IAPIPropertyConstructable>(VM_SYMBOL.APIPropertyV1)
    } catch {}

    return {
        maxStatsSegments: 1000,
        maxStoppedScripts: 30,
        namespace: 'gefion',
        apiVersions: [
            {
                version: 'v1',
                properties: apiPropertiesV1
            }
        ]
    }
}