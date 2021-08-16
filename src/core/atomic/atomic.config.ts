import { interfaces } from 'inversify'
import { AtomicConfig } from './atomic.types'

export async function getAtomicConfig(_: interfaces.Context): Promise<AtomicConfig> {
    return {
        lockExpires: 5 * 1000 * 60
    }
}