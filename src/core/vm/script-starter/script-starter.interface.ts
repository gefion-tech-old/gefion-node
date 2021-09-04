import { FileRunOptions } from './script-starter.types'

export interface IScriptStarterService {

    /**
     * Запустить скрипт из указанного файла с применением переданных параметров
     */
    runFile(options: FileRunOptions): void

}