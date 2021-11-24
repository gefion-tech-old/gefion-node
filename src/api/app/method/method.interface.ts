import { 
    MethodOptions,
    Method,
    CallOptions,
    MethodId
} from './method.types'
import { ScriptID } from '../../../core/vm/vm.types'

/**
 * Все внешние ресурсы с которыми связан метод при своем особождении должны
 * пытаться удалить и сам метод. Такой вот механизм самоочищения. Если нужно
 * избежать удаления метода, то на него нужно ссылаться с какого-либо
 * другого ресурса
 */
export interface IMethodService {

    /**
     * Создать метод в базе данных и привязать к нему обработчик, если метода 
     * ещё не существует. В противном случае, привязаться к уже созданному в
     * БД методу.
     * 
     * Только этот метод имеет встроенную защиту для проверки прав владения, так
     * как все остальные методы должны быть публичными
     */
    method(options: MethodOptions, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить все методы указанного пространства имен
     */
    removeNamespace(namespace: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Попытаться удалить конкретный метод
     */
    removeMethod(method: Method, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить все указанные методы, если на них не ссылается никаких внешних
     * ключей
     */
    removeMethods(methods: Method[], nestedTransaction?: boolean): Promise<void>

    /**
     * Вызвать указанный метод, если он существует и доступен
     */
    call(options: CallOptions): any

    /**
     * Проверить что метод полностью доступен
     */
    isAvailable(method: Method): boolean

    /**
     * Проверить, что метод полностью доступен на всех репликах приложения. 
     * Ничего не вернёт, если метод нигде не доступен
     */
    isConsistent(method: Method): Promise<boolean | undefined>

    /**
     * Получить идентификатор указанного метода, если он существует
     */
    getMethodId(method: Method): Promise<MethodId | undefined>

    /**
     * Получить идентификатор скрипта указанного метода, если он существует
     */
    getScriptId(method: Method): ScriptID | undefined

}