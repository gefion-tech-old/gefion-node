import { getContainer } from '../../inversify.config'
import { VM_SYMBOL, ScriptEvent, ScriptActivityInfo } from './vm.types'
import { IVMService } from './vm.interface'
import { getDefaultVMConfig } from './__helper/config.helper'
import { getScriptStarterService } from './__mock/ScriptStarterService.mock'
import { getAPIPropertyFactory } from './__mock/APIPropertyFactory.mock'
import { getAPIPropertyStatsReducer } from './__mock/APIPropertyStatsReducer.mock'
import { getAPIProperty } from './__mock/APIProperty.mock'
import { FileRunOptions } from './script-starter/script-starter.types'
import { APIPropertyError } from './api-property/api-property.errors'
import { APIPropertyStats } from './api-property/api-property.classes'
import { APIPropertyEvent } from './api-property/api-property.types'

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

        const linkEventFn = jest.fn()
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
                            statsReducer: (statsSegments) => {
                                return getAPIPropertyStatsReducer({
                                    stats: () => ({})
                                })(statsSegments)
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
                                            
                                            events.stats(new APIPropertyStats((): object => {
                                                return {
                                                    name: 'test1'
                                                }
                                            }))

                                            events.link()

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
                expect(info.params).toBeInstanceOf(APIPropertyStats)
                expect((info.params as any).stats()).toMatchObject({
                    name: 'test1'
                })
                statsEventFn()
            }

            if (info.event === APIPropertyEvent.link) {
                linkEventFn()
            }

            if (info.event === APIPropertyEvent.unlink) {
                unlinkEventFn()
            }
        })

        startEventsFn()

        await new Promise<void>((resolve) => {
            resolve()
        })

        expect(errorEventFn).toHaveBeenCalledTimes(1)
        expect(statsEventFn).toHaveBeenCalled()
        expect(linkEventFn).toHaveBeenCalled()
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
                            statsReducer: (statsSegments) => {
                                return getAPIPropertyStatsReducer({
                                    stats: () => ({})
                                })(statsSegments)
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

        await new Promise<void>((resolve) => {
            resolve()
        })

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
                            statsReducer: (statsSegments) => {
                                return getAPIPropertyStatsReducer({
                                    stats: () => ({})
                                })(statsSegments)
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

        await new Promise<void>((resolve) => {
            resolve()
        })

        expect(errorEventFn).toHaveBeenCalled()
        expect(stopEventFn).toHaveBeenCalled()
        expect(unlinkEventFn).toHaveBeenCalled()
        expect(eventFn).toHaveBeenCalledTimes(3)

        container.restore()
    })

    it(`
        Сегмент статистики, который передается в обработчик события статистики, 
        которое генерирует api свойство скрипта, успешно добавляется список
        сегментов статистики и не может привысить лимит. Сама же статистика на 
        основе предоставленных сегментов корректно генерируется
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
                            statsReducer: (statsSegments) => {
                                expect(statsSegments).toHaveLength(3)
                                expect((statsSegments[0] as any).stats()).toMatchObject({
                                    type: 'stats',
                                    name: 'stats2',
                                    count: 1
                                })

                                return getAPIPropertyStatsReducer({
                                    stats: (statsSegments) => {
                                        let count = 0
                                        let segments: string[] = []

                                        statsSegments.forEach((statsSegment) => {
                                            count += statsSegment.stats().count
                                            segments.push(statsSegment.stats().name)
                                        })

                                        return {
                                            segments: segments,
                                            count: count
                                        }
                                    }
                                })(statsSegments)
                            },
                            apiProperty: () => getAPIProperty({
                                hasLink: () => false,
                                init: (events) => {
                                    return {
                                        name: 'test1',
                                        startEvents: () => {
                                            events.stats(new APIPropertyStats((): object => {
                                                return {
                                                    type: 'stats',
                                                    name: 'stats1',
                                                    count: 1
                                                }
                                            }))

                                            events.stats(new APIPropertyStats((): object => {
                                                return {
                                                    type: 'stats',
                                                    name: 'stats2',
                                                    count: 1
                                                }
                                            }))

                                            events.stats(new APIPropertyStats((): object => {
                                                return {
                                                    type: 'stats',
                                                    name: 'stats3',
                                                    count: 1
                                                }
                                            }))

                                            events.stats(new APIPropertyStats((): object => {
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
                expect((info.params as any).stats()).toMatchObject({
                    type: 'stats',
                    count: 1
                })

                statsEventFn()
            }
        })

        startEventsFn()

        await new Promise<void>((resolve) => {
            resolve()
        })
        
        const stats = await vmService.stats(scriptId)
        
        expect(statsEventFn).toHaveBeenCalledTimes(4)
        expect(stats).toHaveLength(1)
        expect((stats as any)[0]).toMatchObject({
            name: 'test1',
            version: 'v4'
        })

        const finalStats = (stats as any)[0]?.stats.stats()

        expect(finalStats?.count).toBe(3)
        expect(finalStats?.segments).toHaveLength(3)

        container.restore()
    })

    it.todo(`
        Если событие остановки скрипта срабатывает и приводит к тому, что в
        списке сохранённых скриптов заканчивается лимит остановленных скриптов,
        то самый давний остановленный скрипт удаляется из списка сохранённых
        скриптов.
    `)

    it.todo(`
        Событие остановки скрипта устанавливает дату остановки скрипта
    `)

    it.todo(`
        Событие освобождения от ссылок (unlink), которое генерирует api свойство
        скрипта, запускает событие остановки скрипта, в случае, если ни одно свойство
        скрипта не имеет ссылок на сам скрипт
    `)

    it.todo(`
        Если запущенный скрипт сразу же в одном цикле событий генерирует ошибку,
        то она перехватывается и передаётся в событие ошибки скрипта
    `)

    it.todo(`
        Если скрипт закончил свою работу в одном цикле событий, то он сразу же
        будет отмечен как завершённый
    `)

    it.todo(`
        Скрипт успешно и полностью можно удалить. Свойства не должны иметь на него ссылок,
        в противном случае принудительно запускается функция linkCollector (сборка ссылок)
        в каждом из свойств
    `)

    it.todo(`
        Статистика скрипта корректно и ожидаемым образом генерируется
    `)

    it.todo(`
        Скрипт, свойства внутри которого имеют ссыkки на скрипт не завершает свою
        работу
    `)

    it.todo(`
        Скрипт, свойства внутри которого имели ссылки на скрипт, но уже не имеют, 
        завершает свою работу благодаря событию свойств 'unlink'
    `)

})