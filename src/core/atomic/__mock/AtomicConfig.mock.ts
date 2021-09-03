import { AtomicConfig } from '../atomic.types'

export function getAtomicConfig(config: AtomicConfig): () => Promise<AtomicConfig> {
    return async function(): Promise<AtomicConfig> {
        return config
    }
}