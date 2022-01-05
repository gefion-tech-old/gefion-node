import { injectable, inject } from 'inversify'
import { IInstanceService } from './instance.interface'
import { 
    InstanceId,
    BlockInstanceAPIProperties
} from './instance.types'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { Connection } from 'typeorm'
import { BlockInstance, BlockVersion } from '../../entities/block.entity'
import { ScriptID } from '../../../../core/vm/vm.types'
import { Version } from '../version/version.types'
import { 
    NotExistBlockVersion,
    BlockVersionFolderNotFound,
    BlockVersionIndexFileNotFound,
    NotExistBlockVersionInstance,
    InstanceBlockVersionInUse
} from './instance.error'
import { IVMService } from '../../../../core/vm/vm.interface'
import { VM_SYMBOL } from '../../../../core/vm/vm.types'
import path from 'path'
import { pathExists } from 'fs-extra'
import { isErrorCode, SqliteErrorCode } from '../../../../core/typeorm/utils/error-code'
import { mutationQuery } from '../../../../core/typeorm/utils/mutation-query'

@injectable()
export class InstanceService implements IInstanceService {

    private scriptIds = new Map<InstanceId, ScriptID>()

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        private connection: Promise<Connection>,

        @inject(VM_SYMBOL.VMService)
        private vmService: IVMService
    ) {}

    public async create(versionInfo: Version, nestedTransaction = false): Promise<InstanceId> {
        const connection = await this.connection
        const versionRepository = connection.getRepository(BlockVersion)
        const instanceRepository = connection.getRepository(BlockInstance)

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
            const instanceEntity = await mutationQuery(nestedTransaction, () => {
                return instanceRepository.save({
                    blockVersion: version
                })
            })

            return instanceEntity.id
        })()

        return instanceId
    }

    public async start(instanceId: InstanceId): Promise<void> {
        const connection = await this.connection
        const instanceRepository = connection.getRepository(BlockInstance)

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

    public async remove(instanceId: InstanceId, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const instanceRepository = connection.getRepository(BlockInstance)

        /**
         * Удалить созданный экземпляр версии блока из базы данных
         */
        try {
            await mutationQuery(nestedTransaction, () => {
                return instanceRepository.delete({
                    id: instanceId
                })
            })
        } catch(error) {
            if (isErrorCode(error, [
                SqliteErrorCode.SQLITE_CONSTRAINT_TRIGGER,
                SqliteErrorCode.SQLITE_CONSTRAINT_FOREIGNKEY
            ])) {
                throw new InstanceBlockVersionInUse
            }

            throw error
        }

        /**
         * Остановить и удалить уже запущенный скрипт экземпляра версии,
         * если он есть
         */
        const scriptId = this.getScriptId(instanceId)

        if (!scriptId) {
            return
        }

        this.vmService.remove(scriptId)
        this.scriptIds.delete(instanceId)
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