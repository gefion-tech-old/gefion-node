export const PACKAGE_STORE_SYMBOL = {
    PackageStoreConfig: Symbol.for('PackageStoreConfig'),
    PackageEntity: Symbol.for('PackageEntity'),
    PackageTagEntity: Symbol.for('PackageTagEntity'),
    PackageRepository: Symbol.for('PackageRepository'),
    PackageTagRepository: Symbol.for('PackageTagRepository'),
    PackageStoreService: Symbol.for('PackageStoreService'),
    GitManagerService: Symbol.for('GitManagerService')
}

export type PackageStoreConfig = {
    // Путь к каталогу репозиториев
    readonly repoDir: string
    // Путь к каталогу тегов репозитория
    readonly tagDir: string
}

export type OptionsInstallPackage = {
    gitPath: string,
    tag: Tag,
    type: PackageType
    credential?: GitCredential
}

export type Package = {
    // Тип пакета (постоянный или временный)
    readonly type: PackageType
    // Путь к удаленному git репозиторию
    readonly gitPath: string
    // Список установленных тегов
    readonly installedTags: Array<PackageTag>
    // Список всех доступных для установки тегов
    readonly allAvailableTags: Array<Tag>
}

export type Packages = Array<Package>

export type PackageTag = string

export type Tag = string

export type PackageType = 'constant' | 'temporary'

export type GitCredential = {
    readonly username: string,
    readonly password: string
}