import { AsyncContainerModule, interfaces } from 'inversify'
import { FsExtraType, FsPromisesType, FS_SYMBOL } from './fs.types'
import fsPromises from 'fs/promises'
import fsExtra from 'fs-extra'

export const FsModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<FsPromisesType>(FS_SYMBOL.FsPromises).toConstantValue(fsPromises)
    bind<FsExtraType>(FS_SYMBOL.FsExtra).toConstantValue(fsExtra)
})