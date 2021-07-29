export const PACKAGE_STORE_SYMBOL = {
    PackageStoreConfig: Symbol.for('PackageStoreConfig'),
    PackageEntity: Symbol.for('PackageEntity'),
    PackageTagEntity: Symbol.for('PackageTagEntity')
}

export type PackageStoreConfig = {
    // Путь к каталогу пакетов
    readonly packageDir: string
}