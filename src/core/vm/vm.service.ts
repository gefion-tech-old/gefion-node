import { injectable, inject } from 'inversify'
import { IVMService } from './vm.interface'
import { VM2_SYMBOL } from '../../dep/vm2/vm2.types'
import VM2TYPE from 'vm2'
import { 
    ScriptID, 
    VM_SYMBOL,
    ScriptRun, 
    VMConfig,
    ScriptEvent,
    ScriptActivityInfo,
    ScriptMetadata
} from './vm.types'
import { 
    APINamespacedProperties, 
    APIProperties,
    APIVersion,
    APIPropertyEvent
} from './api-property/api-property.types'
import { EventEmitter } from 'events'
import { ScriptError } from './vm.errors'
import { ApiPropertyError } from './api-property/api-property.errors'
import { APIPropertyStats } from './api-property/api-property.classes'

@injectable()
export class VMService implements IVMService {

    public constructor(
        @inject(VM2_SYMBOL.VM2)
        private vm2: typeof VM2TYPE,

        @inject(VM_SYMBOL.VMConfig)
        private config: Promise<VMConfig>
    ) {}

    private scripts: Map<ScriptID, ScriptMetadata> = new Map

    public async run(params: ScriptRun): Promise<ScriptID> {
        const scriptId = Symbol(params.name)
        const config = await this.config

        /**
         * Получить все версии только нужных экземпляров IAPIProperty
         */
        const apiVersions = await (async () => {
            const apiVersions: APIVersion[] = []

            for (const apiVersion of config.apiVersions) {
                for (const ApiProperty of apiVersion.properties) {
                    const apiProperty = new ApiProperty

                    if (params.apiProperties.includes(
                        await apiProperty.name()
                    )) {
                        let api = apiVersions.find((api) => {
                            return api.version === apiVersion.version
                        })

                        if (!api) {
                            api = {
                                version: apiVersion.version,
                                properties: []
                            }
                            apiVersions.push(api)
                        }

                        api.properties.push(apiProperty)
                    }
                }
            }

            return apiVersions
        })()

        /**
         * Сохраняем базовую информацию по скрипту
         */
        const script: ScriptMetadata = {
            apiVersions: apiVersions,
            info: {
                params: params,
                dateStart: new Date
            },
            eventEmitter: new EventEmitter
        }
        this.scripts.set(scriptId, script)

        /**
         * Генерация sandbox на основе полученных ранее версий используемых 
         * свойств
         */
        const sandbox = await (async () => {
            const sandbox: APINamespacedProperties = {}

            for (const apiVersion of apiVersions) {
                for (const apiProperty of apiVersion.properties) {
                    const property = await apiProperty.property()
                    
                    ;(   
                        sandbox[config.namespace] 
                            || (sandbox[config.namespace] = {})
                    );
                    ;(
                        sandbox[config.namespace][apiVersion.version]
                            || (sandbox[config.namespace][apiVersion.version] = {})
                    );
                    ;(
                        sandbox[config.namespace][apiVersion.version][await apiProperty.name()]
                            || (sandbox[config.namespace][apiVersion.version][await apiProperty.name()] = property)
                    );

                    if (await apiProperty.isGlobal()) {
                        /**
                         * К сожалению, вынужденная мера. Не хочу ставить any при объявлении интерфейса
                         */
                        sandbox[await apiProperty.name()] = (property as any)
                    }
                }
            }

            return sandbox
        })()

        /**
         * Функция для проверки того, завершил ли скрипт свою работу
         */
        const isScriptStopped = (): boolean => {
            for (const apiVersion of apiVersions) {
                for (const apiProperty of apiVersion.properties) {
                    if (apiProperty.hasLink()) {
                        return false
                    }
                }
            }

            return true
        }

        /**
         * Навешиваю обработчики событий на все api свойства. Нужно пробросить
         * все события свойств в события скрипта, так как с точки зрения наблюдателя
         * каждое свойство является частью скрипта
         */
        for (const apiVersion of apiVersions) {
            for (const apiProperty of apiVersion.properties) {
                apiProperty.on(APIPropertyEvent.error, (error: ApiPropertyError) => {
                    script.eventEmitter.emit(
                        ScriptEvent.error, 
                        new ScriptError(scriptId, error)
                    )
                })

                apiProperty.on(APIPropertyEvent.link, () => {
                    (async () => {
                        const info: ScriptActivityInfo = {
                            event: APIPropertyEvent.link,
                            apiProperty: {
                                name: await apiProperty.name(),
                                version: apiVersion.version
                            }
                        }
    
                        script.eventEmitter.emit(ScriptEvent.activity, info)
                    })()
                })

                apiProperty.on(APIPropertyEvent.unlink, () => {
                    (async () => {
                        const info: ScriptActivityInfo = {
                            event: APIPropertyEvent.unlink,
                            apiProperty: {
                                name: await apiProperty.name(),
                                version: apiVersion.version
                            }
                        }

                        script.eventEmitter.emit(ScriptEvent.activity, info)
                    })()
                })

                apiProperty.on(APIPropertyEvent.stats, (stats: APIPropertyStats) => {
                    (async () => {
                        const info: ScriptActivityInfo = {
                            event: APIPropertyEvent.stats,
                            apiProperty: {
                                name: await apiProperty.name(),
                                version: apiVersion.version
                            },
                            params: stats
                        }

                        script.eventEmitter.emit(ScriptEvent.activity, info)
                    })()
                })
            }
        }

        /**
         * Навешиваю на события `stop` и `error` срабатывание события `activity`
         */
        this.on(scriptId, ScriptEvent.error, (error: ScriptError) => {
            const info: ScriptActivityInfo = {
                event: ScriptEvent.error,
                params: error
            }

            script.eventEmitter.emit(ScriptEvent.activity, info)
        })
        this.on(scriptId, ScriptEvent.stop, () => {
            const info: ScriptActivityInfo = {
                event: ScriptEvent.stop
            }

            script.eventEmitter.emit(ScriptEvent.activity, info)
        })

        /**
         * Определяю когда все api свойства удаляют ссылки на скрипт и
         * скрипт можно пометить завершенным
         */
        this.on(scriptId, ScriptEvent.activity, (info: ScriptActivityInfo) => {
            if (info.event === APIPropertyEvent.unlink) {
                if (isScriptStopped()) {
                    script.info.dateEnd = new Date
                    script.eventEmitter.emit(ScriptEvent.stop)
                }
            }
        })

        /**
         * Создание экземпляра виртуальной машины
         */
        const vm = new this.vm2.NodeVM({
            console: 'off',
            sandbox: sandbox,
            require: {
                root: params.rootDir
            }
        })
        
        /**
         * Запуск указанного скрипта в виртуальной машине и перехват ошибок в
         * случае, если они возникают
         */
        try {
            vm.runFile(params.path)
        } catch(error) {
            const newError = new ScriptError(scriptId, error)
            
            script.info.error = newError
            script.eventEmitter.emit(
                ScriptEvent.error, 
                newError
            )
        }

        /**
         * Проверить наличие ссылок на скрипт в api свойствах и если нет ни одной
         * ссылки, то запустить событие `stop`
         */
        if (isScriptStopped()) {
            script.info.dateEnd = new Date
            script.eventEmitter.emit(ScriptEvent.stop)
        }

        return scriptId
    }

    on(
        scriptId: ScriptID, 
        event: symbol, 
        handler: (() => void) 
            | ((error: ScriptError) => void) 
            | ((info: ScriptActivityInfo) => void)
    ): void {
        const script = this.scripts.get(scriptId)

        if (!script) {
            return
        }

        script.eventEmitter.on(event, handler)
    }

}