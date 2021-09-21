import { injectable, inject } from 'inversify'
import { IVMService } from './vm.interface'
import { 
    ScriptID, 
    VM_SYMBOL,
    VMConfig,
    ScriptMetadata,
    ScriptRun,
    APIMetadata,
    ScriptActivityInfo,
    ScriptEvent,
    ScriptInfo,
    ReadyAPIPropertyStats
} from './vm.types'
import { APIPropertyEvent } from './api-property/api-property.types'
import { APIPropertyError } from './api-property/api-property.errors'
import { APIPropertyStatsSegment } from './api-property/api-property.classes'
import { EventEmitter } from 'events'
import { ScriptError } from './vm.errors'
import { IScriptStarterService } from './script-starter/script-starter.interface'

@injectable()
export class VMService implements IVMService {

    public constructor(
        @inject(VM_SYMBOL.VMConfig)
        private config: Promise<VMConfig>,

        @inject(VM_SYMBOL.ScriptStarterService)
        private scriptStarter: IScriptStarterService
    ) {}

    private metaScripts: Map<ScriptID, ScriptMetadata> = new Map

    public async run(params: ScriptRun): Promise<ScriptID> {
        const scriptId = Symbol(params.name)
        const config = await this.config

        /**
         * Сгенерировать используемый скриптом api, включая его метаинформацию
         * для ScriptMetadata типа
         */
        const api = await (async (): Promise<APIMetadata[]> => {
            const apiMetadataList: APIMetadata[] = []

            for (const api of config.api) {
                for (const propertyFactory of api.properties) {
                    /**
                     * Убедиться, что свойство необходимо текущему скрипту
                     */
                    if (!params.apiProperties.includes(
                        await propertyFactory.name()
                    )) {
                        continue
                    }

                    /**
                     * Получить необходимую версию api для добавления в него свойства
                     */
                    const apiMetadata = ((): APIMetadata => {
                        const apiMetadata = apiMetadataList.find(apiMeta => {
                            return apiMeta.version === api.version
                        })

                        if (apiMetadata) {
                            return apiMetadata
                        }

                        const apiMetadataIndex = apiMetadataList.push({
                            version: api.version,
                            properties: []
                        }) - 1

                        return apiMetadataList[apiMetadataIndex]
                    })()

                    /**
                     * Добавить в версию api необходимое свойство и прочую необходимую
                     * информацию
                     */
                    apiMetadata.properties.push({
                        factory: propertyFactory,
                        property: await propertyFactory.apiProperty(),
                        stats: await propertyFactory.stats()
                    })
                }
            }

            return apiMetadataList
        })()

        /**
         * Сгенерировать, сохранить и получить базовую метаинформацию скрипта
         */
        const metaScript = ((): ScriptMetadata => {
            const meta: ScriptMetadata = {
                api: api,
                info: {
                    params: params,
                    dateStart: new Date,
                    errors: []
                },
                eventEmitter: new EventEmitter
            }

            this.metaScripts.set(scriptId, meta)

            return meta
        })()

        /**
         * Навешиваю обработчики событий на все api свойства. Нужно пробросить
         * все события свойств в события скрипта, так как с точки зрения наблюдателя
         * каждое свойство является частью скрипта.
         */
        for (const api of metaScript.api) {
            for (const metaProperty of api.properties) {
                const propertyName = await metaProperty.factory.name()
                
                metaProperty.property.on(APIPropertyEvent.unlink, () => {
                    {
                        /**
                         * Сгенерировать событие активности до возможного события
                         * остановки скрипта
                         */
                        {
                            const info: ScriptActivityInfo = {
                                event: APIPropertyEvent.unlink,
                                apiProperty: {
                                    name: propertyName,
                                    version: api.version
                                }
                            }
        
                            metaScript.eventEmitter.emit(ScriptEvent.activity, info)
                        }
                    }


                    /**
                     * Если на скрипт не осталось ссылок, то запустить событие
                     * `stop`, ведь скрипт завершил свою работу
                     */
                    {
                        if (this.isStopped(scriptId)) {
                            metaScript.eventEmitter.emit(ScriptEvent.stop)
                        }
                    }
                })

                metaProperty.property.on(APIPropertyEvent.error, (error: APIPropertyError) => {
                    metaScript.eventEmitter.emit(
                        ScriptEvent.error,
                        new ScriptError(scriptId, error)
                    )
                })

                metaProperty.property.on(APIPropertyEvent.stats, (segment: APIPropertyStatsSegment) => {
                    {
                        /**
                         * Обновление объекта статистиики
                         */
                        {
                            metaProperty.stats.addStatsSegment(segment)
                        }

                        /**
                         * Генерация события активности
                         */
                        {
                            const info: ScriptActivityInfo = {
                                event: APIPropertyEvent.stats,
                                apiProperty: {
                                    name: propertyName,
                                    version: api.version
                                },
                                params: [segment, metaProperty.stats]
                            }
    
                            metaScript.eventEmitter.emit(ScriptEvent.activity, info)
                        }
                    }
                })
            }
        }

        /**
         * Пробрасываю собственные события скрипта в событие `activity` и
         * добавляю в собственные обработчики события некоторую логику
         */
        {
            this.on(scriptId, ScriptEvent.error, (error: ScriptError) => {
                /**
                 * Сохранить ошибку в список ошибок
                 */
                {
                    metaScript.info.errors.push(error)

                    if (metaScript.info.errors.length > config.maxScriptErrors) {
                        metaScript.info.errors.shift()
                    }
                }

                const info: ScriptActivityInfo = {
                    event: ScriptEvent.error,
                    params: error
                }

                metaScript.eventEmitter.emit(ScriptEvent.activity, info)
            })

            this.on(scriptId, ScriptEvent.remove, () => {
                const info: ScriptActivityInfo = {
                    event: ScriptEvent.remove
                }

                metaScript.eventEmitter.emit(ScriptEvent.activity, info)
            })

            this.on(scriptId, ScriptEvent.stop, () => {
                /**
                 * Поставить дату завершения работы скрипта
                 */
                {
                    metaScript.info.dateEnd = new Date
                }

                /**
                 * Удаляю всю информацию о наиболее старом и уже завершённом скрипте,
                 * если достигнут лимит по количеству допустимых завершённых скриптов
                 */
                (() => {
                    const listStoppedScripts: { 
                        ScriptID: symbol
                        ScriptMetadata: ScriptMetadata
                    }[] = []
    
                    for (const [targetScriptId, targetMetaScript] of this.metaScripts) {
                        if (targetMetaScript.info.dateEnd) {
                            listStoppedScripts.push({
                                ScriptID: targetScriptId,
                                ScriptMetadata: targetMetaScript
                            })
                        }
                    }
    
                    if (listStoppedScripts.length > config.maxStoppedScripts) {
                        listStoppedScripts.sort((scriptPrev, scriptNext) => {
                            const datePrev = scriptPrev.ScriptMetadata.info.dateEnd
                            const dateNext = scriptNext.ScriptMetadata.info.dateEnd
    
                            if (!datePrev || !dateNext) {
                                return 0
                            }
    
                            if (datePrev.getTime() === dateNext.getTime()) {
                                return 0
                            }
    
                            return (datePrev.getTime() < dateNext.getTime()) ? -1 : 1
                        })
                        
                        this.remove(listStoppedScripts[0].ScriptID)
                    }
                })()

                const info: ScriptActivityInfo = {
                    event: ScriptEvent.stop
                }

                metaScript.eventEmitter.emit(ScriptEvent.activity, info)
            })
        }

        /**
         * Сгенерировать и получить объект песочницы для вставки в виртуальную машину
         */
        const sandbox = await (async (): Promise<Object> => {
            const sandbox: object = {}

            /**
             * Вставка значений в объекты любой вложенности начиная с sandbox
             * в качестве корневого объекта
             */
            const setSandboxProperty = (value: object, key: string, nested: string[]) => {
                let currentObject: {
                    [key: string]: any
                } = sandbox

                for (const nesting of nested) {
                    if (!currentObject[nesting]) {
                        currentObject[nesting] = {}
                    }

                    currentObject = currentObject[nesting]
                }

                currentObject[key] = value
            }

            for (const api of metaScript.api) {
                for (const metaProperty of api.properties) {
                    setSandboxProperty(
                        await metaProperty.property.getProperty(),
                        await metaProperty.factory.name(),
                        [config.namespace, api.version]
                    )

                    if (await metaProperty.factory.isGlobal()) {
                        setSandboxProperty(
                            await metaProperty.property.getProperty(),
                            await metaProperty.factory.name(),
                            []
                        )
                    }
                }
            }

            return sandbox
        })()

        /**
         * Запуск указанного скрипта в виртуальной машине и перехват ошибок в
         * случае, если они возникают
         */
         try {
            this.scriptStarter.runFile({
                filename: params.path,
                sandbox: sandbox,
                rootDir: params.rootDir
            })
        } catch(error) {
            const newError = new ScriptError(scriptId, error)
            
            metaScript.eventEmitter.emit(
                ScriptEvent.error, 
                newError
            )
        }

        /**
         * Проверить завершился ли скрипт и в случае чего запустить событие
         * `stop`
         */
        if (this.isStopped(scriptId)) {
            metaScript.eventEmitter.emit(ScriptEvent.stop)
        }

        return scriptId
    }

    /**
     * Узнать завершил ли скрипт уже свою работу или ещё нет
     */
    private isStopped(scriptId: ScriptID): boolean {
        const metaScript = this.metaScripts.get(scriptId)

        if (!metaScript) {
            return false
        }

        for (const api of metaScript.api) {
            for (const metaProperty of api.properties) {
                if (metaProperty.property.hasLink()) {
                    return false
                }
            }
        }

        return true
    }

    on(scriptId: ScriptID, event: symbol, handler: (error: ScriptError) => void): void
    on(scriptId: ScriptID, event: symbol, handler: (info: ScriptActivityInfo) => void): void
    on(scriptId: ScriptID, event: symbol, handler: () => void): void
    public on(scriptId: ScriptID, event: symbol, handler: any): void {
        const metaScript = this.metaScripts.get(scriptId)

        if (!metaScript) {
            return
        }

        metaScript.eventEmitter.on(event, handler)
    }

    public remove(scriptId: ScriptID): void {
        const metaScript = this.metaScripts.get(scriptId)

        if (!metaScript) {
            return
        }

        for (const api of metaScript.api) {
            for (const metaProperty of api.properties) {
                metaProperty.property.linkCollector()
            }
        }

        this.metaScripts.delete(scriptId)
        metaScript.eventEmitter.emit(ScriptEvent.remove)
    }

    public listScripts(): ScriptID[] {
        const listScripts: ScriptID[] = []

        for (const scriptId of this.metaScripts.keys()) {
            listScripts.push(scriptId)
        }

        return listScripts
    }

    public info(scriptId: ScriptID): ScriptInfo | undefined {
        const metaScript = this.metaScripts.get(scriptId)

        if (!metaScript) {
            return
        }

        return metaScript.info
    }

    public async stats(scriptId: ScriptID): Promise<ReadyAPIPropertyStats[] | undefined> {
        const metaScript = this.metaScripts.get(scriptId)

        if (!metaScript) {
            return
        }

        const stats: ReadyAPIPropertyStats[] = []

        for (const api of metaScript.api) {
            for (const metaProperty of api.properties) {
                stats.push({
                    name: await metaProperty.factory.name(),
                    version: api.version,
                    stats: metaProperty.stats
                })
            }
        }

        return stats
    }

}