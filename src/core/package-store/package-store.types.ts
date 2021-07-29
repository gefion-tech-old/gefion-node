export const PACKAGE_STORE_SYMBOL = {
    PackageStoreConfig: Symbol.for('PackageStoreConfig')
}

export type PackageStoreConfig = {
    // Путь к каталогу пакетов
    readonly packageDir: string
}