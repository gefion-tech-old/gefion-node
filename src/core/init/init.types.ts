import { Logger } from 'pino'

export const INIT_SYMBOL = {
    InitService: Symbol.for('InitService'),
    InitConfig: Symbol.for('InitConfig'),
    InitRunner: Symbol.for('InitRunner')
}

export type InitConfig = {
    logger: Logger,
    runners: InitRunner[]
}

export interface InitRunner {

    /**
     * Функция, которая будет запускаться вначале инициализации программы
     */
    run(): Promise<void>

}