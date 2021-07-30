import { OptionsInstallPackage, Tag, Packages, Package } from './package-store.types'

export interface IPackageStoreService {
    /**
     * Установка версии пакета и самого пакета при необходимости.
     */
    install(option: OptionsInstallPackage): Promise<Package>

    /**
     * Проверка установлен ли пакет и тег пакета
     */
    hasPackageTag(gitPath: string, tag: Tag): Promise<boolean>

    /**
     * Проверка установлен ли пакет и доступен ли указанный тег для установки
     */
    hasAvailablePackageTag(gitPath: string, tag: Tag): Promise<boolean>

    /**
     * Получить массив установленных пакетов на момент вызова (на локальной машине)
     */
    getPackages(): Promise<Packages>

    /**
     * Удалить конкретную версию пакета. Удаление самого пакета будет
     * происходит автоматически при нулевом количестве установленных версий
     */
    uninstall(gitPath: string, tag: Tag): Promise<void>
}