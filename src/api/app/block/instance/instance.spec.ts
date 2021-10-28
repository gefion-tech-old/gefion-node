import { getContainer } from '../../../../inversify.config'
import { IInstanceService } from './instance.interface'
import { BLOCK_SYMBOL } from '../block.types'
import { 
    NotExistBlockVersion,
    NotExistBlockVersionInstance,
    BlockVersionFolderNotFound,
    BlockVersionIndexFileNotFound
} from './instance.error'
import { VM_SYMBOL } from '../../../../core/vm/vm.types'
import { IVMService } from '../../../../core/vm/vm.interface'
import { getVMService } from '../../../../core/vm/__mock/VMService.mock'
import path from 'path'
import { Connection } from 'typeorm'
import { BlockInstance } from '../../entities/block-instance.entity'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { IVersionService } from '../version/version.interface'
import { REPAIR_TYPES, RepairJob } from '../../../../core/repair/repair.types'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('InstanceService в BlockModule', () => {

    it(`
        Попытка создать экземпляр несуществующей версии выбрасывает исключение
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const instanceService = container
            .get<IInstanceService>(BLOCK_SYMBOL.BlockInstanceService)

        const versionInfo = {
            name: 'test',
            version: 'test'
        }

        const create = instanceService.create(versionInfo)

        await expect(create).rejects.toMatchObject({
            name: new NotExistBlockVersion(versionInfo).name,
            message: new NotExistBlockVersion(versionInfo).message,
            version: new NotExistBlockVersion(versionInfo).version
        })
        await expect(create).rejects.toBeInstanceOf(NotExistBlockVersion)

        container.restore()
    })

    it(`
        Экземпляр версии блока корректно создаётся
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const instanceRepository = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            .then(connection => {
                return connection.getRepository(BlockInstance)
            })
        const instanceService = container
            .get<IInstanceService>(BLOCK_SYMBOL.BlockInstanceService)
        const versionService = container
            .get<IVersionService>(BLOCK_SYMBOL.BlockVersionService)

        const versionInfo = {
            name: 'test',
            version: 'test',
            path: path.join(__dirname, './__test')
        }

        await versionService.associate(versionInfo)

        const instanceId = await instanceService.create(versionInfo)

        await expect(instanceRepository.findOne({
            where: {
                id: instanceId
            }
        })).resolves.toBeDefined()

        container.restore()
    })

    it(`
        Попытка запустить несуществующий экземпляр версии блока вызывает исключение
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const instanceService = container
            .get<IInstanceService>(BLOCK_SYMBOL.BlockInstanceService)

        await expect(instanceService.start(0))
            .rejects
            .toBeInstanceOf(NotExistBlockVersionInstance)

        container.restore()
    })

    it(`
        Попытка запустить экземпляр версии блока у которого нет своего физического каталога с файлами
        вызывает исключение
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const instanceService = container
            .get<IInstanceService>(BLOCK_SYMBOL.BlockInstanceService)
        const versionService = container
            .get<IVersionService>(BLOCK_SYMBOL.BlockVersionService)

        const versionInfo = {
            name: 'test',
            version: 'test',
            path: path.join(__dirname, './not_found')
        }

        await versionService.associate(versionInfo)
        
        const instanceId = await instanceService.create(versionInfo)

        await expect(instanceService.start(instanceId))
            .rejects
            .toBeInstanceOf(BlockVersionFolderNotFound)

        container.restore()
    })

    it(`
        Попытка запустить экземпляра версии блока у которого нет начального индексного файла
        вызывает исключение
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const instanceService = container
            .get<IInstanceService>(BLOCK_SYMBOL.BlockInstanceService)
        const versionService = container
            .get<IVersionService>(BLOCK_SYMBOL.BlockVersionService)

        const versionInfo = {
            name: 'test',
            version: 'test',
            path: path.join(__dirname, './__test/test1')
        }

        await versionService.associate(versionInfo)

        const instanceId = await instanceService.create(versionInfo)

        await expect(instanceService.start(instanceId))
            .rejects
            .toBeInstanceOf(BlockVersionIndexFileNotFound)

        container.restore()
    })

    it(`
        Запуск экземпляра версии блока происходит корректно
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const vmRunFn = jest.fn()
        const scriptId = Symbol('ScriptId')

        container.rebind<IVMService>(VM_SYMBOL.VMService)
            .to(getVMService({
                info: () => (undefined),
                listScripts: () => ([]),
                on: () => {},
                remove: () => {},
                stats: async () => (undefined),
                run: async () => {
                    vmRunFn()
                    return scriptId
                }
            }))
            .inSingletonScope()

        const instanceService = container
            .get<IInstanceService>(BLOCK_SYMBOL.BlockInstanceService)
        const versionService = container
            .get<IVersionService>(BLOCK_SYMBOL.BlockVersionService)

        const versionInfo = {
            name: 'test',
            version: 'test',
            path: path.join(__dirname, './__test')
        }

        await versionService.associate(versionInfo)

        const instanceId = await instanceService.create(versionInfo)

        await expect(instanceService.start(instanceId))
            .resolves
            .toBeUndefined()
        expect(instanceService.getScriptId(instanceId)).toBe(scriptId)
        expect(instanceService.getInstanceId(scriptId)).toBe(instanceId)
        expect(vmRunFn).toBeCalledTimes(1)

        container.restore()
    })

    it(`
        Перезапуск уже запущенного экземпляра блока происходит корректно
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const vmRemoveFn = jest.fn()

        container.rebind<IVMService>(VM_SYMBOL.VMService)
            .to(getVMService({
                info: () => (undefined),
                listScripts: () => ([]),
                on: () => {},
                remove: (scriptId) => {
                    vmRemoveFn(scriptId)
                },
                stats: async () => (undefined),
                run: async () => {
                    return Symbol('ScriptId')
                }
            }))
            .inSingletonScope()

        const instanceService = container
            .get<IInstanceService>(BLOCK_SYMBOL.BlockInstanceService)
        const versionService = container
            .get<IVersionService>(BLOCK_SYMBOL.BlockVersionService)

        const versionInfo = {
            name: 'test',
            version: 'test',
            path: path.join(__dirname, './__test')
        }

        await versionService.associate(versionInfo)

        const instanceId = await instanceService.create(versionInfo)
        
        await instanceService.restart(instanceId)
        
        const scriptId = instanceService.getScriptId(instanceId)

        await instanceService.restart(instanceId)

        expect(instanceService.getScriptId(instanceId)).not.toBe(scriptId)
        expect(vmRemoveFn).toBeCalledTimes(1)
        expect(vmRemoveFn).toBeCalledWith(scriptId)

        container.restore()
    })

    it(`
        Полное удаление запущенного экземпляра версии блока происходит корректно. Попытка удалить
        несуществующий экземпляр ни к чему не приводит
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const vmRemoveFn = jest.fn()

        container.rebind<IVMService>(VM_SYMBOL.VMService)
            .to(getVMService({
                info: () => (undefined),
                listScripts: () => ([]),
                on: () => {},
                remove: (scriptId) => {
                    vmRemoveFn(scriptId)
                },
                stats: async () => (undefined),
                run: async () => {
                    return Symbol('ScriptId')
                }
            }))
            .inSingletonScope()

        const instanceService = container
            .get<IInstanceService>(BLOCK_SYMBOL.BlockInstanceService)
        const versionService = container
            .get<IVersionService>(BLOCK_SYMBOL.BlockVersionService)

        const versionInfo = {
            name: 'test',
            version: 'test',
            path: path.join(__dirname, './__test')
        }

        await versionService.associate(versionInfo)
        
        const instanceId = await instanceService.create(versionInfo)
        await instanceService.start(instanceId)
        const scriptId = instanceService.getScriptId(instanceId)

        expect(instanceId).toBeDefined()
        expect(scriptId).toBeDefined()
        await expect(instanceService.remove(instanceId)).resolves.toBeUndefined()
        expect(instanceService.getInstanceId(scriptId as any)).toBeUndefined()
        expect(instanceService.getScriptId(instanceId)).toBeUndefined()
        await expect(instanceService.start(instanceId))
            .rejects
            .toBeInstanceOf(NotExistBlockVersionInstance)
        
        await expect(instanceService.remove(0)).resolves.toBeUndefined()

        expect(vmRemoveFn).toBeCalledTimes(1)
        expect(vmRemoveFn).toBeCalledWith(scriptId)

        container.restore()
    })

})

describe('InstanceRepair в BlockModule', () => {

    it(`
        Модуль починки корректно синхронизирует сохранённые экземпляры с уже запущенными экземплярами
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const instanceRepair = container
            .getNamed<RepairJob>(REPAIR_TYPES.RepairJob, BLOCK_SYMBOL.BlockInstanceRepair)
        const instanceService = container
            .get<IInstanceService>(BLOCK_SYMBOL.BlockInstanceService)
        const versionService = container
            .get<IVersionService>(BLOCK_SYMBOL.BlockVersionService)

        const versionInfo = {
            name: 'test',
            version: 'test',
            path: path.join(__dirname, './__test')
        }

        await versionService.associate(versionInfo)

        for (let i = 0; i < 5; i++) {
            await instanceService.create(versionInfo)
        }

        expect(instanceService.getAllInstanceId()).toHaveLength(0)

        await instanceRepair.repair()

        await instanceService.create(versionInfo)

        expect(instanceService.getAllInstanceId()).toHaveLength(5)

        await instanceRepair.repair()

        expect(instanceService.getAllInstanceId()).toHaveLength(6)

        container.restore()
    })

})