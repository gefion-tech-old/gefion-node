import { EventContext } from './user.types'

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
     * Поставить обработчик для прослушивания события мутации пользователя
     */
    onMutation(handler: (context: EventContext) => void): void

}