import { SnapshotMetadata } from '../../metadata/metadata.types'
import { ControllerMetadata, CreateController } from './controller.types'

export interface IControllerService {

    /**
     * Создать контроллер, если его ещё не существует
     */
    createIfNotExists(options: CreateController, nestedTransaction?: boolean): Promise<void>

    /**
     * Проверить существование контроллера с указанным именем
     */
    isExists(name: string): Promise<boolean>

    /**
     * Изменить метаданные указанного контроллера
     */
    setMetadata(name: string, snapshotMetadata: SnapshotMetadata<ControllerMetadata>, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить указанный контроллер. Попытаться удалить метод контроллера, если получится
     */
    remove(name: string, nestedTransaction?: boolean): Promise<void>

}