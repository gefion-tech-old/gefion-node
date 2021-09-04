import { VMConfig } from '../vm.types'

export function getVMConfig(config: VMConfig): () => Promise<VMConfig> {
    return async function(): Promise<VMConfig> {
        return config
    }
}