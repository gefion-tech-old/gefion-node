import { 
    MethodOptions,
    Method,
    CallOptions,
    MethodId
} from './method.types'
import { EntityManager } from 'typeorm'

/**
 * Все внешние ресурсы с которыми связан метод при своем особождении должны
 * пытаться удалить и сам метод. Такой вот механизм самоочищения. Если нужно
 * избежать удаления метода, то на него нужно ссылаться с какого-либо
 * другого ресурса
 */
export interface IMethodService {

    /**
     * Создать метод в базе данных и привязать к нему обрабтчик, если метода 
     * ещё не существует. В противном случае, привязаться к уже созданному в
     * БД методу
     */
    method(options: MethodOptions): Promise<void>

    /**
     * Удалить все методы указанного пространства имен
     */
    removeNamespace(namespace: string): Promise<void>

    /**
     * Попытаться удалить конкретный метод
     */
    removeMethod(method: Method): Promise<void>

    /**
     * Удалить все указанные методы, если на них не ссылается никаких внешних
     * ключей и нет исключений связанных с этим. Если транзакция откатывается в результате внешней
     * ошибки, то не стоит забывать, что внутренний обработчик все равно будет удалён и метод будет
     * зарегистрирован, но не доступен
     */
    removeMethods(methods: Method[], transactionEntityManager?: EntityManager): Promise<void>

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
     * Вернуть идентификато указанного метода, если он существует
     */
    getMethodId(method: Method): Promise<MethodId | undefined>

}