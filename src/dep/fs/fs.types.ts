import * as fsPromises from 'fs/promises'
import fsExtra from 'fs-extra'

export const FS_SYMBOL = {
    FsPromises: Symbol.for('FsPromises'),
    FsExtra: Symbol.for('FsExtra')
}

export type FsPromisesType = typeof fsPromises
export type FsExtraType = typeof fsExtra