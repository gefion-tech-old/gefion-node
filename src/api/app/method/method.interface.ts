import { 
    MethodOptions,
    Method,
    CallOptions
} from './method.types'

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
     * Проверить, что метод существует в базе данных
     */
    isMethod(method: Method): Promise<boolean>

}