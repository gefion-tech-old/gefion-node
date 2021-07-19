import { SimpleGit } from 'simple-git'

export const GIT_SYMBOL = {
    GitConfig: Symbol.for('GitConfig'),
    Git: Symbol.for('Git')
}

export type GitType = SimpleGit

export type GitConfig = {
    // Максимальное количество параллельно порождающихся процессов
    maxConcurrentProcesses: number
}