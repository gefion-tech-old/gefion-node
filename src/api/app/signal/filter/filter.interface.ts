import { 
    Filter, 
    FilterMetadata,
    CreateFilter,
    EventContext
} from './filter.types'
import { SnapshotMetadata } from '../../metadata/metadata.types'

export interface IFilterService {

    /**
     * Создание ресурса фильтра
     */
    create(options: CreateFilter, nestedTransaction?: boolean): Promise<void>

    /**
     * Проверить существование указанного ресурса фильтра
     */
    isExists(guard: Filter): Promise<boolean>

    /**
     * Установить метаданные в указанный ресурс фильтра
     */
    setMetadata(guard: Filter, snapshotMetadata: SnapshotMetadata<FilterMetadata>, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить указанный ресурс фильтра. Попытаться удалить метод, если он больше нигде не используется
     */
    remove(guard: Filter, nestedTransaction?: boolean): Promise<void>

    /**
     * Поставить обработчик для прослушивания события мутации ресурсов фильтра
     */
    onMutation(handler: (context: EventContext) => void): void

}