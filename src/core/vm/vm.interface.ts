import { ScriptID, ScriptRun, ScriptInfo, ScriptActivityInfo } from './vm.types'
import { VersionedAPIPropertiesStats } from './api-property/api-property.types'
import { ScriptError } from './vm.errors'

export interface IVMService {

    /**
     * Запуск указанного скрипта
     */
    run(params: ScriptRun): Promise<ScriptID>

    /**
     * Список всех ранее запущенных скриптов
     */
    listScripts(): Promise<ScriptID[]>

    /**
     * Полностью завершить выполнение скрипта, если он еще ее не завершил
     * (с полной очисткой ссылок на него), а после полностью удалить его
     * из памяти
     */
    remove(scriptId: ScriptID): Promise<void>

    /**
     * Получить исчерпывающую информацию о скрипте, если он ещё не был удален.
     */
    info(scriptId: ScriptID): ScriptInfo | undefined

    /**
     * Получить статистику по всем свойствам указанного скрипта. Если скрипт
     * был полностью удалён, то вернётся unefined
     */
    stats(scriptId: ScriptID): VersionedAPIPropertiesStats | false | undefined

    /**
     * Подписаться на событие конкретного скрипта
     */
    on(
        scriptId: ScriptID, 
        event: symbol, 
        handler: (error: ScriptError) => void
    ): void
    on(
        scriptId: ScriptID, 
        event: symbol, 
        handler: (info: ScriptActivityInfo) => void
    ): void
    on(
        scriptId: ScriptID, 
        event: symbol, 
        handler: () => void
    ): void

}