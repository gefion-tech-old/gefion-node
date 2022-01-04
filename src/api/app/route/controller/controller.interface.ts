import { SnapshotMetadata } from '../../metadata/metadata.types'
import { ControllerMetadata, CreateController, Controller } from './controller.types'

export interface IControllerService {

    /**
     * Создать контроллер, если его ещё не существует
     */
    create(options: CreateController, nestedTransaction?: boolean): Promise<void>

    /**
     * Проверить существование контроллера с указанным именем
     */
    isExists(controller: Controller): Promise<boolean>

    /**
     * Изменить метаданные указанного контроллера
     */
    setMetadata(controller: Controller, snapshotMetadata: SnapshotMetadata<ControllerMetadata>, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить указанный контроллер. Попытаться удалить метод контроллера, если получится
     */
    remove(controller: Controller, nestedTransaction?: boolean): Promise<void>

}