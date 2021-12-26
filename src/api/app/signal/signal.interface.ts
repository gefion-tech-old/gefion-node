import { Method } from '../method/method.types'
import { 
    Signal, 
    SignalMetadata,
    CreateSignal,
    EventContext
} from './signal.type'
import { SnapshotMetadata } from '../metadata/metadata.types'

export interface ISignalService {

    /**
     * Создать сигнал, если он ещё не создан и сохранить метаданные по умолчанию
     */
    createIfNotCreated(options: CreateSignal, nestedTransaction?: boolean): Promise<void>

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
     * Добавить в пул валидаторов сигнала указанный валидатор, если он существует
     * и ещё не был добавлен
     */
    addValidator(signal: Signal, method: Method, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить из пула валидаторов сигнала указанный валидатор. Попытаться удалить
     * и метод, если с ним не связаны ещё ресурсы
     */
    removeValidator(signal: Signal, method: Method, nestedTransaction?: boolean): Promise<void>

    /**
     * Добавить в пул защитников сигнала указанный защитник, если он существует
     * и ещё не был добавлен
     */
    addGuard(signal: Signal, method: Method, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить из пула защитников сигнала указанный защитник. Попытаться удалить
     * и метод, если с ним не связаны ещё ресурсы
     */
    removeGuard(signal: Signal, method: Method, nestedTransaction?: boolean): Promise<void>

    /**
     * Добавить в пул фильтров сигнала указанный фильтр, если он существует и ещё
     * не был добавлен 
     */
    addFilter(signal: Signal, method: Method, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить из пула фильтров сигнала указанный сигнал. Попытаться удалить
     * и метод, если с ним не связаны ещё ресурсы
     */
    removeFilter(signal: Signal, method: Method, nestedTransaction?: boolean): Promise<void>

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
     * Удалить сигнал и все связанные с ним обработчики, если с ними не связано других ресурсов
     */
    remove(signal: Signal, nestedTransaction?: boolean): Promise<void>

    /**
     * Поставить обработчик для прослушивания события мутации сигнала
     */
    onSignalMutation(handler: (context: EventContext) => void): void

}