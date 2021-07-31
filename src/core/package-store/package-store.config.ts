import { interfaces } from 'inversify'
import { PackageStoreConfig } from './package-store.types'

export async function getPackageStoreConfig(_: interfaces.Context): Promise<PackageStoreConfig> {
    return {
        repoDir: '/home/valentin/Документы/not_work/gefion/src/storage/packages/repositories',
        tagDir: '/home/valentin/Документы/not_work/gefion/src/storage/packages/tags'
    }
}