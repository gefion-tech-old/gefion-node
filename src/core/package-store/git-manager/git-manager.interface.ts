export interface IGitManagerService {

    /**
     * Инициализировать репозиторий и заполнить его тегами. Если до этого репозиторий
     * уже существовал, то удаляет его с помощью removeRepo. Удаление нужно так как
     * в противном случае было бы сложно доказать, что предыдущий репозиторий был
     * инициализирован до самого конца.
     */
    initRepo(remote: string, repoName: string): Promise<void>

    /**
     * Удалить инициализированный репозиторий. Автоматически будут удалены
     * все ресурсы, которые связаны с репозиторием (теги и все папки).
     */
    removeRepo(repoName: string): Promise<void>

    /**
     * Список инициализированных репозиториев
     */
    listRepo(): Promise<string[]>

    /**
     * Список доступных тегов в указанном репозитории
     */
    tags(repoName: string): Promise<string[]>

    /**
     * Скачать все теги в указанный репозиторий из указанного удаленного адреса
     */
    fetchTags(remote: string, repoName: string): Promise<void>

    /**
     * Список по факту установленных тегов репозитория
     */
    listInstalledTags(repoName: string): Promise<string[]>

    /**
     * Установить тег указанного репозитория. Если тега не существует, 
     * то вызывается исключение
     */
    installTag(tag: string, repoName: string): Promise<void>

    /**
     * Удалить тег указанного репозитория
     */
    uninstallTag(tag: string, repoName: string): Promise<void>

}