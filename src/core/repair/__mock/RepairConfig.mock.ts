import { RepairConfig } from '../repair.types'

export function getRepairConfig(config: RepairConfig): () => Promise<RepairConfig> {
    return async function(): Promise<RepairConfig> {
        return config
    }
}