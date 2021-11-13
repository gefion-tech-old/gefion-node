import { injectable, inject } from 'inversify'
import { IInstanceService } from './instance.interface'
import { 
    InstanceId,
    BlockInstanceAPIProperties
} from './instance.types'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { Repository, Connection } from 'typeorm'
import { BlockInstance } from '../../entities/block-instance.entity'
import { ScriptID } from '../../../../core/vm/vm.types'
import { Version } from '../version/version.types'
import { 
    NotExistBlockVersion,
    BlockVersionFolderNotFound,
    BlockVersionIndexFileNotFound,
    NotExistBlockVersionInstance
} from './instance.error'
import { BlockVersion } from '../../entities/block-version.entity'
import { IVMService } from '../../../../core/vm/vm.interface'
import { VM_SYMBOL } from '../../../../core/vm/vm.types'
import path from 'path'
import { pathExists } from 'fs-extra'

@injectable()
export class InstanceService implements IInstanceService {

    private instanceRepository: Promise<Repository<BlockInstance>>
    private versionRepository: Promise<Repository<BlockVersion>>
    private scriptIds = new Map<InstanceId, ScriptID>()

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        connection: Promise<Connection>,

        @inject(VM_SYMBOL.VMService)
        private vmService: IVMService
    ) {
        this.instanceRepository = connection
            .then(connection => {
                return connection.getRepository(BlockInstance)
            })

        this.versionRepository = connection
            .then(connection => {
                return connection.getRepository(BlockVersion)
            })
    }

    public async create(versionInfo: Version): Promise<InstanceId> {
        const versionRepository = await this.versionRepository
        const instanceRepository = await this.instanceRepository

        /**
         * Получить указанный экземпляр версии блока
         */
        const version = await (async () => {
            const version = await versionRepository.findOne(versionInfo)

            if (!version) {
                throw new NotExistBlockVersion(versionInfo)
            }

            return version
        })()

        /**
         * Сохранить запускаемый экземпляр версии блока в базе данных и получить
         * его идентификатор
         */
         const instanceId = await (async () => {
            const instanceEntity = await instanceRepository.save({
                blockVersion: version
            })

            return instanceEntity.id
        })()

        return instanceId
    }

    public async start(instanceId: InstanceId): Promise<void> {
        const instanceRepository = await this.instanceRepository

        /**
         * Ничего не делать, если указанный экземпляр уже был запущен
         */
        if (this.getScriptId(instanceId)) {
            return
        }

        /**
         * Получить экземпляр версии блока из базы данных вместе с загруженным
         * в него отношением version
         */
        const instance = await (async () => {
            const instance = await instanceRepository.findOne({
                where: {
                    id: instanceId
                },
                relations: ['blockVersion']
            })

            if (!instance) {
                throw new NotExistBlockVersionInstance()
            }

            return instance
        })()

        /**
         * Запустить скрипт экземпляра блока и сохранить его идентификатор, если пути к файлам
         * версии блока существуют
         */
        {
            const scriptRunParams = {
                name: `${instance.blockVersion.name}@${instance.blockVersion.version}`,
                rootDir: instance.blockVersion.path,
                path: path.join(instance.blockVersion.path, './index.js'),
                apiProperties: BlockInstanceAPIProperties
            }

            if (!await pathExists(scriptRunParams.rootDir)) {
                throw new BlockVersionFolderNotFound()
            }

            if (!await pathExists(scriptRunParams.path)) {
                throw new BlockVersionIndexFileNotFound()
            }

            const scriptId = await this.vmService.run(scriptRunParams)

            this.scriptIds.set(instanceId, scriptId)
        }
    }

    public async restart(instanceId: InstanceId): Promise<void> {
        /**
         * Остановить и удалить уже запущенный скрипт экземпляра версии,
         * если он есть
         */
        block: {
            const scriptId = this.getScriptId(instanceId)

            if (!scriptId) {
                break block
            }

            this.vmService.remove(scriptId)
            this.scriptIds.delete(instanceId)
        }

        /**
         * Заново всё запустить
         */
        await this.start(instanceId)
    }

    public async remove(instanceId: InstanceId): Promise<void> {
        const instanceRepository = await this.instanceRepository

        /**
         * Остановить и удалить уже запущенный скрипт экземпляра версии,
         * если он есть
         */
        block: {
            const scriptId = this.getScriptId(instanceId)

            if (!scriptId) {
                break block
            }

            this.vmService.remove(scriptId)
            this.scriptIds.delete(instanceId)
        }

        /**
         * Удалить созданный экземпляр версии блока из базы данных
         */
        await instanceRepository.delete({
            id: instanceId
        })
    }

    public getScriptId(instanceId: InstanceId): ScriptID | undefined {
        return this.scriptIds.get(instanceId)
    }

    public getInstanceId(scriptId: ScriptID): InstanceId | undefined {
        return (() => {
            for (const [key, value] of this.scriptIds.entries()) {
                if (value === scriptId) {
                    return key as InstanceId
                }
            }
            return
        })()
    }

    public getAllInstanceId(): InstanceId[] {
        const list: InstanceId[] = []
        
        for (const instanceId of this.scriptIds.keys()) {
            list.push(instanceId)
        }
        
        return list
    }

}