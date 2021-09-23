import { getContainer } from '../../inversify.config'
import { VM_SYMBOL, ScriptEvent, ScriptActivityInfo } from './vm.types'
import { IVMService } from './vm.interface'
import { getDefaultVMConfig } from './__helper/config.helper'
import { getScriptStarterService } from './__mock/ScriptStarterService.mock'
import { getAPIPropertyFactory } from './__mock/APIPropertyFactory.mock'
import { getAPIPropertyStats } from './__mock/APIPropertyStats.mock'
import { getAPIProperty } from './__mock/APIProperty.mock'
import { FileRunOptions } from './script-starter/script-starter.types'
import { APIPropertyError } from './api-property/api-property.errors'
import { 
    APIPropertyStatsSegment, 
    APIPropertyStats
} from './api-property/api-property.classes'
import { 
    APIPropertyEvent
} from './api-property/api-property.types'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()

    container.rebind(VM_SYMBOL.VMConfig)
        .toDynamicValue(getDefaultVMConfig())
    
    container.rebind(VM_SYMBOL.ScriptStarterService)
        .to(getScriptStarterService({
            runFile: () => {}
        }))
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('Сервис виртуальной машины', () => {

    it(`
        При запуске скрипта метаинформация о скрипте корректно генерируется
        и становится доступной #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()
        
        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptRunParamsList = [
            {
                name: 'Название скрипта 1',
                path: '/path/path/a1.js',
                rootDir: '/path/path1',
                apiProperties: ['property1', 'property2']
            },
            {
                name: 'Название скрипта 2',
                path: '/path/path/a2.js',
                rootDir: '/path/path2',
                apiProperties: ['property3']
            },
            {
                name: 'Название скрипта 3',
                path: '/path/path/a3.js',
                rootDir: '/path/path3',
                apiProperties: []
            },
        ]

        for (const scriptRunParams of scriptRunParamsList) {
            const scriptId = await vmService.run(scriptRunParams)
            const scriptInfo = vmService.info(scriptId)
    
            expect(vmService.listScripts()).toContain(scriptId)

            expect(scriptInfo).not.toBeUndefined()
            expect(scriptInfo?.dateStart).toBeInstanceOf(Date)
            expect(scriptInfo?.dateEnd).toBeInstanceOf(Date)
            expect(scriptInfo?.errors?.length).toBe(0)
    
            expect(scriptInfo?.params?.name).toBe(scriptRunParams.name)
            expect(scriptInfo?.params?.path).toBe(scriptRunParams.path)
            expect(scriptInfo?.params?.rootDir).toBe(scriptRunParams.rootDir)
            expect(scriptInfo?.params?.apiProperties).toEqual(
                expect.arrayContaining(scriptRunParams.apiProperties)
            )
        }

        container.restore()
    })

    it(`
        Запуская скрипт в него передаётся корректно сгенерированный глобальный
        объект
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const FileRunOptionsList: FileRunOptions[] = []

        container.rebind(VM_SYMBOL.ScriptStarterService)
            .to(getScriptStarterService({
                runFile: (options) => {
                    FileRunOptionsList.push(options)
                }
            }))

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptRunParamsList = [
            {
                name: 'Название скрипта 1',
                path: '/path/path/a1.js',
                rootDir: '/path/path1',
                apiProperties: ['property1', 'property2'],
                sandbox: ((): object => {
                    return {
                        gefion: {
                            v1: {
                                property1: {
                                    name: 'property1'
                                },
                                property2: {
                                    name: 'property2'
                                }
                            },
                            v2: {
                                property1: {
                                    name: 'property1'
                                },
                            },
                            v3: {
                                property2: {
                                    name: 'property2'
                                },
                                property1: {
                                    name: 'property1_2'
                                }
                            }
                        },
                        property1: {
                            name: 'property1_2'
                        }
                    }
                })()
            },
            {
                name: 'Название скрипта 2',
                path: '/path/path/a2.js',
                rootDir: '/path/path2',
                apiProperties: ['property3'],
                sandbox: ((): object => {
                    return {
                        gefion: {
                            v2: {
                                property3: {
                                    name: 'property3'
                                }
                            }
                        }
                    }
                })()
            },
            {
                name: 'Название скрипта 3',
                path: '/path/path/a3.js',
                rootDir: '/path/path3',
                apiProperties: [],
                sandbox: ((): object => {
                    return {}
                })()
            },
        ]

        for (const scriptRunParams of scriptRunParamsList) {
            await vmService.run(scriptRunParams)

            const scriptRunOptions = FileRunOptionsList.shift()

            expect(scriptRunOptions).not.toBeUndefined()
            expect(scriptRunOptions).toMatchObject<FileRunOptions>({
                filename: scriptRunParams.path,
                rootDir: scriptRunParams.rootDir,
                sandbox: scriptRunParams.sandbox
            })
        }

        expect(vmService.listScripts().length).toBe(3)
        expect(FileRunOptionsList.length).toBe(0)

        container.restore()
    })

    it(`
        События, генерируемые api свойствами скрипта, успешно всплывают в качестве
        события активности самого скрипта. Событие ошибки, которое генерирует api 
        свойство скрипта, не приводят к дублированию события активности и генерирует 
        событие ошибки скрипта #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const unlinkEventFn = jest.fn()
        const statsEventFn = jest.fn()
        const errorEventFn = jest.fn()
        const MyError = class extends Error {
            public name = 'MyError'
        }

        let startEventsFn: any

        container.rebind(VM_SYMBOL.ScriptStarterService)
            .to(getScriptStarterService({
                runFile: (options) => {
                    startEventsFn = (options.sandbox as any)
                        .gefion.v4.test1.startEvents
                }
            }))

        container.rebind(VM_SYMBOL.VMConfig)
            .toDynamicValue(getDefaultVMConfig([
                {
                    version: 'v4',
                    properties: [
                        getAPIPropertyFactory({
                            name: () => 'test1',
                            isGlobal: () => true,
                            stats: () => {
                                return getAPIPropertyStats({
                                    stats: () => ({}),
                                    addStatsSegment: () => {}
                                })
                            },
                            apiProperty: () => getAPIProperty({
                                hasLink: () => true,
                                init: (events) => {
                                    return {
                                        name: 'test1',
                                        startEvents: () => {
                                            events.error(new APIPropertyError({
                                                name: 'test1',
                                                version: 'v4'
                                            }, new MyError()))
                                            
                                            events.stats(new APIPropertyStatsSegment((): object => {
                                                return {
                                                    name: 'test1'
                                                }
                                            }))

                                            events.unlink()
                                        }
                                    }
                                },
                                linkCollector: () => {}
                            })
                        })
                    ]
                }
            ]))

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptRunParams = {
            name: 'Название скрипта 1',
            path: '/path/path/a1.js',
            rootDir: '/path/path1',
            apiProperties: ['property1', 'test1'],
        }

        const scriptId = await vmService.run(scriptRunParams)

        expect(vmService.info(scriptId)).not.toBeUndefined()

        vmService.on(scriptId, ScriptEvent.activity, (info: ScriptActivityInfo) => {
            if (info.event === ScriptEvent.error) {
                expect(info.params).toMatchObject({
                    name: 'ScriptError',
                    scriptId: scriptId,
                    error: {
                        name: 'APIPropertyError',
                        targetApiProperty: {
                            name: 'test1',
                            version: 'v4'
                        },
                        error: {
                            name: 'MyError'
                        }
                    }
                })
                errorEventFn()
            }

            if (info.event === APIPropertyEvent.stats) {
                expect((info.params as any)[0]).toBeInstanceOf(APIPropertyStatsSegment)
                expect((info.params as any)[0].rawSegment()).toMatchObject({
                    name: 'test1'
                })
                expect((info.params as any)[1]).toBeInstanceOf(APIPropertyStats)

                statsEventFn()
            }

            if (info.event === APIPropertyEvent.unlink) {
                unlinkEventFn()
            }
        })

        startEventsFn()

        expect(errorEventFn).toHaveBeenCalledTimes(1)
        expect(statsEventFn).toHaveBeenCalled()
        expect(unlinkEventFn).toHaveBeenCalled()

        container.restore()
    })

    it(`
        Событие ошибки скрипта успешно сохраняется в список ошибок скрипта и
        этот список не может привысить лимит #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const errorEventFn = jest.fn()
        const MyError = class extends Error {
            public name = 'MyError'
        }

        let startEventsFn: any

        container.rebind(VM_SYMBOL.ScriptStarterService)
            .to(getScriptStarterService({
                runFile: (options) => {
                    startEventsFn = (options.sandbox as any)
                        .gefion.v4.test1.startEvents
                }
            }))

        container.rebind(VM_SYMBOL.VMConfig)
            .toDynamicValue(getDefaultVMConfig([
                {
                    version: 'v4',
                    properties: [
                        getAPIPropertyFactory({
                            name: () => 'test1',
                            isGlobal: () => true,
                            stats: () => {
                                return getAPIPropertyStats({
                                    stats: () => ({}),
                                    addStatsSegment: () => {}
                                })
                            },
                            apiProperty: () => getAPIProperty({
                                hasLink: () => true,
                                init: (events) => {
                                    return {
                                        name: 'test1',
                                        startEvents: () => {
                                            events.error(new APIPropertyError({
                                                name: 'test1',
                                                version: 'v4'
                                            }, new MyError('Первая ошибка')))

                                            events.error(new APIPropertyError({
                                                name: 'test1',
                                                version: 'v4'
                                            }, new MyError('Вторая ошибка')))

                                            events.error(new APIPropertyError({
                                                name: 'test1',
                                                version: 'v4'
                                            }, new MyError('Третья ошибка')))

                                            events.error(new APIPropertyError({
                                                name: 'test1',
                                                version: 'v4'
                                            }, new MyError('Четвёртая ошибка')))
                                        }
                                    }
                                },
                                linkCollector: () => {}
                            })
                        })
                    ]
                }
            ]))

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptRunParams = {
            name: 'Название скрипта 1',
            path: '/path/path/a1.js',
            rootDir: '/path/path1',
            apiProperties: ['property1', 'test1'],
        }

        const scriptId = await vmService.run(scriptRunParams)

        expect(vmService.info(scriptId)).not.toBeUndefined()

        vmService.on(scriptId, ScriptEvent.activity, (info: ScriptActivityInfo) => {
            if (info.event === ScriptEvent.error) {
                expect(info.params).toMatchObject({
                    name: 'ScriptError',
                    scriptId: scriptId,
                    error: {
                        name: 'APIPropertyError',
                        targetApiProperty: {
                            name: 'test1',
                            version: 'v4'
                        },
                        error: {
                            name: 'MyError'
                        }
                    }
                })
                errorEventFn()
            }
        })

        startEventsFn()

        expect(errorEventFn).toHaveBeenCalledTimes(4)
        expect(vmService.info(scriptId)?.errors).toHaveLength(3)
        expect(vmService.info(scriptId)?.dateEnd).toBeUndefined()
        expect(vmService.info(scriptId)?.errors[0]).toMatchObject({
            name: 'ScriptError',
            scriptId: scriptId,
            error: {
                name: 'APIPropertyError',
                targetApiProperty: {
                    name: 'test1',
                    version: 'v4'
                },
                error: {
                    name: 'MyError',
                    message: 'Вторая ошибка'
                }
            }
        })
        expect(vmService.info(scriptId)?.errors[2]).toMatchObject({
            name: 'ScriptError',
            scriptId: scriptId,
            error: {
                name: 'APIPropertyError',
                targetApiProperty: {
                    name: 'test1',
                    version: 'v4'
                },
                error: {
                    name: 'MyError',
                    message: 'Четвёртая ошибка'
                }
            }
        })

        container.restore()
    })

    it(`
        Все собственные события скрипта генерируют событие активности скрипта
        за исключением самого события активности #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const unlinkEventFn = jest.fn()
        const stopEventFn = jest.fn()
        const errorEventFn = jest.fn()
        const eventFn = jest.fn()
        const MyError = class extends Error {
            public name = 'MyError'
        }

        let startEventsFn: any
        let test1HasLink = true

        container.rebind(VM_SYMBOL.ScriptStarterService)
            .to(getScriptStarterService({
                runFile: (options) => {
                    startEventsFn = (options.sandbox as any)
                        .gefion.v4.test1.startEvents
                }
            }))

        container.rebind(VM_SYMBOL.VMConfig)
            .toDynamicValue(getDefaultVMConfig([
                {
                    version: 'v4',
                    properties: [
                        getAPIPropertyFactory({
                            name: () => 'test1',
                            isGlobal: () => true,
                            stats: () => {
                                return getAPIPropertyStats({
                                    stats: () => ({}),
                                    addStatsSegment: () => {}
                                })
                            },
                            apiProperty: () => getAPIProperty({
                                hasLink: () => test1HasLink,
                                init: (events) => {
                                    return {
                                        name: 'test1',
                                        startEvents: () => {
                                            events.error(new APIPropertyError({
                                                name: 'test1',
                                                version: 'v4'
                                            }, new MyError('Ошибочка')))

                                            test1HasLink = false

                                            events.unlink()
                                        }
                                    }
                                },
                                linkCollector: () => {}
                            })
                        })
                    ]
                }
            ]))    
            
        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptRunParams = {
            name: 'Название скрипта 1',
            path: '/path/path/a1.js',
            rootDir: '/path/path1',
            apiProperties: ['property1', 'test1'],
        }

        const scriptId = await vmService.run(scriptRunParams)

        vmService.on(scriptId, ScriptEvent.activity, (info: ScriptActivityInfo) => {
            if (info.event === ScriptEvent.error) {
                expect(info.params).toMatchObject({
                    name: 'ScriptError',
                    scriptId: scriptId,
                    error: {
                        name: 'APIPropertyError',
                        targetApiProperty: {
                            name: 'test1',
                            version: 'v4'
                        },
                        error: {
                            name: 'MyError',
                            message: 'Ошибочка'
                        }
                    }
                })
                errorEventFn()
            }

            if (info.event === ScriptEvent.stop) {
                stopEventFn()
            }

            if (info.event === APIPropertyEvent.unlink) {
                unlinkEventFn()
            }

            eventFn()
        })

        startEventsFn()

        expect(errorEventFn).toHaveBeenCalled()
        expect(stopEventFn).toHaveBeenCalled()
        expect(unlinkEventFn).toHaveBeenCalled()
        expect(eventFn).toHaveBeenCalledTimes(3)

        container.restore()
    })

    it(`
        Сегмент статистики, который передается в обработчик события статистики, 
        корректно принимает участие в генерации итоговой статистики. Параметры в
        событие статистики передаются корректные #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const statsEventFn = jest.fn()

        let startEventsFn: any

        container.rebind(VM_SYMBOL.ScriptStarterService)
            .to(getScriptStarterService({
                runFile: (options) => {
                    startEventsFn = (options.sandbox as any)
                        .gefion.v4.test1.startEvents
                }
            }))

        container.rebind(VM_SYMBOL.VMConfig)
            .toDynamicValue(getDefaultVMConfig([
                {
                    version: 'v4',
                    properties: [
                        getAPIPropertyFactory({
                            name: () => 'test1',
                            isGlobal: () => true,
                            stats: () => getAPIPropertyStats({
                                stats: (context) => {
                                    const ctx = (context as any)
                    
                                    return {
                                        count: ctx.count
                                    }
                                },
                                addStatsSegment: (context, segment) => {
                                    const ctx = (context as any)
                                    ctx.count = ctx.count ? ctx.count : 0
                    
                                    expect(segment).toBeInstanceOf(APIPropertyStatsSegment)
                    
                                    ctx.count += segment.rawSegment().count
                                }
                            }),
                            apiProperty: () => getAPIProperty({
                                hasLink: () => false,
                                init: (events) => {
                                    return {
                                        name: 'test1',
                                        startEvents: () => {
                                            events.stats(new APIPropertyStatsSegment((): object => {
                                                return {
                                                    type: 'stats',
                                                    name: 'stats1',
                                                    count: 1
                                                }
                                            }))

                                            events.stats(new APIPropertyStatsSegment((): object => {
                                                return {
                                                    type: 'stats',
                                                    name: 'stats2',
                                                    count: 1
                                                }
                                            }))

                                            events.stats(new APIPropertyStatsSegment((): object => {
                                                return {
                                                    type: 'stats',
                                                    name: 'stats3',
                                                    count: 1
                                                }
                                            }))

                                            events.stats(new APIPropertyStatsSegment((): object => {
                                                return {
                                                    type: 'stats',
                                                    name: 'stats4',
                                                    count: 1
                                                }
                                            }))
                                        }
                                    }
                                },
                                linkCollector: () => {}
                            })
                        })
                    ]
                }
            ]))

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptRunParams = {
            name: 'Название скрипта 1',
            path: '/path/path/a1.js',
            rootDir: '/path/path1',
            apiProperties: ['test1'],
        }

        const scriptId = await vmService.run(scriptRunParams)

        vmService.on(scriptId, ScriptEvent.activity, (info: ScriptActivityInfo) => {
            if (info.event === APIPropertyEvent.stats) {
                expect((info.params as any)[0]).toBeInstanceOf(APIPropertyStatsSegment)
                expect((info.params as any)[0].rawSegment()).toMatchObject({
                    type: 'stats',
                    count: 1
                })

                expect((info.params as any)[1]).toBeInstanceOf(APIPropertyStats)
                expect((info.params as any)[1].stats().count).toBeLessThanOrEqual(4)
                expect((info.params as any)[1].stats().count).toBeGreaterThanOrEqual(1)

                statsEventFn()
            }
        })

        startEventsFn()
        
        const stats = await vmService.stats(scriptId)
        
        expect(statsEventFn).toHaveBeenCalledTimes(4)
        expect(stats).toHaveLength(1)
        expect((stats as any)[0]?.stats).toBeInstanceOf(APIPropertyStats)
        expect((stats as any)[0]).toMatchObject({
            name: 'test1',
            version: 'v4'
        })

        const finalStats = (stats as any)[0]?.stats.stats()

        expect(finalStats?.count).toBe(4)

        container.restore()
    })

    it(`
        Если событие остановки скрипта срабатывает и приводит к тому, что в
        списке сохранённых скриптов заканчивается лимит остановленных скриптов,
        то самый давний остановленный скрипт удаляется из списка сохранённых
        скриптов #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptRunParams = [
            {
                name: 'Название скрипта 1',
                path: '/path/path/a1.js',
                rootDir: '/path/path1',
                apiProperties: ['property1', 'property2'],
            },
            {
                name: 'Название скрипта 2',
                path: '/path/path/a2.js',
                rootDir: '/path/path2',
                apiProperties: ['property1', 'property2'],
            },
            {
                name: 'Название скрипта 3',
                path: '/path/path/a3.js',
                rootDir: '/path/path3',
                apiProperties: ['property1', 'property2'],
            },
            {
                name: 'Название скрипта 4',
                path: '/path/path/a4.js',
                rootDir: '/path/path4',
                apiProperties: ['property1', 'property2'],
            },
        ]

        const scriptId1 = await vmService.run(scriptRunParams[0])
        const scriptId2 = await vmService.run(scriptRunParams[1])
        const scriptId3 = await vmService.run(scriptRunParams[2])
        const scriptId4 = await vmService.run(scriptRunParams[3])

        expect(vmService.info(scriptId1)).toBeUndefined()
        
        const script2Info = vmService.info(scriptId2)
        expect(script2Info).toMatchObject({
            params: {
                name: scriptRunParams[1].name,
                path: scriptRunParams[1].path,
                rootDir: scriptRunParams[1].rootDir
            }
        })
        expect(script2Info?.dateEnd).toBeInstanceOf(Date)

        const script3Info = vmService.info(scriptId3)
        expect(script3Info).toMatchObject({
            params: {
                name: scriptRunParams[2].name,
                path: scriptRunParams[2].path,
                rootDir: scriptRunParams[2].rootDir
            }
        })
        expect(script3Info?.dateEnd).toBeInstanceOf(Date)
        
        const script4Info = vmService.info(scriptId4)
        expect(script4Info).toMatchObject({
            params: {
                name: scriptRunParams[3].name,
                path: scriptRunParams[3].path,
                rootDir: scriptRunParams[3].rootDir
            }
        })
        expect(script4Info?.dateEnd).toBeInstanceOf(Date)

        container.restore()
    })

    it(`
        Событие освобождения от ссылок (unlink), которое генерирует api свойство
        скрипта, запускает событие остановки скрипта, в случае, если ни одно свойство
        скрипта не имеет ссылок на сам скрипт #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const linkCollectorFn = jest.fn()
        const stopEventFn = jest.fn()
        const unlinkEventFn = jest.fn()

        let startEventsFn: any
        let propertyHasLink = true

        container.rebind(VM_SYMBOL.ScriptStarterService)
            .to(getScriptStarterService({
                runFile: (options) => {
                    startEventsFn = (options.sandbox as any)
                        .gefion.v4.test1.startEvents
                }
            }))

        container.rebind(VM_SYMBOL.VMConfig)
            .toDynamicValue(getDefaultVMConfig([
                {
                    version: 'v4',
                    properties: [
                        getAPIPropertyFactory({
                            name: () => 'test1',
                            isGlobal: () => true,
                            stats: () => {
                                return getAPIPropertyStats({
                                    stats: () => ({}),
                                    addStatsSegment: () => {}
                                })
                            },
                            apiProperty: () => getAPIProperty({
                                hasLink: () => propertyHasLink,
                                init: (events) => {
                                    return {
                                        name: 'test1',
                                        startEvents: () => {
                                            new Promise<void>((resolve) => {
                                                propertyHasLink = false
                                                events.unlink()
                                                resolve()
                                            })
                                        }
                                    }
                                },
                                linkCollector: () => {
                                    linkCollectorFn()
                                }
                            })
                        })
                    ]
                }
            ]))

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptRunParams = {
            name: 'Название скрипта 1',
            path: '/path/path/a1.js',
            rootDir: '/path/path1',
            apiProperties: ['test1'],
        }

        const scriptId = await vmService.run(scriptRunParams)

        vmService.on(scriptId, ScriptEvent.activity, (info: ScriptActivityInfo) => {
            if (info.event === ScriptEvent.stop) {
                stopEventFn()
            }

            if (info.event === APIPropertyEvent.unlink) {
                unlinkEventFn()
            }
        })

        expect(vmService.info(scriptId)?.dateEnd).toBeUndefined()

        startEventsFn()

        expect(unlinkEventFn).toHaveBeenCalled()
        expect(linkCollectorFn).not.toHaveBeenCalled()
        expect(stopEventFn).toHaveBeenCalled()
        expect(vmService.info(scriptId)?.dateEnd).toBeInstanceOf(Date)

        container.restore()
    })

    it(`
        Если запущенный скрипт сразу же в одном цикле событий генерирует ошибку,
        то она перехватывается и передаётся в событие ошибки скрипта. Однако, так как
        нельзя зарегистрировать обработчик события до запуска скрипта, то вылавливать
        эту ошибку нужно в информации о скрипте сразу после запуска #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const MyError = class extends Error {}

        container.rebind(VM_SYMBOL.ScriptStarterService)
            .to(getScriptStarterService({
                runFile: () => {
                    throw new MyError
                }
            }))

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptRunParams = {
            name: 'Название скрипта 1',
            path: '/path/path/a1.js',
            rootDir: '/path/path1',
            apiProperties: ['property1', 'property2'],
        }

        const scriptId = await vmService.run(scriptRunParams)
        const scriptInfo = vmService.info(scriptId)

        expect(scriptInfo?.errors).toHaveLength(1)
        expect(scriptInfo?.errors[0].error).toBeInstanceOf(MyError)
        expect(scriptInfo?.dateEnd).toBeInstanceOf(Date)

        container.restore()
    })

    it(`
        Скрипт успешно и полностью можно удалить. Свойства не должны иметь на него ссылок,
        в противном случае принудительно запускается функция linkCollector (сборка ссылок)
        в каждом из свойств #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const unlinkEventFn = jest.fn()
        const linkCollectorFn = jest.fn()
        const stopEventFn = jest.fn()
        const removeEventFn = jest.fn()

        let test1HasLink = true

        container.rebind(VM_SYMBOL.VMConfig)
            .toDynamicValue(getDefaultVMConfig([
                {
                    version: 'v4',
                    properties: [
                        getAPIPropertyFactory({
                            name: () => 'test1',
                            isGlobal: () => true,
                            stats: () => {
                                return getAPIPropertyStats({
                                    stats: () => ({}),
                                    addStatsSegment: () => {}
                                })
                            },
                            apiProperty: () => getAPIProperty({
                                hasLink: () => {
                                    return test1HasLink
                                },
                                init: () => {
                                    return {
                                        name: 'test1'
                                    }
                                },
                                linkCollector: (events) => {
                                    test1HasLink = false
                                    linkCollectorFn()
                                    events.unlink()
                                }
                            })
                        })
                    ]
                }
            ])) 

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptRunParams = {
            name: 'Название скрипта 1',
            path: '/path/path/a1.js',
            rootDir: '/path/path1',
            apiProperties: ['test1'],
        }

        const scriptId = await vmService.run(scriptRunParams)

        expect(vmService.info(scriptId)).not.toBeUndefined()
        expect(vmService.info(scriptId)?.dateEnd).toBeUndefined()

        vmService.on(scriptId, ScriptEvent.activity, (info: ScriptActivityInfo) => {
            if (info.event === APIPropertyEvent.unlink) {
                unlinkEventFn()
            }

            if (info.event === ScriptEvent.stop) {
                stopEventFn()
            }

            if (info.event === ScriptEvent.remove) {
                removeEventFn()
            }
        })

        vmService.remove(scriptId)

        expect(linkCollectorFn).toHaveBeenCalled()
        expect(unlinkEventFn).toHaveBeenCalledTimes(1)
        expect(stopEventFn).toHaveBeenCalled()
        expect(removeEventFn).toHaveBeenCalled()
        expect(vmService.info(scriptId)).toBeUndefined()

        container.restore()
    })

    it(`
        Скрипт, свойства внутри которого имеют ссылки на него не завершает свою
        работу #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(VM_SYMBOL.VMConfig)
            .toDynamicValue(getDefaultVMConfig([
                {
                    version: 'v4',
                    properties: [
                        getAPIPropertyFactory({
                            name: () => 'test1',
                            isGlobal: () => true,
                            stats: () => {
                                return getAPIPropertyStats({
                                    stats: () => ({}),
                                    addStatsSegment: () => {}
                                })
                            },
                            apiProperty: () => getAPIProperty({
                                hasLink: () => {
                                    return true
                                },
                                init: () => {
                                    return {
                                        name: 'test1'
                                    }
                                },
                                linkCollector: () => {}
                            })
                        })
                    ]
                }
            ])) 

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptRunParams = {
            name: 'Название скрипта 1',
            path: '/path/path/a1.js',
            rootDir: '/path/path1',
            apiProperties: ['test1'],
        }

        const scriptId = await vmService.run(scriptRunParams)

        expect(vmService.info(scriptId)).not.toBeUndefined()
        expect(vmService.info(scriptId)?.dateEnd).toBeUndefined()

        expect(vmService.info(scriptId)).not.toBeUndefined()
        expect(vmService.info(scriptId)?.dateEnd).toBeUndefined()

        container.restore()
    })

    it(`
        Скрипт, свойства внутри которого имели ссылки на скрипт, но уже не имеют, 
        завершает свою работу благодаря событию свойств 'unlink' #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const stopEventFn = jest.fn()
        const unlinkEventFn = jest.fn()

        let startEventsFn: any
        let test1HasLink = true

        container.rebind(VM_SYMBOL.ScriptStarterService)
            .to(getScriptStarterService({
                runFile: (options) => {
                    startEventsFn = (options.sandbox as any)
                        .gefion.v4.test1.startEvents
                }
            }))

        container.rebind(VM_SYMBOL.VMConfig)
            .toDynamicValue(getDefaultVMConfig([
                {
                    version: 'v4',
                    properties: [
                        getAPIPropertyFactory({
                            name: () => 'test1',
                            isGlobal: () => true,
                            stats: () => {
                                return getAPIPropertyStats({
                                    stats: () => ({}),
                                    addStatsSegment: () => {}
                                })
                            },
                            apiProperty: () => getAPIProperty({
                                hasLink: () => test1HasLink,
                                init: (events) => {
                                    return {
                                        name: 'test1',
                                        startEvents: () => {
                                            test1HasLink = false
                                            events.unlink()
                                        }
                                    }
                                },
                                linkCollector: () => {}
                            })
                        })
                    ]
                }
            ]))

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptRunParams = {
            name: 'Название скрипта 1',
            path: '/path/path/a1.js',
            rootDir: '/path/path1',
            apiProperties: ['test1'],
        }

        const scriptId = await vmService.run(scriptRunParams)

        vmService.on(scriptId, ScriptEvent.activity, (info: ScriptActivityInfo) => {
            if (info.event === APIPropertyEvent.unlink) {
                unlinkEventFn()
            }

            if (info.event === ScriptEvent.stop) {
                stopEventFn()
            }
        })

        expect(vmService.info(scriptId)).not.toBeUndefined()
        expect(vmService.info(scriptId)?.dateEnd).toBeUndefined()
        expect(unlinkEventFn).not.toHaveBeenCalled()
        expect(stopEventFn).not.toHaveBeenCalled()

        startEventsFn()

        expect(vmService.info(scriptId)).not.toBeUndefined()
        expect(vmService.info(scriptId)?.dateEnd).toBeInstanceOf(Date)
        expect(unlinkEventFn).toHaveBeenCalledTimes(1)
        expect(stopEventFn).toHaveBeenCalledTimes(1)

        container.restore()
    })

    it(`
        При инициализации свойства в его функцию init передаётся идентификатор скрипта #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        let saveScriptId: undefined | symbol

        container.rebind(VM_SYMBOL.VMConfig)
            .toDynamicValue(getDefaultVMConfig([
                {
                    version: 'v4',
                    properties: [
                        getAPIPropertyFactory({
                            name: () => 'test1',
                            isGlobal: () => true,
                            stats: () => {
                                return getAPIPropertyStats({
                                    stats: () => ({}),
                                    addStatsSegment: () => {}
                                })
                            },
                            apiProperty: () => getAPIProperty({
                                hasLink: () => false,
                                init: (_, scriptId) => {
                                    saveScriptId = scriptId

                                    return {
                                        name: 'test1'
                                    }
                                },
                                linkCollector: () => {}
                            })
                        })
                    ]
                }
            ]))

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptRunParams = {
            name: 'Название скрипта 1',
            path: '/path/path/a1.js',
            rootDir: '/path/path1',
            apiProperties: ['test1'],
        }

        const scriptId = await vmService.run(scriptRunParams)

        expect(scriptId).toBe(saveScriptId)

        container.restore()
    })

})