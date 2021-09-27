export const INIT_SYMBOL = {
    InitService: Symbol('InitService'),
    InitConfig: Symbol('InitConfig'),
    InitRunner: Symbol('InitRunner')
}

export type InitConfig = {
    readonly runners: InitRunner[]
}

export interface InitRunner {

    /**
     * Функция, которая будет запускаться вначале инициализации программы
     */
    run(): Promise<void>

}