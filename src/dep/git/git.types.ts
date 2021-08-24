export const GIT_SYMBOL = {
    GitConfig: Symbol('GitConfig'),
    Git: Symbol('Git')
}

export type GitConfig = {
    // Максимальное количество параллельно порождающихся процессов
    maxConcurrentProcesses: number
}