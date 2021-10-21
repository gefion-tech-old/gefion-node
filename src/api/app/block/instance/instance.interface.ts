import { 
    InstanceId
} from './instance.types'
import { Version } from '../version/version.types'
import { ScriptID } from '../../../../core/vm/vm.types'

export interface IInstanceService {

    /**
     * Создать экземпляр версии блока, если он ассоциирован
     */
    create(options: Version): Promise<InstanceId>

    /**
     * Запустить экземпляр версии блока, если он уже создан. В случае, если указанный
     * экземпляр уже запущен, то ничего не произойдет
     */
    start(instanceId: InstanceId): Promise<void>

    /**
     * Перезапустить экземпляр версии блока. В первую очередь, необходимо
     * для разработки
     */
    restart(instanceId: InstanceId): Promise<void>

    /**
     * Остановить и удалить экземпляр версии блока
     */
    remove(instanceId: InstanceId): Promise<void>

    /**
     * Получить идентификатор запущенного скрипта указанного экземпляра блока,
     * если он существует по идентификатору экземпляра
     */
    getScriptId(instanceId: InstanceId): ScriptID | undefined

    /**
     * Получить идентификатор экземпляра версии по идентификатору запущенного
     * скрипта, если он существует
     */
    getInstanceId(scriptId: ScriptID): InstanceId | undefined

    /**
     * Получить список всех идентификаторов запущенных на данный момент экземпляров
     * версий различных блоков
     */
    getAllInstanceId(): InstanceId[]

}