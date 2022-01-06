import { 
    Guard, 
    GuardMetadata,
    CreateGuard,
    EventContext
} from './guard.types'
import { SnapshotMetadata } from '../../metadata/metadata.types'

export interface IGuardService {

    /**
     * Создание ресурс охранника
     */
    create(options: CreateGuard, nestedTransaction?: boolean): Promise<void>

    /**
     * Проверить существование указанного ресурса охранника
     */
    isExists(guard: Guard): Promise<boolean>

    /**
     * Установить метаданные в указанный ресурс охранника
     */
    setMetadata(guard: Guard, snapshotMetadata: SnapshotMetadata<GuardMetadata>, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить указанный ресурс охранника. Попытаться удалить метод, если он больше нигде не используется
     */
    remove(guard: Guard, nestedTransaction?: boolean): Promise<void>

    /**
     * Поставить обработчик для прослушивания события мутации ресурсов охранников
     */
    onMutation(handler: (context: EventContext) => void): void

}