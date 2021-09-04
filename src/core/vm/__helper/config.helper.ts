import { VMConfig, API } from '../vm.types'
import { getVMConfig } from '../__mock/VMConfig.mock'
import { getAPIPropertyFactory } from '../__mock/APIPropertyFactory.mock'
import { getAPIPropertyStatsReducer } from '../__mock/APIPropertyStatsReducer.mock'
import { getAPIProperty } from '../__mock/APIProperty.mock'

export function getDefaultVMConfig(api: API[] = []): () => Promise<VMConfig> {
    const propertyFactory1 = getAPIPropertyFactory({
        name: () => 'property1',
        isGlobal: () => true,
        statsReducer: (statsSegments) => {
            return getAPIPropertyStatsReducer({
                stats: () => ({})
            })(statsSegments)
        },
        apiProperty: () => getAPIProperty({
            hasLink: () => false,
            init: () => ({
                name: 'property1'
            }),
            linkCollector: () => {}
        })
    })

    const propertyFactory1_2 = getAPIPropertyFactory({
        name: () => 'property1',
        isGlobal: () => true,
        statsReducer: (statsSegments) => {
            return getAPIPropertyStatsReducer({
                stats: () => ({})
            })(statsSegments)
        },
        apiProperty: () => getAPIProperty({
            hasLink: () => false,
            init: () => ({
                name: 'property1_2'
            }),
            linkCollector: () => {}
        })
    })

    const propertyFactory2 = getAPIPropertyFactory({
        name: () => 'property2',
        isGlobal: () => false,
        statsReducer: (statsSegments) => {
            return getAPIPropertyStatsReducer({
                stats: () => ({})
            })(statsSegments)
        },
        apiProperty: () => getAPIProperty({
            hasLink: () => false,
            init: () => ({
                name: 'property2'
            }),
            linkCollector: () => {}
        })
    })

    const propertyFactory3 = getAPIPropertyFactory({
        name: () => 'property3',
        isGlobal: () => false,
        statsReducer: (statsSegments) => {
            return getAPIPropertyStatsReducer({
                stats: () => ({})
            })(statsSegments)
        },
        apiProperty: () => getAPIProperty({
            hasLink: () => false,
            init: () => ({
                name: 'property3'
            }),
            linkCollector: () => {}
        })
    })

    const propertyFactory4 = getAPIPropertyFactory({
        name: () => 'property4',
        isGlobal: () => false,
        statsReducer: (statsSegments) => {
            return getAPIPropertyStatsReducer({
                stats: () => ({})
            })(statsSegments)
        },
        apiProperty: () => getAPIProperty({
            hasLink: () => false,
            init: () => ({
                name: 'property4'
            }),
            linkCollector: () => {}
        })
    })

    return getVMConfig({
        namespace: 'gefion',
        maxScriptErrors: 3,
        maxStatsSegments: 3,
        maxStoppedScripts: 3,
        api: [
            {
                version: 'v1',
                properties: [propertyFactory1, propertyFactory2]
            },
            {
                version: 'v2',
                properties: [propertyFactory1, propertyFactory3]
            },
            {
                version: 'v3',
                properties: [propertyFactory1_2, propertyFactory2, propertyFactory4]
            }
        ].concat(api)
    })
}