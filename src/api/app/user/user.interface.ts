export interface IUserService {

    /**
     * Создание нового пользователя
     */
    create(username: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Проверить существование пользователя
     */
    isExists(username: string): Promise<boolean>

    /**
     * Удаление пользователя
     */
    remove(username: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Закрепить за пользователем указанную роль
     */
    setRole(username: string, role: string | null, nestedTransaction?: boolean): Promise<void>

    /**
     * Получить название текущей роли пользователя, если она у него
     * есть. null - роли нет. undefined - пользователя не существует
     */
    getRole(username: string): Promise<string | null | undefined>

}