import { OptionsInstallPackage, Tag, Packages, OptionsInstallPackageTag } from '../package-store.types'

export interface IPackageManagerService {

    /**
     * Установить указанный пакет
     */
    installPackage(options: OptionsInstallPackage): Promise<void>

    /**
     * Установить указанную версию пакета
     */
    installPackageTag(options: OptionsInstallPackageTag): Promise<void>

    /**
     * Проверка установлен ли пакет
     */
    hasPackage(gitPath: string): Promise<boolean>

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
     * Удалить пакет
     */
    uninstallPackage(gitPath: string): Promise<void>

    /**
     * Удалить версию пакета
     */
    uninstallPackageTag(gitPath: string, tag: Tag): Promise<void>

    /**
     * Есть ли у указанного пакета хоть один установленный тег
     */
    isEmptyPackage(gitPath: string): Promise<boolean>

}