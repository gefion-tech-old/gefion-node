import { 
    Validator, 
    ValidatorMetadata,
    CreateValidator,
    EventContext
} from './validator.types'
import { SnapshotMetadata } from '../../metadata/metadata.types'

export interface IValidatorService {

    /**
     * Создание ресурса валидатора
     */
    create(options: CreateValidator, nestedTransaction?: boolean): Promise<void>

    /**
     * Проверить существование указанного ресурса валидатора
     */
    isExists(guard: Validator): Promise<boolean>

    /**
     * Установить метаданные в указанный ресурс валидатора
     */
    setMetadata(guard: Validator, snapshotMetadata: SnapshotMetadata<ValidatorMetadata>, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить указанный ресурс валидатора. Попытаться удалить метод, если он больше нигде не используется
     */
    remove(guard: Validator, nestedTransaction?: boolean): Promise<void>

    /**
     * Поставить обработчик для прослушивания события мутации ресурсов валидатора
     */
    onMutation(handler: (context: EventContext) => void): void

}