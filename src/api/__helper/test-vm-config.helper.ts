import { VMConfig } from '../../core/vm/vm.types'
import { getAPIPropertyFactory } from '../../core/vm/__mock/APIPropertyFactory.mock'
import { getAPIPropertyStats } from '../../core/vm/__mock/APIPropertyStats.mock'
import { getAPIProperty } from '../../core/vm/__mock/APIProperty.mock'

/**
 * Версия и название создаваемого api свойства для тестирования
 */
export const TestAPIProperty = {
    version: 'test',
    name: 'test'
}

/**
 * Добавляет в текущую конфигурацию виртуальной машины api свойство
 * с тестовыми функциями, которые определяются при написании самих тестов
 * 
 * @param testObject - Объект тестов, который будет вставлен в песочницу виртуальной
 * машины
 * @param vmConfig - Конфигурация, которую следует дополнить. Предполагается,
 * что это стандартная конфигурация
 * @param config - Концигурация, которую нужно слить с первой конфигурацией и дополнить
 * поверх свойством для тестирования
 */
export function addTestInVmConfig(testObject: any, vmConfig: VMConfig, config?: VMConfig): () => Promise<VMConfig> {
    return async function(): Promise<VMConfig> {
        const newConfig: VMConfig = {
            namespace: config?.namespace ?? vmConfig.namespace,
            maxStoppedScripts: config?.maxStoppedScripts ?? vmConfig.maxStoppedScripts,
            maxScriptErrors: config?.maxScriptErrors ?? vmConfig.maxScriptErrors,
            api: config?.api ?? vmConfig.api
        }

        newConfig.api.push({
            version: TestAPIProperty.version,
            properties: [
                getAPIPropertyFactory({
                    name: () => TestAPIProperty.name,
                    isGlobal: () => true,
                    stats: () => getAPIPropertyStats({
                        stats: () => ({}),
                        addStatsSegment: () => {}
                    }),
                    apiProperty: () => getAPIProperty({
                        hasLink: () => false,
                        linkCollector: () => {},
                        init: () => testObject
                    })
                })
            ]
        })

        return newConfig
    }
}