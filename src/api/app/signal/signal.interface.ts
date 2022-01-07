import { 
    Signal, 
    SignalMetadata,
    CreateSignal,
    EventContext
} from './signal.types'
import { SnapshotMetadata } from '../metadata/metadata.types'
import { Filter } from './filter/filter.types'
import { Guard } from './guard/guard.types'
import { Validator } from './validator/validator.types'

export interface ISignalService {

    /**
     * Создать сигнал, если он ещё не создан и сохранить метаданные по умолчанию
     */
    create(options: CreateSignal, nestedTransaction?: boolean): Promise<void>

    /**
     * Узнать существует ли указанный сигнал
     */
    isExists(signal: Signal): Promise<boolean>
    
    /**
     * Получить идентификатор сигнала
     */
    getSignalId(signal: Signal): Promise<number | undefined>

    /**
     * Записать новые кастомные метаданные в указанный сигнал
     */
    setCustomMetadata(signal: Signal, snapshotMetadata: SnapshotMetadata<SignalMetadata>, nestedTransaction?: boolean): Promise<void>

    /**
     * Добавить в пул валидаторов сигнала связь с указанным валидатором, если она существует
     * и ещё не была добавлена
     */
    addValidator(signal: Signal, validator: Validator, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить из пула валидаторов сигнала связь с указанным валидатором
     */
    removeValidator(signal: Signal, validator: Validator, nestedTransaction?: boolean): Promise<void>

    /**
     * Добавить в пул защитников сигнала связь с указанным защитником, если она существует
     * и ещё не была добавлена
     */
    addGuard(signal: Signal, guard: Guard, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить из пула защитников сигнала связь с указанным защитником
     */
    removeGuard(signal: Signal, guard: Guard, nestedTransaction?: boolean): Promise<void>

    /**
     * Добавить в пул фильтров сигнала связь с указанным фильтром, если она существует и ещё
     * не была добавлена 
     */
    addFilter(signal: Signal, filter: Filter, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить из пула фильтров сигнала связь с указанным фильтром
     */
    removeFilter(signal: Signal, filter: Filter, nestedTransaction?: boolean): Promise<void>

    /**
     * Соединить указанный сигнал c другим указанным сигналом. Учитывать, что у одного
     * входного сигнала может быть только один выходной, которые может заменяться, если
     * он уже существует
     */
    connect(outSignal: Signal, intoSignal: Signal, nestedTransaction?: boolean): Promise<void>

    /**
     * Отсоединить указанный выходной сигнал от указанного входного сигнала
     */
    unconnect(outSignal: Signal, intoSignal: Signal, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить сигнал вместе с его метаданными и всеми связями
     */
    remove(signal: Signal, nestedTransaction?: boolean): Promise<void>

    /**
     * Поставить обработчик для прослушивания события мутации сигнала
     */
    onSignalMutation(handler: (context: EventContext) => void): void

}