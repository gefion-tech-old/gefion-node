import { Connection, ObjectType } from 'typeorm'

/**
 * Список заглушек
 */
const mocks = new Map

/**
 * Функция для получения кастомных репозиториев. Является тонкой прослойкой для
 * получения кастомных репозиториев напрямую из соединения, которая нужна только для
 * облегчения в тестировании
 */
export function getCustomRepository<T>(connection: Connection, repository: ObjectType<T>) {
    const mockRepository = mocks.get(repository)

    if (mockRepository) {
        return mockRepository
    } else {
        return connection.getCustomRepository(repository)
    }
}

/**
 * Установить заглушку вместо указанного репозитория
 */
export function mockCustomRepository<T>(repository: ObjectType<T>, mock: T) {
    mocks.set(repository, mock)
}