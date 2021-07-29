import { interfaces } from 'inversify'
import { PackageStoreConfig } from './package-store.types'

export async function getPackageStoreConfig(_: interfaces.Context): Promise<PackageStoreConfig> {
    return {
        packageDir: '/home/valentin/Документы/not_work/gefion/src/storage/packages'
    }
}